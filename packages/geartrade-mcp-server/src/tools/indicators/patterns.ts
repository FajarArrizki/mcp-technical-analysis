/**
 * Merged Patterns Tool
 * Combines: fractals, zigzag_indicator, trend_detection
 */

import { z } from 'zod'
import {
  calculateFractals,
  calculateZigZag,
} from '../../signal-generation/technical-indicators'
import { detectChangeOfCharacter } from '../../signal-generation/analysis/market-structure'

export const patternsInputSchema = z.object({
  type: z.enum([
    'fractals',
    'zigzag',
    'change_of_character'
  ]).describe('Type of pattern indicator to calculate'),
  // Price data
  closes: z.array(z.number()).min(5).describe('Array of closing prices'),
  highs: z.array(z.number()).describe('Array of high prices'),
  lows: z.array(z.number()).describe('Array of low prices'),
  // ZigZag specific
  deviation: z.number().min(0.1).max(20).optional().describe('Minimum deviation percentage for ZigZag (default: 5)'),
  // Change of Character specific
  lookback: z.number().int().min(10).max(200).optional().describe('Lookback period for COC (default: 50)'),
})

export type PatternsInput = z.infer<typeof patternsInputSchema>

export async function calculatePatterns(input: PatternsInput): Promise<any> {
  const {
    type, closes, highs, lows,
    deviation = 5,
    lookback = 50
  } = input

  switch (type) {
    case 'fractals': {
      const result = calculateFractals(highs, lows)
      if (!result) {
        throw new Error(`Insufficient data for Fractals`)
      }
      return { type, ...result }
    }

    case 'zigzag': {
      const result = calculateZigZag(closes, deviation)
      if (!result) {
        throw new Error(`Insufficient data for ZigZag`)
      }
      return { type, ...result }
    }

    case 'change_of_character': {
      const historicalData = closes.map((close, i) => ({
        time: Date.now() - (closes.length - i) * 60000,
        open: closes[i > 0 ? i - 1 : 0],
        high: highs[i],
        low: lows[i],
        close: close,
        volume: 0
      }))
      const result = detectChangeOfCharacter(historicalData, closes[closes.length - 1])
      if (!result) {
        throw new Error(`Insufficient data for Change of Character`)
      }
      return { type, ...result }
    }

    default:
      throw new Error(`Unknown pattern type: ${type}`)
  }
}

export function registerPatternsTool(server: any) {
  server.registerTool(
    'patterns',
    {
      title: 'Patterns (Unified)',
      description: `Calculate various pattern recognition indicators. Supported types:
- fractals: Bill Williams Fractals - identifies swing highs and lows
- zigzag: ZigZag Indicator - filters noise to show significant moves
- change_of_character: COC - detects market structure changes`,
      inputSchema: patternsInputSchema,
      outputSchema: z.object({
        type: z.string(),
      }).passthrough(),
    },
    async (input: PatternsInput) => {
      try {
        const result = await calculatePatterns(input)
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
        throw new Error(`Patterns calculation failed: ${error.message}`)
      }
    }
  )
}
