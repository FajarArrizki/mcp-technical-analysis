/**
 * Momentum (MOM) Indicator
 * Measures the speed of price change
 */

export interface MomentumData {
  momentum: number | null
  signal: 'bullish' | 'bearish' | 'neutral' | null
}

export function calculateMomentum(closes: number[], period: number = 14): MomentumData {
  if (closes.length < period + 1) {
    return {
      momentum: null,
      signal: null,
    }
  }

  const currentClose = closes[closes.length - 1]
  const pastClose = closes[closes.length - period - 1]

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

