/**
 * Tier Classification System
 * Classifies traders/positions based on notional value
 */

export interface TierInfo {
  name: string
  emoji: string
  minNotional: number
  maxNotional: number
}

export const TRADER_TIERS: TierInfo[] = [
  { name: 'Shrimp', emoji: '🦐', minNotional: 0, maxNotional: 1000 },
  { name: 'Crab', emoji: '🦀', minNotional: 1000, maxNotional: 5000 },
  { name: 'Fish', emoji: '🐟', minNotional: 5000, maxNotional: 25000 },
  { name: 'Shark', emoji: '🦈', minNotional: 25000, maxNotional: 100000 },
  { name: 'Whale', emoji: '🐋', minNotional: 100000, maxNotional: 500000 },
  { name: 'Mega Whale', emoji: '🐳', minNotional: 500000, maxNotional: 2000000 },
  { name: 'Institutional', emoji: '🐉', minNotional: 2000000, maxNotional: Infinity },
]

/**
 * Get tier info based on notional value
 */
export function getTierByNotional(notionalValue: number): TierInfo {
  for (const tier of TRADER_TIERS) {
    if (notionalValue >= tier.minNotional && notionalValue < tier.maxNotional) {
      return tier
    }
  }
  // Default to last tier (Institutional) for very large values
  return TRADER_TIERS[TRADER_TIERS.length - 1]
}

/**
 * Get tier label with emoji
 */
export function getTierLabel(notionalValue: number): string {
  const tier = getTierByNotional(notionalValue)
  return `${tier.emoji} ${tier.name}`
}

/**
 * Position with tier info
 */
export interface PositionWithTier {
  address: string
  symbol: string
  side: 'LONG' | 'SHORT'
  size: number
  notionalValue: number
  entryPrice: number
  currentPrice: number
  unrealizedPnl: number
  pnlPercent: number
  leverage: number
  tier: string
  tierEmoji: string
  tierName: string
}

/**
 * Wallet with notional value for sorting
 */
export interface WalletNotional {
  address: string
  notional: number
}

/**
 * Tier breakdown statistics
 */
export interface TierBreakdown {
  tierName: string
  emoji: string
  long: {
    count: number
    notional: number
    topWallets: WalletNotional[] // Sorted by notional desc
  }
  short: {
    count: number
    notional: number
    topWallets: WalletNotional[] // Sorted by notional desc
  }
  total: {
    count: number
    notional: number
    percentage: number
  }
}

/**
 * Classification result for a ticker
 */
export interface TierClassificationResult {
  ticker: string
  timestamp: number
  totalPositions: number
  totalNotional: number
  breakdown: TierBreakdown[]
  dominance: {
    topTier: string
    topTierEmoji: string
    retailVsWhale: 'whale_dominated' | 'retail_dominated' | 'balanced'
    whaleConcentration: number // % held by Whale+ tiers
    institutionalConcentration: number // % held by Institutional only
  }
  longVsShort: {
    longCount: number
    shortCount: number
    longNotional: number
    shortNotional: number
    ratio: number
  }
}

/**
 * Classify positions by tier for a given ticker
 */
