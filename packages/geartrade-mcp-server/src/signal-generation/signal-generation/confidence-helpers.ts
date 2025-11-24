/**
 * Confidence Calculation Helpers
 * calculateRecentMomentum, checkMajorIndicatorsAlignment, calculateAdaptiveFlipThreshold, 
 * getAdaptiveWeights, evaluateTieredWeights, calculateWeightedMedian, calculatePartialConfidence,
 * normalizeConfidence, calculateAdaptiveMinConfidence, calculateRelativeEVThreshold functions
 */

import { HistoricalDataPoint, MarketRegime } from '../types'

export interface TechnicalIndicators {
  ema20?: number | null
  ema50?: number | null
  ema200?: number | null
  price?: number
  macd?: {
    histogram: number
  } | null
  rsi14?: number | null
  obv?: number | null
  bollingerBands?: {
    lower?: number
    upper?: number
    middle?: number
  } | null
  parabolicSAR?: number | null
  aroon?: {
    up?: number
    down?: number
  } | null
  adx?: number | null
  plusDI?: number | null
  minusDI?: number | null
}

export interface MomentumResult {
  recentChange: number
  momentumStrength: number
}

export interface IndicatorsAlignmentResult {
  alignedCount: number
  isAligned: boolean
  alignedIndicators: string[]
}

export interface TieredWeightsResult {
  tier1Score: number
  tier2Score: number
  tier3Score: number
  totalScore: number
  tier1Bullish: number
  tier1Bearish: number
  tier2Bullish: number
  tier2Bearish: number
  tier3Bullish: number
  tier3Bearish: number
}

export interface WeightedMedianResult {
  medianScore: number
  topIndicators: string[]
  direction: 'bullish' | 'bearish'
}

export interface AdaptiveWeights {
  EMA: number
  Aroon: number
  RSI: number
  MACD: number
  OBV: number
  BB: number
}

/**
 * Calculate Recent Momentum
 * Measures momentum change over recent periods
 */
export function calculateRecentMomentum(
  historicalData: HistoricalDataPoint[],
  indicators: TechnicalIndicators | null,
  periods: number = 3
): MomentumResult {
  if (!historicalData || historicalData.length < periods * 2 || !indicators) {
    return { recentChange: 0, momentumStrength: 0 }
  }
  
  // Get last N candles vs previous N candles
  const recentCandles = historicalData.slice(-periods)
  const previousCandles = historicalData.slice(-periods * 2, -periods)
  
  if (recentCandles.length < periods || previousCandles.length < periods) {
    return { recentChange: 0, momentumStrength: 0 }
  }
  
  // Calculate price change
  const recentStartPrice = recentCandles[0].close
  const recentEndPrice = recentCandles[recentCandles.length - 1].close
  const previousStartPrice = previousCandles[0].close
  const previousEndPrice = previousCandles[previousCandles.length - 1].close
  
  const recentChange = (recentEndPrice - recentStartPrice) / recentStartPrice
  const previousChange = (previousEndPrice - previousStartPrice) / previousStartPrice
  
  // Momentum = recent change - previous change (acceleration)
  const momentumChange = recentChange - previousChange
  
  // Check MACD histogram trend
  let macdMomentum = 0
  if (indicators.macd && indicators.macd.histogram !== null && indicators.macd.histogram !== undefined) {
    // Positive histogram = bullish momentum
    macdMomentum = indicators.macd.histogram > 0 ? 0.3 : -0.3
  }
  
  // Check OBV trend (if available from historical)
  let obvMomentum = 0
  if (indicators.obv !== null && indicators.obv !== undefined) {
    obvMomentum = indicators.obv > 0 ? 0.2 : -0.2
  }
  
  // Combine momentum signals
  const totalMomentum = momentumChange + macdMomentum + obvMomentum
  const momentumStrength = Math.min(1, Math.abs(totalMomentum) * 10) // Scale to 0-1
  
  return {
    recentChange: totalMomentum > 0 ? 1 : (totalMomentum < 0 ? -1 : 0),
    momentumStrength: momentumStrength
  }
}

/**
 * Check Major Indicators Alignment
 * Returns count of aligned indicators and whether minimum threshold met
 */
