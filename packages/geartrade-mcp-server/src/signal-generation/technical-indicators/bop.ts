/**
 * Balance of Power Indicator
 * Measures the strength of buyers vs sellers within a period
 */

export interface BOPData {
  bop: number | null // Balance of Power value (-1 to +1)
  signal: 'bullish' | 'bearish' | 'neutral' | null
  trend: 'accumulation' | 'distribution' | 'neutral' | null
}

export function calculateBOP(
  opens: number[],
  highs: number[],
  lows: number[],
  closes: number[],
  period: number = 14
): BOPData {
  if (opens.length < period || highs.length < period || lows.length < period || closes.length < period) {
    return {
      bop: null,
      signal: null,
      trend: null,
    }
  }

  // Calculate BOP for each period: (Close - Open) / (High - Low)
  const bopValues: number[] = []

  for (let i = 0; i < closes.length; i++) {
    const open = opens[i]
    const high = highs[i]
    const low = lows[i]
    const close = closes[i]

    const range = high - low

    if (range !== 0) {
      const bop = (close - open) / range
      bopValues.push(bop)
    } else {
      bopValues.push(0) // No range, neutral
    }
  }

  if (bopValues.length === 0) {
    return {
      bop: null,
      signal: null,
      trend: null,
    }
  }

  // Get current BOP value
  const currentBOP = bopValues[bopValues.length - 1]

  // Determine signal
  let signal: 'bullish' | 'bearish' | 'neutral' | null = null
  if (currentBOP > 0.2) signal = 'bullish'
  else if (currentBOP < -0.2) signal = 'bearish'
  else signal = 'neutral'

  // Determine trend based on recent BOP values
  let trend: 'accumulation' | 'distribution' | 'neutral' | null = null
  if (bopValues.length >= period) {
    const recentBOP = bopValues.slice(-period)
    const positiveCount = recentBOP.filter(bop => bop > 0).length
    const negativeCount = recentBOP.filter(bop => bop < 0).length

    if (positiveCount > negativeCount * 1.2) trend = 'accumulation'
    else if (negativeCount > positiveCount * 1.2) trend = 'distribution'
    else trend = 'neutral'
  }

  return {
    bop: currentBOP,
    signal,
    trend,
  }
}
