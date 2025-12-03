/**
 * Formatters for External Market Data
 * Extracted from index.ts for better modularity
 */

/**
 * Format external market data (funding rate, open interest, volume, volatility)
 */
export function formatExternalData(assetData: any): {
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
