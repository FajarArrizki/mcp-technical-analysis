/**
 * Bounce Detection Analysis
 * checkBounceSetup, checkBouncePersistence, checkEMAReclaim, checkReentryBounce, monitorBounceExit, calculateBounceDecay functions
 */

import { Signal, HistoricalDataPoint } from '../types'

export interface TechnicalIndicators {
  bollingerBands?: {
    lower?: number
    upper?: number
  } | null
  rsi14?: number | null
  rsi7?: number | null
  stochastic?: {
    k?: number
    d?: number
  } | null
  atr?: number | null
  ema20?: number | null
  ema8?: number | null
}

export interface MultiTimeframeIndicators {
  [timeframe: string]: {
    ema?: number[]
  } | null
}

export interface BounceSetupResult {
  type: 'BUY_BOUNCE' | 'SELL_BOUNCE'
  strength: number
  confirmations: number
  reason: string
  rsiOversold?: boolean
  rsiOverbought?: boolean
  stochBullish?: boolean
  stochBearish?: boolean
  volumeConfirmed?: boolean
  atrValid?: boolean
  candleBodyValid?: boolean
}

export interface BouncePersistenceResult {
  persistent: boolean
  confidencePenalty: number
  reason: string
  priceChange?: number
}

export interface EMAReclaimResult {
  valid: boolean
  reason: string
  emaReclaimed?: boolean
  emaLevel?: number
  timeframe?: string
}

export interface BounceExitResult {
  shouldTrim: boolean
  reason: string
  trimPercentage?: number
  trimPercent?: number  // Alias for trimPercentage
  priceChange?: number
}

export interface BounceDecayResult {
  decayPercent: number
  isDecaying: boolean
  reason: string
  decayPenalty?: number
  candlesSinceBounce?: number
}

export interface ReentryBounceResult {
  shouldReenter: boolean
  reason: string
  reentryStrength?: number
  isReentry?: boolean
  confidenceBoost?: number
  candlesSinceFailure?: number
}

/**
 * Check Bounce Setup
 * Detects when price exits no-trade zone (exhaustion) and shows reversal potential
 * Returns bounce type and strength if bounce setup detected
 */
