/**
 * Binance Futures API Data Fetcher
 * Fetch funding rate, open interest, long/short ratio, liquidations, premium index
 */

import {
  FundingRateData,
  OpenInterestData,
  LongShortRatioData,
  LiquidationData,
  PremiumIndexData,
  FuturesMarketData
} from '../types/futures-types'

// Map Hyperliquid assets to Binance futures symbols
const BINANCE_FUTURES_SYMBOLS: Record<string, string> = {
  'BTC': 'BTCUSDT',
  'ETH': 'ETHUSDT',
  'SOL': 'SOLUSDT',
  'BNB': 'BNBUSDT',
  'ADA': 'ADAUSDT',
  'DOGE': 'DOGEUSDT',
  'LINK': 'LINKUSDT',
  'AVAX': 'AVAXUSDT',
  'MATIC': 'MATICUSDT',
  'DOT': 'DOTUSDT',
  'LTC': 'LTCUSDT',
  'BCH': 'BCHUSDT',
  'UNI': 'UNIUSDT',
  'ATOM': 'ATOMUSDT',
  'FIL': 'FILUSDT',
  'ICP': 'ICPUSDT',
  'AAVE': 'AAVEUSDT',
  'ETC': 'ETCUSDT',
  'XLM': 'TRXUSDT',
  'TRX': 'TRXUSDT',
  'NEAR': 'NEARUSDT',
  'ALGO': 'ALGOUSDT',
  'APT': 'APTUSDT',
  'ARB': 'ARBUSDT',
  'OP': 'OPUSDT',
  'SUI': 'SUIUSDT',
  'TON': 'TONUSDT',
  'SEI': 'SEIUSDT',
  'INJ': 'INJUSDT',
  'TIA': 'TIAUSDT',
  'WLD': 'WLDUSDT',
  'RENDER': 'RENDERUSDT',
  'PYTH': 'PYTHUSDT',
  'BLUR': 'BLURUSDT',
  'JTO': 'JTOUSDT',
  'ORDI': 'ORDIUSDT',
  'DYDX': 'DYDXUSDT',
  'RUNE': 'RUNEUSDT',
  'FET': 'FETUSDT',
  'STX': 'STXUSDT',
  'FTM': 'FTMUSDT'
}

const MAX_RETRIES = 3
const REQUEST_TIMEOUT = 5000
// Limit controls: if set to '0' (default), we omit the limit param to avoid server-side capping
const FUNDING_RATE_LIMIT = 0
const TOP_LS_ACCOUNT_LIMIT = 0
const TOP_LS_POSITION_LIMIT = 0

function withLimitParam(basePath: string, limit: number): string {
  if (!limit || limit <= 0) return basePath
  const sep = basePath.includes('?') ? '&' : '?'
  return `${basePath}${sep}limit=${limit}`
}

/**
 * Make HTTPS request with retry logic using fetch API for Cloudflare Workers compatibility
 */
async function httpsRequest(
  hostname: string,
  path: string,
  retries: number = 0
): Promise<any> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const url = `https://${hostname}${path}`

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; GEARTRADE/1.0)'
        },
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (response.status === 429) {
        // Rate limit - wait and retry
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)))
          continue
        }
        throw new Error(`Binance API rate limit (429)`)
      }

      if (response.status !== 200) {
        const errorText = await response.text()
        const errorMsg = errorText ? errorText.substring(0, 200) : 'Unknown error'
        throw new Error(`Binance API error: ${response.status} - ${errorMsg}`)
      }

      const data = await response.text()
      return JSON.parse(data)
    } catch (error: any) {
      // Handle abort error (timeout)
      if (error.name === 'AbortError') {
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)))
          continue
        }
        throw new Error('Request timeout')
      }

      if (attempt < retries) {
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)))
        continue
      }
      throw error
    }
  }
  throw new Error('All retries exhausted')
}

/**
 * Fetch funding rate for a symbol
 */
