/**
 * Hyperliquid Mainnet Futures Trading Tool
 * Execute REAL futures trades on Hyperliquid mainnet using @nktkas/hyperliquid SDK
 * Endpoint: https://api.hyperliquid.xyz
 * 
 * WARNING: This tool executes REAL trades with REAL money!
 * Includes additional safety checks and confirmations.
 * 
 * Features:
 * - Dynamic slippage with auto-retry (0.010% to 8.00%)
 * - Three order modes: market, limit, custom
 * - Configurable slippage parameters
 * - Safety checks for mainnet trading
 */

import { z } from 'zod'
import * as hl from '@nktkas/hyperliquid'

const MINIMUM_ORDER_VALUE_USD = 10
const MAX_POSITION_SIZE_PERCENT = 25
const ALLOWED_ASSETS = ['BTC', 'ETH', 'SOL', 'ARB', 'DOGE', 'MATIC', 'AVAX', 'LINK', 'OP', 'APT', 'SUI', 'SEI', 'TIA', 'INJ', 'BLUR', 'PYTH', 'JTO', 'WIF', 'JUP', 'STRK', 'ONDO', 'W', 'ENA', 'PEPE', 'BONK', 'NEAR', 'FTM', 'ATOM', 'DOT', 'LTC', 'BCH', 'XRP', 'ADA', 'TON', 'FIL', 'HYPE']

interface SlippageConfig {
  startSlippage: number
  maxSlippage: number
  incrementStep: number
  maxRetries: number
}

const DEFAULT_SLIPPAGE_CONFIG: SlippageConfig = {
  startSlippage: 0.00010,   // 0.010%
  maxSlippage: 0.08,        // 8.00%
  incrementStep: 0.00010,   // 0.010% per step
  maxRetries: 50
}

const slippageConfigSchema = z.object({
  startSlippage: z.number().min(0).max(0.5).optional().describe('Starting slippage (0.00010 = 0.010%, 0.01 = 1%)'),
  maxSlippage: z.number().min(0).max(0.5).optional().describe('Maximum slippage (0.08 = 8%, 0.5 = 50%)'),
  incrementStep: z.number().min(0.00001).max(0.1).optional().describe('Slippage increment per retry'),
  maxRetries: z.number().int().min(1).max(200).optional().describe('Maximum retry attempts (default: 50)'),
}).optional()

const mainnetFuturesTradeInputSchema = z.object({
  symbol: z.string().describe('Asset symbol (e.g., "BTC", "ETH", "SOL")'),
  side: z.enum(['buy', 'sell']).describe('"buy" for long, "sell" for short'),
  
  // Size options - use ONE of these
  size: z.string().optional().describe('Order size in asset units (e.g., "0.001" for BTC). Use this OR sizeInUsd, not both.'),
  sizeInUsd: z.number().optional().describe('Order size in USD (e.g., 100 for $100 position). Will be converted to asset units automatically.'),
  sizeDecimals: z.number().int().min(1).max(8).optional().describe('Decimal places for size calculation (default: 5 for BTC, 4 for others)'),
  
  orderMode: z.enum(['market', 'limit', 'custom']).describe('Order execution mode: market (auto-retry slippage), limit (exact price), custom (user-defined entry)'),
  fallbackToGtc: z.boolean().default(true).describe('For market orders: fallback to GTC limit order if IOC fails due to no liquidity (default: true)'),
  
  limitPrice: z.string().optional().describe('Exact price for limit orders (required when orderMode is "limit")'),
  customEntryPrice: z.string().optional().describe('User-defined entry price (required when orderMode is "custom")'),
  useSlippageForCustom: z.boolean().default(true).describe('Apply slippage protection to custom entry price (default: true)'),
  
  slippageConfig: slippageConfigSchema.describe('Override default slippage configuration'),
  
  leverage: z.number().int().min(1).max(100).optional().describe('Leverage 1-100x (uses account default if not specified)'),
  reduceOnly: z.boolean().default(false).describe('Reduce only order (default: false)'),
  timeInForce: z.enum(['Gtc', 'Alo', 'Ioc']).optional().describe('Time in force (default: Ioc for market, Gtc for limit)'),
  triggerPrice: z.string().optional().describe('Trigger price for trigger orders'),
  tpsl: z.enum(['tp', 'sl']).optional().describe('Take profit or stop loss marker'),
  cloid: z.string().optional().describe('Client order ID (optional, for tracking)'),
  
  confirmExecution: z.boolean().default(false).describe('REQUIRED: Must be set to true to confirm you want to execute a REAL trade with REAL money'),
})

