/**
 * Red Flags Section Generation
 * generateRedFlagsSection function
 */

import { Signal, TrendAlignment, ExternalData } from '../types'
import { TechnicalIndicators } from '../technical-indicators/aggregator'

/**
 * Generate red flags section for a signal
 */
export function generateRedFlagsSection(
  signal: Signal,
  indicators: TechnicalIndicators | null | undefined,
  trendAlignment: TrendAlignment | null | undefined,
  externalData: ExternalData | null | undefined
): string | null {
  const redFlags: string[] = []
  const price = indicators?.price || 0
  
  // Volume change check - differentiate between spike and drop based on signal type
  if (indicators?.volumeChangePercent !== undefined) {
    const volChange = indicators.volumeChangePercent
    const isSellSignal = signal.signal === 'sell_to_enter'
    const isBuySignal = signal.signal === 'buy_to_enter' || signal.signal === 'add'
    
    if (isSellSignal && volChange > 50) {
      // Volume spike for SELL = bullish pressure (red flag - contradicts SELL)
      if (volChange > 150) {
        redFlags.push(`CRITICAL: Volume spike +${volChange.toFixed(2)}% (strong buying pressure - CONTRADICTS SELL signal)`)
      } else {
        redFlags.push(`WARNING: Volume spike +${volChange.toFixed(2)}% (buying pressure - CONTRADICTS SELL)`)
      }
    } else if (isBuySignal && volChange < -50) {
      // Volume drop for BUY = low activity (red flag)
      if (volChange < -80) {
        redFlags.push(`CRITICAL: Volume drop ${volChange.toFixed(2)}% (extremely low activity)`)
      } else {
        redFlags.push(`WARNING: Volume drop ${volChange.toFixed(2)}% (low activity)`)
      }
    }
    // Note: SELL + volume drop (negative) = supporting (not red flag)
    // Note: BUY + volume spike (positive) = supporting (not red flag)
  }
  
  // Daily trend mismatch (counter-trend)
  if (trendAlignment) {
    const dailyTrend = (trendAlignment as any).dailyTrend || trendAlignment.trend
    if ((signal.signal === 'buy_to_enter' || signal.signal === 'add') && dailyTrend === 'downtrend') {
      redFlags.push(`Daily downtrend (counter-trend play - HIGH RISK)`)
    } else if (signal.signal === 'sell_to_enter' && dailyTrend === 'uptrend') {
      redFlags.push(`Daily uptrend (counter-trend play - HIGH RISK)`)
    }
  }
  
  // RSI overbought/oversold
  if (indicators?.rsi14 !== undefined) {
    if ((signal.signal === 'buy_to_enter' || signal.signal === 'add') && indicators.rsi14 !== null && indicators.rsi14 > 70) {
      redFlags.push(`RSI overbought ${indicators.rsi14 ? indicators.rsi14.toFixed(2) : '0'} (potential reversal)`)
    } else if (signal.signal === 'sell_to_enter' && indicators.rsi14 !== null && indicators.rsi14 < 30) {
      redFlags.push(`RSI oversold ${indicators.rsi14 ? indicators.rsi14.toFixed(2) : '0'} (potential reversal)`)
    }
  }
  
  // Volume-price divergence bearish untuk BUY
  if ((signal.signal === 'buy_to_enter' || signal.signal === 'add') && indicators?.volumePriceDivergence !== undefined && indicators.volumePriceDivergence < -0.5) {
    redFlags.push(`Volume-price divergence bearish (price rising but volume decreasing)`)
  }
  
  // Volume-price divergence bullish untuk SELL
  if (signal.signal === 'sell_to_enter' && indicators?.volumePriceDivergence !== undefined && indicators.volumePriceDivergence > 0.5) {
    redFlags.push(`Volume-price divergence bullish (price falling but volume increasing)`)
  }
  
  // Low ATR
  if (indicators?.atr !== undefined && indicators.atr !== null && price > 0) {
    const atrPercent = (indicators.atr / price) * 100
    if (atrPercent < 1.5) {
      redFlags.push(`Low volatility (ATR ${atrPercent.toFixed(2)}% - whipsaw risk)`)
    }
  }
  
  // Exchange inflow bearish untuk BUY
  if ((signal.signal === 'buy_to_enter' || signal.signal === 'add') && externalData?.blockchain?.estimatedExchangeFlow && externalData.blockchain.estimatedExchangeFlow > 0) {
    redFlags.push(`Exchange inflow detected (bearish pressure)`)
  }
  
  // Exchange outflow bullish untuk SELL
  if (signal.signal === 'sell_to_enter' && externalData?.blockchain?.estimatedExchangeFlow && externalData.blockchain.estimatedExchangeFlow < 0) {
    redFlags.push(`Exchange outflow detected (bullish pressure)`)
  }
  
  if (redFlags.length === 0) {
    return null // No red flags
  }
  
  return `RED FLAGS TO MONITOR:\n${redFlags.map(flag => `   - ${flag}`).join('\n')}\n   - Watch these closely for exit signals`
}

