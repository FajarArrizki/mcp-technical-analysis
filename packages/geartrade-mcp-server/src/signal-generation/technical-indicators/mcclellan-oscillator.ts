/**
 * McClellan Oscillator
 * Market breadth indicator based on EMA of advancing minus declining stocks
 */

export interface McClellanOscillatorData {
  // McClellan Oscillator value
  oscillator: number

  // Ratio-adjusted advances
  ratioAdjustedAdvances: number

  // 19-period EMA of advances
  ema19: number

  // 39-period EMA of advances
  ema39: number

  // Trend direction
  trend: 'overbought' | 'bullish' | 'neutral' | 'bearish' | 'oversold'

  // Signal strength (0-100)
  strength: number

  // Overbought/oversold levels
  overbought: boolean  // Oscillator > 70
  oversold: boolean    // Oscillator < -70

  // Zero line signals
  bullishSignal: boolean  // Oscillator crosses above 0
  bearishSignal: boolean  // Oscillator crosses below 0

  // Trading signal
  signal: 'buy' | 'sell' | 'neutral'

  // Market breadth condition
  breadthCondition: 'extremely_bullish' | 'bullish' | 'neutral' | 'bearish' | 'extremely_bearish'
}

/**
 * Calculate McClellan Oscillator
 * @param advances Array of advancing stocks each period
 * @param declines Array of declining stocks each period
 * @returns McClellanOscillatorData object
 */
export function calculateMcClellanOscillator(
  advances: number[],
  declines: number[],
  fastPeriod: number = 19,
  slowPeriod: number = 39
): McClellanOscillatorData | null {
  if (advances.length !== declines.length || advances.length < slowPeriod) {
    return null
  }

  // Calculate ratio-adjusted advances: (advances - declines) / (advances + declines) * 1000
  const ratioAdjustedAdvances: number[] = []

  for (let i = 0; i < advances.length; i++) {
    const total = advances[i] + declines[i]
    const ratio = total > 0 ? ((advances[i] - declines[i]) / total) * 1000 : 0
    ratioAdjustedAdvances.push(ratio)
  }

  // Calculate EMAs
  const ema19 = calculateEMA(ratioAdjustedAdvances, fastPeriod)
  const ema39 = calculateEMA(ratioAdjustedAdvances, slowPeriod)

  if (!ema19 || !ema39) {
    return null
  }

  // Calculate McClellan Oscillator: 19-day EMA - 39-day EMA
  const oscillator = ema19 - ema39

  // Get current ratio-adjusted advances
  const currentRatio = ratioAdjustedAdvances[ratioAdjustedAdvances.length - 1]

  // Determine trend based on oscillator value
  let trend: 'overbought' | 'bullish' | 'neutral' | 'bearish' | 'oversold'

  if (oscillator > 70) {
    trend = 'overbought'
  } else if (oscillator > 0) {
    trend = 'bullish'
  } else if (oscillator > -70) {
    trend = 'neutral'
  } else {
    trend = 'oversold'
  }

  // Calculate signal strength
  const strength = Math.min(100, Math.abs(oscillator) / 2)

  // Check overbought/oversold levels
  const overbought = oscillator > 70
  const oversold = oscillator < -70

  // Check zero line crosses
  let bullishSignal = false
  let bearishSignal = false

  if (ratioAdjustedAdvances.length >= 40) {
    // Calculate previous oscillator
    const prevRatioAdjusted = ratioAdjustedAdvances.slice(0, -1)
    const prevEMA19 = calculateEMA(prevRatioAdjusted, 19)
    const prevEMA39 = calculateEMA(prevRatioAdjusted, 39)
    const prevOscillator = prevEMA19 && prevEMA39 ? prevEMA19 - prevEMA39 : 0

    if (prevOscillator !== null && prevOscillator <= 0 && oscillator > 0) {
      bullishSignal = true
    } else if (prevOscillator !== null && prevOscillator >= 0 && oscillator < 0) {
      bearishSignal = true
    }
  }

  // Generate trading signal
  let signal: 'buy' | 'sell' | 'neutral' = 'neutral'

  if (bullishSignal && !overbought) {
    signal = 'buy'
  } else if (bearishSignal && !oversold) {
    signal = 'sell'
  } else if (oversold) {
    signal = 'buy'
  } else if (overbought) {
    signal = 'sell'
  }

  // Determine market breadth condition
  let breadthCondition: 'extremely_bullish' | 'bullish' | 'neutral' | 'bearish' | 'extremely_bearish'

  if (oscillator > 100) {
    breadthCondition = 'extremely_bullish'
  } else if (oscillator > 20) {
    breadthCondition = 'bullish'
  } else if (oscillator > -20) {
    breadthCondition = 'neutral'
  } else if (oscillator > -100) {
    breadthCondition = 'bearish'
  } else {
    breadthCondition = 'extremely_bearish'
  }

  return {
    oscillator,
    ratioAdjustedAdvances: currentRatio,
    ema19,
    ema39,
    trend,
    strength,
    overbought,
    oversold,
    bullishSignal,
    bearishSignal,
    signal,
    breadthCondition
  }
}

