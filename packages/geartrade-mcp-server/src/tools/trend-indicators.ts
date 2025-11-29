/**
 * Merged Trend Indicators Tool
 * Combines: supertrend, alligator, ichimoku_cloud, vortex, linear_regression, r_squared
 */

import { z } from 'zod'
import {
  calculateSuperTrend,
  calculateAlligator,
  calculateIchimokuCloud,
  calculateVortex,
  calculateRSquared,
} from '../signal-generation/technical-indicators'
import { calculateLinearRegression } from '../signal-generation/technical-indicators/linear-regression'

export const trendIndicatorsInputSchema = z.object({
  type: z.enum([
    'supertrend',
    'alligator',
    'ichimoku_cloud',
    'vortex',
    'linear_regression',
    'r_squared'
  ]).describe('Type of trend indicator to calculate'),
  // Price data
  closes: z.array(z.number()).min(5).describe('Array of closing prices'),
  highs: z.array(z.number()).optional().describe('Array of high prices'),
  lows: z.array(z.number()).optional().describe('Array of low prices'),
  // Common parameters
  period: z.number().int().min(2).max(200).default(14).describe('Period for calculation (default: 14)'),
  // SuperTrend specific
  multiplier: z.number().min(0.5).max(10).optional().describe('ATR multiplier for SuperTrend (default: 3)'),
  // Alligator specific
  jawPeriod: z.number().int().min(5).max(30).optional().describe('Jaw period for Alligator (default: 13)'),
  teethPeriod: z.number().int().min(5).max(20).optional().describe('Teeth period for Alligator (default: 8)'),
  lipsPeriod: z.number().int().min(3).max(15).optional().describe('Lips period for Alligator (default: 5)'),
  jawOffset: z.number().int().min(5).max(15).optional().describe('Jaw offset for Alligator (default: 8)'),
  teethOffset: z.number().int().min(3).max(10).optional().describe('Teeth offset for Alligator (default: 5)'),
  lipsOffset: z.number().int().min(2).max(8).optional().describe('Lips offset for Alligator (default: 3)'),
  // Ichimoku specific
  tenkanPeriod: z.number().int().min(5).max(20).optional().describe('Tenkan period for Ichimoku (default: 9)'),
  kijunPeriod: z.number().int().min(15).max(40).optional().describe('Kijun period for Ichimoku (default: 26)'),
  senkouPeriod: z.number().int().min(30).max(80).optional().describe('Senkou period for Ichimoku (default: 52)'),
})

export type TrendIndicatorsInput = z.infer<typeof trendIndicatorsInputSchema>

export async function calculateTrendIndicators(input: TrendIndicatorsInput): Promise<any> {
  const {
    type, closes, highs, lows,
    period = 14,
    multiplier = 3,
    jawPeriod = 13, teethPeriod = 8, lipsPeriod = 5,
    jawOffset = 8, teethOffset = 5, lipsOffset = 3,
    tenkanPeriod = 9, kijunPeriod = 26, senkouPeriod = 52
  } = input

  switch (type) {
    case 'supertrend': {
      if (!highs || !lows) {
        throw new Error('Highs and lows arrays are required for SuperTrend')
      }
      const result = calculateSuperTrend(highs, lows, closes, period, multiplier)
      if (!result) {
        throw new Error(`Insufficient data for SuperTrend`)
      }
      return { type, ...result }
    }

    case 'alligator': {
      const result = calculateAlligator(closes, jawPeriod, teethPeriod, lipsPeriod, jawOffset, teethOffset, lipsOffset)
      if (!result || result.jaw === null) {
        throw new Error(`Insufficient data for Alligator`)
      }
      return { type, ...result }
    }

    case 'ichimoku_cloud': {
      if (!highs || !lows) {
        throw new Error('Highs and lows arrays are required for Ichimoku Cloud')
      }
      const result = calculateIchimokuCloud(highs, lows, closes, tenkanPeriod, kijunPeriod, senkouPeriod)
      if (!result) {
        throw new Error(`Insufficient data for Ichimoku Cloud`)
      }
      return { type, ...result }
    }

    case 'vortex': {
      if (!highs || !lows) {
        throw new Error('Highs and lows arrays are required for Vortex')
      }
      const result = calculateVortex(highs, lows, closes, period)
      if (!result) {
        throw new Error(`Insufficient data for Vortex`)
      }
      return { type, ...result }
    }

    case 'linear_regression': {
      const result = calculateLinearRegression(closes, period)
      if (!result) {
        throw new Error(`Insufficient data for Linear Regression`)
      }
      return { type, ...result }
    }

    case 'r_squared': {
      // R-squared needs two price series for correlation
      // Using closes as both for self-correlation (trending strength)
      const result = calculateRSquared(closes, closes, period)
      if (!result) {
        throw new Error(`Insufficient data for R-Squared`)
      }
      return { type, ...result }
    }

    default:
      throw new Error(`Unknown trend indicator type: ${type}`)
  }
}

export function registerTrendIndicatorsTool(server: any) {
  server.registerTool(
    'trend_indicators',
    {
      title: 'Trend Indicators (Unified)',
      description: `Calculate various trend indicators. Supported types:
- supertrend: SuperTrend - ATR-based trend following indicator
- alligator: Bill Williams Alligator - three smoothed MAs for trend
- ichimoku_cloud: Ichimoku Cloud - comprehensive trend system
- vortex: Vortex Indicator - identifies trend direction
- linear_regression: Linear Regression - statistical trend line
- r_squared: R-Squared - measures trend strength/reliability`,
      inputSchema: trendIndicatorsInputSchema,
      outputSchema: z.object({
        type: z.string(),
      }).passthrough(),
    },
    async (input: TrendIndicatorsInput) => {
      try {
        const result = await calculateTrendIndicators(input)
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
        throw new Error(`Trend Indicators calculation failed: ${error.message}`)
      }
    }
  )
}
