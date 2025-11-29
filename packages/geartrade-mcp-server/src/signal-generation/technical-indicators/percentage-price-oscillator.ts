/**
 * Percentage Price Oscillator (PPO) Indicator
 * MACD expressed as a percentage for better comparability across assets
 */

export interface PercentagePriceOscillatorData {
  // PPO value (%)
  ppo: number

  // Signal line (EMA of PPO)
  signalLine: number

  // PPO histogram
  histogram: number

  // Trend direction
  trend: 'bullish' | 'bearish' | 'neutral'

  // Signal strength (0-100)
  strength: number

  // Crossover signals
  bullishCrossover: boolean  // PPO crosses above signal
  bearishCrossover: boolean  // PPO crosses below signal

  // Zero line signals
  bullishZeroCross: boolean  // PPO crosses above 0
  bearishZeroCross: boolean  // PPO crosses below 0

  // Divergence detection
  divergence: 'bullish' | 'bearish' | 'none'

  // Trading signal
  tradingSignal: 'buy' | 'sell' | 'neutral'
}

/**
 * Calculate Percentage Price Oscillator
 * @param closes Array of closing prices
 * @param fastPeriod Fast EMA period (default 12)
 * @param slowPeriod Slow EMA period (default 26)
 * @param signalPeriod Signal line period (default 9)
 * @returns PercentagePriceOscillatorData object
 */
export function calculatePercentagePriceOscillator(
  closes: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): PercentagePriceOscillatorData | null {
  if (closes.length < slowPeriod + signalPeriod) {
    return null
  }

  // Calculate fast and slow EMAs
  const fastEMA = calculateEMA(closes, fastPeriod)
  const slowEMA = calculateEMA(closes, slowPeriod)

  if (!fastEMA || !slowEMA || fastEMA.length === 0 || slowEMA.length === 0) {
    return null
  }

  // Calculate PPO: ((Fast EMA - Slow EMA) / Slow EMA) * 100
  // Use the last values from each EMA array
  const lastFastEMA = fastEMA[fastEMA.length - 1]
  const lastSlowEMA = slowEMA[slowEMA.length - 1]
  
  if (lastSlowEMA === 0) {
    return null
  }
  
  const ppo = ((lastFastEMA - lastSlowEMA) / lastSlowEMA) * 100

  // Calculate signal line (EMA of PPO values)
  const ppoHistory = calculatePPOHistory(closes, fastPeriod, slowPeriod)
  const signalValues = calculateEMA(ppoHistory, signalPeriod)

  if (!signalValues || signalValues.length === 0) {
    return null
  }

  // Get the most recent signal value
  const signal = signalValues[signalValues.length - 1]

  // Calculate histogram
  const histogram = ppo - signal

  // Determine trend
  let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral'
  if (ppo > 0) {
    trend = 'bullish'
  } else if (ppo < 0) {
    trend = 'bearish'
  }

  // Calculate signal strength based on PPO magnitude
  const strength = Math.min(100, Math.abs(ppo) * 10)

  // Check for crossovers
  let bullishCrossover = false
  let bearishCrossover = false

  if (ppoHistory.length >= signalPeriod + 1 && signal) {
    const prevPPO = ppoHistory[ppoHistory.length - 2]
    const prevSignalValues = calculateEMA(ppoHistory.slice(0, -1), signalPeriod)
    const prevSignal = prevSignalValues ? prevSignalValues[prevSignalValues.length - 1] : null

    if (prevSignal !== null && prevPPO <= prevSignal && ppo > signal) {
      bullishCrossover = true
    } else if (prevSignal !== null && prevPPO >= prevSignal && ppo < signal) {
      bearishCrossover = true
    }
  }

  // Check zero line crosses
  let bullishZeroCross = false
  let bearishZeroCross = false

  if (ppoHistory.length >= 2) {
    const prevPPO = ppoHistory[ppoHistory.length - 2]

    if (prevPPO <= 0 && ppo > 0) {
      bullishZeroCross = true
    } else if (prevPPO >= 0 && ppo < 0) {
      bearishZeroCross = true
    }
  }

  // Simple divergence detection
  let divergence: 'bullish' | 'bearish' | 'none' = 'none'

  if (closes.length >= 30 && ppoHistory.length >= 15) {
    const recentPrices = closes.slice(-15)
    const recentPPO = ppoHistory.slice(-15)

    // Check for price peak vs PPO peak divergence
    const pricePeak = Math.max(...recentPrices)
    const ppoPeak = Math.max(...recentPPO)
    const pricePeakIndex = recentPrices.indexOf(pricePeak)
    const ppoPeakIndex = recentPPO.indexOf(ppoPeak)

    // Bullish divergence: price makes lower peak but PPO makes higher peak
    if (pricePeakIndex > 7 && ppoPeakIndex > 7) { // Recent peaks
      const olderPricePeak = Math.max(...recentPrices.slice(0, 7))
      const olderPPOPeak = Math.max(...recentPPO.slice(0, 7))

      if (pricePeak < olderPricePeak && ppoPeak > olderPPOPeak) {
        divergence = 'bullish'
      } else if (pricePeak > olderPricePeak && ppoPeak < olderPPOPeak) {
        divergence = 'bearish'
      }
    }
  }

  // Generate trading signal
  let signal_out: 'buy' | 'sell' | 'neutral' = 'neutral'

  if (bullishCrossover || bullishZeroCross) {
    signal_out = 'buy'
  } else if (bearishCrossover || bearishZeroCross) {
    signal_out = 'sell'
  } else if (divergence === 'bullish') {
    signal_out = 'buy'
  } else if (divergence === 'bearish') {
    signal_out = 'sell'
  }

  return {
    ppo,
    signalLine: signal,
    histogram,
    trend,
    strength,
    bullishCrossover,
    bearishCrossover,
    bullishZeroCross,
    bearishZeroCross,
    divergence,
    tradingSignal: signal_out
  }
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

  // First EMA value is the simple average
  let sum = 0
  for (let i = 0; i < period; i++) {
    sum += values[i]
  }
  ema.push(sum / period)

  // Calculate subsequent EMA values
  for (let i = period; i < values.length; i++) {
    const currentEMA = (values[i] - ema[ema.length - 1]) * multiplier + ema[ema.length - 1]
    ema.push(currentEMA)
  }

  return ema
}

