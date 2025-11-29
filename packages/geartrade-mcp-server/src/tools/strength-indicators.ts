/**
 * Merged Strength Indicators Tool
 * Combines: bull_bear_power, force_index, center_of_gravity, balance_of_power, advance_decline_line
 */

import { z } from 'zod'
import {
  calculateBOP,
  calculateCOG,
  calculateForceIndex,
  calculateAdvanceDeclineLine,
} from '../signal-generation/technical-indicators'
import { calculateBullBearPower } from '../signal-generation/technical-indicators/bull-bear-power'

export const strengthIndicatorsInputSchema = z.object({
  type: z.enum([
    'bull_bear_power',
    'force_index',
    'center_of_gravity',
    'balance_of_power',
    'advance_decline_line'
  ]).describe('Type of strength indicator to calculate'),
  // Price data
  closes: z.array(z.number()).min(5).describe('Array of closing prices'),
  highs: z.array(z.number()).optional().describe('Array of high prices'),
  lows: z.array(z.number()).optional().describe('Array of low prices'),
  opens: z.array(z.number()).optional().describe('Array of open prices'),
  volumes: z.array(z.number()).optional().describe('Array of volume data'),
  // Common parameters
  period: z.number().int().min(2).max(200).default(13).describe('Period for calculation (default: 13)'),
  // Advance Decline specific
  advances: z.array(z.number()).optional().describe('Array of advancing issues (for A/D line)'),
  declines: z.array(z.number()).optional().describe('Array of declining issues (for A/D line)'),
})

export type StrengthIndicatorsInput = z.infer<typeof strengthIndicatorsInputSchema>

export async function calculateStrengthIndicators(input: StrengthIndicatorsInput): Promise<any> {
  const {
    type, closes, highs, lows, opens, volumes,
    period = 13,
    advances, declines
  } = input

  switch (type) {
    case 'bull_bear_power': {
      if (!highs || !lows) {
        throw new Error('Highs and lows arrays are required for Bull Bear Power')
      }
      const result = calculateBullBearPower(highs, lows, closes, volumes)
      if (!result) {
        throw new Error(`Insufficient data for Bull Bear Power`)
      }
      return { type, ...result }
    }

    case 'force_index': {
      if (!volumes) {
        throw new Error('Volumes array is required for Force Index')
      }
      const result = calculateForceIndex(closes, volumes, period)
      if (!result) {
        throw new Error(`Insufficient data for Force Index`)
      }
      return { type, ...result }
    }

    case 'center_of_gravity': {
      const result = calculateCOG(closes, period)
      if (!result) {
        throw new Error(`Insufficient data for Center of Gravity`)
      }
      return { type, ...result }
    }

    case 'balance_of_power': {
      if (!highs || !lows || !opens) {
        throw new Error('Highs, lows, and opens arrays are required for Balance of Power')
      }
      const result = calculateBOP(opens, highs, lows, closes)
      if (!result) {
        throw new Error(`Insufficient data for Balance of Power`)
      }
      return { type, ...result }
    }

    case 'advance_decline_line': {
      if (!advances || !declines) {
        throw new Error('Advances and declines arrays are required for Advance Decline Line')
      }
      const result = calculateAdvanceDeclineLine(advances, declines)
      if (!result) {
        throw new Error(`Insufficient data for Advance Decline Line`)
      }
      return { type, ...result }
    }

    default:
      throw new Error(`Unknown strength indicator type: ${type}`)
  }
}

export function registerStrengthIndicatorsTool(server: any) {
  server.registerTool(
    'strength_indicators',
    {
      title: 'Strength Indicators (Unified)',
      description: `Calculate various strength/power indicators. Supported types:
- bull_bear_power: Bull Bear Power - measures buying vs selling strength
- force_index: Force Index - combines price and volume for trend strength
- center_of_gravity: COG - identifies turning points using weighted prices
- balance_of_power: BOP - measures buyer vs seller control
- advance_decline_line: A/D Line - market breadth indicator`,
      inputSchema: strengthIndicatorsInputSchema,
      outputSchema: z.object({
        type: z.string(),
      }).passthrough(),
    },
    async (input: StrengthIndicatorsInput) => {
      try {
        const result = await calculateStrengthIndicators(input)
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
        throw new Error(`Strength Indicators calculation failed: ${error.message}`)
      }
    }
  )
}
