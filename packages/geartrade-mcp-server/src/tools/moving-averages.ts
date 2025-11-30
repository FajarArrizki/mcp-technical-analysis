/**
 * Merged Moving Averages Tool
 * Combines: ma_envelope, vwma, mcginley_dynamic, rainbow_ma, kaufman_adaptive_ma,
 * hull_moving_average, weighted_moving_average, smoothed_moving_average,
 * double_exponential_moving_average, triple_exponential_moving_average
 */

import { z } from 'zod'
import { calculateMAEnvelope, MAEnvelopeData } from '../signal-generation/technical-indicators/ma-envelope.js'
import { calculateVWMA, VWMAData } from '../signal-generation/technical-indicators/vwma.js'
import { calculateMcGinleyDynamic, McGinleyDynamicData } from '../signal-generation/technical-indicators/mcginley-dynamic.js'
import { calculateRainbowMA, RainbowMAData } from '../signal-generation/technical-indicators/rainbow-ma.js'
import { calculateKaufmanAdaptiveMA, KaufmanAdaptiveMAData } from '../signal-generation/technical-indicators/kaufman-adaptive-ma.js'
import {
  calculateHMA,
  calculateWMA,
  calculateSMMA,
  calculateDEMA,
  calculateTEMA,
} from '../signal-generation/technical-indicators/index.js'

export const movingAveragesInputSchema = z.object({
  type: z.enum([
    'ma_envelope',
    'vwma',
    'mcginley_dynamic',
    'rainbow_ma',
    'kaufman_adaptive_ma',
    'hull_ma',
    'weighted_ma',
    'smoothed_ma',
    'double_ema',
    'triple_ema'
  ]).describe('Type of moving average to calculate'),
  prices: z.array(z.number()).min(5).describe('Array of closing prices'),
  volumes: z.array(z.number()).optional().describe('Array of volume data (required for vwma)'),
  period: z.number().int().min(2).max(200).default(20).describe('Period for calculation (default: 20)'),
  // MA Envelope specific
  percentage: z.number().min(0.1).max(20).optional().describe('Envelope percentage for ma_envelope (default: 2.5)'),
  maType: z.enum(['sma', 'ema']).optional().describe('MA type for ma_envelope (default: sma)'),
  // Rainbow MA specific
  periods: z.array(z.number()).optional().describe('Periods array for rainbow_ma (default: [2,3,4,5,6,7,8,9])'),
  // KAMA specific
  efficiencyPeriod: z.number().int().min(2).max(50).optional().describe('Efficiency period for KAMA (default: 10)'),
  fastPeriod: z.number().int().min(2).max(20).optional().describe('Fast period for KAMA (default: 2)'),
  slowPeriod: z.number().int().min(10).max(100).optional().describe('Slow period for KAMA (default: 30)'),
})

export type MovingAveragesInput = z.infer<typeof movingAveragesInputSchema>

