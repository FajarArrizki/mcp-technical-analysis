/**
 * Coppock Curve Indicator
 * Long-term momentum indicator for identifying major market bottoms
 */

export interface CoppockCurveData {
  // Coppock Curve value
  coppock: number

  // Individual ROC components
  roc14: number  // 14-period ROC
  roc11: number  // 11-period ROC

  // WMA of ROC sum (10-period)
  wma: number

  // Trend direction
  trend: 'bullish' | 'bearish' | 'neutral'

  // Signal strength (0-100)
  strength: number

  // Zero line signals
  bullishSignal: boolean  // Coppock crosses above 0
  bearishSignal: boolean  // Coppock crosses below 0

  // Major bottom signals (Coppock turns up from extreme negative)
  majorBottomSignal: boolean

  // Market phase
  marketPhase: 'recovery' | 'expansion' | 'contraction' | 'crisis'

  // Trading signal
  signal: 'buy' | 'sell' | 'neutral'
}

/**
 * Calculate Coppock Curve
 * @param closes Array of closing prices
 * @param roc1Period First ROC period (default 14)
 * @param roc2Period Second ROC period (default 11)
 * @param wmaPeriod WMA period (default 10)
 * @returns CoppockCurveData object
 */
export function calculateCoppockCurve(
  closes: number[],
  roc1Period: number = 14,
  roc2Period: number = 11,
  wmaPeriod: number = 10
): CoppockCurveData | null {
  // Minimum 10 data points required
  if (closes.length < 10) {
    return null
  }
  
  // Use adaptive periods based on available data
  const dataRatio = Math.min(1, closes.length / 35)
  const effectiveRoc1Period = Math.max(3, Math.floor(roc1Period * dataRatio))
  const effectiveRoc2Period = Math.max(3, Math.floor(roc2Period * dataRatio))
  const effectiveWmaPeriod = Math.max(3, Math.floor(wmaPeriod * dataRatio))

  // Calculate ROC values using effective periods
  const roc14 = calculateROC(closes, effectiveRoc1Period)
  const roc11 = calculateROC(closes, effectiveRoc2Period)

  // Use fallback values if ROC calculation fails
  const r14 = roc14 ?? 0
  const r11 = roc11 ?? 0

  // Sum the ROCs
  const rocSum = r14 + r11

  // Apply Weighted Moving Average using effective period
  const rocSums = calculateROCsums(closes, effectiveRoc1Period, effectiveRoc2Period)
  const wma = calculateWMA(rocSums, effectiveWmaPeriod)

  // Use fallback if WMA fails
  const wmaValue = wma ?? rocSum

  const coppock = wmaValue

  // Determine trend
  let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral'
  if (coppock > 0) {
    trend = 'bullish'
  } else if (coppock < 0) {
    trend = 'bearish'
  }

  // Calculate signal strength based on Coppock magnitude
  const strength = Math.min(100, Math.abs(coppock) * 2)

  // Check for zero line crosses (simplified without recursion to avoid infinite loops)
  let bullishSignal = false
  let bearishSignal = false

  if (rocSums.length >= 2) {
    const prevRocSum = rocSums[rocSums.length - 2]
    if (prevRocSum <= 0 && rocSum > 0) {
      bullishSignal = true
    } else if (prevRocSum >= 0 && rocSum < 0) {
      bearishSignal = true
    }
  }

  // Check for major bottom signals (extreme negative turning up)
  let majorBottomSignal = false

  if (coppock > -10 && coppock < 10 && rocSums.length >= 5) {
    // Check if recently came from extreme negative territory
    let hadExtremeNegative = false
    for (let i = 1; i <= Math.min(5, rocSums.length - 1); i++) {
      if (rocSums[rocSums.length - 1 - i] < -20) {
        hadExtremeNegative = true
        break
      }
    }
    if (hadExtremeNegative && coppock > 0) {
      majorBottomSignal = true
    }
  }

  // Determine market phase based on Coppock value and trend
  let marketPhase: 'recovery' | 'expansion' | 'contraction' | 'crisis' = 'recovery'

  if (coppock > 10) {
    marketPhase = 'expansion'
  } else if (coppock < -10 && trend === 'bearish') {
    marketPhase = 'crisis'
  } else if (coppock < 0) {
    marketPhase = 'contraction'
  }

  // Generate trading signal
  let signal: 'buy' | 'sell' | 'neutral' = 'neutral'

  if (majorBottomSignal) {
    signal = 'buy' // Major bottom signal has highest priority
  } else if (bullishSignal) {
    signal = 'buy'
  } else if (bearishSignal) {
    signal = 'sell'
  } else if (marketPhase === 'expansion' && trend === 'bullish') {
    signal = 'buy'
  } else if (marketPhase === 'crisis' && trend === 'bearish') {
    signal = 'sell'
  }

  return {
    coppock,
    roc14: r14,
    roc11: r11,
    wma: wmaValue,
    trend,
    strength,
    bullishSignal,
    bearishSignal,
    majorBottomSignal,
    marketPhase,
    signal
  }
}