export function checkBounceSetup(
  historicalData: HistoricalDataPoint[],
  indicators: TechnicalIndicators | null,
  price: number
): BounceSetupResult | null {
  if (!historicalData || historicalData.length < 2 || !indicators || !price) {
    return null
  }
  
  const currentCandle = historicalData[historicalData.length - 1]
  const previousCandle = historicalData[historicalData.length - 2]
  
  if (!currentCandle || !previousCandle) {
    return null
  }
  
  const bbLower = indicators.bollingerBands?.lower
  const bbUpper = indicators.bollingerBands?.upper
  const rsi = indicators.rsi14 || indicators.rsi7
  const stochK = indicators.stochastic?.k
  const stochD = indicators.stochastic?.d
  const atr = indicators.atr
  const volume = currentCandle.volume || 0
  
  // Calculate average volume (last 10 candles)
  let avgVolume = 0
  if (historicalData.length >= 10) {
    const recentVolumes = historicalData.slice(-10).map(c => c.volume || 0)
    avgVolume = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length
  }
  
  // Calculate candle body size
  const candleBody = Math.abs(currentCandle.close - currentCandle.open)
  
  // Bullish bounce: Price was below BB Lower, now closed above it
  if (bbLower && previousCandle.close < bbLower && currentCandle.close > bbLower) {
    // Check confirmations
    const rsiOversold = rsi !== null && rsi !== undefined && rsi < 40
    const stochKValue = stochK !== null && stochK !== undefined ? stochK : 0
    const stochDValue = stochD !== null && stochD !== undefined ? stochD : 0
    const stochBullish = stochKValue > stochDValue && stochKValue > 0 && stochDValue > 0
    const volumeConfirmed = avgVolume > 0 && volume > avgVolume
    const atrValid = atr !== null && atr !== undefined && atr > 0 && price > 0 && (atr / price) * 100 > 1.5
    const candleBodyValid = atr !== null && atr !== undefined && atr > 0 && candleBody > (atr * 0.5)
    
    // Count confirmations
    let confirmations = 0
    if (rsiOversold) confirmations++
    if (stochBullish) confirmations++
    if (volumeConfirmed) confirmations++
    if (atrValid) confirmations++
    if (candleBodyValid) confirmations++
    
    // Minimum 2 confirmations required
    if (confirmations >= 2) {
      const bounceStrength = confirmations / 5 // 0.2 to 1.0
      const stochKValueStr = stochKValue > 0 ? stochKValue.toFixed(1) : 'N/A'
      const stochDValueStr = stochDValue > 0 ? stochDValue.toFixed(1) : 'N/A'
      const rsiValue = rsi !== null && rsi !== undefined ? rsi.toFixed(1) : 'N/A'
      return {
        type: 'BUY_BOUNCE',
        strength: bounceStrength,
        confirmations: confirmations,
        reason: `Rebound from BB Lower + ${confirmations} confirmations (RSI: ${rsiValue}, Stoch: ${stochKValueStr}/${stochDValueStr})`,
        rsiOversold,
        stochBullish,
        volumeConfirmed,
        atrValid,
        candleBodyValid
      }
    }
  }
  
  // Bearish bounce: Price was above BB Upper, now closed below it
  if (bbUpper && previousCandle.close > bbUpper && currentCandle.close < bbUpper) {
    // Check confirmations
    const rsiOverbought = rsi !== null && rsi !== undefined && rsi > 60
    const stochKValue = stochK !== null && stochK !== undefined ? stochK : 0
    const stochDValue = stochD !== null && stochD !== undefined ? stochD : 0
    const stochBearish = stochKValue < stochDValue && stochKValue > 0 && stochDValue > 0
    const volumeConfirmed = avgVolume > 0 && volume > avgVolume
    const atrValid = atr !== null && atr !== undefined && atr > 0 && price > 0 && (atr / price) * 100 > 1.5
    const candleBodyValid = atr !== null && atr !== undefined && atr > 0 && candleBody > (atr * 0.5)
    
    // Count confirmations
    let confirmations = 0
    if (rsiOverbought) confirmations++
    if (stochBearish) confirmations++
    if (volumeConfirmed) confirmations++
    if (atrValid) confirmations++
    if (candleBodyValid) confirmations++
    
    // Minimum 2 confirmations required
    if (confirmations >= 2) {
      const bounceStrength = confirmations / 5 // 0.2 to 1.0
      const stochKValueStr = stochKValue > 0 ? stochKValue.toFixed(1) : 'N/A'
      const stochDValueStr = stochDValue > 0 ? stochDValue.toFixed(1) : 'N/A'
      const rsiValue = rsi !== null && rsi !== undefined ? rsi.toFixed(1) : 'N/A'
      return {
        type: 'SELL_BOUNCE',
        strength: bounceStrength,
        confirmations: confirmations,
        reason: `Pullback from BB Upper + ${confirmations} confirmations (RSI: ${rsiValue}, Stoch: ${stochKValueStr}/${stochDValueStr})`,
        rsiOverbought,
        stochBearish: stochBearish,
        volumeConfirmed,
        atrValid,
        candleBodyValid
      }
    }
  }
  
  return null
}

/**
 * Check Bounce Persistence
 * Detects if bounce is continuing or failing (dead cat bounce)
 */
