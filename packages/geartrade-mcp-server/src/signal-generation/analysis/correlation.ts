/**
 * Correlation Analysis
 * calculateCorrelationMatrix, calculateCorrelation functions
 */

import { MarketData } from '../types'

export function calculateCorrelation(prices1: number[], prices2: number[]): number {
  // OPTIMIZATION FINAL: Early returns with explicit checks
  if (!prices1 || !prices2) return 0
  const len1 = prices1.length
  const len2 = prices2.length
  if (len1 !== len2 || len1 < 2) return 0
  
  // OPTIMIZATION FINAL: Calculate means in single pass (avoid reduce overhead)
  let sum1 = 0
  let sum2 = 0
  for (let i = 0; i < len1; i++) {
    sum1 += prices1[i]
    sum2 += prices2[i]
  }
  const mean1 = sum1 / len1
  const mean2 = sum2 / len1 // Use len1 (same as len2)
  
  // Calculate covariance and standard deviations in single pass
  let covariance = 0
  let variance1 = 0
  let variance2 = 0
  
  for (let i = 0; i < len1; i++) {
    const diff1 = prices1[i] - mean1
    const diff2 = prices2[i] - mean2
    covariance += diff1 * diff2
    variance1 += diff1 * diff1
    variance2 += diff2 * diff2
  }
  
  covariance /= len1
  variance1 /= len1
  variance2 /= len1
  
  const stdDev1 = Math.sqrt(variance1)
  const stdDev2 = Math.sqrt(variance2)
  
  // OPTIMIZATION FINAL: Early return for zero standard deviation (avoid division by zero)
  if (stdDev1 === 0 || stdDev2 === 0) return 0
  
  const correlation = covariance / (stdDev1 * stdDev2)
  return correlation
}

export function calculateCorrelationMatrix(
  marketData: Map<string, MarketData> | Record<string, MarketData>,
  assets: string[] = ['BTC', 'ETH', 'SOL'],
  lookbackPeriod: number = 24
): Record<string, number> {
  const correlationMatrix: Record<string, number> = {}
  
  // OPTIMIZATION FINAL: Early return for empty or single asset (no correlation possible)
  if (!assets || assets.length <= 1) {
    return correlationMatrix
  }
  
  // OPTIMIZATION FINAL: Pre-compute Map check once
  const isMap = marketData instanceof Map
  
  // Get price data for each asset
  const priceData: Record<string, number[]> = {}
  const assetsLength = assets.length
  for (let i = 0; i < assetsLength; i++) {
    const asset = assets[i]
    const assetData = isMap ? marketData.get(asset) : marketData[asset]
    if (assetData && assetData.historicalData && assetData.historicalData.length >= lookbackPeriod) {
      const recentData = assetData.historicalData.slice(-lookbackPeriod)
      // OPTIMIZATION FINAL: Pre-allocate array and use direct assignment
      const prices: number[] = []
      prices.length = recentData.length
      for (let j = 0; j < recentData.length; j++) {
        prices[j] = recentData[j].close
      }
      priceData[asset] = prices
    }
  }
  
  // OPTIMIZATION FINAL: Early return if no price data available
  const priceDataKeys = Object.keys(priceData)
  if (priceDataKeys.length <= 1) {
    return correlationMatrix
  }
  
  // Calculate correlation between each pair of assets
  // OPTIMIZATION FINAL: Use indexed loops instead of for-of for better performance
  for (let i = 0; i < assetsLength; i++) {
      const asset1 = assets[i]
    const prices1 = priceData[asset1]
    if (!prices1) continue
    
    for (let j = i + 1; j < assetsLength; j++) {
      const asset2 = assets[j]
      const prices2 = priceData[asset2]
      
      // OPTIMIZATION FINAL: Check lengths match before calculating correlation
      if (prices2 && prices1.length === prices2.length) {
        const correlation = calculateCorrelation(prices1, prices2)
        // OPTIMIZATION FINAL: Use direct string concatenation instead of template literal for branch prediction
        const key = asset1 + '-' + asset2
        correlationMatrix[key] = correlation
      }
    }
  }
  
  return correlationMatrix
}