/**
 * Helper function to calculate ROC
 */
function calculateROC(closes: number[], period: number): number | null {
  if (closes.length < period + 1) {
    return null
  }

  const currentPrice = closes[closes.length - 1]
  const pastPrice = closes[closes.length - 1 - period]

  return ((currentPrice - pastPrice) / pastPrice) * 100
}

/**
 * Helper function to calculate ROC sums for WMA
 */
function calculateROCsums(closes: number[], roc1Period: number, roc2Period: number): number[] {
  const rocSums: number[] = []
  const maxPeriod = Math.max(roc1Period, roc2Period)

  for (let i = maxPeriod; i < closes.length; i++) {
    const slice = closes.slice(0, i + 1)
    const roc1 = calculateROC(slice, roc1Period)
    const roc2 = calculateROC(slice, roc2Period)

    if (roc1 !== null && roc2 !== null) {
      rocSums.push(roc1 + roc2)
    }
  }

  return rocSums
}

/**
 * Helper function to calculate Weighted Moving Average
 */
function calculateWMA(values: number[], period: number): number | null {
  if (values.length < period) {
    return null
  }

  const recentValues = values.slice(-period)
  let weightedSum = 0
  let weightSum = 0

  for (let i = 0; i < period; i++) {
    const weight = i + 1 // Linear weighting (1, 2, 3, ..., n)
    weightedSum += recentValues[i] * weight
    weightSum += weight
  }

  return weightedSum / weightSum
}

/**
 * Get Coppock Curve interpretation
 * @param coppock CoppockCurveData object
 * @returns Human-readable interpretation
 */
export function getCoppockInterpretation(coppock: CoppockCurveData): string {
  const { coppock: value, majorBottomSignal, marketPhase, bullishSignal, bearishSignal } = coppock

  let interpretation = `Coppock Curve: ${value.toFixed(2)}`

  if (majorBottomSignal) {
    interpretation += ' - MAJOR BOTTOM SIGNAL (High probability long-term buy)'
  } else if (bullishSignal) {
    interpretation += ' - Bullish zero line crossover'
  } else if (bearishSignal) {
    interpretation += ' - Bearish zero line crossover'
  } else {
    interpretation += ` - ${marketPhase} phase`
  }

  return interpretation
}

/**
 * Analyze Coppock Curve for long-term market timing
 * @param coppock CoppockCurveData object
 * @returns Long-term market analysis
 */
export function analyzeCoppockLongTerm(coppock: CoppockCurveData): {
  longTermBias: 'bullish' | 'bearish' | 'neutral'
  timeHorizon: 'short' | 'medium' | 'long'
  confidenceLevel: number
  recommendedAction: string
} {
  const { coppock: value, majorBottomSignal, marketPhase } = coppock

  let longTermBias: 'bullish' | 'bearish' | 'neutral' = 'neutral'
  let timeHorizon: 'short' | 'medium' | 'long' = 'medium'
  let confidenceLevel = 50
  let recommendedAction = 'Monitor for signal confirmation'

  if (majorBottomSignal) {
    longTermBias = 'bullish'
    timeHorizon = 'long'
    confidenceLevel = 85
    recommendedAction = 'Major bottom signal - consider long-term investment'
  } else if (value > 10) {
    longTermBias = 'bullish'
    timeHorizon = 'medium'
    confidenceLevel = 70
    recommendedAction = 'Positive momentum - favorable for long positions'
  } else if (value < -10) {
    longTermBias = 'bearish'
    timeHorizon = 'medium'
    confidenceLevel = 70
    recommendedAction = 'Negative momentum - consider defensive positions'
  } else if (value > 0) {
    longTermBias = 'bullish'
    timeHorizon = 'short'
    confidenceLevel = 60
    recommendedAction = 'Moderately bullish - watch for continuation'
  } else {
    longTermBias = 'bearish'
    timeHorizon = 'short'
    confidenceLevel = 60
    recommendedAction = 'Moderately bearish - consider reducing exposure'
  }

  return { longTermBias, timeHorizon, confidenceLevel, recommendedAction }
}

/**
 * Calculate Coppock Curve for different parameter sets
 * @param closes Array of closing prices
 * @param parameterSets Array of [roc1Period, roc2Period, wmaPeriod] combinations
 * @returns Array of CoppockCurveData objects
 */
export function calculateMultipleCoppock(
  closes: number[],
  parameterSets: Array<[number, number, number]> = [[14, 11, 10], [21, 14, 10]]
): CoppockCurveData[] {
  return parameterSets
    .map(([roc1Period, roc2Period, wmaPeriod]) =>
      calculateCoppockCurve(closes, roc1Period, roc2Period, wmaPeriod)
    )
    .filter((coppock): coppock is CoppockCurveData => coppock !== null)
}
