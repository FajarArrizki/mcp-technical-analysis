/**
 * Merged Volume Indicators Tool
 * Combines: chaikin_money_flow, chaikin_oscillator, klinger_oscillator,
 * volume_oscillator, ease_of_movement, price_volume_trend,
 * positive_volume_index, volume_roc, anchored_vwap, volume_zone_oscillator
 */

import { z } from 'zod'
import {
  calculateChaikinOscillator,
  calculateKlingerOscillator,
  calculateMFI,
} from '../signal-generation/technical-indicators'
import { calculateChaikinMF } from '../signal-generation/technical-indicators/chaikin-mf'
import { calculateVolumeOscillator } from '../signal-generation/technical-indicators/volume-oscillator'
import { calculateEaseOfMovement } from '../signal-generation/technical-indicators/ease-of-movement'
import { calculatePriceVolumeTrend } from '../signal-generation/technical-indicators/price-volume-trend'
import { calculatePositiveVolumeIndex } from '../signal-generation/technical-indicators/positive-volume-index'
import { calculateVolumeROC } from '../signal-generation/technical-indicators/volume-roc'
import { calculateAnchoredVWAP } from '../signal-generation/technical-indicators/anchored-vwap'
import { calculateVolumeZoneOscillator } from '../signal-generation/technical-indicators/volume-zone-oscillator'

export const volumeIndicatorsInputSchema = z.object({
  type: z.enum([
    'chaikin_money_flow',
    'chaikin_oscillator',
    'klinger_oscillator',
    'volume_oscillator',
    'ease_of_movement',
    'price_volume_trend',
    'positive_volume_index',
    'volume_roc',
    'anchored_vwap',
    'volume_zone_oscillator',
    'money_flow_index'
  ]).describe('Type of volume indicator to calculate'),
  // Price data
  closes: z.array(z.number()).min(5).describe('Array of closing prices'),
  highs: z.array(z.number()).optional().describe('Array of high prices'),
  lows: z.array(z.number()).optional().describe('Array of low prices'),
  volumes: z.array(z.number()).describe('Array of volume data'),
  // Common parameters
  period: z.number().int().min(2).max(200).default(20).describe('Period for calculation (default: 20)'),
  // Oscillator specific
  fastPeriod: z.number().int().min(2).max(20).optional().describe('Fast period (default: 3)'),
  slowPeriod: z.number().int().min(5).max(50).optional().describe('Slow period (default: 10)'),
  // Anchored VWAP specific
  anchorIndex: z.number().int().min(0).optional().describe('Anchor index for VWAP (default: 0)'),
  // Volume Zone specific
  zonePeriod: z.number().int().min(5).max(50).optional().describe('Zone period (default: 14)'),
})

export type VolumeIndicatorsInput = z.infer<typeof volumeIndicatorsInputSchema>

