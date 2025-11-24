/**
 * Live Trading Executor
 * Real order execution via Hyperliquid API
 */

import { Signal, Order, OrderStatus, OrderType, PositionState, ExitReason } from '../types'
import { fetchHyperliquid } from '../data-fetchers/hyperliquid'
import { getHyperliquidWalletApiKey, getHyperliquidAccountAddress } from '../config'
import { getAssetIndex, createOrderMessage, signHyperliquidOrder, createWalletFromPrivateKey } from './hyperliquid-signing'
import * as fs from 'node:fs'
import * as path from 'node:path'
// import * as crypto from 'crypto'

export interface LiveExecutorConfig {
  tradesFile: string
  orderFillTimeoutMs: number
  retryOnTimeout: boolean
  maxRetries: number
  walletApiKey?: string // Optional: if not provided, uses environment variable
  accountAddress?: string // Optional: if not provided, uses environment variable
}

export interface HyperliquidOrder {
  a: number // Asset index
  b: boolean // Buy or sell (true = buy)
  p: string // Price (string for precision)
  s: number // Size
  r: boolean // Reduce only
  t?: { // Order type
    limit?: { tif: 'Gtc' | 'Ioc' | 'Alo' }
  }
}

/**
 * Live executor for real trading via Hyperliquid API
 * Implements EIP-712 signing for order submission to Hyperliquid /exchange endpoint
 */
export class LiveExecutor {
  private config: LiveExecutorConfig
  private pendingOrders: Map<string, Order>
  private apiErrorCount: number
  private apiRequestCount: number
  private walletApiKey?: string
  private accountAddress?: string

  constructor(config: LiveExecutorConfig) {
    this.config = config
    this.pendingOrders = new Map()
    this.apiErrorCount = 0
    this.apiRequestCount = 0
    // Store credentials if provided, otherwise will use env vars when needed
    this.walletApiKey = config.walletApiKey
    this.accountAddress = config.accountAddress
  }