export type MainnetFuturesTradeInput = z.infer<typeof mainnetFuturesTradeInputSchema>

interface TradeResult {
  success: boolean
  orderId?: number
  status?: 'filled' | 'partial' | 'resting' | 'canceled'
  executedSize?: string
  averagePrice?: string
  orderMode?: 'market' | 'limit' | 'custom'
  appliedSlippage?: string
  retryAttempts?: number
  requestedPrice?: string
  sizeInUsd?: number
  calculatedSize?: string
  error?: string
  warning?: string
  details?: any
  timestamp?: number
  safetyChecks?: {
    assetAllowed: boolean
    minimumValueMet: boolean
    positionSizeOk: boolean
    confirmationProvided: boolean
  }
}

async function getAssetIndex(infoClient: hl.InfoClient, symbol: string): Promise<number> {
  const meta = await infoClient.meta()
  const index = meta.universe.findIndex((asset: any) => asset.name === symbol.toUpperCase())
  if (index === -1) {
    throw new Error(`Asset ${symbol} not found in Hyperliquid perpetuals universe`)
  }
  return index
}

async function getCurrentPrice(infoClient: hl.InfoClient, symbol: string): Promise<number> {
  const mids = await infoClient.allMids()
  const price = mids[symbol.toUpperCase()]
  if (!price) {
    throw new Error(`Could not get current price for ${symbol}`)
  }
  return parseFloat(price)
}

async function getAccountEquity(infoClient: hl.InfoClient, address: string): Promise<number> {
  try {
    const state = await infoClient.clearinghouseState({ user: address as `0x${string}` })
    return parseFloat(state.marginSummary.accountValue)
  } catch {
    return 0
  }
}

function validateAsset(symbol: string): boolean {
  return ALLOWED_ASSETS.includes(symbol.toUpperCase())
}

function isSlippageError(error: any): boolean {
  const errorMsg = (error?.message || String(error)).toLowerCase()
  const slippageErrors = [
    'slippage',
    'price moved',
    'execution price',
    'out of range',
    'price limit',
    'would cross',
    'price too',
  ]
  return slippageErrors.some(msg => errorMsg.includes(msg))
}

function formatPrice(price: number, symbol: string): string {
  // Hyperliquid has specific tick sizes for different assets
  // BTC: 1 (whole numbers), ETH: 0.1, most others: 0.01 or smaller
  const upperSymbol = symbol.toUpperCase()
  
  if (upperSymbol === 'BTC') {
    return Math.round(price).toString()
  } else if (upperSymbol === 'ETH') {
    return (Math.round(price * 10) / 10).toFixed(1)
  } else if (['SOL', 'AVAX', 'LINK', 'DOT', 'ATOM', 'NEAR', 'APT', 'SUI', 'INJ', 'TIA', 'SEI'].includes(upperSymbol)) {
    return (Math.round(price * 100) / 100).toFixed(2)
  } else {
    // For smaller priced assets, use more decimals
    return (Math.round(price * 10000) / 10000).toFixed(4)
  }
}

function calculateSlippagePrice(basePrice: number, slippage: number, side: 'buy' | 'sell', symbol: string): string {
  const adjustedPrice = side === 'buy'
    ? basePrice * (1 + slippage)
    : basePrice * (1 - slippage)
  return formatPrice(adjustedPrice, symbol)
}

