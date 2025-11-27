/**
 * Volume Oscillator
 * Compares short-term and long-term volume moving averages to identify volume trends
 */

export interface VolumeOscillatorData {
  // Volume Oscillator value (%)
  oscillator: number

  // Short-term volume MA
  shortMA: number

  // Long-term volume MA
  longMA: number

  // Volume trend
  trend: 'increasing' | 'decreasing' | 'stable'

  // Signal strength (0-100)
  strength: number

  // Overbought/oversold levels
  overbought: boolean  // VO > 10%
  oversold: boolean    // VO < -10%

  // Zero line signals
  bullishSignal: boolean  // VO crosses above 0
  bearishSignal: boolean  // VO crosses below 0

  // Trading signal
  signal: 'buy' | 'sell' | 'neutral'

  // Volume momentum
  momentum: 'strong' | 'moderate' | 'weak'
}

/**
 * Calculate Volume Oscillator
 * @param volumes Array of volume data
 * @param shortPeriod Short-term MA period (default 14)
 * @param longPeriod Long-term MA period (default 28)
 * @returns VolumeOscillatorData object
 */
export function calculateVolumeOscillator(
  volumes: number[],
  shortPeriod: number = 14,
  longPeriod: number = 28
): VolumeOscillatorData | null {
  if (volumes.length < longPeriod) {
    return null
  }

  // Calculate short-term MA
  const shortMA = volumes.slice(-shortPeriod).reduce((sum, vol) => sum + vol, 0) / shortPeriod

  // Calculate long-term MA
  const longMA = volumes.slice(-longPeriod).reduce((sum, vol) => sum + vol, 0) / longPeriod

  // Volume Oscillator = ((Short MA - Long MA) / Long MA) * 100
  const oscillator = longMA > 0 ? ((shortMA - longMA) / longMA) * 100 : 0

  // Determine volume trend
  let trend: 'increasing' | 'decreasing' | 'stable' = 'stable'
  if (oscillator > 2) {
    trend = 'increasing'
  } else if (oscillator < -2) {
    trend = 'decreasing'
  }

  // Calculate signal strength based on oscillator magnitude
  const strength = Math.min(100, Math.abs(oscillator) * 5)

  // Check overbought/oversold levels
  const overbought = oscillator > 10
  const oversold = oscillator < -10

  // Check for zero line crossovers
  let bullishSignal = false
  let bearishSignal = false

  if (volumes.length >= longPeriod + 1) {
    const prevVolumes = volumes.slice(-longPeriod - 1, -1)
    const prevOscillator = calculateVolumeOscillator(prevVolumes, shortPeriod, longPeriod)

    if (prevOscillator) {
      if (oscillator > 0 && prevOscillator.oscillator <= 0) {
        bullishSignal = true
      } else if (oscillator < 0 && prevOscillator.oscillator >= 0) {
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

  // Determine volume momentum
  let momentum: 'strong' | 'moderate' | 'weak' = 'weak'
  if (Math.abs(oscillator) > 15) {
    momentum = 'strong'
  } else if (Math.abs(oscillator) > 5) {
    momentum = 'moderate'
  }

  return {
    oscillator,
    shortMA,
    longMA,
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
 * Calculate Volume Oscillator for multiple period combinations
 * @param volumes Array of volume data
 * @param periodCombos Array of [shortPeriod, longPeriod] combinations
 * @returns Array of VolumeOscillatorData objects
 */
export function calculateMultipleVolumeOscillators(
  volumes: number[],
  periodCombos: Array<[number, number]> = [[14, 28], [5, 10], [21, 42]]
): VolumeOscillatorData[] {
  return periodCombos
    .map(([shortPeriod, longPeriod]) => calculateVolumeOscillator(volumes, shortPeriod, longPeriod))
    .filter((vo): vo is VolumeOscillatorData => vo !== null)
}

/**
 * Get Volume Oscillator interpretation
 * @param vo VolumeOscillatorData object
 * @returns Human-readable interpretation
 */
export function getVolumeOscillatorInterpretation(vo: VolumeOscillatorData): string {
  const { oscillator, trend, overbought, oversold, bullishSignal, bearishSignal, momentum } = vo

  let interpretation = `Volume Oscillator: ${oscillator.toFixed(2)}%`

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
 * Analyze volume trend consistency
 * @param volumes Array of volume data
 * @param period Number of periods to analyze
 * @returns Volume trend analysis
 */
export function analyzeVolumeTrend(
  volumes: number[],
  period: number = 20
): {
  overallTrend: 'increasing' | 'decreasing' | 'stable'
  trendStrength: number
  consistency: number
} {
  if (volumes.length < period) {
    return { overallTrend: 'stable', trendStrength: 0, consistency: 0 }
  }

  const voData = calculateMultipleVolumeOscillators(volumes, [[5, 10], [14, 28], [21, 42]])

  if (voData.length === 0) {
    return { overallTrend: 'stable', trendStrength: 0, consistency: 0 }
  }

  // Average trend across different periods
  let increasingCount = 0
  let decreasingCount = 0
  let totalStrength = 0

  for (const vo of voData) {
    if (vo.trend === 'increasing') increasingCount++
    if (vo.trend === 'decreasing') decreasingCount++
    totalStrength += vo.strength
  }

  const overallTrend: 'increasing' | 'decreasing' | 'stable' =
    increasingCount > decreasingCount ? 'increasing' :
    decreasingCount > increasingCount ? 'decreasing' : 'stable'

  const trendStrength = totalStrength / voData.length
  const consistency = Math.max(increasingCount, decreasingCount) / voData.length * 100

  return { overallTrend, trendStrength, consistency }
}

/**
 * Calculate volume breakout signal
 * @param vo VolumeOscillatorData object
 * @param threshold Breakout threshold (%)
 * @returns Whether volume is breaking out
 */
export function getVolumeBreakoutSignal(
  vo: VolumeOscillatorData,
  threshold: number = 20
): 'breakout' | 'breakdown' | 'none' {
  if (vo.oscillator > threshold) {
    return 'breakout'
  } else if (vo.oscillator < -threshold) {
    return 'breakdown'
  }

  return 'none'
}
