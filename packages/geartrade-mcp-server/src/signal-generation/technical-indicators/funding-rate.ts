/**
 * Funding Rate Indicators
 * Analyze funding rate momentum, extremes, divergence, mean reversion signals
 */

import { FundingRateData } from '../types/futures-types'

export interface FundingRateIndicator {
  momentum: {
    score3h: number // 0-1, momentum over 3h
    score8h: number // 0-1, momentum over 8h
    score24h: number // 0-1, momentum over 24h
    overall: number // 0-1, overall momentum score
    trend: 'rising' | 'falling' | 'neutral'
  }
  extreme: {
    isExtreme: boolean // True if >0.1% or <-0.1%
    level: 'extreme_high' | 'extreme_low' | 'normal'
    reversalSignal: boolean // True if extreme and mean reversion likely
  }
  divergence: {
    vsOI: number // Divergence vs open interest (-1 to 1)
    vsPrice: number // Divergence vs price (-1 to 1)
    signal: 'bullish' | 'bearish' | 'neutral'
  }
  meanReversion: {
    signal: boolean // True if mean reversion signal
    strength: number // 0-1, strength of mean reversion signal
    direction: 'long' | 'short' | 'neutral'
  }
  squeeze: {
    detected: boolean // True if funding rate squeeze detected
    phase: 'accumulation' | 'distribution' | 'none'
  }
}

/**
 * Calculate funding rate momentum
 */
function calculateMomentum(fundingData: FundingRateData): FundingRateIndicator['momentum'] {
  // Calculate 3h, 8h, 24h momentum scores
  // Higher score = stronger momentum
  
  const currentRate = fundingData.current
  const rate24h = fundingData.rate24h
  const rate7d = fundingData.rate7d

  // 3h momentum: compare current to rate24h (which is average of last 3 periods)
  const momentum3h = Math.abs(currentRate - rate24h) / Math.max(0.0001, Math.abs(rate24h) || 0.0001)
  const score3h = Math.min(1, momentum3h * 10) // Scale to 0-1

  // 8h momentum: compare rate24h to rate7d
  const momentum8h = Math.abs(rate24h - rate7d) / Math.max(0.0001, Math.abs(rate7d) || 0.0001)
  const score8h = Math.min(1, momentum8h * 5)

  // 24h momentum: overall change from 7d average
  const momentum24h = Math.abs(currentRate - rate7d) / Math.max(0.0001, Math.abs(rate7d) || 0.0001)
  const score24h = Math.min(1, momentum24h * 3)

  // Overall momentum
  const overall = (score3h * 0.5 + score8h * 0.3 + score24h * 0.2)

  // Determine trend
  let trend: 'rising' | 'falling' | 'neutral' = 'neutral'
  if (currentRate > rate24h * 1.05) {
    trend = 'rising'
  } else if (currentRate < rate24h * 0.95) {
    trend = 'falling'
  }

  return {
    score3h: isNaN(score3h) ? 0 : score3h,
    score8h: isNaN(score8h) ? 0 : score8h,
    score24h: isNaN(score24h) ? 0 : score24h,
    overall: isNaN(overall) ? 0 : overall,
    trend
  }
}

/**
 * Detect extreme funding rates
 */
function detectExtreme(fundingData: FundingRateData): FundingRateIndicator['extreme'] {
  const currentRate = fundingData.current
  const isExtreme = Math.abs(currentRate) > 0.001 // >0.1% or <-0.1%

  let level: 'extreme_high' | 'extreme_low' | 'normal' = 'normal'
  if (currentRate > 0.001) {
    level = 'extreme_high'
  } else if (currentRate < -0.001) {
    level = 'extreme_low'
  }

  // Mean reversion signal: extreme funding often reverses
  // Strong mean reversion signal if rate is extreme and diverging from 7d average
  const reversalSignal = isExtreme && Math.abs(currentRate - fundingData.rate7d) > Math.abs(fundingData.rate7d) * 0.5

  return {
    isExtreme,
    level,
    reversalSignal
  }
}

/**
 * Calculate funding rate divergence
 */
