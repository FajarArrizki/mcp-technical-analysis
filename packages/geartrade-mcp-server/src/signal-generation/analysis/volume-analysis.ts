/**
 * Comprehensive Volume-Based Analysis
 * Volume confirmation, liquidity zones, footprint charts, and volume-based trading signals
 */

import { HistoricalDataPoint } from '../types'
import { SessionVolumeProfile, CompositeVolumeProfile } from './volume-profile'

// Stub type for CumulativeVolumeDelta (removed with volume-delta.ts)
export interface CumulativeVolumeDelta {
  cvd: number
  cvdTrend: 'bullish' | 'bearish' | 'neutral'
  cvdDelta: number
  cvdDivergence?: boolean
}

export interface VolumeConfirmationResult {
  isValid: boolean
  strength: 'strong' | 'moderate' | 'weak' | 'false'
  volumeRatio: number
  volumeChange: number
  reason: string
  breakoutType?: 'breakout' | 'breakdown'
  priceLevel?: number
}

export interface LiquidityZone {
  priceRange: [number, number]
  volume: number
  openInterest: number
  liquidityScore: number
  type: 'support' | 'resistance' | 'neutral'
  strength: 'high' | 'medium' | 'low'
  contracts: number
}

export interface FootprintData {
  price: number
  buyVolume: number
  sellVolume: number
  delta: number
  totalVolume: number
  buyPressure: number // percentage
  sellPressure: number // percentage
  imbalance: number // buyVolume - sellVolume
}

export interface FootprintAnalysis {
  currentPrice: number
  footprints: FootprintData[]
  totalBuyVolume: number
  totalSellVolume: number
  netDelta: number
  buyPressure: number
  sellPressure: number
  dominantSide: 'buy' | 'sell' | 'neutral'
  imbalanceRatio: number
  significantLevels: Array<{
    price: number
    buyVolume: number
    sellVolume: number
    delta: number
    significance: 'high' | 'medium' | 'low'
  }>
}

/**
 * 1. Volume Confirmation for Breakout
 * Validates breakouts with volume analysis
 */
export function confirmBreakoutWithVolume(
  historicalData: HistoricalDataPoint[],
  breakoutPrice: number,
  currentPrice: number,
  direction: 'up' | 'down',
  volumeProfile?: SessionVolumeProfile | CompositeVolumeProfile
): VolumeConfirmationResult {
  if (!historicalData || historicalData.length < 20) {
    return {
      isValid: false,
      strength: 'weak',
      volumeRatio: 0,
      volumeChange: 0,
      reason: 'Insufficient data for volume confirmation'
    }
  }

  // Get recent candles for volume analysis
  const recentCandles = historicalData.slice(-20)
  const avgVolume = recentCandles.reduce((sum, candle) => sum + (candle.volume || 0), 0) / recentCandles.length
  const currentVolume = historicalData[historicalData.length - 1]?.volume || 0

  // CRITICAL FIX: Check for division by zero - avgVolume can be 0
  if (avgVolume <= 0) {
    return {
      isValid: false,
      strength: 'weak',
      volumeRatio: 0,
      volumeChange: 0,
      reason: 'Average volume is zero - cannot calculate volume confirmation'
    }
  }

  // Calculate volume change
  const volumeChange = ((currentVolume - avgVolume) / avgVolume) * 100
  const volumeRatio = currentVolume / avgVolume

  // Determine breakout type
  const isBreakout = direction === 'up' && currentPrice > breakoutPrice
  const isBreakdown = direction === 'down' && currentPrice < breakoutPrice

  if (!isBreakout && !isBreakdown) {
    return {
      isValid: false,
      strength: 'false',
      volumeRatio,
      volumeChange,
      reason: 'Price has not broken the level yet',
      breakoutType: direction === 'up' ? 'breakout' : 'breakdown'
    }
  }

  // Volume confirmation rules
  let strength: 'strong' | 'moderate' | 'weak' | 'false' = 'weak'
  let isValid = false
  let reason = ''

  if (volumeRatio >= 2.0 && volumeChange >= 100) {
    // Strong volume confirmation
    strength = 'strong'
    isValid = true
    reason = `Strong volume confirmation: ${volumeChange.toFixed(1)}% above average (${volumeRatio.toFixed(2)}x)`
  } else if (volumeRatio >= 1.5 && volumeChange >= 50) {
    // Moderate volume confirmation
    strength = 'moderate'
    isValid = true
    reason = `Moderate volume confirmation: ${volumeChange.toFixed(1)}% above average (${volumeRatio.toFixed(2)}x)`
  } else if (volumeRatio >= 1.2 && volumeChange >= 20) {
    // Weak volume confirmation
    strength = 'weak'
    isValid = true
    reason = `Weak volume confirmation: ${volumeChange.toFixed(1)}% above average (${volumeRatio.toFixed(2)}x)`
  } else {
    // False breakout - low volume
    strength = 'false'
    isValid = false
    reason = `False breakout detected: Volume only ${volumeChange.toFixed(1)}% above average (${volumeRatio.toFixed(2)}x). Low volume suggests lack of conviction.`
  }

  // Check volume profile context if available
  if (volumeProfile) {
    const poc = volumeProfile.poc || 0
    const distanceFromPoc = Math.abs(currentPrice - poc) / poc * 100

    if (distanceFromPoc < 1 && isValid) {
      reason += ` Price near POC (${poc.toFixed(2)}), high volume expected.`
    } else if (distanceFromPoc > 5 && isValid) {
      reason += ` Price far from POC, confirm with additional volume.`
    }
  }

  return {
    isValid,
    strength,
    volumeRatio,
    volumeChange,
    reason,
    breakoutType: direction === 'up' ? 'breakout' : 'breakdown',
    priceLevel: breakoutPrice
  }
}

