/**
 * SuperTrend Indicator
 * Trend-following indicator using ATR for trailing stops
 */

import { calculateATR } from './volatility'

export interface SuperTrendData {
  superTrend: number | null
  trend: 'bullish' | 'bearish' | null
  signal: 'buy' | 'sell' | 'hold' | null
  upperBand: number | null
  lowerBand: number | null
  atr: number | null
}

export function calculateSuperTrend(
  highs: number[],
  lows: number[],
  closes: number[],
  atrPeriod: number = 14,
  multiplier: number = 3
): SuperTrendData {
  // Minimum 3 data points required for basic calculation
  if (highs.length < 3 || lows.length < 3 || closes.length < 3) {
    return {
      superTrend: null,
      trend: null,
      signal: null,
      upperBand: null,
      lowerBand: null,
      atr: null,
    }
  }
  
  // Use adaptive period - ensure we can calculate at least something
  const effectiveAtrPeriod = Math.min(atrPeriod, Math.max(2, closes.length - 1))

  // Calculate ATR
  let atr = calculateATR(highs, lows, closes, effectiveAtrPeriod)
  
  // Fallback if ATR calculation fails or returns empty
  if (atr.length === 0) {
    const simpleAtr: number[] = []
    for (let i = 1; i < closes.length; i++) {
      const tr = Math.max(
        highs[i] - lows[i],
        Math.abs(highs[i] - closes[i - 1]),
        Math.abs(lows[i] - closes[i - 1])
      )
      simpleAtr.push(tr)
    }
    atr = simpleAtr.length > 0 ? simpleAtr : [highs[highs.length - 1] - lows[lows.length - 1]]
  }
  
  const currentATR = atr[atr.length - 1] || Math.abs(highs[highs.length - 1] - lows[lows.length - 1]) || 1

  // Calculate Basic Bands
  const basicUpperBands: number[] = []
  const basicLowerBands: number[] = []
  const finalUpperBands: number[] = []
  const finalLowerBands: number[] = []
  const superTrends: number[] = []
  
  // Start from index 1 to ensure we have previous close
  const startIdx = 1

  for (let i = startIdx; i < closes.length; i++) {
    const hl2 = (highs[i] + lows[i]) / 2
    // Map to ATR index - ATR array starts from index 0 representing TR from index 1
    const atrIdx = Math.min(i - 1, atr.length - 1)
    const atrValue = atr[atrIdx] || currentATR
    const basicUpper = hl2 + (multiplier * atrValue)
    const basicLower = hl2 - (multiplier * atrValue)

    basicUpperBands.push(basicUpper)
    basicLowerBands.push(basicLower)

    // Calculate Final Bands
    let finalUpper: number
    let finalLower: number

    if (finalUpperBands.length === 0) {
      finalUpper = basicUpper
      finalLower = basicLower
    } else {
      const prevFinalUpper = finalUpperBands[finalUpperBands.length - 1]
      const prevFinalLower = finalLowerBands[finalLowerBands.length - 1]
      const prevClose = closes[i - 1]

      finalUpper = (basicUpper < prevFinalUpper || prevClose > prevFinalUpper) ? basicUpper : prevFinalUpper
      finalLower = (basicLower > prevFinalLower || prevClose < prevFinalLower) ? basicLower : prevFinalLower
    }

    finalUpperBands.push(finalUpper)
    finalLowerBands.push(finalLower)

    // Calculate SuperTrend
    let superTrend: number
    if (superTrends.length === 0) {
      superTrend = closes[i] > finalUpper ? finalLower : finalUpper
    } else {
      const prevSuperTrend = superTrends[superTrends.length - 1]
      const prevFinalUpper = finalUpperBands[finalUpperBands.length - 2]
      const currentClose = closes[i]

      if (prevSuperTrend === prevFinalUpper) {
        superTrend = currentClose > finalUpper ? finalLower : finalUpper
      } else {
        superTrend = currentClose < finalLower ? finalUpper : finalLower
      }
    }

    superTrends.push(superTrend)
  }

  // Final fallback if still no values
  if (superTrends.length === 0 || finalUpperBands.length === 0 || finalLowerBands.length === 0) {
    const hl2 = (highs[highs.length - 1] + lows[lows.length - 1]) / 2
    const fallbackUpper = hl2 + (multiplier * currentATR)
    const fallbackLower = hl2 - (multiplier * currentATR)
    const lastClose = closes[closes.length - 1]
    const fallbackSuperTrend = lastClose > hl2 ? fallbackLower : fallbackUpper
    return {
      superTrend: fallbackSuperTrend,
      trend: lastClose > hl2 ? 'bullish' : 'bearish',
      signal: lastClose > hl2 ? 'buy' : 'sell',
      upperBand: fallbackUpper,
      lowerBand: fallbackLower,
      atr: currentATR,
    }
  }

  const currentSuperTrend = superTrends[superTrends.length - 1]
  const currentUpperBand = finalUpperBands[finalUpperBands.length - 1]
  const currentLowerBand = finalLowerBands[finalLowerBands.length - 1]
  const currentClose = closes[closes.length - 1]

  // Determine trend and signal based on price position relative to SuperTrend
  let trend: 'bullish' | 'bearish'
  let signal: 'buy' | 'sell'

  if (currentClose > currentSuperTrend) {
    trend = 'bullish'
    signal = 'buy'
  } else {
    trend = 'bearish'
    signal = 'sell'
  }

  return {
    superTrend: currentSuperTrend,
    trend,
    signal,
    upperBand: currentUpperBand,
    lowerBand: currentLowerBand,
    atr: currentATR,
  }
}
