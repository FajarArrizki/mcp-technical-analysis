/**
 * Justification Generation
 * generateJustificationFromIndicators function
 */

import { Signal, TrendAlignment, ExternalData } from '../types'
import { TechnicalIndicators } from '../technical-indicators/aggregator'
import { generateRedFlagsSection } from '../validation/red-flags'
import { calculateQualityWeightedJustification, QualityWeightedResult } from '../analysis/quality-weighted-justification'

/**
 * Generate comprehensive justification from indicators
 */
export function generateJustificationFromIndicators(
  signal: Signal,
  indicators: TechnicalIndicators | null | undefined,
  _bullishCount: number = 0,
  _bearishCount: number = 0,
  trendAlignment: TrendAlignment | null | undefined,
  externalData: ExternalData | null | undefined
): string {
  const price = indicators?.price || 0
  const justificationParts: string[] = []
  
  if (signal.signal === 'buy_to_enter' || signal.signal === 'add') {
    // List BULLISH indicators (supporting BUY signal) - ALL indicators that actually exist
    const bullishIndicators: string[] = []
    const bearishIndicators: string[] = []
    
    // Count indicators as we add them (comprehensive count from ALL indicators checked)
    let actualBullishCount = 0
    let actualBearishCount = 0
    
    // MACD histogram and signal line
    if (indicators?.macd?.histogram !== undefined) {
      if (indicators.macd.histogram > 0) {
        bullishIndicators.push(`MACD histogram +${indicators.macd.histogram.toFixed(4)} (bullish momentum)`)
        actualBullishCount++
      } else {
        bearishIndicators.push(`MACD histogram ${indicators.macd.histogram.toFixed(4)} (bearish - CONTRADICTS BUY)`)
        actualBearishCount++
      }
    }
    // MACD signal line crossover
    if (indicators?.macd?.macd !== undefined && indicators?.macd?.signal !== undefined) {
      if (indicators.macd.macd > indicators.macd.signal) {
        bullishIndicators.push(`MACD line ${indicators.macd.macd.toFixed(4)} above Signal ${indicators.macd.signal.toFixed(4)} (bullish crossover)`)
        actualBullishCount++
      } else {
        bearishIndicators.push(`MACD line ${indicators.macd.macd.toFixed(4)} below Signal ${indicators.macd.signal.toFixed(4)} (bearish crossover - CONTRADICTS BUY)`)
        actualBearishCount++
      }
    }
    
    // EMA8 (fast-moving average for intraday momentum)
    if (indicators?.ema8 !== undefined && indicators.ema8 !== null && price > 0) {
      if (price > indicators.ema8) {
        bullishIndicators.push(`Price above EMA8 $${indicators.ema8.toFixed(2)} (bullish momentum)`)
        actualBullishCount++
      } else {
        bearishIndicators.push(`Price below EMA8 $${indicators.ema8.toFixed(2)} (bearish momentum - CONTRADICTS BUY)`)
        actualBearishCount++
      }
    }
    
    // EMA20/EMA50/EMA200 (trend context)
    if (indicators?.ema20 !== undefined && indicators.ema20 !== null && price > 0) {
      if (price > indicators.ema20) {
        bullishIndicators.push(`Price above EMA20 $${indicators.ema20.toFixed(2)} (bullish)`)
        actualBullishCount++
      } else {
        bearishIndicators.push(`Price below EMA20 $${indicators.ema20.toFixed(2)} (bearish - CONTRADICTS BUY)`)
        actualBearishCount++
      }
    }
    // EMA alignment check
    if (indicators?.ema20 && indicators?.ema50 && price > 0) {
      if (price > indicators.ema20 && indicators.ema20 > indicators.ema50) {
        bullishIndicators.push(`EMA alignment: Price > EMA20 > EMA50 (uptrend structure)`)
        actualBullishCount++
      } else if (price < indicators.ema20 && indicators.ema20 < indicators.ema50) {
        bearishIndicators.push(`EMA alignment: Price < EMA20 < EMA50 (downtrend structure - CONTRADICTS BUY)`)
        actualBearishCount++
      }
    }
    // EMA200 as major trend filter
    if (indicators?.ema200 !== undefined && indicators.ema200 !== null && price > 0) {
      if (price > indicators.ema200) {
        bullishIndicators.push(`Price above EMA200 $${indicators.ema200.toFixed(2)} (major uptrend)`)
        actualBullishCount++
      } else {
        bearishIndicators.push(`Price below EMA200 $${indicators.ema200.toFixed(2)} (major downtrend - CONTRADICTS BUY)`)
        actualBearishCount++
      }
    }
    
    // ADX (trend strength) - helper function for safe extraction
    const getAdxValue = (adx: any): number | null => {
      if (adx === null || adx === undefined) return null
      if (typeof adx === 'number' && !isNaN(adx)) return adx
      if (typeof adx === 'object' && adx !== null && typeof adx.adx === 'number' && !isNaN(adx.adx)) {
        return adx.adx
      }
      return null
    }
    
    const adxValue = getAdxValue(indicators?.adx)
    if (adxValue !== null) {
      if (adxValue > 25) {
        bullishIndicators.push(`ADX ${adxValue.toFixed(2)} (strong trend - supporting signal)`)
        actualBullishCount++
      } else if (adxValue < 20) {
        bearishIndicators.push(`ADX ${adxValue.toFixed(2)} (weak trend - CONTRADICTS BUY)`)
        actualBearishCount++
      }
    }
    
    // plusDI/minusDI (directional movement)
    if (indicators?.plusDI !== undefined && indicators.plusDI !== null && 
        indicators?.minusDI !== undefined && indicators.minusDI !== null) {
      if (indicators.plusDI > indicators.minusDI) {
        bullishIndicators.push(`+DI ${indicators.plusDI.toFixed(2)} > -DI ${indicators.minusDI.toFixed(2)} (bullish trend)`)
        actualBullishCount++
      } else if (indicators.minusDI > indicators.plusDI) {
        bearishIndicators.push(`-DI ${indicators.minusDI.toFixed(2)} > +DI ${indicators.plusDI.toFixed(2)} (bearish trend - CONTRADICTS BUY)`)
        actualBearishCount++
      }
    }
    
    // Stochastic (momentum)
    if (indicators?.stochastic?.k !== undefined && indicators.stochastic.k !== null) {
      const stochK = indicators.stochastic.k
      if (stochK > 80) {
        bearishIndicators.push(`Stochastic K ${stochK.toFixed(2)} overbought (potential reversal - CONTRADICTS BUY)`)
        actualBearishCount++
      } else if (stochK < 20) {
        bullishIndicators.push(`Stochastic K ${stochK.toFixed(2)} oversold (bullish)`)
        actualBullishCount++
      } else {
        bullishIndicators.push(`Stochastic K ${stochK.toFixed(2)} neutral`)
        actualBullishCount++
      }
    }
    
    // CCI (Commodity Channel Index)
    if (indicators?.cci !== undefined && indicators.cci !== null) {
      if (indicators.cci > 100) {
        bearishIndicators.push(`CCI ${indicators.cci.toFixed(2)} overbought (potential reversal - CONTRADICTS BUY)`)
        actualBearishCount++
      } else if (indicators.cci < -100) {
        bullishIndicators.push(`CCI ${indicators.cci.toFixed(2)} oversold (bullish)`)
        actualBullishCount++
      } else {
        bullishIndicators.push(`CCI ${indicators.cci.toFixed(2)} neutral`)
        actualBullishCount++
      }
    }
    
    // Williams %R (momentum oscillator)
    if (indicators?.williamsR !== undefined && indicators.williamsR !== null) {
      if (indicators.williamsR > -20) {
        bearishIndicators.push(`Williams %R ${indicators.williamsR.toFixed(2)} overbought (potential reversal - CONTRADICTS BUY)`)
        actualBearishCount++
      } else if (indicators.williamsR < -80) {
        bullishIndicators.push(`Williams %R ${indicators.williamsR.toFixed(2)} oversold (bullish)`)
        actualBullishCount++
      } else {
        bullishIndicators.push(`Williams %R ${indicators.williamsR.toFixed(2)} neutral`)
        actualBullishCount++
      }
    }
    
    // Fibonacci Retracement
    if (indicators?.fibonacciRetracement && typeof indicators.fibonacciRetracement === 'object') {
      const fib = indicators.fibonacciRetracement
      if (fib.signal === 'buy') {
        bullishIndicators.push(`Fibonacci Retracement: ${fib.nearestLevel || 'N/A'} level (BUY signal, Strength: ${fib.strength || 0}/100)`)
        actualBullishCount++
      } else if (fib.signal === 'sell') {
        bearishIndicators.push(`Fibonacci Retracement: ${fib.nearestLevel || 'N/A'} level (SELL signal - CONTRADICTS BUY)`)
        actualBearishCount++
      }
      if (fib.isNearLevel && fib.nearestLevel) {
        if (fib.nearestLevel === '38.2%' || fib.nearestLevel === '50%' || fib.nearestLevel === '61.8%') {
          bullishIndicators.push(`Price near Fibonacci ${fib.nearestLevel} level (key support)`)
          actualBullishCount++
        }
      }
    }
    
    // Market Structure
    if (indicators?.marketStructure && typeof indicators.marketStructure === 'object') {
      const ms = indicators.marketStructure
      if (ms.higherHighs && ms.higherLows) {
        bullishIndicators.push(`Market Structure: Higher highs and higher lows (uptrend confirmation)`)
        actualBullishCount++
      } else if (ms.lowerHighs && ms.lowerLows) {
        bearishIndicators.push(`Market Structure: Lower highs and lower lows (downtrend - CONTRADICTS BUY)`)
        actualBearishCount++
      }
    }
    
    // Candlestick Patterns
    if (indicators?.candlestickPatterns && 
        indicators.candlestickPatterns.patterns && 
        Array.isArray(indicators.candlestickPatterns.patterns) &&
        indicators.candlestickPatterns.patterns.length > 0) {
      const patterns = indicators.candlestickPatterns.patterns
      // Pattern types in candlestick.ts: 'doji', 'hammer', 'bullish_engulfing', 'bearish_engulfing'
      const bullishPatterns = patterns.filter((p: any) => 
        p.type && (p.type === 'bullish_engulfing' || 
                   p.type === 'hammer' ||
                   (p.type === 'doji' && p.bullish === true)))
      const bearishPatterns = patterns.filter((p: any) => 
        p.type && (p.type === 'bearish_engulfing' ||
                   (p.type === 'doji' && p.bullish === false)))
      if (bullishPatterns.length > 0) {
        // OPTIMIZATION 100x: Replace map().join() with for loop + join (faster)
        const bullishPatternsTypes: string[] = []
        for (let i = 0; i < bullishPatterns.length; i++) {
          const p = bullishPatterns[i]
          if (p && p.type) bullishPatternsTypes.push(p.type)
        }
        bullishIndicators.push(`Candlestick Patterns: ${bullishPatternsTypes.join(', ')} (bullish)`)
        actualBullishCount++
      }
      if (bearishPatterns.length > 0) {
        // OPTIMIZATION 100x: Replace map().join() with for loop + join (faster)
        const bearishPatternsTypes: string[] = []
        for (let i = 0; i < bearishPatterns.length; i++) {
          const p = bearishPatterns[i]
          if (p && p.type) bearishPatternsTypes.push(p.type)
        }
        bearishIndicators.push(`Candlestick Patterns: ${bearishPatternsTypes.join(', ')} (bearish - CONTRADICTS BUY)`)
        actualBearishCount++
      }
    }
    
    // Market Regime
    if (indicators?.marketRegime && typeof indicators.marketRegime === 'object') {
      const mr = indicators.marketRegime
      if (mr.regime === 'trending') {
        bullishIndicators.push(`Market Regime: Trending (${mr.volatility || 'normal'} volatility - favorable for trading)`)
        actualBullishCount++
      } else if (mr.regime === 'choppy') {
        bearishIndicators.push(`Market Regime: Choppy (${mr.volatility || 'normal'} volatility - unfavorable for trading - CONTRADICTS BUY)`)
        actualBearishCount++
      }
    }
    
    // MACD Divergence
    if (indicators?.macdDivergence?.divergence) {
      const divLower = indicators.macdDivergence.divergence.toLowerCase()
      if (divLower.includes('bullish')) {
        bullishIndicators.push(`MACD divergence bullish (potential reversal up)`)
        actualBullishCount++
      } else if (divLower.includes('bearish')) {
        bearishIndicators.push(`MACD divergence bearish (potential reversal down - CONTRADICTS BUY)`)
        actualBearishCount++
      }
    }
    
    // Support/Resistance (eksplisit)
    if (indicators?.supportResistance && typeof indicators.supportResistance === 'object') {
      const sr = indicators.supportResistance
      if (sr.support && price > 0) {
        const distanceFromSupport = ((price - sr.support) / price) * 100
        if (distanceFromSupport < 2 && distanceFromSupport > 0) {
          bullishIndicators.push(`Price near support $${sr.support.toFixed(2)} (within 2% - potential bounce)`)
          actualBullishCount++
        } else if (distanceFromSupport < 0) {
          bearishIndicators.push(`Price below support $${sr.support.toFixed(2)} (breakdown - CONTRADICTS BUY)`)
          actualBearishCount++
        }
      }
      if (sr.resistance && price > 0) {
        const distanceToResistance = ((sr.resistance - price) / price) * 100
        if (distanceToResistance < 2 && distanceToResistance > 0) {
          bearishIndicators.push(`Price near resistance $${sr.resistance.toFixed(2)} (within 2% - potential rejection - CONTRADICTS BUY)`)
          actualBearishCount++
        }
      }
    }
    
    // OBV
    if (indicators?.obv !== undefined && indicators.obv !== null) {
      if (indicators.obv > 0) {
        bullishIndicators.push(`OBV +${indicators.obv.toFixed(2)} (buying pressure)`)
        actualBullishCount++
      } else if (indicators.obv < 0) {
        bearishIndicators.push(`OBV ${indicators.obv.toFixed(2)} (selling pressure - CONTRADICTS BUY)`)
        actualBearishCount++
      }
    }
    
    // Bollinger Bands
    if (indicators?.bollingerBands && price > 0) {
      if (price > indicators.bollingerBands.middle) {
        bullishIndicators.push(`Price above BB middle $${indicators.bollingerBands.middle.toFixed(2)} (bullish)`)
        actualBullishCount++
      } else if (price < indicators.bollingerBands.middle) {
        bearishIndicators.push(`Price below BB middle $${indicators.bollingerBands.middle.toFixed(2)} (bearish - CONTRADICTS BUY)`)
        actualBearishCount++
      }
      if (price > indicators.bollingerBands.upper) {
        bearishIndicators.push(`Price above BB upper $${indicators.bollingerBands.upper.toFixed(2)} (overbought - CONTRADICTS BUY)`)
        actualBearishCount++
      }
    }
    
    // Parabolic SAR
    if (indicators?.parabolicSAR && price > 0) {
      if (price > indicators.parabolicSAR) {
        bullishIndicators.push(`Parabolic SAR $${indicators.parabolicSAR.toFixed(2)} bullish (below price)`)
        actualBullishCount++
      } else {
        bearishIndicators.push(`Parabolic SAR $${indicators.parabolicSAR.toFixed(2)} bearish (above price - CONTRADICTS BUY)`)
        actualBearishCount++
      }
    }
    
    // Aroon
    if (indicators?.aroon) {
      if (indicators.aroon.up > indicators.aroon.down) {
        bullishIndicators.push(`Aroon Up ${indicators.aroon.up.toFixed(2)} > Down ${indicators.aroon.down.toFixed(2)} (bullish trend)`)
        actualBullishCount++
      } else if (indicators.aroon.down > indicators.aroon.up) {
        bearishIndicators.push(`Aroon Down ${indicators.aroon.down.toFixed(2)} > Up ${indicators.aroon.up.toFixed(2)} (bearish trend - CONTRADICTS BUY)`)
        actualBearishCount++
      }
    }
    
    // VWAP
    if (indicators?.vwap && price > 0) {
      if (price > indicators.vwap) {
        bullishIndicators.push(`Price above VWAP $${indicators.vwap.toFixed(2)} (bullish)`)
        actualBullishCount++
      } else {
        bearishIndicators.push(`Price below VWAP $${indicators.vwap.toFixed(2)} (bearish - CONTRADICTS BUY)`)
        actualBearishCount++
      }
    }
    
    // 24h Change
    if (indicators?.priceChange24h !== undefined && indicators.priceChange24h !== null) {
      if (indicators.priceChange24h > 0) {
        bullishIndicators.push(`24h change +${indicators.priceChange24h.toFixed(2)}% (bullish)`)
        actualBullishCount++
      } else if (indicators.priceChange24h < 0) {
        bearishIndicators.push(`24h change ${indicators.priceChange24h.toFixed(2)}% (bearish - CONTRADICTS BUY)`)
        actualBearishCount++
      }
    }
    
    // RSI
    if (indicators?.rsi14 !== undefined && indicators.rsi14 !== null) {
      if (indicators.rsi14 > 70) {
        bearishIndicators.push(`RSI(14) ${indicators.rsi14.toFixed(2)} overbought (potential reversal - CONTRADICTS BUY)`)
        actualBearishCount++
      } else if (indicators.rsi14 < 30) {
        bullishIndicators.push(`RSI(14) ${indicators.rsi14.toFixed(2)} oversold (bullish)`)
        actualBullishCount++
      } else {
        bullishIndicators.push(`RSI(14) ${indicators.rsi14.toFixed(2)} neutral`)
        actualBullishCount++
      }
    }
    if (indicators?.rsi7 !== undefined && indicators.rsi7 !== null) {
      if (indicators.rsi7 > 70) {
        bearishIndicators.push(`RSI(7) ${indicators.rsi7.toFixed(2)} overbought (potential reversal - CONTRADICTS BUY)`)
        actualBearishCount++
      } else if (indicators.rsi7 < 30) {
        bullishIndicators.push(`RSI(7) ${indicators.rsi7.toFixed(2)} oversold (bullish)`)
        actualBullishCount++
      }
    }
    
    // RSI Divergence
    if (indicators?.rsiDivergence?.divergence) {
      const divLower = indicators.rsiDivergence.divergence.toLowerCase()
      if (divLower.includes('bullish')) {
        bullishIndicators.push(`RSI divergence bullish`)
        actualBullishCount++
      } else if (divLower.includes('bearish')) {
        bearishIndicators.push(`RSI divergence bearish (CONTRADICTS BUY)`)
        actualBearishCount++
      }
    }
    
    // Daily Trend
    if (trendAlignment) {
      const dailyTrend = (trendAlignment as any).dailyTrend || trendAlignment.trend
      if (dailyTrend === 'uptrend') {
        bullishIndicators.push(`Daily trend uptrend`)
        actualBullishCount++
      } else if (dailyTrend === 'downtrend') {
        bearishIndicators.push(`Daily trend downtrend (counter-trend - CONTRADICTS BUY)`)
        actualBearishCount++
      } else {
        bearishIndicators.push(`Daily trend neutral (no clear direction)`)
        actualBearishCount++
      }
    }
    
    // Volume Trend
    if (indicators?.volumeTrend) {
      if (indicators.volumeTrend === 'increasing') {
        bullishIndicators.push(`Volume trend increasing (bullish)`)
        actualBullishCount++
      } else if (indicators.volumeTrend === 'decreasing') {
        bearishIndicators.push(`Volume trend decreasing (bearish - CONTRADICTS BUY)`)
        actualBearishCount++
      } else {
        bearishIndicators.push(`Volume trend stable (no confirmation)`)
        actualBearishCount++
      }
    }
    
    // Volume Change
    if (indicators?.volumeChangePercent !== undefined && indicators.volumeChangePercent !== null) {
      const volChange = indicators.volumeChangePercent
      if (volChange > 50) {
        bullishIndicators.push(`Volume change +${volChange.toFixed(2)}% (strong increase)`)
        actualBullishCount++
      } else if (volChange < -50) {
        bearishIndicators.push(`Volume change ${volChange.toFixed(2)}% (significant drop - CONTRADICTS BUY)`)
        actualBearishCount++
      } else if (volChange < 0) {
        bearishIndicators.push(`Volume change ${volChange.toFixed(2)}% (decreasing - CONTRADICTS BUY)`)
        actualBearishCount++
      }
    }
    
    // Volume-Price Divergence
    if (indicators?.volumePriceDivergence !== undefined && indicators.volumePriceDivergence !== null) {
      const vpd = indicators.volumePriceDivergence
      if (vpd > 0.5) {
        bullishIndicators.push(`Volume-price divergence bullish +${vpd.toFixed(2)} (price falling but volume increasing)`)
        actualBullishCount++
      } else if (vpd < -0.5) {
        bearishIndicators.push(`Volume-price divergence bearish ${vpd.toFixed(2)} (price rising but volume decreasing - CONTRADICTS BUY)`)
        actualBearishCount++
      }
    }
    
    // Funding Rate
    if (externalData?.hyperliquid?.fundingRate !== undefined && externalData.hyperliquid.fundingRate !== null) {
      const fundingRate = externalData.hyperliquid.fundingRate
      if (fundingRate < 0) {
        bullishIndicators.push(`Funding rate ${(fundingRate * 100).toFixed(4)}% negative (bullish)`)
        actualBullishCount++
      } else if (fundingRate > 0) {
        bearishIndicators.push(`Funding rate +${(fundingRate * 100).toFixed(4)}% positive (bearish - CONTRADICTS BUY)`)
        actualBearishCount++
      }
    }
    
    // Premium to Oracle
    if (externalData?.hyperliquid?.premium !== undefined && externalData.hyperliquid.premium !== null) {
      const premium = externalData.hyperliquid.premium
      if (premium < 0) {
        bullishIndicators.push(`Premium to oracle ${(premium * 100).toFixed(4)}% negative (undervalued)`)
        actualBullishCount++
      } else if (premium > 0) {
        bearishIndicators.push(`Premium to oracle +${(premium * 100).toFixed(4)}% positive (overvalued - CONTRADICTS BUY)`)
        actualBearishCount++
      }
    }
    
    // Whale Activity
    if (externalData?.blockchain?.whaleActivityScore !== undefined && externalData.blockchain.whaleActivityScore !== null) {
      const whaleScore = externalData.blockchain.whaleActivityScore
      if (whaleScore > 0) {
        bullishIndicators.push(`Whale activity score +${whaleScore.toFixed(2)} bullish`)
        actualBullishCount++
      } else if (whaleScore < 0) {
        bearishIndicators.push(`Whale activity score ${whaleScore.toFixed(2)} bearish (CONTRADICTS BUY)`)
        actualBearishCount++
      }
    }
    
    // Order Book Imbalance
    if (externalData?.orderBook?.imbalance !== undefined && externalData.orderBook.imbalance !== null) {
      const imbalance = externalData.orderBook.imbalance
      if (imbalance > 0.1) {
        bullishIndicators.push(`Order book imbalance +${(imbalance * 100).toFixed(2)}% bullish (more bids than asks)`)
        actualBullishCount++
      } else if (imbalance < -0.1) {
        bearishIndicators.push(`Order book imbalance ${(imbalance * 100).toFixed(2)}% bearish (more asks than bids - CONTRADICTS BUY)`)
        actualBearishCount++
      }
    }
    
    // CVD Trend
    if (externalData?.volumeDelta?.cvdTrend) {
      if (externalData.volumeDelta.cvdTrend === 'rising') {
        bullishIndicators.push(`CVD trend rising (bullish)`)
        actualBullishCount++
      } else if (externalData.volumeDelta.cvdTrend === 'falling') {
        bearishIndicators.push(`CVD trend falling (bearish - CONTRADICTS BUY)`)
        actualBearishCount++
      }
    }
    
    // Change of Character (COC)
    if (externalData?.marketStructure?.coc?.coc) {
      if (externalData.marketStructure.coc.coc === 'bullish') {
        bullishIndicators.push(`Change of Character bullish (trend reversal)`)
        actualBullishCount++
      } else if (externalData.marketStructure.coc.coc === 'bearish') {
        bearishIndicators.push(`Change of Character bearish (trend reversal - CONTRADICTS BUY)`)
        actualBearishCount++
      }
    }
    
    // ATR
    if (indicators?.atr !== undefined && indicators.atr !== null && price > 0) {
      const atrPercent = (indicators.atr / price) * 100
      if (atrPercent < 1.5) {
        bearishIndicators.push(`ATR ${atrPercent.toFixed(2)}% low volatility (whipsaw risk - CONTRADICTS BUY)`)
        actualBearishCount++
      }
    }
    
    // Exchange Flow
    if (externalData?.blockchain?.estimatedExchangeFlow !== undefined && externalData.blockchain.estimatedExchangeFlow !== null) {
      const exchangeFlow = externalData.blockchain.estimatedExchangeFlow
      if (exchangeFlow > 0) {
        bearishIndicators.push(`Exchange inflow $${(exchangeFlow / 1000000).toFixed(2)}M (bearish pressure - CONTRADICTS BUY)`)
        actualBearishCount++
      } else if (exchangeFlow < 0) {
        bullishIndicators.push(`Exchange outflow $${Math.abs(exchangeFlow / 1000000).toFixed(2)}M (bullish pressure)`)
        actualBullishCount++
      }
    }
    
    // Calculate quality-weighted scores
    const weightedResult: QualityWeightedResult = calculateQualityWeightedJustification(
      signal,
      indicators,
      trendAlignment,
      externalData
    )
    
    // Use weighted scores instead of simple counts
    const finalBullishScore = weightedResult.bullishScore
    const finalBearishScore = weightedResult.bearishScore
    const finalBullishCount = weightedResult.uniqueBullishCount // Use unique count
    const finalBearishCount = weightedResult.uniqueBearishCount
    const qualityRatio = weightedResult.qualityRatio
    
    // Check for contradictions using weighted scores
    if (finalBearishScore > finalBullishScore) {
      justificationParts.push(`🚨 CONTRADICTION: BUY signal but weighted bearish score (${finalBearishScore.toFixed(1)}) outweighs bullish (${finalBullishScore.toFixed(1)})`)
    } else if (finalBearishScore === finalBullishScore) {
      justificationParts.push(`⚠️ MIXED SIGNALS: Weighted scores equal (Bullish: ${finalBullishScore.toFixed(1)} vs Bearish: ${finalBearishScore.toFixed(1)})`)
    } else {
      const scoreDiff = ((finalBullishScore - finalBearishScore) / finalBullishScore) * 100
      if (scoreDiff > 50) {
        justificationParts.push(`✅ STRONG: Quality-weighted bullish score (${finalBullishScore.toFixed(1)}) significantly outweighs bearish (${finalBearishScore.toFixed(1)}) - Quality Ratio: ${(qualityRatio * 100).toFixed(1)}%`)
      } else {
        justificationParts.push(`⚠️ MODERATE: Quality-weighted bullish score (${finalBullishScore.toFixed(1)}) outweighs bearish (${finalBearishScore.toFixed(1)}) - Quality Ratio: ${(qualityRatio * 100).toFixed(1)}%`)
      }
    }
    
    // Show redundant groups warning
    if (weightedResult.redundantGroups.length > 0) {
      justificationParts.push(`\n⚠️ REDUNDANCY: ${weightedResult.redundantGroups.length} indicator group(s) contain redundant indicators (only highest weight counted): ${weightedResult.redundantGroups.join(', ')}`)
    }
    
    // Show contradictions
    if (weightedResult.contradictions.length > 0) {
      justificationParts.push(`\n🚨 CRITICAL CONTRADICTIONS:`)
      weightedResult.contradictions.forEach(cont => {
        justificationParts.push(`   • ${cont}`)
      })
    }
    
    // Build comprehensive justification with quality-weighted indicators
    let finalJustification = justificationParts.join('\n')
    
    // Add QUALITY-WEIGHTED INDICATORS section
    if (weightedResult.bullishIndicators.length > 0 || weightedResult.bearishIndicators.length > 0) {
      finalJustification += '\n\n📊 QUALITY-WEIGHTED INDICATORS:'
      
      // Group by impact
      const highImpactBullish = weightedResult.bullishIndicators.filter(i => i.impact === 'high')
      const mediumImpactBullish = weightedResult.bullishIndicators.filter(i => i.impact === 'medium')
      const lowImpactBullish = weightedResult.bullishIndicators.filter(i => i.impact === 'low')
      
      const highImpactBearish = weightedResult.bearishIndicators.filter(i => i.impact === 'high')
      const mediumImpactBearish = weightedResult.bearishIndicators.filter(i => i.impact === 'medium')
      const lowImpactBearish = weightedResult.bearishIndicators.filter(i => i.impact === 'low')
      
      if (highImpactBullish.length > 0 || highImpactBearish.length > 0) {
        finalJustification += '\n\n🚨 HIGH IMPACT:'
        if (highImpactBullish.length > 0) {
          finalJustification += `\n  Supporting (Bullish - ${highImpactBullish.reduce((sum, i) => sum + i.weight, 0).toFixed(1)} pts):`
          highImpactBullish.forEach(ind => {
            finalJustification += `\n    • [Weight: ${ind.weight.toFixed(1)}] ${ind.description}`
          })
        }
        if (highImpactBearish.length > 0) {
          finalJustification += `\n  Contradicting (Bearish - ${highImpactBearish.reduce((sum, i) => sum + i.weight, 0).toFixed(1)} pts):`
          highImpactBearish.forEach(ind => {
            finalJustification += `\n    • [Weight: ${ind.weight.toFixed(1)}] ${ind.description}`
          })
        }
      }
      
      if (mediumImpactBullish.length > 0 || mediumImpactBearish.length > 0) {
        finalJustification += '\n\n⚠️ MEDIUM IMPACT:'
        if (mediumImpactBullish.length > 0) {
          finalJustification += `\n  Supporting (Bullish - ${mediumImpactBullish.reduce((sum, i) => sum + i.weight, 0).toFixed(1)} pts): ${mediumImpactBullish.map(i => i.description).join(', ')}`
        }
        if (mediumImpactBearish.length > 0) {
          finalJustification += `\n  Contradicting (Bearish - ${mediumImpactBearish.reduce((sum, i) => sum + i.weight, 0).toFixed(1)} pts): ${mediumImpactBearish.map(i => i.description).join(', ')}`
        }
      }
      
      if (lowImpactBullish.length > 0 || lowImpactBearish.length > 0) {
        finalJustification += '\n\n📌 LOW IMPACT:'
        if (lowImpactBullish.length > 0) {
          // OPTIMIZATION 100x: Pre-compute reduce() and map().join() results
          let lowBullishSum = 0
          const lowBullishDescs: string[] = []
          for (let i = 0; i < lowImpactBullish.length; i++) {
            const ind = lowImpactBullish[i]
            if (ind) {
              lowBullishSum += ind.weight
              if (ind.description) lowBullishDescs.push(ind.description)
            }
          }
          finalJustification += `\n  Supporting (Bullish - ${lowBullishSum.toFixed(1)} pts): ${lowBullishDescs.join(', ')}`
        }
        if (lowImpactBearish.length > 0) {
          // OPTIMIZATION 100x: Pre-compute reduce() and map().join() results
          let lowBearishSum = 0
          const lowBearishDescs: string[] = []
          for (let i = 0; i < lowImpactBearish.length; i++) {
            const ind = lowImpactBearish[i]
            if (ind) {
              lowBearishSum += ind.weight
              if (ind.description) lowBearishDescs.push(ind.description)
            }
          }
          finalJustification += `\n  Contradicting (Bearish - ${lowBearishSum.toFixed(1)} pts): ${lowBearishDescs.join(', ')}`
        }
      }
      
      // Summary
      finalJustification += `\n\n📊 SUMMARY:`
      finalJustification += `\n  • Unique Bullish Indicators: ${finalBullishCount} (Weighted Score: ${finalBullishScore.toFixed(1)})`
      finalJustification += `\n  • Unique Bearish Indicators: ${finalBearishCount} (Weighted Score: ${finalBearishScore.toFixed(1)})`
      finalJustification += `\n  • Quality Ratio: ${(qualityRatio * 100).toFixed(1)}% bullish`
      
      // Conflict Severity
      const severityLabel = weightedResult.conflictSeverity === 3.0 ? 'CRITICAL' : 
                           weightedResult.conflictSeverity === 2.0 ? 'HIGH' : 
                           weightedResult.conflictSeverity === 1.5 ? 'MEDIUM' : 'LOW'
      finalJustification += `\n  • Conflict Severity: ${severityLabel} (${weightedResult.totalContradictions} contradictions, Score: ${weightedResult.conflictScore.toFixed(1)})`
      
      // Confidence Adjustment
      finalJustification += `\n  • Base Confidence: ${(weightedResult.baseConfidence * 100).toFixed(1)}%`
      finalJustification += `\n  • Adjusted Confidence: ${(weightedResult.adjustedConfidence * 100).toFixed(1)}%`
      if (weightedResult.redundancyPenalty > 0) {
        finalJustification += `\n  • Redundancy Penalty: -${(weightedResult.redundancyPenalty * 100).toFixed(1)}% (${weightedResult.redundantGroups.length} redundant group(s))`
      }
      
      // Adjustment breakdown
      if (weightedResult.adjustedConfidence !== weightedResult.baseConfidence) {
        const adjustmentPercent = ((weightedResult.adjustedConfidence - weightedResult.baseConfidence) / weightedResult.baseConfidence) * 100
        finalJustification += `\n  • Total Adjustment: ${adjustmentPercent >= 0 ? '+' : ''}${adjustmentPercent.toFixed(1)}%`
        if (weightedResult.conflictSeverity === 3.0) {
          finalJustification += `\n    → Conflict Severity Penalty: -30% (CRITICAL conflicts detected)`
        } else if (weightedResult.conflictSeverity === 2.0) {
          finalJustification += `\n    → Conflict Severity Penalty: -15% (HIGH conflicts detected)`
        } else if (weightedResult.conflictSeverity === 1.5) {
          finalJustification += `\n    → Conflict Severity Penalty: -5% (MEDIUM conflicts detected)`
        }
      }
    }
    
    // Add high risk warning based on weighted scores
    if (finalBearishScore > finalBullishScore) {
      finalJustification += `\n\n🚨 HIGH RISK: Weighted bearish score (${finalBearishScore.toFixed(1)}) exceeds bullish (${finalBullishScore.toFixed(1)}) - Signal contradicts quality indicators`
    } else if (finalBearishScore > 0 && weightedResult.bearishIndicators.length > 0) {
      const riskRatio = finalBearishScore / finalBullishScore
      if (riskRatio > 0.5) {
        finalJustification += `\n\n⚠️ MODERATE RISK: ${finalBearishCount} high-quality bearish indicators present (${finalBearishScore.toFixed(1)} pts) - use tight stop loss`
      }
    }
    
    // Add conflict severity warning
    if (weightedResult.conflictSeverity === 3.0) {
      finalJustification += `\n\n🚨 CRITICAL CONFLICTS: ${weightedResult.totalContradictions} major contradictions detected - Position size should be reduced to 10-15%`
    } else if (weightedResult.conflictSeverity === 2.0) {
      finalJustification += `\n\n⚠️ HIGH CONFLICTS: ${weightedResult.totalContradictions} significant contradictions detected - Use tighter stop loss`
    }
    
    // Add Red Flags section
    const redFlagsSection = generateRedFlagsSection(signal, indicators, trendAlignment, externalData)
    if (redFlagsSection) {
      finalJustification += `\n\n${redFlagsSection}`
    }
    
    return finalJustification
  } else if (signal.signal === 'sell_to_enter') {
    // List BEARISH indicators (supporting SELL signal) - ALL indicators
    const bearishIndicators: string[] = []
    const bullishIndicators: string[] = []
    
    // Count indicators as we add them
    let actualBullishCount = 0
    let actualBearishCount = 0
    
    // MACD histogram and signal line
    if (indicators?.macd?.histogram !== undefined) {
      if (indicators.macd.histogram < 0) {
        bearishIndicators.push(`MACD histogram ${indicators.macd.histogram.toFixed(4)} (bearish momentum)`)
        actualBearishCount++
      } else {
        bullishIndicators.push(`MACD histogram +${indicators.macd.histogram.toFixed(4)} (CONTRADICTS SELL)`)
        actualBullishCount++
      }
    }
    // MACD signal line crossover
    if (indicators?.macd?.macd !== undefined && indicators?.macd?.signal !== undefined) {
      if (indicators.macd.macd < indicators.macd.signal) {
        bearishIndicators.push(`MACD line ${indicators.macd.macd.toFixed(4)} below Signal ${indicators.macd.signal.toFixed(4)} (bearish crossover)`)
        actualBearishCount++
      } else {
        bullishIndicators.push(`MACD line ${indicators.macd.macd.toFixed(4)} above Signal ${indicators.macd.signal.toFixed(4)} (bullish crossover - CONTRADICTS SELL)`)
        actualBullishCount++
      }
    }
    
    // EMA8 (fast-moving average for intraday momentum)
    if (indicators?.ema8 !== undefined && indicators.ema8 !== null && price > 0) {
      if (price < indicators.ema8) {
        bearishIndicators.push(`Price below EMA8 $${indicators.ema8.toFixed(2)} (bearish momentum)`)
        actualBearishCount++
      } else {
        bullishIndicators.push(`Price above EMA8 $${indicators.ema8.toFixed(2)} (bullish momentum - CONTRADICTS SELL)`)
        actualBullishCount++
      }
    }
    
    // EMA20/EMA50/EMA200 (trend context)
    if (indicators?.ema20 !== undefined && indicators.ema20 !== null && price > 0) {
      if (price < indicators.ema20) {
        bearishIndicators.push(`Price below EMA20 $${indicators.ema20.toFixed(2)} (bearish)`)
        actualBearishCount++
      } else {
        bullishIndicators.push(`Price above EMA20 $${indicators.ema20.toFixed(2)} (bullish - CONTRADICTS SELL)`)
        actualBullishCount++
      }
    }
    // EMA alignment check
    if (indicators?.ema20 && indicators?.ema50 && price > 0) {
      if (price < indicators.ema20 && indicators.ema20 < indicators.ema50) {
        bearishIndicators.push(`EMA alignment: Price < EMA20 < EMA50 (downtrend structure)`)
        actualBearishCount++
      } else if (price > indicators.ema20 && indicators.ema20 > indicators.ema50) {
        bullishIndicators.push(`EMA alignment: Price > EMA20 > EMA50 (uptrend structure - CONTRADICTS SELL)`)
        actualBullishCount++
      }
    }
    // EMA200 as major trend filter
    if (indicators?.ema200 !== undefined && indicators.ema200 !== null && price > 0) {
      if (price < indicators.ema200) {
        bearishIndicators.push(`Price below EMA200 $${indicators.ema200.toFixed(2)} (major downtrend)`)
        actualBearishCount++
      } else {
        bullishIndicators.push(`Price above EMA200 $${indicators.ema200.toFixed(2)} (major uptrend - CONTRADICTS SELL)`)
        actualBullishCount++
      }
    }
    
    // ADX (trend strength) - helper function for safe extraction
    const getAdxValue = (adx: any): number | null => {
      if (adx === null || adx === undefined) return null
      if (typeof adx === 'number' && !isNaN(adx)) return adx
      if (typeof adx === 'object' && adx !== null && typeof adx.adx === 'number' && !isNaN(adx.adx)) {
        return adx.adx
      }
      return null
    }
    
    const adxValue = getAdxValue(indicators?.adx)
    if (adxValue !== null) {
      if (adxValue > 25) {
        bearishIndicators.push(`ADX ${adxValue.toFixed(2)} (strong trend - supporting signal)`)
        actualBearishCount++
      } else if (adxValue < 20) {
        bullishIndicators.push(`ADX ${adxValue.toFixed(2)} (weak trend - CONTRADICTS SELL)`)
        actualBullishCount++
      }
    }
    
    // plusDI/minusDI (directional movement)
    if (indicators?.plusDI !== undefined && indicators.plusDI !== null && 
        indicators?.minusDI !== undefined && indicators.minusDI !== null) {
      if (indicators.minusDI > indicators.plusDI) {
        bearishIndicators.push(`-DI ${indicators.minusDI.toFixed(2)} > +DI ${indicators.plusDI.toFixed(2)} (bearish trend)`)
        actualBearishCount++
      } else if (indicators.plusDI > indicators.minusDI) {
        bullishIndicators.push(`+DI ${indicators.plusDI.toFixed(2)} > -DI ${indicators.minusDI.toFixed(2)} (bullish trend - CONTRADICTS SELL)`)
        actualBullishCount++
      }
    }
    
    // Stochastic (momentum)
    if (indicators?.stochastic?.k !== undefined && indicators.stochastic.k !== null) {
      const stochK = indicators.stochastic.k
      if (stochK < 20) {
        bearishIndicators.push(`Stochastic K ${stochK.toFixed(2)} oversold (potential reversal)`)
        actualBearishCount++
      } else if (stochK > 80) {
        bullishIndicators.push(`Stochastic K ${stochK.toFixed(2)} overbought (potential reversal - CONTRADICTS SELL)`)
        actualBullishCount++
      } else {
        bearishIndicators.push(`Stochastic K ${stochK.toFixed(2)} neutral`)
        actualBearishCount++
      }
    }
    
    // CCI (Commodity Channel Index)
    if (indicators?.cci !== undefined && indicators.cci !== null) {
      if (indicators.cci < -100) {
        bearishIndicators.push(`CCI ${indicators.cci.toFixed(2)} oversold (potential reversal)`)
        actualBearishCount++
      } else if (indicators.cci > 100) {
        bullishIndicators.push(`CCI ${indicators.cci.toFixed(2)} overbought (potential reversal - CONTRADICTS SELL)`)
        actualBullishCount++
      } else {
        bearishIndicators.push(`CCI ${indicators.cci.toFixed(2)} neutral`)
        actualBearishCount++
      }
    }
    
    // Williams %R (momentum oscillator)
    if (indicators?.williamsR !== undefined && indicators.williamsR !== null) {
      if (indicators.williamsR < -80) {
        bearishIndicators.push(`Williams %R ${indicators.williamsR.toFixed(2)} oversold (potential reversal)`)
        actualBearishCount++
      } else if (indicators.williamsR > -20) {
        bullishIndicators.push(`Williams %R ${indicators.williamsR.toFixed(2)} overbought (potential reversal - CONTRADICTS SELL)`)
        actualBullishCount++
      } else {
        bearishIndicators.push(`Williams %R ${indicators.williamsR.toFixed(2)} neutral`)
        actualBearishCount++
      }
    }
    
    // Fibonacci Retracement
    if (indicators?.fibonacciRetracement && typeof indicators.fibonacciRetracement === 'object') {
      const fib = indicators.fibonacciRetracement
      if (fib.signal === 'sell') {
        bearishIndicators.push(`Fibonacci Retracement: ${fib.nearestLevel || 'N/A'} level (SELL signal, Strength: ${fib.strength || 0}/100)`)
        actualBearishCount++
      } else if (fib.signal === 'buy') {
        bullishIndicators.push(`Fibonacci Retracement: ${fib.nearestLevel || 'N/A'} level (BUY signal - CONTRADICTS SELL)`)
        actualBullishCount++
      }
      if (fib.isNearLevel && fib.nearestLevel) {
        if (fib.nearestLevel === '38.2%' || fib.nearestLevel === '50%' || fib.nearestLevel === '61.8%') {
          bearishIndicators.push(`Price near Fibonacci ${fib.nearestLevel} level (key resistance)`)
          actualBearishCount++
        }
      }
    }
    
    // Market Structure
    if (indicators?.marketStructure && typeof indicators.marketStructure === 'object') {
      const ms = indicators.marketStructure
      if (ms.lowerHighs && ms.lowerLows) {
        bearishIndicators.push(`Market Structure: Lower highs and lower lows (downtrend confirmation)`)
        actualBearishCount++
      } else if (ms.higherHighs && ms.higherLows) {
        bullishIndicators.push(`Market Structure: Higher highs and higher lows (uptrend - CONTRADICTS SELL)`)
        actualBullishCount++
      }
    }
    
    // Candlestick Patterns
    if (indicators?.candlestickPatterns && 
        indicators.candlestickPatterns.patterns && 
        Array.isArray(indicators.candlestickPatterns.patterns) &&
        indicators.candlestickPatterns.patterns.length > 0) {
      const patterns = indicators.candlestickPatterns.patterns
      // Pattern types in candlestick.ts: 'doji', 'hammer', 'bullish_engulfing', 'bearish_engulfing'
      const bullishPatterns = patterns.filter((p: any) => 
        p.type && (p.type === 'bullish_engulfing' || 
                   p.type === 'hammer' ||
                   (p.type === 'doji' && p.bullish === true)))
      const bearishPatterns = patterns.filter((p: any) => 
        p.type && (p.type === 'bearish_engulfing' ||
                   (p.type === 'doji' && p.bullish === false)))
      if (bearishPatterns.length > 0) {
        bearishIndicators.push(`Candlestick Patterns: ${bearishPatterns.map((p: any) => p.type).join(', ')} (bearish)`)
        actualBearishCount++
      }
      if (bullishPatterns.length > 0) {
        // OPTIMIZATION 100x: Replace map().join() with for loop + join (faster)
        const bullishPatternsTypes: string[] = []
        for (let i = 0; i < bullishPatterns.length; i++) {
          const p = bullishPatterns[i]
          if (p && p.type) bullishPatternsTypes.push(p.type)
        }
        bullishIndicators.push(`Candlestick Patterns: ${bullishPatternsTypes.join(', ')} (bullish - CONTRADICTS SELL)`)
        actualBullishCount++
      }
    }
    
    // Market Regime
    if (indicators?.marketRegime && typeof indicators.marketRegime === 'object') {
      const mr = indicators.marketRegime
      if (mr.regime === 'trending') {
        bearishIndicators.push(`Market Regime: Trending (${mr.volatility || 'normal'} volatility - favorable for trading)`)
        actualBearishCount++
      } else if (mr.regime === 'choppy') {
        bullishIndicators.push(`Market Regime: Choppy (${mr.volatility || 'normal'} volatility - unfavorable for trading - CONTRADICTS SELL)`)
        actualBullishCount++
      }
    }
    
    // MACD Divergence
    if (indicators?.macdDivergence?.divergence) {
      const divLower = indicators.macdDivergence.divergence.toLowerCase()
      if (divLower.includes('bearish')) {
        bearishIndicators.push(`MACD divergence bearish (potential reversal down)`)
        actualBearishCount++
      } else if (divLower.includes('bullish')) {
        bullishIndicators.push(`MACD divergence bullish (potential reversal up - CONTRADICTS SELL)`)
        actualBullishCount++
      }
    }
    
    // Support/Resistance (eksplisit)
    if (indicators?.supportResistance && typeof indicators.supportResistance === 'object') {
      const sr = indicators.supportResistance
      if (sr.resistance && price > 0) {
        const distanceToResistance = ((sr.resistance - price) / price) * 100
        if (distanceToResistance < 2 && distanceToResistance > 0) {
          bearishIndicators.push(`Price near resistance $${sr.resistance.toFixed(2)} (within 2% - potential rejection)`)
          actualBearishCount++
        } else if (distanceToResistance < 0) {
          bullishIndicators.push(`Price above resistance $${sr.resistance.toFixed(2)} (breakout - CONTRADICTS SELL)`)
          actualBullishCount++
        }
      }
      if (sr.support && price > 0) {
        const distanceFromSupport = ((price - sr.support) / price) * 100
        if (distanceFromSupport < 2 && distanceFromSupport > 0) {
          bullishIndicators.push(`Price near support $${sr.support.toFixed(2)} (within 2% - potential bounce - CONTRADICTS SELL)`)
          actualBullishCount++
        }
      }
    }
    
    // OBV
    if (indicators?.obv !== undefined && indicators.obv !== null) {
      if (indicators.obv < 0) {
        bearishIndicators.push(`OBV ${indicators.obv.toFixed(2)} (selling pressure)`)
        actualBearishCount++
      } else if (indicators.obv > 0) {
        bullishIndicators.push(`OBV +${indicators.obv.toFixed(2)} (buying pressure - CONTRADICTS SELL)`)
        actualBullishCount++
      }
    }
    
    // Bollinger Bands
    if (indicators?.bollingerBands && price > 0) {
      if (price < indicators.bollingerBands.middle) {
        bearishIndicators.push(`Price below BB middle $${indicators.bollingerBands.middle.toFixed(2)} (bearish)`)
        actualBearishCount++
      } else if (price > indicators.bollingerBands.middle) {
        bullishIndicators.push(`Price above BB middle $${indicators.bollingerBands.middle.toFixed(2)} (bullish - CONTRADICTS SELL)`)
        actualBullishCount++
      }
      if (price < indicators.bollingerBands.lower) {
        bearishIndicators.push(`Price below BB lower $${indicators.bollingerBands.lower.toFixed(2)} (oversold)`)
        actualBearishCount++
      }
    }
    
    // Parabolic SAR
    if (indicators?.parabolicSAR && price > 0) {
      if (price < indicators.parabolicSAR) {
        bearishIndicators.push(`Parabolic SAR $${indicators.parabolicSAR.toFixed(2)} bearish (above price)`)
        actualBearishCount++
      } else {
        bullishIndicators.push(`Parabolic SAR $${indicators.parabolicSAR.toFixed(2)} bullish (below price - CONTRADICTS SELL)`)
        actualBullishCount++
      }
    }
    
    // Aroon
    if (indicators?.aroon) {
      if (indicators.aroon.down > indicators.aroon.up) {
        bearishIndicators.push(`Aroon Down ${indicators.aroon.down.toFixed(2)} > Up ${indicators.aroon.up.toFixed(2)} (bearish trend)`)
        actualBearishCount++
      } else if (indicators.aroon.up > indicators.aroon.down) {
        bullishIndicators.push(`Aroon Up ${indicators.aroon.up.toFixed(2)} > Down ${indicators.aroon.down.toFixed(2)} (bullish trend - CONTRADICTS SELL)`)
        actualBullishCount++
      }
    }
    
    // VWAP
    if (indicators?.vwap && price > 0) {
      if (price < indicators.vwap) {
        bearishIndicators.push(`Price below VWAP $${indicators.vwap.toFixed(2)} (bearish)`)
        actualBearishCount++
      } else {
        bullishIndicators.push(`Price above VWAP $${indicators.vwap.toFixed(2)} (bullish - CONTRADICTS SELL)`)
        actualBullishCount++
      }
    }
    
    // 24h Change
    if (indicators?.priceChange24h !== undefined && indicators.priceChange24h !== null) {
      if (indicators.priceChange24h < 0) {
        bearishIndicators.push(`24h change ${indicators.priceChange24h.toFixed(2)}% (bearish)`)
        actualBearishCount++
      } else if (indicators.priceChange24h > 0) {
        bullishIndicators.push(`24h change +${indicators.priceChange24h.toFixed(2)}% (bullish - CONTRADICTS SELL)`)
        actualBullishCount++
      }
    }
    
    // RSI
    if (indicators?.rsi14 !== undefined && indicators.rsi14 !== null) {
      if (indicators.rsi14 < 30) {
        bearishIndicators.push(`RSI(14) ${indicators.rsi14.toFixed(2)} oversold (potential reversal)`)
        actualBearishCount++
      } else if (indicators.rsi14 > 70) {
        bullishIndicators.push(`RSI(14) ${indicators.rsi14.toFixed(2)} overbought (potential reversal - CONTRADICTS SELL)`)
        actualBullishCount++
      } else {
        bearishIndicators.push(`RSI(14) ${indicators.rsi14.toFixed(2)} neutral`)
        actualBearishCount++
      }
    }
    if (indicators?.rsi7 !== undefined && indicators.rsi7 !== null) {
      if (indicators.rsi7 < 30) {
        bearishIndicators.push(`RSI(7) ${indicators.rsi7.toFixed(2)} oversold (potential reversal)`)
        actualBearishCount++
      } else if (indicators.rsi7 > 70) {
        bullishIndicators.push(`RSI(7) ${indicators.rsi7.toFixed(2)} overbought (potential reversal - CONTRADICTS SELL)`)
        actualBullishCount++
      }
    }
    
    // RSI Divergence
    if (indicators?.rsiDivergence?.divergence) {
      const divLower = indicators.rsiDivergence.divergence.toLowerCase()
      if (divLower.includes('bearish')) {
        bearishIndicators.push(`RSI divergence bearish`)
        actualBearishCount++
      } else if (divLower.includes('bullish')) {
        bullishIndicators.push(`RSI divergence bullish (CONTRADICTS SELL)`)
        actualBullishCount++
      }
    }
    
    // Daily Trend
    if (trendAlignment) {
      const dailyTrend = (trendAlignment as any).dailyTrend || trendAlignment.trend
      if (dailyTrend === 'downtrend') {
        bearishIndicators.push(`Daily trend downtrend`)
        actualBearishCount++
      } else if (dailyTrend === 'uptrend') {
        bullishIndicators.push(`Daily trend uptrend (counter-trend - CONTRADICTS SELL)`)
        actualBullishCount++
      } else {
        bullishIndicators.push(`Daily trend neutral (no clear direction)`)
        actualBullishCount++
      }
    }
    
    // Volume Trend
    if (indicators?.volumeTrend) {
      if (indicators.volumeTrend === 'decreasing') {
        bearishIndicators.push(`Volume trend decreasing (bearish)`)
        actualBearishCount++
      } else if (indicators.volumeTrend === 'increasing') {
        bullishIndicators.push(`Volume trend increasing (bullish - CONTRADICTS SELL)`)
        actualBullishCount++
      } else {
        bullishIndicators.push(`Volume trend stable (no confirmation)`)
        actualBullishCount++
      }
    }
    
    // Volume Change
    if (indicators?.volumeChangePercent !== undefined && indicators.volumeChangePercent !== null) {
      const volChange = indicators.volumeChangePercent
      if (volChange < -50) {
        bearishIndicators.push(`Volume change ${volChange.toFixed(2)}% (significant drop)`)
        actualBearishCount++
      } else if (volChange > 50) {
        bullishIndicators.push(`Volume change +${volChange.toFixed(2)}% (strong increase - CONTRADICTS SELL)`)
        actualBullishCount++
      } else if (volChange > 0) {
        bullishIndicators.push(`Volume change +${volChange.toFixed(2)}% (increasing - CONTRADICTS SELL)`)
        actualBullishCount++
      }
    }
    
    // Volume-Price Divergence
    if (indicators?.volumePriceDivergence !== undefined && indicators.volumePriceDivergence !== null) {
      const vpd = indicators.volumePriceDivergence
      if (vpd < -0.5) {
        bearishIndicators.push(`Volume-price divergence bearish ${vpd.toFixed(2)} (price falling but volume decreasing)`)
        actualBearishCount++
      } else if (vpd > 0.5) {
        bullishIndicators.push(`Volume-price divergence bullish +${vpd.toFixed(2)} (price falling but volume increasing - CONTRADICTS SELL)`)
        actualBullishCount++
      }
    }
    
    // Funding Rate
    if (externalData?.hyperliquid?.fundingRate !== undefined && externalData.hyperliquid.fundingRate !== null) {
      const fundingRate = externalData.hyperliquid.fundingRate
      if (fundingRate > 0) {
        bearishIndicators.push(`Funding rate +${(fundingRate * 100).toFixed(4)}% positive (bearish)`)
        actualBearishCount++
      } else if (fundingRate < 0) {
        bullishIndicators.push(`Funding rate ${(fundingRate * 100).toFixed(4)}% negative (bullish - CONTRADICTS SELL)`)
        actualBullishCount++
      }
    }
    
    // Premium to Oracle
    if (externalData?.hyperliquid?.premium !== undefined && externalData.hyperliquid.premium !== null) {
      const premium = externalData.hyperliquid.premium
      if (premium > 0) {
        bearishIndicators.push(`Premium to oracle +${(premium * 100).toFixed(4)}% positive (overvalued)`)
        actualBearishCount++
      } else if (premium < 0) {
        bullishIndicators.push(`Premium to oracle ${(premium * 100).toFixed(4)}% negative (undervalued - CONTRADICTS SELL)`)
        actualBullishCount++
      }
    }
    
    // Whale Activity
    if (externalData?.blockchain?.whaleActivityScore !== undefined && externalData.blockchain.whaleActivityScore !== null) {
      const whaleScore = externalData.blockchain.whaleActivityScore
      if (whaleScore < 0) {
        bearishIndicators.push(`Whale activity score ${whaleScore.toFixed(2)} bearish`)
        actualBearishCount++
      } else if (whaleScore > 0) {
        bullishIndicators.push(`Whale activity score +${whaleScore.toFixed(2)} bullish (CONTRADICTS SELL)`)
        actualBullishCount++
      }
    }
    
    // Order Book Imbalance
    if (externalData?.orderBook?.imbalance !== undefined && externalData.orderBook.imbalance !== null) {
      const imbalance = externalData.orderBook.imbalance
      if (imbalance < -0.1) {
        bearishIndicators.push(`Order book imbalance ${(imbalance * 100).toFixed(2)}% bearish (more asks than bids)`)
        actualBearishCount++
      } else if (imbalance > 0.1) {
        bullishIndicators.push(`Order book imbalance +${(imbalance * 100).toFixed(2)}% bullish (more bids than asks - CONTRADICTS SELL)`)
        actualBullishCount++
      }
    }
    
    // CVD Trend
    if (externalData?.volumeDelta?.cvdTrend) {
      if (externalData.volumeDelta.cvdTrend === 'falling') {
        bearishIndicators.push(`CVD trend falling (bearish)`)
        actualBearishCount++
      } else if (externalData.volumeDelta.cvdTrend === 'rising') {
        bullishIndicators.push(`CVD trend rising (bullish - CONTRADICTS SELL)`)
        actualBullishCount++
      }
    }
    
    // Change of Character (COC)
    if (externalData?.marketStructure?.coc?.coc) {
      if (externalData.marketStructure.coc.coc === 'bearish') {
        bearishIndicators.push(`Change of Character bearish (trend reversal)`)
        actualBearishCount++
      } else if (externalData.marketStructure.coc.coc === 'bullish') {
        bullishIndicators.push(`Change of Character bullish (trend reversal - CONTRADICTS SELL)`)
        actualBullishCount++
      }
    }
    
    // ATR
    if (indicators?.atr !== undefined && indicators.atr !== null && price > 0) {
      const atrPercent = (indicators.atr / price) * 100
      if (atrPercent < 1.5) {
        bearishIndicators.push(`ATR ${atrPercent.toFixed(2)}% low volatility (whipsaw risk)`)
        actualBearishCount++
      }
    }
    
    // Exchange Flow
    if (externalData?.blockchain?.estimatedExchangeFlow !== undefined && externalData.blockchain.estimatedExchangeFlow !== null) {
      const exchangeFlow = externalData.blockchain.estimatedExchangeFlow
      if (exchangeFlow > 0) {
        bearishIndicators.push(`Exchange inflow $${(exchangeFlow / 1000000).toFixed(2)}M (bearish pressure)`)
        actualBearishCount++
      } else if (exchangeFlow < 0) {
        bullishIndicators.push(`Exchange outflow $${Math.abs(exchangeFlow / 1000000).toFixed(2)}M (bullish pressure - CONTRADICTS SELL)`)
        actualBullishCount++
      }
    }
    
    // Calculate quality-weighted scores (for SELL signals)
    const weightedResult: QualityWeightedResult = calculateQualityWeightedJustification(
      signal,
      indicators,
      trendAlignment,
      externalData
    )
    
    // Use weighted scores instead of simple counts
    const finalBearishScore = weightedResult.bearishScore
    const finalBullishScore = weightedResult.bullishScore
    const finalBearishCount = weightedResult.uniqueBearishCount
    const finalBullishCount = weightedResult.uniqueBullishCount
    const qualityRatio = weightedResult.qualityRatio // This is bullish ratio, so bearish = 1 - qualityRatio
    
    // Check for contradictions using weighted scores
    if (finalBullishScore > finalBearishScore) {
      justificationParts.push(`🚨 CONTRADICTION: SELL signal but weighted bullish score (${finalBullishScore.toFixed(1)}) outweighs bearish (${finalBearishScore.toFixed(1)})`)
    } else if (finalBullishScore === finalBearishScore) {
      justificationParts.push(`⚠️ MIXED SIGNALS: Weighted scores equal (Bearish: ${finalBearishScore.toFixed(1)} vs Bullish: ${finalBullishScore.toFixed(1)})`)
    } else {
      const scoreDiff = ((finalBearishScore - finalBullishScore) / finalBearishScore) * 100
      if (scoreDiff > 50) {
        justificationParts.push(`✅ STRONG: Quality-weighted bearish score (${finalBearishScore.toFixed(1)}) significantly outweighs bullish (${finalBullishScore.toFixed(1)}) - Quality Ratio: ${((1 - qualityRatio) * 100).toFixed(1)}% bearish`)
      } else {
        justificationParts.push(`⚠️ MODERATE: Quality-weighted bearish score (${finalBearishScore.toFixed(1)}) outweighs bullish (${finalBullishScore.toFixed(1)}) - Quality Ratio: ${((1 - qualityRatio) * 100).toFixed(1)}% bearish`)
      }
    }
    
    // Show redundant groups warning
    if (weightedResult.redundantGroups.length > 0) {
      justificationParts.push(`\n⚠️ REDUNDANCY: ${weightedResult.redundantGroups.length} indicator group(s) contain redundant indicators (only highest weight counted): ${weightedResult.redundantGroups.join(', ')}`)
    }
    
    // Show contradictions
    if (weightedResult.contradictions.length > 0) {
      justificationParts.push(`\n🚨 CRITICAL CONTRADICTIONS:`)
      weightedResult.contradictions.forEach(cont => {
        justificationParts.push(`   • ${cont}`)
      })
    }
    
    // Build comprehensive justification with quality-weighted indicators
    let finalJustification = justificationParts.join('\n')
    
    // Add QUALITY-WEIGHTED INDICATORS section (same as BUY signals)
    if (weightedResult.bullishIndicators.length > 0 || weightedResult.bearishIndicators.length > 0) {
      finalJustification += '\n\n📊 QUALITY-WEIGHTED INDICATORS:'
      
      // Group by impact
      const highImpactBullish = weightedResult.bullishIndicators.filter(i => i.impact === 'high')
      const mediumImpactBullish = weightedResult.bullishIndicators.filter(i => i.impact === 'medium')
      const lowImpactBullish = weightedResult.bullishIndicators.filter(i => i.impact === 'low')
      
      const highImpactBearish = weightedResult.bearishIndicators.filter(i => i.impact === 'high')
      const mediumImpactBearish = weightedResult.bearishIndicators.filter(i => i.impact === 'medium')
      const lowImpactBearish = weightedResult.bearishIndicators.filter(i => i.impact === 'low')
      
      if (highImpactBearish.length > 0 || highImpactBullish.length > 0) {
        finalJustification += '\n\n🚨 HIGH IMPACT:'
        if (highImpactBearish.length > 0) {
          finalJustification += `\n  Supporting (Bearish - ${highImpactBearish.reduce((sum, i) => sum + i.weight, 0).toFixed(1)} pts):`
          highImpactBearish.forEach(ind => {
            finalJustification += `\n    • [Weight: ${ind.weight.toFixed(1)}] ${ind.description}`
          })
        }
        if (highImpactBullish.length > 0) {
          finalJustification += `\n  Contradicting (Bullish - ${highImpactBullish.reduce((sum, i) => sum + i.weight, 0).toFixed(1)} pts):`
          highImpactBullish.forEach(ind => {
            finalJustification += `\n    • [Weight: ${ind.weight.toFixed(1)}] ${ind.description}`
          })
        }
      }
      
      if (mediumImpactBearish.length > 0 || mediumImpactBullish.length > 0) {
        finalJustification += '\n\n⚠️ MEDIUM IMPACT:'
        if (mediumImpactBearish.length > 0) {
          finalJustification += `\n  Supporting (Bearish - ${mediumImpactBearish.reduce((sum, i) => sum + i.weight, 0).toFixed(1)} pts): ${mediumImpactBearish.map(i => i.description).join(', ')}`
        }
        if (mediumImpactBullish.length > 0) {
          finalJustification += `\n  Contradicting (Bullish - ${mediumImpactBullish.reduce((sum, i) => sum + i.weight, 0).toFixed(1)} pts): ${mediumImpactBullish.map(i => i.description).join(', ')}`
        }
      }
      
      if (lowImpactBearish.length > 0 || lowImpactBullish.length > 0) {
        finalJustification += '\n\n📌 LOW IMPACT:'
        if (lowImpactBearish.length > 0) {
          // OPTIMIZATION 100x: Pre-compute reduce() and map().join() results
          let lowBearishSum = 0
          const lowBearishDescs: string[] = []
          for (let i = 0; i < lowImpactBearish.length; i++) {
            const ind = lowImpactBearish[i]
            if (ind) {
              lowBearishSum += ind.weight
              if (ind.description) lowBearishDescs.push(ind.description)
            }
          }
          finalJustification += `\n  Supporting (Bearish - ${lowBearishSum.toFixed(1)} pts): ${lowBearishDescs.join(', ')}`
        }
        if (lowImpactBullish.length > 0) {
          // OPTIMIZATION 100x: Pre-compute reduce() and map().join() results
          let lowBullishSum = 0
          const lowBullishDescs: string[] = []
          for (let i = 0; i < lowImpactBullish.length; i++) {
            const ind = lowImpactBullish[i]
            if (ind) {
              lowBullishSum += ind.weight
              if (ind.description) lowBullishDescs.push(ind.description)
            }
          }
          finalJustification += `\n  Contradicting (Bullish - ${lowBullishSum.toFixed(1)} pts): ${lowBullishDescs.join(', ')}`
        }
      }
      
      // Summary
      finalJustification += `\n\n📊 SUMMARY:`
      finalJustification += `\n  • Unique Bearish Indicators: ${finalBearishCount} (Weighted Score: ${finalBearishScore.toFixed(1)})`
      finalJustification += `\n  • Unique Bullish Indicators: ${finalBullishCount} (Weighted Score: ${finalBullishScore.toFixed(1)})`
      finalJustification += `\n  • Quality Ratio: ${((1 - qualityRatio) * 100).toFixed(1)}% bearish`
      
      // Conflict Severity
      const severityLabel = weightedResult.conflictSeverity === 3.0 ? 'CRITICAL' : 
                           weightedResult.conflictSeverity === 2.0 ? 'HIGH' : 
                           weightedResult.conflictSeverity === 1.5 ? 'MEDIUM' : 'LOW'
      finalJustification += `\n  • Conflict Severity: ${severityLabel} (${weightedResult.totalContradictions} contradictions, Score: ${weightedResult.conflictScore.toFixed(1)})`
      
      // Confidence Adjustment
      finalJustification += `\n  • Base Confidence: ${(weightedResult.baseConfidence * 100).toFixed(1)}%`
      finalJustification += `\n  • Adjusted Confidence: ${(weightedResult.adjustedConfidence * 100).toFixed(1)}%`
      if (weightedResult.redundancyPenalty > 0) {
        finalJustification += `\n  • Redundancy Penalty: -${(weightedResult.redundancyPenalty * 100).toFixed(1)}% (${weightedResult.redundantGroups.length} redundant group(s))`
      }
      
      // Adjustment breakdown
      if (weightedResult.adjustedConfidence !== weightedResult.baseConfidence) {
        const adjustmentPercent = ((weightedResult.adjustedConfidence - weightedResult.baseConfidence) / weightedResult.baseConfidence) * 100
        finalJustification += `\n  • Total Adjustment: ${adjustmentPercent >= 0 ? '+' : ''}${adjustmentPercent.toFixed(1)}%`
        if (weightedResult.conflictSeverity === 3.0) {
          finalJustification += `\n    → Conflict Severity Penalty: -30% (CRITICAL conflicts detected)`
        } else if (weightedResult.conflictSeverity === 2.0) {
          finalJustification += `\n    → Conflict Severity Penalty: -15% (HIGH conflicts detected)`
        } else if (weightedResult.conflictSeverity === 1.5) {
          finalJustification += `\n    → Conflict Severity Penalty: -5% (MEDIUM conflicts detected)`
        }
      }
    }
    
    // Add high risk warning based on weighted scores
    if (finalBullishScore > finalBearishScore) {
      finalJustification += `\n\n🚨 HIGH RISK: Weighted bullish score (${finalBullishScore.toFixed(1)}) exceeds bearish (${finalBearishScore.toFixed(1)}) - Signal contradicts quality indicators`
    } else if (finalBullishScore > 0 && weightedResult.bullishIndicators.length > 0) {
      const riskRatio = finalBullishScore / finalBearishScore
      if (riskRatio > 0.5) {
        finalJustification += `\n\n⚠️ MODERATE RISK: ${finalBullishCount} high-quality bullish indicators present (${finalBullishScore.toFixed(1)} pts) - use tight stop loss`
      }
    }
    
    // Add conflict severity warning
    if (weightedResult.conflictSeverity === 3.0) {
      finalJustification += `\n\n🚨 CRITICAL CONFLICTS: ${weightedResult.totalContradictions} major contradictions detected - Position size should be reduced to 10-15%`
    } else if (weightedResult.conflictSeverity === 2.0) {
      finalJustification += `\n\n⚠️ HIGH CONFLICTS: ${weightedResult.totalContradictions} significant contradictions detected - Use tighter stop loss`
    }
    
    // Add Red Flags section
    const redFlagsSection = generateRedFlagsSection(signal, indicators, trendAlignment, externalData)
    if (redFlagsSection) {
      finalJustification += `\n\n${redFlagsSection}`
    }
    
    return finalJustification
  }
  
  // Fallback: return original justification if signal type doesn't match
  return signal.justification || 'Signal generated based on technical analysis'
}

