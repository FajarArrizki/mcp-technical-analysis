/**
 * Advance-Decline Line (ADL) Indicator
 * Market breadth indicator showing difference between advancing and declining stocks
 */

export interface AdvanceDeclineLineData {
  // Advance-Decline Line value
  adl: number

  // Daily advances (stocks that closed higher)
  advances: number

  // Daily declines (stocks that closed lower)
  declines: number

  // Net advances (advances - declines)
  netAdvances: number

  // Cumulative ADL value
  cumulative: number

  // Trend direction
  trend: 'bullish' | 'bearish' | 'neutral'

  // Breadth strength
  breadthStrength: 'very_weak' | 'weak' | 'moderate' | 'strong' | 'very_strong'

  // Market breadth ratio
  breadthRatio: number

  // Divergence signals
  divergence: 'bullish' | 'bearish' | 'none'

  // Signal strength (0-100)
  strength: number

  // Trading signal
  signal: 'buy' | 'sell' | 'neutral'

  // Market health assessment
  marketHealth: 'healthy' | 'weakening' | 'distressed' | 'crisis'
}

/**
 * Calculate Advance-Decline Line
 * @param advances Array of number of advancing stocks each period
 * @param declines Array of number of declining stocks each period
 * @param prices Array of market prices (for divergence analysis)
 * @returns AdvanceDeclineLineData object
 */
export function calculateAdvanceDeclineLine(
  advances: number[],
  declines: number[],
  prices?: number[]
): AdvanceDeclineLineData | null {
  if (advances.length !== declines.length || advances.length === 0) {
    return null
  }

  // Calculate current period values
  const currentAdvances = advances[advances.length - 1]
  const currentDeclines = declines[declines.length - 1]
  const netAdvances = currentAdvances - currentDeclines

  // Calculate cumulative ADL
  let cumulative = 0
  for (let i = 0; i < advances.length; i++) {
    cumulative += advances[i] - declines[i]
  }

  const adl = cumulative

  // Determine trend
  let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral'
  if (netAdvances > 0) {
    trend = 'bullish'
  } else if (netAdvances < 0) {
    trend = 'bearish'
  }

  // Calculate breadth strength
  const totalIssues = currentAdvances + currentDeclines
  const breadthRatio = totalIssues > 0 ? netAdvances / totalIssues : 0

  let breadthStrength: 'very_weak' | 'weak' | 'moderate' | 'strong' | 'very_strong'
  const absBreadthRatio = Math.abs(breadthRatio)

  if (absBreadthRatio >= 0.4) {
    breadthStrength = 'very_strong'
  } else if (absBreadthRatio >= 0.3) {
    breadthStrength = 'strong'
  } else if (absBreadthRatio >= 0.2) {
    breadthStrength = 'moderate'
  } else if (absBreadthRatio >= 0.1) {
    breadthStrength = 'weak'
  } else {
    breadthStrength = 'very_weak'
  }

  // Calculate signal strength
  const strength = Math.min(100, Math.abs(breadthRatio) * 100 + Math.abs(netAdvances) / 10)

  // Check for divergence with price
  let divergence: 'bullish' | 'bearish' | 'none' = 'none'

  if (prices && prices.length >= advances.length) {
    divergence = analyzeBreadthDivergence(advances, declines, prices)
  }

  // Generate trading signal
  let signal: 'buy' | 'sell' | 'neutral' = 'neutral'

  if (breadthStrength === 'strong' || breadthStrength === 'very_strong') {
    if (trend === 'bullish' && divergence !== 'bearish') {
      signal = 'buy'
    } else if (trend === 'bearish' && divergence !== 'bullish') {
      signal = 'sell'
    }
  }

  // Assess market health
  let marketHealth: 'healthy' | 'weakening' | 'distressed' | 'crisis'

  if (breadthStrength === 'very_strong' && trend === 'bullish') {
    marketHealth = 'healthy'
  } else if (breadthStrength === 'strong' && trend === 'bullish') {
    marketHealth = 'healthy'
  } else if (breadthStrength === 'moderate') {
    marketHealth = 'weakening'
  } else if (breadthStrength === 'weak' || breadthStrength === 'very_weak') {
    marketHealth = 'distressed'
  } else {
    marketHealth = 'crisis'
  }

  return {
    adl,
    advances: currentAdvances,
    declines: currentDeclines,
    netAdvances,
    cumulative,
    trend,
    breadthStrength,
    breadthRatio,
    divergence,
    strength,
    signal,
    marketHealth
  }
}

