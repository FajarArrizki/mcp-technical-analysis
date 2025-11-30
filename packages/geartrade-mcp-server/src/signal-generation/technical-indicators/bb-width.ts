/**
 * Bollinger Bands Width Indicator
 * Measures the width between Bollinger Bands upper and lower bands
 */

import { calculateSMA } from './moving-averages'

export interface BBWidthData {
  width: number | null
  squeeze: 'extreme' | 'tight' | 'normal' | 'wide' | null
  trend: 'expanding' | 'contracting' | 'stable' | null
}

export function calculateBBWidth(
  closes: number[],
  period: number = 20,
  stdDev: number = 2
): BBWidthData {
  // Minimum 5 data points required
  if (closes.length < 5) {
    return {
      width: null,
      squeeze: null,
      trend: null,
    }
  }
  
  // Use adaptive period
  const effectivePeriod = Math.min(period, closes.length)

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

  // Calculate width
  const width = (upperBand - lowerBand) / middleBand

  // Determine squeeze level
  let squeeze: 'extreme' | 'tight' | 'normal' | 'wide' | null = null
  if (width < 0.02) squeeze = 'extreme' // Very tight bands
  else if (width < 0.05) squeeze = 'tight' // Tight bands
  else if (width > 0.15) squeeze = 'wide' // Wide bands
  else squeeze = 'normal'

  // Determine trend (simplified - would need historical data for proper trend)
  let trend: 'expanding' | 'contracting' | 'stable' | null = null
  if (closes.length >= effectivePeriod * 2) {
    // Compare with previous period
    const prevData = closes.slice(-(effectivePeriod * 2), -effectivePeriod)
    const prevSMA = calculateSMA(prevData, effectivePeriod)
    const prevMiddle = prevSMA.length > 0 ? prevSMA[prevSMA.length - 1] : prevData.reduce((a, b) => a + b, 0) / prevData.length
    if (prevMiddle) {
      const prevVariance = prevData.reduce((sum, value) => {
        return sum + Math.pow(value - prevMiddle, 2)
      }, 0) / effectivePeriod
      const prevStdDev = Math.sqrt(prevVariance)
      const prevUpper = prevMiddle + (prevStdDev * stdDev)
      const prevLower = prevMiddle - (prevStdDev * stdDev)
      const prevWidth = (prevUpper - prevLower) / prevMiddle

      if (width > prevWidth * 1.1) trend = 'expanding'
      else if (width < prevWidth * 0.9) trend = 'contracting'
      else trend = 'stable'
    }
  }

  return {
    width,
    squeeze,
    trend,
  }
}
