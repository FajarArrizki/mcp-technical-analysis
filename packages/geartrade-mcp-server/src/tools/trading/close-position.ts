/**
 * Close Position Tool for Hyperliquid
 * Close or reduce existing positions
 */

import { z } from 'zod'
import * as hl from '@nktkas/hyperliquid'

const closePositionInputSchema = z.object({
  symbol: z.string().describe('Asset symbol to close (e.g., "BTC", "ETH", "SOL")'),
  percentage: z.number().min(1).max(100).default(100).describe('Percentage of position to close (1-100, default: 100 for full close)'),
  isTestnet: z.boolean().default(true).describe('Use testnet (true) or mainnet (false). Default: testnet'),
  confirmMainnet: z.boolean().optional().describe('Required confirmation for mainnet execution'),
})

export type ClosePositionInput = z.infer<typeof closePositionInputSchema>

interface ClosePositionResult {
  success: boolean
  symbol?: string
  closedSize?: string
  closedPercentage?: number
  averagePrice?: string
  realizedPnl?: string
  orderId?: number
  error?: string
  details?: any
  timestamp?: number
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

function formatPrice(price: number, symbol: string): string {
  const upperSymbol = symbol.toUpperCase()
  if (upperSymbol === 'BTC') {
    return Math.round(price).toString()
  } else if (upperSymbol === 'ETH') {
    return (Math.round(price * 10) / 10).toFixed(1)
  } else if (['SOL', 'AVAX', 'LINK', 'DOT', 'ATOM', 'NEAR', 'APT', 'SUI', 'INJ', 'TIA', 'SEI'].includes(upperSymbol)) {
    return (Math.round(price * 100) / 100).toFixed(2)
  } else {
    return (Math.round(price * 10000) / 10000).toFixed(4)
  }
}

export async function closePosition(input: ClosePositionInput): Promise<ClosePositionResult> {
  const privateKey = process.env.AGENT_WALLET_PRIVATE_KEY
  const mainWalletAddress = process.env.MAIN_WALLET_ADDRESS

  if (!privateKey) {
    return { success: false, error: 'AGENT_WALLET_PRIVATE_KEY environment variable not set' }
  }

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
    const transport = new hl.HttpTransport({ isTestnet: input.isTestnet })
    const infoClient = new hl.InfoClient({ transport })
    const exchClient = new hl.ExchangeClient({
      wallet: privateKey as `0x${string}`,
      transport,
    })

    // Get user's current position
    const userState = await infoClient.clearinghouseState({ user: mainWalletAddress as `0x${string}` })
    const position = userState.assetPositions.find(
      (p: any) => p.position.coin.toUpperCase() === input.symbol.toUpperCase()
    )

    if (!position || parseFloat(position.position.szi) === 0) {
      return {
        success: false,
        error: `No open position found for ${input.symbol}`,
        symbol: input.symbol,
        timestamp: Date.now(),
      }
    }

    const currentSize = parseFloat(position.position.szi)
    const isLong = currentSize > 0
    const absSize = Math.abs(currentSize)
    
    // Calculate size to close based on percentage
    const closeSize = (absSize * input.percentage) / 100
    const closeSizeStr = closeSize.toFixed(6)

    // Get asset index and current price
    const assetIndex = await getAssetIndex(infoClient, input.symbol)
    const currentPrice = await getCurrentPrice(infoClient, input.symbol)
    
    // To close a position, we need to place an opposite order
    // Long position -> sell to close
    // Short position -> buy to close
    const closeSide = isLong ? 'sell' : 'buy'
    
    // Add slippage for market close (0.5%)
    const slippage = 0.005
    const closePrice = closeSide === 'sell'
      ? currentPrice * (1 - slippage)
      : currentPrice * (1 + slippage)
    const formattedPrice = formatPrice(closePrice, input.symbol)

    // Place close order with reduceOnly
    const orderRequest: hl.OrderParameters = {
      orders: [{
        a: assetIndex,
        b: closeSide === 'buy',
        p: formattedPrice,
        s: closeSizeStr,
        r: true, // reduceOnly = true
        t: { limit: { tif: 'Ioc' } },
      }],
      grouping: 'na',
    }

    const result = await exchClient.order(orderRequest)

    if (result.response?.type === 'order' && result.response.data?.statuses) {
      const status = result.response.data.statuses[0] as any

      if (status.error) {
        return {
          success: false,
          error: String(status.error),
          symbol: input.symbol,
          details: result,
          timestamp: Date.now(),
        }
      }

      if (status.filled) {
        return {
          success: true,
          symbol: input.symbol,
          closedSize: status.filled.totalSz,
          closedPercentage: input.percentage,
          averagePrice: status.filled.avgPx,
          orderId: status.filled.oid,
          details: {
            side: closeSide,
            originalPosition: currentSize,
            isLong,
            network: input.isTestnet ? 'testnet' : 'mainnet',
          },
          timestamp: Date.now(),
        }
      }

      if (status.resting) {
        return {
          success: true,
          symbol: input.symbol,
          closedSize: closeSizeStr,
          closedPercentage: input.percentage,
          orderId: status.resting.oid,
          details: {
            message: 'Close order resting on book',
            side: closeSide,
            originalPosition: currentSize,
            network: input.isTestnet ? 'testnet' : 'mainnet',
          },
          timestamp: Date.now(),
        }
      }
    }

    return {
      success: true,
      symbol: input.symbol,
      details: result,
      timestamp: Date.now(),
    }

  } catch (error: any) {
    return {
      success: false,
      error: error.message || String(error),
      symbol: input.symbol,
      details: error,
      timestamp: Date.now(),
    }
  }
}

export function registerClosePositionTool(server: any) {
  server.registerTool(
    'close_position',
    {
      title: 'Close Position',
      description: `Close or reduce an existing position on Hyperliquid.

Features:
- Close full position (100%) or partial (1-99%)
- Works on both testnet and mainnet
- Automatically detects position side and places opposite order
- Uses reduceOnly for safety

Safety:
- Default: testnet
- Mainnet requires confirmMainnet: true

Requires AGENT_WALLET_PRIVATE_KEY and MAIN_WALLET_ADDRESS environment variables.`,
      inputSchema: closePositionInputSchema,
      outputSchema: z.object({
        success: z.boolean(),
        symbol: z.string().optional(),
        closedSize: z.string().optional(),
        closedPercentage: z.number().optional(),
        averagePrice: z.string().optional(),
        realizedPnl: z.string().optional(),
        orderId: z.number().optional(),
        error: z.string().optional(),
        details: z.any().optional(),
        timestamp: z.number().optional(),
      }),
    },
    async (input: ClosePositionInput) => {
      try {
        const result = await closePosition(input)
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
