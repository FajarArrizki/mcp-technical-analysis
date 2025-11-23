/**
 * GearTrade MCP Server
 * Exposes trading functionality via Model Context Protocol
 */

// @ts-ignore - MCP SDK uses wildcard exports that TypeScript can't resolve, but works at runtime
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
// @ts-ignore
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

// Import existing functionality
import { getRealTimePrice } from '../signal-generation/data-fetchers/hyperliquid'
import { getMarketData } from '../signal-generation/data-fetchers/market-data'
import type { ComprehensiveVolumeAnalysis } from '../signal-generation/analysis/volume-analysis'
import { getActivePositions } from '../signal-generation/position-management/positions'
import type { Position } from '../signal-generation/position-management/positions'
import { calculateMAE } from '../signal-generation/risk-management/mae'
import { calculateStopLoss } from '../signal-generation/exit-conditions/stop-loss'
import { calculatePositionSize } from '../signal-generation/execution/position-sizer'
import { calculateDynamicLeverage } from '../signal-generation/risk-management/leverage'
import { calculateDynamicMarginPercentage } from '../signal-generation/risk-management/margin'
import { calculateFibonacciRetracement } from '../signal-generation/technical-indicators/fibonacci'
import type { FibonacciRetracement } from '../signal-generation/technical-indicators/fibonacci'
import { calculateOrderBookDepth } from '../signal-generation/analysis/orderbook'
import type { OrderBookDepth } from '../signal-generation/analysis/orderbook'
import { calculateSessionVolumeProfile, calculateCompositeVolumeProfile } from '../signal-generation/analysis/volume-profile'
import type { SessionVolumeProfile, CompositeVolumeProfile } from '../signal-generation/analysis/volume-profile'
import { detectChangeOfCharacter } from '../signal-generation/analysis/market-structure'
import type { ChangeOfCharacterResult } from '../signal-generation/analysis/market-structure'
import { detectCandlestickPatterns } from '../signal-generation/analysis/candlestick'
import type { CandlestickPatternsResult } from '../signal-generation/analysis/candlestick'
import { detectDivergence } from '../signal-generation/analysis/divergence'
import type { DivergenceResult } from '../signal-generation/analysis/divergence'
import { calculateLiquidationIndicators } from '../signal-generation/technical-indicators/liquidation'
import type { LiquidationIndicator } from '../signal-generation/technical-indicators/liquidation'
import { calculateLongShortRatioIndicators } from '../signal-generation/technical-indicators/long-short-ratio'
import type { LongShortRatioIndicator } from '../signal-generation/technical-indicators/long-short-ratio'
import { calculateSpotFuturesDivergenceIndicators } from '../signal-generation/technical-indicators/spot-futures-divergence'
import type { SpotFuturesDivergenceIndicator } from '../signal-generation/technical-indicators/spot-futures-divergence'
import { calculateRSI } from '../signal-generation/technical-indicators/momentum'
import { PaperExecutor } from '../signal-generation/execution/paper-executor'
import { LiveExecutor } from '../signal-generation/execution/live-executor'
import type { Signal } from '../signal-generation/types'
import { getHyperliquidWalletApiKey, getHyperliquidAccountAddress } from '../signal-generation/config'

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
    fibonacci: indicators.fibonacci
      ? {
          level: indicators.fibonacci.level || null,
          direction: indicators.fibonacci.direction || null,
          range: indicators.fibonacci.range || null,
          keyLevels: indicators.fibonacci.keyLevels || null,
        }
      : null,
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
      if (!indicators.rsiDivergence) return null
      if (typeof indicators.rsiDivergence === 'string') return indicators.rsiDivergence
      if (typeof indicators.rsiDivergence === 'object' && indicators.rsiDivergence.divergence) {
        return String(indicators.rsiDivergence.divergence)
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
            return indicators.candlestickPatterns.patterns
              .map((p: any) => (typeof p === 'object' ? p.type || p.pattern : String(p)))
              .filter((p: any) => p)
              .join(', ') || null
          }
          // If it's an object with type property
          if (indicators.candlestickPatterns.type) {
            return String(indicators.candlestickPatterns.type)
          }
          // If it's an object with pattern property
          if (indicators.candlestickPatterns.pattern) {
            return String(indicators.candlestickPatterns.pattern)
          }
        }
      }
      return null
    })(),
    marketRegime:
      indicators.marketRegime && typeof indicators.marketRegime === 'object'
        ? indicators.marketRegime.regime || indicators.marketRegime.volatility || String(indicators.marketRegime)
        : indicators.marketRegime || indicators.regime || null,
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
  
  // Get open interest (from hyperliquid or futures)
  // Handle both number and object types (OpenInterestData object has 'current' property)
  let openInterestRaw: any = futures.openInterest || hyperliquid.openInterest || null
  let openInterest: number | null = null
  
  if (openInterestRaw !== null && openInterestRaw !== undefined) {
    if (typeof openInterestRaw === 'number') {
      openInterest = isNaN(openInterestRaw) || !isFinite(openInterestRaw) ? null : openInterestRaw
    } else if (typeof openInterestRaw === 'object') {
      // If it's an object (OpenInterestData), extract the 'current' value
      openInterest = openInterestRaw.current || openInterestRaw.value || openInterestRaw.amount || openInterestRaw.oi || null
      if (openInterest !== null && typeof openInterest !== 'number') {
        openInterest = parseFloat(String(openInterest))
        if (isNaN(openInterest) || !isFinite(openInterest)) {
          openInterest = null
        }
      } else if (openInterest !== null && (isNaN(openInterest) || !isFinite(openInterest))) {
        openInterest = null
      }
    } else if (typeof openInterestRaw === 'string') {
      openInterest = parseFloat(openInterestRaw)
      if (isNaN(openInterest) || !isFinite(openInterest)) {
        openInterest = null
      }
    }
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
  let openInterestFormatted: string | number | null = null
  if (openInterest !== null && typeof openInterest === 'number' && !isNaN(openInterest) && isFinite(openInterest) && openInterest > 0) {
    // Format large numbers with commas
    openInterestFormatted = openInterest.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
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
  positionSizeUsd: number
) {
  // Calculate stop loss
  const stopLossFixed = calculateStopLoss(entryPrice, side, stopLossPct)
  const stopLossFlexible = calculateStopLoss(entryPrice, side, stopLossPct * 0.385) // ~0.69% for 2% default
  
  // Calculate take profit
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

  return {
    stopLossFixed,
    stopLossFixedPct: stopLossPct,
    stopLossFlexible,
    stopLossFlexiblePct: stopLossPct * 0.385,
    takeProfit,
    takeProfitPct: takeProfitPct,
    potentialLoss,
    potentialProfit,
    riskRewardRatio,
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

// Create MCP server
const server = new McpServer({
  name: 'geartrade',
  version: '1.0.0',
})

// Register get_price tool
server.registerTool(
  'get_price',
  {
    title: 'Get Price',
    description: 'Get latest price for a trading ticker/symbol (e.g., BTC, ETH, SOL)',
    inputSchema: {
      ticker: z.string().describe('Asset ticker symbol (e.g., "BTC", "ETH", "SOL")'),
    },
    outputSchema: {
      ticker: z.string(),
      price: z.number().nullable(),
      timestamp: z.string().optional(),
    },
  },
  async ({ ticker }: { ticker: string }) => {
    if (!ticker || typeof ticker !== 'string' || ticker.trim().length === 0) {
      const errorResult = {
        ticker: ticker || '',
        price: null as number | null,
        timestamp: new Date().toISOString(),
      }
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                ...errorResult,
                error: 'Invalid ticker parameter',
                message: 'Ticker must be a non-empty string',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: errorResult,
      }
    }

    // Normalize ticker (uppercase, remove spaces)
    const normalizedTicker = ticker.trim().toUpperCase()

    try {
      // Get real-time price
      const price = await getRealTimePrice(normalizedTicker)

      if (price === null) {
        const notFoundResult = {
          ticker: normalizedTicker,
          price: null as number | null,
          timestamp: new Date().toISOString(),
        }
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  ...notFoundResult,
                  error: 'Price not found',
                  message: `Could not fetch price for ${normalizedTicker}. Asset may not be available on Hyperliquid.`,
                },
                null,
                2
              ),
            },
          ],
          structuredContent: notFoundResult,
        }
      }

      const result = {
        ticker: normalizedTicker,
        price: price,
        timestamp: new Date().toISOString(),
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
      const errorResult = {
        ticker: normalizedTicker,
        price: null as number | null,
        timestamp: new Date().toISOString(),
      }
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                ...errorResult,
                error: error instanceof Error ? error.message : String(error),
                message: 'Failed to fetch price',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: errorResult,
      }
    }
  }
)

