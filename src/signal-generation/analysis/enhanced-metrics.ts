/**
 * Enhanced Metrics Analysis
 * calculateEnhancedMetrics function
 */

import { HistoricalDataPoint } from '../types'

export interface EnhancedMetrics {
  volumeTrend: 'increasing' | 'decreasing' | 'stable'
  volatilityPattern: 'high' | 'low' | 'normal'
  volumePriceDivergence: number
  volumeChangePercent: number
  timestamp: number
}

/**
 * Calculate enhanced metrics from historical data
 * Volume trend, volatility pattern, volume-price divergence
 */
export function calculateEnhancedMetrics(
  historicalData: HistoricalDataPoint[],
  _indicators: any,
  _externalData: any
): EnhancedMetrics | null {
  if (!historicalData || historicalData.length < 14) {
    return null
  }
  
  const closes = historicalData.map(d => d.close)
  const volumes = historicalData.map(d => d.volume || 0)
  
  // Volume trend - improved calculation
  if (volumes.length < 20) {
    // Not enough data for trend
    return {
      volumeTrend: 'stable',
      volatilityPattern: 'normal',
      volumePriceDivergence: 0,
      volumeChangePercent: 0,
      timestamp: Date.now()
    }
  }
  
  // Use multiple timeframes for better trend detection
  const recentVolumes = volumes.slice(-10) // Last 10 periods
  const midVolumes = volumes.slice(-20, -10) // Previous 10 periods
  const olderVolumes = volumes.length >= 30 ? volumes.slice(-30, -20) : midVolumes // Older 10 periods (if available)
  
  const recentAvg = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length
  const midAvg = midVolumes.length > 0 ? midVolumes.reduce((a, b) => a + b, 0) / midVolumes.length : recentAvg
  const olderAvg = olderVolumes.length > 0 ? olderVolumes.reduce((a, b) => a + b, 0) / olderVolumes.length : midAvg
  
  // Calculate trend with multiple comparisons (more accurate)
  let volumeTrend: 'increasing' | 'decreasing' | 'stable' = 'stable'
  if (olderAvg > 0 && midAvg > 0) {
    const recentChange = (recentAvg - midAvg) / midAvg
    const midChange = (midAvg - olderAvg) / olderAvg
    
    // Both periods show same direction = stronger trend
    if (recentChange > 0.05 && midChange > 0.02) {
      volumeTrend = 'increasing' // Strong increasing trend
    } else if (recentChange < -0.05 && midChange < -0.02) {
      volumeTrend = 'decreasing' // Strong decreasing trend
    } else if (recentChange > 0.1) {
      volumeTrend = 'increasing' // Recent spike (10%+)
    } else if (recentChange < -0.1) {
      volumeTrend = 'decreasing' // Recent drop (10%+)
    } else if (Math.abs(recentChange) > 0.02) {
      // Small but consistent change
      volumeTrend = recentChange > 0 ? 'increasing' : 'decreasing'
    }
  } else if (recentAvg > 0 && midAvg === 0) {
    volumeTrend = 'increasing' // Was zero, now has volume
  }
  
  // Volatility pattern - improved detection with standard deviation
  const recentPrices = closes.slice(-10)
  const priceChanges: number[] = []
  for (let i = 1; i < recentPrices.length; i++) {
    priceChanges.push(Math.abs((recentPrices[i] - recentPrices[i-1]) / recentPrices[i-1]))
  }
  const avgVolatility = priceChanges.length > 0 
    ? priceChanges.reduce((a, b) => a + b, 0) / priceChanges.length 
    : 0
  
  // Also check standard deviation of price changes
  const volatilityStdDev = priceChanges.length > 1 
    ? Math.sqrt(priceChanges.reduce((sum, v) => sum + Math.pow(v - avgVolatility, 2), 0) / priceChanges.length)
    : 0
  
  let volatilityPattern: 'high' | 'low' | 'normal' = 'normal'
  if (avgVolatility > 0.05 || volatilityStdDev > 0.03) {
    volatilityPattern = 'high' // High volatility
  } else if (avgVolatility < 0.01 && volatilityStdDev < 0.005) {
    volatilityPattern = 'low' // Low volatility
  }
  
  // Volume-price divergence - improved calculation with continuous scale
  // CRITICAL FIX: Check for division by zero - closes[closes.length - 10] can be 0
  const oldPrice = closes.length >= 10 ? closes[closes.length - 10] : 0
  const priceChange = oldPrice > 0 
    ? (closes[closes.length - 1] - oldPrice) / oldPrice
    : 0
  
  // Use same volume change calculation as above
  const volumeChange = midAvg > 0 
    ? (recentAvg - midAvg) / midAvg
    : (recentAvg > 0 ? 1 : 0)
  
  // Divergence: price up but volume down = bearish (-1 to -2), price down but volume up = bullish (+1 to +2)
  // Use continuous scale instead of binary
  let volumePriceDivergence = 0
  if (Math.abs(priceChange) > 0.005 && Math.abs(volumeChange) > 0.02) { // Significant changes only
    if (priceChange > 0 && volumeChange < -0.05) {
      // Bearish divergence: Price rising but volume decreasing
      volumePriceDivergence = Math.max(-2, -1 - Math.abs(volumeChange)) // -1 to -2
    } else if (priceChange < 0 && volumeChange > 0.05) {
      // Bullish divergence: Price falling but volume increasing
      volumePriceDivergence = Math.min(2, 1 + Math.abs(volumeChange)) // +1 to +2
    } else if (priceChange > 0 && volumeChange > 0.1) {
      // Strong volume confirmation: Price and volume both rising
      volumePriceDivergence = 0.5 // Slight bullish confirmation
    } else if (priceChange < 0 && volumeChange < -0.1) {
      // Strong volume confirmation: Price and volume both falling
      volumePriceDivergence = -0.5 // Slight bearish confirmation
    }
  }
  
  return {
    volumeTrend: volumeTrend,
    volatilityPattern: volatilityPattern,
    volumePriceDivergence: volumePriceDivergence,
    volumeChangePercent: volumeChange * 100, // Add volume change percentage
    timestamp: Date.now()
  }
}
