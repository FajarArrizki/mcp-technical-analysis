/**
 * Merged Pivot Points Tool
 * Combines: pivot_camarilla, standard_pivot_points, fibonacci_retracement
 */

import { z } from 'zod'
import { calculateCamarillaPivots } from '../signal-generation/technical-indicators/pivot-camarilla'
import { calculatePivotPoints } from '../signal-generation/technical-indicators/pivot-standard'
import { calculateFibonacciRetracement } from '../signal-generation/technical-indicators/fibonacci'

export const pivotPointsInputSchema = z.object({
  type: z.enum([
    'camarilla',
    'standard',
    'fibonacci_retracement'
  ]).describe('Type of pivot points to calculate'),
  // For standard/camarilla pivots
  high: z.number().optional().describe('High price (for standard/camarilla)'),
  low: z.number().optional().describe('Low price (for standard/camarilla)'),
  close: z.number().optional().describe('Close price (for standard/camarilla)'),
  // For fibonacci retracement
  closes: z.array(z.number()).optional().describe('Array of closing prices (for fibonacci)'),
  lookbackPeriod: z.number().int().min(5).max(200).optional().describe('Lookback period for Fibonacci (default: 50)'),
})

export type PivotPointsInput = z.infer<typeof pivotPointsInputSchema>

export async function calculatePivotPointsUnified(input: PivotPointsInput): Promise<any> {
  const {
    type, high, low, close, closes,
    lookbackPeriod = 50
  } = input

  switch (type) {
    case 'camarilla': {
      if (high === undefined || low === undefined || close === undefined) {
        throw new Error('High, low, and close prices are required for Camarilla Pivots')
      }
      const result = calculateCamarillaPivots(high, low, close)
      if (!result) {
        throw new Error(`Failed to calculate Camarilla Pivots`)
      }
      return { type, ...result }
    }

    case 'standard': {
      if (high === undefined || low === undefined || close === undefined) {
        throw new Error('High, low, and close prices are required for Standard Pivots')
      }
      const result = calculatePivotPoints(high, low, close)
      if (!result) {
        throw new Error(`Failed to calculate Standard Pivots`)
      }
      return { type, ...result }
    }

    case 'fibonacci_retracement': {
      if (!closes || closes.length < 10) {
        throw new Error('Closes array with at least 10 values is required for Fibonacci Retracement')
      }
      const result = calculateFibonacciRetracement(closes, lookbackPeriod)
      if (!result) {
        throw new Error(`Insufficient data for Fibonacci Retracement`)
      }
      return { type, ...result }
    }

    default:
      throw new Error(`Unknown pivot points type: ${type}`)
  }
}

export function registerPivotPointsTool(server: any) {
  server.registerTool(
    'pivot_points',
    {
      title: 'Pivot Points (Unified)',
      description: `Calculate various pivot point levels. Supported types:
- camarilla: Camarilla Pivots - intraday support/resistance levels (requires high, low, close)
- standard: Standard Pivot Points - classic floor trader pivots (requires high, low, close)
- fibonacci_retracement: Fibonacci Retracement - key retracement levels (requires closes array)`,
      inputSchema: pivotPointsInputSchema,
      outputSchema: z.object({
        type: z.string(),
      }).passthrough(),
    },
    async (input: PivotPointsInput) => {
      try {
        const result = await calculatePivotPointsUnified(input)
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
        throw new Error(`Pivot Points calculation failed: ${error.message}`)
      }
    }
  )
}