// Register get_multiple_prices tool
server.registerTool(
  'get_multiple_prices',
  {
    title: 'Get Multiple Prices',
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

// Register get_indicator tool (single ticker only)
server.registerTool(
  'get_indicator',
  {
    title: 'Get Technical Indicator',
    description: 'Get comprehensive technical analysis indicators for a single trading ticker (RSI, EMA, MACD, Bollinger Bands, etc.). For multiple tickers, use get_multiple_prices.',
    inputSchema: {
      ticker: z.string().describe('Single asset ticker symbol (e.g., "BTC", "ETH", "SOL"). Only one ticker allowed.'),
    },
    outputSchema: {
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
          change24h: z.number().nullable().optional(),
          volumeChange24h: z.number().nullable().optional(),
        })
        .nullable()
        .optional(),
    },
  },
  async ({ ticker }: { ticker: string }) => {
    if (!ticker || typeof ticker !== 'string' || ticker.trim().length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                ticker: ticker || '',
                price: null,
                technical: null,
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
          price: null,
          technical: null,
        },
      }
    }

    // Normalize ticker (uppercase, remove spaces)
    const normalizedTicker = ticker.trim().toUpperCase()

    try {
      // Fetch market data with sufficient candles for indicators (75+ candles)
      if (!process.env.CANDLES_COUNT || parseInt(process.env.CANDLES_COUNT) < 75) {
        process.env.CANDLES_COUNT = '75'
      }
      // Get market data which includes technical indicators
      const { marketDataMap } = await getMarketData([normalizedTicker])
      const assetData = marketDataMap.get(normalizedTicker)

      if (!assetData) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  ticker: normalizedTicker,
                  price: null,
                  technical: null,
                  error: 'Asset data not found',
                  message: `Could not fetch technical data for ${normalizedTicker}. Asset may not be available on Hyperliquid.`,
                },
                null,
                2
              ),
            },
          ],
          structuredContent: {
            ticker: normalizedTicker,
            price: null,
            technical: null,
          },
        }
      }

      const price = assetData.price || assetData.data?.price || null
      const technical = formatTechnicalIndicators(assetData, price)

      const result = {
        ticker: normalizedTicker,
        price: price,
        timestamp: new Date().toISOString(),
        technical: technical,
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
                ticker: normalizedTicker,
                price: null,
                technical: null,
                error: error instanceof Error ? error.message : String(error),
                message: 'Failed to fetch technical analysis',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: {
          ticker: normalizedTicker,
          price: null,
          technical: null,
        },
      }
    }
  }
)

// Register get_multiple_indicators tool
server.registerTool(
  'get_multiple_indicators',
  {
    title: 'Get Multiple Technical Indicators',
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

// Register get_volume_analysis tool
server.registerTool(
  'get_volume_analysis',
  {
    title: 'Get Volume Analysis',
    description: 'Get comprehensive volume analysis for a single trading ticker (buy/sell volume, POC, VAH/VAL, HVN/LVN, CVD, liquidity zones, etc.). For multiple tickers, use get_multiple_volume_analysis.',
    inputSchema: {
      ticker: z.string().describe('Asset ticker symbol (e.g., "BTC", "ETH", "SOL")'),
    },
    outputSchema: z.object({
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
    }),
  },
  async ({ ticker }: { ticker: string }) => {
    if (!ticker || typeof ticker !== 'string' || ticker.trim().length === 0) {
      const errorResult = {
        ticker: ticker || '',
        price: null as number | null,
        timestamp: new Date().toISOString(),
        volumeAnalysis: null,
      }
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                ...errorResult,
                error: 'Invalid ticker parameter',
                message: 'Ticker must be a non-empty string',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: errorResult,
      }
    }

    try {
      const normalizedTicker = ticker.trim().toUpperCase()

      // Fetch market data with sufficient candles for volume analysis (75+ candles)
      // Ensure CANDLES_COUNT is set to at least 75 for comprehensive volume analysis
      if (!process.env.CANDLES_COUNT || parseInt(process.env.CANDLES_COUNT) < 75) {
        process.env.CANDLES_COUNT = '75'
      }
      const { marketDataMap } = await getMarketData([normalizedTicker])
      const assetData = marketDataMap.get(normalizedTicker)

      if (!assetData) {
        const errorResult = {
          ticker: normalizedTicker,
          price: null as number | null,
          timestamp: new Date().toISOString(),
          volumeAnalysis: null,
        }
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  ...errorResult,
                  error: 'Asset not found',
                  message: `No market data available for ${normalizedTicker}`,
                },
                null,
                2
              ),
            },
          ],
          structuredContent: errorResult,
        }
      }

      const price = assetData.price || assetData.data?.price || null
      const historicalData = assetData.historicalData || assetData.data?.historicalData || []
      const externalData = assetData.externalData || assetData.data?.externalData || {}
      const volumeAnalysis = externalData.comprehensiveVolumeAnalysis || assetData.comprehensiveVolumeAnalysis || assetData.data?.comprehensiveVolumeAnalysis

      // If volume analysis is not available but we have historical data, try to calculate it
      // Note: This is a fallback - normally getMarketData should provide it
      let finalVolumeAnalysis = volumeAnalysis
      if (!finalVolumeAnalysis && historicalData && historicalData.length >= 20 && price) {
        // Import dynamically to avoid circular dependencies
        const { performComprehensiveVolumeAnalysis } = await import('../signal-generation/analysis/volume-analysis')
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
          console.error(`Failed to calculate volume analysis for ${normalizedTicker}:`, error)
        }
      }

      // Format volume analysis
      const formattedVolumeAnalysis = formatVolumeAnalysis(finalVolumeAnalysis, price)

      const result = {
        ticker: normalizedTicker,
        price,
        timestamp: new Date().toISOString(),
        volumeAnalysis: formattedVolumeAnalysis,
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
      const errorResult = {
        ticker: ticker.trim().toUpperCase(),
        price: null as number | null,
        timestamp: new Date().toISOString(),
        volumeAnalysis: null,
      }
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                ...errorResult,
                error: error instanceof Error ? error.message : String(error),
                message: 'Failed to fetch volume analysis',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: errorResult,
      }
    }
  }
)

// Register get_multiple_volume_analysis tool
server.registerTool(
  'get_multiple_volume_analysis',
  {
    title: 'Get Multiple Volume Analysis',
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
          // Import dynamically to avoid circular dependencies
          const { performComprehensiveVolumeAnalysis } = await import('../signal-generation/analysis/volume-analysis')
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
)

// Register get_multitimeframe tool
server.registerTool(
  'get_multitimeframe',
  {
    title: 'Get Multi-Timeframe Analysis',
    description: 'Get multi-timeframe trend alignment analysis for a single trading ticker (Daily, 4H, 1H alignment). For multiple tickers, use get_multiple_multitimeframe.',
    inputSchema: {
      ticker: z.string().describe('Asset ticker symbol (e.g., "BTC", "ETH", "SOL")'),
    },
    outputSchema: z.object({
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
    }),
  },
  async ({ ticker }: { ticker: string }) => {
    if (!ticker || typeof ticker !== 'string' || ticker.trim().length === 0) {
      const errorResult = {
        ticker: ticker || '',
        price: null as number | null,
        timestamp: new Date().toISOString(),
        multiTimeframe: null,
      }
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                ...errorResult,
                error: 'Invalid ticker parameter',
                message: 'Ticker must be a non-empty string',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: errorResult,
      }
    }

    try {
      const normalizedTicker = ticker.trim().toUpperCase()

      // Fetch market data with sufficient candles for multi-timeframe analysis (75+ candles)
      if (!process.env.CANDLES_COUNT || parseInt(process.env.CANDLES_COUNT) < 75) {
        process.env.CANDLES_COUNT = '75'
      }
      const { marketDataMap } = await getMarketData([normalizedTicker])
      const assetData = marketDataMap.get(normalizedTicker)

      if (!assetData) {
        const errorResult = {
          ticker: normalizedTicker,
          price: null as number | null,
          timestamp: new Date().toISOString(),
          multiTimeframe: null,
        }
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  ...errorResult,
                  error: 'Asset not found',
                  message: `No market data available for ${normalizedTicker}`,
                },
                null,
                2
              ),
            },
          ],
          structuredContent: errorResult,
        }
      }

      const price = assetData.price || assetData.data?.price || null
      const formattedMultiTimeframe = formatMultiTimeframe(assetData)

      const result = {
        ticker: normalizedTicker,
        price,
        timestamp: new Date().toISOString(),
        multiTimeframe: formattedMultiTimeframe,
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
      const errorResult = {
        ticker: ticker.trim().toUpperCase(),
        price: null as number | null,
        timestamp: new Date().toISOString(),
        multiTimeframe: null,
      }
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                ...errorResult,
                error: error instanceof Error ? error.message : String(error),
                message: 'Failed to fetch multi-timeframe analysis',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: errorResult,
      }
    }
  }
)

// Register get_multiple_multitimeframe tool
server.registerTool(
  'get_multiple_multitimeframe',
  {
    title: 'Get Multiple Multi-Timeframe Analysis',
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

// Register get_external_data tool
server.registerTool(
  'get_external_data',
  {
    title: 'Get External Data',
    description: 'Get external market data for a single trading ticker (funding rate, open interest, volume trend, volatility). For multiple tickers, use get_multiple_external_data.',
    inputSchema: {
      ticker: z.string().describe('Asset ticker symbol (e.g., "BTC", "ETH", "SOL")'),
    },
    outputSchema: z.object({
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
    }),
  },
  async ({ ticker }: { ticker: string }) => {
    if (!ticker || typeof ticker !== 'string' || ticker.trim().length === 0) {
      const errorResult = {
        ticker: ticker || '',
        price: null as number | null,
        timestamp: new Date().toISOString(),
        externalData: null,
      }
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                ...errorResult,
                error: 'Invalid ticker parameter',
                message: 'Ticker must be a non-empty string',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: errorResult,
      }
    }

    try {
      const normalizedTicker = ticker.trim().toUpperCase()

      // Fetch market data
      if (!process.env.CANDLES_COUNT || parseInt(process.env.CANDLES_COUNT) < 75) {
        process.env.CANDLES_COUNT = '75'
      }
      const { marketDataMap } = await getMarketData([normalizedTicker])
      const assetData = marketDataMap.get(normalizedTicker)

      if (!assetData) {
        const errorResult = {
          ticker: normalizedTicker,
          price: null as number | null,
          timestamp: new Date().toISOString(),
          externalData: null,
        }
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  ...errorResult,
                  error: 'Asset not found',
                  message: `No market data available for ${normalizedTicker}`,
                },
                null,
                2
              ),
            },
          ],
          structuredContent: errorResult,
        }
      }

      const price = assetData.price || assetData.data?.price || null
      const formattedExternalData = formatExternalData(assetData)

      const result = {
        ticker: normalizedTicker,
        price,
        timestamp: new Date().toISOString(),
        externalData: formattedExternalData,
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
      const errorResult = {
        ticker: ticker.trim().toUpperCase(),
        price: null as number | null,
        timestamp: new Date().toISOString(),
        externalData: null,
      }
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                ...errorResult,
                error: error instanceof Error ? error.message : String(error),
                message: 'Failed to fetch external data',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: errorResult,
      }
    }
  }
)

