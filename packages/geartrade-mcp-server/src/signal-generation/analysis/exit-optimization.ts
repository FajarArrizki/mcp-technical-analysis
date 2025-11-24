/**
 * Exit Optimization
 * Optimize TP/SL placement using liquidation clusters, noise zones, trailing stops
 */

import { FuturesMarketData, LiquidationCluster } from '../types/futures-types'
import { PositionState } from '../types'

export interface ExitOptimizationResult {
  optimalTakeProfit: number | null
  optimalStopLoss: number | null
  trailingStopDistance?: number
  partialTpLevels: Array<{ price: number; sizePct: number }> // Partial TP levels
  confidence: number // 0-1, confidence in exit optimization
  reasons: string[]
}

/**
 * Calculate optimal TP from liquidation clusters
 */
function calculateTPFromClusters(
  entryPrice: number,
  side: 'LONG' | 'SHORT',
  clusters: LiquidationCluster[],
  minDistance: number = 1 // 1% minimum distance
): { price: number; sizePct: number; confidence: number } | null {
  // For LONG: TP at long liquidation cluster (cascade target)
  // For SHORT: TP at short liquidation cluster (cascade target)

  if (side === 'LONG') {
    // Find long clusters above entry price
    const longClusters = clusters
      .filter(c => c.side === 'long' && c.price > entryPrice)
      .sort((a, b) => a.price - b.price) // Nearest first

    if (longClusters.length > 0) {
      // Use nearest long cluster as TP target
      const targetCluster = longClusters[0]
      const distance = (targetCluster.price - entryPrice) / entryPrice * 100

      if (distance >= minDistance) {
        // Partial TP: 50% at first cluster, 50% at second (if exists)
        const sizePct = longClusters.length > 1 ? 50 : 100

        return {
          price: targetCluster.price,
          sizePct,
          confidence: 0.8
        }
      }
    }
  } else {
    // SHORT: Find short clusters below entry price
    const shortClusters = clusters
      .filter(c => c.side === 'short' && c.price < entryPrice)
      .sort((a, b) => b.price - a.price) // Nearest first (highest price)

    if (shortClusters.length > 0) {
      const targetCluster = shortClusters[0]
      const distance = (entryPrice - targetCluster.price) / entryPrice * 100

      if (distance >= minDistance) {
        const sizePct = shortClusters.length > 1 ? 50 : 100

        return {
          price: targetCluster.price,
          sizePct,
          confidence: 0.8
        }
      }
    }
  }

  return null
}

/**
 * Calculate optimal SL from noise zones
 */
function calculateSLFromNoiseZones(
  entryPrice: number,
  side: 'LONG' | 'SHORT',
  clusters: LiquidationCluster[],
  atr: number // ATR for noise calculation
): { price: number; confidence: number } | null {
  // Place SL outside noise zones (beyond liquidation clusters and ATR)

  if (side === 'LONG') {
    // Find nearest short cluster below entry
    const shortClusters = clusters.filter(c => c.side === 'short' && c.price < entryPrice)
    
    if (shortClusters.length > 0) {
      // Sort by distance (nearest first)
      shortClusters.sort((a, b) => b.price - a.price) // Highest price first (nearest to entry)
      
      const nearestCluster = shortClusters[0]
      // Place SL 0.5% below nearest short cluster (outside noise)
      const slPrice = nearestCluster.price * 0.995
      
      return {
        price: slPrice,
        confidence: 0.9
      }
    }

    // No cluster found - use ATR-based SL (2x ATR below entry)
    const slPrice = entryPrice - (atr * 2)
    return {
      price: slPrice,
      confidence: 0.7
    }
  } else {
    // SHORT: Find nearest long cluster above entry
    const longClusters = clusters.filter(c => c.side === 'long' && c.price > entryPrice)
    
    if (longClusters.length > 0) {
      longClusters.sort((a, b) => a.price - b.price) // Lowest price first (nearest to entry)
      
      const nearestCluster = longClusters[0]
      const slPrice = nearestCluster.price * 1.005 // 0.5% above
      
      return {
        price: slPrice,
        confidence: 0.9
      }
    }

    // No cluster found - use ATR-based SL (2x ATR above entry)
    const slPrice = entryPrice + (atr * 2)
    return {
      price: slPrice,
      confidence: 0.7
    }
  }
}

/**
 * Calculate trailing stop distance
 */
function calculateTrailingStopDistance(
  _side: 'LONG' | 'SHORT',
  atr: number,
  volatility: number // Volatility %
): number {
  // Trailing stop: dynamic distance based on volatility
  // Higher volatility = wider trailing stop
  
  // Base trailing stop: 1.5x ATR
  let baseDistance = atr * 1.5

  // Adjust for volatility
  if (volatility > 3) {
    // High volatility - wider stop
    baseDistance *= 1.5
  } else if (volatility < 1) {
    // Low volatility - tighter stop
    baseDistance *= 0.8
  }

  // Convert to percentage
  const trailingStopPct = (baseDistance / 100) * 100 // Assuming baseDistance is in price units

  return Math.max(0.5, Math.min(5, trailingStopPct)) // Clamp between 0.5% and 5%
}

