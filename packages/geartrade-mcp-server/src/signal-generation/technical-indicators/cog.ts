/**
 * Center of Gravity Indicator
 * Uses physics concept to find the "center of gravity" of price action
 */

import { calculateWMA } from './wma'

export interface COGData {
  cog: number | null // Center of Gravity value
  signal: 'overbought' | 'oversold' | 'neutral' | null
  trend: 'bullish' | 'bearish' | 'neutral' | null
}

export function calculateCOG(
  closes: number[],
  period: number = 10
): COGData {
  if (closes.length < period) {
    return {
      cog: null,
      signal: null,
      trend: null,
    }
  }

  // Calculate WMA for each sub-period from 1 to period
  const wmaValues: number[] = []

  for (let i = 1; i <= period; i++) {
    const wma = calculateWMA(closes, i)
    if (wma.length > 0) {
      wmaValues.push(wma[wma.length - 1])
    } else {
      wmaValues.push(0)
    }
  }

  if (wmaValues.length !== period) {
    return {
      cog: null,
      signal: null,
      trend: null,
    }
  }

  // Calculate Center of Gravity: -∑(WMA(i) × i) / ∑WMA(i)
  let numerator = 0
  let denominator = 0

  for (let i = 0; i < period; i++) {
    const weight = i + 1 // i starts from 1 to period
    numerator += wmaValues[i] * weight
    denominator += wmaValues[i]
  }

  if (denominator === 0) {
    return {
      cog: null,
      signal: null,
      trend: null,
    }
  }

  const cog = -numerator / denominator

  // Determine signal (COG can be used as oscillator)
  let signal: 'overbought' | 'oversold' | 'neutral' | null = null
  const currentPrice = closes[closes.length - 1]

  // Compare COG with current price (simplified signal)
  const priceDiff = (currentPrice - Math.abs(cog)) / Math.abs(cog)

  if (priceDiff > 0.02) signal = 'overbought' // Price significantly above COG
  else if (priceDiff < -0.02) signal = 'oversold' // Price significantly below COG
  else signal = 'neutral'

  // Determine trend based on COG position relative to price
  let trend: 'bullish' | 'bearish' | 'neutral' | null = null
  if (currentPrice > Math.abs(cog)) trend = 'bullish'
  else if (currentPrice < Math.abs(cog)) trend = 'bearish'
  else trend = 'neutral'

  return {
    cog,
    signal,
    trend,
  }
}
