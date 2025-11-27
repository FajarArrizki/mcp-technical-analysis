/**
 * Donchian Channels Indicator
 * Channels based on highest high and lowest low over a period
 */

export interface DonchianChannel {
  upper: number | null
  middle: number | null
  lower: number | null
  position: 'above' | 'below' | 'inside' | null // Current price position vs channel
}

export function calculateDonchianChannels(
  highs: number[],
  lows: number[],
  period: number = 20
): DonchianChannel {
  if (highs.length < period || lows.length < period) {
    return {
      upper: null,
      middle: null,
      lower: null,
      position: null,
    }
  }

  // Calculate the most recent channel
  const recentHighs = highs.slice(-period)
  const recentLows = lows.slice(-period)

  const upper = Math.max(...recentHighs)
  const lower = Math.min(...recentLows)
  const middle = (upper + lower) / 2

  return {
    upper,
    middle,
    lower,
    position: null, // Will be set by caller with current price
  }
}