export function checkMajorIndicatorsAlignment(
  indicators: TechnicalIndicators | null,
  direction: 'bullish' | 'bearish'
): IndicatorsAlignmentResult {
  if (!indicators) {
    return { alignedCount: 0, isAligned: false, alignedIndicators: [] }
  }

  let alignedCount = 0
  const alignedIndicators: string[] = []
  
  // 1. MACD
  if (indicators.macd && indicators.macd.histogram !== null && indicators.macd.histogram !== undefined) {
    const isBullish = indicators.macd.histogram > 0
    if ((direction === 'bullish' && isBullish) || (direction === 'bearish' && !isBullish)) {
      alignedCount++
      alignedIndicators.push('MACD')
    }
  }
  
  // 2. RSI
  if (indicators.rsi14 !== null && indicators.rsi14 !== undefined) {
    const isBullish = indicators.rsi14 > 50
    if ((direction === 'bullish' && isBullish) || (direction === 'bearish' && !isBullish)) {
      alignedCount++
      alignedIndicators.push('RSI')
    }
  }
  
  // 3. Bollinger Bands
  if (indicators.bollingerBands && indicators.price) {
    const bbMiddle = indicators.bollingerBands.middle
    if (bbMiddle !== null && bbMiddle !== undefined) {
      const isBullish = indicators.price > bbMiddle
      if ((direction === 'bullish' && isBullish) || (direction === 'bearish' && !isBullish)) {
        alignedCount++
        alignedIndicators.push('BB')
      }
    }
  }
  
  // 4. Parabolic SAR
  if (indicators.parabolicSAR !== null && indicators.parabolicSAR !== undefined && indicators.price) {
    const isBullish = indicators.price > indicators.parabolicSAR
    if ((direction === 'bullish' && isBullish) || (direction === 'bearish' && !isBullish)) {
      alignedCount++
      alignedIndicators.push('SAR')
    }
  }
  
  // 5. OBV
  if (indicators.obv !== null && indicators.obv !== undefined) {
    const isBullish = indicators.obv > 0
    if ((direction === 'bullish' && isBullish) || (direction === 'bearish' && !isBullish)) {
      alignedCount++
      alignedIndicators.push('OBV')
    }
  }
  
  // 6. Aroon
  if (indicators.aroon && indicators.aroon.up !== undefined && indicators.aroon.down !== undefined) {
    const isBullish = indicators.aroon.up > indicators.aroon.down
    if ((direction === 'bullish' && isBullish) || (direction === 'bearish' && !isBullish)) {
      alignedCount++
      alignedIndicators.push('Aroon')
    }
  }
  
  return {
    alignedCount,
    isAligned: alignedCount >= 3,
    alignedIndicators
  }
}

/**
 * Calculate Adaptive Flip Threshold based on Trend Strength
 * Returns dynamic threshold percentage based on market regime
 */
export function calculateAdaptiveFlipThreshold(trendStrength: number): number {
  const absTrendStrength = Math.abs(trendStrength)
  
  // Strong Trend (|trendStrength| > 0.6): 55% threshold
  if (absTrendStrength > 0.6) {
    return 55
  }
  
  // Moderate Trend (0.3 ≤ |trendStrength| ≤ 0.6): 50-52% threshold
  if (absTrendStrength >= 0.3 && absTrendStrength <= 0.6) {
    // Linear interpolation: 0.3 → 52%, 0.6 → 50%
    const threshold = 52 - ((absTrendStrength - 0.3) / 0.3) * 2
    return Math.round(threshold)
  }
  
  // Choppy/Sideways (|trendStrength| < 0.3): 65% threshold (very strict)
  return 65
}

/**
 * Adaptive Weight Balancer
 * Returns dynamic indicator weights based on market regime
 */
export function getAdaptiveWeights(
  trendStrength: number,
  volatilityHigh: boolean,
  marketRegime: MarketRegime | null
): AdaptiveWeights {
  // Strong trend regime - prioritize trend indicators
  if (Math.abs(trendStrength) > 0.6) {
    return {
      EMA: 0.35,
      Aroon: 0.25,
      RSI: 0.1,
      MACD: 0.2,
      OBV: 0.05,
      BB: 0.05
    }
  }
  
  // High volatility regime - prioritize momentum and volume
  if (volatilityHigh || (marketRegime && marketRegime.volatility === 'high')) {
    return {
      EMA: 0.2,
      MACD: 0.25,
      OBV: 0.25,
      RSI: 0.15,
      BB: 0.15,
      Aroon: 0.0
    }
  }
  
  // Default balanced weights
  return {
    EMA: 0.25,
    MACD: 0.2,
    RSI: 0.2,
    OBV: 0.15,
    BB: 0.1,
    Aroon: 0.1
  }
}

/**
 * Tiered Weight Evaluation
 * Evaluates indicators by tier and returns weighted score
 */
