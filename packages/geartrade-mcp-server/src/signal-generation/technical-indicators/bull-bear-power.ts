/**
 * Bull Bear Power Indicator
 * Measures the strength of bulls vs bears using price action and volume
 */

export interface BullBearPowerData {
  // Bull Power: (High - Previous Close) / Previous Close * 100
  bullPower: number

  // Bear Power: (Low - Previous Close) / Previous Close * 100
  bearPower: number

  // Net Power: Bull Power - Bear Power
  netPower: number

  // Power Ratio: Bull Power / |Bear Power|
  powerRatio: number

  // Trend direction based on power balance
  trend: 'bullish' | 'bearish' | 'neutral'

  // Strength of the dominant force (0-100)
  strength: number

  // Current market pressure
  pressure: 'strong_bull' | 'bull' | 'balanced' | 'bear' | 'strong_bear'

  // Volume confirmation
  volumeConfirmed: boolean

  // Signal
  signal: 'buy' | 'sell' | 'neutral'
}

/**
 * Calculate Bull Bear Power
 * @param highs Array of high prices
 * @param lows Array of low prices
 * @param closes Array of close prices
 * @param volumes Array of volume data (optional for confirmation)
 * @returns BullBearPowerData object
 */
export function calculateBullBearPower(
  highs: number[],
  lows: number[],
  closes: number[],
  volumes?: number[]
): BullBearPowerData | null {
  // Validate input arrays
  if (!Array.isArray(highs) || !Array.isArray(lows) || !Array.isArray(closes)) {
    return null
  }

  if (highs.length < 2 || lows.length < 2 || closes.length < 2) {
    return null
  }

  // Ensure arrays are same length
  const minLength = Math.min(highs.length, lows.length, closes.length)
  if (minLength < 2) {
    return null
  }

  // Get current and previous data from the end of arrays
  const currentHigh = highs[highs.length - 1]
  const currentLow = lows[lows.length - 1]
  const currentClose = closes[closes.length - 1]
  const previousClose = closes[closes.length - 2]

  // Validate all values are finite numbers
  if (!isFinite(currentHigh) || !isFinite(currentLow) || 
      !isFinite(currentClose) || !isFinite(previousClose) || previousClose === 0) {
    return null
  }

  // Calculate Bull Power and Bear Power
  const bullPower = ((currentHigh - previousClose) / previousClose) * 100
  const bearPower = ((currentLow - previousClose) / previousClose) * 100
  const netPower = bullPower - bearPower

  // Calculate power ratio (avoid division by zero)
  const powerRatio = bearPower !== 0 ? bullPower / Math.abs(bearPower) : bullPower > 0 ? 2 : -2

  // Determine trend based on power balance
  let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral'
  if (bullPower > Math.abs(bearPower) * 0.7) {
    trend = 'bullish'
  } else if (Math.abs(bearPower) > bullPower * 0.7) {
    trend = 'bearish'
  }

  // Calculate strength
  const maxPower = Math.max(Math.abs(bullPower), Math.abs(bearPower))
  const strength = Math.min(100, maxPower * 10)

  // Determine pressure level
  let pressure: 'strong_bull' | 'bull' | 'balanced' | 'bear' | 'strong_bear' = 'balanced'
  if (powerRatio > 2) {
    pressure = 'strong_bull'
  } else if (powerRatio > 1) {
    pressure = 'bull'
  } else if (powerRatio < -2) {
    pressure = 'strong_bear'
  } else if (powerRatio < -1) {
    pressure = 'bear'
  }

  // Volume confirmation (if volume data is provided)
  let volumeConfirmed = false
  if (volumes && volumes.length >= 2) {
    const currentVolume = volumes[volumes.length - 1]
    const previousVolume = volumes[volumes.length - 2]

    // Volume should confirm the direction
    if (trend === 'bullish' && currentVolume > previousVolume * 0.9) {
      volumeConfirmed = true
    } else if (trend === 'bearish' && currentVolume > previousVolume * 0.9) {
      volumeConfirmed = true
    }
  } else {
    // If no volume data, consider it confirmed
    volumeConfirmed = true
  }

  // Generate signal
  let signal: 'buy' | 'sell' | 'neutral' = 'neutral'
  if (trend === 'bullish' && volumeConfirmed && strength > 20) {
    signal = 'buy'
  } else if (trend === 'bearish' && volumeConfirmed && strength > 20) {
    signal = 'sell'
  }

  return {
    bullPower,
    bearPower,
    netPower,
    powerRatio,
    trend,
    strength,
    pressure,
    volumeConfirmed,
    signal
  }
}

/**
 * Calculate Bull Bear Power for multiple periods
 * @param highs Array of high prices
 * @param lows Array of low prices
 * @param closes Array of close prices
 * @param volumes Array of volume data (optional)
 * @param period Number of periods to calculate
 * @returns Array of BullBearPowerData objects
 */
export function calculateBullBearPowerSeries(
  highs: number[],
  lows: number[],
  closes: number[],
  volumes?: number[],
  period: number = 14
): BullBearPowerData[] {
  const results: BullBearPowerData[] = []

  for (let i = 1; i <= Math.min(period, highs.length - 1); i++) {
    const sliceHighs = highs.slice(-i - 1)
    const sliceLows = lows.slice(-i - 1)
    const sliceCloses = closes.slice(-i - 1)
    const sliceVolumes = volumes ? volumes.slice(-i - 1) : undefined

    const result = calculateBullBearPower(sliceHighs, sliceLows, sliceCloses, sliceVolumes)
    if (result) {
      results.unshift(result) // Add to beginning to maintain chronological order
    }
  }

  return results
}

/**
 * Get Bull Bear Power trend strength analysis
 * @param data Array of BullBearPowerData
 * @returns Trend analysis
 */
export function analyzeBullBearPowerTrend(data: BullBearPowerData[]): {
  overallTrend: 'bullish' | 'bearish' | 'neutral'
  trendStrength: number
  consistency: number
} {
  if (data.length === 0) {
    return { overallTrend: 'neutral', trendStrength: 0, consistency: 0 }
  }

  let bullishCount = 0
  let bearishCount = 0
  let totalStrength = 0

  for (const item of data) {
    if (item.trend === 'bullish') bullishCount++
    if (item.trend === 'bearish') bearishCount++
    totalStrength += item.strength
  }

  const overallTrend: 'bullish' | 'bearish' | 'neutral' =
    bullishCount > bearishCount * 1.5 ? 'bullish' :
    bearishCount > bullishCount * 1.5 ? 'bearish' : 'neutral'

  const trendStrength = totalStrength / data.length
  const consistency = Math.max(bullishCount, bearishCount) / data.length * 100

  return { overallTrend, trendStrength, consistency }
}