export function checkBouncePersistence(
  historicalData: HistoricalDataPoint[],
  signal: Signal & {
    bounce_mode?: boolean
    bounce_type?: 'BUY_BOUNCE' | 'SELL_BOUNCE'
  },
  currentPrice: number
): BouncePersistenceResult {
  if (!historicalData || historicalData.length < 3 || !currentPrice) {
    return { persistent: true, confidencePenalty: 0, reason: 'Insufficient data' }
  }
  
  const isBuyBounce = signal.bounce_type === 'BUY_BOUNCE' || 
                     (signal.signal === 'buy_to_enter' && signal.bounce_mode)
  const isSellBounce = signal.bounce_type === 'SELL_BOUNCE' || 
                      (signal.signal === 'sell_to_enter' && signal.bounce_mode)
  
  if (!isBuyBounce && !isSellBounce) {
    return { persistent: true, confidencePenalty: 0, reason: 'Not a bounce signal' }
  }
  
  // Check last 3 candles
  const recentCandles = historicalData.slice(-3)
  if (recentCandles.length < 3) {
    return { persistent: true, confidencePenalty: 0, reason: 'Insufficient candles' }
  }
  
  const startPrice = recentCandles[0].close
  const endPrice = currentPrice
  
  // CRITICAL FIX: Check for division by zero - startPrice can be 0
  if (!startPrice || startPrice <= 0) {
    return { persistent: true, confidencePenalty: 0, reason: 'Invalid start price (zero or negative)' }
  }
  
  const priceChange = ((endPrice - startPrice) / startPrice) * 100
  
  // For BUY bounce: need price to increase by at least 0.5%
  if (isBuyBounce) {
    if (priceChange < 0.5) {
      // Bounce failed - price didn't increase enough
      return {
        persistent: false,
        confidencePenalty: 0.50, // Cut confidence 50%
        reason: `Price failed to increase 0.5% in 3 candles (only ${priceChange.toFixed(2)}%) - dead cat bounce detected`,
        priceChange
      }
    }
  }
  
  // For SELL bounce: need price to decrease by at least 0.5%
  if (isSellBounce) {
    if (priceChange > -0.5) {
      // Bounce failed - price didn't decrease enough
      return {
        persistent: false,
        confidencePenalty: 0.50, // Cut confidence 50%
        reason: `Price failed to decrease 0.5% in 3 candles (only ${priceChange.toFixed(2)}%) - failed pullback detected`,
        priceChange
      }
    }
  }
  
  // Bounce is persistent
  return {
    persistent: true,
    confidencePenalty: 0,
    reason: `Bounce persistent: ${isBuyBounce ? 'price increased' : 'price decreased'} ${Math.abs(priceChange).toFixed(2)}% in 3 candles`,
    priceChange
  }
}

/**
 * Check EMA Reclaim
 * Bounce BUY valid kalau harga reclaim EMA20 (atau 4H EMA8 untuk intraday)
 * Bounce SELL valid kalau gagal reclaim EMA20
 */
export function checkEMAReclaim(
  signal: Signal & {
    bounce_mode?: boolean
    bounce_type?: 'BUY_BOUNCE' | 'SELL_BOUNCE'
  },
  indicators: TechnicalIndicators | null,
  multiTimeframeIndicators: MultiTimeframeIndicators | null,
  currentPrice: number
): EMAReclaimResult {
  if (!indicators || !currentPrice) {
    return { valid: true, reason: 'Insufficient data' }
  }
  
  const isBuyBounce = signal.bounce_type === 'BUY_BOUNCE' || 
                     (signal.signal === 'buy_to_enter' && signal.bounce_mode)
  const isSellBounce = signal.bounce_type === 'SELL_BOUNCE' || 
                      (signal.signal === 'sell_to_enter' && signal.bounce_mode)
  
  if (!isBuyBounce && !isSellBounce) {
    return { valid: true, reason: 'Not a bounce signal' }
  }
  
  // Check EMA20 reclaim for 1H timeframe
  const ema20 = indicators.ema20
  
  // Check 4H EMA8 if available (for intraday)
  let ema4h8: number | null = null
  if (multiTimeframeIndicators && multiTimeframeIndicators['4h']) {
    const ema4h = multiTimeframeIndicators['4h']?.ema
    if (ema4h && ema4h.length >= 8) {
      // Calculate EMA8 from 4H data
      ema4h8 = ema4h[ema4h.length - 1] // Last EMA value
    }
  }
  
  // For BUY bounce: price should reclaim EMA20 (or 4H EMA8)
  if (isBuyBounce) {
    if (ema20 !== null && ema20 !== undefined && currentPrice > ema20) {
      return {
        valid: true,
        reason: `Price reclaimed EMA20 ($${currentPrice.toFixed(2)} > $${ema20.toFixed(2)}) - bounce continuation confirmed`,
        emaReclaimed: true,
        emaLevel: ema20
      }
    } else if (ema4h8 !== null && currentPrice > ema4h8) {
      return {
        valid: true,
        reason: `Price reclaimed 4H EMA8 ($${currentPrice.toFixed(2)} > $${ema4h8.toFixed(2)}) - bounce continuation confirmed`,
        emaReclaimed: true,
        emaLevel: ema4h8,
        timeframe: '4h'
      }
    } else {
      // Price failed to reclaim EMA - dead cat bounce
      return {
        valid: false,
        reason: `Price failed to reclaim EMA20 ($${currentPrice.toFixed(2)} < $${ema20?.toFixed(2) || 'N/A'}) - dead cat bounce risk`,
        emaReclaimed: false,
        emaLevel: ema20 || undefined
      }
    }
  }
  
  // For SELL bounce: price should fail to reclaim EMA20
  if (isSellBounce) {
    if (ema20 !== null && ema20 !== undefined && currentPrice < ema20) {
      return {
        valid: true,
        reason: `Price failed to reclaim EMA20 ($${currentPrice.toFixed(2)} < $${ema20.toFixed(2)}) - pullback continuation confirmed`,
        emaReclaimed: false,
        emaLevel: ema20
      }
    } else if (ema20 !== null && ema20 !== undefined && currentPrice > ema20) {
      // Price reclaimed EMA - bounce failed
      return {
        valid: false,
        reason: `Price reclaimed EMA20 ($${currentPrice.toFixed(2)} > $${ema20.toFixed(2)}) - pullback failed, potential reversal`,
        emaReclaimed: true,
        emaLevel: ema20
      }
    }
  }
  
  return { valid: true, reason: 'EMA data not available' }
}

