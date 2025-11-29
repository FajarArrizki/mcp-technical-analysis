/**
 * Merged Volatility Indicators Tool
 * Combines: bollinger_band_width, bollinger_percent_b, chaikin_volatility,
 * historical_volatility, mass_index, ulcer_index
 */

import { z } from 'zod'
import {
  calculateBBWidth,
  calculateBBPercentB,
  calculateChaikinVolatility,
  calculateHistoricalVolatility,
} from '../signal-generation/technical-indicators'
import { calculateMassIndex } from '../signal-generation/technical-indicators/mass-index'
import { calculateUlcerIndex } from '../signal-generation/technical-indicators/ulcer-index'

export const volatilityIndicatorsInputSchema = z.object({
  type: z.enum([
    'bollinger_band_width',
    'bollinger_percent_b',
    'chaikin_volatility',
    'historical_volatility',
    'mass_index',
    'ulcer_index'
  ]).describe('Type of volatility indicator to calculate'),
  // Price data
  closes: z.array(z.number()).min(5).describe('Array of closing prices'),
  highs: z.array(z.number()).optional().describe('Array of high prices'),
  lows: z.array(z.number()).optional().describe('Array of low prices'),
  // Common parameters
  period: z.number().int().min(2).max(200).default(20).describe('Period for calculation (default: 20)'),
  // Bollinger specific
  stdDev: z.number().min(0.5).max(5).optional().describe('Standard deviation multiplier for Bollinger (default: 2)'),
  // Mass Index specific
  emaPeriod: z.number().int().min(5).max(20).optional().describe('EMA period for Mass Index (default: 9)'),
  sumPeriod: z.number().int().min(10).max(50).optional().describe('Sum period for Mass Index (default: 25)'),
})

export type VolatilityIndicatorsInput = z.infer<typeof volatilityIndicatorsInputSchema>

export async function calculateVolatilityIndicators(input: VolatilityIndicatorsInput): Promise<any> {
  const {
    type, closes, highs, lows,
    period = 20,
    stdDev = 2,
    emaPeriod = 9, sumPeriod = 25
  } = input

  switch (type) {
    case 'bollinger_band_width': {
      const result = calculateBBWidth(closes, period, stdDev)
      if (!result) {
        throw new Error(`Insufficient data for Bollinger Band Width`)
      }
      return { type, ...result }
    }

    case 'bollinger_percent_b': {
      const result = calculateBBPercentB(closes, period, stdDev)
      if (!result) {
        throw new Error(`Insufficient data for Bollinger %B`)
      }
      return { type, ...result }
    }

    case 'chaikin_volatility': {
      if (!highs || !lows) {
        throw new Error('Highs and lows arrays are required for Chaikin Volatility')
      }
      const result = calculateChaikinVolatility(highs, lows, period)
      if (!result) {
        throw new Error(`Insufficient data for Chaikin Volatility`)
      }
      return { type, ...result }
    }

    case 'historical_volatility': {
      const result = calculateHistoricalVolatility(closes, period)
      if (!result) {
        throw new Error(`Insufficient data for Historical Volatility`)
      }
      return { type, ...result }
    }

    case 'mass_index': {
      if (!highs || !lows) {
        throw new Error('Highs and lows arrays are required for Mass Index')
      }
      const result = calculateMassIndex(highs, lows, emaPeriod, sumPeriod)
      if (!result) {
        throw new Error(`Insufficient data for Mass Index`)
      }
      return { type, ...result }
    }

    case 'ulcer_index': {
      const result = calculateUlcerIndex(closes, period)
      if (!result) {
        throw new Error(`Insufficient data for Ulcer Index`)
      }
      return { type, ...result }
    }

    default:
      throw new Error(`Unknown volatility indicator type: ${type}`)
  }
}

export function registerVolatilityIndicatorsTool(server: any) {
  server.registerTool(
    'volatility_indicators',
    {
      title: 'Volatility Indicators (Unified)',
      description: `Calculate various volatility indicators. Supported types:
- bollinger_band_width: BB Width - measures Bollinger Band expansion/contraction
- bollinger_percent_b: %B - price position within Bollinger Bands
- chaikin_volatility: Chaikin Volatility - rate of change of trading range
- historical_volatility: HV - annualized standard deviation of returns
- mass_index: Mass Index - identifies trend reversals through range expansion
- ulcer_index: Ulcer Index - measures downside volatility and drawdown risk`,
      inputSchema: volatilityIndicatorsInputSchema,
      outputSchema: z.object({
        type: z.string(),
      }).passthrough(),
    },
    async (input: VolatilityIndicatorsInput) => {
      try {
        const result = await calculateVolatilityIndicators(input)
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
        throw new Error(`Volatility Indicators calculation failed: ${error.message}`)
      }
    }
  )
}
