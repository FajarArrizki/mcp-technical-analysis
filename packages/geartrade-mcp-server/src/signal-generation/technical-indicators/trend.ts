/**
 * Trend Indicators
 * ADX, Parabolic SAR, Aroon, Support/Resistance calculations
 */

import { ADXResult, AroonResult, SupportResistance } from '../types'

export function calculateADX(
  highs: number[],
  lows: number[],
  closes: number[],
  period: number = 14
): ADXResult {
  if (highs.length < period + 1 || lows.length < period + 1 || closes.length < period + 1) {
    return { adx: [], plusDI: [], minusDI: [] }
  }
  
  // Calculate +DM and -DM (Directional Movement)
  const plusDM: number[] = []
  const minusDM: number[] = []
  
  for (let i = 1; i < highs.length; i++) {
    const highDiff = highs[i] - highs[i - 1]
    const lowDiff = lows[i - 1] - lows[i]
    
    if (highDiff > lowDiff && highDiff > 0) {
      plusDM.push(highDiff)
      minusDM.push(0)
    } else if (lowDiff > highDiff && lowDiff > 0) {
      plusDM.push(0)
      minusDM.push(lowDiff)
    } else {
      plusDM.push(0)
      minusDM.push(0)
    }
  }
  
  // Calculate True Range (same as ATR calculation)
  const trueRanges: number[] = []
  for (let i = 1; i < closes.length; i++) {
    const tr1 = highs[i] - lows[i]
    const tr2 = Math.abs(highs[i] - closes[i - 1])
    const tr3 = Math.abs(lows[i] - closes[i - 1])
    trueRanges.push(Math.max(tr1, tr2, tr3))
  }
  
  // Calculate smoothed +DM, -DM, and TR using Wilder's smoothing
  const smoothedPlusDM: number[] = []
  const smoothedMinusDM: number[] = []
  const smoothedTR: number[] = []
  
  // Initial values (SMA)
  let sumPlusDM = 0
  let sumMinusDM = 0
  let sumTR = 0
  
  for (let i = 0; i < period && i < plusDM.length; i++) {
    sumPlusDM += plusDM[i]
    sumMinusDM += minusDM[i]
    sumTR += trueRanges[i]
  }
  
  if (plusDM.length >= period) {
    smoothedPlusDM.push(sumPlusDM / period)
    smoothedMinusDM.push(sumMinusDM / period)
    smoothedTR.push(sumTR / period)
    
    // Subsequent values use Wilder's smoothing
    for (let i = period; i < plusDM.length; i++) {
      smoothedPlusDM.push((smoothedPlusDM[smoothedPlusDM.length - 1] * (period - 1) + plusDM[i]) / period)
      smoothedMinusDM.push((smoothedMinusDM[smoothedMinusDM.length - 1] * (period - 1) + minusDM[i]) / period)
      smoothedTR.push((smoothedTR[smoothedTR.length - 1] * (period - 1) + trueRanges[i]) / period)
    }
  }
  
  // Calculate +DI and -DI (Directional Indicators)
  const plusDI: number[] = []
  const minusDI: number[] = []
  const dx: number[] = []
  const adx: number[] = []
  
  for (let i = 0; i < smoothedTR.length; i++) {
    if (smoothedTR[i] > 0) {
      plusDI.push((smoothedPlusDM[i] / smoothedTR[i]) * 100)
      minusDI.push((smoothedMinusDM[i] / smoothedTR[i]) * 100)
    } else {
      plusDI.push(0)
      minusDI.push(0)
    }
    
    // Calculate DX (Directional Index)
    const diSum = plusDI[i] + minusDI[i]
    if (diSum > 0) {
      const diDiff = Math.abs(plusDI[i] - minusDI[i])
      dx.push((diDiff / diSum) * 100)
    } else {
      dx.push(0)
    }
  }
  
  // Calculate ADX as smoothed average of DX
  if (dx.length >= period) {
    // Initial ADX (SMA of first period DX values)
    let sumDX = 0
    for (let i = 0; i < period; i++) {
      sumDX += dx[i]
    }
    adx.push(sumDX / period)
    
    // Subsequent ADX values use Wilder's smoothing
    for (let i = period; i < dx.length; i++) {
      adx.push((adx[adx.length - 1] * (period - 1) + dx[i]) / period)
    }
  }
  
  return {
    adx: adx,
    plusDI: plusDI,
    minusDI: minusDI
  }
}