export function evaluateTieredWeights(
  indicators: TechnicalIndicators | null,
  _direction: string
): TieredWeightsResult {
  if (!indicators) {
    return {
      tier1Score: 0,
      tier2Score: 0,
      tier3Score: 0,
      totalScore: 0,
      tier1Bullish: 0,
      tier1Bearish: 0,
      tier2Bullish: 0,
      tier2Bearish: 0,
      tier3Bullish: 0,
      tier3Bearish: 0
    }
  }

  let tier1Score = 0 // Trend Core: EMA, Aroon, ADX
  let tier2Score = 0 // Momentum: MACD, RSI
  let tier3Score = 0 // Volume/Volatility: OBV, BB, ATR
  
  let tier1Bullish = 0
  let tier1Bearish = 0
  let tier2Bullish = 0
  let tier2Bearish = 0
  let tier3Bullish = 0
  let tier3Bearish = 0
  
  // Tier 1: Trend Core
  // EMA alignment
  if (indicators.ema20 && indicators.ema50 && indicators.price) {
    const isBullish = indicators.price > indicators.ema20 && indicators.ema20 > indicators.ema50
    if (isBullish) tier1Bullish++
    else tier1Bearish++
  }
  
  // Aroon
  if (indicators.aroon && indicators.aroon.up !== undefined && indicators.aroon.down !== undefined) {
    if (indicators.aroon.up > indicators.aroon.down) tier1Bullish++
    else tier1Bearish++
  }
  
  // ADX (trend strength)
  if (indicators.adx !== null && indicators.adx !== undefined) {
    const adxValue = typeof indicators.adx === 'number' ? indicators.adx : (indicators.adx as any)?.adx || indicators.adx
    if (typeof adxValue === 'number' && adxValue > 25) {
      // Strong trend - check direction
      if (indicators.plusDI !== null && indicators.plusDI !== undefined &&
          indicators.minusDI !== null && indicators.minusDI !== undefined) {
        if (indicators.plusDI > indicators.minusDI) tier1Bullish++
        else tier1Bearish++
      }
    }
  }
  
  // Tier 2: Momentum
  // MACD
  if (indicators.macd && indicators.macd.histogram !== null && indicators.macd.histogram !== undefined) {
    if (indicators.macd.histogram > 0) tier2Bullish++
    else tier2Bearish++
  }
  
  // RSI
  if (indicators.rsi14 !== null && indicators.rsi14 !== undefined) {
    if (indicators.rsi14 > 50) tier2Bullish++
    else tier2Bearish++
  }
  
  // Tier 3: Volume/Volatility
  // OBV
  if (indicators.obv !== null && indicators.obv !== undefined) {
    if (indicators.obv > 0) tier3Bullish++
    else tier3Bearish++
  }
  
  // BB
  if (indicators.bollingerBands && indicators.price) {
    const bbMiddle = indicators.bollingerBands.middle
    if (bbMiddle !== null && bbMiddle !== undefined) {
      if (indicators.price > bbMiddle) tier3Bullish++
      else tier3Bearish++
    }
  }
  
  // Calculate tier scores
  if (tier1Bullish >= 2) tier1Score += 10
  if (tier1Bearish >= 2) tier1Score -= 10
  if (tier2Bullish >= 2) tier2Score += 5
  if (tier2Bearish >= 2) tier2Score -= 5
  if (tier3Bullish >= 2) tier3Score += 3
  if (tier3Bearish >= 2) tier3Score -= 3
  
  return {
    tier1Score,
    tier2Score,
    tier3Score,
    totalScore: tier1Score + tier2Score + tier3Score,
    tier1Bullish,
    tier1Bearish,
    tier2Bullish,
    tier2Bearish,
    tier3Bullish,
    tier3Bearish
  }
}

/**
 * Weighted Median / Confidence Cluster
 * Returns median score from top 3 highest confidence indicators
 */
