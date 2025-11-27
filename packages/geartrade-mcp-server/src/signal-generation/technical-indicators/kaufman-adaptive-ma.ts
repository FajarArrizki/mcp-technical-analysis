/**
 * Kaufman Adaptive Moving Average (KAMA) Indicator
 * Adaptive moving average that adjusts smoothing based on market efficiency
 */

export interface KaufmanAdaptiveMAData {
  // KAMA value
  kama: number

  // Current efficiency ratio
  efficiencyRatio: number

  // Smoothing constant (alpha)
  smoothingConstant: number

  // Trend direction
  trend: 'bullish' | 'bearish' | 'neutral'

  // Current price vs KAMA
  priceVsKama: number  // % difference
  position: 'above' | 'below' | 'equal'

  // Signal strength (0-100)
  strength: number

  // Market condition
  marketCondition: 'trending' | 'ranging' | 'neutral'

  // Responsiveness level
  responsiveness: 'high' | 'moderate' | 'low'

  // Trading signal
  signal: 'buy' | 'sell' | 'neutral'
}

/**
 * Calculate Kaufman Adaptive Moving Average
 * @param closes Array of closing prices
 * @param efficiencyPeriod Period for efficiency ratio calculation (default 10)
 * @param fastPeriod Fast EMA period (default 2)
 * @param slowPeriod Slow EMA period (default 30)
 * @returns KaufmanAdaptiveMAData object
 */
export function calculateKaufmanAdaptiveMA(
  closes: number[],
  efficiencyPeriod: number = 10,
  fastPeriod: number = 2,
  slowPeriod: number = 30
): KaufmanAdaptiveMAData | null {
  if (closes.length < slowPeriod + efficiencyPeriod) {
    return null
  }

  // Step 1: Calculate Efficiency Ratio (ER)
  // ER = |Price - Price[n]| / Sum(|Price[i] - Price[i-1]| for i=1 to n)
  const currentPrice = closes[closes.length - 1]
  const priceNPeriodsAgo = closes[closes.length - 1 - efficiencyPeriod]

  let sumPriceChanges = 0
  for (let i = closes.length - efficiencyPeriod; i < closes.length - 1; i++) {
    sumPriceChanges += Math.abs(closes[i + 1] - closes[i])
  }

  const efficiencyRatio = sumPriceChanges > 0 ?
    Math.abs(currentPrice - priceNPeriodsAgo) / sumPriceChanges : 0

  // Step 2: Calculate Smoothing Constant (SC)
  // SC = [ER * (2/(fastPeriod+1) - 2/(slowPeriod+1)) + 2/(slowPeriod+1)]^2
  const fastSC = 2 / (fastPeriod + 1)
  const slowSC = 2 / (slowPeriod + 1)

  const smoothingConstant = Math.pow(efficiencyRatio * (fastSC - slowSC) + slowSC, 2)

  // Step 3: Calculate KAMA recursively
  let kama: number

  if (closes.length === slowPeriod + efficiencyPeriod) {
    // First calculation - use simple average
    kama = closes.slice(-slowPeriod).reduce((sum, price) => sum + price, 0) / slowPeriod
  } else {
    // Recursive calculation: KAMA = KAMA[prev] + SC * (Price - KAMA[prev])
    const prevKAMA = calculateKaufmanAdaptiveMA(closes.slice(0, -1), efficiencyPeriod, fastPeriod, slowPeriod)

    if (prevKAMA) {
      kama = prevKAMA.kama + smoothingConstant * (currentPrice - prevKAMA.kama)
    } else {
      kama = currentPrice // Fallback
    }
  }

  // Determine trend
  let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral'
  if (currentPrice > kama * 1.001) {
    trend = 'bullish'
  } else if (currentPrice < kama * 0.999) {
    trend = 'bearish'
  }

  // Price vs KAMA
  const priceVsKama = ((currentPrice - kama) / kama) * 100

  let position: 'above' | 'below' | 'equal' = 'equal'
  if (currentPrice > kama * 1.001) {
    position = 'above'
  } else if (currentPrice < kama * 0.999) {
    position = 'below'
  }

  // Calculate signal strength
  const strength = Math.min(100, Math.abs(priceVsKama) * 2 + efficiencyRatio * 50)

  // Determine market condition based on efficiency ratio
  let marketCondition: 'trending' | 'ranging' | 'neutral' = 'neutral'
  if (efficiencyRatio > 0.6) {
    marketCondition = 'trending'
  } else if (efficiencyRatio < 0.3) {
    marketCondition = 'ranging'
  }

  // Determine responsiveness
  let responsiveness: 'high' | 'moderate' | 'low' = 'moderate'
  if (smoothingConstant > 0.1) {
    responsiveness = 'high'
  } else if (smoothingConstant < 0.05) {
    responsiveness = 'low'
  }

  // Generate trading signal
  let signal: 'buy' | 'sell' | 'neutral' = 'neutral'

  if (trend === 'bullish' && marketCondition === 'trending' && responsiveness === 'high') {
    signal = 'buy'
  } else if (trend === 'bearish' && marketCondition === 'trending' && responsiveness === 'high') {
    signal = 'sell'
  }

  return {
    kama,
    efficiencyRatio,
    smoothingConstant,
    trend,
    priceVsKama,
    position,
    strength,
    marketCondition,
    responsiveness,
    signal
  }
}

