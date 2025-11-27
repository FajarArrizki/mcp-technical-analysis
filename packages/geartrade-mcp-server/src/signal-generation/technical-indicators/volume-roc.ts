/**
 * Volume Rate of Change (ROC) Indicator
 * Measures the percentage change in volume over a specified period
 */

export interface VolumeROCData {
  // Volume ROC value (%)
  roc: number

  // Current volume
  currentVolume: number

  // Previous volume (n periods ago)
  previousVolume: number

  // Period used for calculation
  period: number

  // Trend direction
  trend: 'increasing' | 'decreasing' | 'stable'

  // Signal strength (0-100)
  strength: number

  // Overbought/oversold levels
  overbought: boolean  // ROC > 50%
  oversold: boolean    // ROC < -50%

  // Zero line signals
  bullishSignal: boolean  // ROC crosses above 0
  bearishSignal: boolean  // ROC crosses below 0

  // Trading signal
  signal: 'buy' | 'sell' | 'neutral'

  // Volume momentum
  momentum: 'strong' | 'moderate' | 'weak'
}

/**
 * Calculate Volume Rate of Change
 * @param volumes Array of volume data
 * @param period Period for ROC calculation (default 12)
 * @returns VolumeROCData object
 */
export function calculateVolumeROC(
  volumes: number[],
  period: number = 12
): VolumeROCData | null {
  if (volumes.length < period + 1) {
    return null
  }

  const currentVolume = volumes[volumes.length - 1]
  const previousVolume = volumes[volumes.length - 1 - period]

  // Calculate ROC: ((Current - Previous) / Previous) * 100
  const roc = previousVolume > 0 ? ((currentVolume - previousVolume) / previousVolume) * 100 : 0

  // Determine trend
  let trend: 'increasing' | 'decreasing' | 'stable' = 'stable'
  if (roc > 10) {
    trend = 'increasing'
  } else if (roc < -10) {
    trend = 'decreasing'
  }

  // Calculate signal strength based on ROC magnitude
  const strength = Math.min(100, Math.abs(roc) * 2)

  // Check overbought/oversold levels
  const overbought = roc > 50
  const oversold = roc < -50

  // Check for zero line crossovers
  let bullishSignal = false
  let bearishSignal = false

  if (volumes.length >= period + 2) {
    const prevROC = calculateVolumeROC(volumes.slice(0, -1), period)

    if (prevROC) {
      if (roc > 0 && prevROC.roc <= 0) {
        bullishSignal = true
      } else if (roc < 0 && prevROC.roc >= 0) {
        bearishSignal = true
      }
    }
  }

  // Generate trading signal
  let signal: 'buy' | 'sell' | 'neutral' = 'neutral'

  if (bullishSignal && !overbought) {
    signal = 'buy'
  } else if (bearishSignal && !oversold) {
    signal = 'sell'
  } else if (overbought) {
    signal = 'sell'
  } else if (oversold) {
    signal = 'buy'
  }

  // Determine momentum
  let momentum: 'strong' | 'moderate' | 'weak' = 'weak'
  const absROC = Math.abs(roc)

  if (absROC > 100) {
    momentum = 'strong'
  } else if (absROC > 25) {
    momentum = 'moderate'
  }

  return {
    roc,
    currentVolume,
    previousVolume,
    period,
    trend,
    strength,
    overbought,
    oversold,
    bullishSignal,
    bearishSignal,
    signal,
    momentum
  }
}

/**
 * Calculate Volume ROC for multiple periods
 * @param volumes Array of volume data
 * @param periods Array of periods to calculate ROC for
 * @returns Array of VolumeROCData objects
 */
export function calculateMultipleVolumeROC(
  volumes: number[],
  periods: number[] = [12, 25, 50]
): VolumeROCData[] {
  return periods
    .map(period => calculateVolumeROC(volumes, period))
    .filter((roc): roc is VolumeROCData => roc !== null)
}

/**
 * Get Volume ROC interpretation
 * @param roc VolumeROCData object
 * @returns Human-readable interpretation
 */