/**
 * Helper function to calculate PPO history (non-recursive)
 */
function calculatePPOHistory(closes: number[], fastPeriod: number, slowPeriod: number): number[] {
  const ppoValues: number[] = []

  // Start from where we have enough data
  for (let i = slowPeriod; i <= closes.length; i++) {
    const slice = closes.slice(0, i)
    
    // Calculate PPO directly without recursion
    const fastEMA = calculateEMA(slice, fastPeriod)
    const slowEMA = calculateEMA(slice, slowPeriod)
    
    if (fastEMA.length > 0 && slowEMA.length > 0 && slowEMA[slowEMA.length - 1] !== 0) {
      const ppo = ((fastEMA[fastEMA.length - 1] - slowEMA[slowEMA.length - 1]) / slowEMA[slowEMA.length - 1]) * 100
      ppoValues.push(ppo)
    }
  }

  return ppoValues
}

/**
 * Calculate PPO for multiple parameter combinations
 * @param closes Array of closing prices
 * @param parameterSets Array of [fastPeriod, slowPeriod, signalPeriod] combinations
 * @returns Array of PercentagePriceOscillatorData objects
 */
export function calculateMultiplePPO(
  closes: number[],
  parameterSets: Array<[number, number, number]> = [[12, 26, 9], [5, 13, 5]]
): PercentagePriceOscillatorData[] {
  return parameterSets
    .map(([fastPeriod, slowPeriod, signalPeriod]) =>
      calculatePercentagePriceOscillator(closes, fastPeriod, slowPeriod, signalPeriod)
    )
    .filter((ppo): ppo is PercentagePriceOscillatorData => ppo !== null)
}

/**
 * Get PPO interpretation
 * @param ppo PercentagePriceOscillatorData object
 * @returns Human-readable interpretation
 */
export function getPPOInterpretation(ppo: PercentagePriceOscillatorData): string {
  const {
    ppo: value,
    bullishCrossover,
    bearishCrossover,
    bullishZeroCross,
    bearishZeroCross,
    divergence,
    histogram
  } = ppo

  let interpretation = `PPO: ${value.toFixed(2)}%`

  if (bullishCrossover) {
    interpretation += ' - Bullish signal crossover'
  } else if (bearishCrossover) {
    interpretation += ' - Bearish signal crossover'
  } else if (bullishZeroCross) {
    interpretation += ' - Bullish zero line crossover'
  } else if (bearishZeroCross) {
    interpretation += ' - Bearish zero line crossover'
  } else {
    interpretation += ` - Histogram: ${histogram.toFixed(4)}`
  }

  if (divergence !== 'none') {
    interpretation += ` - ${divergence} divergence`
  }

  return interpretation
}

/**
 * Calculate PPO momentum strength
 * @param ppo PercentagePriceOscillatorData object
 * @returns Momentum strength analysis
 */
export function calculatePPOMomentumStrength(ppo: PercentagePriceOscillatorData): {
  momentumStrength: number
  trendReliability: number
  signalQuality: 'excellent' | 'good' | 'fair' | 'poor'
} {
  const { strength, bullishCrossover, bearishCrossover, divergence } = ppo

  let momentumStrength = strength
  let trendReliability = 50

  // Boost strength for crossovers and divergences
  if (bullishCrossover || bearishCrossover) {
    momentumStrength += 20
    trendReliability += 25
  }

  if (divergence !== 'none') {
    momentumStrength += 15
    trendReliability += 20
  }

  momentumStrength = Math.min(100, momentumStrength)
  trendReliability = Math.min(100, trendReliability)

  let signalQuality: 'excellent' | 'good' | 'fair' | 'poor' = 'fair'
  if (momentumStrength > 80 && trendReliability > 80) {
    signalQuality = 'excellent'
  } else if (momentumStrength > 60 && trendReliability > 60) {
    signalQuality = 'good'
  } else if (momentumStrength < 30 || trendReliability < 30) {
    signalQuality = 'poor'
  }

  return { momentumStrength, trendReliability, signalQuality }
}
