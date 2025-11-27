/**
 * Percentage Price Oscillator (PPO) Indicator
 * MACD expressed as a percentage for easier comparison across different price levels
 */

import { calculateEMA } from './moving-averages'

export interface PPOData {
  ppo: number | null
  signal: number | null
  histogram: number | null
  signal_type: 'bullish' | 'bearish' | 'neutral' | null
}

export function calculatePPO(
  closes: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): PPOData {
  if (closes.length < slowPeriod + signalPeriod) {
    return {
      ppo: null,
      signal: null,
      histogram: null,
      signal_type: null,
    }
  }

  // Calculate EMAs
  const fastEMA = calculateEMA(closes, fastPeriod)
  const slowEMA = calculateEMA(closes, slowPeriod)

  if (fastEMA.length < slowPeriod - fastPeriod + 1 || slowEMA.length === 0) {
    return {
      ppo: null,
      signal: null,
      histogram: null,
      signal_type: null,
    }
  }

  // Align arrays and calculate PPO line: ((EMA_fast - EMA_slow) / EMA_slow) * 100
  const ppoLine: number[] = []
  const startIdx = slowPeriod - fastPeriod

  for (let i = 0; i < slowEMA.length; i++) {
    const fastValue = fastEMA[startIdx + i]
    const slowValue = slowEMA[i]

    if (fastValue && slowValue && slowValue !== 0) {
      const ppo = ((fastValue - slowValue) / slowValue) * 100
      ppoLine.push(ppo)
    }
  }

  if (ppoLine.length === 0) {
    return {
      ppo: null,
      signal: null,
      histogram: null,
      signal_type: null,
    }
  }

  // Calculate PPO Signal (EMA of PPO line)
  const ppoSignal = calculateEMA(ppoLine, signalPeriod)

  if (ppoSignal.length === 0) {
    return {
      ppo: ppoLine[ppoLine.length - 1],
      signal: null,
      histogram: null,
      signal_type: null,
    }
  }

  // Get current values
  const currentPPO = ppoLine[ppoLine.length - 1]
  const currentSignal = ppoSignal[ppoSignal.length - 1]
  const histogram = currentPPO - currentSignal

  // Determine signal type
  let signal_type: 'bullish' | 'bearish' | 'neutral' | null = null
  if (histogram > 0) signal_type = 'bullish'
  else if (histogram < 0) signal_type = 'bearish'
  else signal_type = 'neutral'

  return {
    ppo: currentPPO,
    signal: currentSignal,
    histogram,
    signal_type,
  }
}