function calculateDivergence(
  fundingData: FundingRateData,
  oiChange: number, // OI change %
  priceChange: number // Price change %
): FundingRateIndicator['divergence'] {
  // Divergence vs OI: if funding rising but OI falling = bearish divergence
  let vsOI = 0
  if (oiChange !== 0 && !isNaN(oiChange)) {
    const fundingChange = fundingData.current - fundingData.rate24h
    // Normalize both to same scale
    const normalizedFunding = fundingChange * 10000 // Scale to percentage
    const divergenceValue = normalizedFunding - oiChange
    vsOI = Math.max(-1, Math.min(1, divergenceValue / 10)) // Normalize to -1 to 1
  }

  // Divergence vs Price: if funding rising but price falling = bearish
  let vsPrice = 0
  if (priceChange !== 0 && !isNaN(priceChange)) {
    const fundingChange = fundingData.current - fundingData.rate24h
    const normalizedFunding = fundingChange * 10000
    const divergenceValue = normalizedFunding - priceChange
    vsPrice = Math.max(-1, Math.min(1, divergenceValue / 10))
  }

  // Determine signal
  let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral'
  if (vsOI < -0.3 || vsPrice < -0.3) {
    signal = 'bearish' // Funding diverging negatively
  } else if (vsOI > 0.3 || vsPrice > 0.3) {
    signal = 'bullish' // Funding diverging positively
  }

  return {
    vsOI: isNaN(vsOI) ? 0 : vsOI,
    vsPrice: isNaN(vsPrice) ? 0 : vsPrice,
    signal
  }
}

/**
 * Detect mean reversion signal
 */
function detectMeanReversion(fundingData: FundingRateData): FundingRateIndicator['meanReversion'] {
  const currentRate = fundingData.current
  const rate7d = fundingData.rate7d

  // Mean reversion signal: current rate is far from 7d average
  const deviation = Math.abs(currentRate - rate7d)
  const meanRate = Math.abs(rate7d)
  
  // Signal strength: higher deviation = stronger signal
  const strength = Math.min(1, deviation / Math.max(0.0001, meanRate || 0.0001))

  // Signal: extreme funding tends to revert to mean
  const signal = strength > 0.5 && Math.abs(currentRate) > 0.0005 // >0.05%

  // Direction: if funding is very positive, expect it to drop (short signal)
  // If funding is very negative, expect it to rise (long signal)
  let direction: 'long' | 'short' | 'neutral' = 'neutral'
  if (signal) {
    if (currentRate > 0.001) {
      direction = 'short' // High funding -> price likely to drop
    } else if (currentRate < -0.001) {
      direction = 'long' // Low funding -> price likely to rise
    }
  }

  return {
    signal,
    strength: isNaN(strength) ? 0 : strength,
    direction
  }
}

/**
 * Detect funding rate squeeze
 */
function detectSqueeze(fundingData: FundingRateData): FundingRateIndicator['squeeze'] {
  // Squeeze: funding rate is compressed (low volatility) before a big move
  // Compare current rate to 7d average range
  const rateRange = Math.abs(fundingData.rate7d)
  const currentVolatility = Math.abs(fundingData.current - fundingData.rate24h)
  
  // Squeeze detected if current volatility is much lower than average
  const squeezed = currentVolatility < rateRange * 0.3

  // Phase: accumulation (low/negative funding) or distribution (high funding)
  let phase: 'accumulation' | 'distribution' | 'none' = 'none'
  if (squeezed) {
    if (fundingData.current < -0.0003) {
      phase = 'accumulation' // Negative funding = accumulation
    } else if (fundingData.current > 0.0003) {
      phase = 'distribution' // Positive funding = distribution
    }
  }

  return {
    detected: squeezed,
    phase
  }
}

/**
 * Calculate funding rate indicators
 */
export function calculateFundingRateIndicators(
  fundingData: FundingRateData,
  oiChange?: number,
  priceChange?: number
): FundingRateIndicator {
  const momentum = calculateMomentum(fundingData)
  const extreme = detectExtreme(fundingData)
  const divergence = calculateDivergence(
    fundingData,
    oiChange || 0,
    priceChange || 0
  )
  const meanReversion = detectMeanReversion(fundingData)
  const squeeze = detectSqueeze(fundingData)

  return {
    momentum,
    extreme,
    divergence,
    meanReversion,
    squeeze
  }
}