/**
 * 2. Liquidity Zones Analysis
 * Identifies high liquidity areas based on volume and open interest
 */
export function identifyLiquidityZones(
  historicalData: HistoricalDataPoint[],
  openInterestData?: Array<{ price: number; openInterest: number }>,
  _volumeProfile?: SessionVolumeProfile | CompositeVolumeProfile
): LiquidityZone[] {
  if (!historicalData || historicalData.length < 50) {
    return []
  }

  const zones: LiquidityZone[] = []
  const priceVolumeMap = new Map<number, { volume: number; count: number }>()

  // Aggregate volume by price levels (rounded to nearest 0.1%)
  historicalData.forEach(candle => {
    const price = candle.close || 0
    const volume = candle.volume || 0
    const roundedPrice = Math.round(price * 1000) / 1000 // Round to 0.001

    if (priceVolumeMap.has(roundedPrice)) {
      const existing = priceVolumeMap.get(roundedPrice)!
      existing.volume += volume
      existing.count += 1
    } else {
      priceVolumeMap.set(roundedPrice, { volume, count: 1 })
    }
  })

  // Convert to array and sort by volume
  const priceVolumeArray = Array.from(priceVolumeMap.entries())
    .map(([price, data]) => ({
      price,
      volume: data.volume,
      count: data.count,
      avgVolume: data.volume / data.count
    }))
    .sort((a, b) => b.volume - a.volume)

  // Get top 20% of price levels by volume
  const topCount = Math.max(5, Math.floor(priceVolumeArray.length * 0.2))
  const topPriceLevels = priceVolumeArray.slice(0, topCount)

  // Group nearby price levels into zones
  const zoneThreshold = 0.005 // 0.5% price range for zone grouping
  const processedPrices = new Set<number>()

  topPriceLevels.forEach(({ price }) => {
    if (processedPrices.has(price)) return

    // Find nearby prices to form a zone
    const zonePrices = priceVolumeArray.filter(
      p => !processedPrices.has(p.price) && Math.abs(p.price - price) / price <= zoneThreshold
    )

    if (zonePrices.length === 0) return

    // Calculate zone boundaries
    const prices = zonePrices.map(p => p.price).sort((a, b) => a - b)
    const minPrice = prices[0]
    const maxPrice = prices[prices.length - 1]
    const zoneVolume = zonePrices.reduce((sum, p) => sum + p.volume, 0)
    const zoneContracts = zonePrices.reduce((sum, p) => sum + p.count, 0)

    // Get open interest for this zone if available
    let zoneOI = 0
    if (openInterestData) {
      zoneOI = openInterestData
        .filter(oi => oi.price >= minPrice && oi.price <= maxPrice)
        .reduce((sum, oi) => sum + oi.openInterest, 0)
    }

    // Calculate liquidity score (volume + OI weighted)
    const maxVolume = priceVolumeArray[0]?.volume || 1
    const volumeScore = maxVolume > 0 ? zoneVolume / maxVolume : 0
    
    // CRITICAL FIX: Check for empty array before using Math.max to avoid -Infinity
    let oiScore = 0
    if (openInterestData && openInterestData.length > 0) {
      const maxOI = Math.max(...openInterestData.map(oi => oi.openInterest || 0))
      if (maxOI > 0) {
        oiScore = zoneOI / maxOI
      }
    }
    
    const liquidityScore = (volumeScore * 0.7) + (oiScore * 0.3)

    // Determine zone type and strength
    const currentPrice = historicalData[historicalData.length - 1]?.close || 0
    const zoneCenter = (minPrice + maxPrice) / 2
    const isSupport = currentPrice > zoneCenter
    const isResistance = currentPrice < zoneCenter

    let type: 'support' | 'resistance' | 'neutral' = 'neutral'
    if (isSupport && currentPrice - zoneCenter > (maxPrice - minPrice) * 0.5) {
      type = 'support'
    } else if (isResistance && zoneCenter - currentPrice > (maxPrice - minPrice) * 0.5) {
      type = 'resistance'
    }

    let strength: 'high' | 'medium' | 'low' = 'low'
    if (liquidityScore >= 0.7) {
      strength = 'high'
    } else if (liquidityScore >= 0.4) {
      strength = 'medium'
    }

    zones.push({
      priceRange: [minPrice, maxPrice],
      volume: zoneVolume,
      openInterest: zoneOI,
      liquidityScore,
      type,
      strength,
      contracts: zoneContracts
    })

    // Mark prices as processed
    zonePrices.forEach(p => processedPrices.add(p.price))
  })

  // Sort zones by liquidity score
  zones.sort((a, b) => b.liquidityScore - a.liquidityScore)

  return zones
}