/**
 * Helper function to analyze breadth divergence
 */
function analyzeBreadthDivergence(
  advances: number[],
  declines: number[],
  prices: number[]
): 'bullish' | 'bearish' | 'none' {
  if (advances.length < 20 || prices.length < 20) {
    return 'none'
  }

  // Calculate ADL over the last 20 periods
  const adlValues: number[] = []
  let cumulative = 0

  for (let i = Math.max(0, advances.length - 20); i < advances.length; i++) {
    cumulative += advances[i] - declines[i]
    adlValues.push(cumulative)
  }

  // Find peaks and troughs in both ADL and price
  const pricePeaks = findPeaks(prices.slice(-20))
  const priceTroughs = findTroughs(prices.slice(-20))
  const adlPeaks = findPeaks(adlValues)
  const adlTroughs = findTroughs(adlValues)

  // Check for bearish divergence (price makes higher high, ADL makes lower high)
  if (pricePeaks.length >= 2 && adlPeaks.length >= 2) {
    const recentPricePeak = Math.max(...pricePeaks.map(i => prices[prices.length - 20 + i]))
    const olderPricePeak = Math.max(...pricePeaks.slice(0, -1).map(i => prices[prices.length - 20 + i]))
    const recentAdlPeak = Math.max(...adlPeaks.map(i => adlValues[i]))
    const olderAdlPeak = Math.max(...adlPeaks.slice(0, -1).map(i => adlValues[i]))

    if (recentPricePeak > olderPricePeak && recentAdlPeak < olderAdlPeak) {
      return 'bearish'
    }
  }

  // Check for bullish divergence (price makes lower low, ADL makes higher low)
  if (priceTroughs.length >= 2 && adlTroughs.length >= 2) {
    const recentPriceTrough = Math.min(...priceTroughs.map(i => prices[prices.length - 20 + i]))
    const olderPriceTrough = Math.min(...priceTroughs.slice(0, -1).map(i => prices[prices.length - 20 + i]))
    const recentAdlTrough = Math.min(...adlTroughs.map(i => adlValues[i]))
    const olderAdlTrough = Math.min(...adlTroughs.slice(0, -1).map(i => adlValues[i]))

    if (recentPriceTrough < olderPriceTrough && recentAdlTrough > olderAdlTrough) {
      return 'bullish'
    }
  }

  return 'none'
}

/**
 * Helper function to find peaks in data
 */
function findPeaks(data: number[]): number[] {
  const peaks: number[] = []

  for (let i = 1; i < data.length - 1; i++) {
    if (data[i] > data[i - 1] && data[i] > data[i + 1]) {
      peaks.push(i)
    }
  }

  return peaks
}

/**
 * Helper function to find troughs in data
 */
function findTroughs(data: number[]): number[] {
  const troughs: number[] = []

  for (let i = 1; i < data.length - 1; i++) {
    if (data[i] < data[i - 1] && data[i] < data[i + 1]) {
      troughs.push(i)
    }
  }

  return troughs
}

/**
 * Get Advance-Decline Line interpretation
 * @param adl AdvanceDeclineLineData object
 * @returns Human-readable interpretation
 */
export function getADLInterpretation(adl: AdvanceDeclineLineData): string {
  const { trend, breadthStrength, marketHealth, divergence, netAdvances } = adl

  let interpretation = `ADL: ${adl.cumulative.toLocaleString()} (${netAdvances > 0 ? '+' : ''}${netAdvances})`

  interpretation += ` - ${breadthStrength} ${trend} breadth`

  if (divergence !== 'none') {
    interpretation += ` - ${divergence} divergence`
  }

  interpretation += ` - Market ${marketHealth}`

  return interpretation
}

/**
 * Calculate Advance-Decline Ratio
 * @param advances Number of advancing stocks
 * @param declines Number of declining stocks
 * @returns Advance-decline ratio
 */
export function calculateAdvanceDeclineRatio(
  advances: number,
  declines: number
): number {
  return declines > 0 ? advances / declines : advances > 0 ? 2 : 1
}

