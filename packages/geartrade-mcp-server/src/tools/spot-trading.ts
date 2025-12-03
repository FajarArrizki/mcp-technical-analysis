/**
 * Spot Trading Tool for Hyperliquid
 * Execute spot buy/sell orders using the order endpoint
 * Spot asset index = 10000 + spotIndex
 * Uses slippage retry mechanism similar to futures
 */

import { z } from 'zod'
import * as hl from '@nktkas/hyperliquid'

// ============================================================================
// SLIPPAGE CONFIG (same as futures)
// ============================================================================

interface SlippageConfig {
  type?: 'retry' | 'fixed'
  fixedSlippage?: number
  startSlippage: number
  maxSlippage: number
  incrementStep: number
  maxRetries: number
}

const DEFAULT_SLIPPAGE_CONFIG: SlippageConfig = {
  type: 'retry',
  startSlippage: 0.00010,   // 0.010%
  maxSlippage: 0.08,        // 8.00%
  incrementStep: 0.00010,   // 0.010% per step
  maxRetries: 50
}

// ============================================================================
// SCHEMAS
// ============================================================================

const spotTradeSchema = z.object({
  // Token pair (just base token name, e.g., "PURR", "HYPE")
  pair: z.string().describe('Spot token symbol (e.g., "PURR", "HYPE"). TESTNET: Only HYPE may work due to low liquidity. MAINNET: All tokens available.'),
  
  // Side
  side: z.enum(['buy', 'sell']).describe('"buy" to buy token, "sell" to sell token'),
  
  // Amount
  size: z.string().describe('Order size in token units (e.g., "10" for 10 PURR)'),
  
  // Order type
  orderType: z.enum(['limit', 'market']).default('market').describe('Order type: "limit" for exact price, "market" for immediate execution with slippage protection (see slippageType)'),
  
  // Price (optional for market orders)
  price: z.string().optional().describe('Limit price for limit orders. Market orders use automatic slippage protection.'),
  
  // Slippage configuration
  slippageType: z.enum(['retry', 'fixed']).default('retry').optional().describe('Slippage type for market orders: "retry" = auto-retry with increasing slippage (0.010% → 8.00%), "fixed" = single attempt with fixed slippage'),
  fixedSlippage: z.number().min(0).max(0.5).optional().describe('Fixed slippage percentage for single attempt (e.g., 0.001 = 0.1%, 0.01 = 1%). Only used when slippageType is "fixed".'),
  
  // Testnet/Mainnet
  isTestnet: z.boolean().default(false).describe('Use testnet (true) or mainnet (false). WARNING: Testnet spot has low liquidity. RECOMMENDED: Use mainnet with small amounts.'),
  confirmMainnet: z.boolean().optional().describe('Required confirmation for mainnet execution'),
})

export type SpotTradeInput = z.infer<typeof spotTradeSchema>