export async function fetchFundingRate(asset: string): Promise<FundingRateData> {
  const symbol = BINANCE_FUTURES_SYMBOLS[asset]
  if (!symbol) {
    throw new Error(`Asset ${asset} not supported on Binance Futures`)
  }

  try {
    // Get current funding rate
    const currentData = await httpsRequest(
      'fapi.binance.com',
      `/fapi/v1/premiumIndex?symbol=${symbol}`,
      MAX_RETRIES
    )

    const currentFundingRate = parseFloat(currentData.lastFundingRate || '0')

    // Get historical funding rates for trend calculation
    const fundingHistPathBase = `/fapi/v1/fundingRate?symbol=${symbol}`
    const fundingHistPath = withLimitParam(fundingHistPathBase, FUNDING_RATE_LIMIT)
    const historicalData = await httpsRequest('fapi.binance.com', fundingHistPath, MAX_RETRIES)

    const rates = Array.isArray(historicalData) ? historicalData.map((r: any) => parseFloat(r.fundingRate || '0')) : []

    // Calculate 24h and 7d averages
    const rate24h = rates.slice(0, 3).reduce((sum: number, r: number) => sum + r, 0) / Math.max(1, Math.min(3, rates.length))
    const rate7d = rates.slice(0, 8).reduce((sum: number, r: number) => sum + r, 0) / Math.max(1, Math.min(8, rates.length))

    // Calculate trend (3h, 8h, 24h momentum)
    // const rate3h = rates.length > 0 ? rates[0] : currentFundingRate
    const rate8h = rates.length > 2 ? rates[2] : currentFundingRate
    const rate24hHist = rates.length > 7 ? rates[7] : currentFundingRate

    let trend: 'rising' | 'falling' | 'neutral' = 'neutral'
    if (currentFundingRate > rate8h * 1.1) {
      trend = 'rising'
    } else if (currentFundingRate < rate8h * 0.9) {
      trend = 'falling'
    }

    // Calculate momentum (weighted average of recent changes)
    const momentum = (currentFundingRate - rate8h) * 0.5 + (rate8h - rate24hHist) * 0.3 + (rate24hHist - rate7d) * 0.2

    // Check if extreme (>0.1% or <-0.1%)
    const extreme = Math.abs(currentFundingRate) > 0.001

    return {
      current: currentFundingRate,
      rate24h: isNaN(rate24h) ? 0 : rate24h,
      rate7d: isNaN(rate7d) ? 0 : rate7d,
      trend,
      momentum: isNaN(momentum) ? 0 : momentum,
      extreme,
      lastUpdate: Date.now()
    }
  } catch (error: any) {
    const errorMsg = error.message || String(error)
    console.warn(`⚠️  Failed to fetch funding rate for ${asset}: ${errorMsg}`)
    // Return fallback data
    return {
      current: 0,
      rate24h: 0,
      rate7d: 0,
      trend: 'neutral',
      momentum: 0,
      extreme: false,
      lastUpdate: Date.now()
    }
  }
}

/**
 * Fetch open interest for a symbol
 */
export async function fetchOpenInterest(asset: string): Promise<OpenInterestData> {
  const symbol = BINANCE_FUTURES_SYMBOLS[asset]
  if (!symbol) {
    throw new Error(`Asset ${asset} not supported on Binance Futures`)
  }

  try {
    // Get current open interest
    const currentData = await httpsRequest(
      'fapi.binance.com',
      `/fapi/v1/openInterest?symbol=${symbol}`,
      MAX_RETRIES
    )

    // const currentOI = parseFloat(currentData.openInterest || '0')
    const openInterestValueUsd = parseFloat(currentData.openInterestValue || '0')

    // Get 24h OI history for change calculation
    // Note: Binance doesn't provide direct 24h OI history, we'll estimate from other endpoints
    // For now, we'll use current OI and assume neutral trend
    // In production, you might want to store OI snapshots

    // Calculate trend (simplified - would need historical data for accurate trend)
    const trend: 'rising' | 'falling' | 'neutral' = 'neutral'

    // Change24h would require storing historical OI values
    // For now, return 0 and neutral trend
    const change24h = 0
    const change24hValue = 0

    // Momentum calculation (placeholder - would need historical data)
    const momentum = 0

    // Concentration (placeholder - would need top trader positions)
    const concentration = 0.5

    return {
      current: openInterestValueUsd,
      change24h: isNaN(change24h) ? 0 : change24h,
      change24hValue: isNaN(change24hValue) ? 0 : change24hValue,
      trend,
      momentum: isNaN(momentum) ? 0 : momentum,
      concentration: isNaN(concentration) ? 0.5 : Math.max(0, Math.min(1, concentration)),
      lastUpdate: Date.now()
    }
  } catch (error: any) {
    const errorMsg = error.message || String(error)
    console.warn(`⚠️  Failed to fetch open interest for ${asset}: ${errorMsg}`)
    return {
      current: 0,
      change24h: 0,
      change24hValue: 0,
      trend: 'neutral',
      momentum: 0,
      concentration: 0.5,
      lastUpdate: Date.now()
    }
  }
}