  /**
   * Execute real entry order via Hyperliquid API
   */
  async executeEntry(signal: Signal, currentPrice: number): Promise<Order> {
    const orderId = `live_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const quantity = signal.quantity || 0

    // CRITICAL FIX: Validate confidence before execution (double check)
    // Accept only signals with confidence >= 60% (range: 60% - 100%)
    // Reject signals with confidence < 60% (0% - 59.99%)
    const confidence = signal.confidence || 0
    if (confidence < 0.60) {
      console.log(`\x1b[31m❌ LIVE EXECUTOR REJECT: ${signal.coin} - Confidence ${(confidence * 100).toFixed(1)}% < 60% (too low, filter out)\x1b[0m`)
      return {
        id: orderId,
        symbol: signal.coin || '',
        side: signal.signal === 'buy_to_enter' ? 'LONG' : 'SHORT',
        type: 'MARKET',
        quantity,
        price: currentPrice,
        status: 'REJECTED',
        submittedAt: Date.now(),
        rejectedReason: `Confidence too low: ${(confidence * 100).toFixed(1)}% < 60% (minimum required: 60%)`
      }
    }

    // Pre-execution checks
    const preCheck = await this.preExecutionChecks(signal, quantity)
    if (!preCheck.passed) {
      return {
        id: orderId,
        symbol: signal.coin || '',
        side: signal.signal === 'buy_to_enter' ? 'LONG' : 'SHORT',
        type: 'MARKET',
        quantity,
        price: currentPrice,
        status: 'REJECTED',
        submittedAt: Date.now(),
        rejectedReason: preCheck.reason
      }
    }

    try {
      // Submit order to Hyperliquid
      const order = await this.submitOrder({
        symbol: signal.coin || '',
        side: signal.signal === 'buy_to_enter' ? 'LONG' : 'SHORT',
        quantity,
        type: 'MARKET',
        stopLoss: signal.stop_loss,
        takeProfit: signal.take_profit || signal.profit_target
      })

      // Wait for fill confirmation
      const filledOrder = await this.waitForFill(order, this.config.orderFillTimeoutMs)

      if (filledOrder.status === 'FILLED' || filledOrder.status === 'PARTIAL_FILLED') {
        // Save to file
        this.saveTradeToFile(filledOrder, 'ENTRY')
      }

      this.apiRequestCount++
      return filledOrder
    } catch (error) {
      this.apiErrorCount++
      const errorMsg = error instanceof Error ? error.message : String(error)
      return {
        id: orderId,
        symbol: signal.coin || '',
        side: signal.signal === 'buy_to_enter' ? 'LONG' : 'SHORT',
        type: 'MARKET',
        quantity,
        price: currentPrice,
        status: 'REJECTED',
        submittedAt: Date.now(),
        rejectedReason: `Order submission failed: ${errorMsg}`
      }
    }
  }

  /**
   * Execute real exit order via Hyperliquid API
   */
  async executeExit(
    position: PositionState,
    exitSize: number,
    exitReason: ExitReason,
    currentPrice: number
  ): Promise<Order> {
    const orderId = `live_exit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const symbol = position.symbol || position.coin || ''
    const totalQuantity = Math.abs(position.quantity)
    const closeQuantity = totalQuantity * (exitSize / 100)

    try {
      // Submit close order to Hyperliquid
      const order = await this.submitOrder({
        symbol,
        side: 'CLOSE',
        quantity: closeQuantity,
        type: 'MARKET',
        reduceOnly: true
      })

      // Wait for fill confirmation
      const filledOrder = await this.waitForFill(order, this.config.orderFillTimeoutMs)

      if (filledOrder.status === 'FILLED' || filledOrder.status === 'PARTIAL_FILLED') {
        // Save to file
        this.saveTradeToFile(filledOrder, 'EXIT', {
          exitReason,
          originalQuantity: totalQuantity,
          exitSizePct: exitSize
        })
      }

      this.apiRequestCount++
      return filledOrder
    } catch (error) {
      this.apiErrorCount++
      const errorMsg = error instanceof Error ? error.message : String(error)
      return {
        id: orderId,
        symbol,
        side: 'CLOSE',
        type: 'MARKET',
        quantity: closeQuantity,
        price: currentPrice,
        status: 'REJECTED',
        submittedAt: Date.now(),
        rejectedReason: `Exit order submission failed: ${errorMsg}`
      }
    }
  }

  /**
   * Submit order to Hyperliquid API
   * Implements EIP-712 signing for order submission
   */
  private async submitOrder(params: {
    symbol: string
    side: 'LONG' | 'SHORT' | 'CLOSE'
    quantity: number
    type: OrderType
    stopLoss?: number
    takeProfit?: number
    reduceOnly?: boolean
  }): Promise<Order> {
    const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    try {
      // Get wallet API key (use provided or fallback to env var)
      const walletApiKey = this.walletApiKey || getHyperliquidWalletApiKey()
      if (!walletApiKey || walletApiKey.trim() === '') {
        throw new Error('Wallet API key not provided and HYPERLIQUID_WALLET_API_KEY not configured')
      }

      // Get account address (use provided or fallback to env var)
      const accountAddress = this.accountAddress || getHyperliquidAccountAddress()
      if (!accountAddress) {
        throw new Error('Account address not provided and HYPERLIQUID_ACCOUNT_ADDRESS not configured')
      }

      // Create wallet from private key
      const wallet = createWalletFromPrivateKey(walletApiKey)

      // Verify wallet address matches account address
      if (wallet.address.toLowerCase() !== accountAddress.toLowerCase()) {
        throw new Error(`Wallet address ${wallet.address} does not match account address ${accountAddress}`)
      }

      // Get asset index
      const assetIndex = await getAssetIndex(params.symbol)

      // Determine if buy or sell
      const isBuy = params.side === 'LONG' || (params.side === 'CLOSE' && params.reduceOnly === false)
      const reduceOnly = params.side === 'CLOSE' || params.reduceOnly === true

      // Convert quantity to string (Hyperliquid uses string for precision)
      const quantityStr = params.quantity.toString()

      // Get current price for limit orders (if needed)
      let limitPx: string | undefined
      if (params.type === 'LIMIT') {
        // For limit orders, we need a price - use stopLoss or takeProfit if available
        // Otherwise, user should provide price in params
        limitPx = params.stopLoss?.toString() || params.takeProfit?.toString() || '0'
      }

      // Create order message
      // Note: Hyperliquid requires size as string with proper precision
      const orderMessage = createOrderMessage({
        assetIndex,
        isBuy,
        reduceOnly,
        limitPx,
        sz: quantityStr,
        orderType: params.type === 'LIMIT' ? 'Limit' : 'Market',
        cloid: orderId // Use orderId as client order ID for tracking
      })

      // Sign the order
      const signature = await signHyperliquidOrder(wallet, orderMessage)

      // Prepare request payload for Hyperliquid /exchange endpoint
      const requestPayload = {
        action: orderMessage.action,
        nonce: Date.now(),
        signature: signature,
        vaultAddress: null // For regular trading, vaultAddress is null
      }

      // Submit to Hyperliquid /exchange endpoint
      const response = await fetchHyperliquid('/exchange', requestPayload)

      // Check response - Hyperliquid returns { status: 'ok' } on success
      if (response && (response.status === 'ok' || response.status === 'ok' || response.data?.status === 'ok')) {
        const order: Order = {
          id: orderId,
          symbol: params.symbol,
          side: params.side,
          type: params.type,
          quantity: params.quantity,
          price: limitPx ? parseFloat(limitPx) : undefined,
          status: 'PENDING', // Will be updated by waitForFill
          submittedAt: Date.now(),
          stopLoss: params.stopLoss,
          takeProfit: params.takeProfit,
          metadata: {
            hyperliquidResponse: response,
            assetIndex,
            clientOrderId: orderId
          }
        }

        this.pendingOrders.set(orderId, order)
        return order
      } else {
        throw new Error(`Order submission failed: ${response?.error || 'Unknown error'}`)
      }
    } catch (error: any) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error(`❌ Failed to submit order to Hyperliquid: ${errorMsg}`)
      
      return {
        id: orderId,
        symbol: params.symbol,
        side: params.side,
        type: params.type,
        quantity: params.quantity,
        status: 'REJECTED',
        submittedAt: Date.now(),
        rejectedReason: `Order submission failed: ${errorMsg}`
      }
    }
  }

  /**
   * Wait for order fill confirmation
   * Polls Hyperliquid API for order status
   */
  private async waitForFill(order: Order, timeoutMs: number): Promise<Order> {
    const startTime = Date.now()
    const pollInterval = 2000 // Poll every 2 seconds
    const accountAddress = getHyperliquidAccountAddress()

    if (!accountAddress) {
      return {
        ...order,
        status: 'REJECTED',
        rejectedReason: 'Account address not configured'
      }
    }

    while (Date.now() - startTime < timeoutMs) {
      await new Promise(resolve => setTimeout(resolve, pollInterval))

      try {
        // Query user state to check order status
        const userState = await fetchHyperliquid('/info', {
          type: 'clearinghouseState',
          user: accountAddress
        })

        // Check if order is filled
        // Hyperliquid returns open orders in userState.openOrders
        if (userState && userState.openOrders) {
          const openOrder = userState.openOrders.find((o: any) => 
            o.oid === order.metadata?.clientOrderId || 
            o.coid === order.metadata?.clientOrderId
          )

          if (!openOrder) {
            // Order not in open orders - check filled orders
            if (userState.filledOrders) {
              const filledOrder = userState.filledOrders.find((o: any) =>
                o.oid === order.metadata?.clientOrderId ||
                o.coid === order.metadata?.clientOrderId
              )

              if (filledOrder) {
                return {
                  ...order,
                  status: 'FILLED',
                  filledQuantity: parseFloat(filledOrder.sz || order.quantity.toString()),
                  filledPrice: parseFloat(filledOrder.avgPx || order.price?.toString() || '0'),
                  filledAt: Date.now()
                }
              }
            }

            // Order might be filled but not yet in filledOrders - check positions
            if (userState.assetPositions) {
              const position = userState.assetPositions.find((p: any) => 
                p.position.coin === order.symbol
              )

              if (position) {
                // Position exists - order likely filled
                return {
                  ...order,
                  status: 'FILLED',
                  filledQuantity: order.quantity,
                  filledPrice: order.price || parseFloat(position.position.entryPx || '0'),
                  filledAt: Date.now()
                }
              }
            }
          } else {
            // Order still open
            const updatedOrder = {
              ...order,
              status: 'PENDING' as OrderStatus
            }
            this.pendingOrders.set(order.id, updatedOrder)
          }
        }
      } catch (error: any) {
        console.warn(`⚠️  Failed to poll order status: ${error.message}`)
        // Continue polling
      }
    }

    // Timeout - order not filled
    if (this.config.retryOnTimeout) {
      console.warn(`⚠️  Order ${order.id} timeout after ${timeoutMs}ms`)
    }

    return {
      ...order,
      status: 'TIMEOUT',
      rejectedReason: `Order timeout after ${timeoutMs}ms`
    }
  }

  /**
   * Pre-execution checks
   */
  private async preExecutionChecks(
    _signal: Signal,
    _quantity: number
  ): Promise<{ passed: boolean; reason?: string }> {
    // Check API connection
    const walletApiKey = getHyperliquidWalletApiKey()
    if (!walletApiKey || walletApiKey.trim() === '') {
      return {
        passed: false,
        reason: 'Wallet API key not configured'
      }
    }

    // Check account address
    const accountAddress = getHyperliquidAccountAddress()
    if (!accountAddress) {
      return {
        passed: false,
        reason: 'Account address not configured'
      }
    }

    // TODO: Check available margin
    // TODO: Check risk limits
    // TODO: Check position limits

    return { passed: true }
  }

  /**
   * Get API error rate
   */
  getApiErrorRate(): number {
    if (this.apiRequestCount === 0) return 0
    return (this.apiErrorCount / this.apiRequestCount) * 100
  }

  /**
   * Reset API error tracking
   */
  resetApiErrorTracking(): void {
    this.apiErrorCount = 0
    this.apiRequestCount = 0
  }

  /**
   * Save trade to file
   */
  private saveTradeToFile(
    order: Order,
    type: 'ENTRY' | 'EXIT',
    metadata?: Record<string, any>
  ): void {
    try {
      const fileDir = path.dirname(this.config.tradesFile)
      if (!fs.existsSync(fileDir)) {
        fs.mkdirSync(fileDir, { recursive: true })
      }

      let trades: any[] = []
      if (fs.existsSync(this.config.tradesFile)) {
        const content = fs.readFileSync(this.config.tradesFile, 'utf-8')
        trades = JSON.parse(content)
      }

      const trade = {
        ...order,
        type,
        metadata,
        savedAt: Date.now()
      }

      trades.push(trade)
      fs.writeFileSync(this.config.tradesFile, JSON.stringify(trades, null, 2))
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error(`Failed to save live trade to file: ${errorMsg}`)
    }
  }
}