interface SpotTradeResult {
  success: boolean
  pair?: string
  side?: string
  size?: string
  executionPrice?: string
  orderId?: number
  status?: 'filled' | 'resting' | 'canceled'
  slippage?: number
  slippageType?: 'retry' | 'fixed'
  error?: string
  details?: any
  timestamp?: number
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getExchangeClient(isTestnet: boolean): { exchClient: hl.ExchangeClient; infoClient: hl.InfoClient } {
  const privateKey = process.env.AGENT_WALLET_PRIVATE_KEY
  
  if (!privateKey) {
    throw new Error('AGENT_WALLET_PRIVATE_KEY environment variable not set')
  }

  // Use default Hyperliquid endpoints for spot trading
  // Info API untuk data, Exchange RPC untuk order submission
  console.log(`   Using Hyperliquid ${isTestnet ? 'testnet' : 'mainnet'} endpoints`)

  const transport = new hl.HttpTransport({ 
    isTestnet
    // SDK will use default endpoints:
    // testnet: https://api.hyperliquid-testnet.xyz
    // mainnet: https://api.hyperliquid.xyz
  })
  
  const exchClient = new hl.ExchangeClient({
    wallet: privateKey as `0x${string}`,
    transport,
  })

  const infoClient = new hl.InfoClient({ transport })

  return { exchClient, infoClient }
}

async function getSpotMeta(infoClient: hl.InfoClient): Promise<any> {
  try {
    return await infoClient.spotMeta()
  } catch (error: any) {
    console.error('Error fetching spot metadata:', error)
    throw new Error(`Failed to fetch spot metadata: ${error.message}`)
  }
}

function findSpotPairIndex(spotMeta: any, pair: string): number {
  const upperPair = pair.toUpperCase()
  const index = spotMeta.tokens.findIndex((t: any) => 
    t.name?.toUpperCase() === upperPair
  )
  
  if (index === -1) {
    throw new Error(`Spot pair ${pair} not found. Available pairs: ${spotMeta.tokens.map((t: any) => t.name).join(', ')}`)
  }
  
  return index
}

async function getSpotTokenInfo(infoClient: hl.InfoClient, pair: string): Promise<{
  index: number
  name: string
  decimals: number
  price: number
  bestBid: number
  bestAsk: number
  tokenId: string
  priceDecimals: number
}> {
  try {
    const spotMeta = await infoClient.spotMeta()
    
    // Find token by name
    const tokenIndex = spotMeta.tokens.findIndex((t: any) => 
      t.name?.toUpperCase() === pair.toUpperCase()
    )
    
    if (tokenIndex === -1) {
      throw new Error(`Spot pair ${pair} not found. Use exact token name from spot metadata.`)
    }
    
    const token = spotMeta.tokens[tokenIndex]
    
    // Try to get L2 order book for best bid/ask (more accurate than mid)
    const assetIndex = 10000 + tokenIndex
    let bestBid = 0
    let bestAsk = 0
    let price = 0
    
    try {
      const l2Data = await infoClient.l2Book({ coin: assetIndex.toString() })
      
      if (l2Data && l2Data.levels) {
        // Parse best bid and ask from L2 book
        bestBid = l2Data.levels[0]?.[0]?.[0] ? parseFloat(l2Data.levels[0][0][0].px) : 0
        bestAsk = l2Data.levels[1]?.[0]?.[0] ? parseFloat(l2Data.levels[1][0][0].px) : 0
        
        if (bestBid > 0 && bestAsk > 0) {
          price = (bestBid + bestAsk) / 2
        }
      }
    } catch (e) {
      // L2 book not available for this token
    }
    
    // Fallback to allMids if L2 book not available
    if (price === 0) {
      const mids = await infoClient.allMids()
      const priceKey = `@${tokenIndex + 1}` // Spot pairs use @1, @2, @3, etc.
      price = parseFloat(mids[priceKey] || '0')
      
      if (price === 0) {
        throw new Error(`Could not get price for ${pair}`)
      }
      
      // Estimate bid/ask from mid with 0.1% spread
      bestBid = price * 0.999
      bestAsk = price * 1.001
    }
    
    return {
      index: tokenIndex,
      name: token.name,
      decimals: token.szDecimals || 0,
      price,
      bestBid,
      bestAsk,
      tokenId: token.tokenId,
      priceDecimals: determinePriceDecimals(price),
    }
  } catch (error: any) {
    console.error('Error getting spot token info:', error)
    throw error
  }
}

function determinePriceDecimals(price: number): number {
  // Determine appropriate decimals based on price
  if (price >= 1000) return 0     // BTC-like: $92000 → 0 decimals
  if (price >= 100) return 1      // ETH-like: $3500 → 1 decimal
  if (price >= 10) return 2       // SOL-like: $100 → 2 decimals
  if (price >= 1) return 3        // PURR-like: $12 → 3 decimals
  if (price >= 0.1) return 4      // Low price: $0.5 → 4 decimals
  return 6                        // Very low price: $0.01 → 6 decimals
}

function formatSpotSize(size: number, decimals: number): string {
  if (decimals === 0) {
    // For tokens with 0 decimals, return whole number
    return Math.floor(size).toString()
  } else {
    // For tokens with decimals, format properly
    return size.toFixed(decimals)
  }
}

function formatSpotPrice(price: number, priceDecimals: number): string {
  return price.toFixed(priceDecimals)
}

function calculateSlippagePrice(
  basePrice: number, 
  slippage: number,  // Already as decimal (0.0001 = 0.01%)
  side: 'buy' | 'sell',
  priceDecimals: number
): string {
  const adjustedPrice = side === 'buy'
    ? basePrice * (1 + slippage)
    : basePrice * (1 - slippage)
  return formatSpotPrice(adjustedPrice, priceDecimals)
}

async function placeSpotOrderWithSlippage(
  exchClient: hl.ExchangeClient,
  assetIndex: number,
  side: 'buy' | 'sell',
  size: string,
  price: string,
  timeInForce: 'Gtc' | 'Ioc'
): Promise<{ success: boolean; status?: any; error?: string; result?: any }> {
  const orderRequest: hl.OrderParameters = {
    orders: [{
      a: assetIndex,
      b: side === 'buy',
      p: price,
      s: size,
      r: false,  // Spot orders can't be reduce-only
      t: { limit: { tif: timeInForce } },
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

async function executeSpotWithSlippageRetry(
  exchClient: hl.ExchangeClient,
  assetIndex: number,
  tokenName: string,
  side: 'buy' | 'sell',
  size: string,
  basePrice: number,
  priceDecimals: number,
  config: SlippageConfig
): Promise<SpotTradeResult> {
  let currentSlippage = config.startSlippage
  let attempt = 0

  console.log(`   Starting slippage retry: ${(config.startSlippage * 100).toFixed(3)}% -> ${(config.maxSlippage * 100).toFixed(3)}%`)

  while (currentSlippage <= config.maxSlippage && attempt < config.maxRetries) {
    const orderPrice = calculateSlippagePrice(basePrice, currentSlippage, side, priceDecimals)
    
    console.log(`   Attempt ${attempt + 1}: slippage ${(currentSlippage * 100).toFixed(3)}%, price ${orderPrice}`)
    
    try {
      const orderResult = await placeSpotOrderWithSlippage(
        exchClient,
        assetIndex,
        side,
        size,
        orderPrice,
        'Ioc'
      )

      if (orderResult.success && orderResult.status?.type === 'filled') {
        console.log(`   ✅ Order filled at attempt ${attempt + 1}`)
        return {
          success: true,
          orderId: orderResult.status.oid,
          status: 'filled',
          pair: tokenName,
          side,
          size: orderResult.status.totalSz,
          executionPrice: orderResult.status.avgPx,
          slippage: currentSlippage * 100,
          details: orderResult.result,
          timestamp: Date.now(),
        }
      }

      if (orderResult.error) {
        const errorLower = orderResult.error.toLowerCase()
        if (errorLower.includes('price') && errorLower.includes('reference')) {
          // Price too far, increase slippage
          currentSlippage += config.incrementStep
          attempt++
          continue
        }
        
        // Other error, return immediately
        return {
          success: false,
          error: orderResult.error,
          timestamp: Date.now(),
        }
      }

    } catch (error: any) {
      console.error(`   ❌ Error at attempt ${attempt + 1}:`, error.message)
      const errorLower = error.message?.toLowerCase() || ''
      
      if (errorLower.includes('price') && errorLower.includes('reference')) {
        currentSlippage += config.incrementStep
        attempt++
        continue
      }
      
      return {
        success: false,
        error: error.message || String(error),
        timestamp: Date.now(),
      }
    }

    currentSlippage += config.incrementStep
    attempt++
  }

  return {
    success: false,
    error: `Max slippage ${(config.maxSlippage * 100).toFixed(2)}% reached after ${attempt} attempts`,
    timestamp: Date.now(),
  }
}

function calculateSizeFromUsd(
  usdAmount: number,
  price: number,
  decimals: number
): { size: string; minSize: string } {
  // Calculate raw size
  const rawSize = usdAmount / price
  
  // Apply decimal formatting
  let size: number
  if (decimals === 0) {
    // For 0 decimals (like PURR), use whole number with minimum 1
    size = Math.max(1, Math.floor(rawSize))
  } else {
    // For tokens with decimals, round to appropriate precision
    const factor = Math.pow(10, decimals)
    size = Math.round(rawSize * factor) / factor
  }
  
  // Minimum size based on decimals
  const minSize = decimals === 0 ? '1' : (1 / Math.pow(10, decimals)).toFixed(decimals)
  
  return {
    size: formatSpotSize(size, decimals),
    minSize,
  }
}

// ============================================================================
// TOOL IMPLEMENTATION
// ============================================================================

export async function spotTrade(input: SpotTradeInput): Promise<SpotTradeResult> {
  const mainWalletAddress = process.env.MAIN_WALLET_ADDRESS

  if (!mainWalletAddress) {
    return { success: false, error: 'MAIN_WALLET_ADDRESS environment variable not set' }
  }

  // Safety check for mainnet
  if (!input.isTestnet && !input.confirmMainnet) {
    return { 
      success: false, 
      error: 'Mainnet execution requires confirmMainnet: true for safety' 
    }
  }

  try {
    console.log(`🔄 Spot trade: ${input.side.toUpperCase()} ${input.size} ${input.pair}`)
    console.log(`   Network: ${input.isTestnet ? 'TESTNET' : 'MAINNET'}`)
    console.log(`   Order type: ${input.orderType}`)
    
    // Testnet warning
    if (input.isTestnet) {
      console.log(``)
      console.log(`   ⚠️  TESTNET SPOT TRADING LIMITATION:`)
      console.log(`   - Testnet spot market has low/no liquidity`)
      console.log(`   - Only HYPE token may be tradeable`)
      console.log(`   - Wide spreads (e.g., HYPE: 2.992% - 13.919%)`)
      console.log(`   - Price may not move, causing all orders to fail`)
      console.log(`   - RECOMMENDATION: Test spot trading on MAINNET with small amounts`)
      console.log(``)
    }

    const { exchClient, infoClient } = getExchangeClient(input.isTestnet)

    // Get complete token information (includes price, decimals, index)
    const tokenInfo = await getSpotTokenInfo(infoClient, input.pair)
    
    // Spot asset index = 10000 + spotIndex (according to Hyperliquid docs)
    const assetIndex = 10000 + tokenInfo.index

    console.log(`   Token: ${tokenInfo.name}`)
    console.log(`   Token decimals: ${tokenInfo.decimals}`)
    console.log(`   Price decimals: ${tokenInfo.priceDecimals}`)
    console.log(`   Spot pair index: ${tokenInfo.index}`)
    console.log(`   Asset index for order: ${assetIndex}`)
    console.log(`   Order book - Bid: $${tokenInfo.bestBid} | Ask: $${tokenInfo.bestAsk}`)
    console.log(`   Mid price: $${tokenInfo.price}`)

    // Determine order size (format according to token decimals)
    let orderSize: string
    if (input.size) {
      // User provided size - validate and format
      const parsedSize = parseFloat(input.size)
      if (parsedSize <= 0) {
        throw new Error('Order size must be greater than 0')
      }
      orderSize = formatSpotSize(parsedSize, tokenInfo.decimals)
      console.log(`   Order size (user): ${orderSize} ${tokenInfo.name}`)
    } else {
      throw new Error('Size is required for spot trading')
    }

    // Validate size
    const sizeNum = parseFloat(orderSize)
    if (sizeNum === 0 || isNaN(sizeNum)) {
      throw new Error(`Invalid order size: ${orderSize}. Size must be greater than 0.`)
    }

    // Execute order based on order type
    if (input.orderType === 'market') {
      // Use best bid/ask as base price
      const basePrice = input.side === 'buy' ? tokenInfo.bestAsk : tokenInfo.bestBid
      
      // Check slippage type
      const slippageType = input.slippageType || 'retry'
      
      if (slippageType === 'fixed') {
        // Fixed slippage mode - single attempt
        const fixedSlippage = input.fixedSlippage || 0.01 // Default 1%
        const orderPrice = calculateSlippagePrice(basePrice, fixedSlippage, input.side, tokenInfo.priceDecimals)
        
        console.log(`   Executing MARKET order with FIXED slippage: ${(fixedSlippage * 100).toFixed(3)}%`)
        console.log(`   Order price: ${orderPrice}`)
        
        const orderResult = await placeSpotOrderWithSlippage(
          exchClient,
          assetIndex,
          input.side,
          orderSize,
          orderPrice,
          'Ioc'
        )
        
        if (orderResult.error) {
          return {
            success: false,
            error: orderResult.error,
            timestamp: Date.now(),
          }
        }
        
        if (orderResult.status?.type === 'filled') {
          return {
            success: true,
            orderId: orderResult.status.oid,
            status: 'filled',
            pair: tokenInfo.name,
            side: input.side,
            size: orderResult.status.totalSz,
            executionPrice: orderResult.status.avgPx,
            slippage: fixedSlippage * 100,
            slippageType: 'fixed',
            details: orderResult.result,
            timestamp: Date.now(),
          }
        }
        
        // Order not filled immediately, fallback to GTC
        console.log('   Order not filled with fixed slippage, placing GTC limit order')
        
        const gtcResult = await placeSpotOrderWithSlippage(
          exchClient,
          assetIndex,
          input.side,
          orderSize,
          orderPrice,
          'Gtc'
        )
        
        if (gtcResult.status?.type === 'resting') {
          return {
            success: true,
            orderId: gtcResult.status.oid,
            status: 'resting',
            pair: tokenInfo.name,
            side: input.side,
            size: orderSize,
            executionPrice: orderPrice,
            slippage: fixedSlippage * 100,
            slippageType: 'fixed',
            details: { message: 'GTC limit order placed (no immediate fill with fixed slippage)', ...gtcResult.result },
            timestamp: Date.now(),
          }
        }
        
        return {
          success: false,
          error: 'Order not filled with fixed slippage',
          timestamp: Date.now(),
        }
        
      } else {
        // Retry slippage mode (original behavior)
        console.log(`   Executing MARKET order with RETRY slippage...`)
        
        return await executeSpotWithSlippageRetry(
          exchClient,
          assetIndex,
          tokenInfo.name,
          input.side,
          orderSize,
          basePrice,
          tokenInfo.priceDecimals,
          DEFAULT_SLIPPAGE_CONFIG
        )
      }
    } else {
      // Limit order: use exact user-specified price
      if (!input.price) {
        throw new Error('Limit orders require a price parameter')
      }
      
      const userPrice = parseFloat(input.price)
      const limitPrice = formatSpotPrice(userPrice, tokenInfo.priceDecimals)
      console.log(`   Executing LIMIT order at price ${limitPrice}`)
      
      const orderResult = await placeSpotOrderWithSlippage(
        exchClient,
        assetIndex,
        input.side,
        orderSize,
        limitPrice,
        'Gtc'  // Limit orders use GTC
      )
      
      if (!orderResult.success) {
        return {
          success: false,
          error: orderResult.error || 'Order failed',
          timestamp: Date.now(),
        }
      }
      
      if (orderResult.status?.type === 'filled') {
        return {
          success: true,
          orderId: orderResult.status.oid,
          status: 'filled',
          pair: tokenInfo.name,
          side: input.side,
          size: orderResult.status.totalSz,
          executionPrice: orderResult.status.avgPx,
          details: orderResult.result,
          timestamp: Date.now(),
        }
      }
      
      if (orderResult.status?.type === 'resting') {
        return {
          success: true,
          orderId: orderResult.status.oid,
          status: 'resting',
          pair: tokenInfo.name,
          side: input.side,
          size: orderSize,
          executionPrice: limitPrice,
          details: orderResult.result,
          timestamp: Date.now(),
        }
      }
      
      return {
        success: false,
        error: 'Unexpected order result',
        details: orderResult.result,
        timestamp: Date.now(),
      }
    }
  } catch (error: any) {
    console.error('❌ Error executing spot trade:', error)
    return {
      success: false,
      error: error.message || String(error),
      timestamp: Date.now(),
    }
  }
}

// ============================================================================
// MCP REGISTRATION
// ============================================================================

export function registerSpotTradingTools(server: any) {
  server.tool(
    'spot_trade',
    `Execute spot trading on Hyperliquid. Buy or sell spot tokens with slippage protection.

Slippage Types (for market orders):
- retry (default): Auto-retry with increasing slippage (0.010% → 8.00%)
  Example: { slippageType: "retry" }
  
- fixed: Single attempt with fixed slippage percentage
  Example: { slippageType: "fixed", fixedSlippage: 0.01 } (1% slippage)

Examples: Buy HYPE with USDC, Sell PURR for USDC`,
    spotTradeSchema,
    async (args: SpotTradeInput) => {
      const result = await spotTrade(args)
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      }
    }
  )

  console.log('✅ Registered spot trading tool: spot_trade')
}
