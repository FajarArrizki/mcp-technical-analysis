/**
 * Formatters for Volume Analysis
 * Extracted from index.ts for better modularity
 */

import type { ComprehensiveVolumeAnalysis } from '../signal-generation/analysis/volume-analysis'

/**
 * Format volume analysis data
 */
export function formatVolumeAnalysis(
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
