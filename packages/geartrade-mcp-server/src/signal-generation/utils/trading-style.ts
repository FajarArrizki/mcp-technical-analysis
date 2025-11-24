/**
 * Trading Style Determination
 * determineTradingStyle function
 */

import { Signal, TrendAlignment, MarketRegime } from '../types'
import { TechnicalIndicators } from '../technical-indicators/aggregator'

/**
 * Determine trading style (Long Term vs Short Term)
 */
export function determineTradingStyle(
  signal: Signal,
  indicators: TechnicalIndicators | null | undefined,
  trendAlignment: TrendAlignment | null | undefined,
  marketRegime: MarketRegime | null | undefined
): 'Long Term' | 'Short Term' {
  if (!trendAlignment && !indicators) return 'Short Term' // Default to short term if no data
  
  const signalType = signal.signal || signal
  
  const isLongTerm = 
    // Daily trend aligned
    (trendAlignment && 
     ((trendAlignment as any).dailyTrend || trendAlignment.trend) && 
     ((signalType === 'buy_to_enter' && ((trendAlignment as any).dailyTrend || trendAlignment.trend) === 'uptrend') ||
      (signalType === 'sell_to_enter' && ((trendAlignment as any).dailyTrend || trendAlignment.trend) === 'downtrend'))) &&
    // Multi-timeframe alignment
    (trendAlignment && 
     (((trendAlignment as any).h4Aligned && (trendAlignment as any).h1Aligned) ||
      ((trendAlignment as any).alignmentScore && (trendAlignment as any).alignmentScore >= 75))) &&
    // Strong trend strength (ADX > 25)
    (indicators && 
     ((typeof indicators.adx === 'number' && indicators.adx > 25) ||
      (indicators.adx && typeof indicators.adx === 'object' && (indicators.adx as any).adx > 25))) &&
    // Market regime is trending (not choppy)
    (marketRegime && marketRegime.regime === 'trending')
  
  return isLongTerm ? 'Long Term' : 'Short Term'
}

