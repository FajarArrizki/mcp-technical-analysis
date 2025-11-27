/**
 * Accumulation/Distribution Line (A/D Line) Indicator
 * Cumulative measure of money flow based on price position within range
 */

export interface ADLineData {
  adLine: number | null
  trend: 'accumulation' | 'distribution' | 'neutral' | null
}

export function calculateADLine(
  highs: number[],
  lows: number[],
  closes: number[],
  volumes: number[]
): ADLineData {
  if (highs.length === 0 || lows.length === 0 || closes.length === 0 || volumes.length === 0) {
    return {
      adLine: null,
      trend: null,
    }
  }

  let adLine = 0
  let previousAD = 0

  // Calculate A/D Line cumulatively
  for (let i = 0; i < closes.length; i++) {
    const high = highs[i]
    const low = lows[i]
    const close = closes[i]
    const volume = volumes[i] || 0

    // Avoid division by zero
    if (high === low) {
      adLine = previousAD // No change if no range
    } else {
      // Money Flow Multiplier = ((Close - Low) - (High - Close)) / (High - Low)
      const moneyFlowMultiplier = ((close - low) - (high - close)) / (high - low)
      const moneyFlowVolume = moneyFlowMultiplier * volume
      adLine = previousAD + moneyFlowVolume
    }

    previousAD = adLine
  }

  // Determine trend based on recent movement (simplified)
  let trend: 'accumulation' | 'distribution' | 'neutral' | null = null

  // Calculate trend based on slope of recent A/D values
  if (closes.length >= 10) {
    const recentAD = adLine
    const pastAD = closes.length >= 20
      ? calculateADLine(highs.slice(0, -10), lows.slice(0, -10), closes.slice(0, -10), volumes.slice(0, -10)).adLine || 0
      : 0

    const change = recentAD - pastAD
    if (change > Math.abs(adLine) * 0.01) trend = 'accumulation' // Significant upward movement
    else if (change < -Math.abs(adLine) * 0.01) trend = 'distribution' // Significant downward movement
    else trend = 'neutral'
  }

  return {
    adLine,
    trend,
  }
}
