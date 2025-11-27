/**
 * Double Exponential Moving Average (DEMA) Indicator
 * Moving average designed to reduce lag
 */

import { calculateEMA } from './moving-averages'

export function calculateDEMA(closes: number[], period: number = 20): number[] {
  if (closes.length < period * 2) return []

  const dema: number[] = []

  // Calculate EMA(n)
  const ema1 = calculateEMA(closes, period)

  // Calculate EMA(EMA(n))
  const ema2 = calculateEMA(ema1, period)

  // DEMA = 2 × EMA(n) - EMA(EMA(n))
  for (let i = 0; i < ema2.length; i++) {
    const demaValue = 2 * ema1[i + period - 1] - ema2[i]
    dema.push(demaValue)
  }

  return dema
}