/**
 * Fetch long/short ratio for a symbol
 */
export async function fetchLongShortRatio(asset: string): Promise<LongShortRatioData> {
  const symbol = BINANCE_FUTURES_SYMBOLS[asset]
  if (!symbol) {
    throw new Error(`Asset ${asset} not supported on Binance Futures`)
  }

  try {
    // Binance doesn't provide direct long/short ratio endpoint
    // We'll use top trader positions endpoint as proxy
    const topLsAccBase = `/futures/data/topLongShortAccountRatio?symbol=${symbol}&period=5m`
    const topLsAccPath = withLimitParam(topLsAccBase, TOP_LS_ACCOUNT_LIMIT)
    const topTraderData = await httpsRequest('fapi.binance.com', topLsAccPath, MAX_RETRIES)

    let longPct = 50
    let shortPct = 50

    if (Array.isArray(topTraderData) && topTraderData.length > 0) {
      const ratio = parseFloat(topTraderData[0].longShortRatio || '1')
      longPct = (ratio / (1 + ratio)) * 100
      shortPct = 100 - longPct
    }

    // Also try position ratio endpoint
    try {
      const topLsPosBase = `/futures/data/topLongShortPositionRatio?symbol=${symbol}&period=5m`
      const topLsPosPath = withLimitParam(topLsPosBase, TOP_LS_POSITION_LIMIT)
      const positionRatioData = await httpsRequest('fapi.binance.com', topLsPosPath, MAX_RETRIES)

      if (Array.isArray(positionRatioData) && positionRatioData.length > 0) {
        const posRatio = parseFloat(positionRatioData[0].longShortRatio || '1')
        const posLongPct = (posRatio / (1 + posRatio)) * 100
        // Average between account ratio and position ratio
        longPct = (longPct + posLongPct) / 2
        shortPct = 100 - longPct
      }
    } catch (e) {
      // Ignore if position ratio fails
    }

    // For retail vs pro, we'll use the same data (Binance doesn't separate)
    const retailLongPct = longPct
    const retailShortPct = shortPct
    const proLongPct = longPct
    const proShortPct = shortPct

    const extreme = longPct > 70 || longPct < 30
    const sentiment: 'extreme_long' | 'extreme_short' | 'balanced' =
      longPct > 70 ? 'extreme_long' : longPct < 30 ? 'extreme_short' : 'balanced'

    return {
      longPct: Math.max(0, Math.min(100, longPct)),
      shortPct: Math.max(0, Math.min(100, shortPct)),
      retailLongPct: Math.max(0, Math.min(100, retailLongPct)),
      retailShortPct: Math.max(0, Math.min(100, retailShortPct)),
      proLongPct: Math.max(0, Math.min(100, proLongPct)),
      proShortPct: Math.max(0, Math.min(100, proShortPct)),
      extreme,
      sentiment,
      lastUpdate: Date.now()
    }
  } catch (error: any) {
    const errorMsg = error.message || String(error)
    console.warn(`⚠️  Failed to fetch long/short ratio for ${asset}: ${errorMsg}`)
    return {
      longPct: 50,
      shortPct: 50,
      retailLongPct: 50,
      retailShortPct: 50,
      proLongPct: 50,
      proShortPct: 50,
      extreme: false,
      sentiment: 'balanced',
      lastUpdate: Date.now()
    }
  }
}