export function calculateWeightedMedian(
  indicators: TechnicalIndicators | null,
  bullishScore: number,
  bearishScore: number
): WeightedMedianResult | null {
  if (!indicators) {
    return null
  }

  // Create indicator confidence array
  const indicatorConfidences: Array<{
    name: string
    confidence: number
    score: number
    direction: 'bullish' | 'bearish'
  }> = []
  
  // MACD confidence
  if (indicators.macd && indicators.macd.histogram !== null && indicators.macd.histogram !== undefined) {
    const macdConf = Math.abs(indicators.macd.histogram) / 50 // Normalize to 0-1
    indicatorConfidences.push({
      name: 'MACD',
      confidence: macdConf,
      score: indicators.macd.histogram > 0 ? bullishScore : bearishScore,
      direction: indicators.macd.histogram > 0 ? 'bullish' : 'bearish'
    })
  }
  
  // RSI confidence
  if (indicators.rsi14 !== null && indicators.rsi14 !== undefined) {
    const rsiConf = Math.abs(indicators.rsi14 - 50) / 50 // Distance from neutral
    indicatorConfidences.push({
      name: 'RSI',
      confidence: rsiConf,
      score: indicators.rsi14 > 50 ? bullishScore : bearishScore,
      direction: indicators.rsi14 > 50 ? 'bullish' : 'bearish'
    })
  }
  
  // OBV confidence
  if (indicators.obv !== null && indicators.obv !== undefined) {
    const obvConf = Math.min(1, Math.abs(indicators.obv) / 5000000) // Normalize
    indicatorConfidences.push({
      name: 'OBV',
      confidence: obvConf,
      score: indicators.obv > 0 ? bullishScore : bearishScore,
      direction: indicators.obv > 0 ? 'bullish' : 'bearish'
    })
  }
  
  // EMA confidence
  if (indicators.ema20 && indicators.price) {
    const emaDistance = Math.abs(indicators.price - indicators.ema20) / indicators.price
    indicatorConfidences.push({
      name: 'EMA',
      confidence: Math.min(1, emaDistance * 10), // Normalize
      score: indicators.price > indicators.ema20 ? bullishScore : bearishScore,
      direction: indicators.price > indicators.ema20 ? 'bullish' : 'bearish'
    })
  }
  
  // Sort by confidence and take top 3
  const top3 = indicatorConfidences
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3)
  
  if (top3.length === 0) return null
  
  // Calculate median score
  const scores = top3.map(i => i.score).sort((a, b) => a - b)
  const medianScore = scores.length % 2 === 0
    ? (scores[scores.length / 2 - 1] + scores[scores.length / 2]) / 2
    : scores[Math.floor(scores.length / 2)]
  
  return {
    medianScore,
    topIndicators: top3.map(i => i.name),
    direction: top3[0].direction // Use direction of highest confidence indicator
  }
}

/**
 * Partial Confidence Mode
 * Ensures confidence is never 0%, uses partial confidence calculation
 */
export function calculatePartialConfidence(
  bullishPercent: number,
  bearishPercent: number,
  baseConfidence: number = 0.3
): number {
  if (bullishPercent > bearishPercent) {
    return Math.min(1, baseConfidence + (bullishPercent - bearishPercent) / 100)
  } else if (bearishPercent > bullishPercent) {
    return Math.min(1, baseConfidence + (bearishPercent - bullishPercent) / 100)
  }
  return baseConfidence // Neutral = base confidence
}

/**
 * Rolling Normalization for Confidence
 * Uses square root normalization to boost low confidence while capping high confidence
 */
export function normalizeConfidence(confidence: number): number {
  // Convert to 0-100 scale, normalize, then convert back to 0-1
  const confPercent = confidence * 100
  const normalized = Math.min(100, Math.sqrt(confPercent / 100) * 100)
  return normalized / 100
}

/**
 * Calculate Adaptive Minimum Confidence Threshold
 * Adjusts minimum confidence based on market clarity
 */
export function calculateAdaptiveMinConfidence(
  trendStrength: number,
  contradictionScore: number,
  volatility: number,
  baseMinConf: number = 0.32
): number {
  let minConf = baseMinConf
  
  // Strong trend = lower threshold (clear direction)
  if (Math.abs(trendStrength) > 0.6) {
    minConf = 0.25
  }
  // High contradictions = higher threshold (uncertainty)
  else if (contradictionScore > 30) {
    minConf = 0.35
  }
  // Low volatility = lower threshold (calm market, signals more reliable)
  else if (volatility < 0.015) {
    minConf = 0.20
  }
  
  return minConf
}

/**
 * Calculate Relative EV Threshold
 * Uses relative threshold based on average EV instead of absolute
 */
export function calculateRelativeEVThreshold(
  signals: Array<{ expected_value?: number | null }>,
  baseThreshold: number = 0.30
): number {
  // Calculate average EV from all signals
  const validEVs = signals
    .map(s => s.expected_value)
    .filter((ev): ev is number => ev !== null && ev !== undefined && !isNaN(ev))
  
  if (validEVs.length === 0) {
    return baseThreshold
  }
  
  const avgEV = validEVs.reduce((a, b) => a + b, 0) / validEVs.length
  
  // Use 80% of average EV, but minimum baseThreshold
  return Math.max(baseThreshold, avgEV * 0.8)
}

