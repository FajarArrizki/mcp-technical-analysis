/**
 * Pattern Analysis Tools
 * Tools for candlestick patterns, divergence, liquidation levels, and long/short ratio analysis
 */

import { z } from 'zod'
import { getMarketData } from '../../signal-generation/data-fetchers/market-data'
import { formatCandlestickPatterns, formatDivergence, formatLiquidationLevels, formatLongShortRatio } from '../../formatters'
import { 
  getLiquidationHeatmap,
  getWhalePositions as getHyperscreenerWhalePositions,
  getTopTraders
} from '../../signal-generation/data-fetchers/hyperscreener'
import { calculateLiquidationIndicators } from '../../signal-generation/technical-indicators/liquidation'
import { calculateLongShortRatioIndicators } from '../../signal-generation/technical-indicators/long-short-ratio'

import { getRealTimePrice } from '../../signal-generation/data-fetchers/hyperliquid'
import { detectCandlestickPatterns } from '../../signal-generation/analysis/candlestick'
import { calculateRSI } from '../../signal-generation/technical-indicators/momentum'
import { detectDivergence } from '../../signal-generation/analysis/divergence'
import { getLiquidations, getLongShortRatio as getHyperscreenerLongShortRatio, getTopTradersRanking, getWhalePositions } from '../../signal-generation/data-fetchers/hyperscreener'