export async function calculateMovingAverages(input: MovingAveragesInput): Promise<any> {
  const { type, prices, volumes, period = 20, percentage = 2.5, maType = 'sma', periods = [2, 3, 4, 5, 6, 7, 8, 9], efficiencyPeriod = 10, fastPeriod = 2, slowPeriod = 30 } = input

  switch (type) {
    case 'ma_envelope': {
      const result = calculateMAEnvelope(prices, period, percentage, maType as 'sma' | 'ema')
      if (!result) {
        throw new Error(`Insufficient data: need at least ${period} prices, got ${prices.length}`)
      }
      return { type, ...result }
    }

    case 'vwma': {
      if (!volumes || volumes.length === 0) {
        throw new Error('Volumes array is required for VWMA calculation')
      }
      if (prices.length !== volumes.length) {
        throw new Error('Prices and volumes arrays must have the same length')
      }
      const result = calculateVWMA(prices, volumes, period)
      if (!result) {
        throw new Error(`Insufficient data: need at least ${period} data points, got ${prices.length}`)
      }
      return { type, ...result }
    }

    case 'mcginley_dynamic': {
      const result = calculateMcGinleyDynamic(prices, period)
      if (!result) {
        throw new Error(`Insufficient data: need at least ${period} prices, got ${prices.length}`)
      }
      return { type, ...result }
    }

    case 'rainbow_ma': {
      const result = calculateRainbowMA(prices, periods)
      if (!result) {
        const maxPeriod = Math.max(...periods)
        throw new Error(`Insufficient data: need at least ${maxPeriod} prices, got ${prices.length}`)
      }
      return { type, ...result }
    }

    case 'kaufman_adaptive_ma': {
      const result = calculateKaufmanAdaptiveMA(prices, efficiencyPeriod, fastPeriod, slowPeriod)
      if (!result) {
        throw new Error(`Insufficient data: need at least ${slowPeriod + efficiencyPeriod} prices, got ${prices.length}`)
      }
      return { type, ...result }
    }

    case 'hull_ma': {
      const result = calculateHMA(prices, period)
      if (!result || result.length === 0) {
        throw new Error(`Insufficient data: need at least ${period} prices, got ${prices.length}`)
      }
      const hullValue = result[result.length - 1]
      return { type, hull: hullValue, values: result }
    }

    case 'weighted_ma': {
      const result = calculateWMA(prices, period)
      if (!result || result.length === 0) {
        throw new Error(`Insufficient data: need at least ${period} prices, got ${prices.length}`)
      }
      const wmaValue = result[result.length - 1]
      return { type, weighted: wmaValue, values: result }
    }

    case 'smoothed_ma': {
      const result = calculateSMMA(prices, period)
      if (!result || result.length === 0) {
        throw new Error(`Insufficient data: need at least ${period} prices, got ${prices.length}`)
      }
      const smmaValue = result[result.length - 1]
      return { type, smoothed: smmaValue, values: result }
    }

    case 'double_ema': {
      const result = calculateDEMA(prices, period)
      if (!result || result.length === 0) {
        throw new Error(`Insufficient data: need at least ${period} prices, got ${prices.length}`)
      }
      const demaValue = result[result.length - 1]
      return { type, double: demaValue, values: result }
    }

    case 'triple_ema': {
      const result = calculateTEMA(prices, period)
      if (!result || result.length === 0) {
        throw new Error(`Insufficient data: need at least ${period} prices, got ${prices.length}`)
      }
      const temaValue = result[result.length - 1]
      return { type, triple: temaValue, values: result }
    }

    default:
      throw new Error(`Unknown moving average type: ${type}`)
  }
}

