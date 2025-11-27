/**
 * Standard Deviation Indicator
 * Measures the amount of variation or dispersion of a set of values
 */

export interface StdDevData {
  stdDev: number | null
  volatility: 'low' | 'normal' | 'high' | null
  mean: number | null
}

export function calculateStdDev(closes: number[], period: number = 20): StdDevData {
  if (closes.length < period) {
    return {
      stdDev: null,
      volatility: null,
      mean: null,
    }
  }

  // Get the most recent period data
  const recentData = closes.slice(-period)

  // Calculate mean
  const mean = recentData.reduce((sum, value) => sum + value, 0) / period

  // Calculate variance
  const variance = recentData.reduce((sum, value) => {
    return sum + Math.pow(value - mean, 2)
  }, 0) / period

  // Calculate standard deviation
  const stdDev = Math.sqrt(variance)

  // Determine volatility level
  let volatility: 'low' | 'normal' | 'high' | null = null
  const coefficientOfVariation = stdDev / Math.abs(mean)

  if (coefficientOfVariation < 0.02) volatility = 'low'
  else if (coefficientOfVariation > 0.05) volatility = 'high'
  else volatility = 'normal'

  return {
    stdDev,
    volatility,
    mean,
  }
}
