/**
 * Stochastic RSI Indicator
 * Applies Stochastic oscillator to RSI values
 */

import { calculateRSI } from './momentum'

export interface StochasticRSIData {
  k: number | null
  d: number | null
  rsi: number | null
  signal: 'overbought' | 'oversold' | 'neutral' | null
}

export function calculateStochasticRSI(
  closes: number[],
  rsiPeriod: number = 14,
  stochPeriod: number = 14,
  kPeriod: number = 3
): StochasticRSIData {
  if (closes.length < rsiPeriod + stochPeriod + kPeriod) {
    return {
      k: null,
      d: null,
      rsi: null,
      signal: null,
    }
  }

  // Calculate RSI first
  const rsiValues = calculateRSI(closes, rsiPeriod)
  if (rsiValues.length === 0) {
    return {
      k: null,
      d: null,
      rsi: null,
      signal: null,
    }
  }

  const currentRSI = rsiValues[rsiValues.length - 1]

  // Apply Stochastic formula to RSI values
  const stochK: number[] = []

  // Calculate %K for each RSI value in the stochastic period
  for (let i = stochPeriod - 1; i < rsiValues.length; i++) {
    const rsiPeriodValues = rsiValues.slice(i - stochPeriod + 1, i + 1)
    const highestRSI = Math.max(...rsiPeriodValues)
    const lowestRSI = Math.min(...rsiPeriodValues)
    const currentPeriodRSI = rsiValues[i]

    if (highestRSI !== lowestRSI) {
      const k = ((currentPeriodRSI - lowestRSI) / (highestRSI - lowestRSI)) * 100
      stochK.push(k)
    } else {
      stochK.push(50) // Neutral when no range
    }
  }

  if (stochK.length === 0) {
    return {
      k: null,
      d: null,
      rsi: currentRSI,
      signal: null,
    }
  }

  const currentK = stochK[stochK.length - 1]

  // Calculate %D as SMA of %K
  let currentD: number | null = null
  if (stochK.length >= kPeriod) {
    const recentK = stochK.slice(-kPeriod)
    currentD = recentK.reduce((sum, k) => sum + k, 0) / kPeriod
  }

  // Determine signal
  let signal: 'overbought' | 'oversold' | 'neutral' | null = null
  if (currentK >= 80) signal = 'overbought'
  else if (currentK <= 20) signal = 'oversold'
  else signal = 'neutral'

  return {
    k: currentK,
    d: currentD,
    rsi: currentRSI,
    signal,
  }
}
