/**
 * HyperScreener API Data Fetcher
 * Fetches data from https://api-hyperliquid.asxn.xyz/api
 * 
 * VERIFIED ENDPOINTS:
 * 
 * LIQUIDATIONS:
 * - /api/node/liquidations - All liquidations (sort_by, sort_order, limit)
 * - /api/node/liquidations/{SYMBOL} - Liquidations by symbol (limit, timeframe)
 * - /api/node/liquidations/summary - 24h summary stats
 * - /api/node/liquidations/stats/symbols - Stats grouped by symbol
 * 
 * POSITIONS:
 * - /api/node/positions - All positions (sort_by, sort_order, limit)
 * - /api/node/positions/{SYMBOL} - Positions by symbol (sort_by, sort_order, limit)
 * - /api/node/positions/{SYMBOL}/long - Long positions only
 * - /api/node/positions/{SYMBOL}/short - Short positions only
 * 
 * MARKET SUMMARY:
 * - /api/node/market/summary - All symbols with price change + liquidations
 * - /api/node/market/summary/{SYMBOL} - Per symbol market summary
 * 
 * MARKET DATA:
 * - /api/market-data/funding-rates - Funding rates per symbol
 * - /api/market-data/open-interest - Open interest per symbol
 * - /api/market-data/volume - Volume 24h per symbol
 * - /api/market-data/stats/24h - 24h aggregate stats
 */

const HYPERSCREENER_API_URL = 'https://api-hyperliquid.asxn.xyz/api'

// ============================================================================
// INTERFACES
// ============================================================================

export interface HyperscreenerResponse<T> {
  value: T[]
  Count: number
}

export interface LiquidationEvent {
  timestamp_utc: string
  symbol: string
  address: string
  counterparty: string
  notional_volume: number
  direction: string // "LONG LIQ" or "SHORT LIQ"
  size: number
  price: number
  txn_hash: string
  coin?: string // alias for compatibility
}

export interface LiquidationSummary {
  timeframe: string
  total_liquidations: number
  unique_symbols: number
  unique_addresses: number
  total_notional_volume: number
  long_liquidations: number
  short_liquidations: number
  long_notional: number
  short_notional: number
  largest_liquidation: LiquidationEvent | null
}

export interface SymbolLiquidationStats {
  symbol: string
  total_liquidations: number
  total_notional_volume: number
  long_liquidations: number
  short_liquidations: number
  long_notional: number
  short_notional: number
  largest_liquidation: LiquidationEvent | null
}

export interface LiquidationStatsResponse {
  summary: {
    total_notional_volume_usd: number
    total_symbols: number
    highest_liquidation_usd: number
  }
  symbols: SymbolLiquidationStats[]
}

export interface PositionData {
  address: string
  asset_name: string
  asset_id: number
  direction: 'LONG' | 'SHORT'
  size: number
  current_price: number
  entry_price: number
  liquidation_price: number | null
  notional_value: number
  entry_value: number
  unrealized_pnl: number
  pnl_percent: number
  funding: number
  leverage: number
  margin_used: number
  distance_to_liq: number | null
  withdrawable: number
  rank: number
  updated_at: string
  data_source: string
  dex_index: number | null
  dex_name: string | null
}

export interface MarketSummary {
  symbol: string
  current_price: number
  price_change_24h: number
  price_change_24h_percent: number
  liquidations_24h_usd: number
  liquidations_24h_count: number
  long_liquidations_24h: number
  short_liquidations_24h: number
  largest_liquidation_24h: LiquidationEvent | null
  liquidation_density: any | null
}

export interface MarketDataFundingRate {
  symbol: string
  timestamp: string
  funding_rate: number
}

export interface MarketDataOpenInterest {
  symbol: string
  timestamp: string
  open_interest: number
}

export interface MarketDataVolume {
  symbol: string
  timestamp: string
  volume_24h: number
}

export interface MarketStats24h {
  _id: string // symbol
  avg_funding: number
  max_funding: number
  min_funding: number
  avg_open_interest: number
  max_open_interest: number
  total_volume: number
  data_points: number
}

