/**
 * Hull Moving Average (HMA) Indicator
 * Moving average designed to reduce lag while maintaining smoothness
 */

import { calculateWMA } from './wma'

export function calculateHMA(closes: number[], period: number = 16): number[] {
  if (closes.length < 3 || period < 2) return []

  // Use adaptive period if data is insufficient
  const effectivePeriod = Math.min(period, Math.max(2, closes.length - 1))
  const halfPeriod = Math.max(1, Math.floor(effectivePeriod / 2))
  const sqrtPeriod = Math.max(1, Math.floor(Math.sqrt(effectivePeriod)))

  const hma: number[] = []

  // If we have very limited data, use simplified calculation
  if (closes.length < effectivePeriod + sqrtPeriod) {
    // Simplified HMA: use weighted average of recent prices
    const recentPrices = closes.slice(-Math.min(closes.length, effectivePeriod))
    const wma = calculateWMA(recentPrices, Math.min(recentPrices.length, effectivePeriod))
    if (wma.length > 0) {
      return [wma[wma.length - 1]]
    }
    // Ultimate fallback: return last close
    return [closes[closes.length - 1]]
  }

  // Standard HMA calculation
  const requiredLength = effectivePeriod + sqrtPeriod - 1
  const startIdx = Math.max(0, requiredLength - 1)

  for (let i = startIdx; i < closes.length; i++) {
    // Step 1: Calculate WMA for half period, multiplied by 2
    const halfStart = Math.max(0, i - halfPeriod - sqrtPeriod + 1)
    const halfEnd = Math.max(halfStart + 1, i - sqrtPeriod + 1)
    const wmaHalf = calculateWMA(closes.slice(halfStart, halfEnd), Math.min(halfPeriod, halfEnd - halfStart))
    const wmaHalfValue = wmaHalf.length > 0 ? wmaHalf[wmaHalf.length - 1] * 2 : closes[i] * 2

    // Step 2: Calculate WMA for full period
    const fullStart = Math.max(0, i - effectivePeriod - sqrtPeriod + 1)
    const fullEnd = Math.max(fullStart + 1, i - sqrtPeriod + 1)
    const wmaFull = calculateWMA(closes.slice(fullStart, fullEnd), Math.min(effectivePeriod, fullEnd - fullStart))
    const wmaFullValue = wmaFull.length > 0 ? wmaFull[wmaFull.length - 1] : closes[i]

    // Step 3: Calculate Raw HMA
    const rawHMA = wmaHalfValue - wmaFullValue

    // Step 4: Calculate final HMA using WMA of Raw HMA
    const rawHMAData = [rawHMA]

    // Build historical Raw HMA data for sqrtPeriod WMA calculation
    for (let j = 1; j < sqrtPeriod; j++) {
      const idx = i - j
      if (idx >= 0) {
        const prevHalfStart = Math.max(0, idx - halfPeriod - sqrtPeriod + 1)
        const prevHalfEnd = Math.max(prevHalfStart + 1, idx - sqrtPeriod + 1)
        const prevWmaHalf = calculateWMA(closes.slice(prevHalfStart, prevHalfEnd), Math.min(halfPeriod, prevHalfEnd - prevHalfStart))
        const prevWmaHalfValue = prevWmaHalf.length > 0 ? prevWmaHalf[prevWmaHalf.length - 1] * 2 : closes[idx] * 2

        const prevFullStart = Math.max(0, idx - effectivePeriod - sqrtPeriod + 1)
        const prevFullEnd = Math.max(prevFullStart + 1, idx - sqrtPeriod + 1)
        const prevWmaFull = calculateWMA(closes.slice(prevFullStart, prevFullEnd), Math.min(effectivePeriod, prevFullEnd - prevFullStart))
        const prevWmaFullValue = prevWmaFull.length > 0 ? prevWmaFull[prevWmaFull.length - 1] : closes[idx]

        rawHMAData.unshift(prevWmaHalfValue - prevWmaFullValue)
      }
    }

    // Calculate final HMA as WMA of Raw HMA data
    const finalHMA = calculateWMA(rawHMAData, Math.min(sqrtPeriod, rawHMAData.length))
    if (finalHMA.length > 0) {
      hma.push(finalHMA[finalHMA.length - 1])
    } else {
      hma.push(rawHMA)
    }
  }

  return hma.length > 0 ? hma : [closes[closes.length - 1]]
}