export function classifyPositionsByTier(
  positions: any[],
  ticker: string,
  topWalletsLimit: number = 10
): TierClassificationResult {
  const tierStats = new Map<string, TierBreakdown>()
  
  // Temporary storage for wallet notionals (to sort later)
  const tierWallets = new Map<string, { 
    long: Map<string, number>, 
    short: Map<string, number> 
  }>()
  
  // Initialize all tiers
  for (const tier of TRADER_TIERS) {
    tierStats.set(tier.name, {
      tierName: tier.name,
      emoji: tier.emoji,
      long: { count: 0, notional: 0, topWallets: [] },
      short: { count: 0, notional: 0, topWallets: [] },
      total: { count: 0, notional: 0, percentage: 0 }
    })
    tierWallets.set(tier.name, { 
      long: new Map<string, number>(), 
      short: new Map<string, number>() 
    })
  }
  
  let totalNotional = 0
  let totalPositions = 0
  let longCount = 0
  let shortCount = 0
  let longNotional = 0
  let shortNotional = 0
  
  for (const pos of positions) {
    const notional = pos.notional_value || pos.notionalValue || 0
    const direction = (pos.direction || pos.side || '').toUpperCase()
    const address = pos.address || ''
    
    if (notional <= 0) continue
    
    totalNotional += notional
    totalPositions++
    
    const tier = getTierByNotional(notional)
    const tierData = tierStats.get(tier.name)!
    const walletData = tierWallets.get(tier.name)!
    
    if (direction === 'LONG') {
      tierData.long.count++
      tierData.long.notional += notional
      // Accumulate notional per wallet (in case same wallet has multiple positions)
      const currentNotional = walletData.long.get(address) || 0
      walletData.long.set(address, currentNotional + notional)
      longCount++
      longNotional += notional
    } else if (direction === 'SHORT') {
      tierData.short.count++
      tierData.short.notional += notional
      const currentNotional = walletData.short.get(address) || 0
      walletData.short.set(address, currentNotional + notional)
      shortCount++
      shortNotional += notional
    }
    
    tierData.total.count++
    tierData.total.notional += notional
  }
  
  // Sort wallets by notional and get top N for each tier
  for (const tier of TRADER_TIERS) {
    const tierData = tierStats.get(tier.name)!
    const walletData = tierWallets.get(tier.name)!
    
    // Sort long wallets by notional desc
    const sortedLongWallets: WalletNotional[] = Array.from(walletData.long.entries())
      .map(([address, notional]) => ({ address, notional }))
      .sort((a, b) => b.notional - a.notional)
      .slice(0, topWalletsLimit)
    
    // Sort short wallets by notional desc
    const sortedShortWallets: WalletNotional[] = Array.from(walletData.short.entries())
      .map(([address, notional]) => ({ address, notional }))
      .sort((a, b) => b.notional - a.notional)
      .slice(0, topWalletsLimit)
    
    tierData.long.topWallets = sortedLongWallets
    tierData.short.topWallets = sortedShortWallets
  }
  
  // Calculate percentages and find top tier
  let topTier = TRADER_TIERS[0]
  let topTierNotional = 0
  let whaleNotional = 0 // Whale + Mega Whale + Institutional
  let institutionalNotional = 0
  
  const breakdown: TierBreakdown[] = []
  
  for (const tier of TRADER_TIERS) {
    const tierData = tierStats.get(tier.name)!
    tierData.total.percentage = totalNotional > 0 
      ? (tierData.total.notional / totalNotional) * 100 
      : 0
    
    if (tierData.total.notional > topTierNotional) {
      topTierNotional = tierData.total.notional
      topTier = tier
    }
    
    // Whale+ concentration (Whale, Mega Whale, Institutional)
    if (['Whale', 'Mega Whale', 'Institutional'].includes(tier.name)) {
      whaleNotional += tierData.total.notional
    }
    
    // Institutional only
    if (tier.name === 'Institutional') {
      institutionalNotional = tierData.total.notional
    }
    
    breakdown.push(tierData)
  }
  
  const whaleConcentration = totalNotional > 0 
    ? (whaleNotional / totalNotional) * 100 
    : 0
  
  const institutionalConcentration = totalNotional > 0 
    ? (institutionalNotional / totalNotional) * 100 
    : 0
  
  // Determine retail vs whale dominance
  let retailVsWhale: 'whale_dominated' | 'retail_dominated' | 'balanced' = 'balanced'
  if (whaleConcentration > 60) {
    retailVsWhale = 'whale_dominated'
  } else if (whaleConcentration < 30) {
    retailVsWhale = 'retail_dominated'
  }
  
  return {
    ticker,
    timestamp: Date.now(),
    totalPositions,
    totalNotional,
    breakdown,
    dominance: {
      topTier: topTier.name,
      topTierEmoji: topTier.emoji,
      retailVsWhale,
      whaleConcentration,
      institutionalConcentration
    },
    longVsShort: {
      longCount,
      shortCount,
      longNotional,
      shortNotional,
      ratio: shortNotional > 0 ? longNotional / shortNotional : longNotional > 0 ? 999 : 1
    }
  }
}