// ============================================================================
// BASE FETCH FUNCTIONS
// ============================================================================

async function fetchHyperscreenerArray<T>(endpoint: string, params?: Record<string, string | number>): Promise<T[]> {
  // Build URL properly - endpoint starts with / so we need to concatenate correctly
  const baseUrl = HYPERSCREENER_API_URL.endsWith('/') ? HYPERSCREENER_API_URL.slice(0, -1) : HYPERSCREENER_API_URL
  const fullUrl = `${baseUrl}${endpoint}`
  const url = new URL(fullUrl)
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, String(value))
    })
  }

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      return []
    }

    const result = await response.json() as T[] | HyperscreenerResponse<T>
    // API returns plain array directly, not wrapped in {value: [...]}
    if (Array.isArray(result)) {
      return result
    }
    // Fallback for wrapped response format
    if (result && 'value' in result && Array.isArray(result.value)) {
      return result.value
    }
    return []
  } catch (error: any) {
    console.error(`HyperScreener API Error: ${error.message}`)
    return []
  }
}

async function fetchHyperscreenerObject<T>(endpoint: string, params?: Record<string, string | number>): Promise<T | null> {
  // Build URL properly - endpoint starts with / so we need to concatenate correctly
  const baseUrl = HYPERSCREENER_API_URL.endsWith('/') ? HYPERSCREENER_API_URL.slice(0, -1) : HYPERSCREENER_API_URL
  const fullUrl = `${baseUrl}${endpoint}`
  const url = new URL(fullUrl)
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, String(value))
    })
  }

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      return null
    }

    return await response.json() as T
  } catch (error: any) {
    console.error(`HyperScreener API Error: ${error.message}`)
    return null
  }
}

// ============================================================================
// LIQUIDATIONS ENDPOINTS
// ============================================================================

/**
 * Fetch all liquidations
 * Endpoint: /api/node/liquidations
 */
export async function getLiquidations(
  sortBy: string = 'notional_volume',
  sortOrder: 'asc' | 'desc' = 'desc',
  limit: number = 100
): Promise<LiquidationEvent[]> {
  try {
    const result = await fetchHyperscreenerArray<LiquidationEvent>('/node/liquidations', {
      sort_by: sortBy,
      sort_order: sortOrder,
      limit: limit
    })
    return result.map(item => ({
      ...item,
      coin: item.symbol
    }))
  } catch (error: any) {
    console.error('Error fetching liquidations:', error)
    return []
  }
}

/**
 * Fetch liquidations by symbol
 * Endpoint: /api/node/liquidations/{SYMBOL}
 */
export async function getLiquidationsBySymbol(
  symbol: string,
  limit: number = 100,
  timeframe?: string
): Promise<LiquidationEvent[]> {
  try {
    const params: Record<string, string | number> = { limit }
    if (timeframe) {
      params.timeframe = timeframe
    }
    const result = await fetchHyperscreenerArray<LiquidationEvent>(`/node/liquidations/${symbol.toUpperCase()}`, params)
    return result.map(item => ({
      ...item,
      coin: item.symbol
    }))
  } catch (error: any) {
    console.error(`Error fetching liquidations for ${symbol}:`, error)
    return []
  }
}

/**
 * Fetch liquidations summary (24h stats)
 * Endpoint: /api/node/liquidations/summary
 */
export async function getLiquidationsSummary(): Promise<LiquidationSummary | null> {
  try {
    return await fetchHyperscreenerObject<LiquidationSummary>('/node/liquidations/summary')
  } catch (error: any) {
    console.error('Error fetching liquidations summary:', error)
    return null
  }
}

/**
 * Fetch liquidation stats grouped by symbol
 * Endpoint: /api/node/liquidations/stats/symbols
 */
