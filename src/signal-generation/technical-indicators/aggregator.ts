/**
 * Technical Indicators Aggregator
 * calculateTechnicalIndicators function - aggregates all indicators
 */

import { HistoricalDataPoint } from '../types'
import { calculateEMA } from './moving-averages'
import { calculateRSI, calculateMACD, calculateStochastic, calculateCCI, calculateWilliamsR } from './momentum'
import { calculateBollingerBands, calculateATR } from './volatility'
import { calculateOBV, calculateVWAP } from './volume'
import { calculateADX, calculateParabolicSAR, calculateAroon, calculateSupportResistance } from './trend'
import { calculateFibonacciRetracement } from './fibonacci'
import { detectTrend, detectMarketStructure } from '../analysis/trend-detection'
import { detectDivergence } from '../analysis/divergence'
import { detectCandlestickPatterns } from '../analysis/candlestick'
import { detectMarketRegime } from '../analysis/market-regime'

export interface TechnicalIndicators {
  rsi14: number | null
  rsi7: number | null
  ema8: number | null
  ema20: number | null
  ema50: number | null
  ema200: number | null
  macd: {
    macd: number
    signal: number
    histogram: number
  } | null
  bollingerBands: {
    upper: number
    middle: number
    lower: number
  } | null
  atr: number | null
  adx: number | null
  plusDI: number | null
  minusDI: number | null
  obv: number | null
  vwap: number | null
  stochastic: {
    k: number
    d: number
  } | null
  cci: number | null
  williamsR: number | null
  parabolicSAR: number | null
  aroon: {
    up: number
    down: number
  } | null
  supportResistance: any
  fibonacciRetracement: any
  trendDetection: any
  marketStructure: any
  rsiDivergence: any
  macdDivergence: any
  candlestickPatterns: any
  marketRegime: any
  priceChange24h: number
  volumeChange: number
  // Enhanced metrics (added dynamically from enhanced-metrics.ts)
  volumeTrend?: 'increasing' | 'decreasing' | 'stable'
  volumeChangePercent?: number
  volumePriceDivergence?: number
  price: number
  candles: number
}

