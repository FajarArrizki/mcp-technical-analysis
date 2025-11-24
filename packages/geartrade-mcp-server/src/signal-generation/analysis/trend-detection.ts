/**
 * Trend Detection Analysis
 * detectTrend, detectMarketStructure functions
 */

import { TrendAlignment } from '../types'

export function detectTrend(
  closes: number[],
  ema20: number[],
  ema50?: number[] | null,
  ema200?: number[] | null
): TrendAlignment {
  if (!closes || closes.length === 0 || !ema20 || ema20.length === 0) {
    return {
      trend: 'neutral',
      strength: 0,
      reason: 'Insufficient data'
    }
  }
  
  const currentPrice = closes[closes.length - 1]
  const currentEMA20 = ema20[ema20.length - 1]
  const currentEMA50 = ema50 && ema50.length > 0 ? ema50[ema50.length - 1] : null
  const currentEMA200 = ema200 && ema200.length > 0 ? ema200[ema200.length - 1] : null
  
  let trend: 'uptrend' | 'downtrend' | 'neutral' = 'neutral'
  let strength = 0
  let reason = ''
  
  // Determine trend based on EMA crossovers and price position
  if (currentEMA50 && currentEMA200) {
    // Strong uptrend: Price > EMA20 > EMA50 > EMA200
    if (currentPrice > currentEMA20 && currentEMA20 > currentEMA50 && currentEMA50 > currentEMA200) {
      trend = 'uptrend'
      strength = 3
      reason = 'Strong uptrend: Price > EMA20 > EMA50 > EMA200'
    }
    // Strong downtrend: Price < EMA20 < EMA50 < EMA200
    else if (currentPrice < currentEMA20 && currentEMA20 < currentEMA50 && currentEMA50 < currentEMA200) {
      trend = 'downtrend'
      strength = 3
      reason = 'Strong downtrend: Price < EMA20 < EMA50 < EMA200'
    }
    // Moderate uptrend: Price > EMA20 > EMA50
    else if (currentPrice > currentEMA20 && currentEMA20 > currentEMA50) {
      trend = 'uptrend'
      strength = 2
      reason = 'Moderate uptrend: Price > EMA20 > EMA50'
    }
    // Moderate downtrend: Price < EMA20 < EMA50
    else if (currentPrice < currentEMA20 && currentEMA20 < currentEMA50) {
      trend = 'downtrend'
      strength = 2
      reason = 'Moderate downtrend: Price < EMA20 < EMA50'
    }
    // Weak uptrend: Price > EMA20
    else if (currentPrice > currentEMA20) {
      trend = 'uptrend'
      strength = 1
      reason = 'Weak uptrend: Price > EMA20'
    }
    // Weak downtrend: Price < EMA20
    else if (currentPrice < currentEMA20) {
      trend = 'downtrend'
      strength = 1
      reason = 'Weak downtrend: Price < EMA20'
    }
  } else if (currentEMA50) {
    // Only EMA20 and EMA50 available
    if (currentPrice > currentEMA20 && currentEMA20 > currentEMA50) {
      trend = 'uptrend'
      strength = 2
      reason = 'Uptrend: Price > EMA20 > EMA50'
    } else if (currentPrice < currentEMA20 && currentEMA20 < currentEMA50) {
      trend = 'downtrend'
      strength = 2
      reason = 'Downtrend: Price < EMA20 < EMA50'
    } else if (currentPrice > currentEMA20) {
      trend = 'uptrend'
      strength = 1
      reason = 'Weak uptrend: Price > EMA20'
    } else if (currentPrice < currentEMA20) {
      trend = 'downtrend'
      strength = 1
      reason = 'Weak downtrend: Price < EMA20'
    }
  } else {
    // Only EMA20 available
    if (currentPrice > currentEMA20) {
      trend = 'uptrend'
      strength = 1
      reason = 'Weak uptrend: Price > EMA20'
    } else if (currentPrice < currentEMA20) {
      trend = 'downtrend'
      strength = 1
      reason = 'Weak downtrend: Price < EMA20'
    }
  }
  
  return {
    trend: trend,
    strength: strength,
    reason: reason
  }
}

export interface MarketStructure {
  higherHighs: boolean
  lowerLows: boolean
  higherLows: boolean
  lowerHighs: boolean
  structure: 'uptrend' | 'downtrend' | 'bullish' | 'bearish' | 'neutral'
}

export function detectMarketStructure(
  highs: number[],
  lows: number[],
  closes: number[],
  lookbackPeriod: number = 20
): MarketStructure {
  if (highs.length < lookbackPeriod || lows.length < lookbackPeriod || closes.length < lookbackPeriod) {
    return {
      higherHighs: false,
      lowerLows: false,
      higherLows: false,
      lowerHighs: false,
      structure: 'neutral'
    }
  }
  
  // Get recent swing highs and lows
  const recentHighs = highs.slice(-lookbackPeriod)
  const recentLows = lows.slice(-lookbackPeriod)
  
  // Find highest high and lowest low in recent period
  const highestHigh = Math.max(...recentHighs)
  const lowestLow = Math.min(...recentLows)
  const highestHighIndex = recentHighs.indexOf(highestHigh)
  const lowestLowIndex = recentLows.indexOf(lowestLow)
  
  // Check for higher highs (uptrend structure)
  const higherHighs = highestHighIndex === recentHighs.length - 1 // Highest high is most recent
  
  // Check for lower lows (downtrend structure)
  const lowerLows = lowestLowIndex === recentLows.length - 1 // Lowest low is most recent
  
  // Check for higher lows (bullish structure)
  const firstHalfLows = recentLows.slice(0, Math.floor(recentLows.length / 2))
  const secondHalfLows = recentLows.slice(Math.floor(recentLows.length / 2))
  const avgFirstHalfLows = firstHalfLows.reduce((a, b) => a + b, 0) / firstHalfLows.length
  const avgSecondHalfLows = secondHalfLows.reduce((a, b) => a + b, 0) / secondHalfLows.length
  const higherLows = avgSecondHalfLows > avgFirstHalfLows
  
  // Check for lower highs (bearish structure)
  const firstHalfHighs = recentHighs.slice(0, Math.floor(recentHighs.length / 2))
  const secondHalfHighs = recentHighs.slice(Math.floor(recentHighs.length / 2))
  const avgFirstHalfHighs = firstHalfHighs.reduce((a, b) => a + b, 0) / firstHalfHighs.length
  const avgSecondHalfHighs = secondHalfHighs.reduce((a, b) => a + b, 0) / secondHalfHighs.length
  const lowerHighs = avgSecondHalfHighs < avgFirstHalfHighs
  
  // Determine market structure
  let structure: 'uptrend' | 'downtrend' | 'bullish' | 'bearish' | 'neutral' = 'neutral'
  if (higherHighs && higherLows) {
    structure = 'uptrend'
  } else if (lowerLows && lowerHighs) {
    structure = 'downtrend'
  } else if (higherHighs || higherLows) {
    structure = 'bullish'
  } else if (lowerLows || lowerHighs) {
    structure = 'bearish'
  }
  
  return {
    higherHighs: higherHighs,
    lowerLows: lowerLows,
    higherLows: higherLows,
    lowerHighs: lowerHighs,
    structure: structure
  }
}

