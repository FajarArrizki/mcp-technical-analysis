/**
 * Volatility Indicators
 * ATR, Bollinger Bands calculations
 */

import { calculateSMA } from './moving-averages'
import { BollingerBands } from '../types'

export function calculateBollingerBands(
  closes: number[],
  period: number = 20,
  stdDev: number = 2
): BollingerBands[] {
  if (closes.length < period) return []
  
  const bands: BollingerBands[] = []
  const sma = calculateSMA(closes, period)
  
  for (let i = period - 1; i < closes.length; i++) {
    const periodCloses = closes.slice(i - period + 1, i + 1)
    const mean = sma[i - period + 1]
    
    // Calculate standard deviation
    const variance = periodCloses.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period
    const standardDeviation = Math.sqrt(variance)
    
    bands.push({
      upper: mean + (stdDev * standardDeviation),
      middle: mean,
      lower: mean - (stdDev * standardDeviation)
    })
  }
  
  return bands
}

export function calculateATR(
  highs: number[],
  lows: number[],
  closes: number[],
  period: number = 14
): number[] {
  if (highs.length < period + 1 || lows.length < period + 1 || closes.length < period + 1) {
    return []
  }
  
  const trueRanges: number[] = []
  
  // Calculate True Range for each period
  for (let i = 1; i < closes.length; i++) {
    const high = highs[i]
    const low = lows[i]
    const prevClose = closes[i - 1]
    
    // True Range = max(high - low, abs(high - prevClose), abs(low - prevClose))
    const tr1 = high - low
    const tr2 = Math.abs(high - prevClose)
    const tr3 = Math.abs(low - prevClose)
    const trueRange = Math.max(tr1, tr2, tr3)
    
    trueRanges.push(trueRange)
  }
  
  // Calculate ATR as SMA of True Ranges
  const atr: number[] = []
  let sum = 0
  
  // Initial ATR = average of first period true ranges
  for (let i = 0; i < period && i < trueRanges.length; i++) {
    sum += trueRanges[i]
  }
  
  if (trueRanges.length >= period) {
    atr.push(sum / period)
    
    // Subsequent ATR values use Wilder's smoothing method (exponential moving average)
    for (let i = period; i < trueRanges.length; i++) {
      const currentATR = ((atr[atr.length - 1] * (period - 1)) + trueRanges[i]) / period
      atr.push(currentATR)
    }
  }
  
  return atr
}