export function registerPatternAnalysisTools(server: any) {

  // Tool: get_candlestick_patterns
  server.registerTool(
    'get_candlestick_patterns',
    {
      title: 'Get Candlestick Patterns',
      description: 'Get candlestick pattern detection for multiple trading tickers at once (e.g., ["BTC", "ETH", "SOL"])',
      inputSchema: {
        tickers: z
          .array(z.string())
          .min(1)
          .describe('Array of asset ticker symbols (e.g., ["BTC", "ETH", "SOL"])'),
      },
      outputSchema: z.object({
        results: z.array(
          z.object({
            ticker: z.string(),
            price: z.number().nullable(),
            timestamp: z.string().optional(),
            candlestickPatterns: z
              .object({
                patterns: z.array(
                  z.object({
                    type: z.enum(['doji', 'hammer', 'bullish_engulfing', 'bearish_engulfing']),
                    index: z.number(),
                    bullish: z.boolean(),
                  })
                ),
                latestPattern: z
                  .object({
                    type: z.enum(['doji', 'hammer', 'bullish_engulfing', 'bearish_engulfing']),
                    index: z.number(),
                    bullish: z.boolean(),
                  })
                  .nullable(),
                bullishCount: z.number(),
                bearishCount: z.number(),
              })
              .nullable()
              .optional(),
          })
        ),
        summary: z
          .object({
            total: z.number(),
            found: z.number(),
            notFound: z.number(),
          })
          .optional(),
      }),
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
  
      try {
        if (!process.env.CANDLES_COUNT || parseInt(process.env.CANDLES_COUNT) < 200) {
          process.env.CANDLES_COUNT = '200'
        }
        const { marketDataMap } = await getMarketData(normalizedTickers)
  
        const results: Array<{
          ticker: string
          price: number | null
          timestamp?: string
          candlestickPatterns: ReturnType<typeof formatCandlestickPatterns>
        }> = []
  
        for (const ticker of normalizedTickers) {
          const assetData = marketDataMap.get(ticker)
          const price = await getRealTimePrice(ticker).catch(() => null)
  
          if (!assetData) {
            results.push({
              ticker,
              price,
              timestamp: new Date().toISOString(),
              candlestickPatterns: formatCandlestickPatterns(null),
            })
            continue
          }
  
          const historicalData = assetData?.historicalData || assetData?.data?.historicalData || []
          if (historicalData.length < 5) {
            results.push({
              ticker,
              price,
              timestamp: new Date().toISOString(),
              candlestickPatterns: formatCandlestickPatterns(null),
            })
            continue
          }
  
          const patterns = detectCandlestickPatterns(historicalData, 5)
          const formattedPatterns = formatCandlestickPatterns(patterns)
  
          results.push({
            ticker,
            price,
            timestamp: new Date().toISOString(),
            candlestickPatterns: formattedPatterns,
          })
        }
  
        const found = results.filter((r) => r.candlestickPatterns !== null).length
        const notFound = results.length - found
  
        const result = {
          results,
          summary: {
            total: normalizedTickers.length,
            found,
            notFound,
          },
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
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  results: [],
                  error: error instanceof Error ? error.message : String(error),
                  message: 'Failed to fetch candlestick patterns',
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
    }
  )
  

  // Tool: get_divergence
  server.registerTool(
    'get_divergence',
    {
      title: 'Get Divergence Detection',
      description: 'Get RSI divergence detection for multiple trading tickers at once (e.g., ["BTC", "ETH", "SOL"])',
      inputSchema: {
        tickers: z
          .array(z.string())
          .min(1)
          .describe('Array of asset ticker symbols (e.g., ["BTC", "ETH", "SOL"])'),
      },
      outputSchema: z.object({
        results: z.array(
          z.object({
            ticker: z.string(),
            price: z.number().nullable(),
            timestamp: z.string().optional(),
            divergence: z
              .object({
                bullishDivergence: z.boolean(),
                bearishDivergence: z.boolean(),
                divergence: z.enum(['bullish', 'bearish']).nullable(),
              })
              .nullable()
              .optional(),
          })
        ),
        summary: z
          .object({
            total: z.number(),
            found: z.number(),
            notFound: z.number(),
          })
          .optional(),
      }),
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
  
      try {
        if (!process.env.CANDLES_COUNT || parseInt(process.env.CANDLES_COUNT) < 200) {
          process.env.CANDLES_COUNT = '200'
        }
        const { marketDataMap } = await getMarketData(normalizedTickers)
  
        const results: Array<{
          ticker: string
          price: number | null
          timestamp?: string
          divergence: ReturnType<typeof formatDivergence>
        }> = []
  
        for (const ticker of normalizedTickers) {
          const assetData = marketDataMap.get(ticker)
          const price = await getRealTimePrice(ticker).catch(() => null)
  
          if (!assetData) {
            results.push({
              ticker,
              price,
              timestamp: new Date().toISOString(),
              divergence: null,
            })
            continue
          }
  
          const historicalData = assetData?.historicalData || assetData?.data?.historicalData || []
  
          if (historicalData.length < 20) {
            results.push({
              ticker,
              price,
              timestamp: new Date().toISOString(),
              divergence: null,
            })
            continue
          }
  
          // Calculate RSI values for divergence detection
          const prices = historicalData.map((d: any) => d.close)
          const rsiValues = calculateRSI(prices, 14)
  
          if (rsiValues.length < 20) {
            results.push({
              ticker,
              price,
              timestamp: new Date().toISOString(),
              divergence: null,
            })
            continue
          }
  
          // Use RSI array for divergence detection
          const divergence = detectDivergence(prices, rsiValues, 20)
          const formattedDivergence = formatDivergence(divergence)
  
          results.push({
            ticker,
            price,
            timestamp: new Date().toISOString(),
            divergence: formattedDivergence,
          })
        }
  
        const found = results.filter((r) => r.divergence !== null).length
        const notFound = results.length - found
  
        const result = {
          results,
          summary: {
            total: normalizedTickers.length,
            found,
            notFound,
          },
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
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  results: [],
                  error: error instanceof Error ? error.message : String(error),
                  message: 'Failed to fetch divergence data',
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
    }
  )
  

  // Tool: get_liquidation_levels
  server.registerTool(
    'get_liquidation_levels',
    {
      title: 'Get Liquidation Levels',
      description: 'Get liquidation level analysis with heatmap data from HyperScreener for multiple trading tickers at once (e.g., ["BTC", "ETH", "SOL"])',
      inputSchema: {
        tickers: z
          .array(z.string())
          .min(1)
          .describe('Array of asset ticker symbols (e.g., ["BTC", "ETH", "SOL"])'),
        includeHeatmap: z
          .boolean()
          .optional()
          .default(true)
          .describe('Include liquidation heatmap from HyperScreener. Default: true'),
      },
      outputSchema: z.object({
        results: z.array(
          z.object({
            ticker: z.string(),
            price: z.number().nullable(),
            timestamp: z.string().optional(),
            liquidationLevels: z
              .object({
                clusters: z.object({
                  long: z.array(z.any()),
                  short: z.array(z.any()),
                  nearest: z.any().nullable(),
                  distance: z.number(),
                }),
                liquidityGrab: z.object({
                  detected: z.boolean(),
                  zone: z
                    .object({
                      priceLow: z.number(),
                      priceHigh: z.number(),
                    })
                    .nullable(),
                  side: z.enum(['long', 'short', 'none']),
                }),
                stopHunt: z.object({
                  predicted: z.boolean(),
                  targetPrice: z.number().nullable(),
                  side: z.enum(['long', 'short', 'none']),
                }),
                cascade: z.object({
                  risk: z.enum(['high', 'medium', 'low']),
                  triggerPrice: z.number().nullable(),
                }),
                safeEntry: z.object({
                  zones: z.array(
                    z.object({
                      priceLow: z.number(),
                      priceHigh: z.number(),
                    })
                  ),
                  confidence: z.number(),
                }),
              })
              .nullable()
              .optional(),
            liquidationHeatmap: z.any().nullable().optional(),
            recentLiquidations: z.array(z.any()).nullable().optional(),
          })
        ),
        summary: z
          .object({
            total: z.number(),
            found: z.number(),
            notFound: z.number(),
          })
          .optional(),
      }),
    },
    async ({ tickers, includeHeatmap = true }: { tickers: string[], includeHeatmap?: boolean }) => {
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
  
      try {
        if (!process.env.CANDLES_COUNT || parseInt(process.env.CANDLES_COUNT) < 200) {
          process.env.CANDLES_COUNT = '200'
        }
        
        // Fetch market data and HyperScreener liquidation data in parallel
        const [{ marketDataMap }, hyperscreenerLiquidations, ...heatmaps] = await Promise.all([
          getMarketData(normalizedTickers),
          includeHeatmap ? getLiquidations('notional_volume', 'desc', 50).catch(() => null) : Promise.resolve(null),
          ...(includeHeatmap 
            ? normalizedTickers.map(ticker => getLiquidationHeatmap(ticker, '24h').catch(() => null))
            : normalizedTickers.map(() => Promise.resolve(null))
          )
        ])
  
        // Create liquidations lookup map
        const liquidationsMap = new Map<string, any[]>()
        if (hyperscreenerLiquidations && Array.isArray(hyperscreenerLiquidations)) {
          for (const liq of hyperscreenerLiquidations) {
            const symbol = (liq.symbol || liq.coin || '').toUpperCase()
            if (symbol) {
              if (!liquidationsMap.has(symbol)) {
                liquidationsMap.set(symbol, [])
              }
              liquidationsMap.get(symbol)!.push(liq)
            }
          }
        }
  
        const results: Array<{
          ticker: string
          price: number | null
          timestamp?: string
          liquidationLevels: ReturnType<typeof formatLiquidationLevels>
          liquidationHeatmap: any
          recentLiquidations: any[] | null
        }> = []
  
        for (let i = 0; i < normalizedTickers.length; i++) {
          const ticker = normalizedTickers[i]
          const assetData = marketDataMap.get(ticker)
          const heatmapData = heatmaps[i]
          const price = await getRealTimePrice(ticker).catch(() => null)
  
          if (!assetData || !price) {
            results.push({
              ticker,
              price,
              timestamp: new Date().toISOString(),
              liquidationLevels: null,
              liquidationHeatmap: heatmapData || null,
              recentLiquidations: liquidationsMap.get(ticker)?.slice(0, 10) || null,
            })
            continue
          }
  
          const futuresData = assetData?.externalData?.futures || assetData?.data?.externalData?.futures || null
          const liquidationData = futuresData?.liquidation || null
  
          if (!liquidationData) {
            results.push({
              ticker,
              price,
              timestamp: new Date().toISOString(),
              liquidationLevels: null,
              liquidationHeatmap: heatmapData || null,
              recentLiquidations: liquidationsMap.get(ticker)?.slice(0, 10) || null,
            })
            continue
          }
  
          const liquidation = calculateLiquidationIndicators(liquidationData, price)
          const formattedLiquidation = formatLiquidationLevels(liquidation)
  
          results.push({
            ticker,
            price,
            timestamp: new Date().toISOString(),
            liquidationLevels: formattedLiquidation,
            liquidationHeatmap: heatmapData || null,
            recentLiquidations: liquidationsMap.get(ticker)?.slice(0, 10) || null,
          })
        }
  
        const found = results.filter((r) => r.liquidationLevels !== null || r.liquidationHeatmap !== null).length
        const notFound = results.length - found
  
        const result = {
          results,
          summary: {
            total: normalizedTickers.length,
            found,
            notFound,
          },
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
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  results: [],
                  error: error instanceof Error ? error.message : String(error),
                  message: 'Failed to fetch liquidation levels',
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
    }
  )
  

  // Tool: get_long_short_ratio
  server.registerTool(
    'get_long_short_ratio',
    {
      title: 'Get Long/Short Ratio',
      description: 'Get long/short ratio analysis with whale positions and top traders data from HyperScreener for multiple trading tickers at once (e.g., ["BTC", "ETH", "SOL"])',
      inputSchema: {
        tickers: z
          .array(z.string())
          .min(1)
          .describe('Array of asset ticker symbols (e.g., ["BTC", "ETH", "SOL"])'),
        includeWhales: z
          .boolean()
          .optional()
          .default(true)
          .describe('Include whale positions and top traders from HyperScreener. Default: true'),
      },
      outputSchema: z.object({
        results: z.array(
          z.object({
            ticker: z.string(),
            price: z.number().nullable(),
            timestamp: z.string().optional(),
            longShortRatio: z
              .object({
                sentiment: z.object({
                  overall: z.enum(['extreme_long', 'extreme_short', 'moderate_long', 'moderate_short', 'balanced']),
                  retail: z.enum(['long', 'short', 'balanced']),
                  pro: z.enum(['long', 'short', 'balanced']),
                }),
                contrarian: z.object({
                  signal: z.boolean(),
                  direction: z.enum(['long', 'short', 'neutral']),
                  strength: z.number(),
                }),
                extreme: z.object({
                  detected: z.boolean(),
                  level: z.enum(['extreme_long', 'extreme_short', 'normal']),
                  reversalSignal: z.boolean(),
                }),
                divergence: z.object({
                  retailVsPro: z.number(),
                  signal: z.enum(['follow_pro', 'fade_retail', 'neutral']),
                }),
              })
              .nullable()
              .optional(),
            hyperscreenerRatio: z.number().nullable().optional(),
            whalePositions: z.array(z.any()).nullable().optional(),
            topTraders: z.array(z.any()).nullable().optional(),
          })
        ),
        topTradersOverall: z.array(z.any()).nullable().optional(),
        summary: z
          .object({
            total: z.number(),
            found: z.number(),
            notFound: z.number(),
          })
          .optional(),
      }),
    },
    async ({ tickers, includeWhales = true }: { tickers: string[], includeWhales?: boolean }) => {
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
  
      try {
        if (!process.env.CANDLES_COUNT || parseInt(process.env.CANDLES_COUNT) < 200) {
          process.env.CANDLES_COUNT = '200'
        }
        
        // Fetch market data and HyperScreener data in parallel
        const [
          { marketDataMap },
          hyperscreenerLongShort,
          hyperscreenerWhales,
          hyperscreenerTopTraders
        ] = await Promise.all([
          getMarketData(normalizedTickers),
          includeWhales ? getHyperscreenerLongShortRatio('notional_value', 'desc', 50).catch(() => null) : Promise.resolve(null),
          includeWhales ? getWhalePositions('notional_value', 'desc', 30).catch(() => null) : Promise.resolve(null),
          includeWhales ? getTopTradersRanking('D', 'pnl', 'desc', 20).catch(() => null) : Promise.resolve(null),
        ])
  
        // Create lookup maps
        const longShortMap = new Map<string, number>()
        const whalesMap = new Map<string, any[]>()
  
        if (hyperscreenerLongShort && Array.isArray(hyperscreenerLongShort)) {
          for (const ls of hyperscreenerLongShort) {
            const symbol = (ls.symbol || ls.coin || '').toUpperCase()
            const ratio = ls.long_short_ratio || ls.longShortRatio || ls.ratio
            if (symbol && ratio !== undefined) {
              longShortMap.set(symbol, parseFloat(ratio))
            }
          }
        }
  
        if (hyperscreenerWhales && Array.isArray(hyperscreenerWhales)) {
          for (const whale of hyperscreenerWhales) {
            const symbol = (whale.symbol || whale.coin || '').toUpperCase()
            if (symbol) {
              if (!whalesMap.has(symbol)) {
                whalesMap.set(symbol, [])
              }
              whalesMap.get(symbol)!.push(whale)
            }
          }
        }
  
        const results: Array<{
          ticker: string
          price: number | null
          timestamp?: string
          longShortRatio: ReturnType<typeof formatLongShortRatio>
          hyperscreenerRatio: number | null
          whalePositions: any[] | null
          topTraders: any[] | null
        }> = []
  
        for (const ticker of normalizedTickers) {
          const assetData = marketDataMap.get(ticker)
          const price = await getRealTimePrice(ticker).catch(() => null)
  
          if (!assetData) {
            results.push({
              ticker,
              price,
              timestamp: new Date().toISOString(),
              longShortRatio: null,
              hyperscreenerRatio: longShortMap.get(ticker) || null,
              whalePositions: whalesMap.get(ticker)?.slice(0, 10) || null,
              topTraders: null,
            })
            continue
          }
  
          const futuresData = assetData?.externalData?.futures || assetData?.data?.externalData?.futures || null
          const longShortRatioData = futuresData?.longShortRatio || null
  
          if (!longShortRatioData) {
            results.push({
              ticker,
              price,
              timestamp: new Date().toISOString(),
              longShortRatio: null,
              hyperscreenerRatio: longShortMap.get(ticker) || null,
              whalePositions: whalesMap.get(ticker)?.slice(0, 10) || null,
              topTraders: null,
            })
            continue
          }
  
          const ratio = calculateLongShortRatioIndicators(longShortRatioData)
          const formattedRatio = formatLongShortRatio(ratio)
  
          results.push({
            ticker,
            price,
            timestamp: new Date().toISOString(),
            longShortRatio: formattedRatio,
            hyperscreenerRatio: longShortMap.get(ticker) || null,
            whalePositions: whalesMap.get(ticker)?.slice(0, 10) || null,
            topTraders: null,
          })
        }
  
        const found = results.filter((r) => r.longShortRatio !== null || r.hyperscreenerRatio !== null).length
        const notFound = results.length - found
  
        const result = {
          results,
          topTradersOverall: hyperscreenerTopTraders || null,
          summary: {
            total: normalizedTickers.length,
            found,
            notFound,
          },
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
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  results: [],
                  error: error instanceof Error ? error.message : String(error),
                  message: 'Failed to fetch long/short ratio',
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
    }
  )
  

}
