/**
 * Hull Moving Average (HMA) Indicator
 * Moving average designed to reduce lag while maintaining smoothness
 */

import { calculateWMA } from './wma'

export function calculateHMA(closes: number[], period: number = 16): number[] {
  if (closes.length < period || period < 2) return []

  const hma: number[] = []
  const halfPeriod = Math.floor(period / 2)
  const sqrtPeriod = Math.floor(Math.sqrt(period))

  // Need enough data for the longest WMA (period)
  const requiredLength = period + sqrtPeriod - 1
  if (closes.length < requiredLength) return []

  for (let i = requiredLength - 1; i < closes.length; i++) {
    // Step 1: Calculate WMA for half period, multiplied by 2
    const wmaHalf = calculateWMA(closes.slice(i - halfPeriod - sqrtPeriod + 1, i - sqrtPeriod + 1), halfPeriod)
    const wmaHalfValue = wmaHalf.length > 0 ? wmaHalf[wmaHalf.length - 1] * 2 : 0

    // Step 2: Calculate WMA for full period
    const wmaFull = calculateWMA(closes.slice(i - period - sqrtPeriod + 1, i - sqrtPeriod + 1), period)
    const wmaFullValue = wmaFull.length > 0 ? wmaFull[wmaFull.length - 1] : 0

    // Step 3: Calculate Raw HMA
    const rawHMA = wmaHalfValue - wmaFullValue

    // Step 4: Calculate final HMA using WMA of Raw HMA
    const rawHMAData = [rawHMA] // Start with current rawHMA

    // Build historical Raw HMA data for sqrtPeriod WMA calculation
    for (let j = 1; j < sqrtPeriod; j++) {
      const idx = i - j
      if (idx >= 0) {
        const prevWmaHalf = calculateWMA(closes.slice(idx - halfPeriod - sqrtPeriod + 1, idx - sqrtPeriod + 1), halfPeriod)
        const prevWmaHalfValue = prevWmaHalf.length > 0 ? prevWmaHalf[prevWmaHalf.length - 1] * 2 : 0

        const prevWmaFull = calculateWMA(closes.slice(idx - period - sqrtPeriod + 1, idx - sqrtPeriod + 1), period)
        const prevWmaFullValue = prevWmaFull.length > 0 ? prevWmaFull[prevWmaFull.length - 1] : 0

        rawHMAData.unshift(prevWmaHalfValue - prevWmaFullValue)
      }
    }

    // Calculate final HMA as WMA of Raw HMA data
    const finalHMA = calculateWMA(rawHMAData, sqrtPeriod)
    if (finalHMA.length > 0) {
      hma.push(finalHMA[finalHMA.length - 1])
    }
  }

  return hma
}
