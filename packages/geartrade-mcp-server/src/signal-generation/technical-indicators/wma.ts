/**
 * Weighted Moving Average (WMA) Indicator
 * Moving average with different weights for each period
 */

export function calculateWMA(closes: number[], period: number = 14): number[] {
  if (closes.length < period) return []

  const wma: number[] = []

  for (let i = period - 1; i < closes.length; i++) {
    let weightedSum = 0
    let weightSum = 0

    // Calculate weighted sum: (P1*1 + P2*2 + ... + Pn*n)
    for (let j = 0; j < period; j++) {
      const weight = j + 1 // Weight starts from 1, increases to period
      const price = closes[i - j] // Most recent price has highest weight
      weightedSum += price * weight
      weightSum += weight
    }

    wma.push(weightedSum / weightSum)
  }

  return wma
}