/**
 * Helper function to calculate EMA
 */
function calculateEMA(values: number[], period: number): number {
  if (values.length < period) {
    return 0
  }

  const multiplier = 2 / (period + 1)
  let ema = values[0]

  for (let i = 1; i < values.length; i++) {
    ema = (values[i] - ema) * multiplier + ema
  }

  return ema
}

/**
 * Calculate McClellan Summation Index
 * @param advances Array of advancing stocks
 * @param declines Array of declining stocks
 * @returns McClellan Summation Index value
 */
export function calculateMcClellanSummation(
  advances: number[],
  declines: number[]
): number {
  if (advances.length !== declines.length) {
    return 0
  }

  const oscillator = calculateMcClellanOscillator(advances, declines)
  if (!oscillator) {
    return 0
  }

  // Summation is the cumulative sum of the oscillator
  // This is a simplified version - in practice, it would accumulate over time
  return oscillator.oscillator
}

/**
 * Get McClellan Oscillator interpretation
 * @param mco McClellanOscillatorData object
 * @returns Human-readable interpretation
 */
export function getMcClellanInterpretation(mco: McClellanOscillatorData): string {
  const { oscillator, trend, breadthCondition, bullishSignal, bearishSignal } = mco

  let interpretation = `McClellan Oscillator: ${oscillator.toFixed(2)}`

  if (bullishSignal) {
    interpretation += ' - Bullish zero line crossover'
  } else if (bearishSignal) {
    interpretation += ' - Bearish zero line crossover'
  } else {
    interpretation += ` - ${trend} (${breadthCondition.replace('_', ' ')})`
  }

  return interpretation
}

/**
 * Analyze McClellan Oscillator for market timing
 * @param advances Array of advancing stocks over time
 * @param declines Array of declining stocks over time
 * @returns Market timing analysis
 */
export function analyzeMcClellanTiming(
  advances: number[],
  declines: number[]
): {
  marketPhase: 'accumulation' | 'markup' | 'distribution' | 'markdown'
  timingSignal: 'buy' | 'sell' | 'hold'
  confidence: number
  recommendedAction: string
} {
  const oscillator = calculateMcClellanOscillator(advances, declines)

  if (!oscillator) {
    return {
      marketPhase: 'distribution',
      timingSignal: 'hold',
      confidence: 0,
      recommendedAction: 'Insufficient data'
    }
  }

  const { oscillator: value, breadthCondition } = oscillator

  // Determine market phase based on oscillator value
  let marketPhase: 'accumulation' | 'markup' | 'distribution' | 'markdown'
  let timingSignal: 'buy' | 'sell' | 'hold'
  let confidence: number
  let recommendedAction: string

  if (value > 50) {
    marketPhase = 'markup'
    timingSignal = 'buy'
    confidence = Math.min(80, value / 2)
    recommendedAction = 'Strong buying pressure - favorable for longs'
  } else if (value > 0) {
    marketPhase = 'accumulation'
    timingSignal = 'buy'
    confidence = 60
    recommendedAction = 'Moderate buying pressure - consider entry'
  } else if (value > -50) {
    marketPhase = 'distribution'
    timingSignal = 'hold'
    confidence = 50
    recommendedAction = 'Balanced market - wait for clearer signal'
  } else {
    marketPhase = 'markdown'
    timingSignal = 'sell'
    confidence = Math.min(80, Math.abs(value) / 2)
    recommendedAction = 'Strong selling pressure - consider shorts'
  }

  return {
    marketPhase,
    timingSignal,
    confidence,
    recommendedAction
  }
}

/**
 * Calculate McClellan Oscillator for multiple periods
 * @param advances Array of advancing stocks
 * @param declines Array of declining stocks
 * @returns Array of McClellanOscillatorData objects
 */
export function calculateMultipleMcClellan(
  advances: number[],
  declines: number[]
): McClellanOscillatorData[] {
  const oscillator = calculateMcClellanOscillator(advances, declines)
  return oscillator ? [oscillator] : []
}
