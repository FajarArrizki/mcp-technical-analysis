/**
 * Merged Channels Tool
 * Combines: keltner_channels, donchian_channels, price_channel
 */

import { z } from 'zod'
import {
  calculateKeltnerChannels,
  calculateDonchianChannels,
} from '../../signal-generation/technical-indicators'
import { calculatePriceChannel } from '../../signal-generation/technical-indicators/price-channel'

export const channelsInputSchema = z.object({
  type: z.enum([
    'keltner_channels',
    'donchian_channels',
    'price_channel'
  ]).describe('Type of channel indicator to calculate'),
  // Price data
  closes: z.array(z.number()).min(5).describe('Array of closing prices'),
  highs: z.array(z.number()).describe('Array of high prices'),
  lows: z.array(z.number()).describe('Array of low prices'),
  // Common parameters
  period: z.number().int().min(2).max(200).default(20).describe('Period for calculation (default: 20)'),
  // Keltner specific
  atrPeriod: z.number().int().min(5).max(50).optional().describe('ATR period for Keltner (default: 10)'),
  multiplier: z.number().min(0.5).max(5).optional().describe('ATR multiplier for Keltner (default: 2)'),
})

export type ChannelsInput = z.infer<typeof channelsInputSchema>

export async function calculateChannels(input: ChannelsInput): Promise<any> {
  const {
    type, closes, highs, lows,
    period = 20,
    atrPeriod = 10, multiplier = 2
  } = input

  switch (type) {
    case 'keltner_channels': {
      const result = calculateKeltnerChannels(highs, lows, closes, period, atrPeriod, multiplier)
      if (!result) {
        throw new Error(`Insufficient data for Keltner Channels`)
      }
      return { type, ...result }
    }

    case 'donchian_channels': {
      const result = calculateDonchianChannels(highs, lows, period)
      if (!result) {
        throw new Error(`Insufficient data for Donchian Channels`)
      }
      return { type, ...result }
    }

    case 'price_channel': {
      const result = calculatePriceChannel(highs, lows, closes, period)
      if (!result) {
        throw new Error(`Insufficient data for Price Channel`)
      }
      return { type, ...result }
    }

    default:
      throw new Error(`Unknown channel type: ${type}`)
  }
}

export function registerChannelsTool(server: any) {
  server.registerTool(
    'channels',
    {
      title: 'Channels (Unified)',
      description: `Calculate various channel indicators. Supported types:
- keltner_channels: Keltner Channels - EMA-based volatility bands using ATR
- donchian_channels: Donchian Channels - highest high and lowest low bands
- price_channel: Price Channel - similar to Donchian with middle line`,
      inputSchema: channelsInputSchema,
      outputSchema: z.object({
        type: z.string(),
      }).passthrough(),
    },
    async (input: ChannelsInput) => {
      try {
        const result = await calculateChannels(input)
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
        throw new Error(`Channels calculation failed: ${error.message}`)
      }
    }
  )
}