/**
 * 3. Footprint Charts Analysis
 * Real-time buying vs selling pressure analysis
 */
export function analyzeFootprint(
  historicalData: HistoricalDataPoint[],
  currentPrice: number
): FootprintAnalysis {
  if (!historicalData || historicalData.length < 10) {
    return {
      currentPrice,
      footprints: [],
      totalBuyVolume: 0,
      totalSellVolume: 0,
      netDelta: 0,
      buyPressure: 0,
      sellPressure: 0,
      dominantSide: 'neutral',
      imbalanceRatio: 0,
      significantLevels: []
    }
  }

  // Analyze recent candles (last 50 for footprint)
  const recentCandles = historicalData.slice(-50)
  const footprints: FootprintData[] = []
  let totalBuyVolume = 0
  let totalSellVolume = 0

  recentCandles.forEach((candle) => {
    const price = candle.close || 0
    const volume = candle.volume || 0
    const open = candle.open || price
    const high = candle.high || price
    const low = candle.low || price

    // Estimate buy/sell volume based on price action
    // If close > open: more buying pressure
    // If close < open: more selling pressure
    const priceChange = price - open
    const priceRange = high - low || 1

    // Calculate buy/sell ratio based on where price closed in the range
    const closePosition = priceRange > 0 ? (price - low) / priceRange : 0.5
    const buyRatio = closePosition // Higher close = more buying
    // const sellRatio = 1 - closePosition // Lower close = more selling

    // Adjust based on price change direction
    const directionalBias = priceChange > 0 ? 0.1 : priceChange < 0 ? -0.1 : 0
    const adjustedBuyRatio = Math.max(0, Math.min(1, buyRatio + directionalBias))
    const adjustedSellRatio = 1 - adjustedBuyRatio

    const buyVolume = volume * adjustedBuyRatio
    const sellVolume = volume * adjustedSellRatio
    const delta = buyVolume - sellVolume

    totalBuyVolume += buyVolume
    totalSellVolume += sellVolume

    footprints.push({
      price,
      buyVolume,
      sellVolume,
      delta,
      totalVolume: volume,
      buyPressure: adjustedBuyRatio * 100,
      sellPressure: adjustedSellRatio * 100,
      imbalance: delta
    })
  })

  // Calculate aggregate metrics
  const netDelta = totalBuyVolume - totalSellVolume
  const totalVolume = totalBuyVolume + totalSellVolume
  const buyPressure = totalVolume > 0 ? (totalBuyVolume / totalVolume) * 100 : 50
  const sellPressure = totalVolume > 0 ? (totalSellVolume / totalVolume) * 100 : 50
  const imbalanceRatio = totalVolume > 0 ? netDelta / totalVolume : 0

  // Determine dominant side
  let dominantSide: 'buy' | 'sell' | 'neutral' = 'neutral'
  if (imbalanceRatio > 0.1) {
    dominantSide = 'buy'
  } else if (imbalanceRatio < -0.1) {
    dominantSide = 'sell'
  }

  // Identify significant price levels (high volume, high delta)
  const significantLevels = footprints
    .filter(f => Math.abs(f.delta) > totalVolume * 0.05) // At least 5% of total volume
    .map(f => ({
      price: f.price,
      buyVolume: f.buyVolume,
      sellVolume: f.sellVolume,
      delta: f.delta,
      significance: Math.abs(f.delta) > totalVolume * 0.1 ? 'high' as const :
                   Math.abs(f.delta) > totalVolume * 0.07 ? 'medium' as const : 'low' as const
    }))
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 10) // Top 10 significant levels

  return {
    currentPrice,
    footprints,
    totalBuyVolume,
    totalSellVolume,
    netDelta,
    buyPressure,
    sellPressure,
    dominantSide,
    imbalanceRatio,
    significantLevels
  }
}

