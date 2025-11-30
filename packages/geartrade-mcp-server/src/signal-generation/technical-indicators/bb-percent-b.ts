/**
 * Bollinger %B Indicator
 * Shows where price is relative to Bollinger Bands
 */

import { calculateSMA } from './moving-averages'

export interface BBPercentBData {
  percentB: number | null
  position: 'below_lower' | 'near_lower' | 'middle' | 'near_upper' | 'above_upper' | null
  signal: 'oversold' | 'neutral' | 'overbought' | null
}

export function calculateBBPercentB(
  closes: number[],
  period: number = 20,
  stdDev: number = 2
): BBPercentBData {
  // Minimum 5 data points required
  if (closes.length < 5) {
    return {
      percentB: null,
      position: null,
      signal: null,
    }
  }
  
  // Use adaptive period
  const effectivePeriod = Math.min(period, closes.length)

  const currentPrice = closes[closes.length - 1]

  // Calculate SMA for middle band
  const sma = calculateSMA(closes, effectivePeriod)
  let middleBand: number
  
  if (sma.length === 0) {
    // Fallback: use simple average
    middleBand = closes.slice(-effectivePeriod).reduce((a, b) => a + b, 0) / effectivePeriod
  } else {
    middleBand = sma[sma.length - 1]
  }

  // Calculate standard deviation
  const recentData = closes.slice(-effectivePeriod)
  const variance = recentData.reduce((sum, value) => {
    return sum + Math.pow(value - middleBand, 2)
  }, 0) / effectivePeriod

  const standardDeviation = Math.sqrt(variance)

  // Calculate bands
  const upperBand = middleBand + (standardDeviation * stdDev)
  const lowerBand = middleBand - (standardDeviation * stdDev)

  // Calculate %B
  const bandWidth = upperBand - lowerBand
  const percentB = bandWidth !== 0 ? (currentPrice - lowerBand) / bandWidth : 0.5

  // Determine position
  let position: 'below_lower' | 'near_lower' | 'middle' | 'near_upper' | 'above_upper' | null = null
  if (percentB < 0) position = 'below_lower'
  else if (percentB < 0.2) position = 'near_lower'
  else if (percentB < 0.8) position = 'middle'
  else if (percentB < 1.0) position = 'near_upper'
  else position = 'above_upper'

  // Determine signal
  let signal: 'oversold' | 'neutral' | 'overbought' | null = null
  if (percentB < 0.1) signal = 'oversold'
  else if (percentB > 0.9) signal = 'overbought'
  else signal = 'neutral'

  return {
    percentB,
    position,
    signal,
  }
}
