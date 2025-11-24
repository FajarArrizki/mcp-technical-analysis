/**
 * TypeScript types for Signal Generation
 */

// Historical data types
export interface HistoricalDataPoint {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

// Technical indicators types
export interface BollingerBands {
  upper: number
  middle: number
  lower: number
}

export interface MACDResult {
  MACD: number
  signal: number
  histogram: number
}

export interface ADXResult {
  adx: number[]
  plusDI: number[]
  minusDI: number[]
}

export interface StochasticResult {
  k: number[]
  d: number[]
}

export interface AroonResult {
  up: number[]
  down: number[]
}

export interface FibonacciRetracement {
  level0: number
  level236: number
  level382: number
  level500: number
  level618: number
  level786: number
  level100: number
  level1272: number
  level1618: number
  level2000: number
  currentLevel: string | null
  distanceFromLevel: number | null
  isNearLevel: boolean
  nearestLevel: string | null
  nearestLevelPrice: number | null
  swingHigh: number
  swingLow: number
  range: number
  direction: 'uptrend' | 'downtrend' | 'neutral'
  strength: number
  signal: 'buy' | 'sell' | 'neutral' | null
}

export interface SupportResistance {
  support: number | null
  resistance: number | null
  pivotPoints: {
    pivot: number
    resistance1: number
    resistance2: number
    support1: number
    support2: number
  } | null
  fibonacciLevels: {
    level0: number
    level236: number
    level382: number
    level500: number
    level618: number
    level786: number
    level100: number
  } | null
  previousHighs: number[]
  previousLows: number[]
  swingHighs: Array<{ price: number; index: number }>
  swingLows: Array<{ price: number; index: number }>
}

// Market data types
export interface MarketRegime {
  regime: 'trending' | 'choppy' | 'neutral'
  volatility: 'high' | 'normal' | 'low'
  adx: number | null
  atrPercent: number | null
  regimeScore: number
}

export interface TrendAlignment {
  trend: 'uptrend' | 'downtrend' | 'neutral'
  strength: number
  reason: string
}

// Signal types
export interface Signal {
  coin: string
  signal: 'buy_to_enter' | 'sell_to_enter' | 'hold' | 'add' | 'reduce' | 'close_all'
  confidence: number
  expected_value?: number
  entry_price?: number
  entry_price_string?: string
  stop_loss?: number
  take_profit?: number
  profit_target?: number  // Alias for take_profit, used in some places
  leverage?: number
  margin_percentage?: number
  timeframe?: string
  contradictionScore?: number
  adjustedContradictionScore?: number
  originalContradictionScore?: number
  contradictions?: string[]
  hasContradictions?: boolean
  justification?: string
  invalidation?: string
  equal_allocation?: boolean
  capital_per_signal?: number
  risk_per_signal?: number
  risk_percent?: number
  quantity?: number  // Position quantity (used in position management)
  risk_usd?: number  // Risk amount in USD (used in filtering)
  bias?: string  // Trading bias (bullish/bearish)
  confidence_boost?: number  // Additional confidence boost
  confidence_boost_reason?: string  // Reason for confidence boost
  metadata?: Record<string, any>  // Additional metadata (futures scores, etc.)
}

// External data types
export interface ExternalData {
  hyperliquid?: {
    fundingRate: number
    openInterest: number
    premium?: number
    oraclePrice?: number
    markPrice?: number
    maxLeverage?: number
    fundingRateTrend?: string
    oiTrend?: string
  }
  orderBook?: {
    imbalance?: number
    [key: string]: any
  }
  volumeDelta?: {
    cvdTrend?: string
    [key: string]: any
  }
  marketStructure?: {
    coc?: {
      coc?: string
      [key: string]: any
    }
    [key: string]: any
  }
  blockchain?: {
    largeTransactions: any[]
    estimatedExchangeFlow: number
    whaleActivityScore: number
  }
  futures?: {
    fundingRate?: any
    openInterest?: any
    longShortRatio?: any
    liquidation?: any
    premiumIndex?: any
    btcCorrelation?: any
    whaleActivity?: any
    futuresScores?: any
  }
}

// Market data types
export interface MarketData {
  symbol: string
  price: number
  volume24h: number
  markPx: number
  maxLeverage?: number
  timestamp: number
  historicalData?: HistoricalDataPoint[]
  indicators?: any
  multiTimeframeData?: Record<string, HistoricalDataPoint[]>
  multiTimeframeIndicators?: Record<string, any>
  trendAlignment?: TrendAlignment
  externalData?: ExternalData
}

// Configuration types
export interface TradingConfig {
  mode: 'AUTONOMOUS' | 'SEMI_AUTONOMOUS' | 'MANUAL'
  capital?: number
  risk_per_trade?: number
  max_leverage?: number
  max_positions?: number
  thresholds: {
    confidence: {
      high: number
      medium: number
      low: number
      reject?: number
    }
    expectedValue?: {
      high: number
      medium: number
      low: number
      reject: number
    }
    expected_value?: number
  }
  positionSizing?: {
    highConfidence: number
    mediumConfidence: number
    lowConfidence: number
  }
  safety?: {
    maxRiskPerTrade: number
    maxOpenPositions: number
    dailyLossLimit: number
    consecutiveLosses: number
  }
  limitedPairsMode?: {
    enabled: boolean
    correlationThreshold: number
    allowOversoldPlays?: boolean
    relaxThresholds?: boolean
  }
}

// Cycle Configuration Types
export interface CycleConfig {
  intervalMs: number
  mode: 'TEST' | 'LIVE'
  topNAssets: number
  enabledExitConditions: {
    stopLoss: boolean
    takeProfit: boolean
    trailingStop: boolean
    signalReversal: boolean
    rankingDrop: boolean
    indicatorBased: boolean
  }
}

// Position State Types (Extended from Position)
// Note: Position is defined in position-management/positions.ts
// This interface extends it with monitoring and exit management fields
export interface PositionState {
  symbol: string
  coin?: string
  quantity: number
  entryPrice: number
  entry_price?: number
  currentPrice: number
  current_price?: number
  leverage: number
  unrealizedPnl: number
  unrealized_pnl?: number
  unrealizedPnlPct: number
  side: 'LONG' | 'SHORT'
  entryTime: number
  entry_time?: number
  rMultiple?: number
  stopLoss?: number
  takeProfit?: number
  trailingStop?: number
  trailingStopActive?: boolean
  highestPrice?: number
  lowestPrice?: number
  liquidationDistance?: number
  exitConditions?: ExitCondition[]
  rankingHistory?: number[]
  lastRankingCheck?: number
}

// Exit Condition Types
export type ExitReason = 
  | 'EMERGENCY'
  | 'STOP_LOSS'
  | 'TAKE_PROFIT'
  | 'TRAILING_STOP'
  | 'SIGNAL_REVERSAL'
  | 'RANKING_DROP'
  | 'INDICATOR_BASED'
  | 'MANUAL_CLOSE'
  | 'MANUAL_CLOSE_DETECTED'

export interface ExitCondition {
  reason: ExitReason
  priority: number
  shouldExit: boolean
  exitSize: number // Percentage of position to close (0-100)
  exitPrice?: number
  metadata?: Record<string, any>
  timestamp: number
  description: string
}

// Trade Record Types
export interface TradeRecord {
  id: string
  symbol: string
  side: 'LONG' | 'SHORT'
  entryPrice: number
  exitPrice: number
  quantity: number
  leverage: number
  entryTime: number
  exitTime: number
  holdingTimeMinutes: number
  pnl: number
  pnlPct: number
  rMultiple: number
  exitReason: ExitReason
  exitReasonDetails?: string
  maxAdverseExcursion?: number
  maxFavorableExcursion?: number
  didHitStopLoss: boolean
  didHitTakeProfit: boolean
  numExitConditionsTriggered: number
  cycleId?: string
}

// Performance Metrics Types
export interface PerformanceMetrics {
  totalTrades: number
  winningTrades: number
  losingTrades: number
  winRate: number
  totalReturnPct: number
  totalReturnUsd: number
  averageReturnPct: number
  averageRMultiple: number
  maxSingleTradeLoss: number
  maxDrawdownPct: number
  sharpeRatio: number
  bestTrade?: TradeRecord
  worstTrade?: TradeRecord
  tradesPerAsset: Record<string, {
    totalTrades: number
    winRate: number
    averageRMultiple: number
    totalReturnPct: number
  }>
  equityCurve: Array<{
    timestamp: number
    equity: number
    peak: number
    drawdownPct: number
  }>
  consecutiveWins: number
  consecutiveLosses: number
  averageHoldingTimeMinutes: number
  rollingStats?: {
    last30Days: {
      winRate: number
      totalReturnPct: number
      trades: number
    }
  }
}

// AI Feedback Data Types
export interface AIFeedbackFeatures {
  marketConditions: 'trending' | 'ranging' | 'volatile' | 'choppy' | 'neutral'
  entryIndicators: {
    rsi14?: number
    macdHistogram?: number
    ema20Trend?: 'bullish' | 'bearish' | 'neutral'
    atrPct?: number
    volumeChangePct?: number
    bbPosition?: 'upper' | 'middle' | 'lower'
    [key: string]: any
  }
  volatilityAtEntry: number
  volumeProfile: 'high' | 'low' | 'normal'
  timeOfDay: 'asia' | 'europe' | 'us' | 'other'
  marketRegime: 'trending' | 'choppy' | 'neutral'
  trendAlignmentScore?: number
  assetRanking: number
  correlationMatrix?: Record<string, number>
}

export interface AIFeedbackPrediction {
  direction: 'LONG' | 'SHORT' | 'NEUTRAL'
  confidence: number
  expectedReturn: number
  entryPrice: number
  stopLoss: number
  takeProfit: number
}

export interface AIFeedbackOutcome {
  pnlPct: number
  pnlUsd: number
  exitReason: ExitReason
  exitPrice: number
  holdingTimeMinutes: number
  maxAdverseExcursion: number
  maxFavorableExcursion: number
  rMultiple: number
  didHitStopLoss: boolean
  didHitTakeProfit: boolean
  numExitConditionsTriggered: number
}

export interface AIFeedbackData {
  features: AIFeedbackFeatures
  prediction: AIFeedbackPrediction
  actualOutcome: AIFeedbackOutcome
  timestamp: number
  cycleId: string
  asset: string
}

// Circuit Breaker Types
export type CircuitBreakerStatus = 'NORMAL' | 'PAUSED' | 'STOPPED'

export interface CircuitBreakerState {
  status: CircuitBreakerStatus
  reason?: string
  activatedAt?: number
  dailyPnL: number
  consecutiveLosses: number
  apiErrorRate: number
  marginLevel?: number
}

// Position Sizing Types
export type PositionSizingStrategy = 
  | 'equal'
  | 'confidence_weighted'
  | 'ranking_weighted'
  | 'risk_parity'
  | 'kelly'

export interface PositionSizeResult {
  sizeUsd: number
  quantity: number
  strategy: PositionSizingStrategy
  reasoning: string
  constraints: {
    maxSizePct: number
    reserveCapitalPct: number
    applied: boolean
  }
}

// Order Execution Types
export type OrderType = 'MARKET' | 'LIMIT'
export type OrderStatus = 'PENDING' | 'FILLED' | 'PARTIAL_FILLED' | 'REJECTED' | 'CANCELLED' | 'TIMEOUT'

export interface Order {
  id: string
  symbol: string
  side: 'LONG' | 'SHORT' | 'CLOSE'
  type: OrderType
  quantity: number
  price?: number
  status: OrderStatus
  filledQuantity?: number
  filledPrice?: number
  submittedAt: number
  filledAt?: number
  leverage?: number // Leverage used for this order (default 10x)
  rejectedReason?: string
  stopLoss?: number
  takeProfit?: number
  metadata?: Record<string, any>
}

// Position Sync Types
export interface PositionSyncResult {
  manualCloses: Array<{
    symbol: string
    detectedAt: number
    lastKnownPrice: number
    reason: 'MANUAL_CLOSE_DETECTED'
  }>
  manualOpens: Array<{
    symbol: string
    detectedAt: number
    size: number
    price: number
    side: 'LONG' | 'SHORT'
  }>
  sizeMismatches: Array<{
    symbol: string
    trackedSize: number
    actualSize: number
    difference: number
  }>
  reconciled: boolean
  timestamp: number
}

// Cycle State Types
export interface CycleState {
  cycleId: string
  startTime: number
  endTime?: number
  status: 'RUNNING' | 'PAUSED' | 'STOPPED' | 'COMPLETED'
  currentStep?: string
  positions: Map<string, PositionState>
  trades: TradeRecord[]
  performance: PerformanceMetrics
  circuitBreaker: CircuitBreakerState
  lastRankingTime: number
  topNAssets: number
  config: CycleConfig
}

