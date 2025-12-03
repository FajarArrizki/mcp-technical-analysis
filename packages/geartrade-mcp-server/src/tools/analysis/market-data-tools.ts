/**
 * Market Data Analysis Tools
 * Tools for comprehensive market data analysis including indicators, volume, timeframes, and external data
 */

import { z } from 'zod'
import { getMarketData } from '../../signal-generation/data-fetchers/market-data'
import { formatTechnicalIndicators, formatVolumeAnalysis, formatMultiTimeframe, formatExternalData } from '../../formatters'
import { getRealTimePrice } from '../../signal-generation/data-fetchers/hyperliquid'
import { 
  getLiquidations,
  getTopTraders,
  getWhalePositions,
  getFundingRates as getHyperscreenerFundingRates,
  getOpenInterest as getHyperscreenerOpenInterest,
  getLongShortRatio as getHyperscreenerLongShortRatio,
  getTopGainers,
  getTopLosers,
  getLargeTrades,
  getMarketOverview
} from '../../signal-generation/data-fetchers/hyperscreener'
import { getPlatformStats } from '../../signal-generation/data-fetchers/hyperscreener'
import { performComprehensiveVolumeAnalysis, calculateCVD } from '../../signal-generation/analysis/volume-analysis'
import { analyzeAltcoinCorrelation } from '../../signal-generation/technical-indicators/correlation-analysis'