/**
 * Estimate liquidation data (Binance doesn't provide direct liquidation data)
 */
export async function estimateLiquidationData(
  asset: string,
  currentPrice: number
): Promise<LiquidationData> {
  // Binance doesn't provide direct liquidation data
  // We'll estimate based on open interest and price levels
  // In production, you might want to use Coinglass or Hyblock APIs

  try {
    const oiData = await fetchOpenInterest(asset)

    // Estimate liquidation clusters based on price levels and OI
    // This is a simplified estimation - real liquidation data requires premium APIs
    const clusters: any[] = []
    const safeEntryZones: Array<{ priceLow: number; priceHigh: number }> = []

    // Placeholder: estimate clusters at key price levels (±5%, ±10%, ±15%)
    const priceLevels = [0.95, 0.90, 0.85, 1.05, 1.10, 1.15]
    for (const level of priceLevels) {
      const clusterPrice = currentPrice * level
      clusters.push({
        price: clusterPrice,
        size: oiData.current * 0.1, // Estimate 10% of OI at each level
        side: level < 1 ? 'long' : 'short',
        confidence: 0.5
      })
    }

    // Estimate liquidations from 24h price action (simplified)
    const longLiquidations24h = oiData.current * 0.02 // Estimate 2% of OI
    const shortLiquidations24h = oiData.current * 0.02

    // Safe entry zones (areas with low estimated liquidation density)
    safeEntryZones.push({
      priceLow: currentPrice * 0.98,
      priceHigh: currentPrice * 1.02
    })

    // Calculate distance to nearest cluster
    const distances = clusters.map(c => Math.abs(c.price - currentPrice) / currentPrice * 100)
    const liquidationDistance = distances.length > 0 ? Math.min(...distances) : 10

    return {
      longLiquidations24h: isNaN(longLiquidations24h) ? 0 : longLiquidations24h,
      shortLiquidations24h: isNaN(shortLiquidations24h) ? 0 : shortLiquidations24h,
      clusters: clusters.slice(0, 10),
      nearbyLongClusters: clusters.filter(c => c.side === 'long' && c.price < currentPrice * 1.05 && c.price > currentPrice * 0.95),
      nearbyShortClusters: clusters.filter(c => c.side === 'short' && c.price < currentPrice * 1.05 && c.price > currentPrice * 0.95),
      safeEntryZones,
      liquidationDistance: isNaN(liquidationDistance) ? 10 : liquidationDistance,
      lastUpdate: Date.now()
    }
  } catch (error: any) {
    const errorMsg = error.message || String(error)
    console.warn(`⚠️  Failed to estimate liquidation data for ${asset}: ${errorMsg}`)
    return {
      longLiquidations24h: 0,
      shortLiquidations24h: 0,
      clusters: [],
      nearbyLongClusters: [],
      nearbyShortClusters: [],
      safeEntryZones: [],
      liquidationDistance: 10,
      lastUpdate: Date.now()
    }
  }
}

/**
 * Fetch premium index (futures vs spot)
 */
