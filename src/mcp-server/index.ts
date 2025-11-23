/**
 * GearTrade MCP Server
 * Exposes trading functionality via Model Context Protocol
 */

// @ts-ignore - MCP SDK uses wildcard exports that TypeScript can't resolve, but works at runtime
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
// @ts-ignore
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

// Import existing functionality
import { getRealTimePrice } from '../signal-generation/data-fetchers/hyperliquid'
import { getMarketData } from '../signal-generation/data-fetchers/market-data'

// Helper function to format technical indicators
function formatTechnicalIndicators(assetData: any, price: number | null) {
  const indicators = assetData?.indicators || assetData?.data?.indicators || {}
  const trendAlignment = assetData?.data?.trendAlignment || assetData?.trendAlignment

  return {
    rsi: {
      rsi14: indicators.rsi14 || null,
      rsi7: indicators.rsi7 || null,
      rsi4h: indicators.rsi4h || indicators['4h']?.rsi14 || null,
    },
    ema: {
      ema20: indicators.ema20 || null,
      ema50: indicators.ema50 || null,
    },
    macd: indicators.macd
      ? {
          macd: indicators.macd.macd || indicators.macd.macdLine || null,
          signal: indicators.macd.signal || indicators.macd.signalLine || null,
          histogram: indicators.macd.histogram || null,
        }
      : null,
    bollingerBands: indicators.bollingerBands
      ? {
          upper: indicators.bollingerBands.upper || null,
          middle: indicators.bollingerBands.middle || null,
          lower: indicators.bollingerBands.lower || null,
          position: indicators.bollingerBands.position || null,
        }
      : null,
    atr: indicators.atr || indicators.atr14 || null,
    adx: indicators.adx
      ? {
          adx: indicators.adx.adx || indicators.adx || null,
          plusDI: indicators.adx.plusDI || indicators.plusDI || null,
          minusDI: indicators.adx.minusDI || indicators.minusDI || null,
          trend: indicators.adx.trend || (indicators.adx?.adx > 25 ? 'Strong' : indicators.adx?.adx > 20 ? 'Moderate' : 'Weak') || null,
        }
      : null,
    obv: indicators.obv || null,
    vwap: indicators.vwap || null,
    stochastic: indicators.stochastic
      ? {
          k: indicators.stochastic.k || indicators.stochastic.stochK || null,
          d: indicators.stochastic.d || indicators.stochastic.stochD || null,
        }
      : null,
    cci: indicators.cci || null,
    williamsR: indicators.williamsR || indicators.williamsPercentR || null,
    parabolicSAR: indicators.parabolicSAR
      ? {
          value: typeof indicators.parabolicSAR === 'number' ? indicators.parabolicSAR : indicators.parabolicSAR.value || null,
          trend: indicators.parabolicSAR.trend || (price && indicators.parabolicSAR < price ? 'Bullish' : 'Bearish') || null,
        }
      : null,
    aroon: indicators.aroon
      ? {
          up: indicators.aroon.up || indicators.aroon.aroonUp || null,
          down: indicators.aroon.down || indicators.aroon.aroonDown || null,
          trend: indicators.aroon.trend || (indicators.aroon.up > 70 ? 'Strong Uptrend' : indicators.aroon.down > 70 ? 'Strong Downtrend' : 'Neutral') || null,
        }
      : null,
    support: indicators.support || assetData?.support || null,
    resistance: indicators.resistance || assetData?.resistance || null,
    fibonacci: indicators.fibonacci
      ? {
          level: indicators.fibonacci.level || null,
          direction: indicators.fibonacci.direction || null,
          range: indicators.fibonacci.range || null,
          keyLevels: indicators.fibonacci.keyLevels || null,
        }
      : null,
    trend: trendAlignment
      ? {
          direction: trendAlignment.trend || trendAlignment.direction || null,
          strength: trendAlignment.strength || trendAlignment.alignmentScore ? `${trendAlignment.alignmentScore}/100` : null,
        }
      : null,
    marketStructure: indicators.marketStructure
      ? {
          structure: indicators.marketStructure.structure || indicators.marketStructure || null,
          higherHigh: indicators.marketStructure.higherHigh || false,
          lowerLow: indicators.marketStructure.lowerLow || false,
        }
      : null,
    rsiDivergence: indicators.rsiDivergence?.divergence || null,
    candlestick: indicators.candlestick || indicators.candlestickPattern || null,
    marketRegime:
      indicators.marketRegime && typeof indicators.marketRegime === 'object'
        ? indicators.marketRegime.regime || indicators.marketRegime.volatility || String(indicators.marketRegime)
        : indicators.marketRegime || indicators.regime || null,
    change24h: assetData?.change24h || assetData?.data?.change24h || null,
    volumeChange24h: assetData?.volumeChange24h || assetData?.data?.volumeChange24h || null,
  }
}

// Create MCP server
const server = new McpServer({
  name: 'geartrade',
  version: '1.0.0',
})