export async function getLiquidationStatsBySymbol(): Promise<LiquidationStatsResponse | null> {
  try {
    return await fetchHyperscreenerObject<LiquidationStatsResponse>('/node/liquidations/stats/symbols')
  } catch (error: any) {
    console.error('Error fetching liquidation stats:', error)
    return null
  }
}

// ============================================================================
// POSITIONS ENDPOINTS
// ============================================================================

/**
 * Fetch all positions (whale tracking)
 * Endpoint: /api/node/positions
 */
export async function getWhalePositions(
  sortBy: string = 'notional_value',
  sortOrder: 'asc' | 'desc' = 'desc',
  limit: number = 100
): Promise<any[]> {
  try {
    const result = await fetchHyperscreenerArray<PositionData>('/node/positions', {
      sort_by: sortBy,
      sort_order: sortOrder,
      limit: limit
    })
    return result.map(pos => ({
      ...pos,
      symbol: pos.asset_name,
      coin: pos.asset_name,
      position_value: pos.notional_value,
      side: pos.direction,
      pnl: pos.unrealized_pnl,
      entry: pos.entry_price,
      current: pos.current_price
    }))
  } catch (error: any) {
    console.error('Error fetching whale positions:', error)
    return []
  }
}

/**
 * Fetch positions by symbol
 * Endpoint: /api/node/positions/{SYMBOL}
 */
export async function getPositionsBySymbol(
  symbol: string,
  sortBy: string = 'notional_value',
  sortOrder: 'asc' | 'desc' = 'desc',
  limit: number = 50
): Promise<PositionData[]> {
  try {
    const result = await fetchHyperscreenerArray<PositionData>(`/node/positions/${symbol.toUpperCase()}`, {
      sort_by: sortBy,
      sort_order: sortOrder,
      limit: limit
    })
    return result
  } catch (error: any) {
    console.error(`Error fetching positions for ${symbol}:`, error)
    return []
  }
}

/**
 * Fetch whale positions by symbol (convenience function)
 * Endpoint: /api/node/positions/{SYMBOL}
 */
export async function getWhalePositionsBySymbol(
  symbol: string,
  limit: number = 20
): Promise<any[]> {
  try {
    const result = await fetchHyperscreenerArray<PositionData>(`/node/positions/${symbol.toUpperCase()}`, {
      sort_by: 'notional_value',
      sort_order: 'desc',
      limit: limit
    })
    return result.map(pos => ({
      ...pos,
      symbol: pos.asset_name,
      coin: pos.asset_name,
      position_value: pos.notional_value,
      side: pos.direction,
      pnl: pos.unrealized_pnl,
      entry: pos.entry_price,
      current: pos.current_price
    }))
  } catch (error: any) {
    console.error(`Error fetching whale positions for ${symbol}:`, error)
    return []
  }
}

/**
 * Fetch long positions by symbol
 * Endpoint: /api/node/positions/{SYMBOL}/long
 */
export async function getLongPositionsBySymbol(
  symbol: string,
  limit: number = 50
): Promise<PositionData[]> {
  try {
    return await fetchHyperscreenerArray<PositionData>(`/node/positions/${symbol.toUpperCase()}/long`, {
      limit: limit
    })
  } catch (error: any) {
    console.error(`Error fetching long positions for ${symbol}:`, error)
    return []
  }
}

/**
 * Fetch short positions by symbol
 * Endpoint: /api/node/positions/{SYMBOL}/short
 */
export async function getShortPositionsBySymbol(
  symbol: string,
  limit: number = 50
): Promise<PositionData[]> {
  try {
    return await fetchHyperscreenerArray<PositionData>(`/node/positions/${symbol.toUpperCase()}/short`, {
      limit: limit
    })
  } catch (error: any) {
    console.error(`Error fetching short positions for ${symbol}:`, error)
    return []
  }
}

// ============================================================================
// CALCULATED/DERIVED DATA
// ============================================================================

/**
 * Calculate long/short ratio from positions data
 */