/**
 * Tracked wallet with label and change detection
 */
export interface TrackedWallet {
  address: string
  label: string | null
  source: 'manual' | 'hyperscreener'
  tier: string
  tierEmoji: string
  accountValue: number
  totalNotional: number
  positions: PositionWithTier[]
  changes?: WalletChange[]
}

/**
 * Change detection for wallet positions
 */
export interface WalletChange {
  type: 'new_position' | 'closed_position' | 'size_increase' | 'size_decrease' | 'side_flip'
  symbol: string
  description: string
  timestamp: number
  oldValue?: any
  newValue?: any
}

/**
 * Compare previous and current positions to detect changes
 */
export function detectPositionChanges(
  previousPositions: any[],
  currentPositions: any[],
  address: string
): WalletChange[] {
  const changes: WalletChange[] = []
  const now = Date.now()
  
  const prevMap = new Map<string, any>()
  const currMap = new Map<string, any>()
  
  for (const pos of previousPositions) {
    const key = `${pos.symbol || pos.asset_name}-${pos.side || pos.direction}`
    prevMap.set(key, pos)
  }
  
  for (const pos of currentPositions) {
    const key = `${pos.symbol || pos.asset_name}-${pos.side || pos.direction}`
    currMap.set(key, pos)
  }
  
  // Check for new positions
  for (const [key, pos] of currMap) {
    const symbol = pos.symbol || pos.asset_name
    const side = pos.side || pos.direction
    const notional = pos.notional_value || pos.notionalValue || 0
    
    if (!prevMap.has(key)) {
      // Check if it's a side flip
      const oppositeSide = side === 'LONG' ? 'SHORT' : 'LONG'
      const oppositeKey = `${symbol}-${oppositeSide}`
      
      if (prevMap.has(oppositeKey)) {
        changes.push({
          type: 'side_flip',
          symbol,
          description: `Flipped from ${oppositeSide} to ${side} on ${symbol} ($${notional.toLocaleString()})`,
          timestamp: now,
          oldValue: prevMap.get(oppositeKey),
          newValue: pos
        })
      } else {
        changes.push({
          type: 'new_position',
          symbol,
          description: `Opened ${side} ${symbol} ($${notional.toLocaleString()})`,
          timestamp: now,
          newValue: pos
        })
      }
    } else {
      // Check for size changes
      const prevPos = prevMap.get(key)
      const prevNotional = prevPos.notional_value || prevPos.notionalValue || 0
      const change = notional - prevNotional
      const changePercent = prevNotional > 0 ? (change / prevNotional) * 100 : 0
      
      if (Math.abs(changePercent) > 10) { // Only report >10% changes
        if (change > 0) {
          changes.push({
            type: 'size_increase',
            symbol,
            description: `Increased ${side} ${symbol} by $${change.toLocaleString()} (+${changePercent.toFixed(1)}%)`,
            timestamp: now,
            oldValue: prevPos,
            newValue: pos
          })
        } else {
          changes.push({
            type: 'size_decrease',
            symbol,
            description: `Decreased ${side} ${symbol} by $${Math.abs(change).toLocaleString()} (${changePercent.toFixed(1)}%)`,
            timestamp: now,
            oldValue: prevPos,
            newValue: pos
          })
        }
      }
    }
  }
  
  // Check for closed positions
  for (const [key, pos] of prevMap) {
    if (!currMap.has(key)) {
      const symbol = pos.symbol || pos.asset_name
      const side = pos.side || pos.direction
      const notional = pos.notional_value || pos.notionalValue || 0
      
      // Check if it's not a side flip (already handled above)
      const oppositeSide = side === 'LONG' ? 'SHORT' : 'LONG'
      const oppositeKey = `${symbol}-${oppositeSide}`
      
      if (!currMap.has(oppositeKey)) {
        changes.push({
          type: 'closed_position',
          symbol,
          description: `Closed ${side} ${symbol} ($${notional.toLocaleString()})`,
          timestamp: now,
          oldValue: pos
        })
      }
    }
  }
  
  return changes
}
