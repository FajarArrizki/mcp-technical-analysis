/**
 * Contradiction Detection
 * detectContradictions function
 */

import { Signal, TrendAlignment } from '../types'

export interface ContradictionResult {
  contradictions: string[]
  contradictionScore: number
  hasContradictions: boolean
  severity: 'critical' | 'high' | 'medium' | 'low'
  aroonVsEmaContradiction?: boolean
  dualOverboughtDetected?: boolean
}

export interface Indicators {
  bollingerBands?: {
    upper: number
    middle: number
    lower: number
  }
  price?: number
  obv?: number | null
  macd?: {
    histogram?: number
  }
  aroon?: {
    up: number
    down: number
  }
  ema20?: number
  ema50?: number
  rsiDivergence?: {
    divergence?: 'bullish' | 'bearish' | null
  }
  macdDivergence?: {
    divergence?: 'bullish' | 'bearish' | null
  }
  parabolicSAR?: number | null
  cci?: number | null
  priceChange24h?: number | null
  rsi14?: number | null
  stochastic?: {
    k?: number[]
    d?: number[]
  }
  williamsR?: number | null
  adx?: number | null
  volumeChangePercent?: number | null
}

export function detectContradictions(
  signal: Signal,
  indicators: Indicators | null | undefined,
  trendAlignment?: TrendAlignment | null
): ContradictionResult {
  const contradictions: string[] = []
  let contradictionScore = 0 // Min: 0, Max: 4
  
  // If no indicators available, skip (don't calculate contradiction score)
  // Return max score (4) to indicate signal cannot be validated
  if (!indicators) {
    return {
      contradictions: ['No technical indicators available - signal cannot be validated'],
      contradictionScore: 4, // Max score: 4 (signal should be filtered out)
      hasContradictions: true,
      severity: 'critical'
    }
  }
  
  // Track which indicators are actually available for calculation
  let hasAnyIndicator = false
  
  const isBuySignal = signal.signal === 'buy_to_enter' || signal.signal === 'add'
  const isSellSignal = signal.signal === 'sell_to_enter'
  
  // 1. Check Bollinger Bands position
  if (indicators.bollingerBands && indicators.price) {
    hasAnyIndicator = true
    const price = indicators.price
    const bbUpper = indicators.bollingerBands.upper
    const bbLower = indicators.bollingerBands.lower
    const bbMiddle = indicators.bollingerBands.middle
    
    if (isSellSignal && price > bbMiddle) {
      contradictions.push(`SELL signal but price is ABOVE BB middle (bullish position)`)
      contradictionScore = Math.min(contradictionScore + 1, 4) // Max: 4
    }
    if (isBuySignal && price < bbMiddle) {
      contradictions.push(`BUY signal but price is BELOW BB middle (bearish position)`)
      contradictionScore = Math.min(contradictionScore + 1, 4) // Max: 4
    }
    if (isSellSignal && price > bbUpper) {
      contradictions.push(`SELL signal but price is ABOVE BB upper (overbought - very bullish)`)
      contradictionScore = Math.min(contradictionScore + 1, 4) // Max: 4
    }
    if (isBuySignal && price < bbLower) {
      contradictions.push(`BUY signal but price is BELOW BB lower (oversold - very bearish)`)
      contradictionScore = Math.min(contradictionScore + 1, 4) // Max: 4
    }
  }
  
  // 2. Check OBV (On-Balance Volume)
  if (indicators.obv !== null && indicators.obv !== undefined) {
    hasAnyIndicator = true
    if (isSellSignal && indicators.obv > 0 && contradictionScore < 4) {
      contradictions.push(`SELL signal but OBV is positive (buying pressure)`)
      contradictionScore = Math.min(contradictionScore + 1, 4) // Max: 4
    }
    if (isBuySignal && indicators.obv < 0 && contradictionScore < 4) {
      contradictions.push(`BUY signal but OBV is negative (selling pressure)`)
      contradictionScore = Math.min(contradictionScore + 1, 4) // Max: 4
    }
  }
  
  // 3. Check MACD Histogram (simplified: +1 point if contradicts)
  if (indicators.macd && indicators.macd.histogram !== undefined) {
    hasAnyIndicator = true
    const macdHist = indicators.macd.histogram
    if (isSellSignal && macdHist > 0 && contradictionScore < 4) {
      const severity = Math.abs(macdHist) > 50 ? 'STRONGLY' : Math.abs(macdHist) > 20 ? '' : 'slightly'
      contradictions.push(`SELL signal but MACD histogram is ${severity} positive (${macdHist.toFixed(2)}) - bullish momentum`)
      contradictionScore = Math.min(contradictionScore + 1, 4) // Max: 4
    }
    if (isBuySignal && macdHist < 0 && contradictionScore < 4) {
      const severity = Math.abs(macdHist) > 50 ? 'STRONGLY' : Math.abs(macdHist) > 20 ? '' : 'slightly'
      contradictions.push(`BUY signal but MACD histogram is ${severity} negative (${macdHist.toFixed(2)}) - bearish momentum`)
      contradictionScore = Math.min(contradictionScore + 1, 4) // Max: 4
    }
  }
  
  // 4. Check Aroon
  if (indicators.aroon) {
    hasAnyIndicator = true
    const aroonUp = indicators.aroon.up
    const aroonDown = indicators.aroon.down
    
    if (isSellSignal && aroonUp > 80 && contradictionScore < 4) {
      contradictions.push(`SELL signal but Aroon Up is ${aroonUp.toFixed(0)} (strong uptrend)`)
      contradictionScore = Math.min(contradictionScore + 1, 4) // Max: 4
    }
    if (isBuySignal && aroonDown > 80 && contradictionScore < 4) {
      contradictions.push(`BUY signal but Aroon Down is ${aroonDown.toFixed(0)} (strong downtrend)`)
      contradictionScore = Math.min(contradictionScore + 1, 4) // Max: 4
    }
  }
  
  // 5. Check Trend Alignment
  if (trendAlignment) {
    hasAnyIndicator = true
    const dailyTrend = (trendAlignment as any).dailyTrend || trendAlignment.trend
    const aligned = (trendAlignment as any).aligned || false
    
    if (isSellSignal && dailyTrend === 'uptrend' && contradictionScore < 4) {
      contradictions.push(`SELL signal but daily trend is UPTREND${aligned ? ' (all timeframes aligned)' : ''}`)
      contradictionScore = Math.min(contradictionScore + 1, 4) // Max: 4
    }
    if (isBuySignal && dailyTrend === 'downtrend' && contradictionScore < 4) {
      contradictions.push(`BUY signal but daily trend is DOWNTREND${aligned ? ' (all timeframes aligned)' : ''}`)
      contradictionScore = Math.min(contradictionScore + 1, 4) // Max: 4
    }
  }
  
  // 6. Check EMA alignment
  let emaUptrend = false
  let emaDowntrend = false
  if (indicators.price && indicators.ema20 && indicators.ema50) {
    hasAnyIndicator = true
    const price = indicators.price
    const ema20 = indicators.ema20
    const ema50 = indicators.ema50
    
    if (isSellSignal && price > ema20 && ema20 > ema50 && contradictionScore < 4) {
      contradictions.push(`SELL signal but price > EMA20 > EMA50 (uptrend structure)`)
      contradictionScore = Math.min(contradictionScore + 1, 4) // Max: 4
    }
    if (isBuySignal && price < ema20 && ema20 < ema50 && contradictionScore < 4) {
      contradictions.push(`BUY signal but price < EMA20 < EMA50 (downtrend structure)`)
      contradictionScore = Math.min(contradictionScore + 1, 4) // Max: 4
    }
    emaUptrend = price > ema20 && ema20 > ema50
    emaDowntrend = price < ema20 && ema20 < ema50
  }
  
  // 7. Check RSI Divergence
  if (indicators.rsiDivergence && indicators.rsiDivergence.divergence) {
    hasAnyIndicator = true
    if (isSellSignal && indicators.rsiDivergence.divergence === 'bullish' && contradictionScore < 4) {
      contradictions.push(`SELL signal but RSI shows BULLISH divergence`)
      contradictionScore = Math.min(contradictionScore + 1, 4) // Max: 4
    }
    if (isBuySignal && indicators.rsiDivergence.divergence === 'bearish' && contradictionScore < 4) {
      contradictions.push(`BUY signal but RSI shows BEARISH divergence`)
      contradictionScore = Math.min(contradictionScore + 1, 4) // Max: 4
    }
  }
  
  // 8. Check MACD Divergence
  if (indicators.macdDivergence && indicators.macdDivergence.divergence) {
    hasAnyIndicator = true
    if (isSellSignal && indicators.macdDivergence.divergence === 'bullish' && contradictionScore < 4) {
      contradictions.push(`SELL signal but MACD shows BULLISH divergence`)
      contradictionScore = Math.min(contradictionScore + 1, 4) // Max: 4
    }
    if (isBuySignal && indicators.macdDivergence.divergence === 'bearish' && contradictionScore < 4) {
      contradictions.push(`BUY signal but MACD shows BEARISH divergence`)
      contradictionScore = Math.min(contradictionScore + 1, 4) // Max: 4
    }
  }
  
  // 9. Check Parabolic SAR
  if (indicators.parabolicSAR && indicators.price) {
    hasAnyIndicator = true
    const price = indicators.price
    const sar = indicators.parabolicSAR
    // SAR below price = bullish, SAR above price = bearish
    if (isSellSignal && sar < price && contradictionScore < 4) {
      contradictions.push(`SELL signal but Parabolic SAR is BULLISH (SAR below price)`)
      contradictionScore = Math.min(contradictionScore + 1, 4) // Max: 4
    }
    if (isBuySignal && sar > price && contradictionScore < 4) {
      contradictions.push(`BUY signal but Parabolic SAR is BEARISH (SAR above price)`)
      contradictionScore = Math.min(contradictionScore + 1, 4) // Max: 4
    }
  }
  
  // 10. Check CCI (Commodity Channel Index)
  if (indicators.cci !== null && indicators.cci !== undefined) {
    hasAnyIndicator = true
    // CCI > 100 = overbought (bullish strength), CCI < -100 = oversold (bearish weakness)
    if (isSellSignal && indicators.cci > 100 && contradictionScore < 4) {
      contradictions.push(`SELL signal but CCI is overbought (${indicators.cci.toFixed(2)}) - still has bullish strength`)
      contradictionScore = Math.min(contradictionScore + 1, 4) // Max: 4
    }
    if (isBuySignal && indicators.cci < -100 && contradictionScore < 4) {
      contradictions.push(`BUY signal but CCI is oversold (${indicators.cci.toFixed(2)}) - still has bearish weakness`)
      contradictionScore = Math.min(contradictionScore + 1, 4) // Max: 4
    }
  }
  
  // 11. Check 24h Price Change (only if we haven't reached max score)
  if (indicators.priceChange24h !== null && indicators.priceChange24h !== undefined && contradictionScore < 4) {
    hasAnyIndicator = true
    if (isSellSignal && indicators.priceChange24h > 0) {
      contradictions.push(`SELL signal but 24h price change is POSITIVE (+${indicators.priceChange24h.toFixed(2)}%) - price is rising`)
      contradictionScore = Math.min(contradictionScore + 1, 4) // Max: 4
    }
    if (isBuySignal && indicators.priceChange24h < 0) {
      contradictions.push(`BUY signal but 24h price change is NEGATIVE (${indicators.priceChange24h.toFixed(2)}%) - price is falling`)
      contradictionScore = Math.min(contradictionScore + 1, 4) // Max: 4
    }
  }
  
  // 12. Check Volume Spike/Drop (CRITICAL: Volume contradictions are major red flags)
  // Volume spike for SELL = buying pressure (contradicts SELL)
  // Volume drop for BUY = low activity (contradicts BUY)
  if (indicators.volumeChangePercent !== null && indicators.volumeChangePercent !== undefined && contradictionScore < 4) {
    hasAnyIndicator = true
    const volChange = indicators.volumeChangePercent
    
    // SELL + volume spike >50% = buying pressure contradiction
    if (isSellSignal && volChange > 50) {
      if (volChange > 100) {
        // Critical: Volume spike >100% = strong buying pressure (+2 points)
        contradictions.push(`CRITICAL: SELL signal but volume spike +${volChange.toFixed(2)}% (strong buying pressure - CONTRADICTS SELL)`)
        contradictionScore = Math.min(contradictionScore + 2, 4) // Max: 4, but +2 for critical
      } else {
        // Warning: Volume spike >50% = buying pressure (+1 point)
        contradictions.push(`SELL signal but volume spike +${volChange.toFixed(2)}% (buying pressure - CONTRADICTS SELL)`)
        contradictionScore = Math.min(contradictionScore + 1, 4) // Max: 4
      }
    }
    
    // BUY + volume drop <-50% = low activity contradiction
    if (isBuySignal && volChange < -50) {
      if (volChange < -80) {
        // Critical: Volume drop <-80% = extremely low activity (+2 points)
        contradictions.push(`CRITICAL: BUY signal but volume drop ${volChange.toFixed(2)}% (extremely low activity - CONTRADICTS BUY)`)
        contradictionScore = Math.min(contradictionScore + 2, 4) // Max: 4, but +2 for critical
      } else {
        // Warning: Volume drop <-50% = low activity (+1 point)
        contradictions.push(`BUY signal but volume drop ${volChange.toFixed(2)}% (low activity - CONTRADICTS BUY)`)
        contradictionScore = Math.min(contradictionScore + 1, 4) // Max: 4
      }
    }
  }
  
  // Derived conflict flags for stricter filtering
  const aroonVsEmaContradiction =
    (!!indicators?.aroon) &&
    ((indicators.aroon.down > 80 && emaUptrend) || (indicators.aroon.up > 80 && emaDowntrend))
  
  const stochasticK = Array.isArray(indicators?.stochastic?.k) 
    ? (indicators.stochastic.k[indicators.stochastic.k.length - 1] ?? 0)
    : (indicators?.stochastic?.k ?? 0)
  const dualOverboughtDetected =
    (stochasticK >= 90) &&
    ((indicators?.williamsR ?? -100) > -20)
    // CCI > 100 also suggests overbought; include as alternative confirmation
    || ((indicators?.cci ?? 0) > 100 && stochasticK >= 85)
  
  // Ensure score is capped at 4 (max)
  contradictionScore = Math.min(contradictionScore, 4)
  
  // If no indicators were actually checked, return max score (4) to indicate signal cannot be validated
  if (!hasAnyIndicator) {
    return {
      contradictions: ['No technical indicators available for validation'],
      contradictionScore: 4, // Max score: 4 (signal should be filtered out)
      hasContradictions: true,
      severity: 'critical'
    }
  }
  
  return {
    contradictions,
    contradictionScore,
    hasContradictions: contradictions.length > 0,
    severity: contradictionScore === 4 ? 'critical' : contradictionScore === 3 ? 'high' : contradictionScore === 2 ? 'medium' : 'low',
    aroonVsEmaContradiction,
    dualOverboughtDetected
  }
}

