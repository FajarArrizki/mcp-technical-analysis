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
  // Minimum 5 data points required
  if (closes.length < 5) {
    return {
      k: null,
      d: null,
      rsi: null,
      signal: null,
    }
  }
  
  // Adjust periods if not enough data - use adaptive periods
  const effectiveRsiPeriod = Math.min(rsiPeriod, Math.max(3, Math.floor(closes.length / 2)))
  const effectiveStochPeriod = Math.min(stochPeriod, Math.max(3, Math.floor(closes.length / 2)))
  const effectiveKPeriod = Math.min(kPeriod, 3)

  // Calculate RSI first
  const rsiValues = calculateRSI(closes, effectiveRsiPeriod)
  if (rsiValues.length === 0) {
    // Fallback: calculate simple RSI manually
    const changes = closes.slice(1).map((c, i) => c - closes[i])
    const gains = changes.filter(c => c > 0)
    const losses = changes.filter(c => c < 0).map(c => Math.abs(c))
    const avgGain = gains.length > 0 ? gains.reduce((a, b) => a + b, 0) / gains.length : 0
    const avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / losses.length : 0.001
    const rs = avgGain / avgLoss
    const fallbackRSI = 100 - (100 / (1 + rs))
    
    return {
      k: 50,
      d: 50,
      rsi: fallbackRSI,
      signal: 'neutral',
    }
  }

  const currentRSI = rsiValues[rsiValues.length - 1]

  // Apply Stochastic formula to RSI values
  const stochK: number[] = []
  const useStochPeriod = Math.min(effectiveStochPeriod, rsiValues.length)

  // Calculate %K for each RSI value in the stochastic period
  for (let i = useStochPeriod - 1; i < rsiValues.length; i++) {
    const rsiPeriodValues = rsiValues.slice(Math.max(0, i - useStochPeriod + 1), i + 1)
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
      k: 50,
      d: 50,
      rsi: currentRSI,
      signal: 'neutral',
    }
  }

  const currentK = stochK[stochK.length - 1]

  // Calculate %D as SMA of %K
  let currentD: number | null = null
  const useKPeriod = Math.min(effectiveKPeriod, stochK.length)
  if (stochK.length >= useKPeriod) {
    const recentK = stochK.slice(-useKPeriod)
    currentD = recentK.reduce((sum, k) => sum + k, 0) / useKPeriod
  } else {
    currentD = currentK // Use current K if not enough data
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