export function registerMarketDataTools(server: any) {

  // Tool: get_indicators
  server.registerTool(
    'get_indicators',
    {
      title: 'Get Technical Indicators',
      description: 'Get comprehensive technical analysis indicators for multiple trading tickers at once (e.g., ["BTC", "ETH", "SOL"])',
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
            technical: z
              .object({
                rsi: z
                  .object({
                    rsi14: z.number().nullable().optional(),
                    rsi7: z.number().nullable().optional(),
                    rsi4h: z.number().nullable().optional(),
                  })
                  .nullable()
                  .optional(),
                ema: z
                  .object({
                    ema20: z.number().nullable().optional(),
                    ema50: z.number().nullable().optional(),
                  })
                  .nullable()
                  .optional(),
                macd: z
                  .object({
                    macd: z.number().nullable().optional(),
                    signal: z.number().nullable().optional(),
                    histogram: z.number().nullable().optional(),
                  })
                  .nullable()
                  .optional(),
                bollingerBands: z
                  .object({
                    upper: z.number().nullable().optional(),
                    middle: z.number().nullable().optional(),
                    lower: z.number().nullable().optional(),
                    position: z.string().nullable().optional(),
                  })
                  .nullable()
                  .optional(),
                atr: z.number().nullable().optional(),
                adx: z
                  .object({
                    adx: z.number().nullable().optional(),
                    plusDI: z.number().nullable().optional(),
                    minusDI: z.number().nullable().optional(),
                    trend: z.string().nullable().optional(),
                  })
                  .nullable()
                  .optional(),
                obv: z.number().nullable().optional(),
                vwap: z.number().nullable().optional(),
                stochastic: z
                  .object({
                    k: z.number().nullable().optional(),
                    d: z.number().nullable().optional(),
                  })
                  .nullable()
                  .optional(),
                cci: z.number().nullable().optional(),
                williamsR: z.number().nullable().optional(),
                parabolicSAR: z
                  .object({
                    value: z.number().nullable().optional(),
                    trend: z.string().nullable().optional(),
                  })
                  .nullable()
                  .optional(),
                aroon: z
                  .object({
                    up: z.number().nullable().optional(),
                    down: z.number().nullable().optional(),
                    trend: z.string().nullable().optional(),
                  })
                  .nullable()
                  .optional(),
                support: z.number().nullable().optional(),
                resistance: z.number().nullable().optional(),
                fibonacci: z
                  .object({
                    level: z.string().nullable().optional(),
                    direction: z.string().nullable().optional(),
                    range: z.string().nullable().optional(),
                    keyLevels: z.string().nullable().optional(),
                  })
                  .nullable()
                  .optional(),
                trend: z
                  .object({
                    direction: z.string().nullable().optional(),
                    strength: z.string().nullable().optional(),
                  })
                  .nullable()
                  .optional(),
                marketStructure: z
                  .object({
                    structure: z.string().nullable().optional(),
                    higherHigh: z.boolean().optional(),
                    lowerLow: z.boolean().optional(),
                  })
                  .nullable()
                  .optional(),
                rsiDivergence: z.string().nullable().optional(),
                candlestick: z.string().nullable().optional(),
                marketRegime: z.string().nullable().optional(),
                correlationCoefficient: z
                  .object({
                    correlation: z.number().nullable().optional(),
                    strength: z.string().nullable().optional(),
                    direction: z.string().nullable().optional(),
                  })
                  .nullable()
                  .optional(),
                mcclellanOscillator: z
                  .object({
                    oscillator: z.number().nullable().optional(),
                    signal: z.number().nullable().optional(),
                    ratio: z.number().nullable().optional(),
                  })
                  .nullable()
                  .optional(),
                armsIndex: z
                  .object({
                    index: z.number().nullable().optional(),
                    trin: z.number().nullable().optional(),
                    adRatio: z.number().nullable().optional(),
                  })
                  .nullable()
                  .optional(),
                bounceAnalysis: z
                  .object({
                    setup: z.any().nullable().optional(),
                    persistence: z.any().nullable().optional(),
                  })
                  .nullable()
                  .optional(),
                trendDetection: z
                  .object({
                    trend: z.any().nullable().optional(),
                    marketStructure: z.any().nullable().optional(),
                  })
                  .nullable()
                  .optional(),
                enhancedMetrics: z.any().nullable().optional(),
                change24h: z.number().nullable().optional(),
                volumeChange24h: z.number().nullable().optional(),
              })
              .nullable()
              .optional(),
            btcCorrelation: z
              .object({
                correlation: z.number().nullable().optional(),
                strength: z.string().nullable().optional(),
                direction: z.string().nullable().optional(),
                beta: z.number().nullable().optional(),
                relativeStrength: z.number().nullable().optional(),
                decouplingSignal: z.enum(['decoupled', 'coupled', 'weakly_coupled']).nullable().optional(),
                interpretation: z.string().nullable().optional(),
              })
              .nullable()
              .optional(),
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
  
      try {
        // Fetch market data with sufficient candles for volume analysis (75+ candles)
        if (!process.env.CANDLES_COUNT || parseInt(process.env.CANDLES_COUNT) < 200) {
          process.env.CANDLES_COUNT = '200'
        }
        
        // Always include BTC for correlation analysis
        const tickersWithBTC = normalizedTickers.includes('BTC') 
          ? normalizedTickers 
          : ['BTC', ...normalizedTickers]
        
        // Get market data for all tickers (fetched in parallel by getMarketData)
        const { marketDataMap } = await getMarketData(tickersWithBTC)
        
        // Extract BTC prices for correlation calculation
        const btcData = marketDataMap.get('BTC')
        const btcHistoricalData = btcData?.historicalData || btcData?.data?.historicalData || []
        const btcPrices = btcHistoricalData.map((d: any) => d.close || d.price).filter((p: number) => p > 0)
  
        // Format results for each ticker
        const results = normalizedTickers.map((ticker) => {
          const assetData = marketDataMap.get(ticker)
  
          if (!assetData) {
            return {
              ticker,
              price: null,
              timestamp: new Date().toISOString(),
              technical: null,
              btcCorrelation: null,
            }
          }
  
          const price = assetData.price || assetData.data?.price || null
          const technical = formatTechnicalIndicators(assetData, price)
          
          // Calculate BTC correlation for non-BTC tickers
          let btcCorrelation: any = null
          if (ticker !== 'BTC' && btcPrices.length >= 30) {
            const historicalData = assetData?.historicalData || assetData?.data?.historicalData || []
            const assetPrices = historicalData.map((d: any) => d.close || d.price).filter((p: number) => p > 0)
            
            if (assetPrices.length >= 30) {
              const correlation = analyzeAltcoinCorrelation(ticker, assetPrices, btcPrices, 30)
              btcCorrelation = {
                correlation: correlation.correlationWithBTC?.correlation || null,
                strength: correlation.correlationWithBTC?.strength || null,
                direction: correlation.correlationWithBTC?.direction || null,
                beta: correlation.beta,
                relativeStrength: correlation.relativeStrength,
                decouplingSignal: correlation.decouplingSignal,
                interpretation: correlation.interpretation,
              }
            }
          } else if (ticker === 'BTC') {
            btcCorrelation = {
              correlation: 1,
              strength: 'perfect',
              direction: 'positive',
              beta: 1,
              relativeStrength: 0,
              decouplingSignal: 'coupled',
              interpretation: 'BTC is the reference asset for correlation analysis.',
            }
          }
  
          return {
            ticker,
            price: price,
            timestamp: new Date().toISOString(),
            technical: technical,
            btcCorrelation: btcCorrelation,
          }
        })
  
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  results,
                  summary: {
                    total: results.length,
                    found: results.filter((r) => r.technical !== null).length,
                    notFound: results.filter((r) => r.technical === null).length,
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
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  results: [],
                  error: error instanceof Error ? error.message : String(error),
                  message: 'Failed to fetch technical indicators',
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
  

  // Tool: get_volume_analysis
  server.registerTool(
    'get_volume_analysis',
    {
      title: 'Get Volume Analysis',
      description: 'Get comprehensive volume analysis for multiple trading tickers at once (e.g., ["BTC", "ETH", "SOL"])',
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
            volumeAnalysis: z
              .object({
                buyVolume: z.number().nullable().optional(),
                sellVolume: z.number().nullable().optional(),
                netDelta: z.number().nullable().optional(),
                buyPressure: z.number().nullable().optional(),
                sellPressure: z.number().nullable().optional(),
                dominantSide: z.string().nullable().optional(),
                keyLevel: z.number().nullable().optional(),
                keyLevelDelta: z.number().nullable().optional(),
                poc: z.number().nullable().optional(),
                vah: z.number().nullable().optional(),
                val: z.number().nullable().optional(),
                hvn: z.string().nullable().optional(),
                lvn: z.string().nullable().optional(),
                cvdTrend: z.string().nullable().optional(),
                cvdDelta: z.number().nullable().optional(),
                topLiquidityZones: z
                  .array(
                    z.object({
                      priceRange: z.string(),
                      type: z.string(),
                      strength: z.string(),
                    })
                  )
                  .nullable()
                  .optional(),
                recommendation: z.string().nullable().optional(),
                confidence: z.number().nullable().optional(),
                riskLevel: z.string().nullable().optional(),
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
  
      try {
        // Fetch market data with sufficient candles for volume analysis (75+ candles)
        if (!process.env.CANDLES_COUNT || parseInt(process.env.CANDLES_COUNT) < 200) {
          process.env.CANDLES_COUNT = '200'
        }
        // Fetch market data for all tickers in parallel
        const { marketDataMap } = await getMarketData(normalizedTickers)
  
        const results: Array<{
          ticker: string
          price: number | null
          timestamp?: string
          volumeAnalysis: ReturnType<typeof formatVolumeAnalysis>
        }> = []
  
        for (const ticker of normalizedTickers) {
          const assetData = marketDataMap.get(ticker)
  
          if (!assetData) {
            results.push({
              ticker,
              price: null,
              timestamp: new Date().toISOString(),
              volumeAnalysis: null,
            })
            continue
          }
  
          const price = assetData.price || assetData.data?.price || null
          const historicalData = assetData.historicalData || assetData.data?.historicalData || []
          const externalData = assetData.externalData || assetData.data?.externalData || {}
          const volumeAnalysis = externalData.comprehensiveVolumeAnalysis || assetData.comprehensiveVolumeAnalysis || assetData.data?.comprehensiveVolumeAnalysis
  
          // If volume analysis is not available but we have historical data, try to calculate it
          let finalVolumeAnalysis = volumeAnalysis
          if (!finalVolumeAnalysis && historicalData && historicalData.length >= 20 && price) {
            // Use static import
            const volumeProfileData = externalData.volumeProfile || {}
            const sessionVolumeProfile = volumeProfileData.session || assetData.sessionVolumeProfile || assetData.data?.sessionVolumeProfile
            const compositeVolumeProfile = volumeProfileData.composite || assetData.compositeVolumeProfile || assetData.data?.compositeVolumeProfile
            let cumulativeVolumeDelta = externalData.volumeDelta || assetData.volumeDelta || assetData.data?.volumeDelta
            // Calculate CVD if not available from external data
            if (!cumulativeVolumeDelta && historicalData && historicalData.length >= 10) {
              cumulativeVolumeDelta = calculateCVD(historicalData)
            }
            
            try {
              finalVolumeAnalysis = performComprehensiveVolumeAnalysis(
                historicalData,
                price,
                undefined,
                undefined,
                sessionVolumeProfile || compositeVolumeProfile || undefined,
                cumulativeVolumeDelta || undefined,
                undefined
              )
            } catch (error) {
              // If calculation fails, keep it as null
              console.error(`Failed to calculate volume analysis for ${ticker}:`, error)
            }
          }
  
          // Format volume analysis
          const formattedVolumeAnalysis = formatVolumeAnalysis(finalVolumeAnalysis, price)
  
          results.push({
            ticker,
            price,
            timestamp: new Date().toISOString(),
            volumeAnalysis: formattedVolumeAnalysis,
          })
        }
  
        const found = results.filter((r) => r.price !== null).length
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
                  message: 'Failed to fetch volume analysis',
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
  ),
  

  // Tool: get_Multitimeframe
  server.registerTool(
    'get_Multitimeframe',
    {
      title: 'Get Multi-Timeframe Analysis',
      description: 'Get multi-timeframe trend alignment analysis for multiple trading tickers at once (e.g., ["BTC", "ETH", "SOL"])',
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
            multiTimeframe: z
              .object({
                dailyTrend: z.string().nullable().optional(),
                h4Aligned: z.boolean().nullable().optional(),
                h1Aligned: z.boolean().nullable().optional(),
                overall: z.string().nullable().optional(),
                score: z.number().nullable().optional(),
                reason: z.string().nullable().optional(),
                daily: z
                  .object({
                    price: z.number().nullable().optional(),
                    ema20: z.number().nullable().optional(),
                    ema50: z.number().nullable().optional(),
                    rsi14: z.number().nullable().optional(),
                  })
                  .nullable()
                  .optional(),
                h4: z
                  .object({
                    price: z.number().nullable().optional(),
                    ema20: z.number().nullable().optional(),
                    rsi14: z.number().nullable().optional(),
                  })
                  .nullable()
                  .optional(),
                h1: z
                  .object({
                    price: z.number().nullable().optional(),
                    ema20: z.number().nullable().optional(),
                    rsi14: z.number().nullable().optional(),
                  })
                  .nullable()
                  .optional(),
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
  
      try {
        // Fetch market data with sufficient candles for multi-timeframe analysis (75+ candles)
        if (!process.env.CANDLES_COUNT || parseInt(process.env.CANDLES_COUNT) < 200) {
          process.env.CANDLES_COUNT = '200'
        }
        // Fetch market data for all tickers in parallel
        const { marketDataMap } = await getMarketData(normalizedTickers)
  
        const results: Array<{
          ticker: string
          price: number | null
          timestamp?: string
          multiTimeframe: ReturnType<typeof formatMultiTimeframe>
        }> = []
  
        for (const ticker of normalizedTickers) {
          const assetData = marketDataMap.get(ticker)
  
          if (!assetData) {
            results.push({
              ticker,
              price: null,
              timestamp: new Date().toISOString(),
              multiTimeframe: null,
            })
            continue
          }
  
          const price = assetData.price || assetData.data?.price || null
          const formattedMultiTimeframe = formatMultiTimeframe(assetData)
  
          results.push({
            ticker,
            price,
            timestamp: new Date().toISOString(),
            multiTimeframe: formattedMultiTimeframe,
          })
        }
  
        const found = results.filter((r) => r.price !== null).length
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
                  message: 'Failed to fetch multi-timeframe analysis',
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
  

  // Tool: get_External_data
  server.registerTool(
    'get_External_data',
    {
      title: 'Get External Data',
      description: 'Get comprehensive external market data including funding rates, open interest, liquidations, whale positions, and top traders for multiple trading tickers at once (e.g., ["BTC", "ETH", "SOL"])',
      inputSchema: {
        tickers: z
          .array(z.string())
          .min(1)
          .describe('Array of asset ticker symbols (e.g., ["BTC", "ETH", "SOL"])'),
        includeHyperscreener: z
          .boolean()
          .optional()
          .default(true)
          .describe('Include additional data from HyperScreener (liquidations, whales, top traders). Default: true'),
      },
      outputSchema: z.object({
        results: z.array(
          z.object({
            ticker: z.string(),
            price: z.number().nullable(),
            timestamp: z.string().optional(),
            externalData: z
              .object({
                fundingRate: z.string().nullable().optional(),
                fundingRateTrend: z.string().nullable().optional(),
                openInterest: z.union([z.string(), z.number()]).nullable().optional(),
                openInterestTrend: z.string().nullable().optional(),
                volumeTrend: z.string().nullable().optional(),
                volatility: z.string().nullable().optional(),
              })
              .nullable()
              .optional(),
            hyperscreenerData: z
              .object({
                longShortRatio: z.number().nullable().optional(),
                recentLiquidations: z.array(z.any()).nullable().optional(),
                whalePositions: z.array(z.any()).nullable().optional(),
                largeTrades: z.array(z.any()).nullable().optional(),
              })
              .nullable()
              .optional(),
          })
        ),
        marketOverview: z.any().nullable().optional(),
        topGainers: z.array(z.any()).nullable().optional(),
        topLosers: z.array(z.any()).nullable().optional(),
        platformStats: z.any().nullable().optional(),
        summary: z
          .object({
            total: z.number(),
            found: z.number(),
            notFound: z.number(),
          })
          .optional(),
      }),
    },
    async ({ tickers, includeHyperscreener = true }: { tickers: string[], includeHyperscreener?: boolean }) => {
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
  
      try {
        // Fetch market data
        if (!process.env.CANDLES_COUNT || parseInt(process.env.CANDLES_COUNT) < 200) {
          process.env.CANDLES_COUNT = '200'
        }
        
        // Fetch all data in parallel
        const [
          { marketDataMap },
          hyperscreenerLiquidations,
          hyperscreenerWhales,
          hyperscreenerLongShort,
          hyperscreenerLargeTrades,
          hyperscreenerMarketOverview,
          hyperscreenerTopGainers,
          hyperscreenerTopLosers,
          hyperscreenerPlatformStats
        ] = await Promise.all([
          getMarketData(normalizedTickers),
          includeHyperscreener ? getLiquidations('notional_volume', 'desc', 20).catch(() => null) : Promise.resolve(null),
          includeHyperscreener ? getWhalePositions('notional_value', 'desc', 20).catch(() => null) : Promise.resolve(null),
          includeHyperscreener ? getHyperscreenerLongShortRatio('notional_value', 'desc', 50).catch(() => null) : Promise.resolve(null),
          includeHyperscreener ? getLargeTrades(50000, 'desc', 20).catch(() => null) : Promise.resolve(null),
          includeHyperscreener ? getMarketOverview().catch(() => null) : Promise.resolve(null),
          includeHyperscreener ? getTopGainers('24h', 10).catch(() => null) : Promise.resolve(null),
          includeHyperscreener ? getTopLosers('24h', 10).catch(() => null) : Promise.resolve(null),
          includeHyperscreener ? getPlatformStats().catch(() => null) : Promise.resolve(null),
        ])
  
        // Create lookup maps for HyperScreener data
        const liquidationsMap = new Map<string, any[]>()
        const whalesMap = new Map<string, any[]>()
        const longShortMap = new Map<string, number>()
        const largeTradesMap = new Map<string, any[]>()
  
        // Process liquidations data
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
  
        // Process whale positions data
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
  
        // Process long/short ratio data
        if (hyperscreenerLongShort && Array.isArray(hyperscreenerLongShort)) {
          for (const ls of hyperscreenerLongShort) {
            const symbol = (ls.symbol || ls.coin || '').toUpperCase()
            const ratio = ls.long_short_ratio || ls.longShortRatio || ls.ratio
            if (symbol && ratio !== undefined) {
              longShortMap.set(symbol, parseFloat(ratio))
            }
          }
        }
  
        // Process large trades data
        if (hyperscreenerLargeTrades && Array.isArray(hyperscreenerLargeTrades)) {
          for (const trade of hyperscreenerLargeTrades) {
            const symbol = (trade.symbol || trade.coin || '').toUpperCase()
            if (symbol) {
              if (!largeTradesMap.has(symbol)) {
                largeTradesMap.set(symbol, [])
              }
              largeTradesMap.get(symbol)!.push(trade)
            }
          }
        }
  
        const results: Array<{
          ticker: string
          price: number | null
          timestamp?: string
          externalData: ReturnType<typeof formatExternalData>
          hyperscreenerData: {
            longShortRatio: number | null
            recentLiquidations: any[] | null
            whalePositions: any[] | null
            largeTrades: any[] | null
          } | null
        }> = []
  
        for (const ticker of normalizedTickers) {
          const assetData = marketDataMap.get(ticker)
  
          if (!assetData) {
            results.push({
              ticker,
              price: null,
              timestamp: new Date().toISOString(),
              externalData: null,
              hyperscreenerData: includeHyperscreener ? {
                longShortRatio: longShortMap.get(ticker) || null,
                recentLiquidations: liquidationsMap.get(ticker)?.slice(0, 5) || null,
                whalePositions: whalesMap.get(ticker)?.slice(0, 5) || null,
                largeTrades: largeTradesMap.get(ticker)?.slice(0, 5) || null,
              } : null,
            })
            continue
          }
  
          const price = assetData.price || assetData.data?.price || null
          const formattedExternalData = formatExternalData(assetData)
  
          results.push({
            ticker,
            price,
            timestamp: new Date().toISOString(),
            externalData: formattedExternalData,
            hyperscreenerData: includeHyperscreener ? {
              longShortRatio: longShortMap.get(ticker) || null,
              recentLiquidations: liquidationsMap.get(ticker)?.slice(0, 5) || null,
              whalePositions: whalesMap.get(ticker)?.slice(0, 5) || null,
              largeTrades: largeTradesMap.get(ticker)?.slice(0, 5) || null,
            } : null,
          })
        }
  
        const found = results.filter((r) => r.price !== null).length
        const notFound = results.length - found
  
        const result = {
          results,
          marketOverview: hyperscreenerMarketOverview || null,
          topGainers: hyperscreenerTopGainers || null,
          topLosers: hyperscreenerTopLosers || null,
          platformStats: hyperscreenerPlatformStats || null,
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
                  message: 'Failed to fetch external data',
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
