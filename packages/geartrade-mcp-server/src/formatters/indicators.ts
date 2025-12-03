/**
 * Formatters for Technical Indicators
 * Extracted from index.ts for better modularity
 */

import { calculateFibonacciRetracement } from '../signal-generation/technical-indicators/fibonacci'
import { calculateRSI } from '../signal-generation/technical-indicators/momentum'
import { detectDivergence } from '../signal-generation/analysis/divergence'
import { detectCandlestickPatterns } from '../signal-generation/analysis/candlestick'
import { checkBounceSetup, checkBouncePersistence } from '../signal-generation/analysis/bounce'
import { detectTrend, detectMarketStructure } from '../signal-generation/analysis/trend-detection'
import { calculateEnhancedMetrics } from '../signal-generation/analysis/enhanced-metrics'

/**
 * Format technical indicators from asset data
 */
export function formatTechnicalIndicators(assetData: any, price: number | null) {
  const indicators = assetData?.indicators || assetData?.data?.indicators || {}
  const trendAlignment = assetData?.data?.trendAlignment || assetData?.trendAlignment
  const multiTimeframeIndicators = assetData?.data?.multiTimeframeIndicators || assetData?.multiTimeframeIndicators || {}
  const supportResistance = indicators.supportResistance || {}
  const bollingerBands = indicators.bollingerBands || {}

  // Calculate Bollinger Bands position if we have bands and price
  let bbPosition: string | null = null
  if (price && bollingerBands.upper && bollingerBands.lower && bollingerBands.middle) {
    if (price > bollingerBands.upper) {
      bbPosition = 'Above upper (Overbought)'
    } else if (price < bollingerBands.lower) {
      bbPosition = 'Below lower (Oversold)'
    } else if (price > bollingerBands.middle) {
      bbPosition = 'Above middle (Bullish)'
    } else {
      bbPosition = 'Below middle (Bearish)'
    }
  }

  // Calculate 24h change if we have historical data
  let change24h: number | null = null
  let volumeChange24h: number | null = null
  const historicalData = assetData?.historicalData || assetData?.data?.historicalData || []
  if (historicalData.length >= 24 && price) {
    const candles24hAgo = historicalData.length >= 24 ? historicalData[historicalData.length - 24] : null
    if (candles24hAgo && candles24hAgo.close) {
      const price24hAgo = candles24hAgo.close
      change24h = ((price - price24hAgo) / price24hAgo) * 100
    }
    
    // Calculate volume change
    if (historicalData.length >= 24) {
      const recentVolumes = historicalData.slice(-24).map((c: any) => c.volume || 0).filter((v: number) => v > 0)
      const olderVolumes = historicalData.slice(-48, -24).map((c: any) => c.volume || 0).filter((v: number) => v > 0)
      if (recentVolumes.length > 0 && olderVolumes.length > 0) {
        const avgRecent = recentVolumes.reduce((a: number, b: number) => a + b, 0) / recentVolumes.length
        const avgOlder = olderVolumes.reduce((a: number, b: number) => a + b, 0) / olderVolumes.length
        if (avgOlder > 0) {
          volumeChange24h = ((avgRecent - avgOlder) / avgOlder) * 100
        }
      }
    }
  }

  return {
    rsi: {
      rsi14: indicators.rsi14 || null,
      rsi7: indicators.rsi7 || null,
      rsi4h: multiTimeframeIndicators['4h']?.rsi14 || indicators.rsi4h || indicators['4h']?.rsi14 || null,
    },
    ema: {
      ema20: indicators.ema20 || null,
      ema50: indicators.ema50 || null,
    },
    macd: indicators.macd
      ? {
          macd: indicators.macd.macd || indicators.macd.macdLine || null,
          signal: indicators.macd.signal || indicators.macd.signalLine || null,
          histogram: indicators.macd.histogram || null,
        }
      : null,
    bollingerBands: indicators.bollingerBands || (bollingerBands.upper && bollingerBands.lower && bollingerBands.middle)
      ? {
          upper: indicators.bollingerBands?.upper || bollingerBands.upper || null,
          middle: indicators.bollingerBands?.middle || bollingerBands.middle || null,
          lower: indicators.bollingerBands?.lower || bollingerBands.lower || null,
          position: indicators.bollingerBands?.position || bbPosition || null,
        }
      : null,
    atr: indicators.atr || indicators.atr14 || null,
    adx: indicators.adx
      ? {
          adx: indicators.adx.adx || indicators.adx || null,
          plusDI: indicators.adx.plusDI || indicators.plusDI || null,
          minusDI: indicators.adx.minusDI || indicators.minusDI || null,
          trend: indicators.adx.trend || (indicators.adx?.adx > 25 ? 'Strong' : indicators.adx?.adx > 20 ? 'Moderate' : 'Weak') || null,
        }
      : null,
    obv: indicators.obv || null,
    vwap: indicators.vwap || null,
    stochastic: indicators.stochastic
      ? {
          k: indicators.stochastic.k || indicators.stochastic.stochK || null,
          d: indicators.stochastic.d || indicators.stochastic.stochD || null,
        }
      : null,
    cci: indicators.cci || null,
    williamsR: indicators.williamsR || indicators.williamsPercentR || null,
    parabolicSAR: indicators.parabolicSAR
      ? {
          value: typeof indicators.parabolicSAR === 'number' ? indicators.parabolicSAR : indicators.parabolicSAR.value || null,
          trend: indicators.parabolicSAR.trend || (price && indicators.parabolicSAR < price ? 'Bullish' : 'Bearish') || null,
        }
      : null,
    aroon: indicators.aroon
      ? {
          up: indicators.aroon.up || indicators.aroon.aroonUp || null,
          down: indicators.aroon.down || indicators.aroon.aroonDown || null,
          trend: indicators.aroon.trend || (indicators.aroon.up > 70 ? 'Strong Uptrend' : indicators.aroon.down > 70 ? 'Strong Downtrend' : 'Neutral') || null,
        }
      : null,
    support: supportResistance.support || indicators.support || assetData?.support || null,
    resistance: supportResistance.resistance || indicators.resistance || assetData?.resistance || null,
    fibonacci: (() => {
      if (indicators.fibonacci) {
        return {
          level: indicators.fibonacci.level || null,
          direction: indicators.fibonacci.direction || null,
          range: indicators.fibonacci.range || null,
          keyLevels: indicators.fibonacci.keyLevels || null,
        }
      }
      if (historicalData.length >= 50 && price) {
        try {
          const closes = historicalData.map((d: any) => d.close)
          const fibResult = calculateFibonacciRetracement(closes, 50)
          if (fibResult) {
            return {
              level: fibResult.currentLevel || null,
              direction: fibResult.direction || null,
              range: fibResult.range || null,
              keyLevels: [
                fibResult.level0, fibResult.level236, fibResult.level382,
                fibResult.level500, fibResult.level618, fibResult.level786,
                fibResult.level100, fibResult.level1272, fibResult.level1618,
                fibResult.level2000,
              ].filter((v: any) => v != null),
            }
          }
        } catch (fibError) {
          // Fibonacci calculation failed
        }
      }
      return null
    })(),
    trend: trendAlignment
      ? {
          direction: trendAlignment.dailyTrend || trendAlignment.trend || trendAlignment.direction || null,
          strength: trendAlignment.strength || trendAlignment.alignmentScore ? `${trendAlignment.alignmentScore}/100` : null,
        }
      : null,
    marketStructure: indicators.marketStructure
      ? {
          structure: indicators.marketStructure.structure || indicators.marketStructure || null,
          higherHigh: indicators.marketStructure.higherHigh || false,
          lowerLow: indicators.marketStructure.lowerLow || false,
        }
      : null,
    rsiDivergence: (() => {
      if (indicators.rsiDivergence) {
        if (typeof indicators.rsiDivergence === 'string') return indicators.rsiDivergence
        if (typeof indicators.rsiDivergence === 'object' && indicators.rsiDivergence.divergence) {
          return String(indicators.rsiDivergence.divergence)
        }
      }
      if (historicalData.length >= 20 && price) {
        try {
          const prices = historicalData.map((d: any) => d.close || d.price)
          const rsiValues = prices.map((_p: number, i: number) => {
            if (i < 14) return null
            const slice = prices.slice(i - 14, i + 1)
            return calculateRSI(slice, 14)
          }).filter((v: any) => v != null) as number[]
          
          if (rsiValues.length >= 20) {
            const divergence = detectDivergence(prices.slice(-rsiValues.length), rsiValues, 20)
            if (divergence && divergence.divergence) {
              return String(divergence.divergence)
            }
          }
        } catch (_divError) {
          // Divergence calculation failed
        }
      }
      return null
    })(),
    candlestick: (() => {
      if (indicators.candlestick && typeof indicators.candlestick === 'string') {
        return indicators.candlestick
      }
      if (indicators.candlestickPattern && typeof indicators.candlestickPattern === 'string') {
        return indicators.candlestickPattern
      }
      if (indicators.candlestickPatterns) {
        if (typeof indicators.candlestickPatterns === 'string') {
          return indicators.candlestickPatterns
        }
        if (typeof indicators.candlestickPatterns === 'object') {
          if (Array.isArray(indicators.candlestickPatterns.patterns)) {
            const patterns = indicators.candlestickPatterns.patterns
              .map((p: any) => (typeof p === 'object' ? p.type || p.pattern : String(p)))
              .filter((p: any) => p)
            return patterns.length > 0 ? patterns.join(', ') : null
          }
          if (indicators.candlestickPatterns.type) {
            return String(indicators.candlestickPatterns.type)
          }
          if (indicators.candlestickPatterns.pattern) {
            return String(indicators.candlestickPatterns.pattern)
          }
          if (indicators.candlestickPatterns.latestPattern && typeof indicators.candlestickPatterns.latestPattern === 'object') {
            return indicators.candlestickPatterns.latestPattern.type || null
          }
        }
      }
      if (historicalData.length >= 5) {
        try {
          const patterns = detectCandlestickPatterns(historicalData, 5)
          if (patterns && patterns.patterns && patterns.patterns.length > 0) {
            const patternTypes = patterns.patterns
              .map((p: any) => (typeof p === 'object' ? p.type || p.pattern : String(p)))
              .filter((p: any) => p)
            return patternTypes.length > 0 ? patternTypes.join(', ') : null
          }
          if (patterns && patterns.patterns && patterns.patterns.length > 0) {
            const latestPattern = patterns.patterns[patterns.patterns.length - 1]
            return latestPattern?.type || null
          }
        } catch (candleError) {
          // Candlestick calculation failed
        }
      }
      return null
    })(),
    marketRegime:
      indicators.marketRegime && typeof indicators.marketRegime === 'object'
        ? indicators.marketRegime.regime || indicators.marketRegime.volatility || String(indicators.marketRegime)
        : indicators.marketRegime || indicators.regime || null,
    correlationCoefficient: indicators.correlationCoefficient
      ? {
          correlation: indicators.correlationCoefficient.correlation || null,
          strength: indicators.correlationCoefficient.strength || null,
          direction: indicators.correlationCoefficient.direction || null,
        }
      : null,
    mcclellanOscillator: indicators.mcclellanOscillator
      ? {
          oscillator: indicators.mcclellanOscillator.oscillator || null,
          signal: indicators.mcclellanOscillator.signal || null,
          ratio: indicators.mcclellanOscillator.ratio || null,
        }
      : null,
    armsIndex: indicators.armsIndex
      ? {
          index: indicators.armsIndex.index || null,
          trin: indicators.armsIndex.trin || null,
          adRatio: indicators.armsIndex.adRatio || null,
        }
      : null,
    bounceAnalysis: (() => {
      if (historicalData.length >= 20 && price && indicators) {
        try {
          const bounceSetup = checkBounceSetup(historicalData, indicators, price)
          const bouncePersistence = checkBouncePersistence(historicalData, indicators, price)

          return {
            setup: bounceSetup || null,
            persistence: bouncePersistence || null,
          }
        } catch (error) {
          return null
        }
      }
      return null
    })(),
    trendDetection: (() => {
      if (historicalData.length >= 20) {
        try {
          const closes = historicalData.map(d => d.close || d.price || 0)
          const highs = historicalData.map(d => d.high || d.close || 0)
          const lows = historicalData.map(d => d.low || d.close || 0)
          const ema20 = historicalData.map((_, i) => indicators?.ema20 || 0)
          const ema50 = historicalData.map((_, i) => indicators?.ema50 || 0)

          const trend = detectTrend(closes, ema20, ema50)
          const marketStructure = detectMarketStructure(highs, lows, closes)

          return {
            trend: trend || null,
            marketStructure: marketStructure || null,
          }
        } catch (error) {
          return null
        }
      }
      return null
    })(),
    enhancedMetrics: (() => {
      if (historicalData.length >= 20 && price) {
        try {
          const metrics = calculateEnhancedMetrics(historicalData, indicators, price)
          return metrics || null
        } catch (error) {
          return null
        }
      }
      return null
    })(),
    change24h: change24h !== null ? change24h : (assetData?.change24h || assetData?.data?.change24h || null),
    volumeChange24h: volumeChange24h !== null ? volumeChange24h : (assetData?.volumeChange24h || assetData?.data?.volumeChange24h || null),
  }
}