export function calculateParabolicSAR(
  highs: number[],
  lows: number[],
  closes: number[],
  afStart: number = 0.02,
  afIncrement: number = 0.02,
  afMax: number = 0.2
): number[] {
  if (highs.length < 2 || lows.length < 2 || closes.length < 2) {
    return []
  }
  
  const sar: number[] = []
  let trend: number | null = null // 1 for uptrend, -1 for downtrend
  let ep: number | null = null // Extreme Point
  let af = afStart // Acceleration Factor
  let currentSAR: number | null = null
  
  // Initialize
  if (closes[1] > closes[0]) {
    trend = 1 // Uptrend
    ep = highs[1]
    currentSAR = lows[0]
  } else {
    trend = -1 // Downtrend
    ep = lows[1]
    currentSAR = highs[0]
  }
  
  sar.push(currentSAR)
  
  // Calculate SAR for remaining periods
  for (let i = 2; i < closes.length; i++) {
    const prevSAR = currentSAR
    const prevEP = ep
    const prevAF = af
    
    // Calculate new SAR
    if (trend === 1) {
      // Uptrend
      currentSAR = prevSAR! + prevAF * (prevEP! - prevSAR!)
      currentSAR = Math.min(currentSAR, lows[i - 1], lows[i - 2] || lows[i - 1])
      
      // Check for reversal
      if (currentSAR >= lows[i]) {
        // Reverse to downtrend
        trend = -1
        ep = lows[i]
        af = afStart
        currentSAR = Math.max(highs[i - 1], highs[i - 2] || highs[i - 1])
      } else {
        // Continue uptrend
        if (highs[i] > prevEP!) {
          ep = highs[i]
          af = Math.min(af + afIncrement, afMax)
        }
      }
    } else {
      // Downtrend
      currentSAR = prevSAR! + prevAF * (prevEP! - prevSAR!)
      currentSAR = Math.max(currentSAR, highs[i - 1], highs[i - 2] || highs[i - 1])
      
      // Check for reversal
      if (currentSAR <= highs[i]) {
        // Reverse to uptrend
        trend = 1
        ep = highs[i]
        af = afStart
        currentSAR = Math.min(lows[i - 1], lows[i - 2] || lows[i - 1])
      } else {
        // Continue downtrend
        if (lows[i] < prevEP!) {
          ep = lows[i]
          af = Math.min(af + afIncrement, afMax)
        }
      }
    }
    
    sar.push(currentSAR)
  }
  
  return sar
}

export function calculateAroon(
  highs: number[],
  lows: number[],
  period: number = 14
): AroonResult {
  if (highs.length < period || lows.length < period) {
    return { up: [], down: [] }
  }
  
  const aroonUp: number[] = []
  const aroonDown: number[] = []
  
  for (let i = period - 1; i < highs.length; i++) {
    const periodHighs = highs.slice(i - period + 1, i + 1)
    const periodLows = lows.slice(i - period + 1, i + 1)
    const highestHigh = Math.max(...periodHighs)
    const lowestLow = Math.min(...periodLows)
    
    // Find position of highest high and lowest low
    let highestIndex = -1
    let lowestIndex = -1
    
    for (let j = periodHighs.length - 1; j >= 0; j--) {
      if (periodHighs[j] === highestHigh && highestIndex === -1) {
        highestIndex = j
      }
      if (periodLows[j] === lowestLow && lowestIndex === -1) {
        lowestIndex = j
      }
    }
    
    // Calculate Aroon Up and Down
    const aroonUpValue = ((period - 1 - highestIndex) / (period - 1)) * 100
    const aroonDownValue = ((period - 1 - lowestIndex) / (period - 1)) * 100
    
    aroonUp.push(aroonUpValue)
    aroonDown.push(aroonDownValue)
  }
  
  return {
    up: aroonUp,
    down: aroonDown
  }
}

