/**
 * TRIX (Triple Smoothed EMA) Indicator
 * Triple exponentially smoothed moving average momentum oscillator
 */

import { calculateEMA } from './moving-averages'

export interface TRIXData {
  trix: number | null // TRIX value (percentage)
  trixLine: number | null // Raw TRIX line
  signal: 'bullish' | 'bearish' | 'neutral' | null
  trend: 'uptrend' | 'downtrend' | 'sideways' | null
}

export function calculateTRIX(
  closes: number[],
  period: number = 15,
  signalPeriod: number = 9
): TRIXData {
  // Minimum 10 data points required
  if (closes.length < 10) {
    return {
      trix: null,
      trixLine: null,
      signal: null,
      trend: null,
    }
  }
  
  // Use adaptive periods
  const dataRatio = Math.min(1, closes.length / 54)
  const effectivePeriod = Math.max(3, Math.floor(period * dataRatio))
  const effectiveSignalPeriod = Math.max(3, Math.floor(signalPeriod * dataRatio))

  // Calculate triple EMA using effective period
  const ema1 = calculateEMA(closes, effectivePeriod)
  if (ema1.length < effectivePeriod) {
    return createSimpleTRIXResult(closes)
  }
  
  const ema2 = calculateEMA(ema1, effectivePeriod)
  if (ema2.length < 2) {
    return createSimpleTRIXResult(closes)
  }
  
  const ema3 = calculateEMA(ema2, Math.min(effectivePeriod, ema2.length))

  if (ema3.length < 2) {
    return createSimpleTRIXResult(closes)
  }

  // Calculate TRIX line: (EMA3_t - EMA3_t-1) / EMA3_t-1
  const trixLine: number[] = []

  for (let i = 1; i < ema3.length; i++) {
    const currentEMA3 = ema3[i]
    const previousEMA3 = ema3[i - 1]

    if (previousEMA3 !== 0) {
      const trixValue = ((currentEMA3 - previousEMA3) / previousEMA3) * 100
      trixLine.push(trixValue)
    }
  }

  if (trixLine.length === 0) {
    return {
      trix: null,
      trixLine: null,
      signal: null,
      trend: null,
    }
  }

  // Get current TRIX value
  const currentTrix = trixLine[trixLine.length - 1]

  // Calculate signal using effective signal period
  let signal: 'bullish' | 'bearish' | 'neutral' | null = null
  const useSignalPeriod = Math.min(effectiveSignalPeriod, trixLine.length)
  if (trixLine.length >= useSignalPeriod) {
    const recentTrix = trixLine.slice(-useSignalPeriod)
    const recentAvg = recentTrix.reduce((sum, val) => sum + val, 0) / useSignalPeriod

    if (currentTrix > recentAvg * 1.01) signal = 'bullish' // Above moving average
    else if (currentTrix < recentAvg * 0.99) signal = 'bearish' // Below moving average
    else signal = 'neutral'
  }

  // Determine trend based on TRIX direction
  let trend: 'uptrend' | 'downtrend' | 'sideways' | null = null
  if (trixLine.length >= 3) {
    const recent = trixLine.slice(-3)
    const isIncreasing = recent[2] > recent[1] && recent[1] > recent[0]
    const isDecreasing = recent[2] < recent[1] && recent[1] < recent[0]

    if (isIncreasing) trend = 'uptrend'
    else if (isDecreasing) trend = 'downtrend'
    else trend = 'sideways'
  }

  return {
    trix: currentTrix,
    trixLine: currentTrix,
    signal,
    trend,
  }
}

/**
 * Helper function to create simple TRIX result for fallback
 */
function createSimpleTRIXResult(closes: number[]): TRIXData {
  if (closes.length < 2) {
    return { trix: null, trixLine: null, signal: null, trend: null }
  }
  
  const current = closes[closes.length - 1]
  const previous = closes[closes.length - 2]
  const trix = previous !== 0 ? ((current - previous) / previous) * 100 : 0
  
  return {
    trix,
    trixLine: trix,
    signal: trix > 0 ? 'bullish' : trix < 0 ? 'bearish' : 'neutral',
    trend: trix > 0 ? 'uptrend' : trix < 0 ? 'downtrend' : 'sideways',
  }
}
