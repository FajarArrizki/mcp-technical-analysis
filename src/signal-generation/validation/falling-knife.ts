/**
 * Falling Knife Detection
 * isCatchingFallingKnife function
 */

import { Signal } from '../types'

export interface TrendAlignment {
  alignmentScore?: number
  dailyTrend?: 'uptrend' | 'downtrend' | 'neutral'
}

export interface TechnicalIndicators {
  ema20?: number | null
  ema50?: number | null
  ema200?: number | null
  price?: number
  macd?: {
    histogram: number
  } | null
  obv?: number | null
}

/**
 * Check if signal is catching a falling knife (dangerous counter-trend entry)
 * Returns true if all conditions are met for falling knife scenario
 */
export function isCatchingFallingKnife(
  _signal: Signal,
  indicators: TechnicalIndicators | null,
  trendAlignment: TrendAlignment | null
): boolean {
  if (!indicators || !trendAlignment) {
    return false
  }

  // Check if all conditions for "catching falling knife" are met
  const allTimeframesDowntrend = trendAlignment?.alignmentScore === 100 && 
                                  trendAlignment?.dailyTrend === 'downtrend'
  const priceBelowAllEMAs = indicators.ema20 && indicators.ema50 && indicators.ema200 &&
                             indicators.price && indicators.price < indicators.ema20 &&
                             indicators.price < indicators.ema50 &&
                             indicators.price < indicators.ema200
  const macdBearish = indicators.macd?.histogram !== undefined && indicators.macd.histogram < -20
  const obvVeryNegative = indicators.obv !== null && indicators.obv !== undefined &&
                          (indicators.obv < -5000000 || 
                          (indicators.obv < -1000000 && trendAlignment?.dailyTrend === 'downtrend'))
  
  return !!(allTimeframesDowntrend && priceBelowAllEMAs && macdBearish && obvVeryNegative)
}