// Register get_multiple_external_data tool
server.registerTool(
  'get_multiple_external_data',
  {
    title: 'Get Multiple External Data',
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
)

// Register get_position tool
server.registerTool(
  'get_position',
  {
    title: 'Get Position',
    description: 'Get current position information for a single trading ticker (side, quantity, entry price, PnL, MAE). For multiple tickers, use get_multiple_positions.',
    inputSchema: {
      ticker: z.string().describe('Asset ticker symbol (e.g., "BTC", "ETH", "SOL")'),
    },
    outputSchema: z.object({
      ticker: z.string(),
      price: z.number().nullable(),
      timestamp: z.string().optional(),
      position: z
        .object({
          side: z.string().nullable().optional(),
          quantity: z.number().nullable().optional(),
          entryPrice: z.number().nullable().optional(),
          currentPrice: z.number().nullable().optional(),
          leverage: z.number().nullable().optional(),
          unrealizedPnl: z.number().nullable().optional(),
          unrealizedPnlPct: z.number().nullable().optional(),
          pnlPctOnMargin: z.number().nullable().optional(),
          mae: z.number().nullable().optional(),
          worstPrice: z.number().nullable().optional(),
          entryTime: z.number().nullable().optional(),
        })
        .nullable()
        .optional(),
    }),
  },
  async ({ ticker }: { ticker: string }) => {
    if (!ticker || typeof ticker !== 'string' || ticker.trim().length === 0) {
      const errorResult = {
        ticker: ticker || '',
        price: null as number | null,
        timestamp: new Date().toISOString(),
        position: null,
      }
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                ...errorResult,
                error: 'Invalid ticker parameter',
                message: 'Ticker must be a non-empty string',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: errorResult,
      }
    }

    try {
      const normalizedTicker = ticker.trim().toUpperCase()

      // Get current price
      const currentPrice = await getRealTimePrice(normalizedTicker).catch(() => null)

      // Get active positions (from account state or tracked positions)
      const positions = getActivePositions(null)
      const position = positions.get(normalizedTicker) || null

      if (!position) {
        const result = {
          ticker: normalizedTicker,
          price: currentPrice,
          timestamp: new Date().toISOString(),
          position: null,
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

      // Get historical data for MAE calculation
      let maeResult = null
      if (currentPrice) {
        try {
          const { marketDataMap } = await getMarketData([normalizedTicker])
          const assetData = marketDataMap.get(normalizedTicker)
          const historicalData = assetData?.historicalData || assetData?.data?.historicalData || []
          
          maeResult = calculateMAE(
            {
              entryPrice: position.entryPrice,
              quantity: position.quantity,
              side: position.side,
              entryTime: position.entryTime,
            },
            currentPrice,
            historicalData
          )
        } catch (error) {
          // If MAE calculation fails, continue without it
          console.error(`Failed to calculate MAE for ${normalizedTicker}:`, error)
        }
      }

      const formattedPosition = formatPosition(position, currentPrice, maeResult)

      const result = {
        ticker: normalizedTicker,
        price: currentPrice,
        timestamp: new Date().toISOString(),
        position: formattedPosition,
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
      const errorResult = {
        ticker: ticker.trim().toUpperCase(),
        price: null as number | null,
        timestamp: new Date().toISOString(),
        position: null,
      }
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                ...errorResult,
                error: error instanceof Error ? error.message : String(error),
                message: 'Failed to fetch position',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: errorResult,
      }
    }
  }
)

// Register get_multiple_positions tool
server.registerTool(
  'get_multiple_positions',
  {
    title: 'Get Multiple Positions',
    description: 'Get current position information for multiple trading tickers at once (e.g., ["BTC", "ETH", "SOL"])',
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
          position: z
            .object({
              side: z.string().nullable().optional(),
              quantity: z.number().nullable().optional(),
              entryPrice: z.number().nullable().optional(),
              currentPrice: z.number().nullable().optional(),
              leverage: z.number().nullable().optional(),
              unrealizedPnl: z.number().nullable().optional(),
              unrealizedPnlPct: z.number().nullable().optional(),
              pnlPctOnMargin: z.number().nullable().optional(),
              mae: z.number().nullable().optional(),
              worstPrice: z.number().nullable().optional(),
              entryTime: z.number().nullable().optional(),
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

    // Normalize all tickers
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
      // Get active positions
      const positions = getActivePositions(null)

      // Get prices for all tickers in parallel
      const pricePromises = normalizedTickers.map(async (ticker) => {
        try {
          const price = await getRealTimePrice(ticker)
          return { ticker, price }
        } catch (error) {
          return { ticker, price: null as number | null }
        }
      })
      const priceResults = await Promise.all(pricePromises)

      // Get market data for MAE calculation
      const { marketDataMap } = await getMarketData(normalizedTickers)

      const results: Array<{
        ticker: string
        price: number | null
        timestamp?: string
        position: ReturnType<typeof formatPosition>
      }> = []

      for (const { ticker, price } of priceResults) {
        const position = positions.get(ticker) || null

        if (!position) {
          results.push({
            ticker,
            price,
            timestamp: new Date().toISOString(),
            position: null,
          })
          continue
        }

        // Calculate MAE
        let maeResult = null
        if (price) {
          try {
            const assetData = marketDataMap.get(ticker)
            const historicalData = assetData?.historicalData || assetData?.data?.historicalData || []
            
            maeResult = calculateMAE(
              {
                entryPrice: position.entryPrice,
                quantity: position.quantity,
                side: position.side,
                entryTime: position.entryTime,
              },
              price,
              historicalData
            )
          } catch (error) {
            // Continue without MAE if calculation fails
          }
        }

        const formattedPosition = formatPosition(position, price, maeResult)

        results.push({
          ticker,
          price,
          timestamp: new Date().toISOString(),
          position: formattedPosition,
        })
      }

      const found = results.filter((r) => r.position !== null).length
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
                message: 'Failed to fetch positions',
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
        potentialLoss: z.number().nullable().optional(),
        potentialProfit: z.number().nullable().optional(),
        riskRewardRatio: z.number().nullable().optional(),
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

      const riskManagement = formatRiskManagement(
        entryPrice,
        side,
        stopLossPct,
        takeProfitPct,
        positionSize
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

      // Calculate position size
      const positionSizeResult = calculatePositionSize(
        mockSignal,
        {
          strategy: strategy as any,
          totalCapital,
          maxPositionSizePct: 20,
          reserveCapitalPct: 10,
          topNRanking: ranking,
        },
        0 // existingPositionsCount
      )

      const positionSizeUsd = positionSizeResult.sizeUsd || totalCapital * 0.1 // Fallback to 10% of capital

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

// Register get_fibonacci tool
server.registerTool(
  'get_fibonacci',
  {
    title: 'Get Fibonacci Retracement',
    description: 'Get Fibonacci retracement levels and analysis for a single trading ticker. For multiple tickers, use get_multiple_fibonacci.',
    inputSchema: {
      ticker: z.string().describe('Asset ticker symbol (e.g., "BTC", "ETH", "SOL")'),
    },
    outputSchema: z.object({
      ticker: z.string(),
      price: z.number().nullable(),
      timestamp: z.string().optional(),
      fibonacci: z
        .object({
          levels: z.object({
            level0: z.number(),
            level236: z.number(),
            level382: z.number(),
            level500: z.number(),
            level618: z.number(),
            level786: z.number(),
            level100: z.number(),
            level1272: z.number(),
            level1618: z.number(),
            level2000: z.number(),
          }),
          currentLevel: z.string().nullable(),
          distanceFromLevel: z.number().nullable(),
          isNearLevel: z.boolean(),
          nearestLevel: z.string().nullable(),
          nearestLevelPrice: z.number().nullable(),
          swingHigh: z.number(),
          swingLow: z.number(),
          range: z.number(),
          direction: z.enum(['uptrend', 'downtrend', 'neutral']),
          strength: z.number(),
          signal: z.enum(['buy', 'sell', 'neutral']).nullable(),
        })
        .nullable()
        .optional(),
    }),
  },
  async ({ ticker }: { ticker: string }) => {
    if (!ticker || typeof ticker !== 'string' || ticker.trim().length === 0) {
      const errorResult = {
        ticker: ticker || '',
        price: null as number | null,
        timestamp: new Date().toISOString(),
        fibonacci: null,
      }
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                ...errorResult,
                error: 'Invalid ticker parameter',
                message: 'Ticker must be a non-empty string',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: errorResult,
      }
    }

    try {
      const normalizedTicker = ticker.trim().toUpperCase()

      // Get current price
      const currentPrice = await getRealTimePrice(normalizedTicker).catch(() => null)

      // Get market data
      if (!process.env.CANDLES_COUNT || parseInt(process.env.CANDLES_COUNT) < 75) {
        process.env.CANDLES_COUNT = '75'
      }
      const { marketDataMap } = await getMarketData([normalizedTicker])
      const assetData = marketDataMap.get(normalizedTicker)

      if (!assetData) {
        const result = {
          ticker: normalizedTicker,
          price: currentPrice,
          timestamp: new Date().toISOString(),
          fibonacci: null,
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

      const historicalData = assetData?.historicalData || assetData?.data?.historicalData || []
      if (historicalData.length < 50) {
        const result = {
          ticker: normalizedTicker,
          price: currentPrice,
          timestamp: new Date().toISOString(),
          fibonacci: null,
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

      const highs = historicalData.map((d: any) => d.high || d.close)
      const lows = historicalData.map((d: any) => d.low || d.close)
      const closes = historicalData.map((d: any) => d.close)

      const fibonacci = calculateFibonacciRetracement(highs, lows, closes, 50)
      const formattedFibonacci = formatFibonacci(fibonacci)

      const result = {
        ticker: normalizedTicker,
        price: currentPrice,
        timestamp: new Date().toISOString(),
        fibonacci: formattedFibonacci,
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
      const errorResult = {
        ticker: ticker.trim().toUpperCase(),
        price: null as number | null,
        timestamp: new Date().toISOString(),
        fibonacci: null,
      }
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                ...errorResult,
                error: error instanceof Error ? error.message : String(error),
                message: 'Failed to fetch Fibonacci data',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: errorResult,
      }
    }
  }
)

// Register get_multiple_fibonacci tool
server.registerTool(
  'get_multiple_fibonacci',
  {
    title: 'Get Multiple Fibonacci Retracement',
    description: 'Get Fibonacci retracement levels and analysis for multiple trading tickers at once (e.g., ["BTC", "ETH", "SOL"])',
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
          fibonacci: z
            .object({
              levels: z.object({
                level0: z.number(),
                level236: z.number(),
                level382: z.number(),
                level500: z.number(),
                level618: z.number(),
                level786: z.number(),
                level100: z.number(),
                level1272: z.number(),
                level1618: z.number(),
                level2000: z.number(),
              }),
              currentLevel: z.string().nullable(),
              distanceFromLevel: z.number().nullable(),
              isNearLevel: z.boolean(),
              nearestLevel: z.string().nullable(),
              nearestLevelPrice: z.number().nullable(),
              swingHigh: z.number(),
              swingLow: z.number(),
              range: z.number(),
              direction: z.enum(['uptrend', 'downtrend', 'neutral']),
              strength: z.number(),
              signal: z.enum(['buy', 'sell', 'neutral']).nullable(),
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
        fibonacci: ReturnType<typeof formatFibonacci>
      }> = []

      for (const ticker of normalizedTickers) {
        const assetData = marketDataMap.get(ticker)
        const price = await getRealTimePrice(ticker).catch(() => null)

        if (!assetData) {
          results.push({
            ticker,
            price,
            timestamp: new Date().toISOString(),
            fibonacci: null,
          })
          continue
        }

        const historicalData = assetData?.historicalData || assetData?.data?.historicalData || []
        if (historicalData.length < 50) {
          results.push({
            ticker,
            price,
            timestamp: new Date().toISOString(),
            fibonacci: null,
          })
          continue
        }

        const highs = historicalData.map((d: any) => d.high || d.close)
        const lows = historicalData.map((d: any) => d.low || d.close)
        const closes = historicalData.map((d: any) => d.close)

        const fibonacci = calculateFibonacciRetracement(highs, lows, closes, 50)
        const formattedFibonacci = formatFibonacci(fibonacci)

        results.push({
          ticker,
          price,
          timestamp: new Date().toISOString(),
          fibonacci: formattedFibonacci,
        })
      }

      const found = results.filter((r) => r.fibonacci !== null).length
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
                message: 'Failed to fetch Fibonacci data',
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

// Register get_orderbook_depth tool
server.registerTool(
  'get_orderbook_depth',
  {
    title: 'Get Order Book Depth',
    description: 'Get order book depth analysis for a single trading ticker (bid/ask depth, spread, imbalance, support/resistance zones). For multiple tickers, use get_multiple_orderbook_depth.',
    inputSchema: {
      ticker: z.string().describe('Asset ticker symbol (e.g., "BTC", "ETH", "SOL")'),
    },
    outputSchema: z.object({
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
    }),
  },
  async ({ ticker }: { ticker: string }) => {
    if (!ticker || typeof ticker !== 'string' || ticker.trim().length === 0) {
      const errorResult = {
        ticker: ticker || '',
        price: null as number | null,
        timestamp: new Date().toISOString(),
        orderBookDepth: null,
      }
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                ...errorResult,
                error: 'Invalid ticker parameter',
                message: 'Ticker must be a non-empty string',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: errorResult,
      }
    }

    try {
      const normalizedTicker = ticker.trim().toUpperCase()
      const currentPrice = await getRealTimePrice(normalizedTicker).catch(() => null)

      if (!process.env.CANDLES_COUNT || parseInt(process.env.CANDLES_COUNT) < 75) {
        process.env.CANDLES_COUNT = '75'
      }
      const { marketDataMap } = await getMarketData([normalizedTicker])
      const assetData = marketDataMap.get(normalizedTicker)

      if (!assetData) {
        const result = {
          ticker: normalizedTicker,
          price: currentPrice,
          timestamp: new Date().toISOString(),
          orderBookDepth: null,
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

      const orderBookDepth = assetData?.externalData?.orderBook || assetData?.data?.externalData?.orderBook || null
      const formattedOrderBook = formatOrderBookDepth(orderBookDepth)

      const result = {
        ticker: normalizedTicker,
        price: currentPrice,
        timestamp: new Date().toISOString(),
        orderBookDepth: formattedOrderBook,
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
      const errorResult = {
        ticker: ticker.trim().toUpperCase(),
        price: null as number | null,
        timestamp: new Date().toISOString(),
        orderBookDepth: null,
      }
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                ...errorResult,
                error: error instanceof Error ? error.message : String(error),
                message: 'Failed to fetch order book depth',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: errorResult,
      }
    }
  }
)

// Register get_multiple_orderbook_depth tool
server.registerTool(
  'get_multiple_orderbook_depth',
  {
    title: 'Get Multiple Order Book Depth',
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
    description: 'Get volume profile analysis for a single trading ticker (POC, VAH/VAL, HVN/LVN, accumulation/distribution zones). For multiple tickers, use get_multiple_volume_profile.',
    inputSchema: {
      ticker: z.string().describe('Asset ticker symbol (e.g., "BTC", "ETH", "SOL")'),
    },
    outputSchema: z.object({
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
    }),
  },
  async ({ ticker }: { ticker: string }) => {
    if (!ticker || typeof ticker !== 'string' || ticker.trim().length === 0) {
      const errorResult = {
        ticker: ticker || '',
        price: null as number | null,
        timestamp: new Date().toISOString(),
        volumeProfile: null,
      }
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                ...errorResult,
                error: 'Invalid ticker parameter',
                message: 'Ticker must be a non-empty string',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: errorResult,
      }
    }

    try {
      const normalizedTicker = ticker.trim().toUpperCase()
      const currentPrice = await getRealTimePrice(normalizedTicker).catch(() => null)

      if (!process.env.CANDLES_COUNT || parseInt(process.env.CANDLES_COUNT) < 75) {
        process.env.CANDLES_COUNT = '75'
      }
      const { marketDataMap } = await getMarketData([normalizedTicker])
      const assetData = marketDataMap.get(normalizedTicker)

      if (!assetData) {
        const result = {
          ticker: normalizedTicker,
          price: currentPrice,
          timestamp: new Date().toISOString(),
          volumeProfile: null,
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

      const volumeProfileData = assetData?.externalData?.volumeProfile || assetData?.data?.externalData?.volumeProfile || null
      const formattedVolumeProfile = formatVolumeProfile(
        volumeProfileData?.session || null,
        volumeProfileData?.composite || null
      )

      const result = {
        ticker: normalizedTicker,
        price: currentPrice,
        timestamp: new Date().toISOString(),
        volumeProfile: formattedVolumeProfile,
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
      const errorResult = {
        ticker: ticker.trim().toUpperCase(),
        price: null as number | null,
        timestamp: new Date().toISOString(),
        volumeProfile: null,
      }
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                ...errorResult,
                error: error instanceof Error ? error.message : String(error),
                message: 'Failed to fetch volume profile',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: errorResult,
      }
    }
  }
)

// Register get_multiple_volume_profile tool
server.registerTool(
  'get_multiple_volume_profile',
  {
    title: 'Get Multiple Volume Profile',
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
    description: 'Get market structure analysis (Change of Character, swing highs/lows, reversal signals) for a single trading ticker. For multiple tickers, use get_multiple_market_structure.',
    inputSchema: {
      ticker: z.string().describe('Asset ticker symbol (e.g., "BTC", "ETH", "SOL")'),
    },
    outputSchema: z.object({
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
    }),
  },
  async ({ ticker }: { ticker: string }) => {
    if (!ticker || typeof ticker !== 'string' || ticker.trim().length === 0) {
      const errorResult = {
        ticker: ticker || '',
        price: null as number | null,
        timestamp: new Date().toISOString(),
        marketStructure: null,
      }
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                ...errorResult,
                error: 'Invalid ticker parameter',
                message: 'Ticker must be a non-empty string',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: errorResult,
      }
    }

    try {
      const normalizedTicker = ticker.trim().toUpperCase()
      const currentPrice = await getRealTimePrice(normalizedTicker).catch(() => null)

      if (!process.env.CANDLES_COUNT || parseInt(process.env.CANDLES_COUNT) < 75) {
        process.env.CANDLES_COUNT = '75'
      }
      const { marketDataMap } = await getMarketData([normalizedTicker])
      const assetData = marketDataMap.get(normalizedTicker)

      if (!assetData || !currentPrice) {
        const result = {
          ticker: normalizedTicker,
          price: currentPrice,
          timestamp: new Date().toISOString(),
          marketStructure: null,
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

      const historicalData = assetData?.historicalData || assetData?.data?.historicalData || []
      if (historicalData.length < 20) {
        const result = {
          ticker: normalizedTicker,
          price: currentPrice,
          timestamp: new Date().toISOString(),
          marketStructure: null,
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

      const marketStructure = detectChangeOfCharacter(historicalData, currentPrice)
      const formattedMarketStructure = formatMarketStructure(marketStructure)

      const result = {
        ticker: normalizedTicker,
        price: currentPrice,
        timestamp: new Date().toISOString(),
        marketStructure: formattedMarketStructure,
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
      const errorResult = {
        ticker: ticker.trim().toUpperCase(),
        price: null as number | null,
        timestamp: new Date().toISOString(),
        marketStructure: null,
      }
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                ...errorResult,
                error: error instanceof Error ? error.message : String(error),
                message: 'Failed to fetch market structure',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: errorResult,
      }
    }
  }
)

// Register get_multiple_market_structure tool
server.registerTool(
  'get_multiple_market_structure',
  {
    title: 'Get Multiple Market Structure',
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

// Register get_candlestick_patterns tool
server.registerTool(
  'get_candlestick_patterns',
  {
    title: 'Get Candlestick Patterns',
    description: 'Get candlestick pattern detection for a single trading ticker (doji, hammer, engulfing patterns). For multiple tickers, use get_multiple_candlestick_patterns.',
    inputSchema: {
      ticker: z.string().describe('Asset ticker symbol (e.g., "BTC", "ETH", "SOL")'),
    },
    outputSchema: z.object({
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
    }),
  },
  async ({ ticker }: { ticker: string }) => {
    if (!ticker || typeof ticker !== 'string' || ticker.trim().length === 0) {
      const errorResult = {
        ticker: ticker || '',
        price: null as number | null,
        timestamp: new Date().toISOString(),
        candlestickPatterns: null,
      }
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                ...errorResult,
                error: 'Invalid ticker parameter',
                message: 'Ticker must be a non-empty string',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: errorResult,
      }
    }

    try {
      const normalizedTicker = ticker.trim().toUpperCase()
      const currentPrice = await getRealTimePrice(normalizedTicker).catch(() => null)

      if (!process.env.CANDLES_COUNT || parseInt(process.env.CANDLES_COUNT) < 75) {
        process.env.CANDLES_COUNT = '75'
      }
      const { marketDataMap } = await getMarketData([normalizedTicker])
      const assetData = marketDataMap.get(normalizedTicker)

      if (!assetData) {
        const result = {
          ticker: normalizedTicker,
          price: currentPrice,
          timestamp: new Date().toISOString(),
          candlestickPatterns: null,
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

      const historicalData = assetData?.historicalData || assetData?.data?.historicalData || []
      if (historicalData.length < 5) {
        const result = {
          ticker: normalizedTicker,
          price: currentPrice,
          timestamp: new Date().toISOString(),
          candlestickPatterns: formatCandlestickPatterns(null),
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

      const patterns = detectCandlestickPatterns(historicalData, 5)
      const formattedPatterns = formatCandlestickPatterns(patterns)

      const result = {
        ticker: normalizedTicker,
        price: currentPrice,
        timestamp: new Date().toISOString(),
        candlestickPatterns: formattedPatterns,
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
      const errorResult = {
        ticker: ticker.trim().toUpperCase(),
        price: null as number | null,
        timestamp: new Date().toISOString(),
        candlestickPatterns: null,
      }
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                ...errorResult,
                error: error instanceof Error ? error.message : String(error),
                message: 'Failed to fetch candlestick patterns',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: errorResult,
      }
    }
  }
)

// Register get_multiple_candlestick_patterns tool
server.registerTool(
  'get_multiple_candlestick_patterns',
  {
    title: 'Get Multiple Candlestick Patterns',
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
    description: 'Get RSI divergence detection for a single trading ticker (bullish/bearish divergence signals). For multiple tickers, use get_multiple_divergence.',
    inputSchema: {
      ticker: z.string().describe('Asset ticker symbol (e.g., "BTC", "ETH", "SOL")'),
    },
    outputSchema: z.object({
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
    }),
  },
  async ({ ticker }: { ticker: string }) => {
    if (!ticker || typeof ticker !== 'string' || ticker.trim().length === 0) {
      const errorResult = {
        ticker: ticker || '',
        price: null as number | null,
        timestamp: new Date().toISOString(),
        divergence: null,
      }
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                ...errorResult,
                error: 'Invalid ticker parameter',
                message: 'Ticker must be a non-empty string',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: errorResult,
      }
    }

    try {
      const normalizedTicker = ticker.trim().toUpperCase()
      const currentPrice = await getRealTimePrice(normalizedTicker).catch(() => null)

      if (!process.env.CANDLES_COUNT || parseInt(process.env.CANDLES_COUNT) < 75) {
        process.env.CANDLES_COUNT = '75'
      }
      const { marketDataMap } = await getMarketData([normalizedTicker])
      const assetData = marketDataMap.get(normalizedTicker)

      if (!assetData) {
        const result = {
          ticker: normalizedTicker,
          price: currentPrice,
          timestamp: new Date().toISOString(),
          divergence: null,
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

      const historicalData = assetData?.historicalData || assetData?.data?.historicalData || []

      if (historicalData.length < 20) {
        const result = {
          ticker: normalizedTicker,
          price: currentPrice,
          timestamp: new Date().toISOString(),
          divergence: null,
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

      // Calculate RSI values for divergence detection
      const prices = historicalData.map((d: any) => d.close)
      const rsiValues = calculateRSI(prices, 14)

      if (rsiValues.length < 20) {
        const result = {
          ticker: normalizedTicker,
          price: currentPrice,
          timestamp: new Date().toISOString(),
          divergence: null,
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

      // Use RSI array for divergence detection
      const divergence = detectDivergence(prices, rsiValues, 20)
      const formattedDivergence = formatDivergence(divergence)

      const result = {
        ticker: normalizedTicker,
        price: currentPrice,
        timestamp: new Date().toISOString(),
        divergence: formattedDivergence,
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
      const errorResult = {
        ticker: ticker.trim().toUpperCase(),
        price: null as number | null,
        timestamp: new Date().toISOString(),
        divergence: null,
      }
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                ...errorResult,
                error: error instanceof Error ? error.message : String(error),
                message: 'Failed to fetch divergence data',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: errorResult,
      }
    }
  }
)

// Register get_multiple_divergence tool
server.registerTool(
  'get_multiple_divergence',
  {
    title: 'Get Multiple Divergence Detection',
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
    description: 'Get liquidation level analysis for a single trading ticker (clusters, stop hunt zones, safe entry zones). For multiple tickers, use get_multiple_liquidation_levels.',
    inputSchema: {
      ticker: z.string().describe('Asset ticker symbol (e.g., "BTC", "ETH", "SOL")'),
    },
    outputSchema: z.object({
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
    }),
  },
  async ({ ticker }: { ticker: string }) => {
    if (!ticker || typeof ticker !== 'string' || ticker.trim().length === 0) {
      const errorResult = {
        ticker: ticker || '',
        price: null as number | null,
        timestamp: new Date().toISOString(),
        liquidationLevels: null,
      }
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                ...errorResult,
                error: 'Invalid ticker parameter',
                message: 'Ticker must be a non-empty string',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: errorResult,
      }
    }

    try {
      const normalizedTicker = ticker.trim().toUpperCase()
      const currentPrice = await getRealTimePrice(normalizedTicker).catch(() => null)

      if (!process.env.CANDLES_COUNT || parseInt(process.env.CANDLES_COUNT) < 75) {
        process.env.CANDLES_COUNT = '75'
      }
      const { marketDataMap } = await getMarketData([normalizedTicker])
      const assetData = marketDataMap.get(normalizedTicker)

      if (!assetData || !currentPrice) {
        const result = {
          ticker: normalizedTicker,
          price: currentPrice,
          timestamp: new Date().toISOString(),
          liquidationLevels: null,
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

      const futuresData = assetData?.externalData?.futures || assetData?.data?.externalData?.futures || null
      const liquidationData = futuresData?.liquidation || null

      if (!liquidationData) {
        const result = {
          ticker: normalizedTicker,
          price: currentPrice,
          timestamp: new Date().toISOString(),
          liquidationLevels: null,
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

      const liquidation = calculateLiquidationIndicators(liquidationData, currentPrice)
      const formattedLiquidation = formatLiquidationLevels(liquidation)

      const result = {
        ticker: normalizedTicker,
        price: currentPrice,
        timestamp: new Date().toISOString(),
        liquidationLevels: formattedLiquidation,
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
      const errorResult = {
        ticker: ticker.trim().toUpperCase(),
        price: null as number | null,
        timestamp: new Date().toISOString(),
        liquidationLevels: null,
      }
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                ...errorResult,
                error: error instanceof Error ? error.message : String(error),
                message: 'Failed to fetch liquidation levels',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: errorResult,
      }
    }
  }
)

// Register get_multiple_liquidation_levels tool
server.registerTool(
  'get_multiple_liquidation_levels',
  {
    title: 'Get Multiple Liquidation Levels',
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
    description: 'Get long/short ratio analysis for a single trading ticker (sentiment, contrarian signals, extreme ratios). For multiple tickers, use get_multiple_long_short_ratio.',
    inputSchema: {
      ticker: z.string().describe('Asset ticker symbol (e.g., "BTC", "ETH", "SOL")'),
    },
    outputSchema: z.object({
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
    }),
  },
  async ({ ticker }: { ticker: string }) => {
    if (!ticker || typeof ticker !== 'string' || ticker.trim().length === 0) {
      const errorResult = {
        ticker: ticker || '',
        price: null as number | null,
        timestamp: new Date().toISOString(),
        longShortRatio: null,
      }
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                ...errorResult,
                error: 'Invalid ticker parameter',
                message: 'Ticker must be a non-empty string',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: errorResult,
      }
    }

    try {
      const normalizedTicker = ticker.trim().toUpperCase()
      const currentPrice = await getRealTimePrice(normalizedTicker).catch(() => null)

      if (!process.env.CANDLES_COUNT || parseInt(process.env.CANDLES_COUNT) < 75) {
        process.env.CANDLES_COUNT = '75'
      }
      const { marketDataMap } = await getMarketData([normalizedTicker])
      const assetData = marketDataMap.get(normalizedTicker)

      if (!assetData) {
        const result = {
          ticker: normalizedTicker,
          price: currentPrice,
          timestamp: new Date().toISOString(),
          longShortRatio: null,
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

      const futuresData = assetData?.externalData?.futures || assetData?.data?.externalData?.futures || null
      const longShortRatioData = futuresData?.longShortRatio || null

      if (!longShortRatioData) {
        const result = {
          ticker: normalizedTicker,
          price: currentPrice,
          timestamp: new Date().toISOString(),
          longShortRatio: null,
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

      const ratio = calculateLongShortRatioIndicators(longShortRatioData)
      const formattedRatio = formatLongShortRatio(ratio)

      const result = {
        ticker: normalizedTicker,
        price: currentPrice,
        timestamp: new Date().toISOString(),
        longShortRatio: formattedRatio,
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
      const errorResult = {
        ticker: ticker.trim().toUpperCase(),
        price: null as number | null,
        timestamp: new Date().toISOString(),
        longShortRatio: null,
      }
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                ...errorResult,
                error: error instanceof Error ? error.message : String(error),
                message: 'Failed to fetch long/short ratio',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: errorResult,
      }
    }
  }
)

// Register get_multiple_long_short_ratio tool
server.registerTool(
  'get_multiple_long_short_ratio',
  {
    title: 'Get Multiple Long/Short Ratio',
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

// Register get_spot_futures_divergence tool
server.registerTool(
  'get_spot_futures_divergence',
  {
    title: 'Get Spot-Futures Divergence',
    description: 'Get spot-futures divergence analysis for a single trading ticker (premium/discount, arbitrage opportunities, mean reversion signals). For multiple tickers, use get_multiple_spot_futures_divergence.',
    inputSchema: {
      ticker: z.string().describe('Asset ticker symbol (e.g., "BTC", "ETH", "SOL")'),
    },
    outputSchema: z.object({
      ticker: z.string(),
      price: z.number().nullable(),
      timestamp: z.string().optional(),
      spotFuturesDivergence: z
        .object({
          premium: z.object({
            current: z.number(),
            level: z.enum(['high', 'normal', 'low']),
            trend: z.enum(['rising', 'falling', 'neutral']),
          }),
          arbitrage: z.object({
            opportunity: z.boolean(),
            type: z.enum(['long_spot_short_futures', 'short_spot_long_futures', 'none']),
            profit: z.number(),
          }),
          meanReversion: z.object({
            signal: z.boolean(),
            direction: z.enum(['long', 'short', 'neutral']),
            strength: z.number(),
          }),
          divergence: z.object({
            fromAverage: z.number(),
            signal: z.enum(['bullish', 'bearish', 'neutral']),
          }),
        })
        .nullable()
        .optional(),
    }),
  },
  async ({ ticker }: { ticker: string }) => {
    if (!ticker || typeof ticker !== 'string' || ticker.trim().length === 0) {
      const errorResult = {
        ticker: ticker || '',
        price: null as number | null,
        timestamp: new Date().toISOString(),
        spotFuturesDivergence: null,
      }
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                ...errorResult,
                error: 'Invalid ticker parameter',
                message: 'Ticker must be a non-empty string',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: errorResult,
      }
    }

    try {
      const normalizedTicker = ticker.trim().toUpperCase()
      const currentPrice = await getRealTimePrice(normalizedTicker).catch(() => null)

      if (!process.env.CANDLES_COUNT || parseInt(process.env.CANDLES_COUNT) < 75) {
        process.env.CANDLES_COUNT = '75'
      }
      const { marketDataMap } = await getMarketData([normalizedTicker])
      const assetData = marketDataMap.get(normalizedTicker)

      if (!assetData) {
        const result = {
          ticker: normalizedTicker,
          price: currentPrice,
          timestamp: new Date().toISOString(),
          spotFuturesDivergence: null,
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

      const futuresData = assetData?.externalData?.futures || assetData?.data?.externalData?.futures || null
      const premiumIndexData = futuresData?.premiumIndex || null

      if (!premiumIndexData) {
        const result = {
          ticker: normalizedTicker,
          price: currentPrice,
          timestamp: new Date().toISOString(),
          spotFuturesDivergence: null,
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

      const divergence = calculateSpotFuturesDivergenceIndicators(premiumIndexData)
      const formattedDivergence = formatSpotFuturesDivergence(divergence)

      const result = {
        ticker: normalizedTicker,
        price: currentPrice,
        timestamp: new Date().toISOString(),
        spotFuturesDivergence: formattedDivergence,
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
      const errorResult = {
        ticker: ticker.trim().toUpperCase(),
        price: null as number | null,
        timestamp: new Date().toISOString(),
        spotFuturesDivergence: null,
      }
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                ...errorResult,
                error: error instanceof Error ? error.message : String(error),
                message: 'Failed to fetch spot-futures divergence',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: errorResult,
      }
    }
  }
)

// Register get_multiple_spot_futures_divergence tool
server.registerTool(
  'get_multiple_spot_futures_divergence',
  {
    title: 'Get Multiple Spot-Futures Divergence',
    description: 'Get spot-futures divergence analysis for multiple trading tickers at once (e.g., ["BTC", "ETH", "SOL"])',
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
          spotFuturesDivergence: z
            .object({
              premium: z.object({
                current: z.number(),
                level: z.enum(['high', 'normal', 'low']),
                trend: z.enum(['rising', 'falling', 'neutral']),
              }),
              arbitrage: z.object({
                opportunity: z.boolean(),
                type: z.enum(['long_spot_short_futures', 'short_spot_long_futures', 'none']),
                profit: z.number(),
              }),
              meanReversion: z.object({
                signal: z.boolean(),
                direction: z.enum(['long', 'short', 'neutral']),
                strength: z.number(),
              }),
              divergence: z.object({
                fromAverage: z.number(),
                signal: z.enum(['bullish', 'bearish', 'neutral']),
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
        spotFuturesDivergence: ReturnType<typeof formatSpotFuturesDivergence>
      }> = []

      for (const ticker of normalizedTickers) {
        const assetData = marketDataMap.get(ticker)
        const price = await getRealTimePrice(ticker).catch(() => null)

        if (!assetData) {
          results.push({
            ticker,
            price,
            timestamp: new Date().toISOString(),
            spotFuturesDivergence: null,
          })
          continue
        }

        const futuresData = assetData?.externalData?.futures || assetData?.data?.externalData?.futures || null
        const premiumIndexData = futuresData?.premiumIndex || null

        if (!premiumIndexData) {
          results.push({
            ticker,
            price,
            timestamp: new Date().toISOString(),
            spotFuturesDivergence: null,
          })
          continue
        }

        const divergence = calculateSpotFuturesDivergenceIndicators(premiumIndexData)
        const formattedDivergence = formatSpotFuturesDivergence(divergence)

        results.push({
          ticker,
          price,
          timestamp: new Date().toISOString(),
          spotFuturesDivergence: formattedDivergence,
        })
      }

      const found = results.filter((r) => r.spotFuturesDivergence !== null).length
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
                message: 'Failed to fetch spot-futures divergence',
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

// Helper function to format execution data from Order
function formatExecutionFromOrder(order: any, isSpot: boolean = false) {
  const leverage = isSpot ? 1 : (order.leverage || 1)
  const positionValue = (order.filledQuantity || order.quantity) * (order.filledPrice || order.price || 0)
  const marginRequired = isSpot ? positionValue : positionValue / leverage

  return {
    orderId: order.id,
    ticker: order.symbol,
    side: order.side,
    quantity: order.filledQuantity || order.quantity,
    price: order.filledPrice || order.price || 0,
    leverage,
    orderType: order.type || 'MARKET',
    positionValue,
    marginRequired,
    isSpot,
    status: order.status || 'PENDING',
    submittedAt: order.submittedAt ? new Date(order.submittedAt).toISOString() : new Date().toISOString(),
    filledAt: order.filledAt ? new Date(order.filledAt).toISOString() : null,
    estimatedFillPrice: order.filledPrice || order.price || 0,
    estimatedSlippage: order.type === 'MARKET' ? (order.filledPrice || order.price || 0) * 0.001 : 0,
    rejectedReason: order.rejectedReason || null,
  }
}

// Helper function to create Signal from execution parameters
function createSignalFromExecution(
  ticker: string,
  side: 'LONG' | 'SHORT',
  quantity: number,
  price: number,
  leverage: number = 1
): Signal {
  return {
    coin: ticker,
    signal: side === 'LONG' ? 'buy_to_enter' : 'sell_to_enter',
    confidence: 1.0, // Default confidence for manual execution
    entry_price: price,
    quantity,
    leverage,
  }
}

// Register get_execution_spot tool
server.registerTool(
  'get_execution_spot',
  {
    title: 'Get Spot Execution',
    description: 'Get spot trading execution information for a single ticker (no leverage, 1x). For multiple tickers, use get_multiple_execution_spot.',
    inputSchema: {
      ticker: z.string().describe('Asset ticker symbol (e.g., "BTC", "ETH", "SOL")'),
      side: z.enum(['LONG', 'SHORT']).describe('Trade side: LONG (buy) or SHORT (sell)'),
      quantity: z.number().positive().describe('Quantity to trade (in base asset units)'),
      price: z.number().positive().optional().describe('Limit price (optional, if not provided, uses current market price)'),
      orderType: z.enum(['MARKET', 'LIMIT']).default('MARKET').describe('Order type: MARKET or LIMIT'),
      execute: z.boolean().default(false).optional().describe('Whether to actually execute the order via Hyperliquid (default: false, simulation only)'),
      useLiveExecutor: z.boolean().default(false).optional().describe('Whether to use live executor (requires HYPERLIQUID_WALLET_API_KEY, default: false, uses paper executor)'),
    },
    outputSchema: z.object({
      execution: z.object({
        orderId: z.string(),
        ticker: z.string(),
        side: z.enum(['LONG', 'SHORT']),
        quantity: z.number(),
        price: z.number(),
        leverage: z.literal(1),
        orderType: z.enum(['MARKET', 'LIMIT']),
        positionValue: z.number(),
        marginRequired: z.number(),
        isSpot: z.literal(true),
        status: z.string(),
        submittedAt: z.string(),
        estimatedFillPrice: z.number(),
        estimatedSlippage: z.number(),
      }),
      timestamp: z.string().optional(),
    }),
  },
  async ({ ticker, side, quantity, price, orderType = 'MARKET', execute = false, useLiveExecutor = false }: { ticker: string; side: 'LONG' | 'SHORT'; quantity: number; price?: number; orderType?: 'MARKET' | 'LIMIT'; execute?: boolean; useLiveExecutor?: boolean }) => {
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
          execution: null,
          timestamp: new Date().toISOString(),
        },
      }
    }

    if (!quantity || quantity <= 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: 'Invalid quantity parameter',
                message: 'Quantity must be a positive number',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: {
          execution: null,
          timestamp: new Date().toISOString(),
        },
      }
    }

    try {
      const normalizedTicker = ticker.trim().toUpperCase()
      const currentPrice = price || (await getRealTimePrice(normalizedTicker).catch(() => null))

      if (!currentPrice || currentPrice <= 0) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  error: 'Failed to get current price',
                  message: 'Price is required for spot execution',
                },
                null,
                2
              ),
            },
          ],
          structuredContent: {
            execution: null,
            timestamp: new Date().toISOString(),
          },
        }
      }

      let execution: any

      if (execute) {
        // Actually execute the order
        const signal = createSignalFromExecution(normalizedTicker, side, quantity, currentPrice, 1)
        
        if (useLiveExecutor) {
          // Use live executor (requires Hyperliquid wallet API key)
          const walletApiKey = getHyperliquidWalletApiKey()
          const accountAddress = getHyperliquidAccountAddress()
          
          if (!walletApiKey || !accountAddress) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    {
                      error: 'Live executor requires HYPERLIQUID_WALLET_API_KEY and HYPERLIQUID_ACCOUNT_ADDRESS',
                      message: 'Please configure wallet API key and account address in .env file',
                    },
                    null,
                    2
                  ),
                },
              ],
              structuredContent: {
                execution: null,
                timestamp: new Date().toISOString(),
              },
            }
          }

          const liveExecutor = new LiveExecutor({
            tradesFile: './trades/live-trades.json',
            orderFillTimeoutMs: 30000,
            retryOnTimeout: false,
            maxRetries: 3,
          })

          const order = await liveExecutor.executeEntry(signal, currentPrice)
          execution = formatExecutionFromOrder(order, true)
        } else {
          // Use paper executor (simulation)
          const paperExecutor = new PaperExecutor({
            paperCapital: parseFloat(process.env.PAPER_CAPITAL || '10000'),
            tradesFile: './trades/paper-trades.json',
            simulateSlippage: true,
            slippagePct: 0.1,
          })

          const order = await paperExecutor.executeEntry(signal, currentPrice)
          execution = formatExecutionFromOrder(order, true)
        }
      } else {
        // Simulation only - return execution info without executing
        const positionValue = quantity * currentPrice
        const marginRequired = positionValue // Spot = no leverage
        const orderId = `spot_sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

        execution = {
          orderId,
          ticker: normalizedTicker,
          side,
          quantity,
          price: currentPrice,
          leverage: 1,
          orderType,
          positionValue,
          marginRequired,
          isSpot: true,
          status: 'SIMULATION',
          submittedAt: new Date().toISOString(),
          estimatedFillPrice: currentPrice,
          estimatedSlippage: orderType === 'MARKET' ? currentPrice * 0.001 : 0,
          rejectedReason: null,
        }
      }

      const result = {
        execution,
        timestamp: new Date().toISOString(),
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
                message: 'Failed to get spot execution information',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: {
          execution: null,
          timestamp: new Date().toISOString(),
        },
      }
    }
  }
)

// Register get_multiple_execution_spot tool
server.registerTool(
  'get_multiple_execution_spot',
  {
    title: 'Get Multiple Spot Execution',
    description: 'Get spot trading execution information for multiple tickers at once (e.g., [{"ticker": "BTC", "side": "LONG", "quantity": 0.1}])',
    inputSchema: {
      executions: z
        .array(
          z.object({
            ticker: z.string(),
            side: z.enum(['LONG', 'SHORT']),
            quantity: z.number().positive(),
            price: z.number().positive().optional(),
            orderType: z.enum(['MARKET', 'LIMIT']).default('MARKET').optional(),
          })
        )
        .min(1)
        .describe('Array of execution requests'),
    },
    outputSchema: z.object({
      results: z.array(
        z.object({
          execution: z
            .object({
              orderId: z.string(),
              ticker: z.string(),
              side: z.enum(['LONG', 'SHORT']),
              quantity: z.number(),
              price: z.number(),
              leverage: z.literal(1),
              orderType: z.enum(['MARKET', 'LIMIT']),
              positionValue: z.number(),
              marginRequired: z.number(),
              isSpot: z.literal(true),
              status: z.string(),
              submittedAt: z.string(),
              estimatedFillPrice: z.number(),
              estimatedSlippage: z.number(),
            })
            .nullable(),
          timestamp: z.string().optional(),
        })
      ),
      summary: z
        .object({
          total: z.number(),
          success: z.number(),
          failed: z.number(),
        })
        .optional(),
    }),
  },
  async ({ executions, execute = false }: { executions: Array<{ ticker: string; side: 'LONG' | 'SHORT'; quantity: number; price?: number; orderType?: 'MARKET' | 'LIMIT' }>; execute?: boolean }) => {
    if (!Array.isArray(executions) || executions.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                results: [],
                error: 'Invalid executions parameter',
                message: 'Executions must be a non-empty array',
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
      const results: Array<{
        execution: any | null
        timestamp?: string
      }> = []

      for (const exec of executions) {
        if (!exec.ticker || !exec.side || !exec.quantity || exec.quantity <= 0) {
          results.push({
            execution: null,
            timestamp: new Date().toISOString(),
          })
          continue
        }

        try {
          const normalizedTicker = exec.ticker.trim().toUpperCase()
          const currentPrice = exec.price || (await getRealTimePrice(normalizedTicker).catch(() => null))

          if (!currentPrice || currentPrice <= 0) {
            results.push({
              execution: null,
              timestamp: new Date().toISOString(),
            })
            continue
          }

          let execution: any

          if (execute) {
            // Execute using paper executor (safer for multiple executions)
            const signal = createSignalFromExecution(normalizedTicker, exec.side, exec.quantity, currentPrice, 1)
            const paperExecutor = new PaperExecutor({
              paperCapital: parseFloat(process.env.PAPER_CAPITAL || '10000'),
              tradesFile: './trades/paper-trades.json',
              simulateSlippage: true,
              slippagePct: 0.1,
            })
            const order = await paperExecutor.executeEntry(signal, currentPrice)
            execution = formatExecutionFromOrder(order, true)
          } else {
            // Simulation only
            const positionValue = exec.quantity * currentPrice
            const marginRequired = positionValue
            const orderId = `spot_sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            execution = {
              orderId,
              ticker: normalizedTicker,
              side: exec.side,
              quantity: exec.quantity,
              price: currentPrice,
              leverage: 1,
              orderType: exec.orderType || 'MARKET',
              positionValue,
              marginRequired,
              isSpot: true,
              status: 'SIMULATION',
              submittedAt: new Date().toISOString(),
              estimatedFillPrice: currentPrice,
              estimatedSlippage: (exec.orderType || 'MARKET') === 'MARKET' ? currentPrice * 0.001 : 0,
              rejectedReason: null,
            }
          }

          results.push({
            execution,
            timestamp: new Date().toISOString(),
          })
        } catch (error) {
          results.push({
            execution: null,
            timestamp: new Date().toISOString(),
          })
        }
      }

      const success = results.filter((r) => r.execution !== null).length
      const failed = results.length - success

      const result = {
        results,
        summary: {
          total: executions.length,
          success,
          failed,
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
                message: 'Failed to get spot execution information',
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

// Register get_execution_futures tool
server.registerTool(
  'get_execution_futures',
  {
    title: 'Get Futures Execution',
    description: 'Get futures trading execution information for a single ticker (with leverage). For multiple tickers, use get_multiple_execution_futures.',
      inputSchema: {
      ticker: z.string().describe('Asset ticker symbol (e.g., "BTC", "ETH", "SOL")'),
      side: z.enum(['LONG', 'SHORT']).describe('Trade side: LONG (buy) or SHORT (sell)'),
      quantity: z.number().positive().describe('Quantity to trade (in base asset units)'),
      leverage: z.number().positive().min(1).max(50).default(10).describe('Leverage multiplier (1-50x, default: 10x)'),
      price: z.number().positive().optional().describe('Limit price (optional, if not provided, uses current market price)'),
      orderType: z.enum(['MARKET', 'LIMIT']).default('MARKET').describe('Order type: MARKET or LIMIT'),
      execute: z.boolean().default(false).optional().describe('Whether to actually execute the order via Hyperliquid (default: false, simulation only)'),
      useLiveExecutor: z.boolean().default(false).optional().describe('Whether to use live executor (requires HYPERLIQUID_WALLET_API_KEY, default: false, uses paper executor)'),
    },
    outputSchema: z.object({
      execution: z.object({
        orderId: z.string(),
        ticker: z.string(),
        side: z.enum(['LONG', 'SHORT']),
        quantity: z.number(),
        price: z.number(),
        leverage: z.number(),
        orderType: z.enum(['MARKET', 'LIMIT']),
        positionValue: z.number(),
        marginRequired: z.number(),
        isSpot: z.literal(false),
        status: z.string(),
        submittedAt: z.string(),
        estimatedFillPrice: z.number(),
        estimatedSlippage: z.number(),
      }),
      timestamp: z.string().optional(),
    }),
  },
  async ({ ticker, side, quantity, leverage = 10, price, orderType = 'MARKET', execute = false, useLiveExecutor = false }: { ticker: string; side: 'LONG' | 'SHORT'; quantity: number; leverage?: number; price?: number; orderType?: 'MARKET' | 'LIMIT'; execute?: boolean; useLiveExecutor?: boolean }) => {
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
          execution: null,
          timestamp: new Date().toISOString(),
        },
      }
    }

    if (!quantity || quantity <= 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: 'Invalid quantity parameter',
                message: 'Quantity must be a positive number',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: {
          execution: null,
          timestamp: new Date().toISOString(),
        },
      }
    }

    if (!leverage || leverage < 1 || leverage > 50) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: 'Invalid leverage parameter',
                message: 'Leverage must be between 1 and 50',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: {
          execution: null,
          timestamp: new Date().toISOString(),
        },
      }
    }

    try {
      const normalizedTicker = ticker.trim().toUpperCase()
      const currentPrice = price || (await getRealTimePrice(normalizedTicker).catch(() => null))

      if (!currentPrice || currentPrice <= 0) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  error: 'Failed to get current price',
                  message: 'Price is required for futures execution',
                },
                null,
                2
              ),
            },
          ],
          structuredContent: {
            execution: null,
            timestamp: new Date().toISOString(),
          },
        }
      }

      let execution: any

      if (execute) {
        // Actually execute the order
        const signal = createSignalFromExecution(normalizedTicker, side, quantity, currentPrice, leverage)
        
        if (useLiveExecutor) {
          // Use live executor (requires Hyperliquid wallet API key)
          const walletApiKey = getHyperliquidWalletApiKey()
          const accountAddress = getHyperliquidAccountAddress()
          
          if (!walletApiKey || !accountAddress) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    {
                      error: 'Live executor requires HYPERLIQUID_WALLET_API_KEY and HYPERLIQUID_ACCOUNT_ADDRESS',
                      message: 'Please configure wallet API key and account address in .env file',
                    },
                    null,
                    2
                  ),
                },
              ],
              structuredContent: {
                execution: null,
                timestamp: new Date().toISOString(),
              },
            }
          }

          const liveExecutor = new LiveExecutor({
            tradesFile: './trades/live-trades.json',
            orderFillTimeoutMs: 30000,
            retryOnTimeout: false,
            maxRetries: 3,
          })

          const order = await liveExecutor.executeEntry(signal, currentPrice)
          execution = formatExecutionFromOrder(order, false)
        } else {
          // Use paper executor (simulation)
          const paperExecutor = new PaperExecutor({
            paperCapital: parseFloat(process.env.PAPER_CAPITAL || '10000'),
            tradesFile: './trades/paper-trades.json',
            simulateSlippage: true,
            slippagePct: 0.1,
          })

          const order = await paperExecutor.executeEntry(signal, currentPrice)
          execution = formatExecutionFromOrder(order, false)
        }
      } else {
        // Simulation only - return execution info without executing
        const positionValue = quantity * currentPrice
        const marginRequired = positionValue / leverage
        const orderId = `futures_sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

        execution = {
          orderId,
          ticker: normalizedTicker,
          side,
          quantity,
          price: currentPrice,
          leverage,
          orderType,
          positionValue,
          marginRequired,
          isSpot: false,
          status: 'SIMULATION',
          submittedAt: new Date().toISOString(),
          estimatedFillPrice: currentPrice,
          estimatedSlippage: orderType === 'MARKET' ? currentPrice * 0.001 : 0,
          rejectedReason: null,
        }
      }

      const result = {
        execution,
        timestamp: new Date().toISOString(),
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
                message: 'Failed to get futures execution information',
              },
              null,
              2
            ),
          },
        ],
        structuredContent: {
          execution: null,
          timestamp: new Date().toISOString(),
        },
      }
    }
  }
)

// Register get_multiple_execution_futures tool
server.registerTool(
  'get_multiple_execution_futures',
  {
    title: 'Get Multiple Futures Execution',
    description: 'Get futures trading execution information for multiple tickers at once (e.g., [{"ticker": "BTC", "side": "LONG", "quantity": 0.1, "leverage": 10}])',
    inputSchema: {
      executions: z
        .array(
          z.object({
            ticker: z.string(),
            side: z.enum(['LONG', 'SHORT']),
            quantity: z.number().positive(),
            leverage: z.number().positive().min(1).max(50).default(10).optional(),
            price: z.number().positive().optional(),
            orderType: z.enum(['MARKET', 'LIMIT']).default('MARKET').optional(),
          })
        )
        .min(1)
        .describe('Array of execution requests'),
      execute: z.boolean().default(false).optional().describe('Whether to actually execute orders via Hyperliquid (default: false, simulation only). For multiple executions, uses paper executor for safety.'),
    },
    outputSchema: z.object({
      results: z.array(
        z.object({
          execution: z
            .object({
              orderId: z.string(),
              ticker: z.string(),
              side: z.enum(['LONG', 'SHORT']),
              quantity: z.number(),
              price: z.number(),
              leverage: z.number(),
              orderType: z.enum(['MARKET', 'LIMIT']),
              positionValue: z.number(),
              marginRequired: z.number(),
              isSpot: z.literal(false),
              status: z.string(),
              submittedAt: z.string(),
              estimatedFillPrice: z.number(),
              estimatedSlippage: z.number(),
            })
            .nullable(),
          timestamp: z.string().optional(),
        })
      ),
      summary: z
        .object({
          total: z.number(),
          success: z.number(),
          failed: z.number(),
        })
        .optional(),
    }),
  },
  async ({ executions, execute = false }: { executions: Array<{ ticker: string; side: 'LONG' | 'SHORT'; quantity: number; leverage?: number; price?: number; orderType?: 'MARKET' | 'LIMIT' }>; execute?: boolean }) => {
    if (!Array.isArray(executions) || executions.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                results: [],
                error: 'Invalid executions parameter',
                message: 'Executions must be a non-empty array',
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
      const results: Array<{
        execution: any | null
        timestamp?: string
      }> = []

      for (const exec of executions) {
        if (!exec.ticker || !exec.side || !exec.quantity || exec.quantity <= 0) {
          results.push({
            execution: null,
            timestamp: new Date().toISOString(),
          })
          continue
        }

        const leverage = exec.leverage || 10
        if (leverage < 1 || leverage > 50) {
          results.push({
            execution: null,
            timestamp: new Date().toISOString(),
          })
          continue
        }

        try {
          const normalizedTicker = exec.ticker.trim().toUpperCase()
          const currentPrice = exec.price || (await getRealTimePrice(normalizedTicker).catch(() => null))

          if (!currentPrice || currentPrice <= 0) {
            results.push({
              execution: null,
              timestamp: new Date().toISOString(),
            })
            continue
          }

          let execution: any

          if (execute) {
            // Execute using paper executor (safer for multiple executions)
            const signal = createSignalFromExecution(normalizedTicker, exec.side, exec.quantity, currentPrice, leverage)
            const paperExecutor = new PaperExecutor({
              paperCapital: parseFloat(process.env.PAPER_CAPITAL || '10000'),
              tradesFile: './trades/paper-trades.json',
              simulateSlippage: true,
              slippagePct: 0.1,
            })
            const order = await paperExecutor.executeEntry(signal, currentPrice)
            execution = formatExecutionFromOrder(order, false)
          } else {
            // Simulation only
            const positionValue = exec.quantity * currentPrice
            const marginRequired = positionValue / leverage
            const orderId = `futures_sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            execution = {
              orderId,
              ticker: normalizedTicker,
              side: exec.side,
              quantity: exec.quantity,
              price: currentPrice,
              leverage,
              orderType: exec.orderType || 'MARKET',
              positionValue,
              marginRequired,
              isSpot: false,
              status: 'SIMULATION',
              submittedAt: new Date().toISOString(),
              estimatedFillPrice: currentPrice,
              estimatedSlippage: (exec.orderType || 'MARKET') === 'MARKET' ? currentPrice * 0.001 : 0,
              rejectedReason: null,
            }
          }

          results.push({
            execution,
            timestamp: new Date().toISOString(),
          })
        } catch (error) {
          results.push({
            execution: null,
            timestamp: new Date().toISOString(),
          })
        }
      }

      const success = results.filter((r) => r.execution !== null).length
      const failed = results.length - success

      const result = {
        results,
        summary: {
          total: executions.length,
          success,
          failed,
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
                message: 'Failed to get futures execution information',
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

// Start server
async function main() {
  try {
    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      console.error('Uncaught exception:', error)
    })
    
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled rejection at:', promise, 'reason:', reason)
    })

    const transport = new StdioServerTransport()
    await server.connect(transport)
    console.error('GearTrade MCP Server running on stdio')
  } catch (error) {
    console.error('Failed to start MCP server:', error)
    if (error instanceof Error) {
      console.error('Error stack:', error.stack)
    }
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('Fatal error starting MCP server:', error)
  if (error instanceof Error) {
    console.error('Error stack:', error.stack)
  }
  process.exit(1)
})
