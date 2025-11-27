/**
 * Schaff Trend Cycle (STC) Indicator
 * Combines MACD with Stochastic oscillator and double smoothing for early trend signals
 */

export interface SchaffTrendCycleData {
  // STC value (0-100)
  stc: number

  // MACD components used in calculation
  macd: number
  macdSignal: number
  histogram: number

  // Cycle position
  cyclePosition: 'bottom' | 'rising' | 'top' | 'falling' | 'middle'

  // Trend direction
  trend: 'bullish' | 'bearish' | 'neutral'

  // Overbought/oversold levels
  overbought: boolean  // STC > 75
  oversold: boolean    // STC < 25

  // Signal strength (0-100)
  strength: number

  // Cycle signals
  bullishCycleSignal: boolean  // STC crosses above 25
  bearishCycleSignal: boolean  // STC crosses below 75

  // Trading signal
  tradingSignal: 'buy' | 'sell' | 'neutral'

  // Cycle length estimation
  estimatedCycleLength: number | null
}

/**
 * Calculate Schaff Trend Cycle
 * @param highs Array of high prices
 * @param lows Array of low prices
 * @param closes Array of close prices
 * @param cycleLength Cycle length for MACD (default 23)
 * @param fastLength Fast EMA length (default 23)
 * @param slowLength Slow EMA length (default 50)
 * @param kPeriod Stochastic K period (default 10)
 * @param dPeriod Stochastic D period (default 3)
 * @returns SchaffTrendCycleData object
 */
export function calculateSchaffTrendCycle(
  highs: number[],
  lows: number[],
  closes: number[],
  cycleLength: number = 23,
  fastLength: number = 23,
  slowLength: number = 50,
  kPeriod: number = 10,
  dPeriod: number = 3
): SchaffTrendCycleData | null {
  if (closes.length < slowLength + kPeriod + dPeriod) {
    return null
  }

  // Step 1: Calculate MACD
  const macdData = calculateMACD(closes, fastLength, slowLength, cycleLength)

  if (!macdData || macdData.length === 0) {
    return null
  }

  // Get the latest MACD values
  const latestMACD = macdData[macdData.length - 1]
  const macd = latestMACD.MACD
  const signal = latestMACD.signal
  const histogram = latestMACD.histogram

  // Step 2: Calculate Stochastic of MACD (cycle within a cycle)
  // Find highest high and lowest low of MACD over kPeriod
  const macdValues = macdData.map(m => m.MACD)
  const recentMACD = macdValues.slice(-kPeriod)

  const highestMACD = Math.max(...recentMACD)
  const lowestMACD = Math.min(...recentMACD)
  const macdRange = highestMACD - lowestMACD

  // Calculate %K: (MACD - Lowest MACD) / (Highest MACD - Lowest MACD) * 100
  const k = macdRange > 0 ? ((macd - lowestMACD) / macdRange) * 100 : 50

  // Step 3: Smooth %K with simple moving average to get %D
  let d: number
  if (macdValues.length >= kPeriod + dPeriod - 1) {
    const kValues: number[] = []

    // Calculate %K for the last dPeriod values
    for (let i = Math.max(0, macdValues.length - kPeriod - dPeriod + 1); i < macdValues.length; i++) {
      const slice = macdValues.slice(Math.max(0, i - kPeriod + 1), i + 1)
      const highest = Math.max(...slice)
      const lowest = Math.min(...slice)
      const range = highest - lowest
      const kVal = range > 0 ? ((macdValues[i] - lowest) / range) * 100 : 50
      kValues.push(kVal)
    }

    // Calculate SMA of %K values for %D
    const recentK = kValues.slice(-dPeriod)
    d = recentK.reduce((sum, val) => sum + val, 0) / recentK.length
  } else {
    d = k // Fallback if not enough data
  }

  // Step 4: Apply double smoothing (cycle within a cycle)
  // The STC uses double smoothing of the %D value
  const stc = d // In the simplified version, we use %D as STC

  // Determine cycle position
  let cyclePosition: 'bottom' | 'rising' | 'top' | 'falling' | 'middle' = 'middle'
  if (stc < 25) {
    cyclePosition = 'bottom'
  } else if (stc > 75) {
    cyclePosition = 'top'
  } else if (stc > 50) {
    cyclePosition = 'falling'
  } else if (stc < 50) {
    cyclePosition = 'rising'
  }

  // Determine trend
  let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral'
  if (stc > 50) {
    trend = 'bearish'
  } else if (stc < 50) {
    trend = 'bullish'
  }

  // Check overbought/oversold
  const overbought = stc > 75
  const oversold = stc < 25

  // Calculate signal strength
  const strength = Math.min(100, Math.abs(stc - 50) * 2)

  // Check for cycle signals
  let bullishCycleSignal = false
  let bearishCycleSignal = false

  if (macdValues.length >= 2) {
    const prevSTC = calculateSTCForPeriod(highs.slice(0, -1), lows.slice(0, -1), closes.slice(0, -1))

    if (prevSTC && prevSTC.stc <= 25 && stc > 25) {
      bullishCycleSignal = true
    } else if (prevSTC && prevSTC.stc >= 75 && stc < 75) {
      bearishCycleSignal = true
    }
  }

  // Generate trading signal
  let signal_out: 'buy' | 'sell' | 'neutral' = 'neutral'

  if (bullishCycleSignal) {
    signal_out = 'buy'
  } else if (bearishCycleSignal) {
    signal_out = 'sell'
  } else if (oversold && trend === 'bullish') {
    signal_out = 'buy'
  } else if (overbought && trend === 'bearish') {
    signal_out = 'sell'
  }

  // Estimate cycle length (simplified)
  const estimatedCycleLength = estimateCycleLength(macdValues)

  return {
    stc,
    macd,
    macdSignal: signal,
    histogram,
    cyclePosition,
    trend,
    overbought,
    oversold,
    strength,
    bullishCycleSignal,
    bearishCycleSignal,
    tradingSignal: signal_out,
    estimatedCycleLength
  }
}

