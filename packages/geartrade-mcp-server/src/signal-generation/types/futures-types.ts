/**
 * Futures Trading Types
 * Types for futures-specific data and analysis
 */

// Funding Rate Types
export interface FundingRateData {
  current: number // Current funding rate (% per 8h period)
  rate24h: number // 24h average funding rate
  rate7d: number // 7d average funding rate
  trend: 'rising' | 'falling' | 'neutral'
  momentum: number // Rate of change (3h, 8h, 24h)
  extreme: boolean // True if >0.1% or <-0.1%
  lastUpdate: number // Timestamp
}

// Open Interest Types
export interface OpenInterestData {
  current: number // Current OI (USD value)
  change24h: number // 24h change in OI (%)
  change24hValue: number // 24h change in OI (USD)
  trend: 'rising' | 'falling' | 'neutral'
  momentum: number // OI momentum score
  concentration: number // OI concentration (0-1, higher = more concentrated)
  lastUpdate: number
}

// Long/Short Ratio Types
export interface LongShortRatioData {
  longPct: number // Percentage of longs (0-100)
  shortPct: number // Percentage of shorts (0-100)
  retailLongPct: number // Retail trader long %
  retailShortPct: number // Retail trader short %
  proLongPct: number // Pro trader long %
  proShortPct: number // Pro trader short %
  extreme: boolean // True if >70% or <30%
  sentiment: 'extreme_long' | 'extreme_short' | 'balanced'
  lastUpdate: number
}

// Liquidation Types
export interface LiquidationCluster {
  price: number // Cluster price level
  size: number // Estimated liquidation size (USD)
  side: 'long' | 'short'
  confidence: number // Cluster confidence (0-1)
}

export interface LiquidationData {
  longLiquidations24h: number // Long liquidations in last 24h (USD)
  shortLiquidations24h: number // Short liquidations in last 24h (USD)
  clusters: LiquidationCluster[] // Price clusters with high liquidation density
  nearbyLongClusters: LiquidationCluster[] // Long clusters near current price
  nearbyShortClusters: LiquidationCluster[] // Short clusters near current price
  safeEntryZones: Array<{ priceLow: number; priceHigh: number }> // Zones with low liquidation density
  liquidationDistance: number // Distance to nearest liquidation cluster (%)
  lastUpdate: number
}

// Premium Index Types (Spot-Futures Divergence)
export interface PremiumIndexData {
  premiumPct: number // Premium index (% above/below spot)
  premium24h: number // 24h average premium
  premium7d: number // 7d average premium
  trend: 'rising' | 'falling' | 'neutral'
  divergence: number // Divergence from spot (standard deviations)
  arbitrageOpportunity: boolean // True if arbitrage opportunity exists
  lastUpdate: number
}

// BTC Correlation Types
export interface BTCCorrelationData {
  correlation24h: number // 24h rolling correlation (-1 to 1)
  correlation7d: number // 7d rolling correlation
  correlation30d: number // 30d rolling correlation
  strength: 'strong' | 'moderate' | 'weak'
  impactMultiplier: number // Expected impact multiplier (if BTC moves 1%, asset moves X%)
  lastUpdate: number
}

export interface BTCDominanceData {
  current: number // Current BTC dominance (%)
  change24h: number // 24h change
  trend: 'rising' | 'falling' | 'neutral'
  lastUpdate: number
}

// Whale Detection Types
export interface WhaleOrder {
  price: number
  size: number // Order size (USD)
  side: 'buy' | 'sell'
  timestamp: number
  isActive: boolean
}

export interface WhaleActivity {
  largeOrders: WhaleOrder[] // Orders >$100k
  spoofingDetected: boolean // True if spoofing patterns detected
  washTradingDetected: boolean // True if wash trading detected
  accumulationZones: Array<{ priceLow: number; priceHigh: number }> // Whale accumulation zones
  distributionZones: Array<{ priceLow: number; priceHigh: number }> // Whale distribution zones
  smartMoneyFlow: number // Smart money flow score (-1 to 1, positive = accumulation)
  lastUpdate: number
}

// Futures Market Data (Aggregated)
export interface FuturesMarketData {
  asset: string
  price: number
  fundingRate: FundingRateData
  openInterest: OpenInterestData
  longShortRatio: LongShortRatioData
  liquidation: LiquidationData
  premiumIndex?: PremiumIndexData
  btcCorrelation?: BTCCorrelationData
  whaleActivity?: WhaleActivity
  timestamp: number
}

// Futures Signal Scores
export interface FuturesSignalScores {
  fundingRateScore: number // 0-20 points
  openInterestScore: number // 0-20 points
  liquidationZoneScore: number // 0-15 points
  longShortRatioScore: number // 0-15 points
  btcCorrelationScore: number // 0-15 points
  whaleActivityScore: number // 0-15 points
  totalScore: number // 0-100 points
  confidence: number // Total score as % (0-1)
  strengths: string[]
  weaknesses: string[]
}

// Multi-Timeframe Futures Analysis
export interface MultiTimeframeFuturesAnalysis {
  timeframe: '5m' | '15m' | '1h' | '4h' | '1d'
  fundingRate: FundingRateData
  openInterest: OpenInterestData
  trend: 'bullish' | 'bearish' | 'neutral'
  alignmentScore: number // 0-100, how well aligned with other timeframes
  signal: 'long' | 'short' | 'neutral'
}

// Anti-Liquidation Position Sizing
export interface LiquidationPriceCalculation {
  entryPrice: number
  leverage: number
  side: 'LONG' | 'SHORT'
  liquidationPrice: number
  liquidationDistance: number // Distance in %
  safeDistance: number // Safe distance (should be >30%)
  marginBuffer: number // Margin buffer (%)
}

export interface SafePositionSize {
  maxSizeUsd: number
  recommendedSizeUsd: number
  recommendedLeverage: number
  liquidationDistance: number
  marginBuffer: number
  riskLevel: 'low' | 'medium' | 'high' | 'extreme'
  reasoning: string
}

