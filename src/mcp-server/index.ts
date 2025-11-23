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
