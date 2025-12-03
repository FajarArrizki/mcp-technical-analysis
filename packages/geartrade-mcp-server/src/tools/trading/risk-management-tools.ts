import { z } from 'zod'
import { calculateStopLoss } from '../../signal-generation/exit-conditions/stop-loss'
import { calculateTakeProfitLevels } from '../../signal-generation/exit-conditions/take-profit'
import { calculateDynamicLeverage } from '../../signal-generation/risk-management/leverage'
import { calculateDynamicMarginPercentage } from '../../signal-generation/risk-management/margin'
import { getRealTimePrice } from '../../signal-generation/data-fetchers/hyperliquid'
import { getMarketData } from '../../signal-generation/data-fetchers/market-data'
import { formatRiskManagement, formatPositionSetup } from '../../formatters'
export function registerTradingRiskTools(server: any) {
  // Tool: calculate_risk_management
  server.registerTool(
  'calculate_risk_management',
  {
    title: 'Calculate Risk Management',
    description: 'Calculate stop loss, take profit, and risk/reward ratio for a trading position',
    inputSchema: {
      ticker: z.string().describe('Asset ticker symbol (e.g., "BTC", "ETH", "SOL")'),
      entryPrice: z.number().positive().describe('Entry price for the position'),
      side: z.enum(['LONG', 'SHORT']).describe('Position side (LONG or SHORT)'),
      stopLossPct: z.number().positive().optional().describe('Stop loss percentage (default: 2%)'),
      takeProfitPct: z.number().positive().optional().describe('Take profit percentage (default: 4.5%)'),
      positionSizeUsd: z.number().positive().optional().describe('Position size in USD (optional, for calculating potential loss/profit)'),
    },
    outputSchema: z.object({
      ticker: z.string(),
      entryPrice: z.number(),
      side: z.string(),
      riskManagement: z.object({
        stopLossFixed: z.number(),
        stopLossFixedPct: z.number(),
        stopLossFlexible: z.number(),
        stopLossFlexiblePct: z.number(),
        takeProfit: z.number(),
        takeProfitPct: z.number(),
        takeProfitLevels: z.any().nullable().optional(),
        potentialLoss: z.number().nullable().optional(),
        potentialProfit: z.number().nullable().optional(),
        riskRewardRatio: z.number().nullable().optional(),
        trailingStop: z.object({
          active: z.boolean().nullable().optional(),
          price: z.number().nullable().optional(),
          trailPercent: z.number().nullable().optional(),
        }).nullable().optional(),
        signalReversal: z.object({
          shouldReverse: z.boolean().nullable().optional(),
          confidence: z.number().nullable().optional(),
        }).nullable().optional(),
      }),
    }),
  },
  async ({
    ticker,
    entryPrice,
    side,
    stopLossPct = 2,
    takeProfitPct = 4.5,
    positionSizeUsd,
  }: {
    ticker: string
    entryPrice: number
    side: 'LONG' | 'SHORT'
    stopLossPct?: number
    takeProfitPct?: number
    positionSizeUsd?: number
  }) => {
    if (!ticker || typeof ticker !== 'string' || ticker.trim().length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
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
          entryPrice: 0,
          side: 'LONG',
          riskManagement: {
            stopLossFixed: 0,
            stopLossFixedPct: 0,
            stopLossFlexible: 0,
            stopLossFlexiblePct: 0,
            takeProfit: 0,
            takeProfitPct: 0,
            potentialLoss: null,
            potentialProfit: null,
            riskRewardRatio: null,
          },
        },
      }
    }

    if (!entryPrice || entryPrice <= 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: 'Invalid entryPrice parameter',
                message: 'Entry price must be a positive number',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: {
          ticker: ticker.trim().toUpperCase(),
          entryPrice: 0,
          side,
          riskManagement: {
            stopLossFixed: 0,
            stopLossFixedPct: 0,
            stopLossFlexible: 0,
            stopLossFlexiblePct: 0,
            takeProfit: 0,
            takeProfitPct: 0,
            potentialLoss: null,
            potentialProfit: null,
            riskRewardRatio: null,
          },
        },
      }
    }

    try {
      const normalizedTicker = ticker.trim().toUpperCase()
      const positionSize = positionSizeUsd || 10000 // Default position size for calculation

      // Get current market data for enhanced risk management features
      const { marketDataMap } = await getMarketData([normalizedTicker])
      const assetData = marketDataMap.get(normalizedTicker)
      const currentPrice = assetData?.price || assetData?.data?.price || entryPrice
      const indicators = assetData?.indicators || assetData?.data?.indicators

      const riskManagement = formatRiskManagement(
        entryPrice,
        side,
        stopLossPct,
        takeProfitPct,
        positionSize,
        currentPrice,
        indicators
      )

      const result = {
        ticker: normalizedTicker,
        entryPrice,
        side,
        riskManagement,
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
                error: error instanceof Error ? error.message : String(error),
                message: 'Failed to calculate risk management',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: {
          ticker: ticker.trim().toUpperCase(),
          entryPrice,
          side,
          riskManagement: {
            stopLossFixed: 0,
            stopLossFixedPct: 0,
            stopLossFlexible: 0,
            stopLossFlexiblePct: 0,
            takeProfit: 0,
            takeProfitPct: 0,
            potentialLoss: null,
            potentialProfit: null,
            riskRewardRatio: null,
          },
        },
      }
    }
  }
)

  // Tool: calculate_position_setup
  server.registerTool(
  'calculate_position_setup',
  {
    title: 'Calculate Position Setup',
    description: 'Calculate position size, leverage, margin, and quantity for a trading signal',
    inputSchema: {
      ticker: z.string().describe('Asset ticker symbol (e.g., "BTC", "ETH", "SOL")'),
      entryPrice: z.number().positive().describe('Entry price for the position'),
      side: z.enum(['LONG', 'SHORT']).describe('Position side (LONG or SHORT)'),
      capital: z.number().positive().optional().describe('Total capital available (optional, defaults to config)'),
      riskPct: z.number().positive().optional().describe('Risk percentage per trade (optional, default: 0.9%)'),
      strategy: z.enum(['equal', 'confidence_weighted', 'ranking_weighted']).optional().describe('Position sizing strategy (optional, default: equal)'),
      confidence: z.number().min(0).max(100).optional().describe('Signal confidence (0-100, required for confidence_weighted strategy)'),
      ranking: z.number().positive().optional().describe('Asset ranking (required for ranking_weighted strategy)'),
    },
    outputSchema: z.object({
      ticker: z.string(),
      entryPrice: z.number(),
      side: z.string(),
      positionSetup: z.object({
        positionSizeUsd: z.number(),
        quantity: z.number(),
        leverage: z.number(),
        marginPercent: z.number(),
        marginUsed: z.number(),
        positionValue: z.number(),
        capital: z.number(),
        capitalAllocated: z.number(),
        capitalAllocatedPct: z.number(),
        riskPct: z.number(),
      }),
    }),
  },
  async ({
    ticker,
    entryPrice,
    side,
    capital,
    riskPct = 0.9,
    strategy = 'equal',
    confidence,
    ranking,
  }: {
    ticker: string
    entryPrice: number
    side: 'LONG' | 'SHORT'
    capital?: number
    riskPct?: number
    strategy?: 'equal' | 'confidence_weighted' | 'ranking_weighted'
    confidence?: number
    ranking?: number
  }) => {
    if (!ticker || typeof ticker !== 'string' || ticker.trim().length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
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
          entryPrice: 0,
          side: 'LONG',
          positionSetup: {
            positionSizeUsd: 0,
            quantity: 0,
            leverage: 1,
            marginPercent: 0,
            marginUsed: 0,
            positionValue: 0,
            capital: 0,
            capitalAllocated: 0,
            capitalAllocatedPct: 0,
            riskPct: 0,
          },
        },
      }
    }

    if (!entryPrice || entryPrice <= 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: 'Invalid entryPrice parameter',
                message: 'Entry price must be a positive number',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: {
          ticker: ticker.trim().toUpperCase(),
          entryPrice: 0,
          side,
          positionSetup: {
            positionSizeUsd: 0,
            quantity: 0,
            leverage: 1,
            marginPercent: 0,
            marginUsed: 0,
            positionValue: 0,
            capital: 0,
            capitalAllocated: 0,
            capitalAllocatedPct: 0,
            riskPct: 0,
          },
        },
      }
    }

    try {
      const normalizedTicker = ticker.trim().toUpperCase()

      // Get default capital from config or env
      const defaultCapital = capital || parseFloat(process.env.PAPER_CAPITAL || '10000')
      const totalCapital = capital || defaultCapital

      // Get market data for indicators and external data
      if (!process.env.CANDLES_COUNT || parseInt(process.env.CANDLES_COUNT) < 200) {
        process.env.CANDLES_COUNT = '200'
      }
      const { marketDataMap } = await getMarketData([normalizedTicker])
      const assetData = marketDataMap.get(normalizedTicker)

      if (!assetData) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  error: 'Asset not found',
                  message: `No market data available for ${normalizedTicker}`,
                },
                null,
                2
              ),
            },
          ],
          structuredContent: {
            ticker: normalizedTicker,
            entryPrice,
            side,
            positionSetup: {
              positionSizeUsd: 0,
              quantity: 0,
              leverage: 1,
              marginPercent: 0,
              marginUsed: 0,
              positionValue: 0,
              capital: totalCapital,
              capitalAllocated: 0,
              capitalAllocatedPct: 0,
              riskPct,
            },
          },
        }
      }

      const indicators = assetData.indicators || assetData.data?.indicators || {}
      const externalData = assetData.externalData || assetData.data?.externalData || {}
      const maxLeverage = assetData.maxLeverage || externalData?.hyperliquid?.maxLeverage || 10

      // Create a mock signal for position sizing calculation
      const mockSignal = {
        coin: normalizedTicker,
        signal: side === 'LONG' ? 'buy_to_enter' : 'sell_to_enter',
        confidence: confidence || 50,
        entry_price: entryPrice,
      } as any

      // Calculate position size (simplified - removed execution logic)
      const positionSizeUsd = totalCapital * 0.1 // Use 10% of capital

      // Calculate dynamic leverage
      const leverage = calculateDynamicLeverage(
        indicators,
        externalData,
        mockSignal,
        entryPrice,
        maxLeverage
      )

      // Calculate dynamic margin percentage
      const marginPercent = calculateDynamicMarginPercentage(
        indicators,
        externalData,
        mockSignal,
        entryPrice
      )

      const positionSetup = formatPositionSetup(
        normalizedTicker,
        entryPrice,
        side,
        positionSizeUsd,
        leverage,
        marginPercent,
        totalCapital,
        riskPct
      )

      const result = {
        ticker: normalizedTicker,
        entryPrice,
        side,
        positionSetup,
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
                error: error instanceof Error ? error.message : String(error),
                message: 'Failed to calculate position setup',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: {
          ticker: ticker.trim().toUpperCase(),
          entryPrice,
          side,
          positionSetup: {
            positionSizeUsd: 0,
            quantity: 0,
            leverage: 1,
            marginPercent: 0,
            marginUsed: 0,
            positionValue: 0,
            capital: capital || 10000,
            capitalAllocated: 0,
            capitalAllocatedPct: 0,
            riskPct,
          },
        },
      }
    }
  }
)
}
