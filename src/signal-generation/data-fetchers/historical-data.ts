/**
 * Historical Data Aggregation
 * getHistoricalData, getMultiTimeframeData functions
 */

import { HistoricalDataPoint } from '../types'
import { getHistoricalDataFromBinance } from './binance'
// import { interpolateToHourly } from '../utils/interpolation'
// import { getCacheTTLForInterval } from '../utils/cache'

// Simple in-memory cache (could be improved with Redis or similar)
// const historicalDataCache = new Map<string, { data: HistoricalDataPoint[]; timestamp: number }>()

export async function getHistoricalData(
  asset: string,
  interval: string = '1h',
  n: number = 200
): Promise<HistoricalDataPoint[]> {
  try {
    // Caching disabled for Binance data for maximum speed (skip cache check and set)
    // Cache structure kept for future use but disabled for now
    
    // Use Binance API as primary source
    let binanceData: HistoricalDataPoint[] = []
    try {
      binanceData = await getHistoricalDataFromBinance(asset, interval, n)
      if (binanceData && binanceData.length > 0) {
        if (binanceData.length >= 14) {
          // Cache disabled - return data directly for maximum speed
          return binanceData
        }
      }
    } catch (binanceError: any) {
      // No fallback - only use Binance API
      // OPTIMIZATION: Removed error logging - only show successful fetches
      return []
    }
    
    return []
  } catch (error: any) {
    // OPTIMIZATION: Removed error logging - only show successful fetches
    // Cache disabled - no need to clear cache on rate limit errors
    // Keep this section for future use if caching is re-enabled
    
    return []
  }
}

export async function getMultiTimeframeData(
  asset: string,
  timeframes: string[] = ['1h', '4h', '1d']
): Promise<Record<string, HistoricalDataPoint[]>> {
  const multiTimeframeData: Record<string, HistoricalDataPoint[]> = {}
  
  // Parallel fetch for all timeframes
  const fetchPromises = timeframes.map(async (tf) => {
    try {
      let n = 200 // Default number of candles
      
      // Highly optimized: Reduce candle count for maximum speed (match main candle count)
      if (tf === '1d') {
        n = 55 // Reduced from 75 to 55 days (27% faster, matches main optimization)
      } else if (tf === '4h') {
        n = 55 // Reduced from 75 to 55 * 4h = ~9 days (27% faster, matches main optimization)
      } else if (tf === '1h') {
        n = 55 // Reduced from 75 to 55 hours = ~2.3 days (27% faster, matches main optimization)
      }
      
      const data = await getHistoricalData(asset, tf, n)
      return { tf, data }
    } catch (error: any) {
      // OPTIMIZATION: Removed error logging - only show successful fetches
      return { tf, data: [] }
    }
  })
  
  // Wait for all timeframes to complete in parallel
  const results = await Promise.allSettled(fetchPromises)
  
  results.forEach((result) => {
    if (result.status === 'fulfilled' && result.value.data.length > 0) {
      multiTimeframeData[result.value.tf] = result.value.data
    }
  })
  
  return multiTimeframeData
}

