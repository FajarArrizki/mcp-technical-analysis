/**
 * GearTrade MCP Server
 * Exposes trading functionality via Model Context Protocol using Nullshot MCP SDK
 * Local development server only
 */

// Load environment variables from .env file
import "dotenv/config";

// Import from Nullshot MCP SDK
import { z } from 'zod'

// Import existing functionality from signal-generation
import { getRealTimePrice } from './signal-generation/data-fetchers/hyperliquid'
import { getMarketData } from './signal-generation/data-fetchers/market-data'
import type { ComprehensiveVolumeAnalysis } from './signal-generation/analysis/volume-analysis'
import { performComprehensiveVolumeAnalysis } from './signal-generation/analysis/volume-analysis'
import { getActivePositions } from './signal-generation/position-management/positions'
import type { Position } from './signal-generation/position-management/positions'
import { calculateMAE } from './signal-generation/risk-management/mae'
import { calculateStopLoss } from './signal-generation/exit-conditions/stop-loss'
import { calculateTakeProfitLevels, checkTakeProfit } from './signal-generation/exit-conditions/take-profit'
import { checkTrailingStop, updateTrailingStop } from './signal-generation/exit-conditions/trailing-stop'
import { checkSignalReversal } from './signal-generation/exit-conditions/signal-reversal'
import { calculateDynamicLeverage } from './signal-generation/risk-management/leverage'
import { calculateDynamicMarginPercentage } from './signal-generation/risk-management/margin'
import { calculateFibonacciRetracement } from './signal-generation/technical-indicators/fibonacci'
import type { FibonacciRetracement } from './signal-generation/technical-indicators/fibonacci'
import type { OrderBookDepth } from './signal-generation/analysis/orderbook'
import type { SessionVolumeProfile, CompositeVolumeProfile } from './signal-generation/analysis/volume-profile'
import { detectChangeOfCharacter } from './signal-generation/analysis/market-structure'
import type { ChangeOfCharacterResult } from './signal-generation/analysis/market-structure'
import { detectCandlestickPatterns } from './signal-generation/analysis/candlestick'
import type { CandlestickPatternsResult } from './signal-generation/analysis/candlestick'
import { detectDivergence } from './signal-generation/analysis/divergence'
import type { DivergenceResult } from './signal-generation/analysis/divergence'
import { detectMarketRegime } from './signal-generation/analysis/market-regime'
import { calculateLiquidationIndicators } from './signal-generation/technical-indicators/liquidation'
import type { LiquidationIndicator } from './signal-generation/technical-indicators/liquidation'
import { calculateLongShortRatioIndicators } from './signal-generation/technical-indicators/long-short-ratio'
import type { LongShortRatioIndicator } from './signal-generation/technical-indicators/long-short-ratio'
import { calculateSpotFuturesDivergenceIndicators } from './signal-generation/technical-indicators/spot-futures-divergence'
import type { SpotFuturesDivergenceIndicator } from './signal-generation/technical-indicators/spot-futures-divergence'
import { calculateRSI } from './signal-generation/technical-indicators/momentum'
import { calculateMomentum } from './signal-generation/technical-indicators/momentum-indicator'
import { checkBounceSetup, checkBouncePersistence } from './signal-generation/analysis/bounce'
import { detectTrend, detectMarketStructure } from './signal-generation/analysis/trend-detection'
import { calculateEnhancedMetrics } from './signal-generation/analysis/enhanced-metrics'
import { calculateLinearRegression, LinearRegressionData } from './signal-generation/technical-indicators/linear-regression'
import { calculateMAEnvelope, MAEnvelopeData } from './signal-generation/technical-indicators/ma-envelope'
import { calculateVWMA, VWMAData } from './signal-generation/technical-indicators/vwma'
import { calculatePriceChannel, PriceChannelData } from './signal-generation/technical-indicators/price-channel'
import { calculateMcGinleyDynamic, McGinleyDynamicData } from './signal-generation/technical-indicators/mcginley-dynamic'
import { calculateRainbowMA, RainbowMAData } from './signal-generation/technical-indicators/rainbow-ma'
import { calculateKaufmanAdaptiveMA, KaufmanAdaptiveMAData } from './signal-generation/technical-indicators/kaufman-adaptive-ma'
import { calculateDetrendedPrice, DetrendedPriceData } from './signal-generation/technical-indicators/detrended-price'
import { calculateRelativeVigorIndex, RelativeVigorIndexData } from './signal-generation/technical-indicators/relative-vigor-index'
import { calculateElderRay, ElderRayData } from './signal-generation/technical-indicators/elder-ray'
import { calculateFisherTransform, FisherTransformData } from './signal-generation/technical-indicators/fisher-transform'
import { calculateKST, KSTData } from './signal-generation/technical-indicators/kst'
import { calculateCamarillaPivots } from './signal-generation/technical-indicators/pivot-camarilla'
import { calculatePivotPoints } from './signal-generation/technical-indicators/pivot-standard'
import { calculateChandeMomentum, ChandeMomentumData } from './signal-generation/technical-indicators/chande-momentum'
import { calculateBullBearPower, BullBearPowerData } from './signal-generation/technical-indicators/bull-bear-power'
import { calculateTrueStrengthIndex, TrueStrengthIndexData } from './signal-generation/technical-indicators/true-strength-index'
import { calculatePercentagePriceOscillator, PercentagePriceOscillatorData } from './signal-generation/technical-indicators/percentage-price-oscillator'
import { calculateAcceleratorOscillator, AcceleratorOscillatorData } from './signal-generation/technical-indicators/accelerator-oscillator'
import { calculateSchaffTrendCycle, SchaffTrendCycleData } from './signal-generation/technical-indicators/schaff-trend-cycle'
import { calculateCoppockCurve, CoppockCurveData } from './signal-generation/technical-indicators/coppock-curve'
import { calculateVolumeOscillator, VolumeOscillatorData } from './signal-generation/technical-indicators/volume-oscillator'
import { calculateEaseOfMovement, EaseOfMovementData } from './signal-generation/technical-indicators/ease-of-movement'
import { calculatePriceVolumeTrend, PriceVolumeTrendData } from './signal-generation/technical-indicators/price-volume-trend'
import { calculatePositiveVolumeIndex, PositiveVolumeIndexData } from './signal-generation/technical-indicators/positive-volume-index'
import { calculateVolumeROC, VolumeROCData } from './signal-generation/technical-indicators/volume-roc'
import { calculateROC } from './signal-generation/technical-indicators/roc'
import { calculateAnchoredVWAP, AnchoredVWAPData } from './signal-generation/technical-indicators/anchored-vwap'
import { calculateChaikinMF, ChaikinMFData } from './signal-generation/technical-indicators/chaikin-mf'
import { calculateVolumeZoneOscillator, VolumeZoneOscillatorData } from './signal-generation/technical-indicators/volume-zone-oscillator'
import { calculateMassIndex, MassIndexData } from './signal-generation/technical-indicators/mass-index'
import { calculateUlcerIndex, UlcerIndexData } from './signal-generation/technical-indicators/ulcer-index'
// Import all remaining technical indicator functions
import {
  calculateGatorOscillator, calculateKlingerOscillator, calculateChaikinVolatility,
  calculateBBPercentB, calculateBBWidth, calculateHistoricalVolatility,
  calculateTRIX, calculateVortex, calculateCOG, calculateChaikinOscillator,
  calculateStochasticRSI, calculateMFI, calculateUltimateOscillator, calculateBOP,
  calculateAdvanceDeclineLine, calculateMcClellanOscillator, calculateArmsIndex,
  calculateFractals, calculateZigZag, calculateHMA, calculateWMA, calculateSMMA,
  calculateDEMA, calculateTEMA, calculateKeltnerChannels, calculateDonchianChannels,
  calculateAlligator, calculateAwesomeOscillator, calculateIchimokuCloud,
  calculateCorrelationCoefficient, calculateRSquared,
  calculateForceIndex, calculateSuperTrend
} from './signal-generation/technical-indicators'
import type { Signal, HistoricalDataPoint } from './signal-generation/types'

// Helper function to format technical indicators
function formatTechnicalIndicators(assetData: any, price: number | null) {
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
    // Get price 24 hours ago (assuming 1h candles, need 24 candles)
    // Or use last 24 candles if available
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
      // Try to get from indicators first
      if (indicators.fibonacci) {
        return {
          level: indicators.fibonacci.level || null,
          direction: indicators.fibonacci.direction || null,
          range: indicators.fibonacci.range || null,
          keyLevels: indicators.fibonacci.keyLevels || null,
        }
      }
      // Calculate from historical data if available
      if (historicalData.length >= 50 && price) {
        try {
          const highs = historicalData.map((d: any) => d.high || d.close)
          const lows = historicalData.map((d: any) => d.low || d.close)
          const closes = historicalData.map((d: any) => d.close)
          const fibResult = calculateFibonacciRetracement(closes, 50)
          if (fibResult) {
            return {
              level: fibResult.currentLevel || null,
              direction: fibResult.direction || null,
              range: fibResult.range || null,
              keyLevels: [
                fibResult.level0,
                fibResult.level236,
                fibResult.level382,
                fibResult.level500,
                fibResult.level618,
                fibResult.level786,
                fibResult.level100,
                fibResult.level1272,
                fibResult.level1618,
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
      // Try to get from indicators first
      if (indicators.rsiDivergence) {
        if (typeof indicators.rsiDivergence === 'string') return indicators.rsiDivergence
        if (typeof indicators.rsiDivergence === 'object' && indicators.rsiDivergence.divergence) {
          return String(indicators.rsiDivergence.divergence)
        }
      }
      // Calculate from historical data if available
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
      // Try candlestick as string first
      if (indicators.candlestick && typeof indicators.candlestick === 'string') {
        return indicators.candlestick
      }
      // Try candlestickPattern as string
      if (indicators.candlestickPattern && typeof indicators.candlestickPattern === 'string') {
        return indicators.candlestickPattern
      }
      // Try candlestickPatterns object with patterns array
      if (indicators.candlestickPatterns) {
        if (typeof indicators.candlestickPatterns === 'string') {
          return indicators.candlestickPatterns
        }
        if (typeof indicators.candlestickPatterns === 'object') {
          // If it's an object with patterns array
          if (Array.isArray(indicators.candlestickPatterns.patterns)) {
            const patterns = indicators.candlestickPatterns.patterns
              .map((p: any) => (typeof p === 'object' ? p.type || p.pattern : String(p)))
              .filter((p: any) => p)
            return patterns.length > 0 ? patterns.join(', ') : null
          }
          // If it's an object with type property
          if (indicators.candlestickPatterns.type) {
            return String(indicators.candlestickPatterns.type)
          }
          // If it's an object with pattern property
          if (indicators.candlestickPatterns.pattern) {
            return String(indicators.candlestickPatterns.pattern)
          }
          // If it's an object with latestPattern
          if (indicators.candlestickPatterns.latestPattern && typeof indicators.candlestickPatterns.latestPattern === 'object') {
            return indicators.candlestickPatterns.latestPattern.type || null
          }
        }
      }
      // Calculate from historical data if available
      if (historicalData.length >= 5) {
        try {
          const patterns = detectCandlestickPatterns(historicalData, 5)
          if (patterns && patterns.patterns && patterns.patterns.length > 0) {
            const patternTypes = patterns.patterns
              .map((p: any) => (typeof p === 'object' ? p.type || p.pattern : String(p)))
              .filter((p: any) => p)
            return patternTypes.length > 0 ? patternTypes.join(', ') : null
          }
          // Get latest pattern from patterns array
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
      // Calculate bounce analysis from historical data
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
      // Calculate trend detection
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
      // Calculate enhanced metrics
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

// Helper function to format volume analysis
function formatVolumeAnalysis(
  volumeAnalysis: ComprehensiveVolumeAnalysis | null | undefined,
  price: number | null
) {
  if (!volumeAnalysis) {
    return null
  }

  const footprint = volumeAnalysis.footprint
  const liquidityZones = volumeAnalysis.liquidityZones || []
  const volumeProfile = volumeAnalysis.volumeProfile
  const cvd = volumeAnalysis.cvd
  const recommendations = volumeAnalysis.recommendations

  // Find key level (nearest liquidity zone or POC)
  let keyLevel: number | null = null
  let keyLevelDelta: number | null = null
  if (price && liquidityZones.length > 0) {
    // Find nearest zone
    const nearestZone = liquidityZones.reduce((closest, zone) => {
      const zoneCenter = (zone.priceRange[0] + zone.priceRange[1]) / 2
      const currentDistance = Math.abs(price - zoneCenter)
      const closestDistance = closest ? Math.abs(price - (closest.priceRange[0] + closest.priceRange[1]) / 2) : Infinity
      return currentDistance < closestDistance ? zone : closest
    })
    const zoneCenter = (nearestZone.priceRange[0] + nearestZone.priceRange[1]) / 2
    keyLevel = zoneCenter
    keyLevelDelta = price - zoneCenter
  } else if (price && volumeProfile?.poc) {
    keyLevel = volumeProfile.poc
    keyLevelDelta = price - volumeProfile.poc
  }

  // Format HVN (High Volume Nodes)
  const hvn = volumeProfile?.hvn
    ? volumeProfile.hvn
        .slice(0, 3)
        .map((node) => {
          if (typeof node === 'object' && node !== null) {
            return node.price || (typeof node === 'number' ? node : null)
          }
          return typeof node === 'number' ? node : null
        })
        .filter((p) => p != null && typeof p === 'number')
    : []

  // Format LVN (Low Volume Nodes)
  const lvn = volumeProfile?.lvn
    ? volumeProfile.lvn
        .slice(0, 3)
        .map((node) => {
          if (typeof node === 'object' && node !== null) {
            return node.price || (typeof node === 'number' ? node : null)
          }
          return typeof node === 'number' ? node : null
        })
        .filter((p) => p != null && typeof p === 'number')
    : []

  // Format top liquidity zones
  const topLiquidityZones = liquidityZones
    .slice(0, 2)
    .map((zone) => ({
      priceRange: `${zone.priceRange[0].toFixed(2)}-${zone.priceRange[1].toFixed(2)}`,
      type: zone.type,
      strength: zone.strength,
    }))

  return {
    buyVolume: footprint?.totalBuyVolume || null,
    sellVolume: footprint?.totalSellVolume || null,
    netDelta: footprint?.netDelta || null,
    buyPressure: footprint?.buyPressure || null,
    sellPressure: footprint?.sellPressure || null,
    dominantSide: footprint?.dominantSide?.toUpperCase() || 'NEUTRAL',
    keyLevel: keyLevel,
    keyLevelDelta: keyLevelDelta,
    poc: volumeProfile?.poc || null,
    vah: volumeProfile?.vah || null,
    val: volumeProfile?.val || null,
    hvn: hvn.length > 0 ? hvn.map((p) => typeof p === 'number' ? p.toFixed(4) : String(p)).join(', ') : null,
    lvn: lvn.length > 0 ? lvn.map((p) => typeof p === 'number' ? p.toFixed(4) : String(p)).join(', ') : null,
    cvdTrend: cvd?.cvdTrend?.toUpperCase() || null,
    cvdDelta: cvd?.cvdDelta || null,
    topLiquidityZones: topLiquidityZones.length > 0 ? topLiquidityZones : null,
    recommendation: recommendations?.action?.toUpperCase() || null,
    confidence: recommendations?.confidence ? Math.round(recommendations.confidence * 100) : null,
    riskLevel: recommendations?.riskLevel?.toUpperCase() || null,
  }
}

// Helper function to format multi-timeframe analysis
function formatMultiTimeframe(assetData: any) {
  const trendAlignment = assetData?.data?.trendAlignment || assetData?.trendAlignment
  const multiTimeframeIndicators = assetData?.data?.multiTimeframeIndicators || assetData?.multiTimeframeIndicators || {}

  if (!trendAlignment) {
    return null
  }

  return {
    dailyTrend: trendAlignment.dailyTrend || 'neutral',
    h4Aligned: trendAlignment.h4Aligned !== undefined ? trendAlignment.h4Aligned : null,
    h1Aligned: trendAlignment.h1Aligned !== undefined ? trendAlignment.h1Aligned : null,
    overall: trendAlignment.aligned ? 'Aligned' : 'Not Aligned',
    score: trendAlignment.alignmentScore !== undefined ? trendAlignment.alignmentScore : null,
    reason: trendAlignment.reason || null,
    // Additional timeframe data if available
    daily: multiTimeframeIndicators['1d'] ? {
      price: multiTimeframeIndicators['1d'].price || null,
      ema20: multiTimeframeIndicators['1d'].ema20 || null,
      ema50: multiTimeframeIndicators['1d'].ema50 || null,
      rsi14: multiTimeframeIndicators['1d'].rsi14 || null,
    } : null,
    h4: multiTimeframeIndicators['4h'] ? {
      price: multiTimeframeIndicators['4h'].price || null,
      ema20: multiTimeframeIndicators['4h'].ema20 || null,
      rsi14: multiTimeframeIndicators['4h'].rsi14 || null,
    } : null,
    h1: multiTimeframeIndicators['1h'] ? {
      price: multiTimeframeIndicators['1h'].price || null,
      ema20: multiTimeframeIndicators['1h'].ema20 || null,
      rsi14: multiTimeframeIndicators['1h'].rsi14 || null,
    } : null,
  }
}

// Helper function to format external data
function formatExternalData(assetData: any): {
  fundingRate: string | null
  fundingRateTrend: string
  openInterest: string | number | null
  openInterestTrend: string
  volumeTrend: string
  volatility: string
} | null {
  // Access externalData from assetData (which is result.data from market-data.ts)
  const externalData = assetData?.externalData || assetData?.data?.externalData || {}
  const hyperliquid = externalData.hyperliquid || {}
  const enhanced = externalData.enhanced || {}
  const futures = externalData.futures || {}
  


  // Get funding rate (from hyperliquid or futures)
  // Handle both number and object types (FundingRateData object has 'current' property)
  let fundingRateRaw: any = futures.fundingRate || hyperliquid.fundingRate || null
  let fundingRate: number | null = null
  
  if (fundingRateRaw !== null && fundingRateRaw !== undefined) {
    if (typeof fundingRateRaw === 'number') {
      fundingRate = isNaN(fundingRateRaw) ? null : fundingRateRaw
    } else if (typeof fundingRateRaw === 'object') {
      // If it's an object (FundingRateData), extract the 'current' value
      fundingRate = fundingRateRaw.current || fundingRateRaw.value || fundingRateRaw.rate || null
      if (fundingRate !== null && typeof fundingRate !== 'number') {
        fundingRate = parseFloat(String(fundingRate))
        if (isNaN(fundingRate)) {
          fundingRate = null
        }
      } else if (fundingRate !== null && isNaN(fundingRate)) {
        fundingRate = null
      }
    } else if (typeof fundingRateRaw === 'string') {
      fundingRate = parseFloat(fundingRateRaw)
      if (isNaN(fundingRate)) {
        fundingRate = null
      }
    }
  }
  
  const fundingRateTrend = hyperliquid.fundingRateTrend || 'stable'
  
  // Get open interest (prefer Hyperliquid as primary source, fallback to Binance futures)
  let openInterest: number | null = null
  
  // Helper function to extract OI value from various formats
  const extractOIValue = (raw: any): number | null => {
    if (raw === null || raw === undefined) return null
    if (typeof raw === 'number') {
      return isNaN(raw) || !isFinite(raw) ? null : raw
    }
    if (typeof raw === 'string') {
      const parsed = parseFloat(raw)
      return isNaN(parsed) || !isFinite(parsed) ? null : parsed
    }
    if (typeof raw === 'object') {
      const val = raw.current || raw.value || raw.amount || raw.oi || null
      if (val === null) return null
      const parsed = typeof val === 'number' ? val : parseFloat(String(val))
      return isNaN(parsed) || !isFinite(parsed) ? null : parsed
    }
    return null
  }
  
  // Try multiple sources for open interest
  // 1. Direct hyperliquid.openInterest (number from market-data.ts)
  if (hyperliquid.openInterest !== undefined && hyperliquid.openInterest !== null) {
    openInterest = extractOIValue(hyperliquid.openInterest)
  }
  // 2. Try futures.openInterest if hyperliquid failed
  if (openInterest === null && futures.openInterest !== undefined) {
    openInterest = extractOIValue(futures.openInterest)
  }
  // 3. Fallback: try assetData directly (in case externalData path is wrong)
  if (openInterest === null && assetData?.openInterest !== undefined) {
    openInterest = extractOIValue(assetData.openInterest)
  }
  // 4. Try data.openInterest
  if (openInterest === null && assetData?.data?.openInterest !== undefined) {
    openInterest = extractOIValue(assetData.data.openInterest)
  }
  
  const oiTrend = hyperliquid.oiTrend || 'stable'
  
  // Get volume trend
  const volumeTrend = enhanced.volumeTrend || assetData?.indicators?.volumeTrend || 'stable'
  
  // Get volatility
  const volatilityPattern = enhanced.volatilityPattern || 'normal'
  let volatility: string = 'normal'
  if (volatilityPattern === 'low' || volatilityPattern === 'low_volatility') {
    volatility = 'low'
  } else if (volatilityPattern === 'high' || volatilityPattern === 'high_volatility') {
    volatility = 'high'
  } else if (volatilityPattern === 'normal' || volatilityPattern === 'normal_volatility') {
    volatility = 'normal'
  }

  // Format funding rate as percentage
  // Only format if fundingRate is a valid number
  let fundingRatePercent: string | null = null
  if (fundingRate !== null && typeof fundingRate === 'number' && !isNaN(fundingRate) && isFinite(fundingRate)) {
    fundingRatePercent = (fundingRate * 100).toFixed(4)
  }
  
  // Format open interest (if it's a number, format it as string with commas)
  // Accept 0 as valid value (but format only positive values with commas)
  let openInterestFormatted: string | number | null = null
  if (openInterest !== null && typeof openInterest === 'number' && !isNaN(openInterest) && isFinite(openInterest)) {
    if (openInterest > 0) {
      // Format large numbers with commas
      openInterestFormatted = openInterest.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    } else {
      openInterestFormatted = openInterest // Return 0 as is
    }
  }

  return {
    fundingRate: fundingRatePercent ? `${fundingRatePercent}%` : null,
    fundingRateTrend: fundingRateTrend,
    openInterest: openInterestFormatted,
    openInterestTrend: oiTrend,
    volumeTrend: volumeTrend,
    volatility: volatility,

  }
}

// Helper function to format position data
function formatPosition(position: Position | null, currentPrice: number | null, maeResult: ReturnType<typeof calculateMAE> | null) {
  if (!position || !currentPrice) {
    return null
  }

  const quantity = Math.abs(position.quantity)
  const entryPrice = position.entryPrice
  const side = position.side || (position.quantity > 0 ? 'LONG' : 'SHORT')
  
  // Calculate unrealized PnL
  let unrealizedPnl = 0
  let unrealizedPnlPct = 0
  if (side === 'LONG') {
    unrealizedPnl = (currentPrice - entryPrice) * quantity
    unrealizedPnlPct = entryPrice > 0 ? ((currentPrice - entryPrice) / entryPrice) * 100 : 0
  } else {
    unrealizedPnl = (entryPrice - currentPrice) * quantity
    unrealizedPnlPct = entryPrice > 0 ? ((entryPrice - currentPrice) / entryPrice) * 100 : 0
  }

  // Calculate PnL based on margin (if leverage is available)
  const leverage = position.leverage || 1
  const positionValue = entryPrice * quantity
  const marginUsed = positionValue / leverage
  const pnlPctOnMargin = marginUsed > 0 ? (unrealizedPnl / marginUsed) * 100 : 0

  return {
    side,
    quantity,
    entryPrice,
    currentPrice,
    leverage,
    unrealizedPnl,
    unrealizedPnlPct,
    pnlPctOnMargin,
    mae: maeResult?.mae || null,
    worstPrice: maeResult?.worstPrice || null,
    entryTime: position.entryTime || null,
  }
}

// Helper function to format risk management calculations
function formatRiskManagement(
  entryPrice: number,
  side: 'LONG' | 'SHORT',
  stopLossPct: number,
  takeProfitPct: number,
  positionSizeUsd: number,
  currentPrice?: number,
  indicators?: any
) {
  // Calculate stop loss
  const stopLossFixed = calculateStopLoss(entryPrice, side, stopLossPct)
  const stopLossFlexible = calculateStopLoss(entryPrice, side, stopLossPct * 0.385) // ~0.69% for 2% default

  // Calculate take profit levels (simplified)
  const takeProfitLevels = null

  // Calculate main take profit
  const takeProfit = side === 'LONG'
    ? entryPrice * (1 + takeProfitPct / 100)
    : entryPrice * (1 - takeProfitPct / 100)

  // Calculate potential loss/profit
  const quantity = positionSizeUsd / entryPrice

  let potentialLoss = 0
  let potentialProfit = 0
  if (side === 'LONG') {
    potentialLoss = (entryPrice - stopLossFixed) * quantity
    potentialProfit = (takeProfit - entryPrice) * quantity
  } else {
    potentialLoss = (stopLossFixed - entryPrice) * quantity
    potentialProfit = (entryPrice - takeProfit) * quantity
  }

  // Calculate R:R ratio
  const riskRewardRatio = potentialLoss > 0 ? potentialProfit / potentialLoss : 0

  // Calculate trailing stop if current price is provided
  let trailingStopInfo = null
  if (currentPrice) {
    // Simple trailing stop calculation
    const trailPercent = 5
    const activationGain = 1 // Activate after 1% gain
    const gainPct = side === 'LONG'
      ? ((currentPrice - entryPrice) / entryPrice) * 100
      : ((entryPrice - currentPrice) / entryPrice) * 100

    if (gainPct >= activationGain) {
      const trailingStopPrice = side === 'LONG'
        ? currentPrice * (1 - trailPercent / 100)
        : currentPrice * (1 + trailPercent / 100)
      trailingStopInfo = {
        active: true,
        price: trailingStopPrice,
        trailPercent,
      }
    }
  }

  // Check signal reversal if indicators are provided
  let signalReversalCheck = null
  if (indicators) {
    // Simple signal reversal check based on RSI and MACD divergence
    const rsi = indicators.rsi14 || indicators.rsi
    const macdHistogram = indicators.macd?.histogram
    const shouldReverse = (rsi && rsi > 70 && macdHistogram && macdHistogram < 0) ||
                         (rsi && rsi < 30 && macdHistogram && macdHistogram > 0)
    signalReversalCheck = {
      shouldReverse: shouldReverse || false,
      confidence: 0.6,
    }
  }

  return {
    stopLossFixed,
    stopLossFixedPct: stopLossPct,
    stopLossFlexible,
    stopLossFlexiblePct: stopLossPct * 0.385,
    takeProfit,
    takeProfitPct: takeProfitPct,
    takeProfitLevels,
    potentialLoss,
    potentialProfit,
    riskRewardRatio,
    trailingStop: trailingStopInfo,
    signalReversal: signalReversalCheck,
  }
}

// Helper function to format position setup calculations
function formatPositionSetup(
  ticker: string,
  entryPrice: number,
  side: 'LONG' | 'SHORT',
  positionSizeUsd: number,
  leverage: number,
  marginPercent: number,
  capital: number,
  riskPct: number
) {
  const quantity = positionSizeUsd / entryPrice
  const marginUsed = positionSizeUsd / leverage
  const positionValue = entryPrice * quantity
  const capitalAllocated = positionSizeUsd

  return {
    ticker,
    entryPrice,
    side,
    positionSizeUsd,
    quantity,
    leverage,
    marginPercent,
    marginUsed,
    positionValue,
    capital,
    capitalAllocated,
    capitalAllocatedPct: capital > 0 ? (capitalAllocated / capital) * 100 : 0,
    riskPct,
  }
}

// Helper function to format Fibonacci retracement data
function formatFibonacci(fibonacci: FibonacciRetracement | null) {
  if (!fibonacci) return null

  return {
    levels: {
      level0: fibonacci.level0,
      level236: fibonacci.level236,
      level382: fibonacci.level382,
      level500: fibonacci.level500,
      level618: fibonacci.level618,
      level786: fibonacci.level786,
      level100: fibonacci.level100,
      level1272: fibonacci.level1272,
      level1618: fibonacci.level1618,
      level2000: fibonacci.level2000,
    },
    currentLevel: fibonacci.currentLevel,
    distanceFromLevel: fibonacci.distanceFromLevel,
    isNearLevel: fibonacci.isNearLevel,
    nearestLevel: fibonacci.nearestLevel,
    nearestLevelPrice: fibonacci.nearestLevelPrice,
    swingHigh: fibonacci.swingHigh,
    swingLow: fibonacci.swingLow,
    range: fibonacci.range,
    direction: fibonacci.direction,
    strength: fibonacci.strength,
    signal: fibonacci.signal,
  }
}

// Helper function to format order book depth data
function formatOrderBookDepth(orderBookDepth: OrderBookDepth | null) {
  if (!orderBookDepth) return null

  return {
    bidPrice: orderBookDepth.bidPrice,
    askPrice: orderBookDepth.askPrice,
    midPrice: orderBookDepth.midPrice,
    spread: orderBookDepth.spread,
    spreadPercent: orderBookDepth.spreadPercent,
    bidDepth: orderBookDepth.bidDepth,
    askDepth: orderBookDepth.askDepth,
    imbalance: orderBookDepth.imbalance,
    supportZones: orderBookDepth.supportZones,
    resistanceZones: orderBookDepth.resistanceZones,
    liquidityScore: orderBookDepth.liquidityScore,
    timestamp: orderBookDepth.timestamp,
  }
}

// Helper function to format volume profile data
function formatVolumeProfile(
  sessionProfile: SessionVolumeProfile | null,
  compositeProfile: CompositeVolumeProfile | null
) {
  if (!sessionProfile && !compositeProfile) return null

  return {
    session: sessionProfile
      ? {
          poc: sessionProfile.poc,
          vah: sessionProfile.vah,
          val: sessionProfile.val,
          hvn: sessionProfile.hvn,
          lvn: sessionProfile.lvn,
          totalVolume: sessionProfile.totalVolume,
          sessionType: sessionProfile.sessionType,
          timestamp: sessionProfile.timestamp,
        }
      : null,
    composite: compositeProfile
      ? {
          poc: compositeProfile.poc,
          vah: compositeProfile.vah,
          val: compositeProfile.val,
          compositePoc: compositeProfile.compositePoc,
          compositeVah: compositeProfile.compositeVah,
          compositeVal: compositeProfile.compositeVal,
          accumulationZone: compositeProfile.accumulationZone,
          distributionZone: compositeProfile.distributionZone,
          balanceZones: compositeProfile.balanceZones,
          timeRange: compositeProfile.timeRange,
          timestamp: compositeProfile.timestamp,
        }
      : null,
  }
}

// Helper function to format market structure data
function formatMarketStructure(marketStructure: ChangeOfCharacterResult | null) {
  if (!marketStructure) return null

  return {
    structure: marketStructure.structure,
    coc: marketStructure.coc,
    lastSwingHigh: marketStructure.lastSwingHigh,
    lastSwingLow: marketStructure.lastSwingLow,
    structureStrength: marketStructure.structureStrength,
    reversalSignal: marketStructure.reversalSignal,
    swingHighs: marketStructure.swingHighs,
    swingLows: marketStructure.swingLows,
    timestamp: marketStructure.timestamp,
  }
}

// Helper function to format candlestick patterns data
function formatCandlestickPatterns(patterns: CandlestickPatternsResult | null) {
  if (!patterns || !patterns.patterns) {
    return {
      patterns: [],
      latestPattern: null,
      bullishCount: 0,
      bearishCount: 0,
    }
  }

  return {
    patterns: patterns.patterns.map((p) => ({
      type: p.type,
      index: p.index,
      bullish: p.bullish,
    })),
    latestPattern: patterns.patterns.length > 0 ? patterns.patterns[patterns.patterns.length - 1] : null,
    bullishCount: patterns.patterns.filter((p) => p.bullish).length,
    bearishCount: patterns.patterns.filter((p) => !p.bullish).length,
  }
}

// Helper function to format divergence data
function formatDivergence(divergence: DivergenceResult | null) {
  if (!divergence) return null

  return {
    bullishDivergence: divergence.bullishDivergence,
    bearishDivergence: divergence.bearishDivergence,
    divergence: divergence.divergence,
  }
}

// Helper function to format liquidation levels data
function formatLiquidationLevels(liquidation: LiquidationIndicator | null) {
  if (!liquidation) return null

  return {
    clusters: {
      long: liquidation.clusters.long,
      short: liquidation.clusters.short,
      nearest: liquidation.clusters.nearest,
      distance: liquidation.clusters.distance,
    },
    liquidityGrab: liquidation.liquidityGrab,
    stopHunt: liquidation.stopHunt,
    cascade: liquidation.cascade,
    safeEntry: liquidation.safeEntry,
  }
}

// Helper function to format long/short ratio data
function formatLongShortRatio(ratio: LongShortRatioIndicator | null) {
  if (!ratio) return null

  return {
    sentiment: ratio.sentiment,
    contrarian: ratio.contrarian,
    extreme: ratio.extreme,
    divergence: ratio.divergence,
  }
}

// Helper function to format spot-futures divergence data
function formatSpotFuturesDivergence(divergence: SpotFuturesDivergenceIndicator | null) {
  if (!divergence) return null

  return {
    premium: divergence.premium,
    arbitrage: divergence.arbitrage,
    meanReversion: divergence.meanReversion,
    divergence: divergence.divergence,
  }
}

// Simplified server object for Cloudflare Workers compatibility
const server = {
  name: 'geartrade',
  version: '1.0.0',
  tools: new Map(),
  resources: new Map(),
  prompts: new Map(),
  registerTool(name: string, config: any, handler: any) {
    this.tools.set(name, { config, handler })
  },
  registerResource(name: string, uri: string, config: any, handler: any) {
    this.resources.set(name, { uri, config, handler })
  },
  registerPrompt(name: string, config: any, handler?: any) {
    this.prompts.set(name, { config, handler })
  }
} as any

// Register get_prices tool
server.registerTool(
  'get_price',
  {
    title: 'Get Prices',
    description: 'Get latest prices for multiple trading tickers/symbols at once (e.g., ["BTC", "ETH", "SOL"])',
    inputSchema: {
      tickers: z
        .array(z.string())
        .min(1)
        .describe('Array of asset ticker symbols (e.g., ["BTC", "ETH", "SOL"])'),
    },
    outputSchema: {
      results: z.array(
        z.object({
          ticker: z.string(),
          price: z.number().nullable(),
          timestamp: z.string().optional(),
        })
      ),
    },
  },
  async ({ tickers }: { tickers: string[] }) => {
    if (!Array.isArray(tickers) || tickers.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                results: [],
                error: 'Invalid tickers parameter',
                message: 'Tickers must be a non-empty array of strings',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: {
          results: [],
        },
      }
    }

    // Normalize all tickers (uppercase, remove spaces)
    const normalizedTickers = tickers
      .filter((t) => t && typeof t === 'string' && t.trim().length > 0)
      .map((t) => t.trim().toUpperCase())

    if (normalizedTickers.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                results: [],
                error: 'No valid tickers',
                message: 'All tickers must be non-empty strings',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: {
          results: [],
        },
      }
    }

    // Fetch prices for all tickers in parallel
    const pricePromises = normalizedTickers.map(async (ticker) => {
      try {
        const price = await getRealTimePrice(ticker)
        return {
          ticker,
          price: price,
          timestamp: new Date().toISOString(),
        }
      } catch (error) {
        return {
          ticker,
          price: null as number | null,
          timestamp: new Date().toISOString(),
        }
      }
    })

    const results = await Promise.all(pricePromises)

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              results,
              summary: {
                total: results.length,
                found: results.filter((r) => r.price !== null).length,
                notFound: results.filter((r) => r.price === null).length,
              },
            },
            null,
            2
          ),
        },
      ],
      structuredContent: {
        results,
      },
    }
  }
)

// Register get_indicators tool
server.registerTool(
  'get_indicators',
  {
    title: 'Get Technical Indicators',
    description: 'Get comprehensive technical analysis indicators for multiple trading tickers at once (e.g., ["BTC", "ETH", "SOL"])',
    inputSchema: {
      tickers: z
        .array(z.string())
        .min(1)
        .describe('Array of asset ticker symbols (e.g., ["BTC", "ETH", "SOL"])'),
    },
    outputSchema: {
      results: z.array(
        z.object({
          ticker: z.string(),
          price: z.number().nullable(),
          timestamp: z.string().optional(),
          technical: z
            .object({
              rsi: z
                .object({
                  rsi14: z.number().nullable().optional(),
                  rsi7: z.number().nullable().optional(),
                  rsi4h: z.number().nullable().optional(),
                })
                .nullable()
                .optional(),
              ema: z
                .object({
                  ema20: z.number().nullable().optional(),
                  ema50: z.number().nullable().optional(),
                })
                .nullable()
                .optional(),
              macd: z
                .object({
                  macd: z.number().nullable().optional(),
                  signal: z.number().nullable().optional(),
                  histogram: z.number().nullable().optional(),
                })
                .nullable()
                .optional(),
              bollingerBands: z
                .object({
                  upper: z.number().nullable().optional(),
                  middle: z.number().nullable().optional(),
                  lower: z.number().nullable().optional(),
                  position: z.string().nullable().optional(),
                })
                .nullable()
                .optional(),
              atr: z.number().nullable().optional(),
              adx: z
                .object({
                  adx: z.number().nullable().optional(),
                  plusDI: z.number().nullable().optional(),
                  minusDI: z.number().nullable().optional(),
                  trend: z.string().nullable().optional(),
                })
                .nullable()
                .optional(),
              obv: z.number().nullable().optional(),
              vwap: z.number().nullable().optional(),
              stochastic: z
                .object({
                  k: z.number().nullable().optional(),
                  d: z.number().nullable().optional(),
                })
                .nullable()
                .optional(),
              cci: z.number().nullable().optional(),
              williamsR: z.number().nullable().optional(),
              parabolicSAR: z
                .object({
                  value: z.number().nullable().optional(),
                  trend: z.string().nullable().optional(),
                })
                .nullable()
                .optional(),
              aroon: z
                .object({
                  up: z.number().nullable().optional(),
                  down: z.number().nullable().optional(),
                  trend: z.string().nullable().optional(),
                })
                .nullable()
                .optional(),
              support: z.number().nullable().optional(),
              resistance: z.number().nullable().optional(),
              fibonacci: z
                .object({
                  level: z.string().nullable().optional(),
                  direction: z.string().nullable().optional(),
                  range: z.string().nullable().optional(),
                  keyLevels: z.string().nullable().optional(),
                })
                .nullable()
                .optional(),
              trend: z
                .object({
                  direction: z.string().nullable().optional(),
                  strength: z.string().nullable().optional(),
                })
                .nullable()
                .optional(),
              marketStructure: z
                .object({
                  structure: z.string().nullable().optional(),
                  higherHigh: z.boolean().optional(),
                  lowerLow: z.boolean().optional(),
                })
                .nullable()
                .optional(),
              rsiDivergence: z.string().nullable().optional(),
              candlestick: z.string().nullable().optional(),
              marketRegime: z.string().nullable().optional(),
              correlationCoefficient: z
                .object({
                  correlation: z.number().nullable().optional(),
                  strength: z.string().nullable().optional(),
                  direction: z.string().nullable().optional(),
                })
                .nullable()
                .optional(),
              mcclellanOscillator: z
                .object({
                  oscillator: z.number().nullable().optional(),
                  signal: z.number().nullable().optional(),
                  ratio: z.number().nullable().optional(),
                })
                .nullable()
                .optional(),
              armsIndex: z
                .object({
                  index: z.number().nullable().optional(),
                  trin: z.number().nullable().optional(),
                  adRatio: z.number().nullable().optional(),
                })
                .nullable()
                .optional(),
              bounceAnalysis: z
                .object({
                  setup: z.any().nullable().optional(),
                  persistence: z.any().nullable().optional(),
                })
                .nullable()
                .optional(),
              trendDetection: z
                .object({
                  trend: z.any().nullable().optional(),
                  marketStructure: z.any().nullable().optional(),
                })
                .nullable()
                .optional(),
              enhancedMetrics: z.any().nullable().optional(),
              change24h: z.number().nullable().optional(),
              volumeChange24h: z.number().nullable().optional(),
            })
            .nullable()
            .optional(),
        })
      ),
    },
  },
  async ({ tickers }: { tickers: string[] }) => {
    if (!Array.isArray(tickers) || tickers.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                results: [],
                error: 'Invalid tickers parameter',
                message: 'Tickers must be a non-empty array of strings',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: {
          results: [],
        },
      }
    }

    // Normalize all tickers (uppercase, remove spaces)
    const normalizedTickers = tickers
      .filter((t) => t && typeof t === 'string' && t.trim().length > 0)
      .map((t) => t.trim().toUpperCase())

    if (normalizedTickers.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                results: [],
                error: 'No valid tickers',
                message: 'All tickers must be non-empty strings',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: {
          results: [],
        },
      }
    }

    try {
      // Fetch market data with sufficient candles for volume analysis (75+ candles)
      if (!process.env.CANDLES_COUNT || parseInt(process.env.CANDLES_COUNT) < 75) {
        process.env.CANDLES_COUNT = '75'
      }
      // Get market data for all tickers (fetched in parallel by getMarketData)
      const { marketDataMap } = await getMarketData(normalizedTickers)

      // Format results for each ticker
      const results = normalizedTickers.map((ticker) => {
        const assetData = marketDataMap.get(ticker)

        if (!assetData) {
          return {
            ticker,
            price: null,
            timestamp: new Date().toISOString(),
            technical: null,
          }
        }

        const price = assetData.price || assetData.data?.price || null
        const technical = formatTechnicalIndicators(assetData, price)

        return {
          ticker,
          price: price,
          timestamp: new Date().toISOString(),
          technical: technical,
        }
      })

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                results,
                summary: {
                  total: results.length,
                  found: results.filter((r) => r.technical !== null).length,
                  notFound: results.filter((r) => r.technical === null).length,
                },
              },
              null,
              2
            ),
          },
        ],
        structuredContent: {
          results,
        },
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                results: [],
                error: error instanceof Error ? error.message : String(error),
                message: 'Failed to fetch technical indicators',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: {
          results: [],
        },
      }
    }
  }
)

// Register get__volume_analysis tool
server.registerTool(
  'get_volume_analysis',
  {
    title: 'Get Volume Analysis',
    description: 'Get comprehensive volume analysis for multiple trading tickers at once (e.g., ["BTC", "ETH", "SOL"])',
    inputSchema: {
      tickers: z
        .array(z.string())
        .min(1)
        .describe('Array of asset ticker symbols (e.g., ["BTC", "ETH", "SOL"])'),
    },
    outputSchema: z.object({
      results: z.array(
        z.object({
          ticker: z.string(),
          price: z.number().nullable(),
          timestamp: z.string().optional(),
          volumeAnalysis: z
            .object({
              buyVolume: z.number().nullable().optional(),
              sellVolume: z.number().nullable().optional(),
              netDelta: z.number().nullable().optional(),
              buyPressure: z.number().nullable().optional(),
              sellPressure: z.number().nullable().optional(),
              dominantSide: z.string().nullable().optional(),
              keyLevel: z.number().nullable().optional(),
              keyLevelDelta: z.number().nullable().optional(),
              poc: z.number().nullable().optional(),
              vah: z.number().nullable().optional(),
              val: z.number().nullable().optional(),
              hvn: z.string().nullable().optional(),
              lvn: z.string().nullable().optional(),
              cvdTrend: z.string().nullable().optional(),
              cvdDelta: z.number().nullable().optional(),
              topLiquidityZones: z
                .array(
                  z.object({
                    priceRange: z.string(),
                    type: z.string(),
                    strength: z.string(),
                  })
                )
                .nullable()
                .optional(),
              recommendation: z.string().nullable().optional(),
              confidence: z.number().nullable().optional(),
              riskLevel: z.string().nullable().optional(),
            })
            .nullable()
            .optional(),
        })
      ),
      summary: z
        .object({
          total: z.number(),
          found: z.number(),
          notFound: z.number(),
        })
        .optional(),
    }),
  },
  async ({ tickers }: { tickers: string[] }) => {
    if (!Array.isArray(tickers) || tickers.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                results: [],
                error: 'Invalid tickers parameter',
                message: 'Tickers must be a non-empty array of strings',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: {
          results: [],
        },
      }
    }

    // Normalize all tickers (uppercase, remove spaces)
    const normalizedTickers = tickers
      .filter((t) => t && typeof t === 'string' && t.trim().length > 0)
      .map((t) => t.trim().toUpperCase())

    if (normalizedTickers.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                results: [],
                error: 'No valid tickers',
                message: 'All tickers must be non-empty strings',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: {
          results: [],
        },
      }
    }

    try {
      // Fetch market data with sufficient candles for volume analysis (75+ candles)
      if (!process.env.CANDLES_COUNT || parseInt(process.env.CANDLES_COUNT) < 75) {
        process.env.CANDLES_COUNT = '75'
      }
      // Fetch market data for all tickers in parallel
      const { marketDataMap } = await getMarketData(normalizedTickers)

      const results: Array<{
        ticker: string
        price: number | null
        timestamp?: string
        volumeAnalysis: ReturnType<typeof formatVolumeAnalysis>
      }> = []

      for (const ticker of normalizedTickers) {
        const assetData = marketDataMap.get(ticker)

        if (!assetData) {
          results.push({
            ticker,
            price: null,
            timestamp: new Date().toISOString(),
            volumeAnalysis: null,
          })
          continue
        }

        const price = assetData.price || assetData.data?.price || null
        const historicalData = assetData.historicalData || assetData.data?.historicalData || []
        const externalData = assetData.externalData || assetData.data?.externalData || {}
        const volumeAnalysis = externalData.comprehensiveVolumeAnalysis || assetData.comprehensiveVolumeAnalysis || assetData.data?.comprehensiveVolumeAnalysis

        // If volume analysis is not available but we have historical data, try to calculate it
        let finalVolumeAnalysis = volumeAnalysis
        if (!finalVolumeAnalysis && historicalData && historicalData.length >= 20 && price) {
          // Use static import
          const volumeProfileData = externalData.volumeProfile || {}
          const sessionVolumeProfile = volumeProfileData.session || assetData.sessionVolumeProfile || assetData.data?.sessionVolumeProfile
          const compositeVolumeProfile = volumeProfileData.composite || assetData.compositeVolumeProfile || assetData.data?.compositeVolumeProfile
          const cumulativeVolumeDelta = externalData.volumeDelta || assetData.volumeDelta || assetData.data?.volumeDelta
          
          try {
            finalVolumeAnalysis = performComprehensiveVolumeAnalysis(
              historicalData,
              price,
              undefined,
              undefined,
              sessionVolumeProfile || compositeVolumeProfile || undefined,
              cumulativeVolumeDelta || undefined,
              undefined
            )
          } catch (error) {
            // If calculation fails, keep it as null
            console.error(`Failed to calculate volume analysis for ${ticker}:`, error)
          }
        }

        // Format volume analysis
        const formattedVolumeAnalysis = formatVolumeAnalysis(finalVolumeAnalysis, price)

        results.push({
          ticker,
          price,
          timestamp: new Date().toISOString(),
          volumeAnalysis: formattedVolumeAnalysis,
        })
      }

      const found = results.filter((r) => r.price !== null).length
      const notFound = results.length - found

      const result = {
        results,
        summary: {
          total: normalizedTickers.length,
          found,
          notFound,
        },
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
        structuredContent: result,
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                results: [],
                error: error instanceof Error ? error.message : String(error),
                message: 'Failed to fetch volume analysis',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: {
          results: [],
        },
      }
    }
  }
),

// Register get__multitimeframe tool
server.registerTool(
  'get_Multitimeframe',
  {
    title: 'Get Multi-Timeframe Analysis',
    description: 'Get multi-timeframe trend alignment analysis for multiple trading tickers at once (e.g., ["BTC", "ETH", "SOL"])',
    inputSchema: {
      tickers: z
        .array(z.string())
        .min(1)
        .describe('Array of asset ticker symbols (e.g., ["BTC", "ETH", "SOL"])'),
    },
    outputSchema: z.object({
      results: z.array(
        z.object({
          ticker: z.string(),
          price: z.number().nullable(),
          timestamp: z.string().optional(),
          multiTimeframe: z
            .object({
              dailyTrend: z.string().nullable().optional(),
              h4Aligned: z.boolean().nullable().optional(),
              h1Aligned: z.boolean().nullable().optional(),
              overall: z.string().nullable().optional(),
              score: z.number().nullable().optional(),
              reason: z.string().nullable().optional(),
              daily: z
                .object({
                  price: z.number().nullable().optional(),
                  ema20: z.number().nullable().optional(),
                  ema50: z.number().nullable().optional(),
                  rsi14: z.number().nullable().optional(),
                })
                .nullable()
                .optional(),
              h4: z
                .object({
                  price: z.number().nullable().optional(),
                  ema20: z.number().nullable().optional(),
                  rsi14: z.number().nullable().optional(),
                })
                .nullable()
                .optional(),
              h1: z
                .object({
                  price: z.number().nullable().optional(),
                  ema20: z.number().nullable().optional(),
                  rsi14: z.number().nullable().optional(),
                })
                .nullable()
                .optional(),
            })
            .nullable()
            .optional(),
        })
      ),
      summary: z
        .object({
          total: z.number(),
          found: z.number(),
          notFound: z.number(),
        })
        .optional(),
    }),
  },
  async ({ tickers }: { tickers: string[] }) => {
    if (!Array.isArray(tickers) || tickers.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                results: [],
                error: 'Invalid tickers parameter',
                message: 'Tickers must be a non-empty array of strings',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: {
          results: [],
        },
      }
    }

    // Normalize all tickers (uppercase, remove spaces)
    const normalizedTickers = tickers
      .filter((t) => t && typeof t === 'string' && t.trim().length > 0)
      .map((t) => t.trim().toUpperCase())

    if (normalizedTickers.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                results: [],
                error: 'No valid tickers',
                message: 'All tickers must be non-empty strings',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: {
          results: [],
        },
      }
    }

    try {
      // Fetch market data with sufficient candles for multi-timeframe analysis (75+ candles)
      if (!process.env.CANDLES_COUNT || parseInt(process.env.CANDLES_COUNT) < 75) {
        process.env.CANDLES_COUNT = '75'
      }
      // Fetch market data for all tickers in parallel
      const { marketDataMap } = await getMarketData(normalizedTickers)

      const results: Array<{
        ticker: string
        price: number | null
        timestamp?: string
        multiTimeframe: ReturnType<typeof formatMultiTimeframe>
      }> = []

      for (const ticker of normalizedTickers) {
        const assetData = marketDataMap.get(ticker)

        if (!assetData) {
          results.push({
            ticker,
            price: null,
            timestamp: new Date().toISOString(),
            multiTimeframe: null,
          })
          continue
        }

        const price = assetData.price || assetData.data?.price || null
        const formattedMultiTimeframe = formatMultiTimeframe(assetData)

        results.push({
          ticker,
          price,
          timestamp: new Date().toISOString(),
          multiTimeframe: formattedMultiTimeframe,
        })
      }

      const found = results.filter((r) => r.price !== null).length
      const notFound = results.length - found

      const result = {
        results,
        summary: {
          total: normalizedTickers.length,
          found,
          notFound,
        },
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
        structuredContent: result,
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                results: [],
                error: error instanceof Error ? error.message : String(error),
                message: 'Failed to fetch multi-timeframe analysis',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: {
          results: [],
        },
      }
    }
  }
)

// Register get__external_data tool
server.registerTool(
  'get_External_data',
  {
    title: 'Get External Data',
    description: 'Get external market data for multiple trading tickers at once (e.g., ["BTC", "ETH", "SOL"])',
    inputSchema: {
      tickers: z
        .array(z.string())
        .min(1)
        .describe('Array of asset ticker symbols (e.g., ["BTC", "ETH", "SOL"])'),
    },
    outputSchema: z.object({
      results: z.array(
        z.object({
          ticker: z.string(),
          price: z.number().nullable(),
          timestamp: z.string().optional(),
          externalData: z
            .object({
              fundingRate: z.string().nullable().optional(),
              fundingRateTrend: z.string().nullable().optional(),
              openInterest: z.union([z.string(), z.number()]).nullable().optional(),
              openInterestTrend: z.string().nullable().optional(),
              volumeTrend: z.string().nullable().optional(),
              volatility: z.string().nullable().optional(),
            })
            .nullable()
            .optional(),
        })
      ),
      summary: z
        .object({
          total: z.number(),
          found: z.number(),
          notFound: z.number(),
        })
        .optional(),
    }),
  },
  async ({ tickers }: { tickers: string[] }) => {
    if (!Array.isArray(tickers) || tickers.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                results: [],
                error: 'Invalid tickers parameter',
                message: 'Tickers must be a non-empty array of strings',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: {
          results: [],
        },
      }
    }

    // Normalize all tickers (uppercase, remove spaces)
    const normalizedTickers = tickers
      .filter((t) => t && typeof t === 'string' && t.trim().length > 0)
      .map((t) => t.trim().toUpperCase())

    if (normalizedTickers.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                results: [],
                error: 'No valid tickers',
                message: 'All tickers must be non-empty strings',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: {
          results: [],
        },
      }
    }

    try {
      // Fetch market data
      if (!process.env.CANDLES_COUNT || parseInt(process.env.CANDLES_COUNT) < 75) {
        process.env.CANDLES_COUNT = '75'
      }
      // Fetch market data for all tickers in parallel
      const { marketDataMap } = await getMarketData(normalizedTickers)

      const results: Array<{
        ticker: string
        price: number | null
        timestamp?: string
        externalData: ReturnType<typeof formatExternalData>
      }> = []

      for (const ticker of normalizedTickers) {
        const assetData = marketDataMap.get(ticker)

        if (!assetData) {
          results.push({
            ticker,
            price: null,
            timestamp: new Date().toISOString(),
            externalData: null,
          })
          continue
        }

        const price = assetData.price || assetData.data?.price || null
        const formattedExternalData = formatExternalData(assetData)

        results.push({
          ticker,
          price,
          timestamp: new Date().toISOString(),
          externalData: formattedExternalData,
        })
      }

      const found = results.filter((r) => r.price !== null).length
      const notFound = results.length - found

      const result = {
        results,
        summary: {
          total: normalizedTickers.length,
          found,
          notFound,
        },
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
        structuredContent: result,
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                results: [],
                error: error instanceof Error ? error.message : String(error),
                message: 'Failed to fetch external data',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: {
          results: [],
        },
      }
    }
  }
),

// Register calculate_risk_management tool
server.registerTool(
  'calculate_risk_management',
  {
    title: 'Calculate Risk Management',
    description: 'Calculate stop loss, take profit, and risk/reward ratio for a trading position',
    inputSchema: {
      ticker: z.string().describe('Asset ticker symbol (e.g., "BTC", "ETH", "SOL")'),
      entryPrice: z.number().positive().describe('Entry price for the position'),
      side: z.enum(['LONG', 'SHORT']).describe('Position side (LONG or SHORT)'),
      stopLossPct: z.number().positive().optional().describe('Stop loss percentage (default: 2%)'),
      takeProfitPct: z.number().positive().optional().describe('Take profit percentage (default: 4.5%)'),
      positionSizeUsd: z.number().positive().optional().describe('Position size in USD (optional, for calculating potential loss/profit)'),
    },
    outputSchema: z.object({
      ticker: z.string(),
      entryPrice: z.number(),
      side: z.string(),
      riskManagement: z.object({
        stopLossFixed: z.number(),
        stopLossFixedPct: z.number(),
        stopLossFlexible: z.number(),
        stopLossFlexiblePct: z.number(),
        takeProfit: z.number(),
        takeProfitPct: z.number(),
        takeProfitLevels: z.any().nullable().optional(),
        potentialLoss: z.number().nullable().optional(),
        potentialProfit: z.number().nullable().optional(),
        riskRewardRatio: z.number().nullable().optional(),
        trailingStop: z.object({
          active: z.boolean().nullable().optional(),
          price: z.number().nullable().optional(),
          trailPercent: z.number().nullable().optional(),
        }).nullable().optional(),
        signalReversal: z.object({
          shouldReverse: z.boolean().nullable().optional(),
          confidence: z.number().nullable().optional(),
        }).nullable().optional(),
      }),
    }),
  },
  async ({
    ticker,
    entryPrice,
    side,
    stopLossPct = 2,
    takeProfitPct = 4.5,
    positionSizeUsd,
  }: {
    ticker: string
    entryPrice: number
    side: 'LONG' | 'SHORT'
    stopLossPct?: number
    takeProfitPct?: number
    positionSizeUsd?: number
  }) => {
    if (!ticker || typeof ticker !== 'string' || ticker.trim().length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: 'Invalid ticker parameter',
                message: 'Ticker must be a non-empty string',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: {
          ticker: ticker || '',
          entryPrice: 0,
          side: 'LONG',
          riskManagement: {
            stopLossFixed: 0,
            stopLossFixedPct: 0,
            stopLossFlexible: 0,
            stopLossFlexiblePct: 0,
            takeProfit: 0,
            takeProfitPct: 0,
            potentialLoss: null,
            potentialProfit: null,
            riskRewardRatio: null,
          },
        },
      }
    }

    if (!entryPrice || entryPrice <= 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: 'Invalid entryPrice parameter',
                message: 'Entry price must be a positive number',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: {
          ticker: ticker.trim().toUpperCase(),
          entryPrice: 0,
          side,
          riskManagement: {
            stopLossFixed: 0,
            stopLossFixedPct: 0,
            stopLossFlexible: 0,
            stopLossFlexiblePct: 0,
            takeProfit: 0,
            takeProfitPct: 0,
            potentialLoss: null,
            potentialProfit: null,
            riskRewardRatio: null,
          },
        },
      }
    }

    try {
      const normalizedTicker = ticker.trim().toUpperCase()
      const positionSize = positionSizeUsd || 10000 // Default position size for calculation

      // Get current market data for enhanced risk management features
      const { marketDataMap } = await getMarketData([normalizedTicker])
      const assetData = marketDataMap.get(normalizedTicker)
      const currentPrice = assetData?.price || assetData?.data?.price || entryPrice
      const indicators = assetData?.indicators || assetData?.data?.indicators

      const riskManagement = formatRiskManagement(
        entryPrice,
        side,
        stopLossPct,
        takeProfitPct,
        positionSize,
        currentPrice,
        indicators
      )

      const result = {
        ticker: normalizedTicker,
        entryPrice,
        side,
        riskManagement,
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
        structuredContent: result,
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: error instanceof Error ? error.message : String(error),
                message: 'Failed to calculate risk management',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: {
          ticker: ticker.trim().toUpperCase(),
          entryPrice,
          side,
          riskManagement: {
            stopLossFixed: 0,
            stopLossFixedPct: 0,
            stopLossFlexible: 0,
            stopLossFlexiblePct: 0,
            takeProfit: 0,
            takeProfitPct: 0,
            potentialLoss: null,
            potentialProfit: null,
            riskRewardRatio: null,
          },
        },
      }
    }
  }
)

// Register calculate_position_setup tool
server.registerTool(
  'calculate_position_setup',
  {
    title: 'Calculate Position Setup',
    description: 'Calculate position size, leverage, margin, and quantity for a trading signal',
    inputSchema: {
      ticker: z.string().describe('Asset ticker symbol (e.g., "BTC", "ETH", "SOL")'),
      entryPrice: z.number().positive().describe('Entry price for the position'),
      side: z.enum(['LONG', 'SHORT']).describe('Position side (LONG or SHORT)'),
      capital: z.number().positive().optional().describe('Total capital available (optional, defaults to config)'),
      riskPct: z.number().positive().optional().describe('Risk percentage per trade (optional, default: 0.9%)'),
      strategy: z.enum(['equal', 'confidence_weighted', 'ranking_weighted']).optional().describe('Position sizing strategy (optional, default: equal)'),
      confidence: z.number().min(0).max(100).optional().describe('Signal confidence (0-100, required for confidence_weighted strategy)'),
      ranking: z.number().positive().optional().describe('Asset ranking (required for ranking_weighted strategy)'),
    },
    outputSchema: z.object({
      ticker: z.string(),
      entryPrice: z.number(),
      side: z.string(),
      positionSetup: z.object({
        positionSizeUsd: z.number(),
        quantity: z.number(),
        leverage: z.number(),
        marginPercent: z.number(),
        marginUsed: z.number(),
        positionValue: z.number(),
        capital: z.number(),
        capitalAllocated: z.number(),
        capitalAllocatedPct: z.number(),
        riskPct: z.number(),
      }),
    }),
  },
  async ({
    ticker,
    entryPrice,
    side,
    capital,
    riskPct = 0.9,
    strategy = 'equal',
    confidence,
    ranking,
  }: {
    ticker: string
    entryPrice: number
    side: 'LONG' | 'SHORT'
    capital?: number
    riskPct?: number
    strategy?: 'equal' | 'confidence_weighted' | 'ranking_weighted'
    confidence?: number
    ranking?: number
  }) => {
    if (!ticker || typeof ticker !== 'string' || ticker.trim().length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: 'Invalid ticker parameter',
                message: 'Ticker must be a non-empty string',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: {
          ticker: ticker || '',
          entryPrice: 0,
          side: 'LONG',
          positionSetup: {
            positionSizeUsd: 0,
            quantity: 0,
            leverage: 1,
            marginPercent: 0,
            marginUsed: 0,
            positionValue: 0,
            capital: 0,
            capitalAllocated: 0,
            capitalAllocatedPct: 0,
            riskPct: 0,
          },
        },
      }
    }

    if (!entryPrice || entryPrice <= 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: 'Invalid entryPrice parameter',
                message: 'Entry price must be a positive number',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: {
          ticker: ticker.trim().toUpperCase(),
          entryPrice: 0,
          side,
          positionSetup: {
            positionSizeUsd: 0,
            quantity: 0,
            leverage: 1,
            marginPercent: 0,
            marginUsed: 0,
            positionValue: 0,
            capital: 0,
            capitalAllocated: 0,
            capitalAllocatedPct: 0,
            riskPct: 0,
          },
        },
      }
    }

    try {
      const normalizedTicker = ticker.trim().toUpperCase()

      // Get default capital from config or env
      const defaultCapital = capital || parseFloat(process.env.PAPER_CAPITAL || '10000')
      const totalCapital = capital || defaultCapital

      // Get market data for indicators and external data
      if (!process.env.CANDLES_COUNT || parseInt(process.env.CANDLES_COUNT) < 75) {
        process.env.CANDLES_COUNT = '75'
      }
      const { marketDataMap } = await getMarketData([normalizedTicker])
      const assetData = marketDataMap.get(normalizedTicker)

      if (!assetData) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  error: 'Asset not found',
                  message: `No market data available for ${normalizedTicker}`,
                },
                null,
                2
              ),
            },
          ],
          structuredContent: {
            ticker: normalizedTicker,
            entryPrice,
            side,
            positionSetup: {
              positionSizeUsd: 0,
              quantity: 0,
              leverage: 1,
              marginPercent: 0,
              marginUsed: 0,
              positionValue: 0,
              capital: totalCapital,
              capitalAllocated: 0,
              capitalAllocatedPct: 0,
              riskPct,
            },
          },
        }
      }

      const indicators = assetData.indicators || assetData.data?.indicators || {}
      const externalData = assetData.externalData || assetData.data?.externalData || {}
      const maxLeverage = assetData.maxLeverage || externalData?.hyperliquid?.maxLeverage || 10

      // Create a mock signal for position sizing calculation
      const mockSignal = {
        coin: normalizedTicker,
        signal: side === 'LONG' ? 'buy_to_enter' : 'sell_to_enter',
        confidence: confidence || 50,
        entry_price: entryPrice,
      } as any

      // Calculate position size (simplified - removed execution logic)
      const positionSizeUsd = totalCapital * 0.1 // Use 10% of capital

      // Calculate dynamic leverage
      const leverage = calculateDynamicLeverage(
        indicators,
        externalData,
        mockSignal,
        entryPrice,
        maxLeverage
      )

      // Calculate dynamic margin percentage
      const marginPercent = calculateDynamicMarginPercentage(
        indicators,
        externalData,
        mockSignal,
        entryPrice
      )

      const positionSetup = formatPositionSetup(
        normalizedTicker,
        entryPrice,
        side,
        positionSizeUsd,
        leverage,
        marginPercent,
        totalCapital,
        riskPct
      )

      const result = {
        ticker: normalizedTicker,
        entryPrice,
        side,
        positionSetup,
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
        structuredContent: result,
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: error instanceof Error ? error.message : String(error),
                message: 'Failed to calculate position setup',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: {
          ticker: ticker.trim().toUpperCase(),
          entryPrice,
          side,
          positionSetup: {
            positionSizeUsd: 0,
            quantity: 0,
            leverage: 1,
            marginPercent: 0,
            marginUsed: 0,
            positionValue: 0,
            capital: capital || 10000,
            capitalAllocated: 0,
            capitalAllocatedPct: 0,
            riskPct,
          },
        },
      }
    }
  }
)

// Register get_orderbook_depth tool
server.registerTool(
  'get_orderbook_depth',
  {
    title: 'Get Order Book Depth',
    description: 'Get order book depth analysis for multiple trading tickers at once (e.g., ["BTC", "ETH", "SOL"])',
    inputSchema: {
      tickers: z
        .array(z.string())
        .min(1)
        .describe('Array of asset ticker symbols (e.g., ["BTC", "ETH", "SOL"])'),
    },
    outputSchema: z.object({
      results: z.array(
        z.object({
          ticker: z.string(),
          price: z.number().nullable(),
          timestamp: z.string().optional(),
          orderBookDepth: z
            .object({
              bidPrice: z.number(),
              askPrice: z.number(),
              midPrice: z.number(),
              spread: z.number(),
              spreadPercent: z.number(),
              bidDepth: z.number(),
              askDepth: z.number(),
              imbalance: z.number(),
              supportZones: z.array(
                z.object({
                  price: z.number(),
                  depth: z.number(),
                  distance: z.number(),
                })
              ),
              resistanceZones: z.array(
                z.object({
                  price: z.number(),
                  depth: z.number(),
                  distance: z.number(),
                })
              ),
              liquidityScore: z.number(),
              timestamp: z.number(),
            })
            .nullable()
            .optional(),
        })
      ),
      summary: z
        .object({
          total: z.number(),
          found: z.number(),
          notFound: z.number(),
        })
        .optional(),
    }),
  },
  async ({ tickers }: { tickers: string[] }) => {
    if (!Array.isArray(tickers) || tickers.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                results: [],
                error: 'Invalid tickers parameter',
                message: 'Tickers must be a non-empty array of strings',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: {
          results: [],
        },
      }
    }

    const normalizedTickers = tickers
      .filter((t) => t && typeof t === 'string' && t.trim().length > 0)
      .map((t) => t.trim().toUpperCase())

    if (normalizedTickers.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                results: [],
                error: 'No valid tickers',
                message: 'All tickers must be non-empty strings',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: {
          results: [],
        },
      }
    }

    try {
      if (!process.env.CANDLES_COUNT || parseInt(process.env.CANDLES_COUNT) < 75) {
        process.env.CANDLES_COUNT = '75'
      }
      const { marketDataMap } = await getMarketData(normalizedTickers)

      const results: Array<{
        ticker: string
        price: number | null
        timestamp?: string
        orderBookDepth: ReturnType<typeof formatOrderBookDepth>
      }> = []

      for (const ticker of normalizedTickers) {
        const assetData = marketDataMap.get(ticker)
        const price = await getRealTimePrice(ticker).catch(() => null)

        const orderBookDepth = assetData?.externalData?.orderBook || assetData?.data?.externalData?.orderBook || null
        const formattedOrderBook = formatOrderBookDepth(orderBookDepth)

        results.push({
          ticker,
          price,
          timestamp: new Date().toISOString(),
          orderBookDepth: formattedOrderBook,
        })
      }

      const found = results.filter((r) => r.orderBookDepth !== null).length
      const notFound = results.length - found

      const result = {
        results,
        summary: {
          total: normalizedTickers.length,
          found,
          notFound,
        },
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
        structuredContent: result,
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                results: [],
                error: error instanceof Error ? error.message : String(error),
                message: 'Failed to fetch order book depth',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: {
          results: [],
        },
      }
    }
  }
)

// Register get_volume_profile tool
server.registerTool(
  'get_volume_profile',
  {
    title: 'Get Volume Profile',
    description: 'Get volume profile analysis for multiple trading tickers at once (e.g., ["BTC", "ETH", "SOL"])',
    inputSchema: {
      tickers: z
        .array(z.string())
        .min(1)
        .describe('Array of asset ticker symbols (e.g., ["BTC", "ETH", "SOL"])'),
    },
    outputSchema: z.object({
      results: z.array(
        z.object({
          ticker: z.string(),
          price: z.number().nullable(),
          timestamp: z.string().optional(),
          volumeProfile: z
            .object({
              session: z
                .object({
                  poc: z.number(),
                  vah: z.number(),
                  val: z.number(),
                  hvn: z.array(z.object({ price: z.number(), volume: z.number() })),
                  lvn: z.array(z.object({ price: z.number(), volume: z.number() })),
                  totalVolume: z.number(),
                  sessionType: z.string(),
                  timestamp: z.number(),
                })
                .nullable(),
              composite: z
                .object({
                  poc: z.number(),
                  vah: z.number(),
                  val: z.number(),
                  compositePoc: z.number(),
                  compositeVah: z.number(),
                  compositeVal: z.number(),
                  accumulationZone: z
                    .object({
                      priceRange: z.tuple([z.number(), z.number()]),
                      volumeRatio: z.number(),
                      strength: z.string(),
                    })
                    .nullable(),
                  distributionZone: z
                    .object({
                      priceRange: z.tuple([z.number(), z.number()]),
                      volumeRatio: z.number(),
                      strength: z.string(),
                    })
                    .nullable(),
                  balanceZones: z.array(
                    z.object({
                      priceRange: z.tuple([z.number(), z.number()]),
                      volume: z.number(),
                      center: z.number(),
                    })
                  ),
                  timeRange: z.string(),
                  timestamp: z.number(),
                })
                .nullable(),
            })
            .nullable()
            .optional(),
        })
      ),
      summary: z
        .object({
          total: z.number(),
          found: z.number(),
          notFound: z.number(),
        })
        .optional(),
    }),
  },
  async ({ tickers }: { tickers: string[] }) => {
    if (!Array.isArray(tickers) || tickers.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                results: [],
                error: 'Invalid tickers parameter',
                message: 'Tickers must be a non-empty array of strings',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: {
          results: [],
        },
      }
    }

    const normalizedTickers = tickers
      .filter((t) => t && typeof t === 'string' && t.trim().length > 0)
      .map((t) => t.trim().toUpperCase())

    if (normalizedTickers.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                results: [],
                error: 'No valid tickers',
                message: 'All tickers must be non-empty strings',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: {
          results: [],
        },
      }
    }

    try {
      if (!process.env.CANDLES_COUNT || parseInt(process.env.CANDLES_COUNT) < 75) {
        process.env.CANDLES_COUNT = '75'
      }
      const { marketDataMap } = await getMarketData(normalizedTickers)

      const results: Array<{
        ticker: string
        price: number | null
        timestamp?: string
        volumeProfile: ReturnType<typeof formatVolumeProfile>
      }> = []

      for (const ticker of normalizedTickers) {
        const assetData = marketDataMap.get(ticker)
        const price = await getRealTimePrice(ticker).catch(() => null)

        const volumeProfileData = assetData?.externalData?.volumeProfile || assetData?.data?.externalData?.volumeProfile || null
        const formattedVolumeProfile = formatVolumeProfile(
          volumeProfileData?.session || null,
          volumeProfileData?.composite || null
        )

        results.push({
          ticker,
          price,
          timestamp: new Date().toISOString(),
          volumeProfile: formattedVolumeProfile,
        })
      }

      const found = results.filter((r) => r.volumeProfile !== null).length
      const notFound = results.length - found

      const result = {
        results,
        summary: {
          total: normalizedTickers.length,
          found,
          notFound,
        },
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
        structuredContent: result,
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                results: [],
                error: error instanceof Error ? error.message : String(error),
                message: 'Failed to fetch volume profile',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: {
          results: [],
        },
      }
    }
  }
)

// Register get_market_structure tool
server.registerTool(
  'get_market_structure',
  {
    title: 'Get Market Structure',
    description: 'Get market structure analysis for multiple trading tickers at once (e.g., ["BTC", "ETH", "SOL"])',
    inputSchema: {
      tickers: z
        .array(z.string())
        .min(1)
        .describe('Array of asset ticker symbols (e.g., ["BTC", "ETH", "SOL"])'),
    },
    outputSchema: z.object({
      results: z.array(
        z.object({
          ticker: z.string(),
          price: z.number().nullable(),
          timestamp: z.string().optional(),
          marketStructure: z
            .object({
              structure: z.enum(['bullish', 'bearish', 'neutral']),
              coc: z.enum(['bullish', 'bearish', 'none']),
              lastSwingHigh: z.number().nullable(),
              lastSwingLow: z.number().nullable(),
              structureStrength: z.number(),
              reversalSignal: z.boolean(),
              swingHighs: z.array(
                z.object({
                  price: z.number(),
                  index: z.number(),
                  timestamp: z.number(),
                })
              ),
              swingLows: z.array(
                z.object({
                  price: z.number(),
                  index: z.number(),
                  timestamp: z.number(),
                })
              ),
              timestamp: z.number(),
            })
            .nullable()
            .optional(),
        })
      ),
      summary: z
        .object({
          total: z.number(),
          found: z.number(),
          notFound: z.number(),
        })
        .optional(),
    }),
  },
  async ({ tickers }: { tickers: string[] }) => {
    if (!Array.isArray(tickers) || tickers.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                results: [],
                error: 'Invalid tickers parameter',
                message: 'Tickers must be a non-empty array of strings',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: {
          results: [],
        },
      }
    }

    const normalizedTickers = tickers
      .filter((t) => t && typeof t === 'string' && t.trim().length > 0)
      .map((t) => t.trim().toUpperCase())

    if (normalizedTickers.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                results: [],
                error: 'No valid tickers',
                message: 'All tickers must be non-empty strings',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: {
          results: [],
        },
      }
    }

    try {
      if (!process.env.CANDLES_COUNT || parseInt(process.env.CANDLES_COUNT) < 75) {
        process.env.CANDLES_COUNT = '75'
      }
      const { marketDataMap } = await getMarketData(normalizedTickers)

      const results: Array<{
        ticker: string
        price: number | null
        timestamp?: string
        marketStructure: ReturnType<typeof formatMarketStructure>
      }> = []

      for (const ticker of normalizedTickers) {
        const assetData = marketDataMap.get(ticker)
        const price = await getRealTimePrice(ticker).catch(() => null)

        if (!assetData || !price) {
          results.push({
            ticker,
            price,
            timestamp: new Date().toISOString(),
            marketStructure: null,
          })
          continue
        }

        const historicalData = assetData?.historicalData || assetData?.data?.historicalData || []
        if (historicalData.length < 20) {
          results.push({
            ticker,
            price,
            timestamp: new Date().toISOString(),
            marketStructure: null,
          })
          continue
        }

        const marketStructure = detectChangeOfCharacter(historicalData, price)
        const formattedMarketStructure = formatMarketStructure(marketStructure)

        results.push({
          ticker,
          price,
          timestamp: new Date().toISOString(),
          marketStructure: formattedMarketStructure,
        })
      }

      const found = results.filter((r) => r.marketStructure !== null).length
      const notFound = results.length - found

      const result = {
        results,
        summary: {
          total: normalizedTickers.length,
          found,
          notFound,
        },
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
        structuredContent: result,
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                results: [],
                error: error instanceof Error ? error.message : String(error),
                message: 'Failed to fetch market structure',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: {
          results: [],
        },
      }
    }
  }
)

// Register get_market_regime tool
server.registerTool(
  'get_market_regime',
  {
    title: 'Get Market Regime Analysis',
    description: 'Get market regime analysis (trending/choppy/volatile) for multiple trading tickers at once (e.g., ["BTC", "ETH", "SOL"])',
    inputSchema: {
      tickers: z
        .array(z.string())
        .min(1)
        .describe('Array of asset ticker symbols (e.g., ["BTC", "ETH", "SOL"])'),
    },
    outputSchema: z.object({
      results: z.array(
        z.object({
          ticker: z.string(),
          price: z.number().nullable(),
          timestamp: z.string().optional(),
          marketRegime: z
            .object({
              regime: z.enum(['trending', 'choppy', 'neutral']),
              volatility: z.enum(['high', 'normal', 'low']),
              adx: z.number().nullable(),
              atrPercent: z.number().nullable(),
              regimeScore: z.number(),
            })
            .nullable()
            .optional(),
        })
      ),
      summary: z
        .object({
          total: z.number(),
          found: z.number(),
          notFound: z.number(),
        })
        .optional(),
    }),
  },
  async ({ tickers }: { tickers: string[] }) => {
    if (!Array.isArray(tickers) || tickers.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                results: [],
                error: 'Invalid tickers parameter',
                message: 'Tickers must be a non-empty array of strings',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: {
          results: [],
        },
      }
    }

    const normalizedTickers = tickers
      .filter((t) => t && typeof t === 'string' && t.trim().length > 0)
      .map((t) => t.trim().toUpperCase())

    if (normalizedTickers.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                results: [],
                error: 'No valid tickers',
                message: 'All tickers must be non-empty strings',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: {
          results: [],
        },
      }
    }

    const { marketDataMap } = await getMarketData(normalizedTickers)

    const results = []
    for (const ticker of normalizedTickers) {
      try {
        const assetData = marketDataMap.get(ticker)
        const price = assetData?.price || null

        let marketRegime = null
        if (assetData?.indicators) {
          const adx = assetData.indicators.adx || null
          const atr = assetData.indicators.atr || null
          const historicalData = assetData.historicalData || []

          marketRegime = detectMarketRegime(
            adx,
            atr,
            price || 0,
            historicalData
          )
        }

        results.push({
          ticker,
          price,
          timestamp: new Date().toISOString(),
          marketRegime,
        })
      } catch (error) {
        console.warn(`Failed to analyze market regime for ${ticker}:`, error)
        results.push({
          ticker,
          price: null,
          timestamp: new Date().toISOString(),
          marketRegime: null,
        })
      }
    }

    const found = results.filter((r) => r.marketRegime !== null).length
    const notFound = results.length - found

    const result = {
      results,
      summary: {
        total: normalizedTickers.length,
        found,
        notFound,
      },
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
      structuredContent: result,
    }
  }
)

// Register get_candlestick_patterns tool
server.registerTool(
  'get_candlestick_patterns',
  {
    title: 'Get Candlestick Patterns',
    description: 'Get candlestick pattern detection for multiple trading tickers at once (e.g., ["BTC", "ETH", "SOL"])',
    inputSchema: {
      tickers: z
        .array(z.string())
        .min(1)
        .describe('Array of asset ticker symbols (e.g., ["BTC", "ETH", "SOL"])'),
    },
    outputSchema: z.object({
      results: z.array(
        z.object({
          ticker: z.string(),
          price: z.number().nullable(),
          timestamp: z.string().optional(),
          candlestickPatterns: z
            .object({
              patterns: z.array(
                z.object({
                  type: z.enum(['doji', 'hammer', 'bullish_engulfing', 'bearish_engulfing']),
                  index: z.number(),
                  bullish: z.boolean(),
                })
              ),
              latestPattern: z
                .object({
                  type: z.enum(['doji', 'hammer', 'bullish_engulfing', 'bearish_engulfing']),
                  index: z.number(),
                  bullish: z.boolean(),
                })
                .nullable(),
              bullishCount: z.number(),
              bearishCount: z.number(),
            })
            .nullable()
            .optional(),
        })
      ),
      summary: z
        .object({
          total: z.number(),
          found: z.number(),
          notFound: z.number(),
        })
        .optional(),
    }),
  },
  async ({ tickers }: { tickers: string[] }) => {
    if (!Array.isArray(tickers) || tickers.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                results: [],
                error: 'Invalid tickers parameter',
                message: 'Tickers must be a non-empty array of strings',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: {
          results: [],
        },
      }
    }

    const normalizedTickers = tickers
      .filter((t) => t && typeof t === 'string' && t.trim().length > 0)
      .map((t) => t.trim().toUpperCase())

    if (normalizedTickers.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                results: [],
                error: 'No valid tickers',
                message: 'All tickers must be non-empty strings',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: {
          results: [],
        },
      }
    }

    try {
      if (!process.env.CANDLES_COUNT || parseInt(process.env.CANDLES_COUNT) < 75) {
        process.env.CANDLES_COUNT = '75'
      }
      const { marketDataMap } = await getMarketData(normalizedTickers)

      const results: Array<{
        ticker: string
        price: number | null
        timestamp?: string
        candlestickPatterns: ReturnType<typeof formatCandlestickPatterns>
      }> = []

      for (const ticker of normalizedTickers) {
        const assetData = marketDataMap.get(ticker)
        const price = await getRealTimePrice(ticker).catch(() => null)

        if (!assetData) {
          results.push({
            ticker,
            price,
            timestamp: new Date().toISOString(),
            candlestickPatterns: formatCandlestickPatterns(null),
          })
          continue
        }

        const historicalData = assetData?.historicalData || assetData?.data?.historicalData || []
        if (historicalData.length < 5) {
          results.push({
            ticker,
            price,
            timestamp: new Date().toISOString(),
            candlestickPatterns: formatCandlestickPatterns(null),
          })
          continue
        }

        const patterns = detectCandlestickPatterns(historicalData, 5)
        const formattedPatterns = formatCandlestickPatterns(patterns)

        results.push({
          ticker,
          price,
          timestamp: new Date().toISOString(),
          candlestickPatterns: formattedPatterns,
        })
      }

      const found = results.filter((r) => r.candlestickPatterns !== null).length
      const notFound = results.length - found

      const result = {
        results,
        summary: {
          total: normalizedTickers.length,
          found,
          notFound,
        },
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
        structuredContent: result,
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                results: [],
                error: error instanceof Error ? error.message : String(error),
                message: 'Failed to fetch candlestick patterns',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: {
          results: [],
        },
      }
    }
  }
)

// Register get_divergence tool
server.registerTool(
  'get_divergence',
  {
    title: 'Get Divergence Detection',
    description: 'Get RSI divergence detection for multiple trading tickers at once (e.g., ["BTC", "ETH", "SOL"])',
    inputSchema: {
      tickers: z
        .array(z.string())
        .min(1)
        .describe('Array of asset ticker symbols (e.g., ["BTC", "ETH", "SOL"])'),
    },
    outputSchema: z.object({
      results: z.array(
        z.object({
          ticker: z.string(),
          price: z.number().nullable(),
          timestamp: z.string().optional(),
          divergence: z
            .object({
              bullishDivergence: z.boolean(),
              bearishDivergence: z.boolean(),
              divergence: z.enum(['bullish', 'bearish']).nullable(),
            })
            .nullable()
            .optional(),
        })
      ),
      summary: z
        .object({
          total: z.number(),
          found: z.number(),
          notFound: z.number(),
        })
        .optional(),
    }),
  },
  async ({ tickers }: { tickers: string[] }) => {
    if (!Array.isArray(tickers) || tickers.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                results: [],
                error: 'Invalid tickers parameter',
                message: 'Tickers must be a non-empty array of strings',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: {
          results: [],
        },
      }
    }

    const normalizedTickers = tickers
      .filter((t) => t && typeof t === 'string' && t.trim().length > 0)
      .map((t) => t.trim().toUpperCase())

    if (normalizedTickers.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                results: [],
                error: 'No valid tickers',
                message: 'All tickers must be non-empty strings',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: {
          results: [],
        },
      }
    }

    try {
      if (!process.env.CANDLES_COUNT || parseInt(process.env.CANDLES_COUNT) < 75) {
        process.env.CANDLES_COUNT = '75'
      }
      const { marketDataMap } = await getMarketData(normalizedTickers)

      const results: Array<{
        ticker: string
        price: number | null
        timestamp?: string
        divergence: ReturnType<typeof formatDivergence>
      }> = []

      for (const ticker of normalizedTickers) {
        const assetData = marketDataMap.get(ticker)
        const price = await getRealTimePrice(ticker).catch(() => null)

        if (!assetData) {
          results.push({
            ticker,
            price,
            timestamp: new Date().toISOString(),
            divergence: null,
          })
          continue
        }

        const historicalData = assetData?.historicalData || assetData?.data?.historicalData || []

        if (historicalData.length < 20) {
          results.push({
            ticker,
            price,
            timestamp: new Date().toISOString(),
            divergence: null,
          })
          continue
        }

        // Calculate RSI values for divergence detection
        const prices = historicalData.map((d: any) => d.close)
        const rsiValues = calculateRSI(prices, 14)

        if (rsiValues.length < 20) {
          results.push({
            ticker,
            price,
            timestamp: new Date().toISOString(),
            divergence: null,
          })
          continue
        }

        // Use RSI array for divergence detection
        const divergence = detectDivergence(prices, rsiValues, 20)
        const formattedDivergence = formatDivergence(divergence)

        results.push({
          ticker,
          price,
          timestamp: new Date().toISOString(),
          divergence: formattedDivergence,
        })
      }

      const found = results.filter((r) => r.divergence !== null).length
      const notFound = results.length - found

      const result = {
        results,
        summary: {
          total: normalizedTickers.length,
          found,
          notFound,
        },
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
        structuredContent: result,
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                results: [],
                error: error instanceof Error ? error.message : String(error),
                message: 'Failed to fetch divergence data',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: {
          results: [],
        },
      }
    }
  }
)

// Register get_liquidation_levels tool
server.registerTool(
  'get_liquidation_levels',
  {
    title: 'Get Liquidation Levels',
    description: 'Get liquidation level analysis for multiple trading tickers at once (e.g., ["BTC", "ETH", "SOL"])',
    inputSchema: {
      tickers: z
        .array(z.string())
        .min(1)
        .describe('Array of asset ticker symbols (e.g., ["BTC", "ETH", "SOL"])'),
    },
    outputSchema: z.object({
      results: z.array(
        z.object({
          ticker: z.string(),
          price: z.number().nullable(),
          timestamp: z.string().optional(),
          liquidationLevels: z
            .object({
              clusters: z.object({
                long: z.array(z.any()),
                short: z.array(z.any()),
                nearest: z.any().nullable(),
                distance: z.number(),
              }),
              liquidityGrab: z.object({
                detected: z.boolean(),
                zone: z
                  .object({
                    priceLow: z.number(),
                    priceHigh: z.number(),
                  })
                  .nullable(),
                side: z.enum(['long', 'short', 'none']),
              }),
              stopHunt: z.object({
                predicted: z.boolean(),
                targetPrice: z.number().nullable(),
                side: z.enum(['long', 'short', 'none']),
              }),
              cascade: z.object({
                risk: z.enum(['high', 'medium', 'low']),
                triggerPrice: z.number().nullable(),
              }),
              safeEntry: z.object({
                zones: z.array(
                  z.object({
                    priceLow: z.number(),
                    priceHigh: z.number(),
                  })
                ),
                confidence: z.number(),
              }),
            })
            .nullable()
            .optional(),
        })
      ),
      summary: z
        .object({
          total: z.number(),
          found: z.number(),
          notFound: z.number(),
        })
        .optional(),
    }),
  },
  async ({ tickers }: { tickers: string[] }) => {
    if (!Array.isArray(tickers) || tickers.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                results: [],
                error: 'Invalid tickers parameter',
                message: 'Tickers must be a non-empty array of strings',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: {
          results: [],
        },
      }
    }

    const normalizedTickers = tickers
      .filter((t) => t && typeof t === 'string' && t.trim().length > 0)
      .map((t) => t.trim().toUpperCase())

    if (normalizedTickers.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                results: [],
                error: 'No valid tickers',
                message: 'All tickers must be non-empty strings',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: {
          results: [],
        },
      }
    }

    try {
      if (!process.env.CANDLES_COUNT || parseInt(process.env.CANDLES_COUNT) < 75) {
        process.env.CANDLES_COUNT = '75'
      }
      const { marketDataMap } = await getMarketData(normalizedTickers)

      const results: Array<{
        ticker: string
        price: number | null
        timestamp?: string
        liquidationLevels: ReturnType<typeof formatLiquidationLevels>
      }> = []

      for (const ticker of normalizedTickers) {
        const assetData = marketDataMap.get(ticker)
        const price = await getRealTimePrice(ticker).catch(() => null)

        if (!assetData || !price) {
          results.push({
            ticker,
            price,
            timestamp: new Date().toISOString(),
            liquidationLevels: null,
          })
          continue
        }

        const futuresData = assetData?.externalData?.futures || assetData?.data?.externalData?.futures || null
        const liquidationData = futuresData?.liquidation || null

        if (!liquidationData) {
          results.push({
            ticker,
            price,
            timestamp: new Date().toISOString(),
            liquidationLevels: null,
          })
          continue
        }

        const liquidation = calculateLiquidationIndicators(liquidationData, price)
        const formattedLiquidation = formatLiquidationLevels(liquidation)

        results.push({
          ticker,
          price,
          timestamp: new Date().toISOString(),
          liquidationLevels: formattedLiquidation,
        })
      }

      const found = results.filter((r) => r.liquidationLevels !== null).length
      const notFound = results.length - found

      const result = {
        results,
        summary: {
          total: normalizedTickers.length,
          found,
          notFound,
        },
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
        structuredContent: result,
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                results: [],
                error: error instanceof Error ? error.message : String(error),
                message: 'Failed to fetch liquidation levels',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: {
          results: [],
        },
      }
    }
  }
)

// Register get_long_short_ratio tool
server.registerTool(
  'get_long_short_ratio',
  {
    title: 'Get Long/Short Ratio',
    description: 'Get long/short ratio analysis for multiple trading tickers at once (e.g., ["BTC", "ETH", "SOL"])',
    inputSchema: {
      tickers: z
        .array(z.string())
        .min(1)
        .describe('Array of asset ticker symbols (e.g., ["BTC", "ETH", "SOL"])'),
    },
    outputSchema: z.object({
      results: z.array(
        z.object({
          ticker: z.string(),
          price: z.number().nullable(),
          timestamp: z.string().optional(),
          longShortRatio: z
            .object({
              sentiment: z.object({
                overall: z.enum(['extreme_long', 'extreme_short', 'moderate_long', 'moderate_short', 'balanced']),
                retail: z.enum(['long', 'short', 'balanced']),
                pro: z.enum(['long', 'short', 'balanced']),
              }),
              contrarian: z.object({
                signal: z.boolean(),
                direction: z.enum(['long', 'short', 'neutral']),
                strength: z.number(),
              }),
              extreme: z.object({
                detected: z.boolean(),
                level: z.enum(['extreme_long', 'extreme_short', 'normal']),
                reversalSignal: z.boolean(),
              }),
              divergence: z.object({
                retailVsPro: z.number(),
                signal: z.enum(['follow_pro', 'fade_retail', 'neutral']),
              }),
            })
            .nullable()
            .optional(),
        })
      ),
      summary: z
        .object({
          total: z.number(),
          found: z.number(),
          notFound: z.number(),
        })
        .optional(),
    }),
  },
  async ({ tickers }: { tickers: string[] }) => {
    if (!Array.isArray(tickers) || tickers.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                results: [],
                error: 'Invalid tickers parameter',
                message: 'Tickers must be a non-empty array of strings',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: {
          results: [],
        },
      }
    }

    const normalizedTickers = tickers
      .filter((t) => t && typeof t === 'string' && t.trim().length > 0)
      .map((t) => t.trim().toUpperCase())

    if (normalizedTickers.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                results: [],
                error: 'No valid tickers',
                message: 'All tickers must be non-empty strings',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: {
          results: [],
        },
      }
    }

    try {
      if (!process.env.CANDLES_COUNT || parseInt(process.env.CANDLES_COUNT) < 75) {
        process.env.CANDLES_COUNT = '75'
      }
      const { marketDataMap } = await getMarketData(normalizedTickers)

      const results: Array<{
        ticker: string
        price: number | null
        timestamp?: string
        longShortRatio: ReturnType<typeof formatLongShortRatio>
      }> = []

      for (const ticker of normalizedTickers) {
        const assetData = marketDataMap.get(ticker)
        const price = await getRealTimePrice(ticker).catch(() => null)

        if (!assetData) {
          results.push({
            ticker,
            price,
            timestamp: new Date().toISOString(),
            longShortRatio: null,
          })
          continue
        }

        const futuresData = assetData?.externalData?.futures || assetData?.data?.externalData?.futures || null
        const longShortRatioData = futuresData?.longShortRatio || null

        if (!longShortRatioData) {
          results.push({
            ticker,
            price,
            timestamp: new Date().toISOString(),
            longShortRatio: null,
          })
          continue
        }

        const ratio = calculateLongShortRatioIndicators(longShortRatioData)
        const formattedRatio = formatLongShortRatio(ratio)

        results.push({
          ticker,
          price,
          timestamp: new Date().toISOString(),
          longShortRatio: formattedRatio,
        })
      }

      const found = results.filter((r) => r.longShortRatio !== null).length
      const notFound = results.length - found

      const result = {
        results,
        summary: {
          total: normalizedTickers.length,
          found,
          notFound,
        },
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
        structuredContent: result,
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                results: [],
                error: error instanceof Error ? error.message : String(error),
                message: 'Failed to fetch long/short ratio',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: {
          results: [],
        },
      }
    }
  }
)

// Register ma_envelope tool
server.registerTool(
  'ma_envelope',
  {
    title: 'Moving Average Envelope Indicator',
    description: 'Calculate moving average envelopes for volatility-based support/resistance and overbought/oversold signals.',
    inputSchema: z.object({
      prices: z.array(z.number()).min(5).describe('Array of price data'),
      period: z.number().int().min(2).max(200).default(20).describe('Moving average period (default: 20)'),
      percentage: z.number().min(0.1).max(20).default(2.5).describe('Envelope percentage (default: 2.5)'),
      maType: z.enum(['sma', 'ema']).default('sma').describe('Moving average type (default: sma)'),
    }),
    outputSchema: z.object({
      ma: z.number().describe('Moving average value'),
      upperBand: z.number().describe('Upper envelope band'),
      lowerBand: z.number().describe('Lower envelope band'),
      percentage: z.number().describe('Envelope percentage'),
      position: z.enum(['above_upper', 'above_ma', 'below_ma', 'below_lower']).describe('Current price position'),
      signal: z.enum(['overbought', 'oversold', 'neutral']).describe('Envelope signal'),
      distanceFromUpper: z.number().describe('Distance from upper band (%)'),
      distanceFromLower: z.number().describe('Distance from lower band (%)'),
      bandWidth: z.number().describe('Width of the envelope band (%)'),
    }),
  },
  async ({ prices, period = 20, percentage = 2.5, maType = 'sma' as 'sma' | 'ema' }) => {
    try {
      const result = calculateMAEnvelope(prices, period, percentage, maType)
      if (!result) {
        throw new Error(`Insufficient data: need at least ${period} prices, got ${prices.length}`)
      }
      return result
    } catch (error: any) {
      throw new Error(`MA Envelope calculation failed: ${error.message}`)
    }
  }
)

// Register vwma tool
server.registerTool(
  'vwma',
  {
    title: 'Volume Weighted Moving Average (VWMA)',
    description: 'Calculate volume-weighted moving average that gives more weight to periods with higher volume.',
    inputSchema: z.object({
      prices: z.array(z.number()).min(5).describe('Array of closing prices'),
      volumes: z.array(z.number()).min(5).describe('Array of volume data (must match prices length)'),
      period: z.number().int().min(2).max(200).default(20).describe('Period for VWMA calculation (default: 20)'),
    }),
    outputSchema: z.object({
      vwma: z.number().describe('Volume-weighted moving average value'),
      priceVsVwma: z.number().describe('Price vs VWMA (%)'),
      position: z.enum(['above', 'below', 'equal']).describe('Current price position relative to VWMA'),
      trend: z.enum(['bullish', 'bearish', 'neutral']).describe('Trend direction based on VWMA slope'),
      avgVolume: z.number().describe('Average volume over the period'),
      volumeEfficiency: z.number().describe('Volume efficiency ratio (current volume / average volume)'),
      strength: z.number().describe('Trend strength (0-100)'),
    }),
  },
  async ({ prices, volumes, period = 20 }) => {
    try {
      if (prices.length !== volumes.length) {
        throw new Error('Prices and volumes arrays must have the same length')
      }
      const result = calculateVWMA(prices, volumes, period)
      if (!result) {
        throw new Error(`Insufficient data: need at least ${period} data points, got ${prices.length}`)
      }
      return result
    } catch (error: any) {
      throw new Error(`VWMA calculation failed: ${error.message}`)
    }
  }
)

// Register price_channel tool
server.registerTool(
  'price_channel',
  {
    title: 'Price Channel Indicator',
    description: 'Calculate price channels using highest high and lowest low for support/resistance and breakout signals.',
    inputSchema: z.object({
      highs: z.array(z.number()).min(5).describe('Array of high prices'),
      lows: z.array(z.number()).min(5).describe('Array of low prices'),
      closes: z.array(z.number()).min(5).describe('Array of closing prices'),
      period: z.number().int().min(2).max(200).default(20).describe('Period for channel calculation (default: 20)'),
    }),
    outputSchema: z.object({
      upperChannel: z.number().describe('Upper channel boundary (highest high)'),
      lowerChannel: z.number().describe('Lower channel boundary (lowest low)'),
      middleChannel: z.number().describe('Middle channel (midpoint)'),
      channelWidth: z.number().describe('Channel width (%)'),
      channelHeight: z.number().describe('Absolute channel height'),
      position: z.enum(['upper_third', 'middle_third', 'lower_third', 'above_channel', 'below_channel']).describe('Current price position within channel'),
      distanceFromUpper: z.number().describe('Distance from upper channel (%)'),
      distanceFromLower: z.number().describe('Distance from lower channel (%)'),
      trend: z.enum(['uptrend', 'downtrend', 'sideways']).describe('Channel trend direction'),
      upperBreakout: z.boolean().describe('Price broke above upper channel'),
      lowerBreakout: z.boolean().describe('Price broke below lower channel'),
      upperStrength: z.number().describe('Upper channel strength (0-100)'),
      lowerStrength: z.number().describe('Lower channel strength (0-100)'),
    }),
  },
  async ({ highs, lows, closes, period = 20 }) => {
    try {
      if (highs.length !== lows.length || highs.length !== closes.length) {
        throw new Error('Highs, lows, and closes arrays must have the same length')
      }
      const result = calculatePriceChannel(highs, lows, closes, period)
      if (!result) {
        throw new Error(`Insufficient data: need at least ${period} data points, got ${highs.length}`)
      }
      return result
    } catch (error: any) {
      throw new Error(`Price Channel calculation failed: ${error.message}`)
    }
  }
)

// Register mcginley_dynamic tool
server.registerTool(
  'mcginley_dynamic',
  {
    title: 'McGinley Dynamic Indicator',
    description: 'Calculate adaptive moving average that adjusts to market volatility and reduces lag compared to traditional MAs.',
    inputSchema: z.object({
      prices: z.array(z.number()).min(5).describe('Array of closing prices'),
      period: z.number().int().min(2).max(200).default(20).describe('Period for McGinley Dynamic calculation (default: 20)'),
    }),
    outputSchema: z.object({
      mcgDyn: z.number().describe('McGinley Dynamic value'),
      trend: z.enum(['bullish', 'bearish', 'neutral']).describe('Trend direction'),
      priceVsMcgDyn: z.number().describe('Price vs McGinley Dynamic (%)'),
      position: z.enum(['above', 'below', 'equal']).describe('Current price position relative to McGinley Dynamic'),
      adaptationRate: z.number().describe('Current adaptation rate (K factor)'),
      volatilityFactor: z.number().describe('Market volatility factor'),
      strength: z.number().describe('Trend strength (0-100)'),
      lagReduction: z.number().describe('Lag reduction effectiveness vs SMA (%)'),
    }),
  },
  async ({ prices, period = 20 }) => {
    try {
      const result = calculateMcGinleyDynamic(prices, period)
      if (!result) {
        throw new Error(`Insufficient data: need at least ${period} prices, got ${prices.length}`)
      }
      return result
    } catch (error: any) {
      throw new Error(`McGinley Dynamic calculation failed: ${error.message}`)
    }
  }
)

// Register rainbow_ma tool
server.registerTool(
  'rainbow_ma',
  {
    title: 'Rainbow Moving Average Indicator',
    description: 'Calculate multiple moving averages with different periods for comprehensive trend visualization and alignment analysis.',
    inputSchema: z.object({
      prices: z.array(z.number()).min(10).describe('Array of closing prices'),
      periods: z.array(z.number()).min(8).max(12).default([2, 3, 4, 5, 6, 7, 8, 9]).describe('Periods for each MA in rainbow (default: [2,3,4,5,6,7,8,9])'),
    }),
    outputSchema: z.object({
      ma2: z.number().describe('Fastest MA (period 2)'),
      ma3: z.number().describe('MA period 3'),
      ma4: z.number().describe('MA period 4'),
      ma5: z.number().describe('MA period 5'),
      ma6: z.number().describe('MA period 6'),
      ma7: z.number().describe('MA period 7'),
      ma8: z.number().describe('MA period 8'),
      ma9: z.number().describe('Slowest MA (period 9)'),
      trend: z.enum(['strong_bullish', 'bullish', 'neutral', 'bearish', 'strong_bearish']).describe('Overall trend direction'),
      alignment: z.enum(['bullish_alignment', 'bearish_alignment', 'mixed']).describe('MA alignment pattern'),
      position: z.enum(['above_rainbow', 'in_rainbow', 'below_rainbow']).describe('Price position vs rainbow'),
      strength: z.number().describe('Trend strength (0-100)'),
      spread: z.number().describe('Spread between fastest and slowest MA (%)'),
      compression: z.boolean().describe('Whether rainbow is compressing (potential breakout)'),
    }),
  },
  async ({ prices, periods = [2, 3, 4, 5, 6, 7, 8, 9] }) => {
    try {
      const result = calculateRainbowMA(prices, periods)
      if (!result) {
        const maxPeriod = Math.max(...periods)
        throw new Error(`Insufficient data: need at least ${maxPeriod} prices, got ${prices.length}`)
      }
      return result
    } catch (error: any) {
      throw new Error(`Rainbow MA calculation failed: ${error.message}`)
    }
  }
)

// Register kaufman_adaptive_ma tool
server.registerTool(
  'kaufman_adaptive_ma',
  {
    title: 'Kaufman Adaptive Moving Average (KAMA)',
    description: 'Calculate adaptive moving average that adjusts smoothing based on market efficiency and volatility.',
    inputSchema: z.object({
      closes: z.array(z.number()).min(40).describe('Array of closing prices'),
      efficiencyPeriod: z.number().int().min(2).max(50).default(10).describe('Period for efficiency ratio calculation (default: 10)'),
      fastPeriod: z.number().int().min(2).max(20).default(2).describe('Fast EMA period (default: 2)'),
      slowPeriod: z.number().int().min(10).max(100).default(30).describe('Slow EMA period (default: 30)'),
    }),
    outputSchema: z.object({
      kama: z.number().describe('Kaufman Adaptive Moving Average value'),
      efficiencyRatio: z.number().describe('Market efficiency ratio (0-1)'),
      smoothingConstant: z.number().describe('Current smoothing constant (alpha)'),
      trend: z.enum(['bullish', 'bearish', 'neutral']).describe('Trend direction'),
      priceVsKama: z.number().describe('Price vs KAMA (%)'),
      position: z.enum(['above', 'below', 'equal']).describe('Current price position relative to KAMA'),
      strength: z.number().describe('Signal strength (0-100)'),
      marketCondition: z.enum(['trending', 'ranging', 'neutral']).describe('Market condition assessment'),
      responsiveness: z.enum(['high', 'moderate', 'low']).describe('MA responsiveness level'),
      signal: z.enum(['buy', 'sell', 'neutral']).describe('Trading signal'),
    }),
  },
  async ({ closes, efficiencyPeriod = 10, fastPeriod = 2, slowPeriod = 30 }) => {
    try {
      const result = calculateKaufmanAdaptiveMA(closes, efficiencyPeriod, fastPeriod, slowPeriod)
      if (!result) {
        throw new Error(`Insufficient data: need at least ${slowPeriod + efficiencyPeriod} prices, got ${closes.length}`)
      }
      return result
    } catch (error: any) {
      throw new Error(`Kaufman Adaptive MA calculation failed: ${error.message}`)
    }
  }
)

// Register detrended_price_oscillator tool
server.registerTool(
  'detrended_price_oscillator',
  {
    title: 'Detrended Price Oscillator (DPO)',
    description: 'Calculate detrended price oscillator that removes trend from price data to identify cycles and overbought/oversold conditions.',
    inputSchema: z.object({
      prices: z.array(z.number()).min(40).describe('Array of closing prices'),
      period: z.number().int().min(5).max(100).default(20).describe('Period for moving average calculation (default: 20)'),
    }),
    outputSchema: z.object({
      dpo: z.number().describe('Detrended Price Oscillator value'),
      ma: z.number().describe('Moving average used for detrending'),
      cyclePosition: z.enum(['peak', 'trough', 'rising', 'falling', 'neutral']).describe('Current position in cycle'),
      overbought: z.boolean().describe('Whether DPO indicates overbought condition'),
      oversold: z.boolean().describe('Whether DPO indicates oversold condition'),
      zeroCross: z.enum(['bullish', 'bearish', 'none']).describe('Zero line crossover signal'),
      detrendedStrength: z.number().describe('Strength of detrended movement'),
      signal: z.enum(['buy', 'sell', 'neutral']).describe('Trading signal'),
      estimatedCycleLength: z.number().nullable().describe('Estimated cycle length in periods'),
    }),
  },
  async ({ prices, period = 20 }) => {
    try {
      const result = calculateDetrendedPrice(prices, period)
      if (!result) {
        throw new Error(`Insufficient data: need at least ${period * 2} prices, got ${prices.length}`)
      }
      return result
    } catch (error: any) {
      throw new Error(`Detrended Price Oscillator calculation failed: ${error.message}`)
    }
  }
)

// Register relative_vigor_index tool
server.registerTool(
  'relative_vigor_index',
  {
    title: 'Relative Vigor Index (RVI)',
    description: 'Calculate Relative Vigor Index that compares close vs open momentum to identify trend strength and reversals.',
    inputSchema: z.object({
      opens: z.array(z.number()).min(10).describe('Array of opening prices'),
      highs: z.array(z.number()).min(10).describe('Array of high prices'),
      lows: z.array(z.number()).min(10).describe('Array of low prices'),
      closes: z.array(z.number()).min(10).describe('Array of closing prices'),
    }),
    outputSchema: z.object({
      rvi: z.number().describe('Relative Vigor Index value'),
      signal: z.string().nullable().optional().describe('Trading signal (buy/sell/neutral)'),
      trend: z.string().describe('Trend direction'),
      strength: z.number().describe('Signal strength (0-100)'),
      divergence: z.string().nullable().optional().describe('Divergence signal if detected'),
    }),
  },
  async ({ opens, highs, lows, closes }) => {
    try {
      if (opens.length !== highs.length || opens.length !== lows.length || opens.length !== closes.length) {
        throw new Error('All price arrays must have the same length')
      }
      const result = calculateRelativeVigorIndex(opens, highs, lows, closes)
      if (!result) {
        throw new Error(`Insufficient data: need at least 10 price points, got ${opens.length}`)
      }
      return result
    } catch (error: any) {
      throw new Error(`Relative Vigor Index calculation failed: ${error.message}`)
    }
  }
)

// Register gator_oscillator tool
server.registerTool(
  'gator_oscillator',
  {
    title: 'Gator Oscillator',
    description: 'Calculate Gator Oscillator that shows convergence/divergence of Alligator lines and identifies trend strength.',
    inputSchema: z.object({
      closes: z.array(z.number()).min(20).describe('Array of closing prices'),
    }),
    outputSchema: z.object({
      upperHistogram: z.number().describe('Upper histogram (Jaw - Teeth)'),
      lowerHistogram: z.number().describe('Lower histogram (Teeth - Lips)'),
      trend: z.string().describe('Trend direction'),
      strength: z.number().describe('Trend strength (0-100)'),
      convergence: z.boolean().describe('Whether Alligator lines are converging'),
      divergence: z.boolean().describe('Whether Alligator lines are diverging'),
      signal: z.string().describe('Trading signal'),
    }),
  },
  async ({ closes }) => {
    try {
      const result = calculateGatorOscillator(closes)
      if (!result) {
        throw new Error(`Insufficient data: need at least 20 prices, got ${closes.length}`)
      }
      return result
    } catch (error: any) {
      throw new Error(`Gator Oscillator calculation failed: ${error.message}`)
    }
  }
)

// Register elder_ray tool
server.registerTool(
  'elder_ray',
  {
    title: 'Elder-Ray Index',
    description: 'Calculate Elder-Ray Index that measures buying and selling pressure using Bull Power and Bear Power.',
    inputSchema: z.object({
      highs: z.array(z.number()).min(13).describe('Array of high prices'),
      lows: z.array(z.number()).min(13).describe('Array of low prices'),
      closes: z.array(z.number()).min(13).describe('Array of closing prices'),
      period: z.number().int().min(5).max(50).default(13).describe('EMA period (default: 13 as recommended by Elder)'),
    }),
    outputSchema: z.object({
      bullPower: z.number().describe('Bull Power (High - EMA)'),
      bearPower: z.number().describe('Bear Power (Low - EMA)'),
      totalPower: z.number().describe('Total power (Bull + Bear Power)'),
      trend: z.enum(['bullish', 'bearish', 'neutral']).describe('Trend direction based on power balance'),
      powerBalance: z.number().describe('Power balance ratio (Bull Power / |Bear Power|)'),
      strength: z.number().describe('Signal strength (0-100)'),
      bullishDivergence: z.boolean().describe('Bullish divergence detected'),
      bearishDivergence: z.boolean().describe('Bearish divergence detected'),
      pressure: z.enum(['buying', 'selling', 'balanced']).describe('Current market pressure'),
    }),
  },
  async ({ highs, lows, closes, period = 13 }) => {
    try {
      if (highs.length !== lows.length || highs.length !== closes.length) {
        throw new Error('All price arrays must have the same length')
      }
      const result = calculateElderRay(highs, lows, closes, period)
      if (!result) {
        throw new Error(`Insufficient data: need at least ${period} price points, got ${highs.length}`)
      }
      return result
    } catch (error: any) {
      throw new Error(`Elder-Ray Index calculation failed: ${error.message}`)
    }
  }
)

// Register fisher_transform tool
server.registerTool(
  'fisher_transform',
  {
    title: 'Fisher Transform',
    description: 'Calculate Fisher Transform that normalizes price data using Gaussian distribution for sharp reversal signals.',
    inputSchema: z.object({
      highs: z.array(z.number()).min(10).describe('Array of high prices'),
      lows: z.array(z.number()).min(10).describe('Array of low prices'),
      period: z.number().int().min(5).max(50).default(10).describe('Period for highest/lowest calculation (default: 10)'),
      triggerPeriod: z.number().int().min(2).max(20).default(5).describe('Period for trigger line EMA (default: 5)'),
    }),
    outputSchema: z.object({
      fisher: z.number().describe('Fisher Transform value (-5 to +5 range)'),
      trigger: z.number().describe('Trigger line (EMA of Fisher)'),
      trend: z.enum(['bullish', 'bearish', 'neutral']).describe('Current trend direction'),
      strength: z.number().describe('Signal strength (0-100)'),
      overbought: z.boolean().describe('Overbought condition (Fisher > 4.0)'),
      oversold: z.boolean().describe('Oversold condition (Fisher < -4.0)'),
      bullishCrossover: z.boolean().describe('Bullish crossover (Fisher crosses above trigger)'),
      bearishCrossover: z.boolean().describe('Bearish crossover (Fisher crosses below trigger)'),
      bullishReversal: z.boolean().describe('Bullish reversal from oversold'),
      bearishReversal: z.boolean().describe('Bearish reversal from overbought'),
      divergence: z.enum(['bullish', 'bearish', 'none']).describe('Divergence signal'),
    }),
  },
  async ({ highs, lows, period = 10, triggerPeriod = 5 }) => {
    try {
      if (highs.length !== lows.length) {
        throw new Error('Highs and lows arrays must have the same length')
      }
      const result = calculateFisherTransform(highs, lows, period, triggerPeriod)
      if (!result) {
        throw new Error(`Insufficient data: need at least ${period} price points, got ${highs.length}`)
      }
      return result
    } catch (error: any) {
      throw new Error(`Fisher Transform calculation failed: ${error.message}`)
    }
  }
)

// Register know_sure_thing tool
server.registerTool(
  'know_sure_thing',
  {
    title: 'Know Sure Thing (KST)',
    description: 'Calculate Know Sure Thing oscillator that combines multiple timeframe ROC calculations for momentum analysis.',
    inputSchema: z.object({
      prices: z.array(z.number()).min(45).describe('Array of closing prices'),
    }),
    outputSchema: z.object({
      kst: z.number().describe('Know Sure Thing value'),
      signal: z.number().describe('Signal line (9-period MA of KST)'),
      roc1: z.number().describe('ROC1 component (10-period ROC smoothed with 10-period MA)'),
      roc2: z.number().describe('ROC2 component (15-period ROC smoothed with 10-period MA)'),
      roc3: z.number().describe('ROC3 component (20-period ROC smoothed with 10-period MA)'),
      roc4: z.number().describe('ROC4 component (30-period ROC smoothed with 15-period MA)'),
      trend: z.enum(['bullish', 'bearish', 'neutral']).describe('Trend direction'),
      strength: z.number().describe('Signal strength (0-100)'),
      bullishCrossover: z.boolean().describe('Bullish crossover (KST crosses above signal)'),
      bearishCrossover: z.boolean().describe('Bearish crossover (KST crosses below signal)'),
      overbought: z.boolean().describe('Overbought condition (KST > 20)'),
      oversold: z.boolean().describe('Oversold condition (KST < -20)'),
      divergence: z.enum(['bullish', 'bearish', 'none']).describe('Momentum divergence'),
    }),
  },
  async ({ prices }) => {
    try {
      const result = calculateKST(prices)
      if (!result) {
        throw new Error(`Insufficient data: need at least 45 prices, got ${prices.length}`)
      }
      return result
    } catch (error: any) {
      throw new Error(`Know Sure Thing calculation failed: ${error.message}`)
    }
  }
)

// Register chande_momentum_oscillator tool
server.registerTool(
  'chande_momentum_oscillator',
  {
    title: 'Chande Momentum Oscillator',
    description: 'Calculate Chande Momentum Oscillator that measures momentum on both up and down moves with range of -100 to +100.',
    inputSchema: z.object({
      prices: z.array(z.number()).min(15).describe('Array of closing prices'),
      period: z.number().int().min(5).max(50).default(14).describe('Period for calculation (default: 14)'),
    }),
    outputSchema: z.object({
      cmo: z.number().describe('Chande Momentum Oscillator value (-100 to +100)'),
      sumUp: z.number().describe('Sum of up moves over period'),
      sumDown: z.number().describe('Sum of down moves over period'),
      trend: z.enum(['bullish', 'bearish', 'neutral']).describe('Trend direction'),
      overbought: z.boolean().describe('Overbought condition (CMO > 50)'),
      oversold: z.boolean().describe('Oversold condition (CMO < -50)'),
      strength: z.number().describe('Signal strength (0-100)'),
      divergence: z.enum(['bullish', 'bearish', 'none']).describe('Divergence detection'),
      signal: z.enum(['buy', 'sell', 'neutral']).describe('Trading signal'),
    }),
  },
  async ({ prices, period = 14 }) => {
    try {
      const result = calculateChandeMomentum(prices, period)
      if (!result) {
        throw new Error(`Insufficient data: need at least ${period + 1} prices, got ${prices.length}`)
      }
      return result
    } catch (error: any) {
      throw new Error(`Chande Momentum Oscillator calculation failed: ${error.message}`)
    }
  }
)

// Register bull_bear_power tool
server.registerTool(
  'bull_bear_power',
  {
    title: 'Bull Bear Power',
    description: 'Calculate Bull Bear Power that measures the strength of bulls vs bears using price action and volume.',
    inputSchema: z.object({
      highs: z.array(z.number()).min(2).describe('Array of high prices'),
      lows: z.array(z.number()).min(2).describe('Array of low prices'),
      closes: z.array(z.number()).min(2).describe('Array of closing prices'),
      volumes: z.array(z.number()).optional().describe('Array of volume data (optional for confirmation)'),
    }),
    outputSchema: z.object({
      bullPower: z.number().describe('Bull Power percentage'),
      bearPower: z.number().describe('Bear Power percentage'),
      netPower: z.number().describe('Net Power (Bull - Bear Power)'),
      powerRatio: z.number().describe('Power Ratio (Bull / |Bear|)'),
      trend: z.enum(['bullish', 'bearish', 'neutral']).describe('Trend direction'),
      strength: z.number().describe('Strength of dominant force (0-100)'),
      pressure: z.enum(['strong_bull', 'bull', 'balanced', 'bear', 'strong_bear']).describe('Current market pressure'),
      volumeConfirmed: z.boolean().describe('Volume confirmation of price action'),
      signal: z.enum(['buy', 'sell', 'neutral']).describe('Trading signal'),
    }),
  },
  async ({ highs, lows, closes, volumes }) => {
    try {
      if (highs.length !== lows.length || highs.length !== closes.length) {
        throw new Error('Highs, lows, and closes arrays must have the same length')
      }
      if (volumes && volumes.length !== highs.length) {
        throw new Error('Volumes array must have the same length as price arrays')
      }
      const result = calculateBullBearPower(highs, lows, closes, volumes)
      if (!result) {
        throw new Error('Insufficient data: need at least 2 price points')
      }
      return result
    } catch (error: any) {
      throw new Error(`Bull Bear Power calculation failed: ${error.message}`)
    }
  }
)

// Register true_strength_index tool
server.registerTool(
  'true_strength_index',
  {
    title: 'True Strength Index (TSI)',
    description: 'Calculate True Strength Index that uses double-smoothed momentum to reduce noise and provide clearer signals.',
    inputSchema: z.object({
      closes: z.array(z.number()).min(40).describe('Array of closing prices'),
      shortPeriod: z.number().int().min(5).max(50).default(25).describe('Short EMA period (default: 25)'),
      longPeriod: z.number().int().min(5).max(50).default(13).describe('Long EMA period (default: 13)'),
      signalPeriod: z.number().int().min(5).max(30).default(13).describe('Signal line period (default: 13)'),
    }),
    outputSchema: z.object({
      tsi: z.number().describe('True Strength Index value (-100 to +100)'),
      signalLine: z.number().describe('Signal line (EMA of TSI)'),
      priceChange: z.number().describe('Current price change'),
      smoothedMomentum: z.number().describe('Single-smoothed momentum'),
      doubleSmoothedMomentum: z.number().describe('Double-smoothed momentum'),
      trend: z.enum(['bullish', 'bearish', 'neutral']).describe('Trend direction'),
      strength: z.number().describe('Signal strength (0-100)'),
      bullishCrossover: z.boolean().describe('Bullish crossover (TSI crosses above signal)'),
      bearishCrossover: z.boolean().describe('Bearish crossover (TSI crosses below signal)'),
      overbought: z.boolean().describe('Overbought condition (TSI > 25)'),
      oversold: z.boolean().describe('Oversold condition (TSI < -25)'),
      bullishZeroCross: z.boolean().describe('Bullish zero line cross'),
      bearishZeroCross: z.boolean().describe('Bearish zero line cross'),
      tradingSignal: z.enum(['buy', 'sell', 'neutral']).describe('Trading signal'),
      momentumPhase: z.enum(['accelerating', 'decelerating', 'stable']).describe('Momentum phase'),
    }),
  },
  async ({ closes, shortPeriod = 25, longPeriod = 13, signalPeriod = 13 }) => {
    try {
      const result = calculateTrueStrengthIndex(closes, shortPeriod, longPeriod, signalPeriod)
      if (!result) {
        throw new Error(`Insufficient data: need at least ${Math.max(shortPeriod, longPeriod, signalPeriod) * 2} prices, got ${closes.length}`)
      }
      return result
    } catch (error: any) {
      throw new Error(`True Strength Index calculation failed: ${error.message}`)
    }
  }
)

// Register percentage_price_oscillator tool
server.registerTool(
  'percentage_price_oscillator',
  {
    title: 'Percentage Price Oscillator (PPO)',
    description: 'Calculate Percentage Price Oscillator that expresses MACD as a percentage for better cross-asset comparability.',
    inputSchema: z.object({
      closes: z.array(z.number()).min(35).describe('Array of closing prices'),
      fastPeriod: z.number().int().min(5).max(50).default(12).describe('Fast EMA period (default: 12)'),
      slowPeriod: z.number().int().min(10).max(100).default(26).describe('Slow EMA period (default: 26)'),
      signalPeriod: z.number().int().min(5).max(30).default(9).describe('Signal line period (default: 9)'),
    }),
    outputSchema: z.object({
      ppo: z.number().describe('Percentage Price Oscillator value (%)'),
      signalLine: z.number().describe('Signal line (EMA of PPO)'),
      histogram: z.number().describe('PPO histogram (PPO - signal line)'),
      trend: z.enum(['bullish', 'bearish', 'neutral']).describe('Trend direction'),
      strength: z.number().describe('Signal strength (0-100)'),
      bullishCrossover: z.boolean().describe('Bullish crossover (PPO crosses above signal)'),
      bearishCrossover: z.boolean().describe('Bearish crossover (PPO crosses below signal)'),
      bullishZeroCross: z.boolean().describe('Bullish zero line cross'),
      bearishZeroCross: z.boolean().describe('Bearish zero line cross'),
      divergence: z.enum(['bullish', 'bearish', 'none']).describe('Divergence detection'),
      tradingSignal: z.enum(['buy', 'sell', 'neutral']).describe('Trading signal'),
    }),
  },
  async ({ closes, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9 }) => {
    try {
      const result = calculatePercentagePriceOscillator(closes, fastPeriod, slowPeriod, signalPeriod)
      if (!result) {
        throw new Error(`Insufficient data: need at least ${slowPeriod + signalPeriod} prices, got ${closes.length}`)
      }
      return result
    } catch (error: any) {
      throw new Error(`Percentage Price Oscillator calculation failed: ${error.message}`)
    }
  }
)

// Register accelerator_oscillator tool
server.registerTool(
  'accelerator_oscillator',
  {
    title: 'Accelerator Oscillator (AC)',
    description: 'Calculate Accelerator Oscillator from Bill Williams trading system that measures acceleration/deceleration of momentum.',
    inputSchema: z.object({
      highs: z.array(z.number()).min(10).describe('Array of high prices'),
      lows: z.array(z.number()).min(10).describe('Array of low prices'),
      closes: z.array(z.number()).min(10).describe('Array of closing prices'),
    }),
    outputSchema: z.object({
      ac: z.number().describe('Accelerator Oscillator value'),
      trend: z.enum(['bullish', 'bearish', 'neutral']).describe('Trend direction'),
      strength: z.number().describe('Signal strength (0-100)'),
      bullishZeroCross: z.boolean().describe('Bullish zero line cross'),
      bearishZeroCross: z.boolean().describe('Bearish zero line cross'),
      histogramColor: z.enum(['green', 'red', 'gray']).describe('Histogram color for visualization'),
      acceleration: z.enum(['accelerating', 'decelerating', 'neutral']).describe('Acceleration phase'),
      potentialReversal: z.boolean().describe('Potential reversal signal'),
      signal: z.enum(['buy', 'sell', 'neutral']).describe('Trading signal'),
    }),
  },
  async ({ highs, lows, closes }) => {
    try {
      if (highs.length !== lows.length || highs.length !== closes.length) {
        throw new Error('All price arrays must have the same length')
      }
      const result = calculateAcceleratorOscillator(highs, lows, closes)
      if (!result) {
        throw new Error('Insufficient data: need at least 10 price points')
      }
      return result
    } catch (error: any) {
      throw new Error(`Accelerator Oscillator calculation failed: ${error.message}`)
    }
  }
)

// Register schaff_trend_cycle tool
server.registerTool(
  'schaff_trend_cycle',
  {
    title: 'Schaff Trend Cycle (STC)',
    description: 'Calculate Schaff Trend Cycle that combines MACD with Stochastic oscillator and double smoothing for early trend signals.',
    inputSchema: z.object({
      highs: z.array(z.number()).min(80).describe('Array of high prices'),
      lows: z.array(z.number()).min(80).describe('Array of low prices'),
      closes: z.array(z.number()).min(80).describe('Array of closing prices'),
      cycleLength: z.number().int().min(10).max(50).default(23).describe('Cycle length for MACD (default: 23)'),
      fastLength: z.number().int().min(10).max(50).default(23).describe('Fast EMA length (default: 23)'),
      slowLength: z.number().int().min(20).max(100).default(50).describe('Slow EMA length (default: 50)'),
      kPeriod: z.number().int().min(5).max(20).default(10).describe('Stochastic K period (default: 10)'),
      dPeriod: z.number().int().min(2).max(10).default(3).describe('Stochastic D period (default: 3)'),
    }),
    outputSchema: z.object({
      stc: z.number().describe('Schaff Trend Cycle value (0-100)'),
      macd: z.number().describe('MACD component'),
      macdSignal: z.number().describe('MACD signal component'),
      histogram: z.number().describe('MACD histogram'),
      cyclePosition: z.enum(['bottom', 'rising', 'top', 'falling', 'middle']).describe('Cycle position'),
      trend: z.enum(['bullish', 'bearish', 'neutral']).describe('Trend direction'),
      overbought: z.boolean().describe('Overbought condition (STC > 75)'),
      oversold: z.boolean().describe('Oversold condition (STC < 25)'),
      strength: z.number().describe('Signal strength (0-100)'),
      bullishCycleSignal: z.boolean().describe('Bullish cycle signal (STC crosses above 25)'),
      bearishCycleSignal: z.boolean().describe('Bearish cycle signal (STC crosses below 75)'),
      tradingSignal: z.enum(['buy', 'sell', 'neutral']).describe('Trading signal'),
      estimatedCycleLength: z.number().nullable().describe('Estimated cycle length'),
    }),
  },
  async ({ highs, lows, closes, cycleLength = 23, fastLength = 23, slowLength = 50, kPeriod = 10, dPeriod = 3 }) => {
    try {
      if (highs.length !== lows.length || highs.length !== closes.length) {
        throw new Error('All price arrays must have the same length')
      }
      const result = calculateSchaffTrendCycle(highs, lows, closes, cycleLength, fastLength, slowLength, kPeriod, dPeriod)
      if (!result) {
        throw new Error(`Insufficient data: need at least ${slowLength + kPeriod + dPeriod} prices, got ${highs.length}`)
      }
      return result
    } catch (error: any) {
      throw new Error(`Schaff Trend Cycle calculation failed: ${error.message}`)
    }
  }
)

// Register coppock_curve tool
server.registerTool(
  'coppock_curve',
  {
    title: 'Coppock Curve',
    description: 'Calculate Coppock Curve that combines two ROC periods for identifying major market bottoms and long-term momentum.',
    inputSchema: z.object({
      closes: z.array(z.number()).min(35).describe('Array of closing prices'),
      roc1Period: z.number().int().min(10).max(20).default(14).describe('First ROC period (default: 14)'),
      roc2Period: z.number().int().min(8).max(15).default(11).describe('Second ROC period (default: 11)'),
      wmaPeriod: z.number().int().min(5).max(20).default(10).describe('WMA period (default: 10)'),
    }),
    outputSchema: z.object({
      coppock: z.number().describe('Coppock Curve value'),
      roc14: z.number().describe('14-period ROC component'),
      roc11: z.number().describe('11-period ROC component'),
      wma: z.number().describe('WMA of ROC sum'),
      trend: z.enum(['bullish', 'bearish', 'neutral']).describe('Trend direction'),
      strength: z.number().describe('Signal strength (0-100)'),
      bullishSignal: z.boolean().describe('Bullish signal (crosses above 0)'),
      bearishSignal: z.boolean().describe('Bearish signal (crosses below 0)'),
      majorBottomSignal: z.boolean().describe('Major bottom signal detected'),
      marketPhase: z.enum(['recovery', 'expansion', 'contraction', 'crisis']).describe('Market phase assessment'),
      signal: z.enum(['buy', 'sell', 'neutral']).describe('Trading signal'),
    }),
  },
  async ({ closes, roc1Period = 14, roc2Period = 11, wmaPeriod = 10 }) => {
    try {
      const result = calculateCoppockCurve(closes, roc1Period, roc2Period, wmaPeriod)
      if (!result) {
        throw new Error(`Insufficient data: need at least ${Math.max(roc1Period, roc2Period) + wmaPeriod} prices, got ${closes.length}`)
      }
      return result
    } catch (error: any) {
      throw new Error(`Coppock Curve calculation failed: ${error.message}`)
    }
  }
)

// Register klinger_oscillator tool
server.registerTool(
  'klinger_oscillator',
  {
    title: 'Klinger Volume Oscillator',
    description: 'Calculate Klinger Volume Oscillator that combines volume and price action for volume-based trend analysis.',
    inputSchema: z.object({
      highs: z.array(z.number()).min(50).describe('Array of high prices'),
      lows: z.array(z.number()).min(50).describe('Array of low prices'),
      closes: z.array(z.number()).min(50).describe('Array of closing prices'),
      volumes: z.array(z.number()).min(50).describe('Array of volume data'),
      fastPeriod: z.number().int().min(5).max(20).default(13).describe('Fast EMA period (default: 13)'),
      slowPeriod: z.number().int().min(20).max(40).default(34).describe('Slow EMA period (default: 34)'),
      signalPeriod: z.number().int().min(5).max(15).default(13).describe('Signal line period (default: 13)'),
    }),
    outputSchema: z.object({
      kvo: z.number().describe('Klinger Volume Oscillator value'),
      signal: z.number().describe('Signal line'),
      trend: z.string().describe('Trend direction'),
      volumeForce: z.number().describe('Volume force value'),
      divergence: z.string().describe('Divergence signal'),
      signalStrength: z.number().describe('Signal strength (0-100)'),
      tradingSignal: z.string().describe('Trading signal'),
    }),
  },
  async ({ highs, lows, closes, volumes, fastPeriod = 13, slowPeriod = 34, signalPeriod = 13 }) => {
    try {
      if (highs.length !== lows.length || highs.length !== closes.length || highs.length !== volumes.length) {
        throw new Error('All arrays must have the same length')
      }
      const result = calculateKlingerOscillator(highs, lows, closes, volumes)
      if (!result) {
        throw new Error(`Insufficient data: need at least ${Math.max(fastPeriod, slowPeriod, signalPeriod)} prices, got ${highs.length}`)
      }
      return result
    } catch (error: any) {
      throw new Error(`Klinger Oscillator calculation failed: ${error.message}`)
    }
  }
)

// Register volume_oscillator tool
server.registerTool(
  'volume_oscillator',
  {
    title: 'Volume Oscillator',
    description: 'Calculate Volume Oscillator that compares short-term and long-term volume moving averages to identify volume trends.',
    inputSchema: z.object({
      volumes: z.array(z.number()).min(28).describe('Array of volume data'),
      shortPeriod: z.number().int().min(5).max(20).default(14).describe('Short-term MA period (default: 14)'),
      longPeriod: z.number().int().min(20).max(50).default(28).describe('Long-term MA period (default: 28)'),
    }),
    outputSchema: z.object({
      oscillator: z.number().describe('Volume Oscillator value (%)'),
      shortMA: z.number().describe('Short-term volume MA'),
      longMA: z.number().describe('Long-term volume MA'),
      trend: z.enum(['increasing', 'decreasing', 'stable']).describe('Volume trend direction'),
      strength: z.number().describe('Signal strength (0-100)'),
      overbought: z.boolean().describe('Overbought condition (VO > 10%)'),
      oversold: z.boolean().describe('Oversold condition (VO < -10%)'),
      bullishSignal: z.boolean().describe('Bullish signal (VO crosses above 0)'),
      bearishSignal: z.boolean().describe('Bearish signal (VO crosses below 0)'),
      signal: z.enum(['buy', 'sell', 'neutral']).describe('Trading signal'),
      momentum: z.enum(['strong', 'moderate', 'weak']).describe('Volume momentum'),
    }),
  },
  async ({ volumes, shortPeriod = 14, longPeriod = 28 }) => {
    try {
      const result = calculateVolumeOscillator(volumes, shortPeriod, longPeriod)
      if (!result) {
        throw new Error(`Insufficient data: need at least ${longPeriod} volume points, got ${volumes.length}`)
      }
      return result
    } catch (error: any) {
      throw new Error(`Volume Oscillator calculation failed: ${error.message}`)
    }
  }
)

// Register get__ease_of_movement tool
server.registerTool(
  'ease_of_movement',
  {
    title: 'Ease of Movement (EMV)',
    description: 'Calculate Ease of Movement that measures how easily price moves by combining price change and volume.',
    inputSchema: z.object({
      highs: z.array(z.number()).min(15).describe('Array of high prices'),
      lows: z.array(z.number()).min(15).describe('Array of low prices'),
      volumes: z.array(z.number()).min(15).describe('Array of volume data'),
      smoothingPeriod: z.number().int().min(5).max(30).default(14).describe('Period for EMV smoothing (default: 14)'),
    }),
    outputSchema: z.object({
      emv: z.number().describe('Ease of Movement value'),
      smoothedEMV: z.number().describe('Smoothed EMV (MA)'),
      distanceMoved: z.number().describe('Distance moved (midpoint change)'),
      boxRatio: z.number().describe('Box ratio (volume efficiency)'),
      trend: z.enum(['bullish', 'bearish', 'neutral']).describe('Trend direction'),
      strength: z.number().describe('Signal strength (0-100)'),
      bullishSignal: z.boolean().describe('Bullish signal (EMV crosses above 0)'),
      bearishSignal: z.boolean().describe('Bearish signal (EMV crosses below 0)'),
      signal: z.enum(['buy', 'sell', 'neutral']).describe('Trading signal'),
      efficiency: z.enum(['high', 'moderate', 'low']).describe('Movement efficiency'),
    }),
  },
  async ({ highs, lows, volumes, smoothingPeriod = 14 }) => {
    try {
      if (highs.length !== lows.length || highs.length !== volumes.length) {
        throw new Error('All arrays must have the same length')
      }
      const result = calculateEaseOfMovement(highs, lows, volumes, smoothingPeriod)
      if (!result) {
        throw new Error(`Insufficient data: need at least ${smoothingPeriod + 1} data points, got ${highs.length}`)
      }
      return result
    } catch (error: any) {
      throw new Error(`Ease of Movement calculation failed: ${error.message}`)
    }
  }
)

// Register price_volume_trend tool
server.registerTool(
  'price_volume_trend',
  {
    title: 'Price Volume Trend (PVT)',
    description: 'Calculate Price Volume Trend that accumulates volume based on price percentage changes.',
    inputSchema: z.object({
      closes: z.array(z.number()).min(2).describe('Array of closing prices'),
      volumes: z.array(z.number()).min(2).describe('Array of volume data (must match closes length)'),
    }),
    outputSchema: z.object({
      pvt: z.number().describe('Price Volume Trend value'),
      priceChange: z.number().describe('Current price change (%)'),
      volumeTrend: z.enum(['increasing', 'decreasing', 'stable']).describe('Volume trend direction'),
      trend: z.enum(['bullish', 'bearish', 'neutral']).describe('Trend direction'),
      strength: z.number().describe('Signal strength (0-100)'),
      bullishSignal: z.boolean().describe('Bullish signal (PVT crosses above 0)'),
      bearishSignal: z.boolean().describe('Bearish signal (PVT crosses below 0)'),
      signal: z.enum(['buy', 'sell', 'neutral']).describe('Trading signal'),
      momentum: z.enum(['strong', 'moderate', 'weak']).describe('Momentum strength'),
      volumeConfirmed: z.boolean().describe('Volume confirmation of price trend'),
    }),
  },
  async ({ closes, volumes }) => {
    try {
      if (closes.length !== volumes.length) {
        throw new Error('Closes and volumes arrays must have the same length')
      }
      const result = calculatePriceVolumeTrend(closes, volumes)
      if (!result) {
        throw new Error('Insufficient data: need at least 2 data points')
      }
      return result
    } catch (error: any) {
      throw new Error(`Price Volume Trend calculation failed: ${error.message}`)
    }
  }
)

// Register positive_volume_index tool
server.registerTool(
  'positive_volume_index',
  {
    title: 'Positive Volume Index (PVI)',
    description: 'Calculate Positive Volume Index that accumulates price changes on days when volume increases from the previous day.',
    inputSchema: z.object({
      closes: z.array(z.number()).min(2).describe('Array of closing prices'),
      volumes: z.array(z.number()).min(2).describe('Array of volume data (must match closes length)'),
      initialPVI: z.number().min(100).max(10000).default(1000).describe('Initial PVI value (default: 1000)'),
    }),
    outputSchema: z.object({
      pvi: z.number().describe('Positive Volume Index value'),
      volumeChange: z.number().describe('Current volume change (%)'),
      priceChange: z.number().describe('Price change on positive volume day'),
      trend: z.enum(['bullish', 'bearish', 'neutral']).describe('Trend direction'),
      strength: z.number().describe('Signal strength (0-100)'),
      slope: z.number().describe('PVI slope (rate of change)'),
      signal: z.enum(['buy', 'sell', 'neutral']).describe('Trading signal'),
      volumeIncreasing: z.boolean().describe('Volume is increasing from previous period'),
    }),
  },
  async ({ closes, volumes, initialPVI = 1000 }) => {
    try {
      if (closes.length !== volumes.length) {
        throw new Error('Closes and volumes arrays must have the same length')
      }
      const result = calculatePositiveVolumeIndex(closes, volumes, initialPVI)
      if (!result) {
        throw new Error('Insufficient data: need at least 2 data points')
      }
      return result
    } catch (error: any) {
      throw new Error(`Positive Volume Index calculation failed: ${error.message}`)
    }
  }
)

// Register volume_roc tool
server.registerTool(
  'volume_roc',
  {
    title: 'Volume Rate of Change (ROC)',
    description: 'Calculate Volume Rate of Change that measures the percentage change in volume over a specified period.',
    inputSchema: z.object({
      volumes: z.array(z.number()).min(13).describe('Array of volume data'),
      period: z.number().int().min(5).max(50).default(12).describe('Period for ROC calculation (default: 12)'),
    }),
    outputSchema: z.object({
      roc: z.number().describe('Volume ROC value (%)'),
      currentVolume: z.number().describe('Current volume'),
      previousVolume: z.number().describe('Previous volume (n periods ago)'),
      period: z.number().describe('Period used for calculation'),
      trend: z.enum(['increasing', 'decreasing', 'stable']).describe('Volume trend direction'),
      strength: z.number().describe('Signal strength (0-100)'),
      overbought: z.boolean().describe('Overbought condition (ROC > 50%)'),
      oversold: z.boolean().describe('Oversold condition (ROC < -50%)'),
      bullishSignal: z.boolean().describe('Bullish signal (ROC crosses above 0)'),
      bearishSignal: z.boolean().describe('Bearish signal (ROC crosses below 0)'),
      signal: z.enum(['buy', 'sell', 'neutral']).describe('Trading signal'),
      momentum: z.enum(['strong', 'moderate', 'weak']).describe('Volume momentum'),
    }),
  },
  async ({ volumes, period = 12 }) => {
    try {
      const result = calculateVolumeROC(volumes, period)
      if (!result) {
        throw new Error(`Insufficient data: need at least ${period + 1} volume points, got ${volumes.length}`)
      }
      return result
    } catch (error: any) {
      throw new Error(`Volume ROC calculation failed: ${error.message}`)
    }
  }
)

// Register anchored_vwap tool
server.registerTool(
  'anchored_vwap',
  {
    title: 'Anchored VWAP',
    description: 'Calculate Anchored VWAP that computes volume-weighted average price from a specific anchor point instead of session start.',
    inputSchema: z.object({
      highs: z.array(z.number()).min(5).describe('Array of high prices'),
      lows: z.array(z.number()).min(5).describe('Array of low prices'),
      closes: z.array(z.number()).min(5).describe('Array of closing prices'),
      volumes: z.array(z.number()).min(5).describe('Array of volume data'),
      anchorIndex: z.number().int().min(0).describe('Index to anchor VWAP from (0 = start of data)'),
      standardDeviations: z.number().min(0.5).max(3).default(1).describe('Number of SD for bands (default: 1)'),
    }),
    outputSchema: z.object({
      anchoredVWAP: z.number().describe('Anchored VWAP value'),
      anchorPrice: z.number().describe('Price at anchor point'),
      anchorIndex: z.number().describe('Anchor index'),
      priceVsVWAP: z.number().describe('Price vs VWAP (%)'),
      position: z.enum(['above', 'below', 'equal']).describe('Current price position vs VWAP'),
      trend: z.enum(['bullish', 'bearish', 'neutral']).describe('Trend based on position vs VWAP'),
      upperBand: z.number().describe('Upper band (VWAP + n SD)'),
      lowerBand: z.number().describe('Lower band (VWAP - n SD)'),
      bandPosition: z.enum(['above_upper', 'between_bands', 'below_lower', 'at_vwap']).describe('Position relative to bands'),
      strength: z.number().describe('Signal strength (0-100)'),
      signal: z.enum(['buy', 'sell', 'neutral']).describe('Trading signal'),
      institutionalBias: z.enum(['bullish', 'bearish', 'neutral']).describe('Institutional bias assessment'),
    }),
  },
  async ({ highs, lows, closes, volumes, anchorIndex, standardDeviations = 1 }) => {
    try {
      if (highs.length !== lows.length || highs.length !== closes.length || highs.length !== volumes.length) {
        throw new Error('All arrays must have the same length')
      }
      if (anchorIndex >= highs.length) {
        throw new Error(`Anchor index ${anchorIndex} is beyond data length ${highs.length}`)
      }
      const result = calculateAnchoredVWAP(highs, lows, closes, volumes, anchorIndex, standardDeviations)
      if (!result) {
        throw new Error('Insufficient data for Anchored VWAP calculation')
      }
      return result
    } catch (error: any) {
      throw new Error(`Anchored VWAP calculation failed: ${error.message}`)
    }
  }
)

// Register chaikin_money_flow tool
server.registerTool(
  'chaikin_money_flow',
  {
    title: 'Chaikin Money Flow (CMF)',
    description: 'Calculate Chaikin Money Flow that provides volume-weighted measure of accumulation/distribution over a specified period.',
    inputSchema: z.object({
      highs: z.array(z.number()).min(21).describe('Array of high prices'),
      lows: z.array(z.number()).min(21).describe('Array of low prices'),
      closes: z.array(z.number()).min(21).describe('Array of closing prices'),
      volumes: z.array(z.number()).min(21).describe('Array of volume data'),
      period: z.number().int().min(10).max(50).default(21).describe('Period for CMF calculation (default: 21)'),
    }),
    outputSchema: z.object({
      cmf: z.number().nullable().describe('Chaikin Money Flow value'),
      signal: z.enum(['accumulation', 'distribution', 'neutral']).nullable().describe('Money flow signal'),
    }),
  },
  async ({ highs, lows, closes, volumes, period = 21 }) => {
    try {
      if (highs.length !== lows.length || highs.length !== closes.length || highs.length !== volumes.length) {
        throw new Error('All arrays must have the same length')
      }
      const result = calculateChaikinMF(highs, lows, closes, volumes, period)
      return result
    } catch (error: any) {
      throw new Error(`Chaikin Money Flow calculation failed: ${error.message}`)
    }
  }
)

// Register volume_zone_oscillator tool
server.registerTool(
  'volume_zone_oscillator',
  {
    title: 'Volume Zone Oscillator',
    description: 'Calculate Volume Zone Oscillator that analyzes volume distribution across price zones to identify accumulation/distribution patterns.',
    inputSchema: z.object({
      closes: z.array(z.number()).min(15).describe('Array of closing prices'),
      volumes: z.array(z.number()).min(15).describe('Array of volume data (must match closes length)'),
      period: z.number().int().min(10).max(30).default(14).describe('Period for volume flow calculation (default: 14)'),
    }),
    outputSchema: z.object({
      vzo: z.number().describe('Volume Zone Oscillator value'),
      volumeFlow: z.number().describe('Volume flow direction'),
      buyingPressure: z.number().describe('Buying pressure'),
      sellingPressure: z.number().describe('Selling pressure'),
      trend: z.enum(['accumulation', 'distribution', 'neutral']).describe('Volume trend direction'),
      strength: z.number().describe('Signal strength (0-100)'),
      overbought: z.boolean().describe('Overbought condition (VZO > 60)'),
      oversold: z.boolean().describe('Oversold condition (VZO < -60)'),
      bullishSignal: z.boolean().describe('Bullish signal (VZO crosses above 0)'),
      bearishSignal: z.boolean().describe('Bearish signal (VZO crosses below 0)'),
      accumulationZone: z.boolean().describe('Price in accumulation zone'),
      distributionZone: z.boolean().describe('Price in distribution zone'),
      signal: z.enum(['buy', 'sell', 'neutral']).describe('Trading signal'),
      marketCondition: z.enum(['bullish', 'bearish', 'sideways']).describe('Market condition assessment'),
    }),
  },
  async ({ closes, volumes, period = 14 }) => {
    try {
      if (closes.length !== volumes.length) {
        throw new Error('Closes and volumes arrays must have the same length')
      }
      const result = calculateVolumeZoneOscillator(closes, volumes, period)
      if (!result) {
        throw new Error(`Insufficient data: need at least ${period + 1} data points, got ${closes.length}`)
      }
      return result
    } catch (error: any) {
      throw new Error(`Volume Zone Oscillator calculation failed: ${error.message}`)
    }
  }
)

// Register chaikin_volatility tool
server.registerTool(
  'chaikin_volatility',
  {
    title: 'Chaikin Volatility',
    description: 'Calculate Chaikin Volatility that measures the rate of change of the trading range over a specified period.',
    inputSchema: z.object({
      highs: z.array(z.number()).min(15).describe('Array of high prices'),
      lows: z.array(z.number()).min(15).describe('Array of low prices'),
      period: z.number().int().min(5).max(30).default(10).describe('Period for volatility calculation (default: 10)'),
      rocPeriod: z.number().int().min(5).max(20).default(12).describe('Period for ROC calculation (default: 12)'),
    }),
    outputSchema: z.object({
      volatility: z.number().describe('Chaikin Volatility value'),
      currentRange: z.number().describe('Current trading range'),
      rocValue: z.number().describe('Rate of change of range'),
      trend: z.string().describe('Volatility trend'),
      signal: z.string().describe('Volatility signal'),
      strength: z.number().describe('Signal strength (0-100)'),
    }),
  },
  async ({ highs, lows, period = 10, rocPeriod = 12 }) => {
    try {
      if (highs.length !== lows.length) {
        throw new Error('Highs and lows arrays must have the same length')
      }
      const result = calculateChaikinVolatility(highs, lows, period, rocPeriod)
      if (!result) {
        throw new Error(`Insufficient data: need at least ${period + rocPeriod} price points, got ${highs.length}`)
      }
      return result
    } catch (error: any) {
      throw new Error(`Chaikin Volatility calculation failed: ${error.message}`)
    }
  }
)

// Register mass_index tool
server.registerTool(
  'mass_index',
  {
    title: 'Mass Index',
    description: 'Calculate Mass Index that uses EMA of High-Low range to identify potential reversals when the index exceeds 27.',
    inputSchema: z.object({
      highs: z.array(z.number()).min(35).describe('Array of high prices'),
      lows: z.array(z.number()).min(35).describe('Array of low prices'),
      emaPeriod: z.number().int().min(5).max(15).default(9).describe('EMA period for range calculation (default: 9)'),
      sumPeriod: z.number().int().min(15).max(35).default(25).describe('Period for summing EMA ratios (default: 25)'),
    }),
    outputSchema: z.object({
      massIndex: z.number().describe('Mass Index value'),
      singleEMA: z.number().describe('Single EMA of range'),
      doubleEMA: z.number().describe('Double EMA of range'),
      currentRange: z.number().describe('Current High-Low range'),
      emaRatio: z.number().describe('Ratio of single to double EMA'),
      reversalSignal: z.boolean().describe('Reversal signal (Mass Index > 27)'),
      overbought: z.boolean().describe('Overbought level (Mass Index > 27)'),
      trend: z.enum(['rising', 'falling', 'stable']).describe('Trend direction'),
      strength: z.number().describe('Signal strength (0-100)'),
      signal: z.enum(['buy', 'sell', 'neutral']).describe('Trading signal'),
      reversalProbability: z.enum(['high', 'moderate', 'low']).describe('Reversal probability'),
    }),
  },
  async ({ highs, lows, emaPeriod = 9, sumPeriod = 25 }) => {
    try {
      if (highs.length !== lows.length) {
        throw new Error('Highs and lows arrays must have the same length')
      }
      const result = calculateMassIndex(highs, lows, emaPeriod, sumPeriod)
      if (!result) {
        throw new Error(`Insufficient data: need at least ${sumPeriod + emaPeriod} price points, got ${highs.length}`)
      }
      return result
    } catch (error: any) {
      throw new Error(`Mass Index calculation failed: ${error.message}`)
    }
  }
)

// Register ulcer_index tool
server.registerTool(
  'ulcer_index',
  {
    title: 'Ulcer Index',
    description: 'Calculate Ulcer Index that measures downside volatility and risk by focusing on drawdowns from recent highs.',
    inputSchema: z.object({
      closes: z.array(z.number()).min(14).describe('Array of closing prices'),
      period: z.number().int().min(5).max(50).default(14).describe('Period for calculation (default: 14)'),
    }),
    outputSchema: z.object({
      ulcerIndex: z.number().describe('Ulcer Index value'),
      currentDrawdown: z.number().describe('Current drawdown (%)'),
      maxDrawdown: z.number().describe('Maximum drawdown in period (%)'),
      period: z.number().describe('Number of periods analyzed'),
      riskLevel: z.enum(['low', 'moderate', 'high', 'extreme']).describe('Risk level assessment'),
      trend: z.enum(['improving', 'deteriorating', 'stable']).describe('Trend direction'),
      strength: z.number().describe('Signal strength (0-100)'),
      riskAdjustedReturn: z.number().nullable().describe('Risk-adjusted return potential'),
      signal: z.enum(['buy', 'sell', 'neutral']).describe('Trading signal based on risk levels'),
      marketStress: z.enum(['low', 'moderate', 'high', 'crisis']).describe('Market stress indicator'),
    }),
  },
  async ({ closes, period = 14 }) => {
    try {
      const result = calculateUlcerIndex(closes, period)
      if (!result) {
        throw new Error(`Insufficient data: need at least ${period} prices, got ${closes.length}`)
      }
      return result
    } catch (error: any) {
      throw new Error(`Ulcer Index calculation failed: ${error.message}`)
    }
  }
)

// Register bollinger_percent_b tool
server.registerTool(
  'bollinger_percent_b',
  {
    title: 'Bollinger %B Indicator',
    description: 'Calculate Bollinger %B that shows where the price is relative to the Bollinger Bands.',
    inputSchema: z.object({
      closes: z.array(z.number()).min(20).describe('Array of closing prices'),
      period: z.number().int().min(1).max(50).default(20).describe('Period for Bollinger Bands calculation (default: 20)'),
      stdDev: z.number().min(0.1).max(3).default(2).describe('Standard deviation multiplier (default: 2)'),
    }),
    outputSchema: z.object({
      percentB: z.number().nullable().describe('Bollinger %B value (0-1 range)'),
      position: z.string().nullable().describe('Price position relative to bands'),
      signal: z.string().nullable().describe('Trading signal based on %B'),
    }),
  },
  async ({ closes, period = 20, stdDev = 2 }) => {
    try {
      const result = calculateBBPercentB(closes, period, stdDev)
      return result
    } catch (error: any) {
      throw new Error(`Bollinger %B calculation failed: ${error.message}`)
    }
  }
)

// Register bollinger_band_width tool
server.registerTool(
  'bollinger_band_width',
  {
    title: 'Bollinger Band Width',
    description: 'Calculate Bollinger Band Width that measures the distance between the upper and lower bands.',
    inputSchema: z.object({
      closes: z.array(z.number()).min(20).describe('Array of closing prices'),
      period: z.number().int().min(1).max(50).default(20).describe('Period for calculation (default: 20)'),
      stdDev: z.number().min(0.1).max(3).default(2).describe('Standard deviation multiplier (default: 2)'),
    }),
    outputSchema: z.object({
      bandwidth: z.number().nullable().describe('Bollinger Band Width'),
      trend: z.string().nullable().describe('Bandwidth trend'),
      volatility: z.string().nullable().describe('Volatility assessment'),
      signal: z.string().nullable().describe('Trading signal based on bandwidth'),
    }),
  },
  async ({ closes, period = 20, stdDev = 2 }) => {
    try {
      const result = calculateBBWidth(closes, period, stdDev)
      return result
    } catch (error: any) {
      throw new Error(`Bollinger Band Width calculation failed: ${error.message}`)
    }
  }
)

// Register historical_volatility tool
server.registerTool(
  'historical_volatility',
  {
    title: 'Historical Volatility',
    description: 'Calculate Historical Volatility that measures the standard deviation of price changes over a specified period.',
    inputSchema: z.object({
      closes: z.array(z.number()).min(30).describe('Array of closing prices'),
      period: z.number().int().min(10).max(100).default(20).describe('Period for volatility calculation (default: 20)'),
      annualizationFactor: z.number().min(1).max(365).default(365).describe('Annualization factor (default: 365 for daily data)'),
    }),
    outputSchema: z.object({
      volatility: z.number().describe('Historical volatility value'),
      annualizedVolatility: z.number().describe('Annualized volatility (%)'),
      dailyVolatility: z.number().describe('Daily volatility (%)'),
      trend: z.string().describe('Volatility trend'),
      riskLevel: z.string().describe('Risk level assessment'),
      signal: z.string().describe('Trading signal based on volatility'),
    }),
  },
  async ({ closes, period = 20, annualizationFactor = 365 }) => {
    try {
      const result = calculateHistoricalVolatility(closes, period, annualizationFactor)
      if (!result) {
        throw new Error(`Insufficient data: need at least ${period + 1} prices, got ${closes.length}`)
      }
      return result
    } catch (error: any) {
      throw new Error(`Historical Volatility calculation failed: ${error.message}`)
    }
  }
)

// Register trix tool
server.registerTool(
  'trix',
  {
    title: 'TRIX Indicator',
    description: 'Calculate TRIX (Triple Exponential Average) oscillator that shows the rate of change of a triple exponentially smoothed moving average.',
    inputSchema: z.object({
      closes: z.array(z.number()).min(30).describe('Array of closing prices'),
      period: z.number().int().min(5).max(50).default(15).describe('Period for TRIX calculation (default: 15)'),
      signalPeriod: z.number().int().min(3).max(20).default(9).describe('Signal line period (default: 9)'),
    }),
    outputSchema: z.object({
      trix: z.number().describe('TRIX value'),
      signalLine: z.number().describe('TRIX signal line'),
      trend: z.string().describe('Trend direction'),
      strength: z.number().describe('Signal strength (0-100)'),
      bullishSignal: z.boolean().describe('Bullish crossover signal'),
      bearishSignal: z.boolean().describe('Bearish crossover signal'),
      overbought: z.boolean().describe('Overbought condition'),
      oversold: z.boolean().describe('Oversold condition'),
      signal: z.string().describe('Trading signal'),
    }),
  },
  async ({ closes, period = 15, signalPeriod = 9 }) => {
    try {
      const result = calculateTRIX(closes, period, signalPeriod)
      if (!result) {
        throw new Error(`Insufficient data: need at least ${period * 3 + signalPeriod} prices, got ${closes.length}`)
      }
      return result
    } catch (error: any) {
      throw new Error(`TRIX calculation failed: ${error.message}`)
    }
  }
)

// Register vortex tool
server.registerTool(
  'vortex',
  {
    title: 'Vortex Indicator',
    description: 'Calculate Vortex Indicator that identifies the start of a new trend by comparing upward and downward price movements.',
    inputSchema: z.object({
      highs: z.array(z.number()).min(15).describe('Array of high prices'),
      lows: z.array(z.number()).min(15).describe('Array of low prices'),
      closes: z.array(z.number()).min(15).describe('Array of closing prices'),
      period: z.number().int().min(2).max(50).default(14).describe('Period for Vortex calculation (default: 14)'),
    }),
    outputSchema: z.object({
      vortexPositive: z.number().describe('VI+ (upward trend strength)'),
      vortexNegative: z.number().describe('VI- (downward trend strength)'),
      trend: z.string().describe('Dominant trend direction'),
      strength: z.number().describe('Trend strength (0-100)'),
      bullishSignal: z.boolean().describe('Bullish trend signal'),
      bearishSignal: z.boolean().describe('Bearish trend signal'),
      signal: z.string().describe('Trading signal'),
    }),
  },
  async ({ highs, lows, closes, period = 14 }) => {
    try {
      if (highs.length !== lows.length || highs.length !== closes.length) {
        throw new Error('All price arrays must have the same length')
      }
      const result = calculateVortex(highs, lows, closes, period)
      if (!result) {
        throw new Error(`Insufficient data: need at least ${period + 1} price points, got ${highs.length}`)
      }
      return result
    } catch (error: any) {
      throw new Error(`Vortex calculation failed: ${error.message}`)
    }
  }
)

// Register center_of_gravity tool
server.registerTool(
  'center_of_gravity',
  {
    title: 'Center of Gravity (COG)',
    description: 'Calculate Center of Gravity oscillator that identifies potential reversal points based on weighted moving averages.',
    inputSchema: z.object({
      closes: z.array(z.number()).min(10).describe('Array of closing prices'),
      period: z.number().int().min(3).max(20).default(10).describe('Period for COG calculation (default: 10)'),
    }),
    outputSchema: z.object({
      cog: z.number().describe('Center of Gravity value'),
      trend: z.string().describe('Trend direction'),
      strength: z.number().describe('Signal strength (0-100)'),
      bullishSignal: z.boolean().describe('Bullish reversal signal'),
      bearishSignal: z.boolean().describe('Bearish reversal signal'),
      overbought: z.boolean().describe('Overbought condition'),
      oversold: z.boolean().describe('Oversold condition'),
      signal: z.string().describe('Trading signal'),
    }),
  },
  async ({ closes, period = 10 }) => {
    try {
      const result = calculateCOG(closes, period)
      if (!result) {
        throw new Error(`Insufficient data: need at least ${period} prices, got ${closes.length}`)
      }
      return result
    } catch (error: any) {
      throw new Error(`Center of Gravity calculation failed: ${error.message}`)
    }
  }
)

// Register chaikin_oscillator tool
server.registerTool(
  'chaikin_oscillator',
  {
    title: 'Chaikin Oscillator',
    description: 'Calculate Chaikin Oscillator that combines accumulation/distribution with exponential moving averages.',
    inputSchema: z.object({
      highs: z.array(z.number()).min(25).describe('Array of high prices'),
      lows: z.array(z.number()).min(25).describe('Array of low prices'),
      closes: z.array(z.number()).min(25).describe('Array of closing prices'),
      volumes: z.array(z.number()).min(25).describe('Array of volume data'),
      fastPeriod: z.number().int().min(3).max(20).default(3).describe('Fast EMA period (default: 3)'),
      slowPeriod: z.number().int().min(10).max(30).default(10).describe('Slow EMA period (default: 10)'),
    }),
    outputSchema: z.object({
      oscillator: z.number().describe('Chaikin Oscillator value'),
      fastEMA: z.number().describe('Fast EMA of accumulation/distribution'),
      slowEMA: z.number().describe('Slow EMA of accumulation/distribution'),
      trend: z.string().describe('Trend direction'),
      strength: z.number().describe('Signal strength (0-100)'),
      bullishSignal: z.boolean().describe('Bullish divergence signal'),
      bearishSignal: z.boolean().describe('Bearish divergence signal'),
      signal: z.string().describe('Trading signal'),
    }),
  },
  async ({ highs, lows, closes, volumes, fastPeriod = 3, slowPeriod = 10 }) => {
    try {
      if (highs.length !== lows.length || highs.length !== closes.length || highs.length !== volumes.length) {
        throw new Error('All arrays must have the same length')
      }
      const result = calculateChaikinOscillator(highs, lows, closes, volumes, fastPeriod, slowPeriod)
      if (!result) {
        throw new Error(`Insufficient data: need at least ${slowPeriod} price points, got ${highs.length}`)
      }
      return result
    } catch (error: any) {
      throw new Error(`Chaikin Oscillator calculation failed: ${error.message}`)
    }
  }
)

// Register stochastic_rsi tool
server.registerTool(
  'stochastic_rsi',
  {
    title: 'Stochastic RSI',
    description: 'Calculate Stochastic RSI that applies stochastic oscillator formula to RSI values.',
    inputSchema: z.object({
      closes: z.array(z.number()).min(20).describe('Array of closing prices'),
      rsiPeriod: z.number().int().min(5).max(30).default(14).describe('RSI period (default: 14)'),
      stochPeriod: z.number().int().min(5).max(20).default(14).describe('Stochastic period (default: 14)'),
      kPeriod: z.number().int().min(3).max(10).default(3).describe('K smoothing period (default: 3)'),
      dPeriod: z.number().int().min(3).max(10).default(3).describe('D smoothing period (default: 3)'),
    }),
    outputSchema: z.object({
      stochRSI: z.number().describe('Stochastic RSI %K value'),
      signalLine: z.number().describe('Stochastic RSI %D value'),
      rsi: z.number().describe('Underlying RSI value'),
      trend: z.string().describe('Trend direction'),
      strength: z.number().describe('Signal strength (0-100)'),
      overbought: z.boolean().describe('Overbought condition (>80)'),
      oversold: z.boolean().describe('Oversold condition (<20)'),
      bullishSignal: z.boolean().describe('Bullish crossover signal'),
      bearishSignal: z.boolean().describe('Bearish crossover signal'),
      signal: z.string().describe('Trading signal'),
    }),
  },
  async ({ closes, rsiPeriod = 14, stochPeriod = 14, kPeriod = 3, dPeriod = 3 }) => {
    try {
      const result = calculateStochasticRSI(closes, rsiPeriod, stochPeriod, kPeriod)
      if (!result) {
        throw new Error(`Insufficient data: need at least ${rsiPeriod + stochPeriod + Math.max(kPeriod, dPeriod)} prices, got ${closes.length}`)
      }
      return result
    } catch (error: any) {
      throw new Error(`Stochastic RSI calculation failed: ${error.message}`)
    }
  }
)

// Register money_flow_index tool
server.registerTool(
  'money_flow_index',
  {
    title: 'Money Flow Index (MFI)',
    description: 'Calculate Money Flow Index that uses price and volume to measure buying and selling pressure.',
    inputSchema: z.object({
      highs: z.array(z.number()).min(15).describe('Array of high prices'),
      lows: z.array(z.number()).min(15).describe('Array of low prices'),
      closes: z.array(z.number()).min(15).describe('Array of closing prices'),
      volumes: z.array(z.number()).min(15).describe('Array of volume data'),
      period: z.number().int().min(2).max(50).default(14).describe('Period for MFI calculation (default: 14)'),
    }),
    outputSchema: z.object({
      mfi: z.number().describe('Money Flow Index value (0-100)'),
      positiveMoneyFlow: z.number().describe('Positive money flow'),
      negativeMoneyFlow: z.number().describe('Negative money flow'),
      moneyFlowRatio: z.number().describe('Money flow ratio'),
      trend: z.string().describe('Trend direction'),
      strength: z.number().describe('Signal strength (0-100)'),
      overbought: z.boolean().describe('Overbought condition (>80)'),
      oversold: z.boolean().describe('Oversold condition (<20)'),
      bullishSignal: z.boolean().describe('Bullish signal'),
      bearishSignal: z.boolean().describe('Bearish signal'),
      signal: z.string().describe('Trading signal'),
    }),
  },
  async ({ highs, lows, closes, volumes, period = 14 }) => {
    try {
      if (highs.length !== lows.length || highs.length !== closes.length || highs.length !== volumes.length) {
        throw new Error('All arrays must have the same length')
      }
      const result = calculateMFI(highs, lows, closes, volumes, period)
      if (!result) {
        throw new Error(`Insufficient data: need at least ${period + 1} data points, got ${highs.length}`)
      }
      return result
    } catch (error: any) {
      throw new Error(`Money Flow Index calculation failed: ${error.message}`)
    }
  }
)

// Register ultimate_oscillator tool
server.registerTool(
  'ultimate_oscillator',
  {
    title: 'Ultimate Oscillator',
    description: 'Calculate Ultimate Oscillator that combines three different timeframes to reduce false signals.',
    inputSchema: z.object({
      highs: z.array(z.number()).min(30).describe('Array of high prices'),
      lows: z.array(z.number()).min(30).describe('Array of low prices'),
      closes: z.array(z.number()).min(30).describe('Array of closing prices'),
      shortPeriod: z.number().int().min(5).max(15).default(7).describe('Short period (default: 7)'),
      mediumPeriod: z.number().int().min(10).max(20).default(14).describe('Medium period (default: 14)'),
      longPeriod: z.number().int().min(20).max(30).default(28).describe('Long period (default: 28)'),
    }),
    outputSchema: z.object({
      ultimateOscillator: z.number().describe('Ultimate Oscillator value (0-100)'),
      shortBP: z.number().describe('Short-term buying pressure'),
      mediumBP: z.number().describe('Medium-term buying pressure'),
      longBP: z.number().describe('Long-term buying pressure'),
      trend: z.string().describe('Trend direction'),
      strength: z.number().describe('Signal strength (0-100)'),
      overbought: z.boolean().describe('Overbought condition (>70)'),
      oversold: z.boolean().describe('Oversold condition (<30)'),
      bullishSignal: z.boolean().describe('Bullish divergence signal'),
      bearishSignal: z.boolean().describe('Bearish divergence signal'),
      signal: z.string().describe('Trading signal'),
    }),
  },
  async ({ highs, lows, closes, shortPeriod = 7, mediumPeriod = 14, longPeriod = 28 }) => {
    try {
      if (highs.length !== lows.length || highs.length !== closes.length) {
        throw new Error('All price arrays must have the same length')
      }
      const result = calculateUltimateOscillator(highs, lows, closes, shortPeriod, mediumPeriod, longPeriod)
      if (!result) {
        throw new Error(`Insufficient data: need at least ${longPeriod + 1} data points, got ${highs.length}`)
      }
      return result
    } catch (error: any) {
      throw new Error(`Ultimate Oscillator calculation failed: ${error.message}`)
    }
  }
)

// Register balance_of_power tool
server.registerTool(
  'balance_of_power',
  {
    title: 'Balance of Power',
    description: 'Calculate Balance of Power that measures the strength of buyers vs sellers by analyzing the relationship between price close and range.',
    inputSchema: z.object({
      opens: z.array(z.number()).min(5).describe('Array of opening prices'),
      highs: z.array(z.number()).min(5).describe('Array of high prices'),
      lows: z.array(z.number()).min(5).describe('Array of low prices'),
      closes: z.array(z.number()).min(5).describe('Array of closing prices'),
    }),
    outputSchema: z.object({
      bop: z.number().describe('Balance of Power value'),
      trend: z.string().describe('Trend direction'),
      strength: z.number().describe('Signal strength (0-100)'),
      bullishPressure: z.boolean().describe('Bullish pressure dominant'),
      bearishPressure: z.boolean().describe('Bearish pressure dominant'),
      signal: z.string().describe('Trading signal'),
    }),
  },
  async ({ opens, highs, lows, closes }) => {
    try {
      if (opens.length !== highs.length || opens.length !== lows.length || opens.length !== closes.length) {
        throw new Error('All price arrays must have the same length')
      }
      const result = calculateBOP(opens, highs, lows, closes)
      if (!result) {
        throw new Error('Insufficient data: need at least 5 price points')
      }
      return result
    } catch (error: any) {
      throw new Error(`Balance of Power calculation failed: ${error.message}`)
    }
  }
)

// Register advance_decline_line tool
server.registerTool(
  'advance_decline_line',
  {
    title: 'Advance Decline Line',
    description: 'Calculate Advance Decline Line that measures market breadth by comparing advancing vs declining assets.',
    inputSchema: z.object({
      advances: z.array(z.number()).min(5).describe('Array of advancing asset counts'),
      declines: z.array(z.number()).min(5).describe('Array of declining asset counts'),
    }),
    outputSchema: z.object({
      adl: z.number().describe('Advance Decline Line value'),
      netAdvances: z.number().describe('Net advances (advances - declines)'),
      breadthRatio: z.number().describe('Breadth ratio (advances/declines)'),
      trend: z.string().describe('Market breadth trend'),
      strength: z.number().describe('Breadth strength (0-100)'),
      bullishBreadth: z.boolean().describe('Bullish breadth signal'),
      bearishBreadth: z.boolean().describe('Bearish breadth signal'),
      signal: z.string().describe('Market breadth signal'),
    }),
  },
  async ({ advances, declines }) => {
    try {
      if (advances.length !== declines.length) {
        throw new Error('Advances and declines arrays must have the same length')
      }
      const result = calculateAdvanceDeclineLine(advances, declines)
      if (!result) {
        throw new Error('Insufficient data: need at least 5 data points')
      }
      return result
    } catch (error: any) {
      throw new Error(`Advance Decline Line calculation failed: ${error.message}`)
    }
  }
)

// Register fractals tool
server.registerTool(
  'fractals',
  {
    title: 'Bill Williams Fractals',
    description: 'Calculate Bill Williams Fractals that identify potential reversal points in price action.',
    inputSchema: z.object({
      highs: z.array(z.number()).min(5).describe('Array of high prices'),
      lows: z.array(z.number()).min(5).describe('Array of low prices'),
    }),
    outputSchema: z.object({
      bullishFractal: z.boolean().describe('Bullish fractal detected'),
      bearishFractal: z.boolean().describe('Bearish fractal detected'),
      fractalHigh: z.number().nullable().describe('Fractal resistance level'),
      fractalLow: z.number().nullable().describe('Fractal support level'),
      signal: z.string().describe('Fractal signal'),
      strength: z.number().describe('Signal strength (0-100)'),
    }),
  },
  async ({ highs, lows }) => {
    try {
      if (highs.length !== lows.length) {
        throw new Error('Highs and lows arrays must have the same length')
      }
      const result = calculateFractals(highs, lows)
      if (!result) {
        throw new Error('Insufficient data: need at least 5 price points')
      }
      return result
    } catch (error: any) {
      throw new Error(`Fractals calculation failed: ${error.message}`)
    }
  }
)

// Register zigzag_indicator tool
server.registerTool(
  'zigzag_indicator',
  {
    title: 'ZigZag Indicator',
    description: 'Calculate ZigZag indicator that filters out market noise and shows significant price swings.',
    inputSchema: z.object({
      closes: z.array(z.number()).min(10).describe('Array of closing prices'),
      deviation: z.number().min(0.1).max(10).default(5).describe('Minimum price deviation percentage (default: 5%)'),
    }),
    outputSchema: z.object({
      zigzag: z.array(z.number()).describe('ZigZag filtered prices'),
      direction: z.string().describe('Current trend direction'),
      swingPoints: z.array(z.number()).describe('Significant swing points'),
      lastSwing: z.string().describe('Last swing type (high/low)'),
      trend: z.string().describe('Overall trend'),
      signal: z.string().describe('Trading signal based on swings'),
    }),
  },
  async ({ closes, deviation = 5 }) => {
    try {
      const result = calculateZigZag(closes, deviation)
      if (!result) {
        throw new Error('Insufficient data: need at least 10 price points')
      }
      return result
    } catch (error: any) {
      throw new Error(`ZigZag calculation failed: ${error.message}`)
    }
  }
)

// Register trend_detection tool
server.registerTool(
  'trend_detection',
  {
    title: 'Trend Detection & Change of Character',
    description: 'Detect market trends and change of character points using advanced market structure analysis.',
    inputSchema: z.object({
      historicalData: z.array(z.object({
        time: z.number(),
        open: z.number(),
        high: z.number(),
        low: z.number(),
        close: z.number(),
        volume: z.number(),
      })).min(20).describe('Array of historical price data'),
      currentPrice: z.number().describe('Current price for analysis'),
    }),
    outputSchema: z.object({
      structure: z.string().describe('Market structure type'),
      coc: z.boolean().describe('Change of character detected'),
      lastSwingHigh: z.number().nullable().describe('Last significant swing high'),
      lastSwingLow: z.number().nullable().describe('Last significant swing low'),
      structureStrength: z.number().describe('Structure strength (0-100)'),
      reversalSignal: z.boolean().describe('Potential reversal signal'),
      swingHighs: z.array(z.number()).describe('Recent swing highs'),
      swingLows: z.array(z.number()).describe('Recent swing lows'),
      timestamp: z.number().describe('Analysis timestamp'),
    }),
  },
  async ({ historicalData, currentPrice }) => {
    try {
      const result = detectChangeOfCharacter(historicalData, currentPrice)
      return result
    } catch (error: any) {
      throw new Error(`Trend Detection calculation failed: ${error.message}`)
    }
  }
)

// Register hull_moving_average tool
server.registerTool(
  'hull_moving_average',
  {
    title: 'Hull Moving Average (HMA)',
    description: 'Calculate Hull Moving Average that reduces lag while maintaining smoothness for better trend identification.',
    inputSchema: z.object({
      prices: z.array(z.number()).min(10).describe('Array of price data'),
      period: z.number().int().min(2).max(50).default(16).describe('Period for HMA calculation (default: 16)'),
    }),
    outputSchema: z.object({
      hma: z.number().describe('Hull Moving Average value'),
      trend: z.string().describe('Trend direction'),
      strength: z.number().describe('Signal strength (0-100)'),
      signal: z.string().describe('Trading signal'),
    }),
  },
  async ({ prices, period = 16 }) => {
    try {
      const result = calculateHMA(prices, period)
      if (!result) {
        throw new Error(`Insufficient data: need at least ${period} prices, got ${prices.length}`)
      }
      return result
    } catch (error: any) {
      throw new Error(`Hull Moving Average calculation failed: ${error.message}`)
    }
  }
)

// Register weighted_moving_average tool
server.registerTool(
  'weighted_moving_average',
  {
    title: 'Weighted Moving Average (WMA)',
    description: 'Calculate Weighted Moving Average that gives more weight to recent prices for responsive trend analysis.',
    inputSchema: z.object({
      prices: z.array(z.number()).min(5).describe('Array of price data'),
      period: z.number().int().min(2).max(50).default(14).describe('Period for WMA calculation (default: 14)'),
    }),
    outputSchema: z.object({
      wma: z.number().describe('Weighted Moving Average value'),
      trend: z.string().describe('Trend direction'),
      strength: z.number().describe('Signal strength (0-100)'),
      signal: z.string().describe('Trading signal'),
    }),
  },
  async ({ prices, period = 14 }) => {
    try {
      const result = calculateWMA(prices, period)
      if (!result) {
        throw new Error(`Insufficient data: need at least ${period} prices, got ${prices.length}`)
      }
      return result
    } catch (error: any) {
      throw new Error(`Weighted Moving Average calculation failed: ${error.message}`)
    }
  }
)

// Register smoothed_moving_average tool
server.registerTool(
  'smoothed_moving_average',
  {
    title: 'Smoothed Moving Average (SMMA)',
    description: 'Calculate Smoothed Moving Average that provides smooth trend following with reduced noise.',
    inputSchema: z.object({
      prices: z.array(z.number()).min(5).describe('Array of price data'),
      period: z.number().int().min(2).max(50).default(14).describe('Period for SMMA calculation (default: 14)'),
    }),
    outputSchema: z.object({
      smma: z.number().describe('Smoothed Moving Average value'),
      trend: z.string().describe('Trend direction'),
      strength: z.number().describe('Signal strength (0-100)'),
      signal: z.string().describe('Trading signal'),
    }),
  },
  async ({ prices, period = 14 }) => {
    try {
      const result = calculateSMMA(prices, period)
      if (!result) {
        throw new Error(`Insufficient data: need at least ${period} prices, got ${prices.length}`)
      }
      return result
    } catch (error: any) {
      throw new Error(`Smoothed Moving Average calculation failed: ${error.message}`)
    }
  }
)

// Register double_exponential_moving_average tool
server.registerTool(
  'double_exponential_moving_average',
  {
    title: 'Double Exponential Moving Average (DEMA)',
    description: 'Calculate Double Exponential Moving Average that reduces lag compared to traditional EMA.',
    inputSchema: z.object({
      prices: z.array(z.number()).min(5).describe('Array of price data'),
      period: z.number().int().min(2).max(50).default(20).describe('Period for DEMA calculation (default: 20)'),
    }),
    outputSchema: z.object({
      dema: z.number().describe('Double Exponential Moving Average value'),
      trend: z.string().describe('Trend direction'),
      strength: z.number().describe('Signal strength (0-100)'),
      signal: z.string().describe('Trading signal'),
    }),
  },
  async ({ prices, period = 20 }) => {
    try {
      const result = calculateDEMA(prices, period)
      if (!result) {
        throw new Error(`Insufficient data: need at least ${period} prices, got ${prices.length}`)
      }
      return result
    } catch (error: any) {
      throw new Error(`Double Exponential Moving Average calculation failed: ${error.message}`)
    }
  }
)

// Register triple_exponential_moving_average tool
server.registerTool(
  'triple_exponential_moving_average',
  {
    title: 'Triple Exponential Moving Average (TEMA)',
    description: 'Calculate Triple Exponential Moving Average that further reduces lag and provides smooth trend signals.',
    inputSchema: z.object({
      prices: z.array(z.number()).min(5).describe('Array of price data'),
      period: z.number().int().min(2).max(50).default(14).describe('Period for TEMA calculation (default: 14)'),
    }),
    outputSchema: z.object({
      tema: z.number().describe('Triple Exponential Moving Average value'),
      trend: z.string().describe('Trend direction'),
      strength: z.number().describe('Signal strength (0-100)'),
      signal: z.string().describe('Trading signal'),
    }),
  },
  async ({ prices, period = 14 }) => {
    try {
      const result = calculateTEMA(prices, period)
      if (!result) {
        throw new Error(`Insufficient data: need at least ${period} prices, got ${prices.length}`)
      }
      return result
    } catch (error: any) {
      throw new Error(`Triple Exponential Moving Average calculation failed: ${error.message}`)
    }
  }
)

// Register pivot_camarilla tool
server.registerTool(
  'pivot_camarilla',
  {
    title: 'Camarilla Pivot Points',
    description: 'Calculate Camarilla Pivot Points for advanced support and resistance levels.',
    inputSchema: z.object({
      high: z.number().describe('Previous period high price'),
      low: z.number().describe('Previous period low price'),
      close: z.number().describe('Previous period close price'),
    }),
    outputSchema: z.object({
      pivotPoint: z.number().describe('Main pivot point'),
      resistance1: z.number().describe('Resistance level 1'),
      resistance2: z.number().describe('Resistance level 2'),
      resistance3: z.number().describe('Resistance level 3'),
      resistance4: z.number().describe('Resistance level 4'),
      support1: z.number().describe('Support level 1'),
      support2: z.number().describe('Support level 2'),
      support3: z.number().describe('Support level 3'),
      support4: z.number().describe('Support level 4'),
      l3: z.number().describe('Long target 3'),
      l4: z.number().describe('Long target 4'),
      h3: z.number().describe('Short target 3'),
      h4: z.number().describe('Short target 4'),
    }),
  },
  async ({ high, low, close }) => {
    try {
      const result = calculateCamarillaPivots(high, low, close)
      return result
    } catch (error: any) {
      throw new Error(`Camarilla Pivots calculation failed: ${error.message}`)
    }
  }
)

// Register fibonacci_retracement tool
server.registerTool(
  'fibonacci_retracement',
  {
    title: 'Fibonacci Retracement',
    description: 'Calculate Fibonacci retracement levels for potential support and resistance zones.',
    inputSchema: z.object({
      closes: z.array(z.number()).min(10).describe('Array of closing prices'),
      lookbackPeriod: z.number().int().min(5).max(200).default(50).describe('Lookback period to find swing points (default: 50)'),
    }),
    outputSchema: z.object({
      retracement236: z.number().nullable().describe('23.6% retracement level'),
      retracement382: z.number().nullable().describe('38.2% retracement level'),
      retracement500: z.number().nullable().describe('50.0% retracement level'),
      retracement618: z.number().nullable().describe('61.8% retracement level'),
      retracement786: z.number().nullable().describe('78.6% retracement level'),
      swingHigh: z.number().nullable().describe('Swing high point'),
      swingLow: z.number().nullable().describe('Swing low point'),
      currentLevel: z.string().nullable().describe('Current price level relative to retracements'),
      signal: z.string().nullable().describe('Trading signal based on retracement levels'),
    }),
  },
  async ({ closes, lookbackPeriod = 50 }) => {
    try {
      const result = calculateFibonacciRetracement(closes, lookbackPeriod)
      return result
    } catch (error: any) {
      throw new Error(`Fibonacci Retracement calculation failed: ${error.message}`)
    }
  }
)

// Register standard_pivot_points tool
server.registerTool(
  'standard_pivot_points',
  {
    title: 'Standard Pivot Points',
    description: 'Calculate Standard Pivot Points for traditional support and resistance levels.',
    inputSchema: z.object({
      high: z.number().describe('Previous period high price'),
      low: z.number().describe('Previous period low price'),
      close: z.number().describe('Previous period close price'),
    }),
    outputSchema: z.object({
      pivotPoint: z.number().describe('Main pivot point'),
      resistance1: z.number().describe('Resistance level 1'),
      resistance2: z.number().describe('Resistance level 2'),
      resistance3: z.number().describe('Resistance level 3'),
      support1: z.number().describe('Support level 1'),
      support2: z.number().describe('Support level 2'),
      support3: z.number().describe('Support level 3'),
    }),
  },
  async ({ high, low, close }) => {
    try {
      const result = calculatePivotPoints(high, low, close)
      return result
    } catch (error: any) {
      throw new Error(`Standard Pivot Points calculation failed: ${error.message}`)
    }
  }
)

// Register keltner_channels tool
server.registerTool(
  'keltner_channels',
  {
    title: 'Keltner Channels',
    description: 'Calculate Keltner Channels that combine moving averages with ATR for volatility-based support and resistance.',
    inputSchema: z.object({
      highs: z.array(z.number()).min(15).describe('Array of high prices'),
      lows: z.array(z.number()).min(15).describe('Array of low prices'),
      closes: z.array(z.number()).min(15).describe('Array of closing prices'),
      period: z.number().int().min(5).max(50).default(20).describe('Period for moving average (default: 20)'),
      atrPeriod: z.number().int().min(5).max(30).default(10).describe('Period for ATR calculation (default: 10)'),
      multiplier: z.number().min(0.5).max(3).default(2).describe('ATR multiplier (default: 2)'),
    }),
    outputSchema: z.object({
      middle: z.number().describe('Middle line (EMA)'),
      upper: z.number().describe('Upper channel'),
      lower: z.number().describe('Lower channel'),
      atr: z.number().describe('Average True Range'),
      position: z.string().describe('Current price position'),
      trend: z.string().describe('Channel trend'),
      signal: z.string().describe('Trading signal'),
    }),
  },
  async ({ highs, lows, closes, period = 20, atrPeriod = 10, multiplier = 2 }) => {
    try {
      if (highs.length !== lows.length || highs.length !== closes.length) {
        throw new Error('All price arrays must have the same length')
      }
      const result = calculateKeltnerChannels(highs, lows, closes, period, atrPeriod, multiplier)
      if (!result) {
        throw new Error(`Insufficient data: need at least ${Math.max(period, atrPeriod)} prices, got ${highs.length}`)
      }
      return result
    } catch (error: any) {
      throw new Error(`Keltner Channels calculation failed: ${error.message}`)
    }
  }
)

// Register donchian_channels tool
server.registerTool(
  'donchian_channels',
  {
    title: 'Donchian Channels',
    description: 'Calculate Donchian Channels using highest high and lowest low over a specified period.',
    inputSchema: z.object({
      highs: z.array(z.number()).min(5).describe('Array of high prices'),
      lows: z.array(z.number()).min(5).describe('Array of low prices'),
      period: z.number().int().min(2).max(100).default(20).describe('Period for channel calculation (default: 20)'),
    }),
    outputSchema: z.object({
      upper: z.number().describe('Upper channel (highest high)'),
      lower: z.number().describe('Lower channel (lowest low)'),
      middle: z.number().describe('Middle channel (midpoint)'),
      range: z.number().describe('Channel range'),
      position: z.string().describe('Current price position'),
      trend: z.string().describe('Channel trend'),
      signal: z.string().describe('Trading signal'),
    }),
  },
  async ({ highs, lows, period = 20 }) => {
    try {
      if (highs.length !== lows.length) {
        throw new Error('Highs and lows arrays must have the same length')
      }
      const result = calculateDonchianChannels(highs, lows, period)
      if (!result) {
        throw new Error(`Insufficient data: need at least ${period} prices, got ${highs.length}`)
      }
      return result
    } catch (error: any) {
      throw new Error(`Donchian Channels calculation failed: ${error.message}`)
    }
  }
)

// Register alligator tool
server.registerTool(
  'alligator',
  {
    title: 'Alligator Indicator',
    description: 'Calculate Alligator Indicator from Bill Williams trading system using three smoothed moving averages.',
    inputSchema: z.object({
      closes: z.array(z.number()).min(25).describe('Array of closing prices'),
      jawPeriod: z.number().int().min(5).max(30).default(13).describe('Jaw period (default: 13)'),
      teethPeriod: z.number().int().min(5).max(20).default(8).describe('Teeth period (default: 8)'),
      lipsPeriod: z.number().int().min(3).max(15).default(5).describe('Lips period (default: 5)'),
      jawOffset: z.number().int().min(5).max(15).default(8).describe('Jaw offset (default: 8)'),
      teethOffset: z.number().int().min(3).max(10).default(5).describe('Teeth offset (default: 5)'),
      lipsOffset: z.number().int().min(2).max(8).default(3).describe('Lips offset (default: 3)'),
    }),
    outputSchema: z.object({
      jaw: z.number().describe('Alligator Jaw (blue line)'),
      teeth: z.number().describe('Alligator Teeth (red line)'),
      lips: z.number().describe('Alligator Lips (green line)'),
      trend: z.string().describe('Alligator trend state'),
      signal: z.string().describe('Trading signal'),
      convergence: z.boolean().describe('Lines are converging'),
      divergence: z.boolean().describe('Lines are diverging'),
    }),
  },
  async ({ closes, jawPeriod = 13, teethPeriod = 8, lipsPeriod = 5, jawOffset = 8, teethOffset = 5, lipsOffset = 3 }) => {
    try {
      const result = calculateAlligator(closes, jawPeriod, teethPeriod, lipsPeriod, jawOffset, teethOffset, lipsOffset)
      if (!result) {
        throw new Error(`Insufficient data: need at least ${Math.max(jawPeriod + jawOffset, teethPeriod + teethOffset, lipsPeriod + lipsOffset)} prices, got ${closes.length}`)
      }
      return result
    } catch (error: any) {
      throw new Error(`Alligator calculation failed: ${error.message}`)
    }
  }
)

// Register awesome_oscillator tool
server.registerTool(
  'awesome_oscillator',
  {
    title: 'Awesome Oscillator',
    description: 'Calculate Awesome Oscillator that shows momentum changes using simple moving averages of the median price.',
    inputSchema: z.object({
      highs: z.array(z.number()).min(35).describe('Array of high prices'),
      lows: z.array(z.number()).min(35).describe('Array of low prices'),
      fastPeriod: z.number().int().min(5).max(15).default(5).describe('Fast SMA period (default: 5)'),
      slowPeriod: z.number().int().min(25).max(40).default(34).describe('Slow SMA period (default: 34)'),
    }),
    outputSchema: z.object({
      ao: z.number().describe('Awesome Oscillator value'),
      histogram: z.string().describe('Histogram color (green/red)'),
      trend: z.string().describe('AO trend'),
      signal: z.string().describe('Trading signal'),
      saucerSignal: z.boolean().describe('Saucer signal detected'),
      twinPeaksSignal: z.boolean().describe('Twin peaks signal detected'),
    }),
  },
  async ({ highs, lows, fastPeriod = 5, slowPeriod = 34 }) => {
    try {
      if (highs.length !== lows.length) {
        throw new Error('Highs and lows arrays must have the same length')
      }
      const result = calculateAwesomeOscillator(highs, lows, fastPeriod, slowPeriod)
      if (!result) {
        throw new Error(`Insufficient data: need at least ${slowPeriod + 1} prices, got ${highs.length}`)
      }
      return result
    } catch (error: any) {
      throw new Error(`Awesome Oscillator calculation failed: ${error.message}`)
    }
  }
)

// Register ichimoku_cloud tool
server.registerTool(
  'ichimoku_cloud',
  {
    title: 'Ichimoku Cloud',
    description: 'Calculate Ichimoku Cloud for comprehensive trend analysis with multiple timeframe support/resistance.',
    inputSchema: z.object({
      highs: z.array(z.number()).min(55).describe('Array of high prices'),
      lows: z.array(z.number()).min(55).describe('Array of low prices'),
      closes: z.array(z.number()).min(55).describe('Array of closing prices'),
      tenkanPeriod: z.number().int().min(5).max(15).default(9).describe('Tenkan-sen period (default: 9)'),
      kijunPeriod: z.number().int().min(20).max(35).default(26).describe('Kijun-sen period (default: 26)'),
      senkouSpanBPeriod: z.number().int().min(40).max(60).default(52).describe('Senkou Span B period (default: 52)'),
    }),
    outputSchema: z.object({
      tenkanSen: z.number().describe('Tenkan-sen (Conversion Line)'),
      kijunSen: z.number().describe('Kijun-sen (Base Line)'),
      senkouSpanA: z.number().describe('Senkou Span A (Leading Span A)'),
      senkouSpanB: z.number().describe('Senkou Span B (Leading Span B)'),
      chikouSpan: z.number().describe('Chikou Span (Lagging Span)'),
      cloudTop: z.number().describe('Cloud top (higher of Span A/B)'),
      cloudBottom: z.number().describe('Cloud bottom (lower of Span A/B)'),
      cloudColor: z.string().describe('Cloud color (green/red)'),
      trend: z.string().describe('Ichimoku trend'),
      signal: z.string().describe('Trading signal'),
      tkCross: z.string().describe('Tenkan/Kijun crossover'),
      priceVsCloud: z.string().describe('Price position vs cloud'),
    }),
  },
  async ({ highs, lows, closes, tenkanPeriod = 9, kijunPeriod = 26, senkouSpanBPeriod = 52 }) => {
    try {
      if (highs.length !== lows.length || highs.length !== closes.length) {
        throw new Error('All price arrays must have the same length')
      }
      const result = calculateIchimokuCloud(highs, lows, closes, tenkanPeriod, kijunPeriod, senkouSpanBPeriod)
      if (!result) {
        throw new Error(`Insufficient data: need at least ${senkouSpanBPeriod + 26} prices, got ${highs.length}`)
      }
      return result
    } catch (error: any) {
      throw new Error(`Ichimoku Cloud calculation failed: ${error.message}`)
    }
  }
)

// Register r_squared tool
server.registerTool(
  'r_squared',
  {
    title: 'R-Squared Analysis',
    description: 'Calculate R-squared (coefficient of determination) to measure how well data fits a statistical model.',
    inputSchema: z.object({
      prices1: z.array(z.number()).min(5).describe('Array of first price series'),
      prices2: z.array(z.number()).min(5).describe('Array of second price series'),
      period: z.number().int().min(2).max(200).default(30).describe('Period for R-squared calculation (default: 30)'),
    }),
    outputSchema: z.object({
      rSquared: z.number().describe('R-squared value (0-1)'),
      fitQuality: z.string().describe('Model fit quality'),
      predictability: z.string().describe('Predictability level'),
      trend: z.string().describe('R-squared trend'),
      signal: z.string().describe('Trading signal based on fit quality'),
    }),
  },
  async ({ prices1, prices2, period = 30 }) => {
    try {
      if (prices1.length !== prices2.length) {
        throw new Error('Both price arrays must have the same length')
      }
      const result = calculateRSquared(prices1, prices2, period)
      if (!result) {
        throw new Error(`Insufficient data: need at least ${period} data points, got ${prices1.length}`)
      }
      return result
    } catch (error: any) {
      throw new Error(`R-Squared calculation failed: ${error.message}`)
    }
  }
)

// Register momentum_indicator tool
server.registerTool(
  'momentum_indicator',
  {
    title: 'Momentum Indicator',
    description: 'Calculate Momentum Indicator that measures the rate of price change over a specified period.',
    inputSchema: z.object({
      closes: z.array(z.number()).min(15).describe('Array of closing prices'),
      period: z.number().int().min(2).max(50).default(14).describe('Period for momentum calculation (default: 14)'),
    }),
    outputSchema: z.object({
      momentum: z.number().describe('Momentum value'),
      trend: z.string().describe('Momentum trend'),
      strength: z.number().describe('Momentum strength (0-100)'),
      signal: z.string().describe('Trading signal'),
      zeroCross: z.boolean().describe('Zero line crossover'),
    }),
  },
  async ({ closes, period = 14 }) => {
    try {
      const result = calculateMomentum(closes, period)
      if (!result) {
        throw new Error(`Insufficient data: need at least ${period + 1} prices, got ${closes.length}`)
      }
      return result
    } catch (error: any) {
      throw new Error(`Momentum Indicator calculation failed: ${error.message}`)
    }
  }
)

// Register rate_of_change tool
server.registerTool(
  'rate_of_change',
  {
    title: 'Rate of Change (ROC)',
    description: 'Calculate Rate of Change that measures the percentage change in price over a specified period.',
    inputSchema: z.object({
      closes: z.array(z.number()).min(15).describe('Array of closing prices'),
      period: z.number().int().min(2).max(50).default(14).describe('Period for ROC calculation (default: 14)'),
    }),
    outputSchema: z.object({
      roc: z.number().describe('Rate of Change (%)'),
      trend: z.string().describe('ROC trend'),
      strength: z.number().describe('ROC strength (0-100)'),
      overbought: z.boolean().describe('Overbought condition (>10%)'),
      oversold: z.boolean().describe('Oversold condition (<-10%)'),
      signal: z.string().describe('Trading signal'),
    }),
  },
  async ({ closes, period = 14 }) => {
    try {
      const result = calculateROC(closes, period)
      if (!result) {
        throw new Error(`Insufficient data: need at least ${period + 1} prices, got ${closes.length}`)
      }
      return result
    } catch (error: any) {
      throw new Error(`Rate of Change calculation failed: ${error.message}`)
    }
  }
)

// Register force_index tool
server.registerTool(
  'force_index',
  {
    title: 'Force Index',
    description: 'Calculate Force Index that combines price change direction with volume to measure buying/selling pressure.',
    inputSchema: z.object({
      closes: z.array(z.number()).min(15).describe('Array of closing prices'),
      volumes: z.array(z.number()).min(15).describe('Array of volume data (must match closes length)'),
      period: z.number().int().min(2).max(30).default(13).describe('Period for EMA smoothing (default: 13)'),
    }),
    outputSchema: z.object({
      forceIndex: z.number().describe('Force Index value'),
      trend: z.string().describe('Force Index trend'),
      strength: z.number().describe('Force Index strength (0-100)'),
      bullishPressure: z.boolean().describe('Bullish pressure dominant'),
      bearishPressure: z.boolean().describe('Bearish pressure dominant'),
      signal: z.string().describe('Trading signal'),
    }),
  },
  async ({ closes, volumes, period = 13 }) => {
    try {
      if (closes.length !== volumes.length) {
        throw new Error('Closes and volumes arrays must have the same length')
      }
      const result = calculateForceIndex(closes, volumes, period)
      if (!result) {
        throw new Error(`Insufficient data: need at least ${period + 1} prices, got ${closes.length}`)
      }
      return result
    } catch (error: any) {
      throw new Error(`Force Index calculation failed: ${error.message}`)
    }
  }
)

// Register super_trend tool
server.registerTool(
  'supertrend',
  {
    title: 'SuperTrend',
    description: 'Calculate SuperTrend indicator that combines ATR and price action for trend-following stop levels.',
    inputSchema: z.object({
      highs: z.array(z.number()).min(15).describe('Array of high prices'),
      lows: z.array(z.number()).min(15).describe('Array of low prices'),
      closes: z.array(z.number()).min(15).describe('Array of closing prices'),
      period: z.number().int().min(5).max(30).default(10).describe('ATR period (default: 10)'),
      multiplier: z.number().min(1).max(5).default(3).describe('ATR multiplier (default: 3)'),
    }),
    outputSchema: z.object({
      superTrend: z.number().describe('SuperTrend value'),
      trend: z.string().describe('Current trend direction'),
      signal: z.string().describe('Trading signal'),
      upperBand: z.number().describe('Upper SuperTrend band'),
      lowerBand: z.number().describe('Lower SuperTrend band'),
      atr: z.number().describe('Average True Range'),
    }),
  },
  async ({ highs, lows, closes, period = 10, multiplier = 3 }) => {
    try {
      if (highs.length !== lows.length || highs.length !== closes.length) {
        throw new Error('All price arrays must have the same length')
      }
      const result = calculateSuperTrend(highs, lows, closes, period, multiplier)
      if (!result) {
        throw new Error(`Insufficient data: need at least ${period + 1} prices, got ${highs.length}`)
      }
      return result
    } catch (error: any) {
      throw new Error(`SuperTrend calculation failed: ${error.message}`)
    }
  }
)

// Register linear_regression tool
server.registerTool(
  'linear_regression',
  {
    title: 'Linear Regression Indicator',
    description: 'Calculate linear regression line, slope, intercept, R-squared, and regression bands for trend analysis.',
    inputSchema: z.object({
      prices: z.array(z.number()).min(5).describe('Array of price data (typically closing prices)'),
      period: z.number().int().min(2).max(200).default(20).describe('Period for regression calculation (default: 20)'),
    }),
    outputSchema: z.object({
      slope: z.number().describe('Slope of the regression line'),
      intercept: z.number().describe('Y-intercept of the regression line'),
      regressionLine: z.number().describe('Current regression line value'),
      rSquared: z.number().describe('R-squared (coefficient of determination)'),
      standardError: z.number().describe('Standard error of the regression'),
      correlation: z.number().describe('Correlation coefficient'),
      trend: z.enum(['bullish', 'bearish', 'neutral']).describe('Trend direction'),
      strength: z.number().describe('Trend strength (0-100)'),
      upperBand: z.number().describe('Upper regression band (+2 SD)'),
      lowerBand: z.number().describe('Lower regression band (-2 SD)'),
      priceVsRegression: z.number().describe('Price vs regression line (%)'),
      position: z.enum(['above', 'below', 'on_line']).describe('Current price position relative to regression line'),
    }),
  },
  async ({ prices, period = 20 }) => {
    try {
      const result = calculateLinearRegression(prices, period)
      if (!result) {
        throw new Error(`Insufficient data: need at least ${period} prices, got ${prices.length}`)
      }
      return result
    } catch (error: any) {
      throw new Error(`Linear Regression calculation failed: ${error.message}`)
    }
  }
)

// Register Resources
server.registerResource(
  'trading-strategies',
  'geartrade://docs/trading-strategies',
  {
    description: 'Comprehensive guide on trading strategies, technical analysis, and best practices for using GearTrade MCP Server',
    mimeType: 'text/markdown',
  },
  async () => {

    return {
      contents: [
        {
          uri: 'geartrade://docs/trading-strategies',
          mimeType: 'text/markdown',
          text: `# Trading Strategies Guide

## Overview

GearTrade MCP Server provides comprehensive tools for crypto trading analysis and execution. This guide covers effective trading strategies using the available tools.

## Recommended Workflow

### 1. Comprehensive Analysis
Start with systematic data gathering using specialized tools:

**Price & Market Data:**
- \`get_price\` - Current price, 24h change, market cap
- \`get_volume_analysis\` - Volume patterns, buy/sell pressure
- \`get_external_data\` - Funding rates, open interest, market sentiment

**Technical Analysis:**
- \`get_indicators\` - RSI, MACD, moving averages, momentum
- \`get_market_structure\` - Trend bias, support/resistance
- \`get_candlestick_patterns\` - Chart patterns, reversal signals
- \`get_fibonacci\` - Fibonacci retracements, golden ratio levels

### 2. Signal Identification
Look for high-confidence signals:
- **BUY Signals**: RSI oversold (<30), bullish divergence, support bounce, positive CVD trend
- **SELL Signals**: RSI overbought (>70), bearish divergence, resistance rejection, negative CVD trend
- **Multi-timeframe alignment**: Daily, 4H, and 1H all trending in same direction = higher confidence

### 3. Risk Management
Before execution, calculate:
- Position size based on capital and risk percentage
- Stop loss level (typically 1-3% from entry)
- Take profit level (aim for 2:1 or 3:1 risk/reward ratio)
- Maximum leverage (consider volatility and market conditions)

### 4. Execution
- Always use paper trading first (\`execute: false\` or \`useLiveExecutor: false\`)
- Get user confirmation before live execution
- Monitor positions after execution using \`get_position\`

## Technical Analysis Strategies

### Trend Following
1. Use \`get_multitimeframe\` to identify trend alignment
2. Enter on pullbacks to support (for uptrends) or resistance (for downtrends)
3. Use Fibonacci retracement levels from \`get_fibonacci\` for entry zones
4. Confirm with volume analysis showing accumulation/distribution

### Mean Reversion
1. Identify overbought/oversold conditions using RSI from \`get_indicator\`
2. Look for divergence signals from \`get_divergence\`
3. Check order book depth for support/resistance zones
4. Enter when price reaches extreme levels with reversal candlestick patterns

### Breakout Trading
1. Identify consolidation zones using \`get_volume_profile\` (HVN/LVN)
2. Monitor order book depth for liquidity clusters
3. Wait for volume confirmation on breakout
4. Use liquidation levels to identify potential stop hunt zones

## Volume-Based Strategies

### CVD (Cumulative Volume Delta) Trading
- Positive CVD trend = buying pressure = bullish
- Negative CVD trend = selling pressure = bearish
- Use \`get_volume_analysis\` to track CVD trends
- Enter when CVD diverges from price (early signal)

### Volume Profile Trading
- POC (Point of Control) = high volume price level = strong support/resistance
- VAH/VAL = value area boundaries
- Trade from HVN to LVN (high volume to low volume)
- Use \`get_volume_profile\` for session and composite profiles

## Risk Management Best Practices

1. **Never risk more than 1-2% of capital per trade**
2. **Always set stop loss** - use \`calculate_risk_management\` tool
3. **Use position sizing** - use \`calculate_position_setup\` tool
4. **Monitor MAE (Maximum Adverse Excursion)** - track with \`get_position\`
5. **Diversify** - don't put all capital in one trade
6. **Respect leverage limits** - higher leverage = higher risk

## Advanced Analysis Tools

### Fibonacci Retracement
- Use swing highs/lows to identify key retracement levels
- 38.2%, 50%, 61.8% are common support/resistance zones
- Combine with volume profile for confirmation

### Order Book Depth
- Monitor bid/ask imbalance for short-term direction
- Large orders at specific levels = support/resistance
- Spread analysis indicates market liquidity

### Liquidation Levels
- Identify where stop losses are clustered
- Price often moves to liquidate positions before reversing
- Use safe entry zones to avoid stop hunts

### Long/Short Ratio
- Extreme ratios (>70% long or short) = contrarian signal
- Divergence between ratio and price = reversal potential
- Monitor sentiment shifts

## Execution Safety

1. **Always test with paper trading first**
2. **Get explicit user confirmation** before live execution
3. **Start with small position sizes**
4. **Monitor positions actively** after execution
5. **Use multiple timeframes** for confirmation
6. **Respect market conditions** - avoid trading during high volatility or low liquidity

## Common Mistakes to Avoid

1. ❌ Trading without stop loss
2. ❌ Over-leveraging (using too high leverage)
3. ❌ Ignoring volume analysis
4. ❌ Trading against the trend
5. ❌ Not waiting for confirmation signals
6. ❌ Emotional trading (FOMO, revenge trading)
7. ❌ Ignoring risk/reward ratios
8. ❌ Not monitoring open positions

## Tools Quick Reference

- **Price**: \`get_price\`, \`get_multiple_prices\`
- **Technical Analysis**: \`get_indicator\`, \`get_multiple_indicators\`
- **Volume**: \`get_volume_analysis\`, \`get_multiple_volume_analysis\`
- **Multi-timeframe**: \`get_multitimeframe\`, \`get_multiple_multitimeframe\`
- **Advanced**: \`get_fibonacci\`, \`get_orderbook_depth\`, \`get_volume_profile\`, \`get_market_structure\`, \`get_candlestick_patterns\`, \`get_divergence\`, \`get_liquidation_levels\`, \`get_long_short_ratio\`, \`get_spot_futures_divergence\`
- **Comprehensive**: \`analisis_crypto\`, \`analisis_multiple_crypto\`
- **Execution**: \`get_execution_spot\`, \`get_execution_futures\`
- **Position**: \`get_position\`, \`get_multiple_positions\`
- **Risk**: \`calculate_risk_management\`, \`calculate_position_setup\`
`,
        },
      ],
    }
  }
)

server.registerResource(
  'risk-management',
  'geartrade://docs/risk-management',
  {
    description: 'Guide on risk management, position sizing, stop loss, and take profit strategies',
    mimeType: 'text/markdown',
  },
  async () => {
    return {
      contents: [
        {
          uri: 'geartrade://docs/risk-management',
          mimeType: 'text/markdown',
          text: `# Risk Management Guide

## Overview

Proper risk management is essential for successful trading. This guide covers position sizing, stop loss, take profit, and leverage management using GearTrade MCP Server tools.

## Position Sizing

### Basic Principles
- **Risk per trade**: Never risk more than 1-2% of total capital per trade
- **Position size calculation**: Use \`calculate_position_setup\` tool
- **Capital allocation**: Reserve 20-30% of capital for margin requirements

### Position Sizing Formula
\`\`\`
Position Size = (Capital × Risk %) / (Entry Price - Stop Loss Price)
\`\`\`

### Example
- Capital: $10,000
- Risk: 1% = $100
- Entry: $50,000
- Stop Loss: $49,000 (2% below entry)
- Position Size: $100 / $1,000 = 0.1 BTC

## Stop Loss Strategies

### Fixed Percentage Stop Loss
- Conservative: 1-2% from entry
- Moderate: 2-3% from entry
- Aggressive: 3-5% from entry

### Technical Stop Loss
- Below support level (for longs)
- Above resistance level (for shorts)
- Below/above key Fibonacci levels
- Below/above volume profile POC

### ATR-Based Stop Loss
- Use ATR (Average True Range) from technical indicators
- Stop Loss = Entry ± (2 × ATR) for volatility-adjusted stops

### Using calculate_risk_management Tool
The \`calculate_risk_management\` tool automatically calculates:
- Optimal stop loss level
- Take profit level
- Risk/reward ratio
- Position risk percentage

## Take Profit Strategies

### Risk/Reward Ratio
- **Minimum**: 1:1 (break-even after fees)
- **Recommended**: 2:1 or 3:1
- **Aggressive**: 4:1 or higher

### Multiple Take Profit Levels
1. **TP1**: 1:1 risk/reward (secure partial profit)
2. **TP2**: 2:1 risk/reward (let winners run)
3. **TP3**: 3:1 risk/reward (trailing stop)

### Technical Take Profit
- At resistance level (for longs)
- At support level (for shorts)
- At Fibonacci extension levels
- At volume profile VAH/VAL

## Leverage Management

### Leverage Guidelines
- **Conservative**: 1x-3x leverage
- **Moderate**: 3x-5x leverage
- **Aggressive**: 5x-10x leverage
- **Maximum**: Never exceed 10x for most traders

### Leverage Calculation
Use \`calculate_position_setup\` tool to determine:
- Required margin
- Maximum leverage based on capital
- Position quantity with leverage

### Dynamic Leverage
- **High volatility**: Reduce leverage (1x-3x)
- **Low volatility**: Can use higher leverage (3x-5x)
- **Trending markets**: Moderate leverage (3x-5x)
- **Ranging markets**: Lower leverage (1x-3x)

## Margin Management

### Margin Requirements
- **Initial Margin**: Required to open position
- **Maintenance Margin**: Required to keep position open
- **Liquidation Price**: Price where position gets liquidated

### Margin Safety
- Always maintain 20-30% buffer above maintenance margin
- Monitor margin ratio using \`get_position\` tool
- Reduce position size if margin ratio drops below 150%

## Maximum Adverse Excursion (MAE)

### What is MAE?
MAE measures the maximum unfavorable price movement after entry, even if the trade eventually becomes profitable.

### Using MAE
- Track MAE with \`get_position\` tool
- High MAE = poor entry timing
- Low MAE = good entry timing
- Use MAE to refine entry strategies

### MAE Analysis
- **MAE < Stop Loss**: Good entry, trade went as planned
- **MAE > Stop Loss but trade profitable**: Entry could be improved
- **MAE > Stop Loss and trade lost**: Entry was poor, review strategy

## Risk/Reward Ratio

### Calculation
\`\`\`
Risk/Reward Ratio = (Take Profit - Entry) / (Entry - Stop Loss)
\`\`\`

### Guidelines
- **Minimum**: 1:1 (break-even after fees)
- **Good**: 2:1 (profitable long-term)
- **Excellent**: 3:1 or higher

### Using calculate_risk_management
The tool automatically calculates optimal risk/reward ratios based on:
- Entry price
- Support/resistance levels
- Volatility (ATR)
- Market structure

## Portfolio Risk Management

### Capital Allocation
- **Per trade risk**: 1-2% of total capital
- **Total open positions**: Maximum 5-10 positions
- **Maximum portfolio risk**: 10-20% of total capital

### Diversification
- Don't put all capital in one asset
- Spread risk across different cryptocurrencies
- Consider correlation between assets

### Correlation Risk
- BTC and ETH are highly correlated
- Altcoins often follow BTC
- Diversify across different market segments

## Position Monitoring

### Active Monitoring
- Use \`get_position\` to track:
  - Unrealized PnL
  - MAE (Maximum Adverse Excursion)
  - Current price vs entry
  - Distance to stop loss/take profit

### Position Adjustments
- **Trailing Stop**: Move stop loss to breakeven after TP1 hit
- **Partial Close**: Close 50% at TP1, let rest run to TP2
- **Add to Position**: Only if original trade is profitable

## Common Risk Management Mistakes

1. ❌ **No stop loss**: Always set stop loss
2. ❌ **Too wide stop loss**: Defeats purpose of risk management
3. ❌ **Too tight stop loss**: Gets stopped out by noise
4. ❌ **Over-leveraging**: Using too high leverage
5. ❌ **Averaging down**: Adding to losing positions
6. ❌ **Ignoring MAE**: Not learning from trade analysis
7. ❌ **Emotional exits**: Closing positions based on fear/greed
8. ❌ **No position sizing**: Trading without calculating position size

## Tools for Risk Management

- **\`calculate_position_setup\`**: Calculate position size, leverage, margin
- **\`calculate_risk_management\`**: Calculate stop loss, take profit, risk/reward
- **\`get_position\`**: Monitor open positions, PnL, MAE
- **\`get_multiple_positions\`**: Monitor multiple positions at once

## Best Practices

1. ✅ Always calculate position size before trading
2. ✅ Always set stop loss (use calculate_risk_management)
3. ✅ Aim for minimum 2:1 risk/reward ratio
4. ✅ Monitor positions actively
5. ✅ Review MAE after each trade
6. ✅ Adjust leverage based on volatility
7. ✅ Maintain margin buffer
8. ✅ Diversify across assets
9. ✅ Never risk more than 2% per trade
10. ✅ Keep detailed trade journal
`,
        },
      ],
    }
  }
)

server.registerResource(
  'tools-overview',
  'geartrade://docs/tools-overview',
  {
    description: 'Complete overview of all 84 MCP tools available in GearTrade',
    mimeType: 'text/markdown',
  },
  async () => {
    return {
      contents: [
        {
          uri: 'geartrade://docs/tools-overview',
          mimeType: 'text/markdown',
          text: `# Tools Overview

## Complete List of 84 MCP Tools

### Price Tools (2)
- **\`get_price\`**: Get latest price for single ticker
- **\`get_multiple_prices\`**: Get latest prices for multiple tickers

### Technical Analysis Tools (2)
- **\`get_indicator\`**: Comprehensive technical indicators (RSI, EMA, MACD, Bollinger Bands, ATR, ADX, OBV, VWAP, Stochastic, CCI, Williams %R, Parabolic SAR, Aroon, Support/Resistance, Fibonacci, Trend, Market Structure, RSI Divergence, Candlestick Patterns, Market Regime)
- **\`get_multiple_indicators\`**: Technical indicators for multiple tickers

### Volume Analysis Tools (2)
- **\`get_volume_analysis\`**: Buy/sell volume, POC, VAH/VAL, HVN/LVN, CVD, liquidity zones, recommendations
- **\`get_multiple_volume_analysis\`**: Volume analysis for multiple tickers

### Multi-Timeframe Tools (2)
- **\`get_multitimeframe\`**: Trend alignment across Daily, 4H, 1H timeframes
- **\`get_multiple_multitimeframe\`**: Multi-timeframe analysis for multiple tickers

### External Data Tools (2)
- **\`get_external_data\`**: Funding rate, open interest, volume trend, volatility
- **\`get_multiple_external_data\`**: External data for multiple tickers

### Position Management Tools (2)
- **\`get_position\`**: Current position info (side, quantity, entry price, PnL, MAE)
- **\`get_multiple_positions\`**: Position info for multiple tickers

### Risk Management Tools (2)
- **\`calculate_risk_management\`**: Calculate stop loss, take profit, risk/reward ratio
- **\`calculate_position_setup\`**: Calculate position size, leverage, margin, quantity

### Advanced Analysis Tools (18)
- **\`get_fibonacci\`** / **\`get_multiple_fibonacci\`**: Fibonacci retracement levels
- **\`get_orderbook_depth\`** / **\`get_multiple_orderbook_depth\`**: Order book depth analysis
- **\`get_volume_profile\`** / **\`get_multiple_volume_profile\`**: Volume profile (POC, VAH/VAL, HVN/LVN)
- **\`get_market_structure\`** / **\`get_multiple_market_structure\`**: Market structure (COC, swing patterns)
- **\`get_candlestick_patterns\`** / **\`get_multiple_candlestick_patterns\`**: Candlestick pattern detection
- **\`get_divergence\`** / **\`get_multiple_divergence\`**: RSI divergence detection
- **\`get_liquidation_levels\`** / **\`get_multiple_liquidation_levels\`**: Liquidation level analysis
- **\`get_long_short_ratio\`** / **\`get_multiple_long_short_ratio\`**: Long/short ratio sentiment
- **\`get_spot_futures_divergence\`** / **\`get_multiple_spot_futures_divergence\`**: Spot-futures divergence

### Comprehensive Analysis Tools (2)
- **\`analisis_crypto\`**: Complete analysis for single ticker (aggregates all data)
- **\`analisis_multiple_crypto\`**: Complete analysis for multiple tickers

### Execution Tools (4)
- **\`get_execution_spot\`**: Spot trading execution (1x leverage)
- **\`get_multiple_execution_spot\`**: Spot execution for multiple tickers
- **\`get_execution_futures\`**: Futures trading execution (1-50x leverage)
- **\`get_multiple_execution_futures\`**: Futures execution for multiple tickers

## Tool Categories

### Analysis Tools
All tools that provide market data and analysis without executing trades.

### Execution Tools
Tools that can execute trades (paper or live). Always require user confirmation.

### Risk Management Tools
Tools for calculating position sizes, stop loss, take profit, and risk metrics.

## Usage Patterns

### Single Asset Analysis
\`\`\`
1. get_price → get_indicator → get_volume_analysis → get_multitimeframe
2. OR: analisis_crypto (all-in-one)
\`\`\`

### Multiple Asset Scan
\`\`\`
1. get_multiple_prices → get_multiple_indicators
2. OR: analisis_multiple_crypto (all-in-one)
\`\`\`

### Execution Workflow
\`\`\`
1. analisis_crypto (analysis)
2. calculate_position_setup (position sizing)
3. calculate_risk_management (stop loss/take profit)
4. get_execution_futures (execution with execute: false first)
5. get_position (monitor after execution)
\`\`\`

## Tool Outputs

All tools return structured JSON data with:
- Ticker symbol
- Timestamp
- Requested data fields
- Error handling (null values for missing data)

## Best Practices

1. Use comprehensive tools (\`analisis_crypto\`) for complete analysis
2. Use specialized tools for specific analysis needs
3. Always use paper trading before live execution
4. Get user confirmation before live trades
5. Monitor positions after execution
6. Use risk management tools before execution
`,
        },
      ],
    }
  }
)

server.registerResource(
  'execution-workflow',
  'geartrade://docs/execution-workflow',
  {
    description: 'Step-by-step guide for analysis to execution workflow with safety best practices',
    mimeType: 'text/markdown',
  },
  async () => {
    return {
      contents: [
        {
          uri: 'geartrade://docs/execution-workflow',
          mimeType: 'text/markdown',
          text: `# Execution Workflow Guide

## Overview

This guide covers the complete workflow from market analysis to order execution using GearTrade MCP Server. Always follow safety best practices.

## Step-by-Step Workflow

### Step 1: Comprehensive Analysis

Gather data systematically using specialized tools:

#### 1.1 Price & Market Data
\`\`\`json
{
  "name": "get_price",
  "arguments": {
    "ticker": "BTC"
  }
}
\`\`\`

#### 1.2 Technical Indicators
\`\`\`json
{
  "name": "get_indicators",
  "arguments": {
    "ticker": "BTC"
  }
}
\`\`\`

#### 1.3 Volume Analysis
\`\`\`json
{
  "name": "get_volume_analysis",
  "arguments": {
    "ticker": "BTC"
  }
}
\`\`\`

#### 1.4 Market Structure
\`\`\`json
{
  "name": "get_market_structure",
  "arguments": {
    "ticker": "BTC"
  }
}
\`\`\`

### Old Method (for reference):
    "ticker": "BTC",
    "capital": 10000,
    "riskPct": 1.0,
    "strategy": "flexible"
  }
}
\`\`\`

**Combined Analysis Output:**
- **get_price**: Current price, 24h change, market data
- **get_indicators**: RSI, MACD, moving averages, momentum indicators
- **get_volume_analysis**: Volume patterns, buy/sell pressure, CVD
- **get_market_structure**: Trend bias, support/resistance levels
- **get_external_data**: Funding rates, open interest, market sentiment
- **Position recommendations** via risk management tools
- Risk management calculations

### Step 2: Signal Identification

Analyze the comprehensive data to identify:
- **Signal**: BUY, SELL, or HOLD
- **Confidence**: Based on multiple confirmations
- **Entry Level**: Optimal entry price
- **Stop Loss**: Risk level
- **Take Profit**: Profit target

**Key Indicators:**
- RSI: Oversold (<30) = BUY, Overbought (>70) = SELL
- Trend Alignment: All timeframes aligned = higher confidence
- Volume: Positive CVD = bullish, Negative CVD = bearish
- Divergence: Bullish divergence = BUY signal, Bearish = SELL
- Market Structure: COC (Change of Character) = potential reversal

### Step 3: Present Analysis to User

**Always present clear summary:**
\`\`\`
📊 Analysis Summary for BTC

Current Price: $86,804
Signal: SELL
Confidence: 73.86%

Entry: $86,804
Stop Loss: $88,338 (1.77% risk)
Take Profit: $82,003 (5.53% reward)
Risk/Reward: 3.12:1

Position Size: 0.1 BTC
Leverage: 5x
Margin Required: $1,736

Technical Indicators:
- RSI(14): 68.5 (Overbought)
- Trend: Bearish (Daily, 4H, 1H aligned)
- Volume: Negative CVD trend
- Divergence: Bearish divergence detected

⚠️ Risk: Medium
\`\`\`

### Step 4: Request User Confirmation

**Always ask for explicit confirmation:**
\`\`\`
Berdasarkan analisis, sinyal SELL dengan confidence 73.86%.
Entry: $86,804, Stop Loss: $88,338, Take Profit: $82,003.
Risk/Reward: 3.12:1

Mau dieksekusi ke Hyperliquid? (YES/NO)
\`\`\`

**Never execute without user approval!**

### Step 5: Paper Trading First (Recommended)

Test execution with paper trading first:

\`\`\`json
{
  "name": "get_execution_futures",
  "arguments": {
    "ticker": "BTC",
    "side": "SHORT",
    "quantity": 0.1,
    "leverage": 5,
    "orderType": "MARKET",
    "execute": true,
    "useLiveExecutor": false
  }
}
\`\`\`

**Paper trading benefits:**
- No real money at risk
- Test execution logic
- Verify position sizing
- Check stop loss/take profit levels

### Step 6: Live Execution (If User Confirms)

Only execute live if user explicitly confirms:

\`\`\`json
{
  "name": "get_execution_futures",
  "arguments": {
    "ticker": "BTC",
    "side": "SHORT",
    "quantity": 0.1,
    "leverage": 5,
    "orderType": "MARKET",
    "execute": true,
    "useLiveExecutor": true
  }
}
\`\`\`

**Safety checks:**
- ✅ User confirmed execution
- ✅ Paper trading tested
- ✅ Position size calculated
- ✅ Stop loss/take profit set
- ✅ Risk within limits (1-2% of capital)

### Step 7: Position Monitoring

After execution, monitor the position:

\`\`\`json
{
  "name": "get_position",
  "arguments": {
    "ticker": "BTC"
  }
}
\`\`\`

**Monitor:**
- Unrealized PnL
- Current price vs entry
- Distance to stop loss/take profit
- MAE (Maximum Adverse Excursion)

## Multiple Asset Execution

For multiple assets, use batch tools:

\`\`\`json
{
  "name": "analisis_multiple_crypto",
  "arguments": {
    "tickers": ["BTC", "ETH", "SOL"],
    "capital": 10000,
    "riskPct": 1.0
  }
}
\`\`\`

**Note:** \`get_multiple_execution_*\` tools default to paper trading for safety.

## Safety Features

### Paper Trading Default
- Multiple executions default to paper trading
- Single executions require explicit \`useLiveExecutor: true\`

### User Confirmation Required
- Always ask user before live execution
- Present clear risk/reward summary
- Show position size and margin requirements

### Risk Limits
- Default risk: 1% of capital per trade
- Maximum recommended: 2% per trade
- Total portfolio risk: 10-20% maximum

## Error Handling

### Execution Errors
- Network errors: Retry with exponential backoff
- Insufficient balance: Show clear error message
- Invalid parameters: Validate before execution
- Order rejection: Log reason and inform user

### Position Monitoring Errors
- API failures: Retry and cache last known state
- Missing positions: Handle gracefully (position closed or never opened)

## Best Practices

1. ✅ **Always analyze first** - Use \`analisis_crypto\` before execution
2. ✅ **Present clear summary** - Show all key metrics
3. ✅ **Ask for confirmation** - Never execute without user approval
4. ✅ **Paper trade first** - Test with paper trading
5. ✅ **Monitor positions** - Track PnL and MAE
6. ✅ **Respect risk limits** - Never exceed 2% risk per trade
7. ✅ **Handle errors gracefully** - Show user-friendly error messages
8. ✅ **Log all executions** - Keep record of all trades

## Common Workflow Patterns

### Quick Analysis
\`\`\`
analisis_crypto → Present summary → User decision
\`\`\`

### Full Execution Workflow
\`\`\`
analisis_crypto → calculate_position_setup → calculate_risk_management → 
Present summary → User confirmation → Paper trade → Live execution → Monitor position
\`\`\`

### Multi-Asset Scan
\`\`\`
analisis_multiple_crypto → Identify opportunities → Present top 3 → 
User selects → Individual analysis → Execution workflow
\`\`\`
`,
        },
      ],
    }
  }
)

// Register Prompts
server.registerPrompt(
  'analyze_and_execute',
  {
    title: 'Analyze and Execute',
    description: 'Analyze a crypto asset and prepare execution plan with risk management',
    argsSchema: {
      ticker: z.string().describe('Asset ticker to analyze (e.g., BTC, ETH, SOL)'),
      capital: z.string().optional().describe('Trading capital in USD (default: 10000)'),
      riskPct: z.string().optional().describe('Risk percentage per trade (default: 1.0)'),
    } as any,
  },
  async (args: any) => {
    const ticker = args.ticker || 'BTC'
    const capital = args.capital ? parseFloat(args.capital) : 10000
    const riskPct = args.riskPct ? parseFloat(args.riskPct) : 1.0

    return {
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Please analyze ${ticker} comprehensively using these steps:

1. **Get Current Price & Basic Info:**
   - Use get_price tool for current price and market data

2. **Technical Analysis:**
   - Use get_indicators for RSI, MACD, moving averages
   - Use get_volume_analysis for volume patterns
   - Use get_market_structure for trend bias
   - Use get_candlestick_patterns for chart patterns

3. **Risk Management Setup:**
   - Use calculate_risk_management with entry price, capital=${capital}, riskPct=${riskPct}
   - Calculate position size and stop loss levels

4. **Present Analysis Summary:**
   - Current price and 24h change
   - Technical signal (BUY/SELL/HOLD) with confidence %
   - Recommended entry, stop loss, take profit levels
   - Risk/reward ratio and position sizing
   - Key supporting indicators

5. **Execution Preparation:**
   - If user wants to execute: Use get_execution_spot for spot trading
   - Always start with paper trading first (useLiveExecutor: false)
   - Only proceed to live execution after explicit confirmation

Ask user: "Mau dieksekusi dengan paper trading dulu? (YES/NO)"
If YES, show the paper trade result first, then ask for live execution.

Safety first: Never execute live without explicit user approval twice.`,
          },
        },
      ],
    }
  }
)

server.registerPrompt(
  'multi_asset_scan',
  {
    title: 'Multi Asset Scan',
    description: 'Scan multiple assets for trading opportunities and rank by confidence',
    argsSchema: {
      tickers: z.string().describe('Comma-separated tickers to scan (e.g., "BTC,ETH,SOL")'),
      capital: z.string().optional().describe('Trading capital in USD (default: 10000)'),
    } as any,
  },
  async (args: any) => {
    const tickers = args.tickers ? args.tickers.split(',').map((t: string) => t.trim()) : ['BTC', 'ETH', 'SOL']
    const capital = args.capital ? parseFloat(args.capital) : 10000

    return {
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Please scan multiple assets for trading opportunities:

**Step-by-Step Analysis for each asset in ${JSON.stringify(tickers)}:**

1. **Get Price & Volume Data:**
   - Use get_price for current price and market data
   - Use get_volume_analysis for volume patterns

2. **Technical Analysis:**
   - Use get_indicators for technical signals
   - Use get_market_structure for trend bias
   - Use get_candlestick_patterns for chart patterns

3. **Risk Assessment:**
   - Use calculate_risk_management with capital=${capital}

4. **Ranking Criteria:**
   - Signal confidence and strength
   - Risk/Reward ratio quality
   - Trend alignment (multi-timeframe)
   - Volume confirmation

5. **Present Top 3 Opportunities:**
   - Asset ticker and current price
   - BUY/SELL/HOLD signal with confidence %
   - Recommended entry, SL, TP levels
   - Risk/Reward ratio
   - Key supporting indicators
   - Volume confirmation status

Ask user: "Asset mana yang ingin dianalisis lebih detail atau dieksekusi?"

Use the selected asset for further analysis or execution workflow.`,
          },
        },
      ],
    }
  }
)

server.registerPrompt(
  'risk_analysis',
  {
    title: 'Risk Analysis',
    description: 'Perform comprehensive risk analysis for a trading position',
    argsSchema: {
      ticker: z.string().describe('Asset ticker to analyze'),
      entry: z.string().describe('Entry price'),
      side: z.string().describe('Trade side (LONG or SHORT)'),
      capital: z.string().describe('Trading capital in USD'),
    } as any,
  },
  async (args: any) => {
    const ticker = args.ticker || 'BTC'
    const entry = parseFloat(args.entry)
    const side = args.side || 'LONG'
    const capital = parseFloat(args.capital) || 10000

    return {
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Please perform comprehensive risk analysis for ${ticker}:
- Entry: ${entry}
- Side: ${side}
- Capital: ${capital}

Use these tools in sequence:
1. calculate_position_setup - Calculate optimal position size, leverage, and margin
2. calculate_risk_management - Calculate stop loss, take profit, and risk/reward ratio
3. get_position (if position exists) - Check current position status

Present:
1. Recommended position size (quantity, leverage, margin)
2. Stop loss level and risk amount
3. Take profit level and reward amount
4. Risk/Reward ratio
5. Maximum loss if stop loss hit
6. Maximum profit if take profit hit
7. Margin requirements and safety buffer

Provide clear risk assessment and recommendations.`,
          },
        },
      ],
    }
  }
)

server.registerPrompt(
  'position_monitoring',
  {
    title: 'Position Monitoring',
    description: 'Monitor open positions and provide status update',
    argsSchema: {
      tickers: z.string().optional().describe('Comma-separated tickers to monitor (monitors all positions if not provided)'),
    } as any,
  },
  async (args: any) => {
    const tickers = args.tickers ? args.tickers.split(',').map((t: string) => t.trim()) : undefined

    return {
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Please monitor open positions${tickers ? ` for ${JSON.stringify(tickers)}` : ' (all positions)'}.

Use ${tickers ? 'get_multiple_positions' : 'get_position'} to get current status.

For each position, present:
1. Ticker and side (LONG/SHORT)
2. Entry price vs current price
3. Unrealized PnL (profit/loss)
4. PnL percentage
5. Distance to stop loss
6. Distance to take profit
7. MAE (Maximum Adverse Excursion)
8. Risk/Reward status

If any position is:
- Near stop loss: Alert user
- Near take profit: Suggest partial close or trailing stop
- Showing high MAE: Suggest reviewing entry strategy

Provide actionable recommendations for each position.`,
          },
        },
      ],
    }
  }
)

server.registerPrompt(
  'comprehensive_analysis',
  {
    title: 'Comprehensive Analysis',
    description: 'Perform comprehensive market analysis for crypto assets without execution',
    argsSchema: {
      ticker: z.string().optional().describe('Single ticker to analyze (e.g., BTC, ETH, SOL). If not provided, can analyze multiple tickers'),
      tickers: z.string().optional().describe('Comma-separated tickers to analyze (e.g., "BTC,ETH,SOL"). Use this for multiple assets'),
      capital: z.string().optional().describe('Trading capital in USD (default: 10000)'),
      riskPct: z.string().optional().describe('Risk percentage per trade (default: 1.0)'),
      strategy: z.string().optional().describe('Trading strategy timeframe: short_term, long_term, or flexible (default: flexible)'),
    } as any,
  },
  async (args: any) => {
    const ticker = args.ticker
    const tickers = args.tickers ? args.tickers.split(',').map((t: string) => t.trim()) : undefined
    const capital = args.capital ? parseFloat(args.capital) : 10000
    const riskPct = args.riskPct ? parseFloat(args.riskPct) : 1.0
    const strategy = args.strategy || 'flexible'

    if (ticker) {
      // Single asset analysis
      return {
        messages: [
          {
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: `Please perform comprehensive analysis for ${ticker} using the analisis_crypto tool with:
- capital: ${capital}
- riskPct: ${riskPct}
- strategy: ${strategy}

After analysis, present a detailed report with:

1. **Price & Market Overview**
   - Current price and 24h change
   - Volume trends
   - Market sentiment

2. **Technical Analysis**
   - RSI levels (14, 7, 4H) and interpretation
   - EMA trends (20, 50)
   - MACD signals
   - Bollinger Bands position
   - Support and Resistance levels
   - Trend direction and strength

3. **Volume Analysis**
   - Buy/Sell pressure
   - CVD (Cumulative Volume Delta) trend
   - POC, VAH/VAL levels
   - Liquidity zones
   - Volume-based recommendation

4. **Multi-Timeframe Analysis**
   - Daily, 4H, 1H trend alignment
   - Trend strength score
   - Timeframe conflicts or confirmations

5. **Advanced Analysis**
   - Fibonacci retracement levels (if available)
   - Order book depth and imbalance (if available)
   - Volume profile key levels (if available)
   - Market structure (COC, swing patterns)
   - Candlestick patterns detected
   - RSI divergence signals
   - Liquidation levels and zones
   - Long/Short ratio sentiment
   - Spot-Futures divergence (if available)

6. **External Data**
   - Funding rate and trend
   - Open Interest and trend
   - Volatility analysis

7. **Trading Signal**
   - Recommended signal: BUY / SELL / HOLD
   - Confidence level (0-100%)
   - Reasoning based on all indicators

8. **Entry, Stop Loss, Take Profit Levels**
   - Optimal entry price
   - Stop loss level with risk percentage
   - Take profit level with reward percentage
   - Risk/Reward ratio

9. **Position Setup (if signal is BUY/SELL)**
   - Recommended position size
   - Suggested leverage
   - Margin requirements
   - Risk amount in USD

10. **Risk Assessment**
    - Overall risk level (Low/Medium/High)
    - Key risk factors
    - Market conditions to watch

**Important:** This is analysis only. Do NOT execute any trades. Present the analysis clearly and wait for user's decision on next steps.`,
            },
          },
        ],
      }
    } else if (tickers && tickers.length > 0) {
      // Multiple assets analysis
      return {
        messages: [
          {
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: `Please perform comprehensive analysis for multiple assets using analisis_multiple_crypto with:
- tickers: ${JSON.stringify(tickers)}
- capital: ${capital}
- riskPct: ${riskPct}

After analysis, for each asset present:

1. **Quick Summary**
   - Ticker and current price
   - Signal (BUY/SELL/HOLD) and confidence
   - Key technical indicators summary

2. **Ranking**
   Rank all assets by:
   - Signal confidence (highest first)
   - Risk/Reward ratio (best first)
   - Trend alignment strength

3. **Top Opportunities**
   Present the top 3 opportunities with:
   - Complete technical analysis
   - Volume analysis summary
   - Multi-timeframe alignment
   - Entry, Stop Loss, Take Profit levels
   - Risk/Reward ratio
   - Position setup recommendations

4. **Comparison Table**
   Create a comparison table showing:
   - Ticker | Price | Signal | Confidence | R/R Ratio | Risk Level

**Important:** This is analysis only. Do NOT execute any trades. Present the analysis clearly and let user decide which assets to focus on or execute.`,
            },
          },
        ],
      }
    } else {
      // No ticker provided
      return {
        messages: [
          {
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: `Please perform comprehensive market analysis. 

You can analyze:
- Single asset: Use analisis_crypto with a specific ticker
- Multiple assets: Use analisis_multiple_crypto with an array of tickers

For comprehensive analysis, include:
- Technical indicators (RSI, EMA, MACD, Bollinger Bands, etc.)
- Volume analysis (buy/sell pressure, CVD, liquidity zones)
- Multi-timeframe trend alignment
- Advanced analysis (Fibonacci, Order Book, Volume Profile, Market Structure, etc.)
- External data (funding rate, open interest)
- Trading signals with confidence levels
- Entry, Stop Loss, Take Profit recommendations
- Risk assessment

**Important:** This is analysis only. Do NOT execute any trades. Present findings clearly and wait for user's input on which assets to analyze.`,
            },
          },
        ],
      }
    }
  }
)

// Register Additional Prompts
server.registerPrompt(
  'quick_price_check',
  {
    title: 'Quick Price Check',
    description: 'Quickly check prices for multiple crypto assets',
    argsSchema: {
      tickers: z.string().describe('Comma-separated tickers to check (e.g., "BTC,ETH,SOL,BNB")'),
    } as any,
  },
  async (args: any) => {
    const tickers = args.tickers.split(',').map((t: string) => t.trim().toUpperCase())

    return {
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Please check current prices for the following assets: ${tickers.join(', ')}

Use the get_multiple_prices tool to get prices for all tickers.

Present the results in a clear table format:
- Ticker
- Current Price (USD)
- 24h Change (%)
- Timestamp

Keep it concise and easy to read.`,
          },
        },
      ],
    }
  }
)

server.registerPrompt(
  'trend_analysis',
  {
    title: 'Trend Analysis',
    description: 'Analyze trend direction and strength across multiple timeframes',
    argsSchema: {
      ticker: z.string().describe('Asset ticker to analyze (e.g., BTC, ETH, SOL)'),
      timeframes: z.string().optional().describe('Comma-separated timeframes to analyze (e.g., "1D,4H,1H" or "daily,4h,1h"). Default: all timeframes'),
    } as any,
  },
  async (args: any) => {
    const ticker = args.ticker.toUpperCase()
    const timeframes = args.timeframes ? args.timeframes.split(',').map((t: string) => t.trim()) : ['1D', '4H', '1H']

    return {
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Please perform trend analysis for ${ticker} across the following timeframes: ${timeframes.join(', ')}

Use the get_multitimeframe tool to get trend data for ${ticker}.

Analyze and present:
1. **Trend Direction per Timeframe**
   - Daily trend: UPTREND / DOWNTREND / SIDEWAYS
   - 4H trend: UPTREND / DOWNTREND / SIDEWAYS
   - 1H trend: UPTREND / DOWNTREND / SIDEWAYS

2. **Trend Strength**
   - Strong / Moderate / Weak for each timeframe
   - Overall trend alignment score

3. **EMA Analysis**
   - EMA9 vs EMA21 position for each timeframe
   - Golden Cross / Death Cross signals
   - Price position relative to EMAs

4. **Trend Consistency**
   - Are all timeframes aligned? (Yes/No)
   - If not aligned, which timeframes conflict?
   - Overall trend recommendation

5. **Trading Implications**
   - Best timeframe for entry (if aligned)
   - Risk level based on trend alignment
   - Recommended action: BUY / SELL / WAIT

Present the analysis clearly with timeframe comparison.`,
          },
        },
      ],
    }
  }
)

server.registerPrompt(
  'divergence_scan',
  {
    title: 'Divergence Scan',
    description: 'Scan for RSI and price divergences that indicate potential reversals',
    argsSchema: {
      tickers: z.string().describe('Comma-separated tickers to scan (e.g., "BTC,ETH,SOL")'),
    } as any,
  },
  async (args: any) => {
    const tickers = args.tickers.split(',').map((t: string) => t.trim().toUpperCase())

    return {
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Please scan for divergence patterns in the following assets: ${tickers.join(', ')}

For each ticker, use the get_divergence tool to check for:
1. RSI Divergence (bullish or bearish)
2. Price-Volume Divergence
3. MACD Divergence (if available)

Present results in a clear format:

**For each ticker:**
- Ticker: [TICKER]
- RSI Divergence: [BULLISH / BEARISH / NONE]
  - Description: [explanation]
  - Strength: [STRONG / MODERATE / WEAK]
- Price-Volume Divergence: [BULLISH / BEARISH / NONE]
  - Description: [explanation]
- Overall Divergence Signal: [BULLISH / BEARISH / NEUTRAL]
- Trading Recommendation: [BUY / SELL / WAIT]
- Confidence: [HIGH / MEDIUM / LOW]

**Summary:**
- List tickers with bullish divergence (potential BUY)
- List tickers with bearish divergence (potential SELL)
- Rank by divergence strength

Divergences are early reversal signals - use with caution and wait for confirmation.`,
          },
        },
      ],
    }
  }
)

server.registerPrompt(
  'liquidation_analysis',
  {
    title: 'Liquidation Analysis',
    description: 'Analyze liquidation levels and potential stop hunt zones',
    argsSchema: {
      ticker: z.string().describe('Asset ticker to analyze (e.g., BTC, ETH, SOL)'),
    } as any,
  },
  async (args: any) => {
    const ticker = args.ticker.toUpperCase()

    return {
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Please analyze liquidation levels for ${ticker}.

Use the get_liquidation_levels tool to get liquidation data.

Present the analysis:

1. **Liquidation Clusters**
   - Long liquidation levels (price zones with high long liquidations)
   - Short liquidation levels (price zones with high short liquidations)
   - Liquidation density map

2. **Current Price Position**
   - Distance to nearest long liquidation cluster
   - Distance to nearest short liquidation cluster
   - Risk of stop hunt in each direction

3. **Stop Hunt Potential**
   - Likelihood of stop hunt to the downside (for longs)
   - Likelihood of stop hunt to the upside (for shorts)
   - Estimated price zones for potential stop hunts

4. **Trading Implications**
   - If holding LONG: Risk of stop hunt below current price
   - If holding SHORT: Risk of stop hunt above current price
   - Recommended stop loss placement (away from liquidation clusters)
   - Entry opportunities after stop hunt (contrarian play)

5. **Risk Assessment**
   - Overall liquidation risk: [LOW / MEDIUM / HIGH]
   - Recommendation: [SAFE TO HOLD / REDUCE POSITION / WAIT FOR STOP HUNT]

Use this analysis to avoid placing stops near liquidation clusters and to identify potential reversal zones.`,
          },
        },
      ],
    }
  }
)

server.registerPrompt(
  'portfolio_review',
  {
    title: 'Portfolio Review',
    description: 'Review all open positions and provide portfolio status',
    argsSchema: {
      includeAnalysis: z.string().optional().describe('Include detailed analysis for each position (true/false, default: true)'),
    } as any,
  },
  async (args: any) => {
    const includeAnalysis = args.includeAnalysis !== 'false'

    return {
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Please review all open positions in the portfolio.

Use the get_position tool for each open position to get current status.

Present a comprehensive portfolio review:

1. **Portfolio Summary**
   - Total number of open positions
   - Total invested capital
   - Total unrealized P&L
   - Overall portfolio performance (%)

2. **Position Details (for each position)**
   - Ticker: [TICKER]
   - Side: [LONG / SHORT]
   - Entry Price: [PRICE]
   - Current Price: [PRICE]
   - Quantity: [QTY]
   - Unrealized P&L: [P&L USD] ([P&L %])
   - Leverage: [X]
   - Margin Used: [USD]
   - Stop Loss: [PRICE] (Distance: [%])
   - Take Profit: [PRICE] (Distance: [%])
   - Risk/Reward: [R:R]

${includeAnalysis ? `3. **Current Analysis (for each position)**
   - Current signal: [BUY / SELL / HOLD]
   - Trend alignment: [ALIGNED / NOT ALIGNED]
   - Risk level: [LOW / MEDIUM / HIGH]
   - Recommendation: [HOLD / CLOSE / REDUCE / ADD]` : ''}

4. **Portfolio Risk Assessment**
   - Total risk exposure (% of capital)
   - Average leverage across positions
   - Correlation risk (if multiple similar assets)
   - Overall portfolio risk: [LOW / MEDIUM / HIGH]

5. **Recommendations**
   - Positions to close (if any)
   - Positions to reduce (if any)
   - Positions to add to (if any)
   - Overall portfolio adjustments needed

Present in a clear, organized format with actionable recommendations.`,
          },
        },
      ],
    }
  }
)

server.registerPrompt(
  'market_overview',
  {
    title: 'Market Overview',
    description: 'Get comprehensive market overview for major crypto assets',
    argsSchema: {
      tickers: z.string().optional().describe('Comma-separated tickers (default: "BTC,ETH,SOL,BNB,XRP,ADA,DOGE,AVAX,MATIC,DOT")'),
    } as any,
  },
  async (args: any) => {
    const defaultTickers = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE', 'AVAX', 'MATIC', 'DOT']
    const tickers = args.tickers ? args.tickers.split(',').map((t: string) => t.trim().toUpperCase()) : defaultTickers

    return {
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Please provide a comprehensive market overview for: ${tickers.join(', ')}

Use get_multiple_prices to get current prices for all tickers.

Present a market overview report:

1. **Market Summary**
   - Total market cap (if available)
   - Number of assets analyzed
   - Overall market sentiment: [BULLISH / BEARISH / NEUTRAL]

2. **Price Performance Table**
   | Ticker | Price (USD) | 24h Change | Trend | Signal |
   |--------|-------------|------------|-------|--------|
   | ...    | ...         | ...        | ...   | ...    |

3. **Top Performers**
   - Best 24h gainers (top 3)
   - Worst 24h losers (bottom 3)

4. **Market Leaders**
   - BTC dominance trend
   - ETH performance vs BTC
   - Altcoin performance vs BTC

5. **Trading Opportunities**
   - Assets with strong BUY signals
   - Assets with strong SELL signals
   - Assets to watch (neutral but interesting)

6. **Market Conditions**
   - Overall volatility: [LOW / MEDIUM / HIGH]
   - Market structure: [TRENDING / RANGING]
   - Recommended strategy: [TREND FOLLOWING / MEAN REVERSION / WAIT]

Keep it concise but informative. Focus on actionable insights.`,
          },
        },
      ],
    }
  }
)

server.registerPrompt(
  'entry_exit_strategy',
  {
    title: 'Entry & Exit Strategy',
    description: 'Get optimal entry and exit strategy for a trading position',
    argsSchema: {
      ticker: z.string().describe('Asset ticker to analyze (e.g., BTC, ETH, SOL)'),
      side: z.string().describe('Trade side: LONG or SHORT'),
      capital: z.string().optional().describe('Trading capital in USD (default: 10000)'),
      riskPct: z.string().optional().describe('Risk percentage per trade (default: 1.0)'),
    } as any,
  },
  async (args: any) => {
    const ticker = args.ticker.toUpperCase()
    const side = args.side.toUpperCase()
    const capital = args.capital ? parseFloat(args.capital) : 10000
    const riskPct = args.riskPct ? parseFloat(args.riskPct) : 1.0

    return {
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Please provide optimal entry and exit strategy for ${ticker} ${side} position.

Use analisis_crypto tool with:
- ticker: ${ticker}
- capital: ${capital}
- riskPct: ${riskPct}

Then use calculate_risk_management and calculate_position_setup tools to get precise levels.

Present a detailed entry/exit strategy:

1. **Entry Strategy**
   - Optimal Entry Price: [PRICE]
   - Entry Zone: [PRICE_MIN] - [PRICE_MAX]
   - Entry Conditions:
     * [ ] RSI condition
     * [ ] Trend alignment
     * [ ] Volume confirmation
     * [ ] Support/Resistance level
   - Entry Timing: [IMMEDIATE / WAIT FOR PULLBACK / WAIT FOR BREAKOUT]

2. **Stop Loss Strategy**
   - Stop Loss Price: [PRICE]
   - Stop Loss Distance: [%] from entry
   - Stop Loss Type: [FIXED / ATR-BASED / SUPPORT-RESISTANCE]
   - Risk Amount: [USD] (${riskPct}% of capital)
   - Stop Loss Reasoning: [explanation]

3. **Take Profit Strategy**
   - TP1 (2:1 R:R): [PRICE] - [%] gain
   - TP2 (3:1 R:R): [PRICE] - [%] gain
   - TP3 (5:1 R:R): [PRICE] - [%] gain
   - Take Profit Method: [ALL AT ONCE / SCALING OUT / TRAILING STOP]

4. **Position Sizing**
   - Position Size: [QUANTITY] ${ticker}
   - Leverage: [X]
   - Margin Required: [USD]
   - Risk/Reward Ratio: [R:R]

5. **Exit Strategy**
   - When to exit early:
     * [ ] Stop loss hit
     * [ ] Trend reversal signal
     * [ ] Divergence signal
     * [ ] Support/Resistance break
   - When to hold:
     * [ ] Trend still intact
     * [ ] Volume supports continuation
     * [ ] Multi-timeframe alignment

6. **Risk Management**
   - Maximum loss: [USD]
   - Maximum gain (if all TPs hit): [USD]
   - Risk level: [LOW / MEDIUM / HIGH]
   - Position monitoring: [Check every X hours]

Present clear, actionable strategy with specific price levels and conditions.`,
          },
        },
      ],
    }
  }
)

server.registerPrompt(
  'volatility_analysis',
  {
    title: 'Volatility Analysis',
    description: 'Analyze volatility for risk management and position sizing',
    argsSchema: {
      ticker: z.string().describe('Asset ticker to analyze (e.g., BTC, ETH, SOL)'),
    } as any,
  },
  async (args: any) => {
    const ticker = args.ticker.toUpperCase()

    return {
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Please analyze volatility for ${ticker} to determine appropriate risk management.

Use get_indicator tool to get ATR (Average True Range) values for ${ticker}.

Present volatility analysis:

1. **Volatility Metrics**
   - ATR (14-period): [VALUE]
   - ATR %: [%] of current price
   - Volatility Level: [LOW / MEDIUM / HIGH / EXTREME]
   - Historical Comparison: [ABOVE / BELOW / AVERAGE] historical average

2. **Volatility Interpretation**
   - Current Market Regime: [LOW VOLATILITY / NORMAL / HIGH VOLATILITY / EXTREME]
   - Volatility Trend: [INCREASING / DECREASING / STABLE]
   - Expected Price Movement: [TIGHT RANGE / NORMAL / WIDE RANGE]

3. **Risk Management Implications**
   - Recommended Stop Loss Distance:
     * Conservative: [%] (1.5x ATR)
     * Moderate: [%] (2x ATR)
     * Aggressive: [%] (3x ATR)
   - Stop Loss in USD: [USD] from current price
   - Position Size Adjustment: [REDUCE / NORMAL / INCREASE] size due to volatility

4. **Leverage Recommendation**
   - Recommended Leverage: [X] (based on volatility)
   - Maximum Safe Leverage: [X]
   - Reasoning: [explanation based on ATR]

5. **Trading Strategy Adjustment**
   - If HIGH VOLATILITY:
     * Use wider stops
     * Reduce position size
     * Lower leverage
     * Wait for volatility to decrease
   - If LOW VOLATILITY:
     * Tighter stops possible
     * Normal position size
     * Normal leverage
     * Watch for volatility expansion

6. **Volatility-Based Entry/Exit**
   - Entry: Wait for volatility contraction (squeeze) before breakout
   - Exit: Consider exiting if volatility expands beyond normal range
   - Position Monitoring: [MORE FREQUENT / NORMAL] due to volatility

Use this analysis to adjust your risk management and position sizing accordingly.`,
          },
        },
      ],
    }
  }
)

// Register Additional Prompts for Complete Tool Coverage
server.registerPrompt(
  'technical_indicator_analysis',
  {
    title: 'Technical Indicator Analysis',
    description: 'Analyze specific technical indicators for trading decisions',
    argsSchema: {
      ticker: z.string().describe('Asset ticker to analyze (e.g., BTC, ETH, SOL)'),
      indicators: z.string().optional().describe('Comma-separated indicators to analyze (e.g., "RSI,EMA,MACD,BB"). If not provided, analyzes all available indicators'),
    } as any,
  },
  async (args: any) => {
    const ticker = args.ticker.toUpperCase()
    const indicators = args.indicators ? args.indicators.split(',').map((i: string) => i.trim().toUpperCase()) : ['RSI', 'EMA', 'MACD', 'BB', 'ATR', 'ADX', 'STOCH', 'CCI', 'WILLR', 'AROON', 'SAR', 'OBV']

    return {
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Please analyze technical indicators for ${ticker}. Use the get_indicator tool to get: ${indicators.join(', ')}. Present: 1) Indicator values and signals, 2) Trading signals (BUY/SELL/HOLD), 3) Indicator combination analysis, 4) Entry/exit recommendations.`,
          },
        },
      ],
    }
  }
)

server.registerPrompt(
  'volume_profile_analysis',
  {
    title: 'Volume Profile Analysis',
    description: 'Analyze volume profile to identify key support/resistance levels',
    argsSchema: {
      ticker: z.string().describe('Asset ticker to analyze (e.g., BTC, ETH, SOL)'),
    } as any,
  },
  async (args: any) => {
    const ticker = args.ticker.toUpperCase()
    return {
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Analyze volume profile for ${ticker} using get_volume_profile. Present: POC, VAH/VAL, HVN/LVN, current price position, support/resistance levels, and trading strategy with entry/exit zones.`,
          },
        },
      ],
    }
  }
)

server.registerPrompt(
  'orderbook_analysis',
  {
    title: 'Order Book Analysis',
    description: 'Analyze order book depth to identify support/resistance and market sentiment',
    argsSchema: {
      ticker: z.string().describe('Asset ticker to analyze (e.g., BTC, ETH, SOL)'),
    } as any,
  },
  async (args: any) => {
    const ticker = args.ticker.toUpperCase()
    return {
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Analyze order book for ${ticker} using get_orderbook_depth. Present: bid/ask volumes, support/resistance walls, market sentiment, trading implications, entry/exit strategy, and liquidity analysis.`,
          },
        },
      ],
    }
  }
)

server.registerPrompt(
  'market_structure_analysis',
  {
    title: 'Market Structure Analysis',
    description: 'Analyze market structure to identify trend changes and trading opportunities',
    argsSchema: {
      ticker: z.string().describe('Asset ticker to analyze (e.g., BTC, ETH, SOL)'),
    } as any,
  },
  async (args: any) => {
    const ticker = args.ticker.toUpperCase()
    return {
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Analyze market structure for ${ticker} using get_market_structure. Present: structure type, COC signals, swing patterns, support/resistance, trading implications, and entry strategy.`,
          },
        },
      ],
    }
  }
)

server.registerPrompt(
  'candlestick_pattern_analysis',
  {
    title: 'Candlestick Pattern Analysis',
    description: 'Analyze candlestick patterns to identify reversal and continuation signals',
    argsSchema: {
      ticker: z.string().describe('Asset ticker to analyze (e.g., BTC, ETH, SOL)'),
    } as any,
  },
  async (args: any) => {
    const ticker = args.ticker.toUpperCase()
    return {
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Analyze candlestick patterns for ${ticker} using get_candlestick_patterns. Present: detected patterns, pattern interpretation, reversal/continuation signals, trading signals, and entry/exit strategy.`,
          },
        },
      ],
    }
  }
)

server.registerPrompt(
  'external_data_analysis',
  {
    title: 'External Data Analysis',
    description: 'Analyze external market data: funding rate, open interest, volatility',
    argsSchema: {
      ticker: z.string().describe('Asset ticker to analyze (e.g., BTC, ETH, SOL)'),
    } as any,
  },
  async (args: any) => {
    const ticker = args.ticker.toUpperCase()
    return {
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Analyze external data for ${ticker} using get_external_data. Present: funding rate analysis, open interest trends, market sentiment, volatility, trading implications, and risk assessment.`,
          },
        },
      ],
    }
  }
)

server.registerPrompt(
  'spot_futures_arbitrage',
  {
    title: 'Spot-Futures Arbitrage Analysis',
    description: 'Analyze spot-futures divergence for arbitrage opportunities',
    argsSchema: {
      ticker: z.string().describe('Asset ticker to analyze (e.g., BTC, ETH, SOL)'),
    } as any,
  },
  async (args: any) => {
    const ticker = args.ticker.toUpperCase()
    return {
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Analyze spot-futures divergence for ${ticker} using get_spot_futures_divergence. Present: price comparison, divergence analysis, arbitrage opportunities, trading signals, and recommendations.`,
          },
        },
      ],
    }
  }
)

server.registerPrompt(
  'long_short_sentiment',
  {
    title: 'Long/Short Sentiment Analysis',
    description: 'Analyze long/short ratio to gauge market sentiment',
    argsSchema: {
      ticker: z.string().describe('Asset ticker to analyze (e.g., BTC, ETH, SOL)'),
    } as any,
  },
  async (args: any) => {
    const ticker = args.ticker.toUpperCase()
    return {
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Analyze long/short sentiment for ${ticker} using get_long_short_ratio. Present: ratio analysis, market sentiment, historical context, trading implications, risk assessment, and contrarian signals.`,
          },
        },
      ],
    }
  }
)

server.registerPrompt(
  'fibonacci_trading_strategy',
  {
    title: 'Fibonacci Trading Strategy',
    description: 'Use Fibonacci retracement levels for entry, stop loss, and take profit',
    argsSchema: {
      ticker: z.string().describe('Asset ticker to analyze (e.g., BTC, ETH, SOL)'),
    } as any,
  },
  async (args: any) => {
    const ticker = args.ticker.toUpperCase()
    return {
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Analyze Fibonacci retracement for ${ticker} using get_fibonacci. Present: Fibonacci levels, current price position, trading signals, support/resistance, entry strategy, stop loss/take profit, and risk/reward.`,
          },
        },
      ],
    }
  }
)

server.registerPrompt(
  'multi_asset_comparison',
  {
    title: 'Multi-Asset Comparison',
    description: 'Compare multiple assets across various metrics to identify best opportunities',
    argsSchema: {
      tickers: z.string().describe('Comma-separated tickers to compare (e.g., "BTC,ETH,SOL,BNB")'),
      metrics: z.string().optional().describe('Comma-separated metrics (e.g., "price,volume,rsi,trend"). Default: all'),
    } as any,
  },
  async (args: any) => {
    const tickers = args.tickers.split(',').map((t: string) => t.trim().toUpperCase())
    return {
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Compare assets: ${tickers.join(', ')}. Use get_multiple_prices, get_multiple_indicators, get_multiple_volume_analysis, get_multiple_multitimeframe, and analisis_multiple_crypto. Present: price comparison, technical comparison, signal comparison, risk/reward comparison, overall ranking, and top 3 recommendations.`,
          },
        },
      ],
    }
  }
)

// Register Additional Resource Templates
server.registerResource(
  'technical-indicators-guide',
  'geartrade://docs/technical-indicators',
  {
    description: 'Complete guide on technical indicators available in GearTrade: RSI, EMA, MACD, Bollinger Bands, ATR, ADX, and more',
    mimeType: 'text/markdown',
  },
  async () => {
    return {
      contents: [
        {
          uri: 'geartrade://docs/technical-indicators',
          mimeType: 'text/markdown',
          text: `# Technical Indicators Guide

## Overview

GearTrade MCP Server provides access to 20+ technical indicators for comprehensive market analysis. This guide explains each indicator, its interpretation, and trading applications.

## Momentum Indicators

### RSI (Relative Strength Index)
- **Range**: 0-100
- **Oversold**: <30 (potential BUY signal)
- **Overbought**: >70 (potential SELL signal)
- **Neutral**: 30-70
- **Usage**: Identify reversal points, confirm trends
- **Timeframes**: RSI14 (14-period), RSI7 (7-period), RSI4h (4-hour)

### Stochastic Oscillator
- **Range**: 0-100
- **Oversold**: <20
- **Overbought**: >80
- **Usage**: Momentum indicator, works well with RSI
- **Components**: %K (fast), %D (slow)

### CCI (Commodity Channel Index)
- **Range**: -100 to +100
- **Oversold**: <-100
- **Overbought**: >+100
- **Usage**: Identify cyclical trends, breakouts

### Williams %R
- **Range**: -100 to 0
- **Oversold**: <-80
- **Overbought**: >-20
- **Usage**: Momentum indicator, similar to Stochastic

## Trend Indicators

### EMA (Exponential Moving Average)
- **Common Periods**: EMA9, EMA21, EMA50, EMA100, EMA200
- **Golden Cross**: EMA9 > EMA21 (bullish)
- **Death Cross**: EMA9 < EMA21 (bearish)
- **Usage**: Identify trend direction, support/resistance levels

### MACD (Moving Average Convergence Divergence)
- **Components**: MACD line, Signal line, Histogram
- **Bullish**: MACD crosses above Signal
- **Bearish**: MACD crosses below Signal
- **Usage**: Trend confirmation, momentum shifts

### ADX (Average Directional Index)
- **Range**: 0-100
- **Strong Trend**: >25
- **Weak Trend**: <20
- **Usage**: Measure trend strength (not direction)

### Parabolic SAR
- **Above Price**: Bearish trend
- **Below Price**: Bullish trend
- **Usage**: Trend following, stop loss placement

### Aroon Indicator
- **Aroon Up**: Measures uptrend strength (0-100)
- **Aroon Down**: Measures downtrend strength (0-100)
- **Usage**: Identify trend changes, consolidation periods

## Volatility Indicators

### Bollinger Bands
- **Components**: Upper band, Middle band (SMA20), Lower band
- **Squeeze**: Bands narrow (low volatility, potential breakout)
- **Expansion**: Bands widen (high volatility)
- **Usage**: Identify overbought/oversold, volatility changes

### ATR (Average True Range)
- **Usage**: Measure volatility, set stop loss levels
- **Stop Loss**: 1.5x-3x ATR from entry
- **High ATR**: High volatility (wider stops)
- **Low ATR**: Low volatility (tighter stops)

## Volume Indicators

### OBV (On-Balance Volume)
- **Rising OBV**: Accumulation (bullish)
- **Falling OBV**: Distribution (bearish)
- **Usage**: Confirm price trends, detect divergences

### VWAP (Volume Weighted Average Price)
- **Above VWAP**: Bullish intraday
- **Below VWAP**: Bearish intraday
- **Usage**: Intraday trading, institutional price levels

### CVD (Cumulative Volume Delta)
- **Positive CVD**: Buying pressure
- **Negative CVD**: Selling pressure
- **Usage**: Early trend detection, divergence analysis

## Support & Resistance

### Support/Resistance Levels
- **Support**: Price level where buying interest is strong
- **Resistance**: Price level where selling interest is strong
- **Usage**: Entry/exit points, stop loss placement

### Fibonacci Retracement
- **Key Levels**: 23.6%, 38.2%, 50%, 61.8%, 78.6%
- **Usage**: Identify potential reversal zones
- **Calculation**: Based on swing highs and lows

## Multi-Timeframe Analysis

### Timeframes Available
- **Daily (1D)**: Long-term trend
- **4-Hour (4H)**: Medium-term trend
- **1-Hour (1H)**: Short-term trend

### Trend Alignment
- **Aligned**: All timeframes trending same direction (high confidence)
- **Not Aligned**: Mixed signals (lower confidence)
- **Usage**: Confirm trade setups, filter false signals

## Indicator Combinations

### High-Confidence BUY Setup
- RSI <30 (oversold)
- Price at support level
- EMA9 > EMA21 (uptrend)
- Positive CVD trend
- Multi-timeframe alignment (bullish)

### High-Confidence SELL Setup
- RSI >70 (overbought)
- Price at resistance level
- EMA9 < EMA21 (downtrend)
- Negative CVD trend
- Multi-timeframe alignment (bearish)

## Best Practices

1. **Never rely on single indicator** - Use multiple confirmations
2. **Combine different indicator types** - Momentum + Trend + Volume
3. **Use multi-timeframe analysis** - Confirm on higher timeframes
4. **Watch for divergences** - Price vs indicator divergence = early signal
5. **Respect market context** - Indicators work better in trending vs ranging markets

## Common Mistakes

1. ❌ Using too many indicators (analysis paralysis)
2. ❌ Ignoring volume confirmation
3. ❌ Trading against the trend
4. ❌ Not using multi-timeframe confirmation
5. ❌ Ignoring divergences
`,
        },
      ],
    }
  }
)

server.registerResource(
  'hyperliquid-api-reference',
  'geartrade://docs/hyperliquid-api',
  {
    description: 'Hyperliquid API reference guide: endpoints, authentication, order types, and integration details',
    mimeType: 'text/markdown',
  },
  async () => {
    return {
      contents: [
        {
          uri: 'geartrade://docs/hyperliquid-api',
          mimeType: 'text/markdown',
          text: `# Hyperliquid API Reference

## Overview

GearTrade MCP Server integrates with Hyperliquid DEX for perpetual futures trading. This guide covers API endpoints, authentication, and order execution.

## Authentication

### EIP-712 Signing
- **Standard**: EIP-712 typed data signing
- **Purpose**: Secure order submission without exposing private keys
- **Implementation**: Automatic in \`get_execution_spot\` and \`get_execution_futures\` tools

### Credentials
- **Account Address**: Your Hyperliquid wallet address (0x format)
- **Wallet API Key**: Your private key for signing (keep secure!)
- **Note**: Credentials can be provided via tool parameters (multi-user support)

## Order Types

### Market Orders
- **Execution**: Immediate at best available price
- **Slippage**: May occur during high volatility
- **Usage**: Fast execution, no price guarantee

### Limit Orders
- **Execution**: Only at specified price or better
- **Slippage**: None (price guaranteed)
- **Usage**: Price control, may not fill immediately

## Order Sides

### LONG (Buy)
- **Action**: Open long position or close short position
- **Profit**: When price increases
- **Usage**: Bullish market outlook

### SHORT (Sell)
- **Action**: Open short position or close long position
- **Profit**: When price decreases
- **Usage**: Bearish market outlook

## Leverage

### Available Leverage
- **Range**: 1x to 50x
- **Spot Trading**: 1x (no leverage)
- **Futures Trading**: 1x-50x

### Leverage Guidelines
- **Conservative**: 1x-3x
- **Moderate**: 3x-10x
- **Aggressive**: 10x-50x (high risk!)

### Dynamic Leverage
- Use \`calculate_dynamic_leverage\` tool
- Based on volatility (ATR), market conditions
- Recommended: Lower leverage in high volatility

## Position Management

### Position Sizing
- **Risk-Based**: 1-2% of capital per trade
- **Calculation**: Use \`calculate_position_setup\` tool
- **Formula**: (Capital × Risk %) / (Entry - Stop Loss)

### Stop Loss
- **Fixed**: 1-3% from entry
- **ATR-Based**: 1.5x-3x ATR
- **Support/Resistance**: Below support (longs) or above resistance (shorts)

### Take Profit
- **Risk/Reward**: Minimum 2:1, recommended 3:1
- **Multiple Levels**: TP1 (2:1), TP2 (3:1), TP3 (5:1)
- **Trailing Stop**: Move stop to breakeven after TP1

## API Endpoints

### Price Data
- **Real-time Price**: \`get_price\` tool
- **Multiple Prices**: \`get_multiple_prices\` tool
- **Source**: Hyperliquid and Binance APIs

### Market Data
- **Funding Rate**: Real-time funding rate with trend
- **Open Interest**: Total open positions
- **Volume**: 24h volume and trends

### Order Execution
- **Spot Trading**: \`get_execution_spot\` (1x leverage)
- **Futures Trading**: \`get_execution_futures\` (1-50x leverage)
- **Paper Trading**: Default mode (safe testing)
- **Live Trading**: Requires \`execute: true\` and \`useLiveExecutor: true\`

## Safety Features

### Paper Trading (Default)
- **Purpose**: Test strategies without real money
- **Slippage Modeling**: Realistic execution simulation
- **Usage**: Always test before live trading

### Multi-Asset Execution
- **Default**: Paper trading (safety)
- **Reason**: Multiple simultaneous executions = higher risk
- **Override**: Explicit \`execute: true\` required

### User Confirmation
- **Required**: Always get user confirmation before live execution
- **Best Practice**: Present analysis, ask "Mau dieksekusi ke Hyperliquid? (YES/NO)"

## Error Handling

### Common Errors
- **Insufficient Balance**: Not enough funds for order
- **Invalid Leverage**: Leverage exceeds limits
- **Market Closed**: Trading not available
- **Network Error**: API connection issues

### Error Recovery
- **Retry Logic**: Automatic retry for network errors
- **User Notification**: Clear error messages
- **Fallback**: Paper trading if live execution fails

## Best Practices

1. **Always test with paper trading first**
2. **Start with small position sizes**
3. **Use appropriate leverage for volatility**
4. **Set stop loss on every trade**
5. **Monitor positions actively**
6. **Respect risk limits (1-2% per trade)**
7. **Get user confirmation before live execution**

## Rate Limits

- **Price Data**: No strict limits (cached)
- **Order Execution**: Follow Hyperliquid rate limits
- **Best Practice**: Avoid rapid-fire orders

## Security

- **Never share private keys**
- **Use environment variables or tool parameters**
- **Multi-user support**: Each user provides own credentials
- **EIP-712 signing**: Secure without exposing keys
`,
        },
      ],
    }
  }
)

server.registerResource(
  'market-analysis-patterns',
  'geartrade://docs/market-patterns',
  {
    description: 'Common market analysis patterns: chart patterns, candlestick patterns, and market structure analysis',
    mimeType: 'text/markdown',
  },
  async () => {
    return {
      contents: [
        {
          uri: 'geartrade://docs/market-patterns',
          mimeType: 'text/markdown',
          text: `# Market Analysis Patterns Guide

## Overview

This guide covers common market patterns, chart formations, and market structure analysis techniques available in GearTrade MCP Server.

## Candlestick Patterns

### Reversal Patterns

#### Doji
- **Appearance**: Open and close are nearly equal
- **Signal**: Indecision, potential reversal
- **Usage**: Wait for confirmation on next candle

#### Hammer
- **Appearance**: Small body, long lower wick
- **Signal**: Bullish reversal (at support)
- **Usage**: Enter long after confirmation

#### Shooting Star
- **Appearance**: Small body, long upper wick
- **Signal**: Bearish reversal (at resistance)
- **Usage**: Enter short after confirmation

#### Engulfing Patterns
- **Bullish Engulfing**: Large green candle engulfs previous red
- **Bearish Engulfing**: Large red candle engulfs previous green
- **Signal**: Strong reversal signal
- **Usage**: High-confidence reversal entry

### Continuation Patterns

#### Three White Soldiers
- **Appearance**: Three consecutive green candles
- **Signal**: Strong uptrend continuation
- **Usage**: Add to long positions

#### Three Black Crows
- **Appearance**: Three consecutive red candles
- **Signal**: Strong downtrend continuation
- **Usage**: Add to short positions

## Chart Patterns

### Trend Patterns

#### Ascending Triangle
- **Formation**: Higher lows, horizontal resistance
- **Signal**: Bullish breakout expected
- **Entry**: On breakout above resistance

#### Descending Triangle
- **Formation**: Lower highs, horizontal support
- **Signal**: Bearish breakdown expected
- **Entry**: On breakdown below support

#### Symmetrical Triangle
- **Formation**: Converging support and resistance
- **Signal**: Breakout direction uncertain
- **Entry**: Wait for breakout confirmation

### Reversal Patterns

#### Head and Shoulders
- **Formation**: Three peaks, middle highest
- **Signal**: Bearish reversal
- **Entry**: On neckline breakdown

#### Inverse Head and Shoulders
- **Formation**: Three troughs, middle lowest
- **Signal**: Bullish reversal
- **Entry**: On neckline breakout

#### Double Top
- **Formation**: Two similar peaks
- **Signal**: Bearish reversal
- **Entry**: On breakdown below support

#### Double Bottom
- **Formation**: Two similar troughs
- **Signal**: Bullish reversal
- **Entry**: On breakout above resistance

## Market Structure

### Change of Character (COC)
- **Definition**: Shift in market structure (uptrend to downtrend or vice versa)
- **Detection**: Use \`get_market_structure\` tool
- **Signal**: Potential trend reversal
- **Usage**: Early warning for trend changes

### Swing Patterns
- **Swing High**: Local price peak
- **Swing Low**: Local price trough
- **Usage**: Identify trend direction, support/resistance

### Structure Strength
- **Strong Structure**: Clear trend with consistent swings
- **Weak Structure**: Choppy, ranging market
- **Usage**: Determine if trend-following or mean-reversion strategy

## Volume Patterns

### Volume Profile Patterns

#### POC (Point of Control)
- **Definition**: Price level with highest volume
- **Usage**: Strong support/resistance level
- **Trading**: Trade from POC to value area boundaries

#### Value Area
- **VAH (Value Area High)**: Upper boundary
- **VAL (Value Area Low)**: Lower boundary
- **Usage**: Identify fair value zone
- **Trading**: Price tends to return to value area

#### HVN/LVN (High/Low Volume Nodes)
- **HVN**: High volume price levels (support/resistance)
- **LVN**: Low volume price levels (quick price movement)
- **Usage**: Identify liquidity zones

### Volume Analysis Patterns

#### Accumulation
- **Pattern**: Increasing volume on up moves
- **Signal**: Bullish, smart money buying
- **Usage**: Enter long positions

#### Distribution
- **Pattern**: Increasing volume on down moves
- **Signal**: Bearish, smart money selling
- **Usage**: Enter short positions

#### Volume Divergence
- **Pattern**: Price makes new high/low, volume doesn't confirm
- **Signal**: Weak move, potential reversal
- **Usage**: Early reversal signal

## Order Book Patterns

### Bid/Ask Imbalance
- **Large Bid Wall**: Strong support, potential bounce
- **Large Ask Wall**: Strong resistance, potential rejection
- **Usage**: Short-term direction indicator

### Order Flow
- **Buying Pressure**: More buy orders than sell
- **Selling Pressure**: More sell orders than buy
- **Usage**: Immediate market sentiment

### Spread Analysis
- **Tight Spread**: High liquidity, low slippage
- **Wide Spread**: Low liquidity, high slippage
- **Usage**: Execution quality indicator

## Fibonacci Patterns

### Retracement Levels
- **23.6%**: Shallow retracement
- **38.2%**: Normal retracement
- **50%**: Psychological level
- **61.8%**: Deep retracement (golden ratio)
- **Usage**: Entry zones, support/resistance

### Extension Levels
- **127.2%**: First extension
- **161.8%**: Golden ratio extension
- **200%**: Double extension
- **Usage**: Take profit targets

## Divergence Patterns

### RSI Divergence
- **Bullish Divergence**: Price makes lower low, RSI makes higher low
- **Bearish Divergence**: Price makes higher high, RSI makes lower high
- **Signal**: Early reversal indicator
- **Usage**: Enter before price reversal

### Price-Volume Divergence
- **Pattern**: Price and volume move in opposite directions
- **Signal**: Weak trend, potential reversal
- **Usage**: Confirm with other indicators

## Liquidation Patterns

### Liquidation Clusters
- **Definition**: Concentration of stop losses
- **Detection**: Use \`get_liquidation_levels\` tool
- **Usage**: Identify potential stop hunt zones

### Stop Hunt
- **Pattern**: Price moves to liquidate positions before reversing
- **Signal**: Contrarian opportunity
- **Usage**: Enter opposite direction after liquidation

## Best Practices

1. **Wait for pattern confirmation** - Don't enter on pattern formation alone
2. **Combine multiple patterns** - Higher confidence with multiple confirmations
3. **Use volume confirmation** - Patterns work better with volume support
4. **Respect market structure** - Patterns work better in trending markets
5. **Set appropriate stop loss** - Patterns can fail, protect capital

## Common Mistakes

1. ❌ Entering before pattern confirmation
2. ❌ Ignoring volume confirmation
3. ❌ Trading patterns in ranging markets
4. ❌ Not setting stop loss
5. ❌ Over-trading on every pattern
`,
        },
      ],
    }
  }
)

server.registerResource(
  'common-trading-mistakes',
  'geartrade://docs/common-mistakes',
  {
    description: 'Common trading mistakes to avoid: emotional trading, over-leveraging, ignoring risk management, and more',
    mimeType: 'text/markdown',
  },
  async () => {
    return {
      contents: [
        {
          uri: 'geartrade://docs/common-mistakes',
          mimeType: 'text/markdown',
          text: `# Common Trading Mistakes to Avoid

## Overview

This guide lists common trading mistakes and how to avoid them. Learning from these mistakes can significantly improve your trading performance.

## Risk Management Mistakes

### ❌ Not Setting Stop Loss
- **Problem**: Unlimited downside risk
- **Solution**: Always set stop loss (1-3% from entry)
- **Tool**: Use \`calculate_risk_management\` tool

### ❌ Risking Too Much Per Trade
- **Problem**: Large losses can wipe out account
- **Solution**: Never risk more than 1-2% per trade
- **Tool**: Use \`calculate_position_setup\` tool

### ❌ Moving Stop Loss Against Position
- **Problem**: Turning small loss into large loss
- **Solution**: Only move stop loss in profit direction
- **Exception**: Trailing stop to lock in profits

### ❌ Ignoring Risk/Reward Ratio
- **Problem**: Taking trades with poor R:R
- **Solution**: Minimum 2:1, recommended 3:1
- **Tool**: Use \`calculate_risk_management\` tool

## Leverage Mistakes

### ❌ Over-Leveraging
- **Problem**: Small price move = large loss
- **Solution**: Use appropriate leverage (1x-10x for most traders)
- **Tool**: Use \`calculate_dynamic_leverage\` tool

### ❌ Using Same Leverage for All Markets
- **Problem**: High volatility markets need lower leverage
- **Solution**: Adjust leverage based on volatility (ATR)
- **Tool**: Use \`calculate_dynamic_leverage\` tool

### ❌ Ignoring Margin Requirements
- **Problem**: Forced liquidation
- **Solution**: Maintain 150-200% of required margin
- **Tool**: Use \`calculate_dynamic_margin_percentage\` tool

## Analysis Mistakes

### ❌ Trading Without Analysis
- **Problem**: Random entries, poor results
- **Solution**: Always use comprehensive analysis
- **Tool**: Use \`analisis_crypto\` tool before trading

### ❌ Ignoring Multi-Timeframe Analysis
- **Problem**: Trading against higher timeframe trend
- **Solution**: Check Daily, 4H, and 1H alignment
- **Tool**: Use \`get_multitimeframe\` tool

### ❌ Not Waiting for Confirmation
- **Problem**: Entering too early, false signals
- **Solution**: Wait for multiple confirmations
- **Best Practice**: RSI + Volume + Trend alignment

### ❌ Ignoring Volume Analysis
- **Problem**: Missing important market signals
- **Solution**: Always check volume trends
- **Tool**: Use \`get_volume_analysis\` tool

## Execution Mistakes

### ❌ Executing Without User Confirmation
- **Problem**: Unauthorized trades, user frustration
- **Solution**: Always ask "Mau dieksekusi ke Hyperliquid? (YES/NO)"
- **Best Practice**: Present analysis first, then ask

### ❌ Skipping Paper Trading
- **Problem**: Testing strategies with real money
- **Solution**: Always test with paper trading first
- **Default**: All execution tools default to paper trading

### ❌ Not Monitoring Positions
- **Problem**: Missing exit signals, large losses
- **Solution**: Actively monitor open positions
- **Tool**: Use \`get_position\` tool regularly

### ❌ Trading During High Volatility
- **Problem**: Increased slippage, wider stops
- **Solution**: Avoid trading during extreme volatility
- **Indicator**: High ATR = high volatility

## Emotional Mistakes

### ❌ FOMO (Fear of Missing Out)
- **Problem**: Entering trades out of fear
- **Solution**: Stick to your strategy, wait for setups
- **Reminder**: There's always another opportunity

### ❌ Revenge Trading
- **Problem**: Trying to recover losses quickly
- **Solution**: Take a break after losses, review strategy
- **Best Practice**: Maximum 2-3 trades per day

### ❌ Greed
- **Problem**: Holding winners too long, not taking profits
- **Solution**: Use take profit levels, trail stop loss
- **Tool**: Use \`calculate_risk_management\` for TP levels

### ❌ Fear
- **Problem**: Exiting winners too early, not taking trades
- **Solution**: Trust your analysis, follow the plan
- **Reminder**: Risk is managed with stop loss

## Strategy Mistakes

### ❌ Changing Strategy After Losses
- **Problem**: No consistent approach
- **Solution**: Stick to one strategy, improve it
- **Best Practice**: Backtest before changing

### ❌ Over-Trading
- **Problem**: Too many trades, overtrading
- **Solution**: Quality over quantity
- **Best Practice**: 1-3 high-quality setups per day

### ❌ Trading Against the Trend
- **Problem**: Fighting the market
- **Solution**: Trade with the trend
- **Tool**: Use \`get_multitimeframe\` to identify trend

### ❌ Not Diversifying
- **Problem**: All capital in one trade
- **Solution**: Spread risk across multiple positions
- **Best Practice**: Max 3-5 positions at once

## Technical Mistakes

### ❌ Using Too Many Indicators
- **Problem**: Analysis paralysis, conflicting signals
- **Solution**: Use 3-5 key indicators
- **Recommended**: RSI, EMA, Volume, Multi-timeframe

### ❌ Ignoring Divergences
- **Problem**: Missing early reversal signals
- **Solution**: Always check for divergences
- **Tool**: Use \`get_divergence\` tool

### ❌ Not Using Stop Loss Based on ATR
- **Problem**: Fixed stops don't account for volatility
- **Solution**: Use ATR-based stops (1.5x-3x ATR)
- **Tool**: Use \`get_indicator\` for ATR values

### ❌ Ignoring Market Structure
- **Problem**: Trading in wrong market regime
- **Solution**: Adapt strategy to market structure
- **Tool**: Use \`get_market_structure\` tool

## How to Avoid Mistakes

### Pre-Trade Checklist
- [ ] Comprehensive analysis completed
- [ ] Multi-timeframe alignment checked
- [ ] Volume analysis confirms signal
- [ ] Risk management calculated (1-2% risk)
- [ ] Stop loss set (1-3% from entry)
- [ ] Take profit set (2:1+ R:R)
- [ ] Leverage appropriate for volatility
- [ ] User confirmation obtained

### Post-Trade Review
- [ ] Review what went right
- [ ] Review what went wrong
- [ ] Identify mistakes made
- [ ] Plan improvements
- [ ] Update strategy if needed

## Recovery from Mistakes

### After a Loss
1. **Take a break** - Don't revenge trade
2. **Review the trade** - What went wrong?
3. **Identify the mistake** - Was it analysis, execution, or risk?
4. **Learn from it** - How to avoid next time?
5. **Return with plan** - Don't repeat the mistake

### After Multiple Losses
1. **Stop trading** - Take a longer break
2. **Review all trades** - Find common mistakes
3. **Revise strategy** - Fix identified issues
4. **Paper trade** - Test revised strategy
5. **Return gradually** - Start with smaller positions

## Key Takeaways

1. **Risk management is non-negotiable** - Always set stop loss
2. **Analysis before execution** - Never trade blindly
3. **Emotions kill profits** - Stick to the plan
4. **Learn from mistakes** - Every loss is a lesson
5. **Consistency matters** - Stick to your strategy
`,
        },
      ],
    }
  }
)

server.registerResource(
  'position-sizing-guide',
  'geartrade://docs/position-sizing',
  {
    description: 'Complete guide on position sizing, leverage calculation, and margin management for optimal risk control',
    mimeType: 'text/markdown',
  },
  async () => {
    return {
      contents: [
        {
          uri: 'geartrade://docs/position-sizing',
          mimeType: 'text/markdown',
          text: `# Position Sizing Guide

## Overview

Proper position sizing is critical for long-term trading success. This guide covers position sizing formulas, leverage management, and margin calculations.

## Risk-Based Position Sizing

### Basic Formula
\`\`\`
Position Size = (Capital × Risk %) / (Entry Price - Stop Loss Price)
\`\`\`

### Example
- Capital: $10,000
- Risk: 1% = $100
- Entry: $50,000
- Stop Loss: $49,000 (2% below entry)
- Position Size = $100 / $1,000 = 0.1 BTC

## Leverage Management

### Leverage Guidelines
- **Conservative**: 1x-3x (low risk, steady growth)
- **Moderate**: 3x-10x (balanced risk/reward)
- **Aggressive**: 10x-50x (high risk, high reward)

### Dynamic Leverage
- Use \`calculate_dynamic_leverage\` tool
- Based on volatility (ATR)
- Lower leverage in high volatility
- Higher leverage in low volatility

## Margin Requirements

### Margin Calculation
\`\`\`
Margin = Position Size × Entry Price / Leverage
\`\`\`

### Margin Safety
- Maintain 150-200% of required margin
- Avoid margin calls
- Use \`calculate_dynamic_margin_percentage\` tool

## Position Sizing Tools

### calculate_position_setup
- Calculates optimal position size
- Considers risk percentage
- Includes leverage and margin
- Provides quantity and USD value

### calculate_risk_management
- Calculates stop loss levels
- Sets take profit targets
- Determines risk/reward ratio
- Provides risk amount in USD

## Best Practices

1. **Never risk more than 1-2% per trade**
2. **Adjust position size based on volatility**
3. **Use lower leverage in uncertain markets**
4. **Maintain adequate margin buffer**
5. **Scale position size with account growth**
`,
        },
      ],
    }
  }
)

server.registerResource(
  'multi-timeframe-guide',
  'geartrade://docs/multi-timeframe',
  {
    description: 'Complete guide on multi-timeframe analysis: how to use Daily, 4H, and 1H timeframes for better trading decisions',
    mimeType: 'text/markdown',
  },
  async () => {
    return {
      contents: [
        {
          uri: 'geartrade://docs/multi-timeframe',
          mimeType: 'text/markdown',
          text: `# Multi-Timeframe Analysis Guide

## Overview

Multi-timeframe analysis is essential for high-probability trading. This guide explains how to use different timeframes effectively.

## Timeframe Hierarchy

### Daily (1D)
- **Purpose**: Long-term trend direction
- **Use**: Identify major trend, support/resistance
- **Trading**: Swing trades, position trades

### 4-Hour (4H)
- **Purpose**: Medium-term trend and entries
- **Use**: Confirm daily trend, find entry zones
- **Trading**: Day trades, swing trades

### 1-Hour (1H)
- **Purpose**: Short-term entries and exits
- **Use**: Precise entry timing, stop placement
- **Trading**: Day trades, scalping

## Trend Alignment

### Perfect Alignment (Highest Confidence)
- Daily: UPTREND
- 4H: UPTREND
- 1H: UPTREND
- **Action**: Strong BUY signal

### Partial Alignment (Medium Confidence)
- Daily: UPTREND
- 4H: UPTREND
- 1H: DOWNTREND (pullback)
- **Action**: Wait for 1H to align, then BUY

### No Alignment (Low Confidence)
- Daily: UPTREND
- 4H: DOWNTREND
- 1H: DOWNTREND
- **Action**: Avoid trading, wait for alignment

## Trading Strategy

### Top-Down Approach
1. **Daily**: Identify major trend
2. **4H**: Confirm trend, find entry zone
3. **1H**: Execute entry at optimal price

### Bottom-Up Approach
1. **1H**: Find short-term setup
2. **4H**: Check if aligns with medium trend
3. **Daily**: Confirm major trend direction

## Best Practices

1. **Always check higher timeframe first**
2. **Trade with the trend on higher timeframe**
3. **Use lower timeframe for entry timing**
4. **Wait for alignment for high-confidence trades**
5. **Avoid trading against higher timeframe trend**
`,
        },
      ],
    }
  }
)

server.registerResource(
  'execution-best-practices',
  'geartrade://docs/execution-practices',
  {
    description: 'Best practices for order execution: market vs limit orders, slippage management, and execution timing',
    mimeType: 'text/markdown',
  },
  async () => {
    return {
      contents: [
        {
          uri: 'geartrade://docs/execution-practices',
          mimeType: 'text/markdown',
          text: `# Execution Best Practices

## Overview

Proper execution is crucial for trading success. This guide covers order types, execution timing, and slippage management.

## Order Types

### Market Orders
- **Pros**: Immediate execution, guaranteed fill
- **Cons**: No price control, potential slippage
- **Use**: When speed is critical, small positions

### Limit Orders
- **Pros**: Price control, no slippage
- **Cons**: May not fill, missed opportunities
- **Use**: When price is important, larger positions

## Execution Timing

### Best Times to Execute
- **High Liquidity**: During active trading hours
- **Low Volatility**: Avoid extreme volatility periods
- **Volume Confirmation**: Wait for volume spike

### Avoid Execution During
- **Low Liquidity**: Thin order books
- **High Volatility**: Extreme price swings
- **News Events**: Major announcements

## Slippage Management

### Understanding Slippage
- **Definition**: Difference between expected and actual price
- **Causes**: Low liquidity, high volatility, large orders
- **Impact**: Reduces profit, increases loss

### Reducing Slippage
1. Use limit orders when possible
2. Execute during high liquidity
3. Split large orders
4. Check order book depth first

## Paper Trading First

### Why Paper Trade
- Test strategies without risk
- Understand execution mechanics
- Practice order placement
- Build confidence

### When to Go Live
- Consistent paper trading profits
- Understanding of all tools
- Comfortable with risk management
- User explicitly confirms

## Safety Checklist

Before executing any trade:
- [ ] Analysis completed
- [ ] Risk management calculated
- [ ] Stop loss set
- [ ] Position size appropriate
- [ ] Leverage reasonable
- [ ] User confirmation obtained
- [ ] Paper trading tested (if new strategy)
`,
        },
      ],
    }
  }
)

server.registerResource(
  'volume-analysis-guide',
  'geartrade://docs/volume-analysis',
  {
    description: 'Complete guide on volume analysis: CVD, buy/sell pressure, liquidity zones, and volume profile',
    mimeType: 'text/markdown',
  },
  async () => {
    return {
      contents: [
        {
          uri: 'geartrade://docs/volume-analysis',
          mimeType: 'text/markdown',
          text: `# Volume Analysis Guide

## Overview

Volume analysis is crucial for understanding market dynamics. This guide covers CVD, buy/sell pressure, and volume profile.

## Cumulative Volume Delta (CVD)

### What is CVD?
- Tracks cumulative buy vs sell volume
- Positive CVD: More buying pressure
- Negative CVD: More selling pressure
- Divergence: Price vs CVD divergence signals reversal

### Using CVD
- Rising price + Rising CVD: Strong uptrend
- Falling price + Falling CVD: Strong downtrend
- Rising price + Falling CVD: Bearish divergence (potential reversal)
- Falling price + Rising CVD: Bullish divergence (potential reversal)

## Buy/Sell Pressure

### Interpretation
- **High Buy Pressure**: Strong demand, bullish
- **High Sell Pressure**: Strong supply, bearish
- **Balanced**: Indecision, potential reversal

### Trading Signals
- Extreme buy pressure: Potential exhaustion, watch for reversal
- Extreme sell pressure: Potential exhaustion, watch for reversal
- Balanced pressure: Wait for breakout

## Volume Profile

### Key Levels
- **POC (Point of Control)**: Highest volume price
- **VAH/VAL**: Value area boundaries
- **HVN**: High volume nodes (support/resistance)
- **LVN**: Low volume nodes (quick movement zones)

### Trading Strategy
- Trade from POC to value area boundaries
- Use HVN as support/resistance
- LVN zones for quick entries/exits

## Best Practices

1. **Always confirm with price action**
2. **Use volume spikes for confirmation**
3. **Watch for volume divergences**
4. **Combine with technical indicators**
5. **Volume precedes price movement**
`,
        },
      ],
    }
  }
)

server.registerResource(
  'liquidation-levels-guide',
  'geartrade://docs/liquidation-levels',
  {
    description: 'Complete guide on liquidation levels: liquidity grabs, stop hunts, cascade risks, and trading strategies',
    mimeType: 'text/markdown',
  },
  async () => {
    return {
      contents: [
        {
          uri: 'geartrade://docs/liquidation-levels',
          mimeType: 'text/markdown',
          text: `# Liquidation Levels Guide

## Overview

Understanding liquidation levels helps identify high-probability trading zones and avoid dangerous price areas.

## Liquidity Grab

### What is Liquidity Grab?
- Price moves to liquidate positions
- Creates temporary price spike/drop
- Often reverses after liquidation

### Trading Strategy
- **Before Liquidity**: Avoid entering near liquidation zones
- **After Liquidity**: Enter opposite direction (contrarian)
- **Risk**: Liquidity can be grabbed multiple times

## Stop Hunt

### What is Stop Hunt?
- Price moves to trigger stop losses
- Creates quick price movement
- Often reverses after stop hunt

### Trading Strategy
- **Before Stop Hunt**: Set stops outside obvious levels
- **After Stop Hunt**: Enter opposite direction
- **Risk**: Stop hunt can continue if trend is strong

## Cascade Risk

### What is Cascade?
- Chain reaction of liquidations
- One liquidation triggers another
- Can cause extreme price movement

### Risk Assessment
- **Low Risk**: Isolated liquidations
- **Medium Risk**: Clustered liquidations
- **High Risk**: Cascade potential

### Trading Strategy
- **Low Risk**: Trade normally
- **Medium Risk**: Reduce position size
- **High Risk**: Avoid trading, wait for stability

## Best Practices

1. **Check liquidation levels before entry**
2. **Avoid trading near high liquidation zones**
3. **Use liquidation zones as support/resistance**
4. **Watch for cascade risk in volatile markets**
5. **Enter after liquidity grab/stop hunt completes**
`,
        },
      ],
    }
  }
)

server.registerResource(
  'divergence-trading-guide',
  'geartrade://docs/divergence-trading',
  {
    description: 'Complete guide on divergence trading: RSI divergence, price-action divergence, and trading strategies',
    mimeType: 'text/markdown',
  },
  async () => {
    return {
      contents: [
        {
          uri: 'geartrade://docs/divergence-trading',
          mimeType: 'text/markdown',
          text: `# Divergence Trading Guide

## Overview

Divergence is a powerful reversal signal. This guide covers RSI divergence, price-action divergence, and trading strategies.

## RSI Divergence

### Bullish Divergence
- Price makes lower low
- RSI makes higher low
- **Signal**: Potential bullish reversal

### Bearish Divergence
- Price makes higher high
- RSI makes lower high
- **Signal**: Potential bearish reversal

### Trading Strategy
- Wait for divergence confirmation
- Enter on price reversal
- Set stop below/above divergence point
- Target: Previous swing high/low

## Price-Action Divergence

### Types
- **Momentum Divergence**: Price vs momentum indicator
- **Volume Divergence**: Price vs volume
- **Time Divergence**: Price vs time cycles

### Trading Strategy
- Identify divergence pattern
- Wait for confirmation
- Enter on reversal signal
- Use stop loss to protect

## Best Practices

1. **Wait for confirmation** - Don't enter on divergence alone
2. **Use multiple timeframes** - Higher timeframe divergences are stronger
3. **Combine with support/resistance** - Divergence at key levels is more reliable
4. **Set appropriate stops** - Divergence can fail
5. **Don't force divergence** - Not all moves have divergence
`,
        },
      ],
    }
  }
)

server.registerResource(
  'orderbook-trading-guide',
  'geartrade://docs/orderbook-trading',
  {
    description: 'Complete guide on order book trading: reading order book depth, identifying support/resistance walls, and market sentiment',
    mimeType: 'text/markdown',
  },
  async () => {
    return {
      contents: [
        {
          uri: 'geartrade://docs/orderbook-trading',
          mimeType: 'text/markdown',
          text: `# Order Book Trading Guide

## Overview

Order book analysis provides real-time market sentiment and liquidity information. This guide covers reading order books effectively.

## Reading Order Book

### Bid Side (Buy Orders)
- Shows demand at different price levels
- Large bid walls = strong support
- Thin bids = weak support

### Ask Side (Sell Orders)
- Shows supply at different price levels
- Large ask walls = strong resistance
- Thin asks = weak resistance

## Market Sentiment

### Bullish Signals
- Large bid walls below price
- Thin ask walls above price
- Bid/Ask ratio > 1.5

### Bearish Signals
- Large ask walls above price
- Thin bid walls below price
- Bid/Ask ratio < 0.67

### Neutral Signals
- Balanced bid/ask volumes
- Bid/Ask ratio ~1.0

## Support/Resistance Levels

### Identifying Walls
- **Bid Wall**: Large concentration of buy orders
- **Ask Wall**: Large concentration of sell orders
- **Wall Strength**: Volume at that level

### Trading Strategy
- Enter longs below bid walls
- Enter shorts above ask walls
- Set stops beyond walls
- Take profit at opposite walls

## Warning: Wall Removal

### Risk
- Walls can disappear quickly
- Market makers can fake walls
- Don't rely solely on order book

### Best Practices
1. Use order book as confirmation, not sole signal
2. Combine with price action
3. Watch for wall removal
4. Don't chase walls that are too far
5. Use order book for entry timing, not direction
`,
        },
      ],
    }
  }
)

server.registerResource(
  'market-structure-guide',
  'geartrade://docs/market-structure',
  {
    description: 'Complete guide on market structure: trend identification, change of character (COC), swing patterns, and structure breaks',
    mimeType: 'text/markdown',
  },
  async () => {
    return {
      contents: [
        {
          uri: 'geartrade://docs/market-structure',
          mimeType: 'text/markdown',
          text: `# Market Structure Guide

## Overview

Market structure analysis identifies trend direction and potential reversals. This guide covers structure types, COC, and trading strategies.

## Market Structure Types

### Uptrend
- Higher highs and higher lows
- Structure: Bullish
- Trading: Buy on dips

### Downtrend
- Lower highs and lower lows
- Structure: Bearish
- Trading: Sell on rallies

### Sideways/Ranging
- Equal highs and lows
- Structure: Neutral
- Trading: Range trading

## Change of Character (COC)

### Bullish COC
- Previous downtrend breaks
- New higher high formed
- **Signal**: Potential trend reversal to uptrend

### Bearish COC
- Previous uptrend breaks
- New lower low formed
- **Signal**: Potential trend reversal to downtrend

### Trading Strategy
- Enter on COC confirmation
- Set stop below/above COC point
- Target: Previous structure level

## Swing Patterns

### Swing Highs
- Peaks in price movement
- Resistance levels
- Break above = bullish signal

### Swing Lows
- Troughs in price movement
- Support levels
- Break below = bearish signal

## Structure Breaks

### Break of Structure (BOS)
- Price breaks previous swing high/low
- Confirms trend continuation
- **Signal**: Strong trend continuation

### Trading Strategy
- Enter on BOS confirmation
- Follow the trend
- Set stop at previous structure level

## Best Practices

1. **Always identify structure first**
2. **Trade with the structure**
3. **Wait for COC confirmation**
4. **Use structure levels for stops**
5. **Avoid trading against structure**
`,
        },
      ],
    }
  }
)

server.registerResource(
  'external-data-guide',
  'geartrade://docs/external-data',
  {
    description: 'Complete guide on external market data: funding rate, open interest, volatility, and market sentiment indicators',
    mimeType: 'text/markdown',
  },
  async () => {
    return {
      contents: [
        {
          uri: 'geartrade://docs/external-data',
          mimeType: 'text/markdown',
          text: `# External Data Guide

## Overview

External market data provides insights into market sentiment and potential reversals. This guide covers funding rate, OI, and volatility.

## Funding Rate

### What is Funding Rate?
- Fee paid between longs and shorts
- Positive: Longs pay shorts (more longs)
- Negative: Shorts pay longs (more shorts)

### Trading Signals
- **Extreme Positive (>0.1%)**: Potential bearish reversal
- **Extreme Negative (<-0.1%)**: Potential bullish reversal
- **Normal Range**: No contrarian signal

### Strategy
- Use extreme funding for contrarian trades
- Normal funding confirms trend direction

## Open Interest (OI)

### What is OI?
- Total number of open futures contracts
- Increasing OI: New money entering
- Decreasing OI: Money exiting

### Trading Signals
- **Rising OI + Rising Price**: Strong uptrend
- **Falling OI + Falling Price**: Strong downtrend
- **Rising OI + Falling Price**: Short squeeze potential
- **Falling OI + Rising Price**: Long squeeze potential

### Strategy
- OI confirms trend strength
- Divergence signals potential reversal

## Volatility

### Interpretation
- **High Volatility**: Wide price swings, higher risk
- **Low Volatility**: Tight range, lower risk
- **Expanding Volatility**: Trend acceleration
- **Contracting Volatility**: Potential breakout

### Strategy
- Adjust position size based on volatility
- Use volatility for stop loss placement
- High volatility = wider stops needed

## Best Practices

1. **Combine external data with technical analysis**
2. **Watch for extreme values**
3. **Use funding rate for contrarian signals**
4. **Monitor OI for trend confirmation**
5. **Adjust risk based on volatility**
`,
        },
      ],
    }
  }
)


server.registerResource(
  'candlestick-patterns-guide',
  'geartrade://docs/candlestick-patterns',
  {
    description: 'Complete guide on candlestick patterns: reversal patterns, continuation patterns, and trading strategies',
    mimeType: 'text/markdown',
  },
  async () => {
    return {
      contents: [
        {
          uri: 'geartrade://docs/candlestick-patterns',
          mimeType: 'text/markdown',
          text: `# Candlestick Patterns Guide

## Overview

Candlestick patterns provide visual signals for potential reversals and continuations. This guide covers major patterns and trading strategies.

## Reversal Patterns

### Bullish Reversal
- **Hammer**: Long lower wick, small body
- **Engulfing**: Bullish candle engulfs previous bearish
- **Morning Star**: Three-candle pattern, bullish reversal
- **Doji**: Indecision, potential reversal

### Bearish Reversal
- **Shooting Star**: Long upper wick, small body
- **Engulfing**: Bearish candle engulfs previous bullish
- **Evening Star**: Three-candle pattern, bearish reversal
- **Doji**: Indecision, potential reversal

## Continuation Patterns

### Bullish Continuation
- **Rising Three Methods**: Consolidation in uptrend
- **Bullish Flag**: Brief pause in uptrend
- **Bullish Pennant**: Tight consolidation

### Bearish Continuation
- **Falling Three Methods**: Consolidation in downtrend
- **Bearish Flag**: Brief pause in downtrend
- **Bearish Pennant**: Tight consolidation

## Trading Strategy

### Pattern Confirmation
1. Identify pattern formation
2. Wait for confirmation candle
3. Enter on confirmation
4. Set stop below/above pattern

### Best Practices
- Combine with support/resistance
- Use volume confirmation
- Higher timeframe patterns are stronger
- Don't trade every pattern

## Common Mistakes

1. ❌ Entering before confirmation
2. ❌ Ignoring volume
3. ❌ Trading in ranging markets
4. ❌ Not setting stop loss
5. ❌ Over-trading on patterns
`,
        },
      ],
    }
  }
)

server.registerResource(
  'fibonacci-trading-guide',
  'geartrade://docs/fibonacci-trading',
  {
    description: 'Complete guide on Fibonacci retracement: key levels, entry/exit strategies, and risk management',
    mimeType: 'text/markdown',
  },
  async () => {
    return {
      contents: [
        {
          uri: 'geartrade://docs/fibonacci-trading',
          mimeType: 'text/markdown',
          text: `# Fibonacci Trading Guide

## Overview

Fibonacci retracement levels identify potential support/resistance zones. This guide covers key levels and trading strategies.

## Key Fibonacci Levels

### Retracement Levels
- **23.6%**: Shallow retracement
- **38.2%**: Normal retracement
- **50%**: Psychological level
- **61.8%**: Golden ratio (most important)
- **78.6%**: Deep retracement

### Extension Levels
- **127.2%**: First extension
- **161.8%**: Golden ratio extension
- **200%**: Double extension

## Trading Strategy

### In Uptrend
- **Entry**: Buy at 38.2%, 50%, or 61.8% retracement
- **Stop Loss**: Below 78.6% retracement
- **Take Profit**: Above 0% (new highs) or extensions

### In Downtrend
- **Entry**: Sell at 38.2%, 50%, or 61.8% retracement
- **Stop Loss**: Above 78.6% retracement
- **Take Profit**: Below 100% (new lows) or extensions

## Best Practices

1. **Use in trending markets** - Not effective in ranging markets
2. **Combine with other indicators** - RSI, volume, structure
3. **61.8% is most important** - Golden ratio level
4. **Wait for bounce confirmation** - Don't enter blindly
5. **Set stops beyond 78.6%** - Deep retracement invalidates setup
`,
        },
      ],
    }
  }
)

// Export server for Nullshot MCP SDK
export { server }

// JSON-RPC 2.0 response helper
function jsonRpcResponse(id: string | number | null, result: any) {
  return {
    jsonrpc: '2.0' as const,
    id,
    result
  }
}

function jsonRpcError(id: string | number | null, code: number, message: string, data?: any) {
  return {
    jsonrpc: '2.0' as const,
    id,
    error: { code, message, data }
  }
}

// MCP method handlers
async function handleMcpMethod(method: string, params: any, id: string | number | null): Promise<any> {
  switch (method) {
    case 'initialize':
      return jsonRpcResponse(id, {
        protocolVersion: params?.protocolVersion || '2024-11-05',
        serverInfo: {
          name: server.name,
          version: server.version
        },
        capabilities: {
          tools: { listChanged: false },
          resources: { listChanged: false, subscribe: false },
          prompts: { listChanged: false }
        }
      })

    case 'initialized':
      // Notification, no response needed but return empty result for compatibility
      return jsonRpcResponse(id, {})

    case 'tools/list':
      const tools = Array.from(server.tools.entries()).map(([name, { config }]: [string, any]) => ({
        name,
        description: config.description || '',
        inputSchema: {
          type: 'object',
          properties: (() => {
            try {
              // Check if inputSchema is a Zod object schema
              if (config.inputSchema && config.inputSchema._def && config.inputSchema._def.typeName === 'ZodObject') {
                // Extract shape from Zod object schema
                const shape = config.inputSchema._def.shape
                const shapeObj = typeof shape === 'function' ? shape() : shape || {}
                return Object.fromEntries(
                  Object.entries(shapeObj).map(([key, schema]: [string, any]) => {
                    // Safely extract type and description from Zod schema
                    let type = 'string' // default fallback
                    let description = ''

                    try {
                      if (schema && schema._def) {
                        const typeName = schema._def.typeName
                        switch (typeName) {
                          case 'ZodNumber':
                            type = 'number'
                            break
                          case 'ZodBoolean':
                            type = 'boolean'
                            break
                          case 'ZodArray':
                            type = 'array'
                            break
                          case 'ZodEnum':
                            type = 'string' // enums are strings
                            break
                          case 'ZodString':
                          default:
                            type = 'string'
                            break
                        }
                        description = schema._def.description || ''
                      }
                    } catch (error) {
                      // If anything fails, use safe defaults
                      type = 'string'
                      description = ''
                    }

                    return [
                      key,
                      {
                        type,
                        description
                      }
                    ]
                  })
                )
              } else {
                // Fallback for plain objects (old format)
                return Object.fromEntries(
                  Object.entries(config.inputSchema || {})
                    .filter(([key]) => !key.startsWith('~')) // Filter out internal Zod properties
                    .map(([key, schema]: [string, any]) => {
                      // Safely extract type and description from Zod schema
                      let type = 'string' // default fallback
                      let description = ''

                      try {
                        if (schema && schema._def) {
                          const typeName = schema._def.typeName
                          switch (typeName) {
                            case 'ZodNumber':
                              type = 'number'
                              break
                            case 'ZodBoolean':
                              type = 'boolean'
                              break
                            case 'ZodArray':
                              type = 'array'
                              break
                            case 'ZodString':
                            default:
                              type = 'string'
                              break
                          }
                          description = schema._def.description || ''
                        } else if (schema && typeof schema === 'object') {
                          // Fallback for non-Zod objects
                          type = schema.type || 'string'
                          description = schema.description || ''
                        }
                      } catch (error) {
                        // If anything fails, use safe defaults
                        type = 'string'
                        description = ''
                      }

                      return [
                        key,
                        {
                          type,
                          description
                        }
                      ]
                    })
                )
              }
            } catch (error) {
              // If all else fails, return empty properties
              return {}
            }
          })(),
          required: (() => {
            try {
              // Check if inputSchema is a Zod object schema
              if (config.inputSchema && config.inputSchema._def && config.inputSchema._def.typeName === 'ZodObject') {
                // Extract required fields from Zod object schema
                const shape = config.inputSchema._def.shape
                const shapeObj = typeof shape === 'function' ? shape() : shape || {}
                return Object.keys(shapeObj)
              } else {
                // Fallback for plain objects
                return Object.keys(config.inputSchema || {}).filter(key => !key.startsWith('~'))
              }
            } catch (error) {
              return []
            }
          })()
        }
      }))
      return jsonRpcResponse(id, { tools })

    case 'tools/call':
      const toolName = params?.name
      const toolArgs = params?.arguments || {}
      const tool = server.tools.get(toolName)
      if (!tool) {
        return jsonRpcError(id, -32601, `Tool not found: ${toolName}`)
      }
      try {
        const result = await tool.handler(toolArgs)
        return jsonRpcResponse(id, result)
      } catch (err: any) {
        return jsonRpcError(id, -32603, err.message || 'Tool execution failed')
      }

    case 'resources/list':
      const resources = Array.from(server.resources.entries()).map(([name, { config }]: [string, any]) => ({
        uri: `geartrade://${name}`,
        name: config.title || name,
        description: config.description || '',
        mimeType: 'text/plain'
      }))
      return jsonRpcResponse(id, { resources })

    case 'resources/read':
      const resourceUri = params?.uri || ''
      const resourceName = resourceUri.replace('geartrade://', '')
      const resource = server.resources.get(resourceName)
      if (!resource) {
        return jsonRpcError(id, -32601, `Resource not found: ${resourceUri}`)
      }
      try {
        const content = await resource.handler()
        return jsonRpcResponse(id, {
          contents: [{
            uri: resourceUri,
            mimeType: 'text/plain',
            text: typeof content === 'string' ? content : JSON.stringify(content, null, 2)
          }]
        })
      } catch (err: any) {
        return jsonRpcError(id, -32603, err.message || 'Resource read failed')
      }

    case 'prompts/list':
      const prompts = Array.from(server.prompts.entries()).map(([name, { config }]: [string, any]) => {
        // Extract arguments from argsSchema (Zod schemas)
        const args: any[] = []
        if (config.argsSchema) {
          for (const [key, schema] of Object.entries(config.argsSchema)) {
            const zodSchema = schema as any
            const isRequired = !zodSchema?._def?.typeName?.includes('Optional')
            args.push({
              name: key,
              description: zodSchema?._def?.description || '',
              required: isRequired
            })
          }
        }
        return {
          name,
          description: config.description || '',
          arguments: args
        }
      })
      return jsonRpcResponse(id, { prompts })

    case 'prompts/get':
      const promptName = params?.name
      const promptData = server.prompts.get(promptName)
      if (!promptData) {
        return jsonRpcError(id, -32601, `Prompt not found: ${promptName}`)
      }
      const { config: promptConfig, handler: promptHandler } = promptData
      const promptArgs = params?.arguments || {}
      
      // If there's a handler function, call it with arguments
      if (promptHandler && typeof promptHandler === 'function') {
        try {
          const result = await promptHandler(promptArgs)
          return jsonRpcResponse(id, {
            description: promptConfig.description,
            messages: result.messages || [{
              role: 'user',
              content: { type: 'text', text: promptConfig.description }
            }]
          })
        } catch (err: any) {
          return jsonRpcError(id, -32603, err.message || 'Prompt handler failed')
        }
      }
      
      // Fallback: use template or description
      let promptText = promptConfig.template || promptConfig.description || ''
      for (const [key, value] of Object.entries(promptArgs)) {
        promptText = promptText.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value))
      }
      return jsonRpcResponse(id, {
        description: promptConfig.description,
        messages: [{
          role: 'user',
          content: { type: 'text', text: promptText }
        }]
      })

    case 'ping':
      return jsonRpcResponse(id, {})

    default:
      return jsonRpcError(id, -32601, `Method not found: ${method}`)
  }
}

// Default export for local HTTP server with streaming support
export default {
  async fetch(request: Request, env: any, ctx: any) {
    const url = new URL(request.url)

    // Enhanced CORS headers for streaming support
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Cache-Control, Last-Event-ID',
      'Access-Control-Max-Age': '86400'
    }

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders })
    }

    // Basic health check endpoint
    if (request.method === 'GET' && request.url.endsWith('/health')) {
      return new Response(JSON.stringify({
        status: 'ok',
        server: server.name,
        version: server.version,
        streaming: true,
        endpoints: ['/stream', '/mcp', '/events']
      }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }

    // SSE (Server-Sent Events) streaming endpoint
    if (request.method === 'GET' && url.pathname === '/stream') {
      const streamHeaders = {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control, Last-Event-ID'
      }

      let eventId = 0
      const stream = new ReadableStream({
        start(controller) {
          // Send initial connection event
          const initEvent = `id: ${eventId++}\nevent: connected\ndata: ${JSON.stringify({
            type: 'connection',
            message: 'Connected to MCP streaming server',
            server: server.name,
            version: server.version,
            timestamp: new Date().toISOString()
          })}\n\n`
          controller.enqueue(new TextEncoder().encode(initEvent))

          // Send periodic heartbeat
          const heartbeatInterval = setInterval(() => {
            const heartbeat = `id: ${eventId++}\nevent: heartbeat\ndata: ${JSON.stringify({
              type: 'heartbeat',
              timestamp: new Date().toISOString()
            })}\n\n`
            try {
              controller.enqueue(new TextEncoder().encode(heartbeat))
            } catch (error) {
              clearInterval(heartbeatInterval)
            }
          }, 30000) // 30 seconds heartbeat

          // Handle client disconnect
          request.signal.addEventListener('abort', () => {
            clearInterval(heartbeatInterval)
            controller.close()
          })
        }
      })

      return new Response(stream, { headers: streamHeaders })
    }

    // WebSocket-like streaming for MCP commands over HTTP
    if (request.method === 'POST' && url.pathname === '/stream') {
      const streamHeaders = {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Cache-Control, Last-Event-ID'
      }

      try {
        const body = await request.json() as any
        const { jsonrpc, id, method, params } = body

        const stream = new ReadableStream({
          async start(controller) {
            let eventId = 0

            // Send request received event
            const requestEvent = `id: ${eventId++}\nevent: request_received\ndata: ${JSON.stringify({
              type: 'request',
              method,
              params,
              id,
              timestamp: new Date().toISOString()
            })}\n\n`
            controller.enqueue(new TextEncoder().encode(requestEvent))

            // Process the MCP method
            try {
              // Send processing event
              const processingEvent = `id: ${eventId++}\nevent: processing\ndata: ${JSON.stringify({
                type: 'processing',
                method,
                message: 'Processing MCP request...',
                timestamp: new Date().toISOString()
              })}\n\n`
              controller.enqueue(new TextEncoder().encode(processingEvent))

              const response = await handleMcpMethod(method, params, id)

              // Send response event
              const responseEvent = `id: ${eventId++}\nevent: response\ndata: ${JSON.stringify({
                type: 'response',
                response,
                timestamp: new Date().toISOString()
              })}\n\n`
              controller.enqueue(new TextEncoder().encode(responseEvent))

              // Send completion event
              const completionEvent = `id: ${eventId++}\nevent: completed\ndata: ${JSON.stringify({
                type: 'completed',
                method,
                success: true,
                timestamp: new Date().toISOString()
              })}\n\n`
              controller.enqueue(new TextEncoder().encode(completionEvent))

            } catch (error: any) {
              // Send error event
              const errorEvent = `id: ${eventId++}\nevent: error\ndata: ${JSON.stringify({
                type: 'error',
                error: error.message,
                method,
                timestamp: new Date().toISOString()
              })}\n\n`
              controller.enqueue(new TextEncoder().encode(errorEvent))
            } finally {
              controller.close()
            }
          }
        })

        return new Response(stream, { headers: streamHeaders })
      } catch (error: any) {
        const errorStream = new ReadableStream({
          start(controller) {
            const errorEvent = `id: 0\nevent: error\ndata: ${JSON.stringify({
              type: 'error',
              error: error.message,
              timestamp: new Date().toISOString()
            })}\n\n`
            controller.enqueue(new TextEncoder().encode(errorEvent))
            controller.close()
          }
        })
        return new Response(errorStream, { headers: streamHeaders })
      }
    }

    // Handle MCP JSON-RPC requests (traditional endpoint)
    if (request.method === 'POST' && url.pathname !== '/stream') {
      try {
        const body = await request.json() as any
        
        // Handle batch requests
        if (Array.isArray(body)) {
          const responses = await Promise.all(
            body.map((req: any) => handleMcpMethod(req.method, req.params, req.id))
          )
          return new Response(JSON.stringify(responses), {
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          })
        }

        // Single request
        const { jsonrpc, id, method, params } = body
        
        if (jsonrpc !== '2.0') {
          return new Response(JSON.stringify(
            jsonRpcError(id || null, -32600, 'Invalid Request: jsonrpc must be "2.0"')
          ), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          })
        }

        const response = await handleMcpMethod(method, params, id)
        return new Response(JSON.stringify(response), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        })
      } catch (err: any) {
        return new Response(JSON.stringify(
          jsonRpcError(null, -32700, 'Parse error', err.message)
        ), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        })
      }
    }

    // GET request - return server info (for debugging)
    return new Response(JSON.stringify({
      name: server.name,
      version: server.version,
      endpoint: '/mcp',
      streaming: {
        enabled: true,
        endpoints: {
          sse: '/stream',
          mcp_stream: '/stream',
          health: '/health'
        }
      },
      protocol: 'JSON-RPC 2.0',
      methods: ['initialize', 'tools/list', 'tools/call', 'resources/list', 'resources/read', 'prompts/list', 'prompts/get'],
      features: ['http-streaming', 'sse-events', 'real-time-responses']
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    })
  }
}