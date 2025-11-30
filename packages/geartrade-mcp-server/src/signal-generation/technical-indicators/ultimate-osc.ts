/**
 * Ultimate Oscillator Indicator
 * Combines momentum from three different timeframes
 */

export interface UltimateOscillatorData {
  ultimateOsc: number | null
  signal: 'overbought' | 'oversold' | 'neutral' | null
}

export function calculateUltimateOscillator(
  highs: number[],
  lows: number[],
  closes: number[],
  shortPeriod: number = 7,
  mediumPeriod: number = 14,
  longPeriod: number = 28
): UltimateOscillatorData {
  // Minimum 5 data points required
  if (closes.length < 5) {
    return {
      ultimateOsc: null,
      signal: null,
    }
  }
  
  // Use adaptive periods
  const dataRatio = Math.min(1, closes.length / 29)
  const effectiveShortPeriod = Math.max(3, Math.floor(shortPeriod * dataRatio))
  const effectiveMediumPeriod = Math.max(5, Math.floor(mediumPeriod * dataRatio))
  const effectiveLongPeriod = Math.max(7, Math.floor(longPeriod * dataRatio))

  // Calculate Buying Pressure and True Range
  const buyingPressures: number[] = []
  const trueRanges: number[] = []

  for (let i = 1; i < closes.length; i++) {
    const close = closes[i]
    const closePrev = closes[i - 1]
    const high = highs[i]
    const low = lows[i]

    // Buying Pressure = Close - min(Low, Close_prev)
    const buyingPressure = close - Math.min(low, closePrev)
    buyingPressures.push(buyingPressure)

    // True Range = max(High, Close_prev) - min(Low, Close_prev)
    const trueRange = Math.max(high, closePrev) - Math.min(low, closePrev)
    trueRanges.push(trueRange)
  }

  if (buyingPressures.length < effectiveShortPeriod) {
    return {
      ultimateOsc: null,
      signal: null,
    }
  }

  // Calculate Average for each timeframe using effective periods
  function calculateAverageBP_TR(period: number): number {
    const usePeriod = Math.min(period, buyingPressures.length)
    const bpSum = buyingPressures.slice(-usePeriod).reduce((sum, bp) => sum + bp, 0)
    const trSum = trueRanges.slice(-usePeriod).reduce((sum, tr) => sum + tr, 0)
    return trSum > 0 ? bpSum / trSum : 0
  }

  const avg7 = calculateAverageBP_TR(effectiveShortPeriod)
  const avg14 = calculateAverageBP_TR(effectiveMediumPeriod)
  const avg28 = calculateAverageBP_TR(effectiveLongPeriod)

  // Ultimate Oscillator = (4 × avg7 + 2 × avg14 + avg28) / (4 + 2 + 1)
  const rawUO = (4 * avg7) + (2 * avg14) + avg28
  const ultimateOsc = rawUO / 7

  // Determine signal
  let signal: 'overbought' | 'oversold' | 'neutral' | null = null
  if (ultimateOsc >= 70) signal = 'overbought'
  else if (ultimateOsc <= 30) signal = 'oversold'
  else signal = 'neutral'

  return {
    ultimateOsc,
    signal,
  }
}