export function registerMovingAveragesTool(server: any) {
  // MA Envelope
  server.registerTool(
    'ma_envelope',
    {
      title: 'Moving Average Envelope',
      description: 'Moving Average Envelope for volatility-based support/resistance and overbought/oversold signals',
      inputSchema: z.object({
        prices: z.array(z.number()).min(5).describe('Array of closing prices'),
        period: z.number().int().min(2).max(200).default(20).describe('Period for calculation (default: 20)'),
        percentage: z.number().min(0.1).max(20).default(2.5).describe('Envelope percentage (default: 2.5)'),
        maType: z.enum(['sma', 'ema']).default('sma').describe('MA type (default: sma)'),
      }),
      outputSchema: z.object({
        upper: z.number(),
        middle: z.number(),
        lower: z.number(),
      }).passthrough(),
    },
    async (input: { prices: number[], period?: number, percentage?: number, maType?: 'sma' | 'ema' }) => {
      try {
        const result = await calculateMovingAverages({ type: 'ma_envelope', ...input })
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
          structuredContent: result,
        }
      } catch (error: any) {
        throw new Error(`MA Envelope calculation failed: ${error.message}`)
      }
    }
  )

  // VWMA
  server.registerTool(
    'vwma',
    {
      title: 'Volume Weighted Moving Average',
      description: 'Volume Weighted Moving Average - gives more weight to periods with higher volume',
      inputSchema: z.object({
        prices: z.array(z.number()).min(5).describe('Array of closing prices'),
        volumes: z.array(z.number()).min(5).describe('Array of volume data (must match prices length)'),
        period: z.number().int().min(2).max(200).default(20).describe('Period for VWMA calculation (default: 20)'),
      }),
      outputSchema: z.object({
        vwma: z.number(),
      }).passthrough(),
    },
    async (input: { prices: number[], volumes: number[], period?: number }) => {
      try {
        const result = await calculateMovingAverages({ type: 'vwma', ...input })
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
          structuredContent: result,
        }
      } catch (error: any) {
        throw new Error(`VWMA calculation failed: ${error.message}`)
      }
    }
  )

  // McGinley Dynamic
  server.registerTool(
    'mcginley_dynamic',
    {
      title: 'McGinley Dynamic Moving Average',
      description: 'Adaptive moving average that adjusts to market volatility and reduces lag compared to traditional MAs',
      inputSchema: z.object({
        prices: z.array(z.number()).min(5).describe('Array of closing prices'),
        period: z.number().int().min(2).max(200).default(20).describe('Period for McGinley Dynamic calculation (default: 20)'),
      }),
      outputSchema: z.object({
        mcginley: z.number(),
      }).passthrough(),
    },
    async (input: { prices: number[], period?: number }) => {
      try {
        const result = await calculateMovingAverages({ type: 'mcginley_dynamic', ...input })
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
          structuredContent: result,
        }
      } catch (error: any) {
        throw new Error(`McGinley Dynamic calculation failed: ${error.message}`)
      }
    }
  )

  // Rainbow MA
  server.registerTool(
    'rainbow_ma',
    {
      title: 'Rainbow Moving Average',
      description: 'Multiple moving averages with different periods for comprehensive trend visualization and alignment analysis',
      inputSchema: z.object({
        prices: z.array(z.number()).min(5).describe('Array of closing prices'),
        periods: z.array(z.number()).min(2).max(10).default([2, 3, 4, 5, 6, 7, 8, 9]).describe('Periods for each MA in rainbow (default: [2,3,4,5,6,7,8,9])'),
      }),
      outputSchema: z.object({
        rainbow: z.array(z.number()),
      }).passthrough(),
    },
    async (input: { prices: number[], periods?: number[] }) => {
      try {
        const result = await calculateMovingAverages({ type: 'rainbow_ma', ...input })
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
          structuredContent: result,
        }
      } catch (error: any) {
        throw new Error(`Rainbow MA calculation failed: ${error.message}`)
      }
    }
  )

  // Kaufman Adaptive MA
  server.registerTool(
    'kaufman_adaptive_ma',
    {
      title: 'Kaufman Adaptive Moving Average',
      description: 'Adaptive moving average that adjusts smoothing based on market efficiency and volatility',
      inputSchema: z.object({
        prices: z.array(z.number()).min(5).describe('Array of closing prices'),
        efficiencyPeriod: z.number().int().min(2).max(50).default(10).describe('Period for efficiency ratio calculation (default: 10)'),
        fastPeriod: z.number().int().min(2).max(20).default(2).describe('Fast EMA period (default: 2)'),
        slowPeriod: z.number().int().min(10).max(100).default(30).describe('Slow EMA period (default: 30)'),
      }),
      outputSchema: z.object({
        kama: z.number(),
      }).passthrough(),
    },
    async (input: { prices: number[], efficiencyPeriod?: number, fastPeriod?: number, slowPeriod?: number }) => {
      try {
        const result = await calculateMovingAverages({ type: 'kaufman_adaptive_ma', ...input })
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
          structuredContent: result,
        }
      } catch (error: any) {
        throw new Error(`Kaufman Adaptive MA calculation failed: ${error.message}`)
      }
    }
  )

  // Hull MA
  server.registerTool(
    'hull_ma',
    {
      title: 'Hull Moving Average',
      description: 'Hull Moving Average - reduces lag while maintaining smoothness for better trend identification',
      inputSchema: z.object({
        prices: z.array(z.number()).min(5).describe('Array of price data'),
        period: z.number().int().min(2).max(200).default(16).describe('Period for HMA calculation (default: 16)'),
      }),
      outputSchema: z.object({
        hull: z.number(),
      }).passthrough(),
    },
    async (input: { prices: number[], period?: number }) => {
      try {
        const result = await calculateMovingAverages({ type: 'hull_ma', ...input })
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
          structuredContent: result,
        }
      } catch (error: any) {
        throw new Error(`Hull MA calculation failed: ${error.message}`)
      }
    }
  )

  // Weighted MA
  server.registerTool(
    'weighted_ma',
    {
      title: 'Weighted Moving Average',
      description: 'Weighted Moving Average - gives more weight to recent prices for responsive trend analysis',
      inputSchema: z.object({
        prices: z.array(z.number()).min(5).describe('Array of price data'),
        period: z.number().int().min(2).max(200).default(14).describe('Period for WMA calculation (default: 14)'),
      }),
      outputSchema: z.object({
        weighted: z.number(),
      }).passthrough(),
    },
    async (input: { prices: number[], period?: number }) => {
      try {
        const result = await calculateMovingAverages({ type: 'weighted_ma', ...input })
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
          structuredContent: result,
        }
      } catch (error: any) {
        throw new Error(`Weighted MA calculation failed: ${error.message}`)
      }
    }
  )

  // Smoothed MA
  server.registerTool(
    'smoothed_ma',
    {
      title: 'Smoothed Moving Average',
      description: 'Smoothed Moving Average - provides smooth trend following with reduced noise',
      inputSchema: z.object({
        prices: z.array(z.number()).min(5).describe('Array of price data'),
        period: z.number().int().min(2).max(200).default(14).describe('Period for SMMA calculation (default: 14)'),
      }),
      outputSchema: z.object({
        smoothed: z.number(),
      }).passthrough(),
    },
    async (input: { prices: number[], period?: number }) => {
      try {
        const result = await calculateMovingAverages({ type: 'smoothed_ma', ...input })
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
          structuredContent: result,
        }
      } catch (error: any) {
        throw new Error(`Smoothed MA calculation failed: ${error.message}`)
      }
    }
  )

  // Double EMA
  server.registerTool(
    'double_ema',
    {
      title: 'Double Exponential Moving Average',
      description: 'Double Exponential Moving Average - reduces lag compared to traditional EMA',
      inputSchema: z.object({
        prices: z.array(z.number()).min(5).describe('Array of price data'),
        period: z.number().int().min(2).max(200).default(20).describe('Period for DEMA calculation (default: 20)'),
      }),
      outputSchema: z.object({
        double: z.number(),
      }).passthrough(),
    },
    async (input: { prices: number[], period?: number }) => {
      try {
        const result = await calculateMovingAverages({ type: 'double_ema', ...input })
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
          structuredContent: result,
        }
      } catch (error: any) {
        throw new Error(`Double EMA calculation failed: ${error.message}`)
      }
    }
  )

  // Triple EMA
  server.registerTool(
    'triple_ema',
    {
      title: 'Triple Exponential Moving Average',
      description: 'Triple Exponential Moving Average - further reduces lag and provides smooth trend signals',
      inputSchema: z.object({
        prices: z.array(z.number()).min(5).describe('Array of price data'),
        period: z.number().int().min(2).max(200).default(14).describe('Period for TEMA calculation (default: 14)'),
      }),
      outputSchema: z.object({
        triple: z.number(),
      }).passthrough(),
    },
    async (input: { prices: number[], period?: number }) => {
      try {
        const result = await calculateMovingAverages({ type: 'triple_ema', ...input })
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
          structuredContent: result,
        }
      } catch (error: any) {
        throw new Error(`Triple EMA calculation failed: ${error.message}`)
      }
    }
  )
}