export async function getLongShortRatio(
  sortBy: string = 'notional_value',
  sortOrder: 'asc' | 'desc' = 'desc',
  limit: number = 200
): Promise<any[]> {
  try {
    const positions = await fetchHyperscreenerArray<PositionData>('/node/positions', {
      sort_by: sortBy,
      sort_order: sortOrder,
      limit: limit
    })
    
    const symbolStats = new Map<string, { longValue: number, shortValue: number, longCount: number, shortCount: number }>()
    
    for (const pos of positions) {
      const symbol = pos.asset_name
      if (!symbolStats.has(symbol)) {
        symbolStats.set(symbol, { longValue: 0, shortValue: 0, longCount: 0, shortCount: 0 })
      }
      const stats = symbolStats.get(symbol)!
      if (pos.direction === 'LONG') {
        stats.longValue += pos.notional_value
        stats.longCount++
      } else {
        stats.shortValue += pos.notional_value
        stats.shortCount++
      }
    }
    
    const result: any[] = []
    symbolStats.forEach((stats, symbol) => {
      const totalValue = stats.longValue + stats.shortValue
      const ratio = stats.shortValue > 0 ? stats.longValue / stats.shortValue : stats.longValue > 0 ? 999 : 1
      result.push({
        symbol,
        coin: symbol,
        long_short_ratio: ratio,
        longShortRatio: ratio,
        ratio,
        long_value: stats.longValue,
        short_value: stats.shortValue,
        long_count: stats.longCount,
        short_count: stats.shortCount,
        total_value: totalValue
      })
    })
    
    result.sort((a, b) => b.total_value - a.total_value)
    return result
  } catch (error: any) {
    console.error('Error calculating long/short ratio:', error)
    return []
  }
}

/**
 * Get long/short ratio for specific symbol
 */
export async function getLongShortRatioBySymbol(symbol: string): Promise<any | null> {
  try {
    const [longPositions, shortPositions] = await Promise.all([
      getLongPositionsBySymbol(symbol, 100),
      getShortPositionsBySymbol(symbol, 100)
    ])
    
    const longValue = longPositions.reduce((sum, p) => sum + p.notional_value, 0)
    const shortValue = shortPositions.reduce((sum, p) => sum + p.notional_value, 0)
    const ratio = shortValue > 0 ? longValue / shortValue : longValue > 0 ? 999 : 1
    
    return {
      symbol,
      coin: symbol,
      long_short_ratio: ratio,
      longShortRatio: ratio,
      ratio,
      long_value: longValue,
      short_value: shortValue,
      long_count: longPositions.length,
      short_count: shortPositions.length,
      total_value: longValue + shortValue
    }
  } catch (error: any) {
    console.error(`Error calculating L/S ratio for ${symbol}:`, error)
    return null
  }
}

/**
 * Fetch large trades (positions with high notional value)
 */
export async function getLargeTrades(
  minValue: number = 100000,
  sortOrder: 'asc' | 'desc' = 'desc',
  limit: number = 100
): Promise<any[]> {
  try {
    const positions = await fetchHyperscreenerArray<PositionData>('/node/positions', {
      sort_by: 'notional_value',
      sort_order: sortOrder,
      limit: limit
    })
    
    return positions
      .filter(pos => pos.notional_value >= minValue)
      .map(pos => ({
        symbol: pos.asset_name,
        coin: pos.asset_name,
        value: pos.notional_value,
        size: pos.size,
        side: pos.direction,
        price: pos.current_price,
        address: pos.address,
        pnl: pos.unrealized_pnl,
        leverage: pos.leverage,
        timestamp: pos.updated_at
      }))
  } catch (error: any) {
    console.error('Error fetching large trades:', error)
    return []
  }
}

/**
 * Get top gainers - positions with positive PnL
 */
export async function getTopGainers(
  timeframe: string = '24h',
  limit: number = 50
): Promise<any[]> {
  try {
    const positions = await fetchHyperscreenerArray<PositionData>('/node/positions', {
      sort_by: 'unrealized_pnl',
      sort_order: 'desc',
      limit: limit
    })
    
    return positions
      .filter(pos => pos.unrealized_pnl > 0)
      .map(pos => ({
        symbol: pos.asset_name,
        coin: pos.asset_name,
        pnl: pos.unrealized_pnl,
        pnl_percent: pos.pnl_percent,
        address: pos.address,
        size: pos.size,
        direction: pos.direction
      }))
  } catch (error: any) {
    console.error('Error fetching top gainers:', error)
    return []
  }
}

