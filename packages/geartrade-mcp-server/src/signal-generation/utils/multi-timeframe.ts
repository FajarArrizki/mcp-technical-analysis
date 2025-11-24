/**
 * Multi-Timeframe Utilities
 * calculateMultiTimeframeIndicators, checkTrendAlignment functions
 */

import { HistoricalDataPoint } from '../types'
import { calculateTechnicalIndicators, TechnicalIndicators } from '../technical-indicators/aggregator'

export function calculateMultiTimeframeIndicators(
  multiTimeframeData: Record<string, HistoricalDataPoint[]>,
  currentPrice: number
): Record<string, TechnicalIndicators> {
  const indicators: Record<string, TechnicalIndicators> = {}
  
  for (const [timeframe, historicalData] of Object.entries(multiTimeframeData)) {
    if (historicalData && historicalData.length >= 14) {
      const tfIndicators = calculateTechnicalIndicators(historicalData, currentPrice)
      if (tfIndicators) {
        indicators[timeframe] = tfIndicators
      }
    }
  }
  
  return indicators
}

export interface TrendAlignment {
  aligned: boolean
  dailyTrend: 'uptrend' | 'downtrend' | 'neutral'
  h4Aligned: boolean
  h1Aligned: boolean
  alignmentScore: number
  reason: string
}

export function checkTrendAlignment(
  multiTimeframeIndicators: Record<string, TechnicalIndicators>
): TrendAlignment {
  if (!multiTimeframeIndicators || !multiTimeframeIndicators['1d']) {
    return {
      aligned: false,
      dailyTrend: 'neutral',
      h4Aligned: false,
      h1Aligned: false,
      alignmentScore: 0,
      reason: 'Daily timeframe data not available'
    }
  }
  
  const dailyIndicators = multiTimeframeIndicators['1d']
  const dailyPrice = dailyIndicators.price
  const dailyEMA20 = dailyIndicators.ema20
  const dailyEMA50 = dailyIndicators.ema50
  
  if (!dailyEMA20 || !dailyEMA50 || !dailyPrice) {
    return {
      aligned: false,
      dailyTrend: 'neutral',
      h4Aligned: false,
      h1Aligned: false,
      alignmentScore: 0,
      reason: 'Daily EMA data not available'
    }
  }
  
  // Determine daily trend
  let dailyTrend: 'uptrend' | 'downtrend' | 'neutral' = 'neutral'
  if (dailyPrice > dailyEMA20 && dailyEMA20 > dailyEMA50) {
    dailyTrend = 'uptrend'
  } else if (dailyPrice < dailyEMA20 && dailyEMA20 < dailyEMA50) {
    dailyTrend = 'downtrend'
  }
  
  // Check 4h and 1h alignment
  const h4Indicators = multiTimeframeIndicators['4h']
  const h1Indicators = multiTimeframeIndicators['1h']
  
  let h4Aligned = true
  let h1Aligned = true
  
  if (h4Indicators && h4Indicators.ema20 && h4Indicators.price) {
    if (dailyTrend === 'uptrend' && h4Indicators.price < h4Indicators.ema20) {
      h4Aligned = false
    } else if (dailyTrend === 'downtrend' && h4Indicators.price > h4Indicators.ema20) {
      h4Aligned = false
    }
  }
  
  if (h1Indicators && h1Indicators.ema20 && h1Indicators.price) {
    if (dailyTrend === 'uptrend' && h1Indicators.price < h1Indicators.ema20) {
      h1Aligned = false
    } else if (dailyTrend === 'downtrend' && h1Indicators.price > h1Indicators.ema20) {
      h1Aligned = false
    }
  }
  
  // Calculate alignment score (0-100) based on alignment strength
  let alignmentScore = 0
  if (dailyTrend !== 'neutral') {
    alignmentScore += 40 // Daily trend exists (40 points)
    if (h4Aligned) alignmentScore += 30 // 4H aligned (30 points)
    if (h1Aligned) alignmentScore += 30 // 1H aligned (30 points)
  } else {
    // Partial alignment: if Daily neutral but 4H and 1H show same direction relative to their EMA20
    let h4Bull = false
    let h4Bear = false
    if (h4Indicators && h4Indicators.price && h4Indicators.ema20) {
      h4Bull = h4Indicators.price > h4Indicators.ema20
      h4Bear = h4Indicators.price < h4Indicators.ema20
    }
    let h1Bull = false
    let h1Bear = false
    if (h1Indicators && h1Indicators.price && h1Indicators.ema20) {
      h1Bull = h1Indicators.price > h1Indicators.ema20
      h1Bear = h1Indicators.price < h1Indicators.ema20
    }
    if ((h4Bull && h1Bull) || (h4Bear && h1Bear)) {
      alignmentScore = 60 // award partial score for intraday alignment
    }
  }
  
  return {
    aligned: dailyTrend !== 'neutral' && h4Aligned && h1Aligned,
    dailyTrend: dailyTrend,
    h4Aligned: h4Aligned,
    h1Aligned: h1Aligned,
    alignmentScore: alignmentScore,
    reason: dailyTrend === 'neutral' ? 'Daily trend is neutral' : (!h4Aligned || !h1Aligned) ? 'Lower timeframes not aligned' : 'All timeframes aligned'
  }
}

