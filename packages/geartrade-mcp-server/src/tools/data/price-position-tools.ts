/**
 * Data Tools - Price and Position Data
 * Tools for fetching real-time prices, positions, and correlations
 */

import { z } from 'zod'
import { getRealTimePrice, getUserState } from '../../signal-generation/data-fetchers/hyperliquid'
import { getMarketData } from '../../signal-generation/data-fetchers/market-data'
import { 
  performCorrelationAnalysis, 
  fetchBTCDominance, 
  analyzeAltcoinCorrelation 
} from '../../signal-generation/technical-indicators/correlation-analysis'

export function registerDataTools(server: any) {
  // Tool: get_price
  server.registerTool(
  'get_price',
  {
    title: 'Get Prices',
    description: 'Get latest prices for multiple trading tickers/symbols at once (e.g., ["BTC", "ETH", "SOL"])',
    inputSchema: {
      tickers: z
        .array(z.string())
        .min(1)
        .describe('Array of asset ticker symbols (e.g., ["BTC", "ETH", "SOL"])'),
    },
    outputSchema: {
      results: z.array(
        z.object({
          ticker: z.string(),
          price: z.number().nullable(),
          timestamp: z.string().optional(),
        })
      ),
    },
  },
  async ({ tickers }: { tickers: string[] }) => {
    if (!Array.isArray(tickers) || tickers.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                results: [],
                error: 'Invalid tickers parameter',
                message: 'Tickers must be a non-empty array of strings',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: {
          results: [],
        },
      }
    }

    // Normalize all tickers (uppercase, remove spaces)
    const normalizedTickers = tickers
      .filter((t) => t && typeof t === 'string' && t.trim().length > 0)
      .map((t) => t.trim().toUpperCase())

    if (normalizedTickers.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                results: [],
                error: 'No valid tickers',
                message: 'All tickers must be non-empty strings',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: {
          results: [],
        },
      }
    }

    // Fetch prices for all tickers in parallel
    const pricePromises = normalizedTickers.map(async (ticker) => {
      try {
        const price = await getRealTimePrice(ticker)
        return {
          ticker,
          price: price,
          timestamp: new Date().toISOString(),
        }
      } catch (error) {
        return {
          ticker,
          price: null as number | null,
          timestamp: new Date().toISOString(),
        }
      }
    })

    const results = await Promise.all(pricePromises)

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              results,
              summary: {
                total: results.length,
                found: results.filter((r) => r.price !== null).length,
                notFound: results.filter((r) => r.price === null).length,
              },
            },
            null,
            2
          ),
        },
      ],
      structuredContent: {
        results,
      },
    }
  }
)

  // Tool: get_position
  server.registerTool(
  'get_position',
  {
    title: 'Get Position',
    description: 'Get current open positions, account balance, margin info, and PnL from Hyperliquid. Requires MAIN_WALLET_ADDRESS environment variable.',
    inputSchema: {
      walletAddress: z
        .string()
        .optional()
        .describe('Wallet address to check positions for. If not provided, uses MAIN_WALLET_ADDRESS from environment'),
    },
    outputSchema: z.object({
      success: z.boolean(),
      walletAddress: z.string().nullable(),
      accountValue: z.number().nullable(),
      totalMarginUsed: z.number().nullable(),
      totalUnrealizedPnl: z.number().nullable(),
      withdrawable: z.number().nullable(),
      positions: z.array(
        z.object({
          symbol: z.string(),
          side: z.enum(['LONG', 'SHORT']),
          size: z.number(),
          entryPrice: z.number(),
          markPrice: z.number().nullable(),
          liquidationPrice: z.number().nullable(),
          unrealizedPnl: z.number(),
          unrealizedPnlPercent: z.number().nullable(),
          leverage: z.number().nullable(),
          marginUsed: z.number().nullable(),
          returnOnEquity: z.number().nullable(),
          maxLeverage: z.number().nullable(),
        })
      ),
      openOrders: z.number().nullable(),
      error: z.string().nullable(),
    }),
  },
  async ({ walletAddress }: { walletAddress?: string }) => {
    try {
      const address = walletAddress || process.env.MAIN_WALLET_ADDRESS
      
      if (!address) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                walletAddress: null,
                accountValue: null,
                totalMarginUsed: null,
                totalUnrealizedPnl: null,
                withdrawable: null,
                positions: [],
                openOrders: null,
                error: 'No wallet address provided. Set MAIN_WALLET_ADDRESS environment variable or provide walletAddress parameter.',
              }, null, 2),
            },
          ],
          structuredContent: {
            success: false,
            walletAddress: null,
            accountValue: null,
            totalMarginUsed: null,
            totalUnrealizedPnl: null,
            withdrawable: null,
            positions: [],
            openOrders: null,
            error: 'No wallet address provided',
          },
        }
      }
      
      // Fetch user state from Hyperliquid
      const userState = await getUserState(address)
      
      if (!userState) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                walletAddress: address,
                accountValue: null,
                totalMarginUsed: null,
                totalUnrealizedPnl: null,
                withdrawable: null,
                positions: [],
                openOrders: null,
                error: 'Failed to fetch user state from Hyperliquid',
              }, null, 2),
            },
          ],
          structuredContent: {
            success: false,
            walletAddress: address,
            accountValue: null,
            totalMarginUsed: null,
            totalUnrealizedPnl: null,
            withdrawable: null,
            positions: [],
            openOrders: null,
            error: 'Failed to fetch user state',
          },
        }
      }
      
      // Parse positions
      const assetPositions = userState.assetPositions || []
      const marginSummary = userState.marginSummary || {}
      const crossMarginSummary = userState.crossMarginSummary || {}
      
      const positions = assetPositions
        .filter((pos: any) => {
          const position = pos.position || pos
          const szi = parseFloat(position.szi || '0')
          return szi !== 0
        })
        .map((pos: any) => {
          const position = pos.position || pos
          const szi = parseFloat(position.szi || '0')
          const entryPx = parseFloat(position.entryPx || '0')
          const unrealizedPnl = parseFloat(position.unrealizedPnl || '0')
          const positionValue = parseFloat(position.positionValue || '0')
          const marginUsed = parseFloat(position.marginUsed || '0')
          const returnOnEquity = parseFloat(position.returnOnEquity || '0')
          const maxLeverage = parseFloat(position.maxLeverage || position.maxTradeLeverage || '0')
          const liquidationPx = position.liquidationPx ? parseFloat(position.liquidationPx) : null
          
          // Calculate leverage from position value and margin
          const leverage = marginUsed > 0 ? positionValue / marginUsed : null
          
          // Calculate unrealized PnL percent
          const entryValue = Math.abs(szi) * entryPx
          const unrealizedPnlPercent = entryValue > 0 ? (unrealizedPnl / entryValue) * 100 : null
          
          return {
            symbol: position.coin || pos.coin || 'UNKNOWN',
            side: szi > 0 ? 'LONG' : 'SHORT',
            size: Math.abs(szi),
            entryPrice: entryPx,
            markPrice: null, // Would need separate call to get mark price
            liquidationPrice: liquidationPx,
            unrealizedPnl,
            unrealizedPnlPercent,
            leverage,
            marginUsed,
            returnOnEquity: returnOnEquity * 100, // Convert to percentage
            maxLeverage,
          }
        })
      
      // Calculate totals
      const accountValue = parseFloat(marginSummary.accountValue || crossMarginSummary.accountValue || '0')
      const totalMarginUsed = parseFloat(marginSummary.totalMarginUsed || crossMarginSummary.totalMarginUsed || '0')
      const totalUnrealizedPnl = positions.reduce((sum: number, p: any) => sum + p.unrealizedPnl, 0)
      const withdrawable = parseFloat(marginSummary.withdrawable || crossMarginSummary.withdrawable || '0')
      
      const result = {
        success: true,
        walletAddress: address,
        accountValue,
        totalMarginUsed,
        totalUnrealizedPnl,
        withdrawable,
        positions,
        openOrders: userState.openOrders?.length || 0,
        error: null,
      }
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
        structuredContent: result,
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              walletAddress: walletAddress || process.env.MAIN_WALLET_ADDRESS || null,
              accountValue: null,
              totalMarginUsed: null,
              totalUnrealizedPnl: null,
              withdrawable: null,
              positions: [],
              openOrders: null,
              error: errorMsg,
            }, null, 2),
          },
        ],
        structuredContent: {
          success: false,
          walletAddress: walletAddress || process.env.MAIN_WALLET_ADDRESS || null,
          accountValue: null,
          totalMarginUsed: null,
          totalUnrealizedPnl: null,
          withdrawable: null,
          positions: [],
          openOrders: null,
          error: errorMsg,
        },
      }
    }
  }
)

  // Tool: get_correlation_analysis
  server.registerTool(
  'get_correlation_analysis',
  {
    title: 'Get Correlation Analysis',
    description: 'Get BTC dominance, altcoin correlation with BTC, beta analysis, and market regime for multiple tickers. Useful for understanding market dynamics and diversification.',
    inputSchema: {
      tickers: z
        .array(z.string())
        .min(1)
        .describe('Array of asset ticker symbols to analyze correlation (e.g., ["ETH", "SOL", "AVAX"])'),
      period: z
        .number()
        .int()
        .min(10)
        .max(100)
        .optional()
        .default(30)
        .describe('Period for correlation calculation (default: 30)'),
    },
    outputSchema: z.object({
      timestamp: z.number(),
      btcDominance: z.object({
        dominance: z.number(),
        dominanceChange24h: z.number(),
        dominanceTrend: z.enum(['increasing', 'decreasing', 'stable']),
        altcoinSeasonSignal: z.enum(['altcoin_season', 'btc_season', 'neutral']),
        interpretation: z.string(),
      }).nullable(),
      altcoinCorrelations: z.array(
        z.object({
          ticker: z.string(),
          correlationWithBTC: z.object({
            correlation: z.number(),
            strength: z.string(),
            direction: z.string(),
          }).nullable(),
          beta: z.number().nullable(),
          relativeStrength: z.number().nullable(),
          decouplingSignal: z.enum(['decoupled', 'coupled', 'weakly_coupled']),
          interpretation: z.string(),
        })
      ),
      marketCorrelationAverage: z.number().nullable(),
      marketRegime: z.enum(['risk_on', 'risk_off', 'neutral']),
      tradingRecommendation: z.string(),
      error: z.string().nullable(),
    }),
  },
  async ({ tickers, period = 30 }: { tickers: string[], period?: number }) => {
    if (!Array.isArray(tickers) || tickers.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              timestamp: Date.now(),
              btcDominance: null,
              altcoinCorrelations: [],
              marketCorrelationAverage: null,
              marketRegime: 'neutral',
              tradingRecommendation: 'Invalid tickers parameter',
              error: 'Tickers must be a non-empty array of strings',
            }, null, 2),
          },
        ],
        structuredContent: {
          timestamp: Date.now(),
          btcDominance: null,
          altcoinCorrelations: [],
          marketCorrelationAverage: null,
          marketRegime: 'neutral',
          tradingRecommendation: 'Invalid tickers parameter',
          error: 'Invalid tickers parameter',
        },
      }
    }

    try {
      // Normalize tickers and ensure BTC is included
      const normalizedTickers = tickers
        .filter((t) => t && typeof t === 'string' && t.trim().length > 0)
        .map((t) => t.trim().toUpperCase())
      
      const allTickers = normalizedTickers.includes('BTC') 
        ? normalizedTickers 
        : ['BTC', ...normalizedTickers]
      
      // Fetch market data for all tickers including BTC
      const { marketDataMap } = await getMarketData(allTickers)
      
      // Extract price arrays
      const priceDataMap = new Map<string, number[]>()
      
      for (const ticker of allTickers) {
        const assetData = marketDataMap.get(ticker)
        const historicalData = assetData?.historicalData || assetData?.data?.historicalData || []
        
        if (historicalData.length > 0) {
          const prices = historicalData.map((d: any) => d.close || d.price).filter((p: number) => p > 0)
          priceDataMap.set(ticker, prices)
        }
      }
      
      const btcPrices = priceDataMap.get('BTC') || []
      
      if (btcPrices.length < period) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                timestamp: Date.now(),
                btcDominance: await fetchBTCDominance(),
                altcoinCorrelations: [],
                marketCorrelationAverage: null,
                marketRegime: 'neutral',
                tradingRecommendation: 'Insufficient BTC price data for correlation analysis',
                error: 'Insufficient BTC price data',
              }, null, 2),
            },
          ],
          structuredContent: {
            timestamp: Date.now(),
            btcDominance: null,
            altcoinCorrelations: [],
            marketCorrelationAverage: null,
            marketRegime: 'neutral',
            tradingRecommendation: 'Insufficient data',
            error: 'Insufficient BTC price data',
          },
        }
      }
      
      // Perform correlation analysis
      const result = await performCorrelationAnalysis(normalizedTickers, priceDataMap, btcPrices, period)
      
      // Format for output
      const formattedResult = {
        timestamp: result.timestamp,
        btcDominance: result.btcDominance,
        altcoinCorrelations: result.altcoinCorrelations.map(c => ({
          ticker: c.ticker,
          correlationWithBTC: c.correlationWithBTC ? {
            correlation: c.correlationWithBTC.correlation,
            strength: c.correlationWithBTC.strength,
            direction: c.correlationWithBTC.direction,
          } : null,
          beta: c.beta,
          relativeStrength: c.relativeStrength,
          decouplingSignal: c.decouplingSignal,
          interpretation: c.interpretation,
        })),
        marketCorrelationAverage: result.marketCorrelationAverage,
        marketRegime: result.marketRegime,
        tradingRecommendation: result.tradingRecommendation,
        error: null,
      }
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(formattedResult, null, 2),
          },
        ],
        structuredContent: formattedResult,
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              timestamp: Date.now(),
              btcDominance: null,
              altcoinCorrelations: [],
              marketCorrelationAverage: null,
              marketRegime: 'neutral',
              tradingRecommendation: 'Error performing correlation analysis',
              error: errorMsg,
            }, null, 2),
          },
        ],
        structuredContent: {
          timestamp: Date.now(),
          btcDominance: null,
          altcoinCorrelations: [],
          marketCorrelationAverage: null,
          marketRegime: 'neutral',
          tradingRecommendation: 'Error',
          error: errorMsg,
        },
      }
    }
  }
)
}
