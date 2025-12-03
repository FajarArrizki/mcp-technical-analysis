/**
 * Technical Analysis Tools
 * Tools for order book, volume profile, market structure, and regime analysis
 */

import { z } from 'zod'
import { getMarketData } from '../../signal-generation/data-fetchers/market-data'
import { getL2OrderBook } from '../../signal-generation/data-fetchers/hyperliquid'
import { formatOrderBookDepth, formatVolumeProfile, formatMarketStructure } from '../../formatters'
import { detectMarketRegime } from '../../signal-generation/analysis/market-regime'

import { getRealTimePrice } from '../../signal-generation/data-fetchers/hyperliquid'
import { detectChangeOfCharacter } from '../../signal-generation/analysis/market-structure'
export function registerTechnicalAnalysisTools(server: any) {

  // Tool: get_orderbook_depth
  server.registerTool(
    'get_orderbook_depth',
    {
      title: 'Get Order Book Depth',
      description: 'Get real-time L2 order book depth analysis from Hyperliquid for multiple trading tickers at once (e.g., ["BTC", "ETH", "SOL"])',
      inputSchema: {
        tickers: z
          .array(z.string())
          .min(1)
          .describe('Array of asset ticker symbols (e.g., ["BTC", "ETH", "SOL"])'),
        nSigFigs: z
          .number()
          .int()
          .min(2)
          .max(5)
          .optional()
          .describe('Significant figures for price aggregation (2-5). Optional, defaults to full precision'),
      },
      outputSchema: z.object({
        results: z.array(
          z.object({
            ticker: z.string(),
            price: z.number().nullable(),
            timestamp: z.string().optional(),
            orderBookDepth: z
              .object({
                bidPrice: z.number(),
                askPrice: z.number(),
                midPrice: z.number(),
                spread: z.number(),
                spreadPercent: z.number(),
                bidDepth: z.number(),
                askDepth: z.number(),
                imbalance: z.number(),
                supportZones: z.array(
                  z.object({
                    price: z.number(),
                    depth: z.number(),
                    distance: z.number(),
                  })
                ),
                resistanceZones: z.array(
                  z.object({
                    price: z.number(),
                    depth: z.number(),
                    distance: z.number(),
                  })
                ),
                liquidityScore: z.number(),
                timestamp: z.number(),
              })
              .nullable()
              .optional(),
            l2Book: z
              .object({
                bids: z.array(z.object({ price: z.string(), size: z.string() })),
                asks: z.array(z.object({ price: z.string(), size: z.string() })),
                totalBidSize: z.number(),
                totalAskSize: z.number(),
                bidAskImbalance: z.number(),
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
    async ({ tickers, nSigFigs }: { tickers: string[], nSigFigs?: number }) => {
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
        
        // Fetch market data and L2 order books in parallel
        const [{ marketDataMap }, ...l2Books] = await Promise.all([
          getMarketData(normalizedTickers),
          ...normalizedTickers.map(ticker => 
            getL2OrderBook(ticker, nSigFigs).catch(() => null)
          )
        ])
  
        const results: Array<{
          ticker: string
          price: number | null
          timestamp?: string
          orderBookDepth: ReturnType<typeof formatOrderBookDepth>
          l2Book: {
            bids: Array<{ price: string; size: string }>
            asks: Array<{ price: string; size: string }>
            totalBidSize: number
            totalAskSize: number
            bidAskImbalance: number
          } | null
        }> = []
  
        for (let i = 0; i < normalizedTickers.length; i++) {
          const ticker = normalizedTickers[i]
          const assetData = marketDataMap.get(ticker)
          const l2BookData = l2Books[i]
          const price = await getRealTimePrice(ticker).catch(() => null)
  
          const orderBookDepth = assetData?.externalData?.orderBook || assetData?.data?.externalData?.orderBook || null
          const formattedOrderBook = formatOrderBookDepth(orderBookDepth)
  
          // Process L2 order book data
          let l2Book = null
          if (l2BookData && l2BookData.levels) {
            const bids = (l2BookData.levels[0] || []).slice(0, 20).map((level: any) => ({
              price: level.px,
              size: level.sz
            }))
            const asks = (l2BookData.levels[1] || []).slice(0, 20).map((level: any) => ({
              price: level.px,
              size: level.sz
            }))
            
            const totalBidSize = bids.reduce((sum: number, b: any) => sum + parseFloat(b.size), 0)
            const totalAskSize = asks.reduce((sum: number, a: any) => sum + parseFloat(a.size), 0)
            const bidAskImbalance = totalBidSize + totalAskSize > 0 
              ? (totalBidSize - totalAskSize) / (totalBidSize + totalAskSize) 
              : 0
  
            l2Book = {
              bids,
              asks,
              totalBidSize,
              totalAskSize,
              bidAskImbalance
            }
          }
  
          results.push({
            ticker,
            price,
            timestamp: new Date().toISOString(),
            orderBookDepth: formattedOrderBook,
            l2Book,
          })
        }
  
        const found = results.filter((r) => r.orderBookDepth !== null).length
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
                  message: 'Failed to fetch order book depth',
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
  

  // Tool: get_volume_profile
  server.registerTool(
    'get_volume_profile',
    {
      title: 'Get Volume Profile',
      description: 'Get volume profile analysis for multiple trading tickers at once (e.g., ["BTC", "ETH", "SOL"])',
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
            volumeProfile: z
              .object({
                session: z
                  .object({
                    poc: z.number(),
                    vah: z.number(),
                    val: z.number(),
                    hvn: z.array(z.object({ price: z.number(), volume: z.number() })),
                    lvn: z.array(z.object({ price: z.number(), volume: z.number() })),
                    totalVolume: z.number(),
                    sessionType: z.string(),
                    timestamp: z.number(),
                  })
                  .nullable(),
                composite: z
                  .object({
                    poc: z.number(),
                    vah: z.number(),
                    val: z.number(),
                    compositePoc: z.number(),
                    compositeVah: z.number(),
                    compositeVal: z.number(),
                    accumulationZone: z
                      .object({
                        priceRange: z.tuple([z.number(), z.number()]),
                        volumeRatio: z.number(),
                        strength: z.string(),
                      })
                      .nullable(),
                    distributionZone: z
                      .object({
                        priceRange: z.tuple([z.number(), z.number()]),
                        volumeRatio: z.number(),
                        strength: z.string(),
                      })
                      .nullable(),
                    balanceZones: z.array(
                      z.object({
                        priceRange: z.tuple([z.number(), z.number()]),
                        volume: z.number(),
                        center: z.number(),
                      })
                    ),
                    timeRange: z.string(),
                    timestamp: z.number(),
                  })
                  .nullable(),
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
          volumeProfile: ReturnType<typeof formatVolumeProfile>
        }> = []
  
        for (const ticker of normalizedTickers) {
          const assetData = marketDataMap.get(ticker)
          const price = await getRealTimePrice(ticker).catch(() => null)
  
          const volumeProfileData = assetData?.externalData?.volumeProfile || assetData?.data?.externalData?.volumeProfile || null
          const formattedVolumeProfile = formatVolumeProfile(
            volumeProfileData?.session || null,
            volumeProfileData?.composite || null
          )
  
          results.push({
            ticker,
            price,
            timestamp: new Date().toISOString(),
            volumeProfile: formattedVolumeProfile,
          })
        }
  
        const found = results.filter((r) => r.volumeProfile !== null).length
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
                  message: 'Failed to fetch volume profile',
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
  

  // Tool: get_market_structure
  server.registerTool(
    'get_market_structure',
    {
      title: 'Get Market Structure',
      description: 'Get market structure analysis for multiple trading tickers at once (e.g., ["BTC", "ETH", "SOL"])',
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
            marketStructure: z
              .object({
                structure: z.enum(['bullish', 'bearish', 'neutral']),
                coc: z.enum(['bullish', 'bearish', 'none']),
                lastSwingHigh: z.number().nullable(),
                lastSwingLow: z.number().nullable(),
                structureStrength: z.number(),
                reversalSignal: z.boolean(),
                swingHighs: z.array(
                  z.object({
                    price: z.number(),
                    index: z.number(),
                    timestamp: z.number(),
                  })
                ),
                swingLows: z.array(
                  z.object({
                    price: z.number(),
                    index: z.number(),
                    timestamp: z.number(),
                  })
                ),
                timestamp: z.number(),
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
          marketStructure: ReturnType<typeof formatMarketStructure>
        }> = []
  
        for (const ticker of normalizedTickers) {
          const assetData = marketDataMap.get(ticker)
          const price = await getRealTimePrice(ticker).catch(() => null)
  
          if (!assetData || !price) {
            results.push({
              ticker,
              price,
              timestamp: new Date().toISOString(),
              marketStructure: null,
            })
            continue
          }
  
          const historicalData = assetData?.historicalData || assetData?.data?.historicalData || []
          if (historicalData.length < 20) {
            results.push({
              ticker,
              price,
              timestamp: new Date().toISOString(),
              marketStructure: null,
            })
            continue
          }
  
          const marketStructure = detectChangeOfCharacter(historicalData, price)
          const formattedMarketStructure = formatMarketStructure(marketStructure)
  
          results.push({
            ticker,
            price,
            timestamp: new Date().toISOString(),
            marketStructure: formattedMarketStructure,
          })
        }
  
        const found = results.filter((r) => r.marketStructure !== null).length
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
                  message: 'Failed to fetch market structure',
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
  

  // Tool: get_market_regime
  server.registerTool(
    'get_market_regime',
    {
      title: 'Get Market Regime Analysis',
      description: 'Get market regime analysis (trending/choppy/volatile) for multiple trading tickers at once (e.g., ["BTC", "ETH", "SOL"])',
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
            marketRegime: z
              .object({
                regime: z.enum(['trending', 'choppy', 'neutral']),
                volatility: z.enum(['high', 'normal', 'low']),
                adx: z.number().nullable(),
                atrPercent: z.number().nullable(),
                regimeScore: z.number(),
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
  
      const { marketDataMap } = await getMarketData(normalizedTickers)
  
      const results = []
      for (const ticker of normalizedTickers) {
        try {
          const assetData = marketDataMap.get(ticker)
          const price = assetData?.price || null
  
          let marketRegime = null
          if (assetData?.indicators) {
            const adx = assetData.indicators.adx || null
            const atr = assetData.indicators.atr || null
            const historicalData = assetData.historicalData || []
  
            marketRegime = detectMarketRegime(
              adx,
              atr,
              price || 0,
              historicalData
            )
          }
  
          results.push({
            ticker,
            price,
            timestamp: new Date().toISOString(),
            marketRegime,
          })
        } catch (error) {
          console.warn(`Failed to analyze market regime for ${ticker}:`, error)
          results.push({
            ticker,
            price: null,
            timestamp: new Date().toISOString(),
            marketRegime: null,
          })
        }
      }
  
      const found = results.filter((r) => r.marketRegime !== null).length
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
    }
  )
  

}