/**
 * 4. Comprehensive Volume Analysis
 * Combines all volume-based indicators for trading decisions
 */
export interface ComprehensiveVolumeAnalysis {
  volumeConfirmation?: VolumeConfirmationResult
  liquidityZones: LiquidityZone[]
  footprint: FootprintAnalysis
  volumeProfile?: SessionVolumeProfile | CompositeVolumeProfile
  cvd?: CumulativeVolumeDelta
  recommendations: {
    action: 'enter' | 'exit' | 'hold' | 'wait'
    reason: string
    confidence: number
    riskLevel: 'low' | 'medium' | 'high'
  }
}

export function performComprehensiveVolumeAnalysis(
  historicalData: HistoricalDataPoint[],
  currentPrice: number,
  breakoutLevel?: number,
  breakoutDirection?: 'up' | 'down',
  volumeProfile?: SessionVolumeProfile | CompositeVolumeProfile,
  cvd?: CumulativeVolumeDelta,
  openInterestData?: Array<{ price: number; openInterest: number }>
): ComprehensiveVolumeAnalysis {
  // 1. Volume confirmation for breakout
  let volumeConfirmation: VolumeConfirmationResult | undefined
  if (breakoutLevel && breakoutDirection) {
    volumeConfirmation = confirmBreakoutWithVolume(
      historicalData,
      breakoutLevel,
      currentPrice,
      breakoutDirection,
      volumeProfile
    )
  }

  // 2. Liquidity zones
  const liquidityZones = identifyLiquidityZones(historicalData, openInterestData, volumeProfile)

  // 3. Footprint analysis
  const footprint = analyzeFootprint(historicalData, currentPrice)

  // 4. Generate recommendations
  let action: 'enter' | 'exit' | 'hold' | 'wait' = 'hold'
  let reason = ''
  let confidence = 0.5
  let riskLevel: 'low' | 'medium' | 'high' = 'medium'

  // Analyze footprint dominance
  if (footprint.dominantSide === 'buy' && footprint.buyPressure > 60) {
    action = 'enter'
    reason = `Strong buying pressure (${footprint.buyPressure.toFixed(1)}%). Net delta: +${(footprint.netDelta / 1000).toFixed(2)}k`
    confidence = Math.min(0.8, 0.5 + (footprint.buyPressure - 50) / 100)
    riskLevel = footprint.buyPressure > 70 ? 'low' : 'medium'
  } else if (footprint.dominantSide === 'sell' && footprint.sellPressure > 60) {
    action = 'exit'
    reason = `Strong selling pressure (${footprint.sellPressure.toFixed(1)}%). Net delta: ${(footprint.netDelta / 1000).toFixed(2)}k`
    confidence = Math.min(0.8, 0.5 + (footprint.sellPressure - 50) / 100)
    riskLevel = footprint.sellPressure > 70 ? 'low' : 'medium'
  }

  // Check volume confirmation
  if (volumeConfirmation) {
    if (volumeConfirmation.isValid && volumeConfirmation.strength === 'strong') {
      action = 'enter'
      reason = `${reason ? reason + '. ' : ''}Strong volume confirmation: ${volumeConfirmation.reason}`
      confidence = Math.min(0.9, confidence + 0.2)
      riskLevel = 'low'
    } else if (volumeConfirmation.strength === 'false') {
      action = 'wait'
      reason = `False breakout detected: ${volumeConfirmation.reason}`
      confidence = 0.3
      riskLevel = 'high'
    }
  }

  // Check liquidity zones
  const nearbyZone = liquidityZones.find(zone => 
    currentPrice >= zone.priceRange[0] && currentPrice <= zone.priceRange[1]
  )
  if (nearbyZone && nearbyZone.strength === 'high') {
    if (nearbyZone.type === 'support' && action === 'enter') {
      reason = `${reason ? reason + '. ' : ''}Near high-liquidity support zone`
      confidence = Math.min(0.9, confidence + 0.1)
    } else if (nearbyZone.type === 'resistance' && action === 'enter') {
      action = 'wait'
      reason = `${reason ? reason + '. ' : ''}Near high-liquidity resistance zone - wait for breakout`
      confidence = 0.4
      riskLevel = 'high'
    }
  }

  return {
    volumeConfirmation,
    liquidityZones,
    footprint,
    volumeProfile,
    cvd,
    recommendations: {
      action,
      reason: reason || 'Neutral volume conditions - monitor for clearer signals',
      confidence,
      riskLevel
    }
  }
}