async function performSafetyChecks(
  input: MainnetFuturesTradeInput,
  infoClient: hl.InfoClient,
  mainWalletAddress: string
): Promise<{ passed: boolean; checks: TradeResult['safetyChecks']; errors: string[] }> {
  const errors: string[] = []
  const checks: TradeResult['safetyChecks'] = {
    assetAllowed: false,
    minimumValueMet: false,
    positionSizeOk: false,
    confirmationProvided: false,
  }

  checks.confirmationProvided = input.confirmExecution === true
  if (!checks.confirmationProvided) {
    errors.push('SAFETY: confirmExecution must be set to true to execute REAL trades')
  }

  checks.assetAllowed = validateAsset(input.symbol)
  if (!checks.assetAllowed) {
    errors.push(`SAFETY: Asset ${input.symbol} is not in the allowed list. Allowed: ${ALLOWED_ASSETS.join(', ')}`)
  }

  try {
    const currentPrice = await getCurrentPrice(infoClient, input.symbol)
    const orderValue = parseFloat(input.size) * currentPrice
    checks.minimumValueMet = orderValue >= MINIMUM_ORDER_VALUE_USD
    if (!checks.minimumValueMet) {
      errors.push(`SAFETY: Order value ($${orderValue.toFixed(2)}) is below minimum ($${MINIMUM_ORDER_VALUE_USD})`)
    }

    const accountEquity = await getAccountEquity(infoClient, mainWalletAddress)
    if (accountEquity > 0) {
      const leverage = input.leverage || 1
      const positionNotional = orderValue * leverage
      const positionPercent = (positionNotional / accountEquity) * 100
      checks.positionSizeOk = positionPercent <= MAX_POSITION_SIZE_PERCENT
      if (!checks.positionSizeOk) {
        errors.push(`SAFETY: Position size (${positionPercent.toFixed(1)}% of equity) exceeds max allowed (${MAX_POSITION_SIZE_PERCENT}%)`)
      }
    } else {
      checks.positionSizeOk = true
    }
  } catch (priceError: any) {
    errors.push(`SAFETY: Could not verify order parameters: ${priceError.message}`)
  }

  const passed = checks.confirmationProvided && checks.assetAllowed && checks.minimumValueMet && checks.positionSizeOk
  return { passed, checks, errors }
}

async function placeOrderWithSlippage(
  exchClient: hl.ExchangeClient,
  assetIndex: number,
  side: 'buy' | 'sell',
  size: string,
  price: string,
  reduceOnly: boolean,
  timeInForce: 'Gtc' | 'Alo' | 'Ioc',
  cloid?: string
): Promise<{ success: boolean; status?: any; error?: string; result?: any }> {
  // Ensure reduceOnly is boolean (MCP may pass string)
  const reduceOnlyBool = reduceOnly === true || reduceOnly === 'true' as any
  
  // Only include cloid if it's a valid hex string, otherwise undefined
  const validCloid = cloid && cloid.length > 0 && /^0[xX][0-9a-fA-F]+$/.test(cloid) ? cloid : undefined
  
  const orderRequest: hl.OrderParameters = {
    orders: [{
      a: assetIndex,
      b: side === 'buy',
      p: price,
      s: size,
      r: reduceOnlyBool,
      t: { limit: { tif: timeInForce } },
      c: validCloid,
    }],
    grouping: 'na',
  }

  const result = await exchClient.order(orderRequest)

  if (result.response?.type === 'order' && result.response.data?.statuses) {
    const status = result.response.data.statuses[0] as any
    
    if (status.error) {
      return { success: false, error: String(status.error), result }
    }

    if (status.filled) {
      return { success: true, status: { type: 'filled', ...status.filled }, result }
    }

    if (status.resting) {
      return { success: true, status: { type: 'resting', ...status.resting }, result }
    }
  }

  return { success: true, result }
}

function isNoLiquidityError(error: any): boolean {
  const errorMsg = (error?.message || String(error)).toLowerCase()
  return errorMsg.includes('could not immediately match') || 
         errorMsg.includes('no resting orders') ||
         errorMsg.includes('no liquidity')
}