/**
 * Get top losers - positions with negative PnL
 */
export async function getTopLosers(
  timeframe: string = '24h',
  limit: number = 50
): Promise<any[]> {
  try {
    const positions = await fetchHyperscreenerArray<PositionData>('/node/positions', {
      sort_by: 'unrealized_pnl',
      sort_order: 'asc',
      limit: limit
    })
    
    return positions
      .filter(pos => pos.unrealized_pnl < 0)
      .map(pos => ({
        symbol: pos.asset_name,
        coin: pos.asset_name,
        pnl: pos.unrealized_pnl,
        pnl_percent: pos.pnl_percent,
        address: pos.address,
        size: pos.size,
        direction: pos.direction
      }))
  } catch (error: any) {
    console.error('Error fetching top losers:', error)
    return []
  }
}

// ============================================================================
// MARKET OVERVIEW & STATS
// ============================================================================

/**
 * Get market overview - combines positions and liquidations data
 */
export async function getMarketOverview(): Promise<any> {
  try {
    const [positions, liqSummary] = await Promise.all([
      fetchHyperscreenerArray<PositionData>('/node/positions', { limit: 500 }),
      getLiquidationsSummary()
    ])
    
    let totalLongValue = 0
    let totalShortValue = 0
    let totalPnl = 0
    const uniqueAddresses = new Set<string>()
    const uniqueAssets = new Set<string>()
    
    for (const pos of positions) {
      uniqueAddresses.add(pos.address)
      uniqueAssets.add(pos.asset_name)
      totalPnl += pos.unrealized_pnl
      if (pos.direction === 'LONG') {
        totalLongValue += pos.notional_value
      } else {
        totalShortValue += pos.notional_value
      }
    }
    
    return {
      positions: {
        total: positions.length,
        unique_traders: uniqueAddresses.size,
        unique_assets: uniqueAssets.size,
        total_long_value: totalLongValue,
        total_short_value: totalShortValue,
        total_open_interest: totalLongValue + totalShortValue,
        net_pnl: totalPnl,
        long_short_ratio: totalShortValue > 0 ? totalLongValue / totalShortValue : 1
      },
      liquidations: liqSummary
    }
  } catch (error: any) {
    console.error('Error fetching market overview:', error)
    return null
  }
}

/**
 * Get markets overview - stats per asset
 */
export async function getMarketsOverview(
  category?: string,
  limit: number = 100
): Promise<any[]> {
  try {
    const [positions, liqStats] = await Promise.all([
      fetchHyperscreenerArray<PositionData>('/node/positions', { limit: 500 }),
      getLiquidationStatsBySymbol()
    ])
    
    // Create liquidation lookup
    const liqLookup = new Map<string, SymbolLiquidationStats>()
    if (liqStats?.symbols) {
      for (const s of liqStats.symbols) {
        liqLookup.set(s.symbol, s)
      }
    }
    
    // Group positions by asset
    const assetStats = new Map<string, {
      longValue: number
      shortValue: number
      totalPnl: number
      count: number
      avgPrice: number
    }>()
    
    for (const pos of positions) {
      const asset = pos.asset_name
      if (!assetStats.has(asset)) {
        assetStats.set(asset, { longValue: 0, shortValue: 0, totalPnl: 0, count: 0, avgPrice: 0 })
      }
      const stats = assetStats.get(asset)!
      stats.count++
      stats.totalPnl += pos.unrealized_pnl
      stats.avgPrice = pos.current_price
      if (pos.direction === 'LONG') {
        stats.longValue += pos.notional_value
      } else {
        stats.shortValue += pos.notional_value
      }
    }
    
    const result: any[] = []
    assetStats.forEach((stats, asset) => {
      const liq = liqLookup.get(asset)
      result.push({
        symbol: asset,
        coin: asset,
        name: asset,
        mark_price: stats.avgPrice,
        open_interest: stats.longValue + stats.shortValue,
        long_value: stats.longValue,
        short_value: stats.shortValue,
        net_pnl: stats.totalPnl,
        position_count: stats.count,
        long_short_ratio: stats.shortValue > 0 ? stats.longValue / stats.shortValue : 1,
        liquidations_24h: liq?.total_liquidations || 0,
        liquidation_volume_24h: liq?.total_notional_volume || 0
      })
    })
    
    result.sort((a, b) => b.open_interest - a.open_interest)
    return result.slice(0, limit)
  } catch (error: any) {
    console.error('Error fetching markets overview:', error)
    return []
  }
}

