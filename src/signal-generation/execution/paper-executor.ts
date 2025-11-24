/**
 * Paper Trading Executor
 * Virtual order execution (no real API calls)
 */

import { Signal, Order, PositionState, ExitReason } from '../types'
import * as fs from 'fs'
import * as path from 'path'

export interface PaperExecutorConfig {
  paperCapital: number
  tradesFile: string
  simulateSlippage: boolean
  slippagePct: number
}

export interface PaperTrade {
  id: string
  symbol: string
  side: 'LONG' | 'SHORT' | 'CLOSE'
  quantity: number
  entryPrice: number
  exitPrice?: number
  leverage: number
  entryTime: number
  exitTime?: number
  pnl?: number
  pnlPct?: number
  exitReason?: ExitReason
  status: 'OPEN' | 'CLOSED'
}

export class PaperExecutor {
  private config: PaperExecutorConfig
  private virtualPositions: Map<string, PaperTrade>
  private virtualBalance: number

  constructor(config: PaperExecutorConfig) {
    this.config = config
    this.virtualPositions = new Map()
    this.virtualBalance = config.paperCapital
    this.loadTradesFromFile()
  }

  /**
   * Execute virtual entry order
   */
  async executeEntry(signal: Signal, currentPrice: number): Promise<Order> {
    const orderId = `paper_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const quantity = signal.quantity || 0
    // Default leverage: 10x (matching generate-signals.ts default)
    const leverage = signal.leverage ?? 10

    // CRITICAL FIX: Validate confidence before execution (double check)
    // Accept only signals with confidence >= 60% (range: 60% - 100%)
    // Reject signals with confidence < 60% (0% - 59.99%)
    const confidence = signal.confidence || 0
    if (confidence < 0.60) {
      console.log(`\x1b[31m❌ EXECUTOR REJECT: ${signal.coin} - Confidence ${(confidence * 100).toFixed(1)}% < 60% (too low, filter out)\x1b[0m`)
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

    // Simulate slippage if enabled
    const fillPrice = this.config.simulateSlippage
      ? this.applySlippage(currentPrice, signal.signal === 'buy_to_enter' ? 'LONG' : 'SHORT')
      : currentPrice

    // Check if we have enough virtual capital
    const positionValue = quantity * fillPrice
    const marginRequired = positionValue / leverage

    if (marginRequired > this.virtualBalance) {
      return {
        id: orderId,
        symbol: signal.coin || '',
        side: signal.signal === 'buy_to_enter' ? 'LONG' : 'SHORT',
        type: 'MARKET',
        quantity,
        price: fillPrice,
        status: 'REJECTED',
        submittedAt: Date.now(),
        rejectedReason: `Insufficient virtual capital: need ${marginRequired.toFixed(2)}, have ${this.virtualBalance.toFixed(2)}`
      }
    }

    // Execute virtual order
    const order: Order = {
      id: orderId,
      symbol: signal.coin || '',
      side: signal.signal === 'buy_to_enter' ? 'LONG' : 'SHORT',
      type: 'MARKET',
      quantity,
      price: fillPrice,
      status: 'FILLED',
      filledQuantity: quantity,
      filledPrice: fillPrice,
      submittedAt: Date.now(),
      filledAt: Date.now(),
      leverage, // Include leverage in order (from signal, default 10x)
      stopLoss: signal.stop_loss,
      takeProfit: signal.take_profit || signal.profit_target
    }

    // Update virtual balance
    this.virtualBalance -= marginRequired

    // Create virtual position
    const paperTrade: PaperTrade = {
      id: orderId,
      symbol: signal.coin || '',
      side: order.side,
      quantity,
      entryPrice: fillPrice,
      leverage,
      entryTime: Date.now(),
      status: 'OPEN'
    }
    this.virtualPositions.set(signal.coin || '', paperTrade)

    // Save to file
    this.saveTradeToFile(paperTrade)

    return order
  }

  /**
   * Execute virtual exit order
   */
  async executeExit(
    position: PositionState,
    exitSize: number, // Percentage to close (0-100)
    exitReason: ExitReason,
    currentPrice: number
  ): Promise<Order> {
    const orderId = `paper_exit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const symbol = position.symbol || position.coin || ''

    // Calculate quantity to close
    const totalQuantity = Math.abs(position.quantity)
    const closeQuantity = totalQuantity * (exitSize / 100)

    // Simulate slippage if enabled
    const fillPrice = this.config.simulateSlippage
      ? this.applySlippage(currentPrice, position.side === 'LONG' ? 'SHORT' : 'LONG')
      : currentPrice

    // Execute virtual order
    const order: Order = {
      id: orderId,
      symbol,
      side: 'CLOSE',
      type: 'MARKET',
      quantity: closeQuantity,
      price: fillPrice,
      status: 'FILLED',
      filledQuantity: closeQuantity,
      filledPrice: fillPrice,
      submittedAt: Date.now(),
      filledAt: Date.now(),
      metadata: {
        exitReason,
        originalQuantity: totalQuantity,
        exitSizePct: exitSize
      }
    }

    // Calculate PnL
    const entryPrice = position.entryPrice
    const leverage = position.leverage || 1
    const pnl = position.side === 'LONG'
      ? (fillPrice - entryPrice) * closeQuantity
      : (entryPrice - fillPrice) * closeQuantity
    
    // For futures trading with leverage, calculate PnL % based on margin (not position value)
    const positionValueAtEntry = entryPrice * closeQuantity
    const marginUsed = positionValueAtEntry / leverage // Margin used for closed portion
    const pnlPct = marginUsed > 0 ? (pnl / marginUsed) * 100 : 0

    // Update virtual balance
    // Margin returned should be based on entry price margin, not exit price
    const marginReturned = (closeQuantity * entryPrice) / leverage
    this.virtualBalance += marginReturned + pnl

    // Update or remove virtual position
    const paperTrade = this.virtualPositions.get(symbol)
    if (paperTrade) {
      const remainingQuantity = totalQuantity - closeQuantity
      if (remainingQuantity < 0.001) {
        // Fully closed
        paperTrade.status = 'CLOSED'
        paperTrade.exitPrice = fillPrice
        paperTrade.exitTime = Date.now()
        paperTrade.pnl = pnl
        paperTrade.pnlPct = pnlPct
        paperTrade.exitReason = exitReason
        this.virtualPositions.delete(symbol)
      } else {
        // Partial close - update quantity
        paperTrade.quantity = remainingQuantity
      }
      this.saveTradeToFile(paperTrade)
    }

    return order
  }

  /**
   * Apply slippage simulation
   * Simulates realistic market slippage based on order size and market conditions
   */
  private applySlippage(price: number, side: 'LONG' | 'SHORT'): number {
    // Base slippage percentage
    const baseSlippage = this.config.slippagePct / 100
    
    // Add small random variation to simulate real market conditions (±20% of base slippage)
    const variation = (Math.random() - 0.5) * 0.2 * baseSlippage
    const slippage = baseSlippage + variation
    
    // Calculate slippage amount
    const slippageAmount = price * slippage
    
    // For LONG entries, slippage is positive (buy at higher price)
    // For SHORT entries, slippage is negative (sell at lower price)
    const fillPrice = side === 'LONG' ? price + slippageAmount : price - slippageAmount
    
    // Ensure fill price is positive
    return Math.max(fillPrice, price * 0.001) // Minimum 0.1% of original price
  }

  /**
   * Get virtual balance
   */
  getVirtualBalance(): number {
    return this.virtualBalance
  }

  /**
   * Get virtual positions
   */
  getVirtualPositions(): Map<string, PaperTrade> {
    return this.virtualPositions
  }

  /**
   * Save trade to file
   */
  private saveTradeToFile(trade: PaperTrade): void {
    try {
      const fileDir = path.dirname(this.config.tradesFile)
      if (!fs.existsSync(fileDir)) {
        fs.mkdirSync(fileDir, { recursive: true })
      }

      let trades: PaperTrade[] = []
      if (fs.existsSync(this.config.tradesFile)) {
        const content = fs.readFileSync(this.config.tradesFile, 'utf-8')
        trades = JSON.parse(content)
      }

      // Update or add trade
      const existingIndex = trades.findIndex(t => t.id === trade.id)
      if (existingIndex >= 0) {
        trades[existingIndex] = trade
      } else {
        trades.push(trade)
      }

      fs.writeFileSync(this.config.tradesFile, JSON.stringify(trades, null, 2))
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error(`Failed to save paper trade to file: ${errorMsg}`)
    }
  }

  /**
   * Load trades from file
   */
  private loadTradesFromFile(): void {
    try {
      if (!fs.existsSync(this.config.tradesFile)) {
        return
      }

      const content = fs.readFileSync(this.config.tradesFile, 'utf-8')
      const trades: PaperTrade[] = JSON.parse(content)

      // Load open positions
      for (const trade of trades) {
        if (trade.status === 'OPEN') {
          this.virtualPositions.set(trade.symbol, trade)
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.warn(`Failed to load paper trades from file: ${errorMsg}`)
    }
  }
}