export function calculateSupportResistance(
  highs: number[],
  lows: number[],
  closes: number[],
  lookbackPeriod: number = 20
): SupportResistance {
  if (highs.length < lookbackPeriod || lows.length < lookbackPeriod || closes.length < lookbackPeriod) {
    return {
      support: null,
      resistance: null,
      pivotPoints: null,
      fibonacciLevels: null,
      previousHighs: [],
      previousLows: [],
      swingHighs: [],
      swingLows: []
    }
  }
  
  // Find recent swing highs and lows
  const swingHighs: Array<{ price: number; index: number }> = []
  const swingLows: Array<{ price: number; index: number }> = []
  
  // Simple swing detection: local maxima and minima
  for (let i = 2; i < closes.length - 2; i++) {
    // Swing high: higher than previous 2 and next 2 candles
    if (highs[i] > highs[i - 1] && highs[i] > highs[i - 2] && 
        highs[i] > highs[i + 1] && highs[i] > highs[i + 2]) {
      swingHighs.push({ price: highs[i], index: i })
    }
    
    // Swing low: lower than previous 2 and next 2 candles
    if (lows[i] < lows[i - 1] && lows[i] < lows[i - 2] && 
        lows[i] < lows[i + 1] && lows[i] < lows[i + 2]) {
      swingLows.push({ price: lows[i], index: i })
    }
  }
  
  // Get recent swing points (last lookbackPeriod)
  const recentSwingHighs = swingHighs.slice(-lookbackPeriod)
  const recentSwingLows = swingLows.slice(-lookbackPeriod)
  
  // Calculate support as average of recent swing lows
  const support = recentSwingLows.length > 0
    ? recentSwingLows.reduce((sum, swing) => sum + swing.price, 0) / recentSwingLows.length
    : null
  
  // Calculate resistance as average of recent swing highs
  const resistance = recentSwingHighs.length > 0
    ? recentSwingHighs.reduce((sum, swing) => sum + swing.price, 0) / recentSwingHighs.length
    : null
  
  // Calculate pivot points (standard pivot point calculation)
  const lastHigh = highs[highs.length - 1]
  const lastLow = lows[lows.length - 1]
  const lastClose = closes[closes.length - 1]
  const pivot = (lastHigh + lastLow + lastClose) / 3
  
  const pivotPoints = {
    pivot: pivot,
    resistance1: 2 * pivot - lastLow,
    resistance2: pivot + (lastHigh - lastLow),
    support1: 2 * pivot - lastHigh,
    support2: pivot - (lastHigh - lastLow)
  }
  
  // Calculate Fibonacci retracements (38.2%, 50%, 61.8%)
  // Use recent high and low for Fibonacci levels
  const recentHigh = Math.max(...highs.slice(-lookbackPeriod))
  const recentLow = Math.min(...lows.slice(-lookbackPeriod))
  const range = recentHigh - recentLow
  
  const fibonacciLevels = {
    level0: recentHigh,      // 0% (High)
    level236: recentHigh - (range * 0.236),  // 23.6%
    level382: recentHigh - (range * 0.382),  // 38.2%
    level500: recentHigh - (range * 0.500),  // 50%
    level618: recentHigh - (range * 0.618),  // 61.8%
    level786: recentHigh - (range * 0.786),  // 78.6%
    level100: recentLow       // 100% (Low)
  }
  
  // Find previous highs and lows for additional key levels
  const previousHighs = swingHighs.length > 1 
    ? swingHighs.slice(-5).map(s => s.price).sort((a, b) => b - a)
    : []
  const previousLows = swingLows.length > 1
    ? swingLows.slice(-5).map(s => s.price).sort((a, b) => a - b)
    : []
  
  return {
    support: support,
    resistance: resistance,
    pivotPoints: pivotPoints,
    fibonacciLevels: fibonacciLevels,
    previousHighs: previousHighs,
    previousLows: previousLows,
    swingHighs: recentSwingHighs,
    swingLows: recentSwingLows
  }
}

