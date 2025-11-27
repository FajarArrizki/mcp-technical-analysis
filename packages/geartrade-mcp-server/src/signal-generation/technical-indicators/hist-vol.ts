/**
 * Historical Volatility Indicator
 * Measures the standard deviation of price returns over a period
 */

export interface HistoricalVolatilityData {
  volatility: number | null // Volatility as percentage
  annualizedVolatility: number | null // Annualized volatility (assuming 365 trading days)
  volatilityLevel: 'low' | 'normal' | 'high' | 'extreme' | null
}

export function calculateHistoricalVolatility(
  closes: number[],
  period: number = 20,
  annualizationFactor: number = 365 // Assuming daily data, annualize to yearly
): HistoricalVolatilityData {
  if (closes.length < period + 1) {
    return {
      volatility: null,
      annualizedVolatility: null,
      volatilityLevel: null,
    }
  }

  // Calculate logarithmic returns: ln(close_t / close_t-1)
  const returns: number[] = []

  for (let i = 1; i < closes.length; i++) {
    const returnValue = Math.log(closes[i] / closes[i - 1])
    // Avoid infinite values from zero prices
    if (isFinite(returnValue)) {
      returns.push(returnValue)
    }
  }

  if (returns.length < period) {
    return {
      volatility: null,
      annualizedVolatility: null,
      volatilityLevel: null,
    }
  }

  // Use the most recent 'period' returns
  const recentReturns = returns.slice(-period)

  // Calculate mean of returns
  const meanReturn = recentReturns.reduce((sum, ret) => sum + ret, 0) / period

  // Calculate variance
  const variance = recentReturns.reduce((sum, ret) => {
    return sum + Math.pow(ret - meanReturn, 2)
  }, 0) / period

  // Calculate standard deviation (volatility)
  const volatility = Math.sqrt(variance)

  // Convert to percentage
  const volatilityPercent = volatility * 100

  // Annualize volatility (assuming daily data)
  const annualizedVolatility = volatilityPercent * Math.sqrt(annualizationFactor)

  // Determine volatility level
  let volatilityLevel: 'low' | 'normal' | 'high' | 'extreme' | null = null

  if (annualizedVolatility < 15) volatilityLevel = 'low'
  else if (annualizedVolatility < 25) volatilityLevel = 'normal'
  else if (annualizedVolatility < 40) volatilityLevel = 'high'
  else volatilityLevel = 'extreme'

  return {
    volatility: volatilityPercent,
    annualizedVolatility,
    volatilityLevel,
  }
}