/**
 * Optimize exit levels
 */
export function optimizeExitLevels(
  position: PositionState,
  futuresData: FuturesMarketData,
  atr?: number,
  volatility?: number
): ExitOptimizationResult {
  const reasons: string[] = []
  let optimalTP: number | null = null
  let optimalSL: number | null = null
  const partialTpLevels: Array<{ price: number; sizePct: number }> = []
  let confidence = 0.5

  const entryPrice = position.entryPrice
  const side = position.side
  const clusters = futuresData.liquidation.clusters || []

  // Calculate TP from liquidation clusters
  const clusterTP = calculateTPFromClusters(entryPrice, side, clusters, 1)
  if (clusterTP) {
    optimalTP = clusterTP.price
    partialTpLevels.push({
      price: clusterTP.price,
      sizePct: clusterTP.sizePct
    })
    confidence = Math.max(confidence, clusterTP.confidence)
    reasons.push(`TP at liquidation cluster: $${clusterTP.price.toFixed(2)} (${clusterTP.sizePct}% position)`)

    // Add second TP level if multiple clusters
    if (clusterTP.sizePct < 100) {
      if (side === 'LONG') {
        const longClusters = clusters.filter(c => c.side === 'long' && c.price > entryPrice).sort((a, b) => a.price - b.price)
        if (longClusters.length > 1) {
          partialTpLevels.push({
            price: longClusters[1].price,
            sizePct: 50 // Remaining 50%
          })
          reasons.push(`Second TP at next liquidation cluster: $${longClusters[1].price.toFixed(2)} (50% position)`)
        }
      } else {
        const shortClusters = clusters.filter(c => c.side === 'short' && c.price < entryPrice).sort((a, b) => b.price - a.price)
        if (shortClusters.length > 1) {
          partialTpLevels.push({
            price: shortClusters[1].price,
            sizePct: 50
          })
          reasons.push(`Second TP at next liquidation cluster: $${shortClusters[1].price.toFixed(2)} (50% position)`)
        }
      }
    }
  } else {
    // Default TP: 3:1 R:R or 2% move
    const defaultTP = side === 'LONG'
      ? entryPrice * 1.02  // 2% above
      : entryPrice * 0.98  // 2% below

    optimalTP = defaultTP
    partialTpLevels.push({ price: defaultTP, sizePct: 100 })
    reasons.push(`Default TP: $${defaultTP.toFixed(2)} (2% move, no optimal cluster found)`)
  }

  // Calculate SL from noise zones
  const defaultATR = atr || (entryPrice * 0.01) // 1% default ATR
  const clusterSL = calculateSLFromNoiseZones(entryPrice, side, clusters, defaultATR)
  if (clusterSL) {
    optimalSL = clusterSL.price
    confidence = Math.max(confidence, clusterSL.confidence)
    reasons.push(`SL outside noise zone: $${clusterSL.price.toFixed(2)} (${clusterSL.confidence * 100}% confidence)`)
  } else {
    // Default SL: 1% from entry
    optimalSL = side === 'LONG'
      ? entryPrice * 0.99  // 1% below
      : entryPrice * 1.01  // 1% above

    reasons.push(`Default SL: $${optimalSL.toFixed(2)} (1% from entry, no optimal zone found)`)
  }

  // Calculate trailing stop distance
  const defaultVolatility = volatility || 2 // 2% default
  const trailingStopDistance = calculateTrailingStopDistance(side, defaultATR, defaultVolatility)
  reasons.push(`Trailing stop distance: ${trailingStopDistance.toFixed(2)}% (based on volatility)`)

  // Calculate R:R ratio
  if (optimalTP && optimalSL) {
    const tpDistance = side === 'LONG'
      ? (optimalTP - entryPrice) / entryPrice * 100
      : (entryPrice - optimalTP) / entryPrice * 100

    const slDistance = side === 'LONG'
      ? (entryPrice - optimalSL) / entryPrice * 100
      : (optimalSL - entryPrice) / entryPrice * 100

    if (slDistance > 0) {
      const rrRatio = tpDistance / slDistance
      reasons.push(`R:R Ratio: ${rrRatio.toFixed(2)}:1 (TP: ${tpDistance.toFixed(2)}%, SL: ${slDistance.toFixed(2)}%)`)

      if (rrRatio >= 3) {
        confidence = Math.min(1, confidence * 1.2) // Boost confidence for good R:R
        reasons.push('Excellent R:R ratio (>=3:1)')
      } else if (rrRatio < 1.5) {
        confidence *= 0.8 // Reduce confidence for poor R:R
        reasons.push(`Warning: Low R:R ratio (${rrRatio.toFixed(2)}:1)`)
      }
    }
  }

  return {
    optimalTakeProfit: optimalTP,
    optimalStopLoss: optimalSL,
    trailingStopDistance,
    partialTpLevels,
    confidence: isNaN(confidence) || !isFinite(confidence) ? 0.5 : Math.max(0, Math.min(1, confidence)),
    reasons
  }
}

