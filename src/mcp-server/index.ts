#!/usr/bin/env node

/**
 * GearTrade MCP Server
 * Model Context Protocol server for autonomous trading
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'

// Import trading logic
import { generateSignals } from '../signal-generation/signal-generation/generate-signals'
import { generateSignalForSingleAsset } from '../signal-generation/signal-generation/generate-single-asset'
import { getMarketData } from '../signal-generation/data-fetchers/market-data'
import { getActivePositions } from '../signal-generation/position-management/positions'
import { getTradingConfig } from '../signal-generation/config'
import { Signal, MarketData } from '../signal-generation/types'
import { initializeTestMode, runTestModeCycle } from '../signal-generation/cycle/test-mode'
import { loadCycleState } from '../signal-generation/cycle/shared/state-manager'
import * as fs from 'fs'
import * as path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data')
const STATE_FILE = path.join(DATA_DIR, 'cycle-state-test.json')
const PERFORMANCE_FILE = path.join(DATA_DIR, 'performance-report-test.json')

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

class GearTradeMCPServer {
  private server: Server

  constructor() {
    this.server = new Server(
      {
        name: 'geartrade-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    )

    this.setupToolHandlers()
    this.setupResourceHandlers()
    this.setupErrorHandling()
  }

  private setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'generate_trading_signals',
          description: 'Generate trading signals for specified assets using AI analysis',
          inputSchema: {
            type: 'object',
            properties: {
              assets: {
                type: 'array',
                items: { type: 'string' },
                description: 'List of asset symbols to generate signals for (e.g., ["BTC", "ETH"])',
              },
              topN: {
                type: 'number',
                description: 'Number of top assets to analyze (default: 15)',
                default: 15,
              },
            },
            required: ['assets'],
          },
        },
        {
          name: 'get_market_data',
          description: 'Get current market data for specified assets',
          inputSchema: {
            type: 'object',
            properties: {
              assets: {
                type: 'array',
                items: { type: 'string' },
                description: 'List of asset symbols to get market data for',
              },
            },
            required: ['assets'],
          },
        },
        {
          name: 'get_active_positions',
          description: 'Get current active trading positions',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'run_trading_cycle',
          description: 'Run a single trading cycle (test mode)',
          inputSchema: {
            type: 'object',
            properties: {
              cycleIntervalMs: {
                type: 'number',
                description: 'Cycle interval in milliseconds (default: 10000)',
                default: 10000,
              },
            },
          },
        },
        {
          name: 'get_performance',
          description: 'Get trading performance metrics',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'analyze_asset',
          description: 'Analyze a single asset (ticker) without executing trades. Use this when user mentions a ticker like $BTC or BTC. Returns detailed analysis only, no trade execution.',
          inputSchema: {
            type: 'object',
            properties: {
              ticker: {
                type: 'string',
                description: 'Asset ticker symbol (e.g., "BTC", "ETH", "$BTC" - $ will be stripped automatically)',
              },
            },
            required: ['ticker'],
          },
        },
      ],
    }))

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params

      try {
        switch (name) {
          case 'generate_trading_signals': {
            const assets = args?.assets as string[]
            const topN = (args?.topN as number) || 15

            if (!assets || !Array.isArray(assets) || assets.length === 0) {
              throw new Error('assets array is required')
            }

            const { marketDataMap, allowedAssets } = await getMarketData(assets)
            const positions = getActivePositions()
            const positionsMap = new Map<string, any>()
            positions.forEach((pos) => {
              positionsMap.set(pos.asset, pos)
            })

            const accountState = {
              availableCash: 10000,
              totalValue: 10000,
            }

            // Generate signals (model can be null, will use config from env)
            const signals = await generateSignals(
              null, // model - will use config from environment
              marketDataMap,
              accountState,
              allowedAssets.length > 0 ? allowedAssets : assets,
              new Map(), // signalHistory
              positionsMap // positions
            )

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    {
                      signals: signals.map((s) => ({
                        asset: s.asset,
                        action: s.action,
                        confidence: s.confidence,
                        entryPrice: s.entryPrice,
                        stopLoss: s.stopLoss,
                        takeProfit: s.takeProfit,
                        leverage: s.leverage,
                        reasoning: s.reasoning,
                      })),
                      timestamp: new Date().toISOString(),
                    },
                    null,
                    2
                  ),
                },
              ],
            }
          }

          case 'get_market_data': {
            const assets = args?.assets as string[]

            if (!assets || !Array.isArray(assets) || assets.length === 0) {
              throw new Error('assets array is required')
            }

            const marketData = await getMarketData(assets)

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(marketData, null, 2),
                },
              ],
            }
          }

          case 'get_active_positions': {
            const positions = getActivePositions()

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    {
                      positions: positions.map((p) => ({
                        asset: p.asset,
                        side: p.side,
                        size: p.size,
                        entryPrice: p.entryPrice,
                        currentPrice: p.currentPrice,
                        unrealizedPnl: p.unrealizedPnl,
                        leverage: p.leverage,
                      })),
                      count: positions.length,
                    },
                    null,
                    2
                  ),
                },
              ],
            }
          }

          case 'run_trading_cycle': {
            const cycleIntervalMs = (args?.cycleIntervalMs as number) || 10000

            // Initialize test mode if not already initialized
            const state = loadCycleState(STATE_FILE)
            if (!state) {
              await initializeTestMode({
                paperCapital: 10000,
                topNAssets: 15,
                cycleIntervalMs,
                stateFile: STATE_FILE,
                performanceFile: PERFORMANCE_FILE,
              })
            }

            // Run a single cycle
            await runTestModeCycle({
              cycleIntervalMs,
              stateFile: STATE_FILE,
              performanceFile: PERFORMANCE_FILE,
            })

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    {
                      status: 'cycle_completed',
                      timestamp: new Date().toISOString(),
                    },
                    null,
                    2
                  ),
                },
              ],
            }
          }

          case 'get_performance': {
            let performance = null
            if (fs.existsSync(PERFORMANCE_FILE)) {
              try {
                const content = fs.readFileSync(PERFORMANCE_FILE, 'utf-8')
                performance = JSON.parse(content)
              } catch (e) {
                // Ignore parse errors
              }
            }

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(performance || { message: 'No performance data available' }, null, 2),
                },
              ],
            }
          }

          case 'analyze_asset': {
            let ticker = (args?.ticker as string) || ''
            
            // Strip $ symbol if present
            ticker = ticker.replace(/^\$/, '').toUpperCase().trim()
            
            if (!ticker) {
              throw new Error('ticker is required')
            }

            // Get market data for the asset
            const { marketDataMap, allowedAssets } = await getMarketData([ticker])
            const config = getTradingConfig()
            const positions = getActivePositions()
            
            // Convert positions to Map format expected by generateSignalForSingleAsset
            const positionsMap = new Map<string, any>()
            positions.forEach((pos) => {
              positionsMap.set(pos.asset, pos)
            })

            // Get account state (simplified for analysis)
            const accountState = {
              availableCash: 10000, // Default for analysis
              totalValue: 10000,
            }

            // Generate signal for single asset (analysis only, no execution)
            const signal = await generateSignalForSingleAsset(
              ticker,
              marketDataMap,
              accountState,
              positionsMap,
              1000, // equalCapitalPerSignal (not used for analysis)
              0, // signalIndex (not used for analysis)
              allowedAssets.length > 0 ? allowedAssets : [ticker], // allowedAssets
              true, // marketDataIsMap
              null, // assetRank
              null // qualityScore
            )

            // Get full market data for the asset
            const assetMarketData = marketDataMap.get(ticker)

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    {
                      asset: ticker,
                      analysis: signal
                        ? {
                            action: signal.action,
                            confidence: signal.confidence,
                            entryPrice: signal.entryPrice,
                            stopLoss: signal.stopLoss,
                            takeProfit: signal.takeProfit,
                            leverage: signal.leverage,
                            reasoning: signal.reasoning,
                            justification: signal.justification,
                            riskRewardRatio: signal.riskRewardRatio,
                            expectedValue: signal.expectedValue,
                          }
                        : null,
                      marketData: assetMarketData
                        ? {
                            price: assetMarketData.price,
                            volume24h: assetMarketData.volume24h,
                            change24h: assetMarketData.change24h,
                          }
                        : null,
                      timestamp: new Date().toISOString(),
                      note: 'This is analysis only. No trades were executed.',
                    },
                    null,
                    2
                  ),
                },
              ],
            }
          }

          default:
            throw new Error(`Unknown tool: ${name}`)
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  error: errorMessage,
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        }
      }
    })
  }

  private setupResourceHandlers() {
    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: 'geartrade://state',
          name: 'Trading State',
          description: 'Current trading cycle state',
          mimeType: 'application/json',
        },
        {
          uri: 'geartrade://performance',
          name: 'Performance Metrics',
          description: 'Trading performance metrics',
          mimeType: 'application/json',
        },
        {
          uri: 'geartrade://config',
          name: 'Trading Configuration',
          description: 'Current trading configuration',
          mimeType: 'application/json',
        },
      ],
    }))

    // Handle resource reads
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params

      try {
        switch (uri) {
          case 'geartrade://state': {
            const state = loadCycleState(STATE_FILE)
            return {
              contents: [
                {
                  uri,
                  mimeType: 'application/json',
                  text: JSON.stringify(state || { message: 'No state available' }, null, 2),
                },
              ],
            }
          }

          case 'geartrade://performance': {
            let performance = null
            if (fs.existsSync(PERFORMANCE_FILE)) {
              try {
                const content = fs.readFileSync(PERFORMANCE_FILE, 'utf-8')
                performance = JSON.parse(content)
              } catch (e) {
                // Ignore parse errors
              }
            }

            return {
              contents: [
                {
                  uri,
                  mimeType: 'application/json',
                  text: JSON.stringify(performance || { message: 'No performance data available' }, null, 2),
                },
              ],
            }
          }

          case 'geartrade://config': {
            const config = getTradingConfig()
            return {
              contents: [
                {
                  uri,
                  mimeType: 'application/json',
                  text: JSON.stringify(config, null, 2),
                },
              ],
            }
          }

          default:
            throw new Error(`Unknown resource: ${uri}`)
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        throw new Error(`Failed to read resource ${uri}: ${errorMessage}`)
      }
    })
  }

  private setupErrorHandling() {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error)
    }

    process.on('SIGINT', async () => {
      await this.server.close()
      process.exit(0)
    })
  }

  async run() {
    const transport = new StdioServerTransport()
    await this.server.connect(transport)
    console.error('GearTrade MCP Server running on stdio')
  }
}

// Start server
const server = new GearTradeMCPServer()
server.run().catch(console.error)

