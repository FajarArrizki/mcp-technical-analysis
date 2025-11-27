/**
 * Awesome Oscillator Indicator
 * Momentum oscillator using difference between fast and slow SMA of median price
 */

import { calculateSMA } from './moving-averages'

export interface AwesomeOscillatorData {
  ao: number | null
  signal: 'bullish' | 'bearish' | 'neutral' | null
  histogram: 'green' | 'red' | 'zero' | null
}

export function calculateAwesomeOscillator(
  highs: number[],
  lows: number[],
  fastPeriod: number = 5,
  slowPeriod: number = 34
): AwesomeOscillatorData {
  if (highs.length < slowPeriod || lows.length < slowPeriod) {
    return {
      ao: null,
      signal: null,
      histogram: null,
    }
  }

  // Calculate median price (H+L)/2
  const medianPrices: number[] = []
  for (let i = 0; i < highs.length; i++) {
    medianPrices.push((highs[i] + lows[i]) / 2)
  }

  // Calculate fast and slow SMA of median prices
  const fastSMA = calculateSMA(medianPrices, fastPeriod)
  const slowSMA = calculateSMA(medianPrices, slowPeriod)

  if (fastSMA.length === 0 || slowSMA.length === 0) {
    return {
      ao: null,
      signal: null,
      histogram: null,
    }
  }

  // AO = Fast SMA - Slow SMA
  const currentFastSMA = fastSMA[fastSMA.length - 1]
  const currentSlowSMA = slowSMA[slowSMA.length - 1]
  const ao = currentFastSMA - currentSlowSMA

  // Determine histogram color (green when AO > 0, red when AO < 0)
  let histogram: 'green' | 'red' | 'zero' | null = null
  if (ao > 0) histogram = 'green'
  else if (ao < 0) histogram = 'red'
  else histogram = 'zero'

  // Determine signal based on AO movement (would need historical data for proper signal)
  // For now, use simple interpretation
  let signal: 'bullish' | 'bearish' | 'neutral' | null = null
  if (histogram === 'green') signal = 'bullish'
  else if (histogram === 'red') signal = 'bearish'
  else signal = 'neutral'

  return {
    ao,
    signal,
    histogram,
  }
}