/**
 * Get liquidation heatmap by symbol
 */
export async function getLiquidationHeatmap(
  symbol: string = 'BTC',
  timeframe: string = '24h'
): Promise<any> {
  try {
    // Use the per-symbol liquidations endpoint
    const liquidations = await getLiquidationsBySymbol(symbol, 500, timeframe)
    
    // Group by price levels
    const priceLevels = new Map<number, { count: number, volume: number, longs: number, shorts: number }>()
    
    // Determine price rounding based on asset
    const priceRounding = symbol === 'BTC' ? 100 : symbol === 'ETH' ? 10 : 1
    
    for (const liq of liquidations) {
      const priceLevel = Math.round(liq.price / priceRounding) * priceRounding
      if (!priceLevels.has(priceLevel)) {
        priceLevels.set(priceLevel, { count: 0, volume: 0, longs: 0, shorts: 0 })
      }
      const level = priceLevels.get(priceLevel)!
      level.count++
      level.volume += liq.notional_volume
      if (liq.direction?.includes('LONG')) {
        level.longs++
      } else {
        level.shorts++
      }
    }
    
    const heatmap: any[] = []
    priceLevels.forEach((data, price) => {
      heatmap.push({
        price,
        count: data.count,
        volume: data.volume,
        long_liqs: data.longs,
        short_liqs: data.shorts
      })
    })
    
    heatmap.sort((a, b) => b.volume - a.volume)
    
    return {
      symbol,
      timeframe,
      total_liquidations: liquidations.length,
      total_volume: liquidations.reduce((sum, l) => sum + l.notional_volume, 0),
      heatmap: heatmap.slice(0, 20)
    }
  } catch (error: any) {
    console.error('Error fetching liquidation heatmap:', error)
    return null
  }
}

/**
 * Get top traders ranking - by PnL or volume
 */
export async function getTopTradersRanking(
  timeframe: string = 'D',
  sortBy: string = 'pnl',
  sortOrder: 'asc' | 'desc' = 'desc',
  limit: number = 100
): Promise<any[]> {
  try {
    const sortField = sortBy === 'pnl' ? 'unrealized_pnl' : 'notional_value'
    const positions = await fetchHyperscreenerArray<PositionData>('/node/positions', {
      sort_by: sortField,
      sort_order: sortOrder,
      limit: limit * 2
    })
    
    const traderStats = new Map<string, {
      totalPnl: number
      totalValue: number
      positions: number
      assets: Set<string>
    }>()
    
    for (const pos of positions) {
      if (!traderStats.has(pos.address)) {
        traderStats.set(pos.address, { totalPnl: 0, totalValue: 0, positions: 0, assets: new Set() })
      }
      const stats = traderStats.get(pos.address)!
      stats.totalPnl += pos.unrealized_pnl
      stats.totalValue += pos.notional_value
      stats.positions++
      stats.assets.add(pos.asset_name)
    }
    
    const result: any[] = []
    traderStats.forEach((stats, address) => {
      result.push({
        address,
        pnl: stats.totalPnl,
        total_value: stats.totalValue,
        position_count: stats.positions,
        assets_count: stats.assets.size,
        assets: Array.from(stats.assets)
      })
    })
    
    if (sortBy === 'pnl') {
      result.sort((a, b) => sortOrder === 'desc' ? b.pnl - a.pnl : a.pnl - b.pnl)
    } else {
      result.sort((a, b) => sortOrder === 'desc' ? b.total_value - a.total_value : a.total_value - b.total_value)
    }
    
    return result.slice(0, limit)
  } catch (error: any) {
    console.error('Error fetching top traders:', error)
    return []
  }
}