/**
 * Helper function to calculate MACD
 */
function calculateMACD(
  closes: number[],
  fastLength: number,
  slowLength: number,
  signalLength: number
): Array<{ MACD: number; signal: number; histogram: number }> | null {
  if (closes.length < slowLength) {
    return null
  }

  const fastEMA = calculateEMA(closes, fastLength)
  const slowEMA = calculateEMA(closes, slowLength)

  if (!fastEMA || !slowEMA) {
    return null
  }

  const macdLine: number[] = []
  for (let i = 0; i < fastEMA.length; i++) {
    if (slowEMA[i] !== undefined) {
      macdLine.push(fastEMA[i] - slowEMA[i])
    }
  }

  const signalLine = calculateEMA(macdLine, signalLength)

  if (!signalLine) {
    return null
  }

  const result: Array<{ MACD: number; signal: number; histogram: number }> = []

  for (let i = 0; i < macdLine.length; i++) {
    if (signalLine[i] !== undefined) {
      result.push({
        MACD: macdLine[i],
        signal: signalLine[i],
        histogram: macdLine[i] - signalLine[i]
      })
    }
  }

  return result
}

/**
 * Helper function to calculate EMA
 */
function calculateEMA(values: number[], period: number): number[] {
  if (values.length < period) {
    return []
  }

  const ema: number[] = []
  const multiplier = 2 / (period + 1)

  // First EMA value
  ema.push(values[0])

  // Calculate subsequent values
  for (let i = 1; i < values.length; i++) {
    const currentEMA = (values[i] - ema[ema.length - 1]) * multiplier + ema[ema.length - 1]
    ema.push(currentEMA)
  }

  return ema
}

/**
 * Helper function to calculate STC for a specific period
 */
function calculateSTCForPeriod(
  highs: number[],
  lows: number[],
  closes: number[]
): SchaffTrendCycleData | null {
  return calculateSchaffTrendCycle(highs, lows, closes)
}

/**
 * Helper function to estimate cycle length
 */
function estimateCycleLength(macdValues: number[]): number | null {
  if (macdValues.length < 20) {
    return null
  }

  // Find zero crossings to estimate cycle length
  const zeroCrossings: number[] = []

  for (let i = 1; i < macdValues.length; i++) {
    if ((macdValues[i - 1] <= 0 && macdValues[i] > 0) ||
        (macdValues[i - 1] >= 0 && macdValues[i] < 0)) {
      zeroCrossings.push(i)
    }
  }

  if (zeroCrossings.length < 2) {
    return null
  }

  // Calculate average distance between zero crossings
  let totalDistance = 0
  for (let i = 1; i < zeroCrossings.length; i++) {
    totalDistance += zeroCrossings[i] - zeroCrossings[i - 1]
  }

  return totalDistance / (zeroCrossings.length - 1)
}

/**
 * Get STC interpretation
 * @param stc SchaffTrendCycleData object
 * @returns Human-readable interpretation
 */
export function getSTCInterpretation(stc: SchaffTrendCycleData): string {
  const { stc: value, cyclePosition, bullishCycleSignal, bearishCycleSignal, trend } = stc

  let interpretation = `STC: ${value.toFixed(2)}`

  if (bullishCycleSignal) {
    interpretation += ' - Bullish cycle signal'
  } else if (bearishCycleSignal) {
    interpretation += ' - Bearish cycle signal'
  } else {
    interpretation += ` - ${cyclePosition} of cycle, ${trend} trend`
  }

  return interpretation
}

/**
 * Calculate STC cycle analysis
 * @param stc SchaffTrendCycleData object
 * @returns Cycle analysis
 */
export function analyzeSTCCycle(stc: SchaffTrendCycleData): {
  cyclePhase: 'early' | 'middle' | 'late'
  trendReliability: number
  nextMove: 'up' | 'down' | 'sideways'
  timeToPeak: number | null
} {
  const { stc: value, cyclePosition, estimatedCycleLength } = stc

  let cyclePhase: 'early' | 'middle' | 'late' = 'middle'
  let trendReliability = 50
  let nextMove: 'up' | 'down' | 'sideways' = 'sideways'
  let timeToPeak: number | null = null

  if (value < 30) {
    cyclePhase = 'early'
    nextMove = 'up'
    trendReliability = 70
  } else if (value > 70) {
    cyclePhase = 'late'
    nextMove = 'down'
    trendReliability = 70
  } else if (value > 45 && value < 55) {
    nextMove = 'sideways'
    trendReliability = 30
  }

  // Estimate time to peak/trough
  if (estimatedCycleLength && cyclePhase === 'early') {
    timeToPeak = Math.round(estimatedCycleLength * (50 - value) / 50)
  } else if (estimatedCycleLength && cyclePhase === 'late') {
    timeToPeak = Math.round(estimatedCycleLength * (value - 50) / 50)
  }

  return { cyclePhase, trendReliability, nextMove, timeToPeak }
}