// Register get_price tool
server.registerTool(
  'get_price',
  {
    title: 'Get Price',
    description: 'Get latest price for a trading ticker/symbol (e.g., BTC, ETH, SOL)',
    inputSchema: {
      ticker: z.string().describe('Asset ticker symbol (e.g., "BTC", "ETH", "SOL")'),
    },
    outputSchema: {
      ticker: z.string(),
      price: z.number().nullable(),
      timestamp: z.string().optional(),
    },
  },
  async ({ ticker }: { ticker: string }) => {
    if (!ticker || typeof ticker !== 'string' || ticker.trim().length === 0) {
      const errorResult = {
        ticker: ticker || '',
        price: null as number | null,
        timestamp: new Date().toISOString(),
      }
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                ...errorResult,
                error: 'Invalid ticker parameter',
                message: 'Ticker must be a non-empty string',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: errorResult,
      }
    }

    // Normalize ticker (uppercase, remove spaces)
    const normalizedTicker = ticker.trim().toUpperCase()

    try {
      // Get real-time price
      const price = await getRealTimePrice(normalizedTicker)

      if (price === null) {
        const notFoundResult = {
          ticker: normalizedTicker,
          price: null as number | null,
          timestamp: new Date().toISOString(),
        }
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  ...notFoundResult,
                  error: 'Price not found',
                  message: `Could not fetch price for ${normalizedTicker}. Asset may not be available on Hyperliquid.`,
                },
                null,
                2
              ),
            },
          ],
          structuredContent: notFoundResult,
        }
      }

      const result = {
        ticker: normalizedTicker,
        price: price,
        timestamp: new Date().toISOString(),
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
      const errorResult = {
        ticker: normalizedTicker,
        price: null as number | null,
        timestamp: new Date().toISOString(),
      }
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                ...errorResult,
                error: error instanceof Error ? error.message : String(error),
                message: 'Failed to fetch price',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: errorResult,
      }
    }
  }
)

// Register get_multiple_prices tool
server.registerTool(
  'get_multiple_prices',
  {
    title: 'Get Multiple Prices',
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

// Register get_indicator tool (single ticker only)
server.registerTool(
  'get_indicator',
  {
    title: 'Get Technical Indicator',
    description: 'Get comprehensive technical analysis indicators for a single trading ticker (RSI, EMA, MACD, Bollinger Bands, etc.). For multiple tickers, use get_multiple_prices.',
    inputSchema: {
      ticker: z.string().describe('Single asset ticker symbol (e.g., "BTC", "ETH", "SOL"). Only one ticker allowed.'),
    },
    outputSchema: {
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
          change24h: z.number().nullable().optional(),
          volumeChange24h: z.number().nullable().optional(),
        })
        .nullable()
        .optional(),
    },
  },
  async ({ ticker }: { ticker: string }) => {
    if (!ticker || typeof ticker !== 'string' || ticker.trim().length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                ticker: ticker || '',
                price: null,
                technical: null,
                error: 'Invalid ticker parameter',
                message: 'Ticker must be a non-empty string',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: {
          ticker: ticker || '',
          price: null,
          technical: null,
        },
      }
    }

    // Normalize ticker (uppercase, remove spaces)
    const normalizedTicker = ticker.trim().toUpperCase()

    try {
      // Get market data which includes technical indicators
      const { marketDataMap } = await getMarketData([normalizedTicker])
      const assetData = marketDataMap.get(normalizedTicker)

      if (!assetData) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  ticker: normalizedTicker,
                  price: null,
                  technical: null,
                  error: 'Asset data not found',
                  message: `Could not fetch technical data for ${normalizedTicker}. Asset may not be available on Hyperliquid.`,
                },
                null,
                2
              ),
            },
          ],
          structuredContent: {
            ticker: normalizedTicker,
            price: null,
            technical: null,
          },
        }
      }

      const price = assetData.price || assetData.data?.price || null
      const technical = formatTechnicalIndicators(assetData, price)

      const result = {
        ticker: normalizedTicker,
        price: price,
        timestamp: new Date().toISOString(),
        technical: technical,
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
                ticker: normalizedTicker,
                price: null,
                technical: null,
                error: error instanceof Error ? error.message : String(error),
                message: 'Failed to fetch technical analysis',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: {
          ticker: normalizedTicker,
          price: null,
          technical: null,
        },
      }
    }
  }
)

// Register get_multiple_indicators tool
server.registerTool(
  'get_multiple_indicators',
  {
    title: 'Get Multiple Technical Indicators',
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
              change24h: z.number().nullable().optional(),
              volumeChange24h: z.number().nullable().optional(),
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
      // Get market data for all tickers (fetched in parallel by getMarketData)
      const { marketDataMap } = await getMarketData(normalizedTickers)

      // Format results for each ticker
      const results = normalizedTickers.map((ticker) => {
        const assetData = marketDataMap.get(ticker)

        if (!assetData) {
          return {
            ticker,
            price: null,
            timestamp: new Date().toISOString(),
            technical: null,
          }
        }

        const price = assetData.price || assetData.data?.price || null
        const technical = formatTechnicalIndicators(assetData, price)

        return {
          ticker,
          price: price,
          timestamp: new Date().toISOString(),
          technical: technical,
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

// Start server
async function main() {
  try {
    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      console.error('Uncaught exception:', error)
    })
    
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled rejection at:', promise, 'reason:', reason)
    })

    const transport = new StdioServerTransport()
    await server.connect(transport)
    console.error('GearTrade MCP Server running on stdio')
  } catch (error) {
    console.error('Failed to start MCP server:', error)
    if (error instanceof Error) {
      console.error('Error stack:', error.stack)
    }
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('Fatal error starting MCP server:', error)
  if (error instanceof Error) {
    console.error('Error stack:', error.stack)
  }
  process.exit(1)
})
