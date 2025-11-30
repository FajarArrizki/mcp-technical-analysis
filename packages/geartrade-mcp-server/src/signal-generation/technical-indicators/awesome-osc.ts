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
  // Minimum 3 data points required for basic calculation
  if (highs.length < 3 || lows.length < 3) {
    return {
      ao: null,
      signal: null,
      histogram: null,
    }
  }
  
  // Use adaptive periods if not enough data
  const effectiveSlowPeriod = Math.min(slowPeriod, Math.max(3, highs.length - 1))
  const effectiveFastPeriod = Math.min(fastPeriod, Math.max(2, Math.floor(effectiveSlowPeriod / 2)))

  // Calculate median price (H+L)/2
  const medianPrices: number[] = []
  for (let i = 0; i < highs.length; i++) {
    medianPrices.push((highs[i] + lows[i]) / 2)
  }

  // Calculate fast and slow SMA of median prices using effective periods
  const fastSMA = calculateSMA(medianPrices, effectiveFastPeriod)
  const slowSMA = calculateSMA(medianPrices, effectiveSlowPeriod)

  // Fallback: if SMA calculation fails, use simple averages
  let ao: number
  if (fastSMA.length === 0 || slowSMA.length === 0) {
    // Simple fallback: average of recent vs older median prices
    const recentMedian = medianPrices.slice(-Math.min(3, medianPrices.length))
    const olderMedian = medianPrices.slice(0, Math.max(1, medianPrices.length - 3))
    const recentAvg = recentMedian.reduce((a, b) => a + b, 0) / recentMedian.length
    const olderAvg = olderMedian.reduce((a, b) => a + b, 0) / olderMedian.length
    ao = recentAvg - olderAvg
  } else {
    // AO = Fast SMA - Slow SMA
    const currentFastSMA = fastSMA[fastSMA.length - 1]
    const currentSlowSMA = slowSMA[slowSMA.length - 1]
    ao = currentFastSMA - currentSlowSMA
  }

  // Determine histogram color (green when AO > 0, red when AO < 0)
  let histogram: 'green' | 'red' | 'zero'
  if (ao > 0) histogram = 'green'
  else if (ao < 0) histogram = 'red'
  else histogram = 'zero'

  // Determine signal based on AO movement
  let signal: 'bullish' | 'bearish' | 'neutral'
  if (histogram === 'green') signal = 'bullish'
  else if (histogram === 'red') signal = 'bearish'
  else signal = 'neutral'

  return {
    ao,
    signal,
    histogram,
  }
}