export function calculateTechnicalIndicators(
  historicalData: HistoricalDataPoint[],
  currentPrice?: number | null
): TechnicalIndicators | null {
  if (!historicalData || historicalData.length < 14) {
    return null
  }
  
  // Ensure we have valid price data
  const closes = historicalData.map(d => d.close).filter(c => c > 0)
  const highs = historicalData.map(d => d.high).filter(h => h > 0)
  const lows = historicalData.map(d => d.low).filter(l => l > 0)
  const volumes = historicalData.map(d => d.volume || 0)
  
  if (closes.length < 14) {
    return null
  }
  
  // Calculate indicators with error handling
  let rsi14: number[] = []
  let rsi7: number[] = []
  let ema8: number[] = []
  let ema20: number[] = []
  let ema50: number[] = []
  let ema200: number[] = []
  let macd: any[] = []
  let bb: any[] = []
  let atr: number[] = []
  let adx: any = null
  let obv: number[] = []
  let vwap: number | null = null
  let stochastic: any = null
  let cci: number[] = []
  let williamsR: number[] = []
  let parabolicSAR: number[] = []
  let aroon: any = null
  let supportResistance: any = null
  let rsiDivergence: any = null
  let macdDivergence: any = null
  
  try {
    rsi14 = calculateRSI(closes, 14)
  } catch (error: any) {
    console.warn(`RSI calculation failed: ${error.message}`)
  }
  
  try {
    rsi7 = calculateRSI(closes, 7)
  } catch (error: any) {
    console.warn(`RSI7 calculation failed: ${error.message}`)
  }
  
  try {
    ema8 = calculateEMA(closes, 8)
  } catch (error: any) {
    console.warn(`EMA8 calculation failed: ${error.message}`)
  }
  
  try {
    ema20 = calculateEMA(closes, 20)
  } catch (error: any) {
    console.warn(`EMA20 calculation failed: ${error.message}`)
  }
  
  try {
    ema50 = calculateEMA(closes, 50)
  } catch (error: any) {
    // EMA50 might fail if not enough data, that's OK
  }
  
  try {
    ema200 = calculateEMA(closes, 200)
  } catch (error: any) {
    // EMA200 might fail if not enough data, that's OK
  }
  
  try {
    macd = calculateMACD(closes)
  } catch (error: any) {
    console.warn(`MACD calculation failed: ${error.message}`)
  }
  
  try {
    bb = calculateBollingerBands(closes, 20, 2)
  } catch (error: any) {
    console.warn(`Bollinger Bands calculation failed: ${error.message}`)
  }
  
  try {
    atr = calculateATR(highs, lows, closes, 14)
  } catch (error: any) {
    console.warn(`ATR calculation failed: ${error.message}`)
  }
  
  try {
    adx = calculateADX(highs, lows, closes, 14)
  } catch (error: any) {
    console.warn(`ADX calculation failed: ${error.message}`)
  }
  
  try {
    obv = calculateOBV(closes, volumes)
  } catch (error: any) {
    console.warn(`OBV calculation failed: ${error.message}`)
  }
  
  try {
    vwap = calculateVWAP(historicalData)
  } catch (error: any) {
    console.warn(`VWAP calculation failed: ${error.message}`)
  }
  
  try {
    stochastic = calculateStochastic(highs, lows, closes, 14, 3)
  } catch (error: any) {
    console.warn(`Stochastic calculation failed: ${error.message}`)
  }
  
  try {
    cci = calculateCCI(highs, lows, closes, 20)
  } catch (error: any) {
    console.warn(`CCI calculation failed: ${error.message}`)
  }
  
  try {
    williamsR = calculateWilliamsR(highs, lows, closes, 14)
  } catch (error: any) {
    console.warn(`Williams %R calculation failed: ${error.message}`)
  }
  
  try {
    parabolicSAR = calculateParabolicSAR(highs, lows, closes)
  } catch (error: any) {
    console.warn(`Parabolic SAR calculation failed: ${error.message}`)
  }
  
  try {
    aroon = calculateAroon(highs, lows, 14)
  } catch (error: any) {
    console.warn(`Aroon calculation failed: ${error.message}`)
  }
  
  try {
    supportResistance = calculateSupportResistance(highs, lows, closes, 20)
  } catch (error: any) {
    console.warn(`Support/Resistance calculation failed: ${error.message}`)
  }
  
  // Calculate Fibonacci Retracement
  let fibonacciRetracement = null
  try {
    fibonacciRetracement = calculateFibonacciRetracement(highs, lows, closes, 50)
  } catch (error: any) {
    console.warn(`Fibonacci Retracement calculation failed: ${error.message}`)
  }
  
  // Calculate trend detection
  let trendDetection = null
  try {
    trendDetection = detectTrend(closes, ema20, ema50.length > 0 ? ema50 : null, ema200.length > 0 ? ema200 : null)
  } catch (error: any) {
    console.warn(`Trend detection failed: ${error.message}`)
  }
  
  // Calculate market structure
  let marketStructure = null
  try {
    marketStructure = detectMarketStructure(highs, lows, closes, 20)
  } catch (error: any) {
    console.warn(`Market structure detection failed: ${error.message}`)
  }
  
  // Calculate divergence for RSI and MACD
  try {
    if (rsi14.length >= 20) {
      rsiDivergence = detectDivergence(closes, rsi14, 20)
    }
  } catch (error: any) {
    console.warn(`RSI divergence detection failed: ${error.message}`)
  }
  
  try {
    if (macd.length >= 20) {
      const macdValues = macd.map((m: any) => m.histogram)
      macdDivergence = detectDivergence(closes, macdValues, 20)
    }
  } catch (error: any) {
    console.warn(`MACD divergence detection failed: ${error.message}`)
  }
  
  // Calculate candlestick patterns
  let candlestickPatterns = null
  try {
    candlestickPatterns = detectCandlestickPatterns(historicalData, 5)
  } catch (error: any) {
    console.warn(`Candlestick pattern detection failed: ${error.message}`)
  }
  
  // Get latest values
  const currentRsi14 = rsi14.length > 0 ? rsi14[rsi14.length - 1] : null
  const currentRsi7 = rsi7.length > 0 ? rsi7[rsi7.length - 1] : null
  const currentEma8 = ema8.length > 0 ? ema8[ema8.length - 1] : null
  const currentEma20 = ema20.length > 0 ? ema20[ema20.length - 1] : null
  const currentEma50 = ema50.length > 0 ? ema50[ema50.length - 1] : null
  const currentEma200 = ema200.length > 0 ? ema200[ema200.length - 1] : null
  const currentMacd = macd.length > 0 ? macd[macd.length - 1] : null
  const currentBB = bb.length > 0 ? bb[bb.length - 1] : null
  const currentATR = atr.length > 0 ? atr[atr.length - 1] : null
  const currentADX = adx && typeof adx === 'object' && adx.adx && adx.adx.length > 0 ? adx.adx[adx.adx.length - 1] : null
  const currentPlusDI = adx && adx.plusDI && adx.plusDI.length > 0 ? adx.plusDI[adx.plusDI.length - 1] : null
  const currentMinusDI = adx && adx.minusDI && adx.minusDI.length > 0 ? adx.minusDI[adx.minusDI.length - 1] : null
  const currentOBV = obv.length > 0 ? obv[obv.length - 1] : null
  const currentVWAP = vwap
  const currentStochK = stochastic && stochastic.k && stochastic.k.length > 0 ? stochastic.k[stochastic.k.length - 1] : null
  const currentStochD = stochastic && stochastic.d && stochastic.d.length > 0 ? stochastic.d[stochastic.d.length - 1] : null
  const currentCCI = cci.length > 0 ? cci[cci.length - 1] : null
  const currentWilliamsR = williamsR.length > 0 ? williamsR[williamsR.length - 1] : null
  const currentParabolicSAR = parabolicSAR.length > 0 ? parabolicSAR[parabolicSAR.length - 1] : null
  const currentAroonUp = aroon && aroon.up && aroon.up.length > 0 ? aroon.up[aroon.up.length - 1] : null
  const currentAroonDown = aroon && aroon.down && aroon.down.length > 0 ? aroon.down[aroon.down.length - 1] : null
  
  // Calculate market regime
  let marketRegime = null
  try {
    marketRegime = detectMarketRegime(currentADX, currentATR, currentPrice || closes[closes.length - 1], historicalData)
  } catch (error: any) {
    console.warn(`Market regime detection failed: ${error.message}`)
  }
  
  // Calculate price change
  const priceChange24h = closes.length >= 24 
    ? ((closes[closes.length - 1] - closes[closes.length - 25]) / closes[closes.length - 25]) * 100
    : ((closes[closes.length - 1] - closes[0]) / closes[0]) * 100
  
  // Calculate volume change
  const avgVolume24h = volumes.slice(-24).reduce((a, b) => a + b, 0) / Math.min(24, volumes.length)
  const currentVolume = volumes[volumes.length - 1] || 0
  const volumeChange = avgVolume24h > 0 ? ((currentVolume - avgVolume24h) / avgVolume24h) * 100 : 0
  
  // Return indicators object
  const indicators: TechnicalIndicators = {
    rsi14: currentRsi14,
    rsi7: currentRsi7,
    ema8: currentEma8,
    ema20: currentEma20,
    ema50: currentEma50,
    ema200: currentEma200,
    macd: currentMacd ? {
      macd: currentMacd.MACD,
      signal: currentMacd.signal,
      histogram: currentMacd.histogram
    } : null,
    bollingerBands: currentBB ? {
      upper: currentBB.upper,
      middle: currentBB.middle,
      lower: currentBB.lower
    } : null,
    atr: currentATR,
    adx: currentADX,
    plusDI: currentPlusDI,
    minusDI: currentMinusDI,
    obv: currentOBV,
    vwap: currentVWAP,
    stochastic: currentStochK !== null && currentStochD !== null ? {
      k: currentStochK,
      d: currentStochD
    } : null,
    cci: currentCCI,
    williamsR: currentWilliamsR,
    parabolicSAR: currentParabolicSAR,
    aroon: currentAroonUp !== null && currentAroonDown !== null ? {
      up: currentAroonUp,
      down: currentAroonDown
    } : null,
    supportResistance: supportResistance,
    fibonacciRetracement: fibonacciRetracement,
    trendDetection: trendDetection,
    marketStructure: marketStructure,
    rsiDivergence: rsiDivergence,
    macdDivergence: macdDivergence,
    candlestickPatterns: candlestickPatterns,
    marketRegime: marketRegime,
    priceChange24h,
    volumeChange,
    price: currentPrice || closes[closes.length - 1],
    candles: historicalData.length
  }
  
  // Verify we have at least one indicator
  if (!currentRsi14 && !currentEma20 && !currentMacd && !currentBB && !currentATR && !currentADX) {
    console.warn(`No indicators calculated for asset with ${historicalData.length} candles`)
    return null
  }
  
  return indicators
}