async function executeWithSlippageRetry(
  exchClient: hl.ExchangeClient,
  infoClient: hl.InfoClient,
  assetIndex: number,
  symbol: string,
  side: 'buy' | 'sell',
  size: string,
  basePrice: number,
  reduceOnly: boolean,
  config: SlippageConfig,
  safetyChecks: TradeResult['safetyChecks'],
  fallbackToGtc: boolean = true,
  cloid?: string
): Promise<TradeResult> {
  let currentSlippage = config.startSlippage
  let attempt = 0
  let noLiquidityAttempts = 0
  const maxNoLiquidityAttempts = 3

  while (currentSlippage <= config.maxSlippage && attempt < config.maxRetries) {
    const orderPrice = calculateSlippagePrice(basePrice, currentSlippage, side, symbol)
    
    try {
      const orderResult = await placeOrderWithSlippage(
        exchClient,
        assetIndex,
        side,
        size,
        orderPrice,
        reduceOnly,
        'Ioc',
        cloid
      )

      if (orderResult.success && orderResult.status?.type === 'filled') {
        return {
          success: true,
          orderId: orderResult.status.oid,
          status: 'filled',
          executedSize: orderResult.status.totalSz,
          averagePrice: orderResult.status.avgPx,
          appliedSlippage: (currentSlippage * 100).toFixed(3) + '%',
          retryAttempts: attempt,
          requestedPrice: basePrice.toFixed(6),
          warning: 'MAINNET: Real trade executed with real funds',
          details: orderResult.result,
          timestamp: Date.now(),
          safetyChecks,
        }
      }

      if (orderResult.success && orderResult.status?.type === 'resting') {
        return {
          success: true,
          orderId: orderResult.status.oid,
          status: 'resting',
          appliedSlippage: (currentSlippage * 100).toFixed(3) + '%',
          retryAttempts: attempt,
          requestedPrice: basePrice.toFixed(6),
          warning: 'MAINNET: Real order placed on book',
          details: { message: 'Order resting on book', ...orderResult.result },
          timestamp: Date.now(),
          safetyChecks,
        }
      }

      if (orderResult.error) {
        // Check for no liquidity error - fallback to GTC limit order
        if (isNoLiquidityError({ message: orderResult.error })) {
          noLiquidityAttempts++
          
          if (fallbackToGtc && noLiquidityAttempts >= maxNoLiquidityAttempts) {
            console.log(`[MAINNET] No liquidity after ${noLiquidityAttempts} attempts, falling back to GTC limit order`)
            
            const gtcResult = await placeOrderWithSlippage(
              exchClient,
              assetIndex,
              side,
              size,
              orderPrice,
              reduceOnly,
              'Gtc',
              cloid
            )
            
            if (gtcResult.error) {
              return {
                success: false,
                error: gtcResult.error,
                retryAttempts: attempt,
                appliedSlippage: (currentSlippage * 100).toFixed(3) + '%',
                details: { ...gtcResult.result, fallbackUsed: 'GTC' },
                timestamp: Date.now(),
                safetyChecks,
              }
            }
            
            if (gtcResult.status?.type === 'filled') {
              return {
                success: true,
                orderId: gtcResult.status.oid,
                status: 'filled',
                executedSize: gtcResult.status.totalSz,
                averagePrice: gtcResult.status.avgPx,
                appliedSlippage: (currentSlippage * 100).toFixed(3) + '%',
                retryAttempts: attempt,
                requestedPrice: basePrice.toFixed(6),
                warning: 'MAINNET: Real trade executed with real funds',
                details: { ...gtcResult.result, fallbackUsed: 'GTC' },
                timestamp: Date.now(),
                safetyChecks,
              }
            }
            
            if (gtcResult.status?.type === 'resting') {
              return {
                success: true,
                orderId: gtcResult.status.oid,
                status: 'resting',
                appliedSlippage: (currentSlippage * 100).toFixed(3) + '%',
                retryAttempts: attempt,
                requestedPrice: orderPrice,
                warning: 'MAINNET: GTC limit order placed (no immediate liquidity)',
                details: { message: 'GTC limit order placed', ...gtcResult.result, fallbackUsed: 'GTC' },
                timestamp: Date.now(),
                safetyChecks,
              }
            }
          }
          
          currentSlippage += config.incrementStep
          attempt++
          console.log(`[MAINNET] No liquidity, retry ${attempt}: Increasing slippage to ${(currentSlippage * 100).toFixed(3)}%`)
          continue
        }
        
        if (isSlippageError({ message: orderResult.error })) {
          currentSlippage += config.incrementStep
          attempt++
          console.log(`[MAINNET] Retry ${attempt}: Increasing slippage to ${(currentSlippage * 100).toFixed(3)}%`)
          continue
        }
        return {
          success: false,
          error: orderResult.error,
          retryAttempts: attempt,
          appliedSlippage: (currentSlippage * 100).toFixed(3) + '%',
          details: orderResult.result,
          timestamp: Date.now(),
          safetyChecks,
        }
      }

      currentSlippage += config.incrementStep
      attempt++
      
    } catch (error: any) {
      if (isSlippageError(error) || isNoLiquidityError(error)) {
        currentSlippage += config.incrementStep
        attempt++
        console.log(`[MAINNET] Retry ${attempt}: Increasing slippage to ${(currentSlippage * 100).toFixed(3)}%`)
        continue
      }
      throw error
    }
  }

  return {
    success: false,
    error: `Order failed after ${attempt} retries. Max slippage ${(config.maxSlippage * 100).toFixed(2)}% reached.`,
    retryAttempts: attempt,
    appliedSlippage: (currentSlippage * 100).toFixed(3) + '%',
    timestamp: Date.now(),
    safetyChecks,
  }
}

