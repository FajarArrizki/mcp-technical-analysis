/**
 * Expected Confidence
 * Estimate expected confidence (0-100) from pre-AI indicators, futures coherence, and BTC stability.
 */
import { analyzeInfluence } from './influence-graph'

export function computeExpectedConfidence(_asset: string, marketData: any): {
  expected: number
  reasons: string[]
  majorMismatches: number
} {
  const reasons: string[] = []
  const indicators = marketData?.indicators || {}
  const trend = marketData?.trendAlignment || {}
  // const ext = marketData?.externalData || {}
  // const futures = ext?.futures || {}

  let score = 0
  let max = 100

  // Trend alignment
  const strength = typeof trend?.strength === 'number' ? trend.strength : 0
  if (trend?.aligned && strength >= 0.7) {
    score += 18
    reasons.push('Trend aligned (>=70%)')
  } else if (trend?.aligned) {
    score += 12
    reasons.push('Trend aligned')
  } else if (strength > 0.4) {
    score += 6
    reasons.push('Trend partially aligned')
  }

  // ADX strength
  const adxVal = typeof indicators?.adx === 'number' ? indicators.adx : (indicators?.adx?.adx ?? 0)
  if (typeof adxVal === 'number') {
    if (adxVal > 25) score += 12
    else if (adxVal > 20) score += 8
    else score += 3
  }

  // MACD momentum (abs histogram)
  const hist = indicators?.macd?.histogram
  if (typeof hist === 'number') {
    const a = Math.abs(hist)
    if (a > 0.01) score += 12
    else if (a > 0.005) score += 8
    else if (a > 0.001) score += 5
    else score += 2
  }

  // Volatility regime via BB width
  const bb = indicators?.bollingerBands
  if (bb && typeof bb.middle === 'number' && bb.middle > 0) {
    const width = (bb.upper - bb.lower) / bb.middle
    if (width >= 0.02 && width <= 0.06) score += 8
    else if (width > 0.06 && width <= 0.1) score += 4
    else score += 2
  }

  // Futures coherence + BTC stability via influence graph
  const infl = analyzeInfluence(marketData)
  // Map to 0-20 bucket
  const inflNet = Math.max(0, 10 + infl.bonus - infl.penalty)
  const inflBucket = Math.min(20, Math.round((inflNet / 20) * 20))
  score += inflBucket
  reasons.push(...infl.notes.slice(0, 3))

  // Clamp and return
  if (score > max) score = max
  if (score < 0) score = 0

  return {
    expected: score,
    reasons,
    majorMismatches: infl.majorMismatches
  }
}