/**
 * Calculate KAMA for multiple parameter combinations
 * @param closes Array of closing prices
 * @param parameterSets Array of [efficiencyPeriod, fastPeriod, slowPeriod] combinations
 * @returns Array of KaufmanAdaptiveMAData objects
 */
export function calculateMultipleKAMA(
  closes: number[],
  parameterSets: Array<[number, number, number]> = [[10, 2, 30], [5, 2, 20]]
): KaufmanAdaptiveMAData[] {
  return parameterSets
    .map(([efficiencyPeriod, fastPeriod, slowPeriod]) =>
      calculateKaufmanAdaptiveMA(closes, efficiencyPeriod, fastPeriod, slowPeriod)
    )
    .filter((kama): kama is KaufmanAdaptiveMAData => kama !== null)
}

/**
 * Get KAMA interpretation
 * @param kama KaufmanAdaptiveMAData object
 * @returns Human-readable interpretation
 */
export function getKAMAInterpretation(kama: KaufmanAdaptiveMAData): string {
  const { kama: value, marketCondition, responsiveness, efficiencyRatio, trend } = kama

  let interpretation = `KAMA: ${value.toFixed(4)}`

  interpretation += ` - ${marketCondition} market (${responsiveness} responsiveness)`

  interpretation += ` - ER: ${(efficiencyRatio * 100).toFixed(1)}%`

  if (trend !== 'neutral') {
    interpretation += ` - ${trend} trend`
  }

  return interpretation
}

/**
 * Analyze KAMA adaptability
 * @param kama KaufmanAdaptiveMAData object
 * @returns Adaptability analysis
 */
export function analyzeKAMAAdaptability(kama: KaufmanAdaptiveMAData): {
  adaptabilityScore: number
  marketEfficiency: number
  recommendedTimeframe: string
  strategySuggestion: string
} {
  const { efficiencyRatio, smoothingConstant, marketCondition } = kama

  // Adaptability score based on how well the MA adapts to market conditions
  const adaptabilityScore = Math.min(100, efficiencyRatio * 100 + (1 - smoothingConstant) * 50)

  const marketEfficiency = efficiencyRatio * 100

  let recommendedTimeframe = 'Daily'
  if (marketCondition === 'trending') {
    recommendedTimeframe = 'Daily to Weekly'
  } else if (marketCondition === 'ranging') {
    recommendedTimeframe = 'Intraday'
  }

  let strategySuggestion = 'Use for trend following'
  if (marketCondition === 'trending' && efficiencyRatio > 0.7) {
    strategySuggestion = 'Strong trending market - use breakout strategies'
  } else if (marketCondition === 'ranging' && efficiencyRatio < 0.3) {
    strategySuggestion = 'Sideways market - use mean reversion strategies'
  } else {
    strategySuggestion = 'Mixed market - use flexible strategies'
  }

  return { adaptabilityScore, marketEfficiency, recommendedTimeframe, strategySuggestion }
}

/**
 * Calculate KAMA slope for trend strength
 * @param closes Array of closing prices
 * @param period Period for slope calculation
 * @returns KAMA slope value
 */
export function calculateKAMASlope(
  closes: number[],
  period: number = 5
): number {
  if (closes.length < period + 20) { // Need enough data for KAMA calculation
    return 0
  }

  const kamaValues: number[] = []

  // Calculate KAMA for the last 'period' points
  for (let i = Math.max(20, closes.length - period); i < closes.length; i++) {
    const slice = closes.slice(0, i + 1)
    const kama = calculateKaufmanAdaptiveMA(slice)
    if (kama) {
      kamaValues.push(kama.kama)
    }
  }

  if (kamaValues.length < 2) {
    return 0
  }

  // Calculate slope using linear regression
  const n = kamaValues.length
  let sumX = 0
  let sumY = 0
  let sumXY = 0
  let sumXX = 0

  for (let i = 0; i < n; i++) {
    sumX += i
    sumY += kamaValues[i]
    sumXY += i * kamaValues[i]
    sumXX += i * i
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)

  return slope
}
