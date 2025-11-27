/**
 * Moving Average Envelope Indicator
 * Creates bands around a moving average for overbought/oversold signals
 */

export interface MAEnvelopeData {
  // Moving average value
  ma: number

  // Envelope bands
  upperBand: number
  lowerBand: number

  // Band percentage
  percentage: number

  // Current price position
  position: 'above_upper' | 'above_ma' | 'below_ma' | 'below_lower'

  // Signal based on envelope
  signal: 'overbought' | 'oversold' | 'neutral'

  // Distance from bands
  distanceFromUpper: number  // % distance from upper band
  distanceFromLower: number  // % distance from lower band

  // Band width
  bandWidth: number          // Width of the envelope band
}

/**
 * Calculate Moving Average Envelope
 * @param prices Array of prices
 * @param period MA period (default 20)
 * @param percentage Envelope percentage (default 2.5%)
 * @param maType Type of moving average ('sma' | 'ema', default 'sma')
 * @returns MAEnvelopeData object
 */
export function calculateMAEnvelope(
  prices: number[],
  period: number = 20,
  percentage: number = 2.5,
  maType: 'sma' | 'ema' = 'sma'
): MAEnvelopeData | null {
  if (prices.length < period) {
    return null
  }

  // Calculate moving average
  let ma: number

  if (maType === 'ema') {
    // Exponential Moving Average
    const multiplier = 2 / (period + 1)
    ma = prices[0]
    for (let i = 1; i < prices.length; i++) {
      ma = (prices[i] - ma) * multiplier + ma
    }
  } else {
    // Simple Moving Average
    const sum = prices.slice(-period).reduce((acc, price) => acc + price, 0)
    ma = sum / period
  }

  // Calculate envelope bands
  const bandOffset = ma * (percentage / 100)
  const upperBand = ma + bandOffset
  const lowerBand = ma - bandOffset

  // Get current price
  const currentPrice = prices[prices.length - 1]

  // Determine position
  let position: 'above_upper' | 'above_ma' | 'below_ma' | 'below_lower'
  if (currentPrice > upperBand) {
    position = 'above_upper'
  } else if (currentPrice > ma) {
    position = 'above_ma'
  } else if (currentPrice < ma) {
    position = 'below_ma'
  } else {
    position = 'below_lower'
  }

  // Generate signal
  let signal: 'overbought' | 'oversold' | 'neutral' = 'neutral'
  if (position === 'above_upper') {
    signal = 'overbought'
  } else if (position === 'below_lower') {
    signal = 'oversold'
  }

  // Calculate distances
  const distanceFromUpper = ((currentPrice - upperBand) / upperBand) * 100
  const distanceFromLower = ((lowerBand - currentPrice) / lowerBand) * 100

  // Calculate band width
  const bandWidth = ((upperBand - lowerBand) / ma) * 100

  return {
    ma,
    upperBand,
    lowerBand,
    percentage,
    position,
    signal,
    distanceFromUpper,
    distanceFromLower,
    bandWidth
  }
}

/**
 * Calculate Multiple MA Envelopes
 * @param prices Array of prices
 * @param periods Array of periods for different envelopes
 * @param percentage Envelope percentage
 * @returns Array of MAEnvelopeData objects
 */
export function calculateMultipleMAEnvelopes(
  prices: number[],
  periods: number[] = [10, 20, 50],
  percentage: number = 2.5
): MAEnvelopeData[] {
  return periods
    .map(period => calculateMAEnvelope(prices, period, percentage))
    .filter((envelope): envelope is MAEnvelopeData => envelope !== null)
}

/**
 * Get MA Envelope Signal Strength
 * @param envelope MAEnvelopeData object
 * @returns Signal strength (0-100)
 */
export function getMAEnvelopeSignalStrength(envelope: MAEnvelopeData): number {
  const { position, distanceFromUpper, distanceFromLower, percentage } = envelope

  if (position === 'above_upper') {
    // Overbought signal strength based on distance from upper band
    const maxDistance = percentage * 2 // Consider 2x the band percentage as max
    return Math.min(100, (distanceFromUpper / maxDistance) * 100)
  } else if (position === 'below_lower') {
    // Oversold signal strength based on distance from lower band
    const maxDistance = percentage * 2
    return Math.min(100, (distanceFromLower / maxDistance) * 100)
  }

  return 0 // Neutral
}