/**
 * Monitor Bounce Exit
 * Detects when bounce is weakening (e.g., price closes below EMA8 after rising >3%)
 * Returns exit signal for 50% position trim
 */
export function monitorBounceExit(
  signal: Signal & {
    bounce_mode?: boolean
    bounce_type?: 'BUY_BOUNCE' | 'SELL_BOUNCE'
  },
  historicalData: HistoricalDataPoint[],
  indicators: TechnicalIndicators | null,
  entryPrice: number,
  currentPrice: number
): BounceExitResult {
  if (!signal.bounce_mode || !historicalData || historicalData.length < 3 || !indicators || !entryPrice || !currentPrice) {
    return { shouldTrim: false, reason: 'Not a bounce signal or insufficient data' }
  }
  
  const isBuyBounce = signal.bounce_type === 'BUY_BOUNCE' || 
                     (signal.signal === 'buy_to_enter' && signal.bounce_mode)
  const isSellBounce = signal.bounce_type === 'SELL_BOUNCE' || 
                      (signal.signal === 'sell_to_enter' && signal.bounce_mode)
  
  if (!isBuyBounce && !isSellBounce) {
    return { shouldTrim: false, reason: 'Not a bounce signal' }
  }
  
  const ema8 = indicators.ema8
  if (!ema8 || ema8 === null) {
    return { shouldTrim: false, reason: 'EMA8 not available' }
  }
  
  const priceChange = ((currentPrice - entryPrice) / entryPrice) * 100
  
  // For BUY bounce: if price rose >3% then closed below EMA8, trim 50%
  if (isBuyBounce) {
    if (priceChange > 3.0 && currentPrice < ema8) {
      return {
        shouldTrim: true,
        reason: `Bounce weakening: price rose ${priceChange.toFixed(2)}% but closed below EMA8 - trim 50%`,
        trimPercentage: 50
      }
    }
  }
  
  // For SELL bounce: if price fell >3% then closed above EMA8, trim 50%
  if (isSellBounce) {
    if (priceChange < -3.0 && currentPrice > ema8) {
      return {
        shouldTrim: true,
        reason: `Pullback weakening: price fell ${Math.abs(priceChange).toFixed(2)}% but closed above EMA8 - trim 50%`,
        trimPercentage: 50
      }
    }
  }
  
  return { shouldTrim: false, reason: 'Bounce still valid, no trim needed' }
}

/**
 * Calculate Bounce Decay
 * Measures how much bounce strength has decayed over time
 */