/**
 * Get platform stats - comprehensive statistics
 */
export async function getPlatformStats(): Promise<any> {
  try {
    const [positions, liqSummary, liqStats] = await Promise.all([
      fetchHyperscreenerArray<PositionData>('/node/positions', { limit: 500 }),
      getLiquidationsSummary(),
      getLiquidationStatsBySymbol()
    ])
    
    const uniqueTraders = new Set(positions.map(p => p.address))
    const totalOI = positions.reduce((sum, p) => sum + p.notional_value, 0)
    const totalPnl = positions.reduce((sum, p) => sum + p.unrealized_pnl, 0)
    
    return {
      positions: {
        total: positions.length,
        unique_traders: uniqueTraders.size,
        total_open_interest: totalOI,
        net_unrealized_pnl: totalPnl
      },
      liquidations_24h: liqSummary ? {
        total: liqSummary.total_liquidations,
        volume: liqSummary.total_notional_volume,
        long_count: liqSummary.long_liquidations,
        short_count: liqSummary.short_liquidations,
        long_volume: liqSummary.long_notional,
        short_volume: liqSummary.short_notional,
        unique_symbols: liqSummary.unique_symbols,
        largest: liqSummary.largest_liquidation
      } : null,
      top_liquidated_symbols: liqStats?.symbols?.slice(0, 5) || []
    }
  } catch (error: any) {
    console.error('Error fetching platform stats:', error)
    return null
  }
}

// ============================================================================
// MARKET SUMMARY ENDPOINTS
// ============================================================================

/**
 * Get market summary for all symbols
 * Endpoint: /api/node/market/summary
 * Returns: price, price change 24h, liquidations 24h per symbol
 */
export async function getMarketSummaryAll(): Promise<MarketSummary[]> {
  try {
    const result = await fetchHyperscreenerArray<MarketSummary>('/node/market/summary')
    return result
  } catch (error: any) {
    console.error('Error fetching market summary:', error)
    return []
  }
}

/**
 * Get market summary for specific symbol
 * Endpoint: /api/node/market/summary/{SYMBOL}
 * Returns: price, price change 24h, liquidations 24h
 */
export async function getMarketSummaryBySymbol(symbol: string): Promise<MarketSummary | null> {
  try {
    return await fetchHyperscreenerObject<MarketSummary>(`/node/market/summary/${symbol.toUpperCase()}`)
  } catch (error: any) {
    console.error(`Error fetching market summary for ${symbol}:`, error)
    return null
  }
}

// ============================================================================
// MARKET DATA ENDPOINTS
// ============================================================================

/**
 * Get funding rates from HyperScreener
 * Endpoint: /api/market-data/funding-rates
 */
export async function getMarketDataFundingRates(limit: number = 100): Promise<MarketDataFundingRate[]> {
  try {
    return await fetchHyperscreenerArray<MarketDataFundingRate>('/market-data/funding-rates', { limit })
  } catch (error: any) {
    console.error('Error fetching market data funding rates:', error)
    return []
  }
}

/**
 * Get open interest from HyperScreener
 * Endpoint: /api/market-data/open-interest
 */
export async function getMarketDataOpenInterest(limit: number = 100): Promise<MarketDataOpenInterest[]> {
  try {
    return await fetchHyperscreenerArray<MarketDataOpenInterest>('/market-data/open-interest', { limit })
  } catch (error: any) {
    console.error('Error fetching market data open interest:', error)
    return []
  }
}