export function getVolumeROCInterpretation(roc: VolumeROCData): string {
  const { roc: value, trend, overbought, oversold, bullishSignal, bearishSignal, momentum } = roc

  let interpretation = `Volume ROC (${roc.period}): ${value.toFixed(2)}%`

  if (bullishSignal) {
    interpretation += ' - Bullish zero line crossover'
  } else if (bearishSignal) {
    interpretation += ' - Bearish zero line crossover'
  } else if (overbought) {
    interpretation += ' - Volume overbought'
  } else if (oversold) {
    interpretation += ' - Volume oversold'
  } else {
    interpretation += ` - ${trend} volume trend`
  }

  interpretation += ` (${momentum} momentum)`

  return interpretation
}

/**
 * Calculate volume acceleration
 * @param roc VolumeROCData object
 * @param volumes Array of volume data
 * @returns Volume acceleration analysis
 */
export function calculateVolumeAcceleration(
  roc: VolumeROCData,
  volumes: number[]
): {
  acceleration: number
  interpretation: string
  signal: 'accelerating' | 'decelerating' | 'stable'
} {
  if (volumes.length < roc.period * 2) {
    return { acceleration: 0, interpretation: 'Insufficient data', signal: 'stable' }
  }

  // Calculate ROC of ROC (acceleration)
  const recentROC = calculateVolumeROC(volumes.slice(-roc.period * 2), roc.period)
  const olderROC = calculateVolumeROC(volumes.slice(-roc.period * 3, -roc.period), roc.period)

  if (!recentROC || !olderROC) {
    return { acceleration: 0, interpretation: 'Insufficient data', signal: 'stable' }
  }

  const acceleration = recentROC.roc - olderROC.roc

  let signal: 'accelerating' | 'decelerating' | 'stable' = 'stable'
  let interpretation: string

  if (acceleration > 10) {
    signal = 'accelerating'
    interpretation = 'Volume is accelerating - strong momentum building'
  } else if (acceleration < -10) {
    signal = 'decelerating'
    interpretation = 'Volume is decelerating - momentum weakening'
  } else {
    signal = 'stable'
    interpretation = 'Volume momentum is stable'
  }

  return { acceleration, interpretation, signal }
}

/**
 * Analyze volume trend consistency
 * @param volumes Array of volume data
 * @param periods Number of periods to analyze
 * @returns Volume trend analysis
 */
export function analyzeVolumeTrendConsistency(
  volumes: number[],
  periods: number = 20
): {
  overallTrend: 'increasing' | 'decreasing' | 'stable'
  trendStrength: number
  consistencyScore: number
  dominantPeriod: number
} {
  if (volumes.length < periods + 12) {
    return { overallTrend: 'stable', trendStrength: 0, consistencyScore: 0, dominantPeriod: 12 }
  }

  const rocData = calculateMultipleVolumeROC(volumes, [12, 25, 50])

  if (rocData.length === 0) {
    return { overallTrend: 'stable', trendStrength: 0, consistencyScore: 0, dominantPeriod: 12 }
  }

  // Analyze trend consistency across different periods
  let increasingCount = 0
  let decreasingCount = 0
  let totalStrength = 0
  let dominantPeriod = 12
  let maxStrength = 0

  for (const roc of rocData) {
    if (roc.trend === 'increasing') increasingCount++
    if (roc.trend === 'decreasing') decreasingCount++
    totalStrength += roc.strength

    if (roc.strength > maxStrength) {
      maxStrength = roc.strength
      dominantPeriod = roc.period
    }
  }

  const overallTrend: 'increasing' | 'decreasing' | 'stable' =
    increasingCount > decreasingCount ? 'increasing' :
    decreasingCount > increasingCount ? 'decreasing' : 'stable'

  const trendStrength = totalStrength / rocData.length
  const consistencyScore = Math.max(increasingCount, decreasingCount) / rocData.length * 100

  return { overallTrend, trendStrength, consistencyScore, dominantPeriod }
}