export async function fetchPremiumIndex(asset: string): Promise<PremiumIndexData> {
  const symbol = BINANCE_FUTURES_SYMBOLS[asset]
  if (!symbol) {
    throw new Error(`Asset ${asset} not supported on Binance Futures`)
  }

  try {
    const premiumData = await httpsRequest(
      'fapi.binance.com',
      `/fapi/v1/premiumIndex?symbol=${symbol}`,
      MAX_RETRIES
    )

    const premiumPct = parseFloat(premiumData.lastFundingRate || '0')

    // Get historical premium for trend calculation
    // Binance doesn't provide direct historical premium, we'll use funding rate as proxy
    const historicalData = await httpsRequest(
      'fapi.binance.com',
      `/fapi/v1/fundingRate?symbol=${symbol}&limit=30`,
      MAX_RETRIES
    )

    const premiums = Array.isArray(historicalData) ? historicalData.map((r: any) => parseFloat(r.fundingRate || '0')) : []

    const premium24h = premiums.slice(0, 3).reduce((sum: number, p: number) => sum + p, 0) / Math.max(1, Math.min(3, premiums.length))
    const premium7d = premiums.slice(0, 8).reduce((sum: number, p: number) => sum + p, 0) / Math.max(1, Math.min(8, premiums.length))

    let trend: 'rising' | 'falling' | 'neutral' = 'neutral'
    if (premiumPct > premium24h * 1.1) {
      trend = 'rising'
    } else if (premiumPct < premium24h * 0.9) {
      trend = 'falling'
    }

    // Calculate divergence (standard deviations from 7d average)
    const avg7d = premium7d
    const stdDev = Math.sqrt(premiums.slice(0, 8).reduce((sum: number, p: number) => sum + Math.pow(p - avg7d, 2), 0) / Math.max(1, premiums.length))
    const divergence = stdDev > 0 ? (premiumPct - avg7d) / stdDev : 0

    // Arbitrage opportunity if premium is extreme (>0.2% or <-0.2%)
    const arbitrageOpportunity = Math.abs(premiumPct) > 0.002

    return {
      premiumPct: isNaN(premiumPct) ? 0 : premiumPct,
      premium24h: isNaN(premium24h) ? 0 : premium24h,
      premium7d: isNaN(premium7d) ? 0 : premium7d,
      trend,
      divergence: isNaN(divergence) ? 0 : divergence,
      arbitrageOpportunity,
      lastUpdate: Date.now()
    }
  } catch (error: any) {
    const errorMsg = error.message || String(error)
    console.warn(`⚠️  Failed to fetch premium index for ${asset}: ${errorMsg}`)
    return {
      premiumPct: 0,
      premium24h: 0,
      premium7d: 0,
      trend: 'neutral',
      divergence: 0,
      arbitrageOpportunity: false,
      lastUpdate: Date.now()
    }
  }
}

/**
 * Fetch all futures data for an asset
 */
export async function fetchFuturesData(asset: string, currentPrice: number): Promise<FuturesMarketData | null> {
  if (!BINANCE_FUTURES_SYMBOLS[asset]) {
    // Asset not supported on Binance Futures
    return null
  }

  try {
    const [fundingRate, openInterest, longShortRatio, liquidation, premiumIndex] = await Promise.all([
      fetchFundingRate(asset),
      fetchOpenInterest(asset),
      fetchLongShortRatio(asset),
      estimateLiquidationData(asset, currentPrice),
      fetchPremiumIndex(asset)
    ])

    return {
      asset,
      price: currentPrice,
      fundingRate,
      openInterest,
      longShortRatio,
      liquidation,
      premiumIndex,
      timestamp: Date.now()
    }
  } catch (error: any) {
    const errorMsg = error.message || String(error)
    console.warn(`⚠️  Failed to fetch futures data for ${asset}: ${errorMsg}`)
    return null
  }
}

/**
 * Batch fetch futures data for multiple assets
 */
export async function batchFetchFuturesData(
  assets: string[],
  prices: Map<string, number> | Record<string, number>
): Promise<Map<string, FuturesMarketData>> {
  const results = new Map<string, FuturesMarketData>()

  // Fetch in parallel (with rate limit protection)
  const promises = assets.map(async (asset) => {
    const price = prices instanceof Map ? prices.get(asset) : prices[asset]
    if (!price || price <= 0) {
      return { asset, data: null }
    }

    try {
      const data = await fetchFuturesData(asset, price)
      return { asset, data }
    } catch (error: any) {
      console.warn(`⚠️  Failed to fetch futures data for ${asset}: ${error.message}`)
      return { asset, data: null }
    }
  })

  const resultsArray = await Promise.all(promises)

  for (const { asset, data } of resultsArray) {
    if (data) {
      results.set(asset, data)
    }
  }

  return results
}