async function executeMainnetFuturesTrade(input: MainnetFuturesTradeInput): Promise<TradeResult> {
  const privateKey = process.env.AGENT_WALLET_PRIVATE_KEY
  const mainWalletAddress = process.env.MAIN_WALLET_ADDRESS

  if (!privateKey) {
    return { success: false, error: 'AGENT_WALLET_PRIVATE_KEY environment variable not set' }
  }

  if (!mainWalletAddress) {
    return { success: false, error: 'MAIN_WALLET_ADDRESS environment variable not set' }
  }

  // Validate size input - must have either size or sizeInUsd
  if (!input.size && !input.sizeInUsd) {
    return { success: false, error: 'Either size (in asset units) or sizeInUsd (in USD) is required' }
  }
  if (input.size && input.sizeInUsd) {
    return { success: false, error: 'Provide either size OR sizeInUsd, not both' }
  }

  // Validate order mode specific requirements
  if (input.orderMode === 'limit' && !input.limitPrice) {
    return { success: false, error: 'limitPrice is required when orderMode is "limit"' }
  }
  if (input.orderMode === 'custom' && !input.customEntryPrice) {
    return { success: false, error: 'customEntryPrice is required when orderMode is "custom"' }
  }

  // Validate slippage config
  if (input.slippageConfig) {
    const { startSlippage, maxSlippage } = input.slippageConfig
    if (startSlippage !== undefined && (startSlippage < 0 || startSlippage > 0.5)) {
      return { success: false, error: 'Start slippage must be between 0% and 50%' }
    }
    if (maxSlippage !== undefined && startSlippage !== undefined && maxSlippage < startSlippage) {
      return { success: false, error: 'Max slippage must be >= start slippage' }
    }
    if (maxSlippage !== undefined && maxSlippage > 0.5) {
      return { success: false, error: 'Max slippage cannot exceed 50%' }
    }
  }

  try {
    const transport = new hl.HttpTransport({ isTestnet: false })
    const infoClient = new hl.InfoClient({ transport })

    // Perform safety checks
    const safetyResult = await performSafetyChecks(input, infoClient, mainWalletAddress)
    
    if (!safetyResult.passed) {
      return {
        success: false,
        error: 'Safety checks failed',
        details: safetyResult.errors,
        safetyChecks: safetyResult.checks,
        timestamp: Date.now(),
      }
    }

    const exchClient = new hl.ExchangeClient({
      wallet: privateKey as `0x${string}`,
      transport,
    })

    const assetIndex = await getAssetIndex(infoClient, input.symbol)
    
    // Calculate size - convert from USD if sizeInUsd is provided
    let orderSize: string
    let sizeInUsdValue: number | undefined
    
    if (input.sizeInUsd) {
      const currentPrice = await getCurrentPrice(infoClient, input.symbol)
      sizeInUsdValue = typeof input.sizeInUsd === 'string' ? parseFloat(input.sizeInUsd) : input.sizeInUsd
      const calculatedSize = sizeInUsdValue / currentPrice
      
      // Use custom decimals or default based on asset
      let decimals = input.sizeDecimals
      if (decimals === undefined) {
        const upperSymbol = input.symbol.toUpperCase()
        if (upperSymbol === 'BTC') {
          decimals = 5
        } else if (upperSymbol === 'ETH') {
          decimals = 4
        } else {
          decimals = 4
        }
      }
      orderSize = calculatedSize.toFixed(decimals)
    } else {
      orderSize = input.size!
    }

    // Update leverage if specified
    if (input.leverage) {
      try {
        await exchClient.updateLeverage({
          asset: assetIndex,
          isCross: true,
          leverage: input.leverage,
        })
      } catch (leverageError: any) {
        console.warn(`Warning: Could not update leverage: ${leverageError.message}`)
      }
    }

    // Build slippage config
    const slippageConfig: SlippageConfig = {
      startSlippage: input.slippageConfig?.startSlippage ?? DEFAULT_SLIPPAGE_CONFIG.startSlippage,
      maxSlippage: input.slippageConfig?.maxSlippage ?? DEFAULT_SLIPPAGE_CONFIG.maxSlippage,
      incrementStep: input.slippageConfig?.incrementStep ?? DEFAULT_SLIPPAGE_CONFIG.incrementStep,
      maxRetries: input.slippageConfig?.maxRetries ?? DEFAULT_SLIPPAGE_CONFIG.maxRetries,
    }

    console.log(`[MAINNET] Executing ${input.side} ${input.size} ${input.symbol}`)

    // Handle different order modes
    if (input.orderMode === 'market') {
      const currentPrice = await getCurrentPrice(infoClient, input.symbol)
      const fallbackToGtc = input.fallbackToGtc !== false // default true
      const result = await executeWithSlippageRetry(
        exchClient,
        infoClient,
        assetIndex,
        input.symbol,
        input.side,
        orderSize,
        currentPrice,
        input.reduceOnly,
        slippageConfig,
        safetyResult.checks,
        fallbackToGtc,
        input.cloid
      )
      return { ...result, orderMode: 'market', sizeInUsd: sizeInUsdValue, calculatedSize: orderSize }
    }

    if (input.orderMode === 'limit') {
      const orderResult = await placeOrderWithSlippage(
        exchClient,
        assetIndex,
        input.side,
        orderSize,
        input.limitPrice!,
        input.reduceOnly,
        input.timeInForce || 'Gtc',
        input.cloid
      )

      if (orderResult.error) {
        return {
          success: false,
          error: orderResult.error,
          orderMode: 'limit',
          details: orderResult.result,
          timestamp: Date.now(),
          safetyChecks: safetyResult.checks,
        }
      }

      if (orderResult.status?.type === 'filled') {
        return {
          success: true,
          orderId: orderResult.status.oid,
          status: 'filled',
          executedSize: orderResult.status.totalSz,
          averagePrice: orderResult.status.avgPx,
          orderMode: 'limit',
          appliedSlippage: '0%',
          retryAttempts: 0,
          requestedPrice: input.limitPrice,
          sizeInUsd: sizeInUsdValue,
          calculatedSize: orderSize,
          warning: 'MAINNET: Real trade executed with real funds',
          details: orderResult.result,
          timestamp: Date.now(),
          safetyChecks: safetyResult.checks,
        }
      }

      if (orderResult.status?.type === 'resting') {
        return {
          success: true,
          orderId: orderResult.status.oid,
          status: 'resting',
          orderMode: 'limit',
          appliedSlippage: '0%',
          requestedPrice: input.limitPrice,
          sizeInUsd: sizeInUsdValue,
          calculatedSize: orderSize,
          warning: 'MAINNET: Real order placed on book',
          details: { message: 'Limit order resting on book', ...orderResult.result },
          timestamp: Date.now(),
          safetyChecks: safetyResult.checks,
        }
      }

      return {
        success: true,
        orderMode: 'limit',
        sizeInUsd: sizeInUsdValue,
        calculatedSize: orderSize,
        warning: 'MAINNET: Order submitted',
        details: orderResult.result,
        timestamp: Date.now(),
        safetyChecks: safetyResult.checks,
      }
    }

    if (input.orderMode === 'custom') {
      const customPrice = parseFloat(input.customEntryPrice!)
      const fallbackToGtc = input.fallbackToGtc !== false // default true

      if (input.useSlippageForCustom) {
        const result = await executeWithSlippageRetry(
          exchClient,
          infoClient,
          assetIndex,
          input.symbol,
          input.side,
          orderSize,
          customPrice,
          input.reduceOnly,
          slippageConfig,
          safetyResult.checks,
          fallbackToGtc,
          input.cloid
        )
        return { ...result, orderMode: 'custom', sizeInUsd: sizeInUsdValue, calculatedSize: orderSize }
      } else {
        const orderResult = await placeOrderWithSlippage(
          exchClient,
          assetIndex,
          input.side,
          orderSize,
          input.customEntryPrice!,
          input.reduceOnly,
          input.timeInForce || 'Gtc',
          input.cloid
        )

        if (orderResult.error) {
          return {
            success: false,
            error: orderResult.error,
            orderMode: 'custom',
            details: orderResult.result,
            timestamp: Date.now(),
            safetyChecks: safetyResult.checks,
          }
        }

        if (orderResult.status?.type === 'filled') {
          return {
            success: true,
            orderId: orderResult.status.oid,
            status: 'filled',
            executedSize: orderResult.status.totalSz,
            averagePrice: orderResult.status.avgPx,
            orderMode: 'custom',
            appliedSlippage: '0%',
            retryAttempts: 0,
            requestedPrice: input.customEntryPrice,
            warning: 'MAINNET: Real trade executed with real funds',
            details: orderResult.result,
            timestamp: Date.now(),
            safetyChecks: safetyResult.checks,
          }
        }

        if (orderResult.status?.type === 'resting') {
          return {
            success: true,
            orderId: orderResult.status.oid,
            status: 'resting',
            orderMode: 'custom',
            appliedSlippage: '0%',
            requestedPrice: input.customEntryPrice,
            warning: 'MAINNET: Real order placed on book',
            details: { message: 'Custom order resting on book', ...orderResult.result },
            timestamp: Date.now(),
            safetyChecks: safetyResult.checks,
          }
        }

        return {
          success: true,
          orderMode: 'custom',
          warning: 'MAINNET: Order submitted',
          details: orderResult.result,
          timestamp: Date.now(),
          safetyChecks: safetyResult.checks,
        }
      }
    }

    return { success: false, error: `Unknown order mode: ${input.orderMode}` }

  } catch (error: any) {
    return {
      success: false,
      error: error.message || String(error),
      details: error,
      timestamp: Date.now(),
    }
  }
}