export async function calculateVolumeIndicators(input: VolumeIndicatorsInput): Promise<any> {
  const {
    type, closes, highs, lows, volumes,
    period = 20,
    fastPeriod = 3, slowPeriod = 10,
    anchorIndex = 0, zonePeriod = 14
  } = input

  switch (type) {
    case 'chaikin_money_flow': {
      if (!highs || !lows) {
        throw new Error('Highs and lows arrays are required for Chaikin Money Flow')
      }
      const result = calculateChaikinMF(highs, lows, closes, volumes, period)
      if (!result) {
        throw new Error(`Insufficient data for Chaikin Money Flow`)
      }
      return { type, ...result }
    }

    case 'chaikin_oscillator': {
      if (!highs || !lows) {
        throw new Error('Highs and lows arrays are required for Chaikin Oscillator')
      }
      const result = calculateChaikinOscillator(highs, lows, closes, volumes, fastPeriod, slowPeriod)
      if (!result) {
        throw new Error(`Insufficient data for Chaikin Oscillator`)
      }
      return { type, ...result }
    }

    case 'klinger_oscillator': {
      if (!highs || !lows) {
        throw new Error('Highs and lows arrays are required for Klinger Oscillator')
      }
      const result = calculateKlingerOscillator(highs, lows, closes, volumes)
      if (!result) {
        throw new Error(`Insufficient data for Klinger Oscillator`)
      }
      return { type, ...result }
    }

    case 'volume_oscillator': {
      const result = calculateVolumeOscillator(volumes, fastPeriod, slowPeriod)
      if (!result) {
        throw new Error(`Insufficient data for Volume Oscillator`)
      }
      return { type, ...result }
    }

    case 'ease_of_movement': {
      if (!highs || !lows) {
        throw new Error('Highs and lows arrays are required for Ease of Movement')
      }
      const result = calculateEaseOfMovement(highs, lows, volumes, period)
      if (!result) {
        throw new Error(`Insufficient data for Ease of Movement`)
      }
      return { type, ...result }
    }

    case 'price_volume_trend': {
      const result = calculatePriceVolumeTrend(closes, volumes)
      if (!result) {
        throw new Error(`Insufficient data for Price Volume Trend`)
      }
      return { type, ...result }
    }

    case 'positive_volume_index': {
      const result = calculatePositiveVolumeIndex(closes, volumes)
      if (!result) {
        throw new Error(`Insufficient data for Positive Volume Index`)
      }
      return { type, ...result }
    }

    case 'volume_roc': {
      const result = calculateVolumeROC(volumes, period)
      if (!result) {
        throw new Error(`Insufficient data for Volume ROC`)
      }
      return { type, ...result }
    }

    case 'anchored_vwap': {
      if (!highs || !lows) {
        throw new Error('Highs and lows arrays are required for Anchored VWAP')
      }
      const result = calculateAnchoredVWAP(highs, lows, closes, volumes, anchorIndex)
      if (!result) {
        throw new Error(`Insufficient data for Anchored VWAP`)
      }
      return { type, ...result }
    }

    case 'volume_zone_oscillator': {
      const result = calculateVolumeZoneOscillator(closes, volumes, zonePeriod)
      if (!result) {
        throw new Error(`Insufficient data for Volume Zone Oscillator`)
      }
      return { type, ...result }
    }

    case 'money_flow_index': {
      if (!highs || !lows) {
        throw new Error('Highs and lows arrays are required for Money Flow Index')
      }
      const result = calculateMFI(highs, lows, closes, volumes, period)
      if (!result) {
        throw new Error(`Insufficient data for Money Flow Index`)
      }
      return { type, ...result }
    }

    default:
      throw new Error(`Unknown volume indicator type: ${type}`)
  }
}

export function registerVolumeIndicatorsTool(server: any) {
  server.registerTool(
    'volume_indicators',
    {
      title: 'Volume Indicators (Unified)',
      description: `Calculate various volume-based indicators. Supported types:
- chaikin_money_flow: CMF - volume-weighted accumulation/distribution
- chaikin_oscillator: Chaikin Oscillator - A/D line momentum
- klinger_oscillator: Klinger Volume Oscillator - volume-based trend
- volume_oscillator: Volume Oscillator - compares volume MAs
- ease_of_movement: EMV - price movement vs volume
- price_volume_trend: PVT - cumulative volume based on price change
- positive_volume_index: PVI - tracks price on increasing volume days
- volume_roc: Volume Rate of Change - volume momentum
- anchored_vwap: Anchored VWAP - VWAP from specific point
- volume_zone_oscillator: VZO - volume distribution analysis
- money_flow_index: MFI - volume-weighted RSI`,
      inputSchema: volumeIndicatorsInputSchema,
      outputSchema: z.object({
        type: z.string(),
      }).passthrough(),
    },
    async (input: VolumeIndicatorsInput) => {
      try {
        const result = await calculateVolumeIndicators(input)
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
        throw new Error(`Volume Indicators calculation failed: ${error.message}`)
      }
    }
  )
}
