/**
 * Entry Precision Optimization
 * Optimize entry prices using liquidation clusters, funding cycles, volume profile
 */

import { FuturesMarketData, LiquidationCluster } from '../types/futures-types'
import { HistoricalDataPoint } from '../types'

export interface EntryPrecisionResult {
  optimalEntryPrice: number
  entryRange: { priceLow: number; priceHigh: number }
  confidence: number // 0-1, confidence in entry precision
  reasons: string[]
}

/**
 * Calculate optimal entry from liquidation clusters
 */
function calculateOptimalEntryFromClusters(
  currentPrice: number,
  clusters: LiquidationCluster[],
  side: 'LONG' | 'SHORT'
): { price: number; confidence: number; reason: string } {
  if (clusters.length === 0) {
    return {
      price: currentPrice,
      confidence: 0.5,
      reason: 'No liquidation clusters available'
    }
  }

  // For LONG: enter below nearest short liquidation cluster (snipe stop hunt)
  // For SHORT: enter above nearest long liquidation cluster (snipe stop hunt)
  
  if (side === 'LONG') {
    // Find nearest short cluster below current price
    const shortClusters = clusters.filter(c => c.side === 'short' && c.price < currentPrice)
    
    if (shortClusters.length > 0) {
      // Sort by size (largest first)
      shortClusters.sort((a, b) => b.size - a.size)
      
      // Enter 0.5% below largest short cluster (snipe stop hunt)
      const targetCluster = shortClusters[0]
      const optimalPrice = targetCluster.price * 0.995 // 0.5% below
      
      return {
        price: optimalPrice,
        confidence: 0.8,
        reason: `Optimal entry below short liquidation cluster at $${targetCluster.price.toFixed(2)} (snipe stop hunt)`
      }
    }
  } else {
    // SHORT: Find nearest long cluster above current price
    const longClusters = clusters.filter(c => c.side === 'long' && c.price > currentPrice)
    
    if (longClusters.length > 0) {
      longClusters.sort((a, b) => b.size - a.size)
      const targetCluster = longClusters[0]
      const optimalPrice = targetCluster.price * 1.005 // 0.5% above
      
      return {
        price: optimalPrice,
        confidence: 0.8,
        reason: `Optimal entry above long liquidation cluster at $${targetCluster.price.toFixed(2)} (snipe stop hunt)`
      }
    }
  }

  return {
    price: currentPrice,
    confidence: 0.5,
    reason: 'No optimal cluster found, using current price'
  }
}

/**
 * Calculate optimal entry from safe zones
 */
function calculateOptimalEntryFromSafeZones(
  currentPrice: number,
  safeZones: Array<{ priceLow: number; priceHigh: number }>
): { price: number; confidence: number; reason: string } {
  if (safeZones.length === 0) {
    return {
      price: currentPrice,
      confidence: 0.5,
      reason: 'No safe entry zones available'
    }
  }

  // Find safe zone containing current price or nearest safe zone
  for (const zone of safeZones) {
    if (currentPrice >= zone.priceLow && currentPrice <= zone.priceHigh) {
      // Price in safe zone - use zone midpoint for optimal entry
      const optimalPrice = (zone.priceLow + zone.priceHigh) / 2
      
      return {
        price: optimalPrice,
        confidence: 0.9,
        reason: `Optimal entry in safe zone (${zone.priceLow.toFixed(2)} - ${zone.priceHigh.toFixed(2)})`
      }
    }
  }

  // Find nearest safe zone
  let nearestZone = safeZones[0]
  let minDistance = Math.abs(currentPrice - (safeZones[0].priceLow + safeZones[0].priceHigh) / 2)

  for (const zone of safeZones) {
    const zoneMid = (zone.priceLow + zone.priceHigh) / 2
    const distance = Math.abs(currentPrice - zoneMid)
    if (distance < minDistance) {
      minDistance = distance
      nearestZone = zone
    }
  }

  const optimalPrice = (nearestZone.priceLow + nearestZone.priceHigh) / 2

  return {
    price: optimalPrice,
    confidence: 0.7,
    reason: `Optimal entry in nearest safe zone (${nearestZone.priceLow.toFixed(2)} - ${nearestZone.priceHigh.toFixed(2)})`
  }
}

