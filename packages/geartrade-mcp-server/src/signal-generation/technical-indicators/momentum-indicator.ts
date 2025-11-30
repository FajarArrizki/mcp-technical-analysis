/**
 * Momentum (MOM) Indicator
 * Measures the speed of price change
 */

export interface MomentumData {
  momentum: number | null
  signal: 'bullish' | 'bearish' | 'neutral' | null
}

export function calculateMomentum(closes: number[], period: number = 14): MomentumData {
  // Minimum 3 data points required
  if (closes.length < 3) {
    return {
      momentum: null,
      signal: null,
    }
  }

  // Use adaptive period
  const effectivePeriod = Math.min(period, closes.length - 1)

  const currentClose = closes[closes.length - 1]
  const pastClose = closes[closes.length - effectivePeriod - 1] ?? closes[0]

  if (!pastClose) {
    return {
      momentum: null,
      signal: null,
    }
  }

  const momentum = currentClose - pastClose

  // Determine signal
  let signal: 'bullish' | 'bearish' | 'neutral' | null = null
  if (momentum > 0) signal = 'bullish'
  else if (momentum < 0) signal = 'bearish'
  else signal = 'neutral'

  return {
    momentum,
    signal,
  }
}