export async function mainnetFuturesTrade(input: MainnetFuturesTradeInput): Promise<TradeResult> {
  return executeMainnetFuturesTrade(input)
}

export function registerMainnetFuturesTradeTool(server: any) {
  server.registerTool(
    'hyperliquid_mainnet_futures_trade',
    {
      title: 'Hyperliquid Mainnet Futures Trade',
      description: `Execute REAL futures trades on Hyperliquid MAINNET with REAL MONEY.

WARNING: This executes actual trades with real funds!

Order Modes:
- market: Auto-retry with increasing slippage (0.010% to 8.00%)
- limit: Exact price execution, no slippage
- custom: User-defined entry price with optional slippage protection

Safety Checks:
- confirmExecution must be true
- Minimum order value: $${MINIMUM_ORDER_VALUE_USD}
- Maximum position size: ${MAX_POSITION_SIZE_PERCENT}% of account equity
- Asset whitelist enforced

Requires AGENT_WALLET_PRIVATE_KEY and MAIN_WALLET_ADDRESS environment variables.`,
      inputSchema: mainnetFuturesTradeInputSchema,
      outputSchema: z.object({
        success: z.boolean(),
        orderId: z.number().optional(),
        status: z.enum(['filled', 'partial', 'resting', 'canceled']).optional(),
        executedSize: z.string().optional(),
        averagePrice: z.string().optional(),
        orderMode: z.enum(['market', 'limit', 'custom']).optional(),
        appliedSlippage: z.string().optional(),
        retryAttempts: z.number().optional(),
        requestedPrice: z.string().optional(),
        error: z.string().optional(),
        warning: z.string().optional(),
        details: z.any().optional(),
        timestamp: z.number().optional(),
        safetyChecks: z.object({
          assetAllowed: z.boolean(),
          minimumValueMet: z.boolean(),
          positionSizeOk: z.boolean(),
          confirmationProvided: z.boolean(),
        }).optional(),
      }),
    },
    async (input: MainnetFuturesTradeInput) => {
      try {
        const result = await mainnetFuturesTrade(input)
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          structuredContent: result,
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        const errorResult = { success: false, error: errorMessage, timestamp: Date.now() }
        return {
          content: [{ type: 'text', text: JSON.stringify(errorResult, null, 2) }],
          structuredContent: errorResult,
        }
      }
    }
  )
}
