/**
 * Liquidation Indicators
 * Detect liquidation clusters, stop hunt zones, safe entry zones
 */

import { LiquidationData, LiquidationCluster } from '../types/futures-types'

export interface LiquidationIndicator {
  clusters: {
    long: LiquidationCluster[] // Long liquidation clusters
    short: LiquidationCluster[] // Short liquidation clusters
    nearest: LiquidationCluster | null // Nearest cluster to current price
    distance: number // Distance to nearest cluster (%)
  }
  liquidityGrab: {
    detected: boolean // True if liquidity grab zone detected
    zone: { priceLow: number; priceHigh: number } | null
    side: 'long' | 'short' | 'none'
  }
  stopHunt: {
    predicted: boolean // True if stop hunt likely
    targetPrice: number | null // Predicted stop hunt target
    side: 'long' | 'short' | 'none'
  }
  cascade: {
    risk: 'high' | 'medium' | 'low' // Liquidation cascade risk
    triggerPrice: number | null // Price that could trigger cascade
  }
  safeEntry: {
    zones: Array<{ priceLow: number; priceHigh: number }>
    confidence: number // Confidence in safe entry (0-1)
  }
}

/**
 * Find liquidation clusters
 */
function findClusters(
  liquidationData: LiquidationData,
  currentPrice: number
): LiquidationIndicator['clusters'] {
  const allClusters = liquidationData.clusters || []
  const longClusters = allClusters.filter(c => c.side === 'long')
  const shortClusters = allClusters.filter(c => c.side === 'short')

  // Find nearest cluster
  let nearest: LiquidationCluster | null = null
  let minDistance = Infinity

  for (const cluster of allClusters) {
    const distance = Math.abs(cluster.price - currentPrice) / currentPrice * 100
    if (distance < minDistance) {
      minDistance = distance
      nearest = cluster
    }
  }

  return {
    long: longClusters,
    short: shortClusters,
    nearest: nearest || null,
    distance: isNaN(minDistance) || !isFinite(minDistance) ? 100 : minDistance
  }
}

/**
 * Detect liquidity grab zones
 */
function detectLiquidityGrab(
  liquidationData: LiquidationData,
  currentPrice: number
): LiquidationIndicator['liquidityGrab'] {
  const clusters = liquidationData.clusters || []

  // Liquidity grab: large cluster just above/below current price
  // Market makers will push price to grab liquidity before reversing

  let detected = false
  let zone: { priceLow: number; priceHigh: number } | null = null
  let side: 'long' | 'short' | 'none' = 'none'

  for (const cluster of clusters) {
    // Check if cluster is within 2% of current price
    const distance = Math.abs(cluster.price - currentPrice) / currentPrice * 100

    // Check if cluster size is significant (estimate from long+short liquidations)
    const totalLiquidationEstimate = liquidationData.longLiquidations24h + liquidationData.shortLiquidations24h
    if (distance < 2 && cluster.size > totalLiquidationEstimate * 0.05) {
      // Large cluster nearby = liquidity grab zone
      detected = true
      zone = {
        priceLow: cluster.price * 0.995, // 0.5% below
        priceHigh: cluster.price * 1.005 // 0.5% above
      }
      side = cluster.side
      break
    }
  }

  return {
    detected,
    zone,
    side
  }
}

/**
 * Predict stop hunt
 */
function predictStopHunt(
  liquidationData: LiquidationData,
  currentPrice: number
): LiquidationIndicator['stopHunt'] {
  const clusters = liquidationData.clusters || []

  // Stop hunt: price moves to trigger liquidations, then reverses
  // Look for large clusters just above/below current price in trending direction

  let predicted = false
  let targetPrice: number | null = null
  let side: 'long' | 'short' | 'none' = 'none'

  // Find largest cluster within 5% of current price
  let largestCluster: LiquidationCluster | null = null
  let largestSize = 0

  for (const cluster of clusters) {
    const distance = Math.abs(cluster.price - currentPrice) / currentPrice * 100
    if (distance < 5 && cluster.size > largestSize) {
      largestSize = cluster.size
      largestCluster = cluster
    }
  }

  // Check if cluster size is significant (estimate from long+short liquidations)
  const totalLiquidationEstimate = liquidationData.longLiquidations24h + liquidationData.shortLiquidations24h
  if (largestCluster && largestCluster.size > totalLiquidationEstimate * 0.03) {
    // Large cluster nearby = potential stop hunt target
    predicted = true
    targetPrice = largestCluster.price
    side = largestCluster.side
  }

  return {
    predicted,
    targetPrice,
    side
  }
}