/**
 * Analyze market breadth over time
 * @param advances Array of advancing stocks over time
 * @param declines Array of declining stocks over time
 * @param prices Array of market prices
 * @returns Market breadth analysis
 */
export function analyzeMarketBreadth(
  advances: number[],
  declines: number[],
  prices: number[]
): {
  breadthTrend: 'improving' | 'deteriorating' | 'stable'
  breadthMomentum: number
  marketSentiment: 'optimistic' | 'pessimistic' | 'neutral'
  reliability: number
  recommendedAction: string
} {
  if (advances.length < 20 || declines.length < 20) {
    return {
      breadthTrend: 'stable',
      breadthMomentum: 0,
      marketSentiment: 'neutral',
      reliability: 0,
      recommendedAction: 'Insufficient data'
    }
  }

  // Calculate breadth ratios over time
  const breadthRatios: number[] = []
  for (let i = 0; i < advances.length; i++) {
    const ratio = calculateAdvanceDeclineRatio(advances[i], declines[i])
    breadthRatios.push(ratio)
  }

  // Analyze trend in breadth ratios
  const recentRatios = breadthRatios.slice(-10)
  const olderRatios = breadthRatios.slice(-20, -10)

  const recentAvg = recentRatios.reduce((sum, r) => sum + r, 0) / recentRatios.length
  const olderAvg = olderRatios.reduce((sum, r) => sum + r, 0) / olderRatios.length

  let breadthTrend: 'improving' | 'deteriorating' | 'stable' = 'stable'
  const change = recentAvg - olderAvg

  if (change > 0.2) {
    breadthTrend = 'improving'
  } else if (change < -0.2) {
    breadthTrend = 'deteriorating'
  }

  const breadthMomentum = Math.max(-100, Math.min(100, change * 50))

  // Determine market sentiment
  let marketSentiment: 'optimistic' | 'pessimistic' | 'neutral' = 'neutral'
  if (recentAvg > 1.5) {
    marketSentiment = 'optimistic'
  } else if (recentAvg < 0.67) {
    marketSentiment = 'pessimistic'
  }

  // Calculate reliability based on consistency
  const ratioVariance = breadthRatios.slice(-20).reduce((sum, ratio, i, arr) => {
    const mean = arr.reduce((s, r) => s + r, 0) / arr.length
    return sum + Math.pow(ratio - mean, 2)
  }, 0) / 20

  const reliability = Math.max(0, 100 - ratioVariance * 10)

  // Recommend action
  let recommendedAction = 'Monitor breadth indicators'

  if (breadthTrend === 'improving' && marketSentiment === 'optimistic') {
    recommendedAction = 'Broad market strength - favorable for longs'
  } else if (breadthTrend === 'deteriorating' && marketSentiment === 'pessimistic') {
    recommendedAction = 'Broad market weakness - consider defensive positions'
  } else if (breadthTrend !== 'stable') {
    recommendedAction = 'Breadth divergence - exercise caution'
  }

  return {
    breadthTrend,
    breadthMomentum,
    marketSentiment,
    reliability,
    recommendedAction
  }
}

/**
 * Calculate Advance-Decline Line with volume weighting
 * @param advances Array of advancing stocks
 * @param declines Array of declining stocks
 * @param advanceVolume Array of advancing volume
 * @param declineVolume Array of declining volume
 * @returns Volume-weighted ADL
 */
export function calculateVolumeWeightedADL(
  advances: number[],
  declines: number[],
  advanceVolume: number[],
  declineVolume: number[]
): number {
  if (advances.length !== declines.length ||
      advanceVolume.length !== declineVolume.length ||
      advances.length !== advanceVolume.length) {
    return 0
  }

  let weightedADL = 0

  for (let i = 0; i < advances.length; i++) {
    const totalVolume = advanceVolume[i] + declineVolume[i]
    const advanceWeight = totalVolume > 0 ? advanceVolume[i] / totalVolume : 0.5
    const declineWeight = totalVolume > 0 ? declineVolume[i] / totalVolume : 0.5

    const weightedAdvance = advances[i] * advanceWeight
    const weightedDecline = declines[i] * declineWeight

    weightedADL += weightedAdvance - weightedDecline
  }

  return weightedADL
}