/**
 * Calculate optimal entry from volume profile (POC)
 */
function calculateOptimalEntryFromVolumeProfile(
  historicalData: HistoricalDataPoint[]
): { price: number; confidence: number; reason: string } | null {
  if (!historicalData || historicalData.length < 20) {
    return null
  }

  // Calculate Point of Control (POC) - price level with highest volume
  const volumeProfile = new Map<number, number>()

  for (const candle of historicalData) {
    // Round price to nearest $0.01 for grouping
    const priceLevel = Math.round(candle.close * 100) / 100
    const currentVolume = volumeProfile.get(priceLevel) || 0
    volumeProfile.set(priceLevel, currentVolume + candle.volume)
  }

  // Find POC (price with highest volume)
  let pocPrice = 0
  let maxVolume = 0

  for (const [price, volume] of volumeProfile) {
    if (volume > maxVolume) {
      maxVolume = volume
      pocPrice = price
    }
  }

  if (pocPrice > 0) {
    return {
      price: pocPrice,
      confidence: 0.75,
      reason: `Optimal entry at POC (Point of Control) $${pocPrice.toFixed(2)}`
    }
  }

  return null
}

/**
 * Optimize entry price
 */
export function optimizeEntryPrice(
  currentPrice: number,
  side: 'LONG' | 'SHORT',
  futuresData: FuturesMarketData,
  historicalData?: HistoricalDataPoint[]
): EntryPrecisionResult {
  const reasons: string[] = []
  let optimalPrice = currentPrice
  let confidence = 0.5

  // Strategy 1: Use liquidation clusters for stop hunt sniping
  const clusterEntry = calculateOptimalEntryFromClusters(
    currentPrice,
    futuresData.liquidation.clusters,
    side
  )
  if (clusterEntry.confidence > confidence) {
    optimalPrice = clusterEntry.price
    confidence = clusterEntry.confidence
    reasons.push(clusterEntry.reason)
  }

  // Strategy 2: Use safe entry zones
  const safeZoneEntry = calculateOptimalEntryFromSafeZones(
    currentPrice,
    futuresData.liquidation.safeEntryZones
  )
  if (safeZoneEntry.confidence > confidence) {
    optimalPrice = safeZoneEntry.price
    confidence = safeZoneEntry.confidence
    reasons.push(safeZoneEntry.reason)
  }

  // Strategy 3: Use volume profile (POC) if historical data available
  if (historicalData) {
    const pocEntry = calculateOptimalEntryFromVolumeProfile(historicalData)
    if (pocEntry && pocEntry.confidence > confidence) {
      optimalPrice = pocEntry.price
      confidence = pocEntry.confidence
      reasons.push(pocEntry.reason)
    }
  }

  // Entry range: ±0.1% of optimal price (slippage tolerance)
  const entryRange = {
    priceLow: optimalPrice * 0.999, // 0.1% below
    priceHigh: optimalPrice * 1.001  // 0.1% above
  }

  // Final confidence: adjust based on entry precision
  const priceDifference = Math.abs(optimalPrice - currentPrice) / currentPrice * 100
  if (priceDifference > 1) {
    // Entry far from current price - reduce confidence
    confidence *= 0.8
    reasons.push(`Warning: Optimal entry ${priceDifference.toFixed(2)}% away from current price`)
  } else {
    reasons.push(`Entry precision: ${priceDifference.toFixed(3)}% difference from current price`)
  }

  return {
    optimalEntryPrice: isNaN(optimalPrice) || !isFinite(optimalPrice) ? currentPrice : optimalPrice,
    entryRange: {
      priceLow: isNaN(entryRange.priceLow) || !isFinite(entryRange.priceLow) ? currentPrice * 0.999 : entryRange.priceLow,
      priceHigh: isNaN(entryRange.priceHigh) || !isFinite(entryRange.priceHigh) ? currentPrice * 1.001 : entryRange.priceHigh
    },
    confidence: isNaN(confidence) || !isFinite(confidence) ? 0.5 : Math.max(0, Math.min(1, confidence)),
    reasons
  }
}