export function calculateBounceDecay(
  signal: Signal & {
    bounce_mode?: boolean
    bounce_type?: 'BUY_BOUNCE' | 'SELL_BOUNCE'
  },
  historicalData: HistoricalDataPoint[],
  _timeframe: string = '1h'
): BounceDecayResult {
  if (!signal.bounce_mode || !historicalData || historicalData.length < 5) {
    return { decayPercent: 0, isDecaying: false, reason: 'Insufficient data' }
  }
  
  const isBuyBounce = signal.bounce_type === 'BUY_BOUNCE' || 
                     (signal.signal === 'buy_to_enter' && signal.bounce_mode)
  const isSellBounce = signal.bounce_type === 'SELL_BOUNCE' || 
                      (signal.signal === 'sell_to_enter' && signal.bounce_mode)
  
  if (!isBuyBounce && !isSellBounce) {
    return { decayPercent: 0, isDecaying: false, reason: 'Not a bounce signal' }
  }
  
  // Compare last 5 candles to previous 5 candles
  const recentCandles = historicalData.slice(-5)
  const previousCandles = historicalData.length >= 10 ? historicalData.slice(-10, -5) : []
  
  if (recentCandles.length < 5 || previousCandles.length < 5) {
    return { decayPercent: 0, isDecaying: false, reason: 'Insufficient candles' }
  }
  
  // CRITICAL FIX: Check for division by zero before calculating price changes
  const recentStartPrice = recentCandles[0].close
  const previousStartPrice = previousCandles[0].close
  
  if (!recentStartPrice || recentStartPrice <= 0 || !previousStartPrice || previousStartPrice <= 0) {
    return { decayPercent: 0, isDecaying: false, reason: 'Invalid price data (zero or negative)' }
  }
  
  const recentChange = ((recentCandles[recentCandles.length - 1].close - recentStartPrice) / recentStartPrice) * 100
  const previousChange = ((previousCandles[previousCandles.length - 1].close - previousStartPrice) / previousStartPrice) * 100
  
  // Calculate decay: if recent change is slower than previous, bounce is decaying
  let decayPercent = 0
  if (isBuyBounce) {
    // For BUY: if recent upward move is slower than previous, decay
    if (recentChange < previousChange && recentChange > 0 && Math.abs(previousChange) > 0) {
      decayPercent = ((previousChange - recentChange) / previousChange) * 100
    }
  } else if (isSellBounce) {
    // For SELL: if recent downward move is slower than previous, decay
    if (recentChange > previousChange && recentChange < 0 && Math.abs(previousChange) > 0) {
      decayPercent = ((Math.abs(previousChange) - Math.abs(recentChange)) / Math.abs(previousChange)) * 100
    }
  }
  
  const isDecaying = decayPercent > 10 // Decaying if >10% slower
  
  return {
    decayPercent,
    isDecaying,
    reason: isDecaying 
      ? `Bounce decay detected: recent move (${recentChange.toFixed(2)}%) is ${decayPercent.toFixed(1)}% slower than previous (${previousChange.toFixed(2)}%)`
      : `Bounce still strong: recent move (${recentChange.toFixed(2)}%) is similar to previous (${previousChange.toFixed(2)}%)`
  }
}

/**
 * Check Reentry Bounce
 * Detects if price is showing signs of a new bounce setup after initial exit
 */
export function checkReentryBounce(
  signal: Signal & {
    bounce_mode?: boolean
    bounce_type?: 'BUY_BOUNCE' | 'SELL_BOUNCE'
  },
  historicalData: HistoricalDataPoint[],
  indicators: TechnicalIndicators | null,
  multiTimeframeIndicators: MultiTimeframeIndicators | null,
  currentPrice: number
): ReentryBounceResult {
  if (!signal.bounce_mode || !historicalData || historicalData.length < 3 || !indicators || !currentPrice) {
    return { shouldReenter: false, reason: 'Not a bounce signal or insufficient data' }
  }
  
  // Check if new bounce setup is detected
  const bounceSetup = checkBounceSetup(historicalData, indicators, currentPrice)
  
  if (!bounceSetup) {
    return { shouldReenter: false, reason: 'No new bounce setup detected' }
  }
  
  // Check EMA reclaim for additional confirmation
  const emaReclaim = checkEMAReclaim(signal, indicators, multiTimeframeIndicators, currentPrice)
  
  if (emaReclaim.valid && bounceSetup.strength > 0.4) {
    return {
      shouldReenter: true,
      reason: `New bounce setup detected with ${bounceSetup.confirmations} confirmations and EMA reclaim - reentry signal`,
      reentryStrength: bounceSetup.strength
    }
  }
  
  return { 
    shouldReenter: false, 
    reason: `Bounce setup detected but strength (${bounceSetup.strength.toFixed(2)}) or EMA reclaim insufficient for reentry` 
  }
}