/**
 * Get volume from HyperScreener
 * Endpoint: /api/market-data/volume
 */
export async function getMarketDataVolume(limit: number = 100): Promise<MarketDataVolume[]> {
  try {
    return await fetchHyperscreenerArray<MarketDataVolume>('/market-data/volume', { limit })
  } catch (error: any) {
    console.error('Error fetching market data volume:', error)
    return []
  }
}

/**
 * Get 24h stats from HyperScreener
 * Endpoint: /api/market-data/stats/24h
 * Returns: avg/min/max funding, OI, volume per symbol
 */
export async function getMarketStats24h(): Promise<MarketStats24h[]> {
  try {
    return await fetchHyperscreenerArray<MarketStats24h>('/market-data/stats/24h')
  } catch (error: any) {
    console.error('Error fetching market stats 24h:', error)
    return []
  }
}

/**
 * Funding rates - legacy function, use getMarketDataFundingRates for HyperScreener data
 * Note: For real-time funding, use Hyperliquid native API
 */
export async function getFundingRates(): Promise<any[]> {
  return getMarketDataFundingRates()
}

/**
 * Open interest - calculated from positions
 */
export async function getOpenInterest(
  sortBy: string = 'notional_value',
  sortOrder: 'asc' | 'desc' = 'desc',
  limit: number = 100
): Promise<any[]> {
  try {
    const positions = await fetchHyperscreenerArray<PositionData>('/node/positions', {
      sort_by: sortBy,
      sort_order: sortOrder,
      limit: 500
    })
    
    const symbolOI = new Map<string, number>()
    for (const pos of positions) {
      const current = symbolOI.get(pos.asset_name) || 0
      symbolOI.set(pos.asset_name, current + pos.notional_value)
    }
    
    const result: any[] = []
    symbolOI.forEach((oi, symbol) => {
      result.push({
        symbol,
        coin: symbol,
        open_interest: oi,
        openInterest: oi
      })
    })
    
    result.sort((a, b) => b.open_interest - a.open_interest)
    return result.slice(0, limit)
  } catch (error: any) {
    console.error('Error fetching open interest:', error)
    return []
  }
}

// ============================================================================
// LEGACY EXPORTS FOR COMPATIBILITY
// ============================================================================

export { getLongShortRatio as getHyperscreenerLongShortRatio }
export { getOpenInterest as getHyperscreenerOpenInterest }
export { getFundingRates as getHyperscreenerFundingRates }
export const getTopTraders = getTopTradersRanking
export const fetchHyperscreenerData = fetchHyperscreenerArray

// Stub functions for endpoints that don't exist
export const getOrderFlow = async () => []
export const getVolumeHistory = async () => []
export const getOpenInterestHistory = async () => []
export const getLiquidationHistory = async () => getLiquidations('notional_volume', 'desc', 100)
export const getNetInflows = async () => []
export const getUniqueTradersByCoin = async () => []
export const getNewUsersGrowth = async () => []
export const getTradesHistory = async () => []
export const getTopUsersByVolume = async () => getTopTradersRanking('D', 'volume', 'desc', 50)
export const getNonHLPVolume = async () => []
export const getMakerTakerRatio = async () => []
export const getAnnualizedFundingRates = async () => []
export const getPremiumDiscount = async () => []
export const getSlippageData = async () => []
export const getTraderProfile = async (address: string) => null
export const getTopDepositors = async () => []
export const getMostLiquidatedUsers = async () => []
export const getMostActiveTraders = async () => getTopTradersRanking('D', 'volume', 'desc', 50)
export const getTraderDistribution = async () => null
export const getVaultsOverview = async () => []
export const getHLPData = async () => null
export const getHLPPnL = async () => null
export const getVaultTVLDistribution = async () => null
export const getSymbolFuturesData = async (symbol: string) => null
export const getVolume = async () => []
export const getPriceChanges = async () => []
export const getLeverageDistribution = async () => []
export const getTraderPositions = async () => getWhalePositions('notional_value', 'desc', 100)
