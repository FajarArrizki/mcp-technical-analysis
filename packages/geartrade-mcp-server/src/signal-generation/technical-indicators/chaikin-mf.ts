/**
 * Chaikin Money Flow (CMF) Indicator
 * Volume-weighted measure of accumulation/distribution
 */

export interface ChaikinMFData {
  cmf: number | null
  signal: 'accumulation' | 'distribution' | 'neutral' | null
}

export function calculateChaikinMF(
  highs: number[],
  lows: number[],
  closes: number[],
  volumes: number[],
  period: number = 21
): ChaikinMFData {
  // Minimum 5 data points required
  if (highs.length < 5 || lows.length < 5 || closes.length < 5 || volumes.length < 5) {
    return {
      cmf: null,
      signal: null,
    }
  }
  
  // Use adaptive period
  const effectivePeriod = Math.min(period, highs.length)

  // Calculate Money Flow Multiplier and Money Flow Volume
  const moneyFlowVolumes: number[] = []
  let totalVolume = 0

  for (let i = 0; i < closes.length; i++) {
    const high = highs[i]
    const low = lows[i]
    const close = closes[i]
    const volume = volumes[i] || 0

    // Avoid division by zero
    if (high === low) {
      moneyFlowVolumes.push(0)
    } else {
      // Money Flow Multiplier = ((Close - Low) - (High - Close)) / (High - Low)
      const moneyFlowMultiplier = ((close - low) - (high - close)) / (high - low)
      const moneyFlowVolume = moneyFlowMultiplier * volume
      moneyFlowVolumes.push(moneyFlowVolume)
    }

    totalVolume += volume
  }

  // Calculate CMF for the specified period using effective period
  const startIdx = Math.max(0, closes.length - effectivePeriod)
  let sumMoneyFlowVolume = 0
  let sumVolume = 0

  for (let i = startIdx; i < closes.length; i++) {
    sumMoneyFlowVolume += moneyFlowVolumes[i]
    sumVolume += volumes[i] || 0
  }

  if (sumVolume === 0) {
    return {
      cmf: null,
      signal: null,
    }
  }

  const cmf = sumMoneyFlowVolume / sumVolume

  // Determine signal
  let signal: 'accumulation' | 'distribution' | 'neutral' | null = null
  if (cmf > 0.1) signal = 'accumulation'
  else if (cmf < -0.1) signal = 'distribution'
  else signal = 'neutral'

  return {
    cmf,
    signal,
  }
}