/**
 * Assess liquidation cascade risk
 */
function assessCascadeRisk(
  liquidationData: LiquidationData,
  currentPrice: number
): LiquidationIndicator['cascade'] {
  // Cascade risk: if price hits large liquidation cluster, it could trigger chain reaction

  const clusters = liquidationData.clusters || []
  const nearbyClusters = clusters.filter(c => {
    const distance = Math.abs(c.price - currentPrice) / currentPrice * 100
    return distance < 3 // Within 3%
  })

  let risk: 'high' | 'medium' | 'low' = 'low'
  let triggerPrice: number | null = null

  if (nearbyClusters.length === 0) {
    return { risk: 'low', triggerPrice: null }
  }

  // Calculate total liquidation size nearby
  const totalSize = nearbyClusters.reduce((sum, c) => sum + c.size, 0)
  // Estimate OI from total liquidations (24h liquidations typically represent 2-5% of OI)
  const oiEstimate = (liquidationData.longLiquidations24h + liquidationData.shortLiquidations24h) * 20 // Rough estimate

  // High risk if nearby liquidations > 5% of estimated OI
  if (totalSize > oiEstimate * 0.05) {
    risk = 'high'
    // Find nearest large cluster
    const nearest = nearbyClusters.reduce((prev, curr) => 
      Math.abs(curr.price - currentPrice) < Math.abs(prev.price - currentPrice) ? curr : prev
    )
    triggerPrice = nearest.price
  } else if (totalSize > oiEstimate * 0.02) {
    risk = 'medium'
    const nearest = nearbyClusters.reduce((prev, curr) => 
      Math.abs(curr.price - currentPrice) < Math.abs(prev.price - currentPrice) ? curr : prev
    )
    triggerPrice = nearest.price
  }

  return {
    risk,
    triggerPrice
  }
}

/**
 * Identify safe entry zones
 */
function identifySafeEntryZones(
  liquidationData: LiquidationData,
  currentPrice: number
): LiquidationIndicator['safeEntry'] {
  // Safe entry zones: areas with low liquidation density

  const safeZones = liquidationData.safeEntryZones || []

  // Calculate confidence: distance from nearest liquidation cluster
  // const clusters = liquidationData.clusters || []
  const nearestDistance = liquidationData.liquidationDistance || 10

  // Confidence increases with distance from liquidation clusters
  const confidence = Math.min(1, nearestDistance / 10) // 10% distance = max confidence

  // If no safe zones provided, create default zone around current price (if safe)
  let zones = safeZones
  if (zones.length === 0 && nearestDistance > 3) {
    zones = [{
      priceLow: currentPrice * 0.99, // 1% below
      priceHigh: currentPrice * 1.01 // 1% above
    }]
  }

  return {
    zones,
    confidence: isNaN(confidence) ? 0 : confidence
  }
}

/**
 * Calculate liquidation indicators
 */
export function calculateLiquidationIndicators(
  liquidationData: LiquidationData,
  currentPrice: number
): LiquidationIndicator {
  // Add openInterest to liquidationData if needed for calculations
  const clusters = findClusters(liquidationData, currentPrice)
  const liquidityGrab = detectLiquidityGrab(liquidationData, currentPrice)
  const stopHunt = predictStopHunt(liquidationData, currentPrice)
  const cascade = assessCascadeRisk(liquidationData, currentPrice)
  const safeEntry = identifySafeEntryZones(liquidationData, currentPrice)

  return {
    clusters,
    liquidityGrab,
    stopHunt,
    cascade,
    safeEntry
  }
}

