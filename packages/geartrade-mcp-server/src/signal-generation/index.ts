/**
 * Signal Generation - Main Export
 * This is the main entry point for the modularized signal generation system
 * Using explicit exports to avoid duplicate export conflicts
 */

// Core types - Export first
export type {
  HistoricalDataPoint,
  BollingerBands,
  Signal,
  ExternalData,
  TradingConfig
} from './types'

// Technical Indicators - Export aggregator type and functions explicitly
export type { TechnicalIndicators } from './technical-indicators/aggregator'
export { calculateTechnicalIndicators } from './technical-indicators/aggregator'
export * from './technical-indicators/moving-averages'
export * from './technical-indicators/momentum'
export * from './technical-indicators/volatility'
export * from './technical-indicators/volume'
export * from './technical-indicators/trend'
export * from './technical-indicators/fibonacci'

// Analysis - Export functions explicitly to avoid type conflicts
export * from './analysis/trend-detection'
export * from './analysis/divergence'
export * from './analysis/candlestick'
export * from './analysis/market-regime'
// Export contradiction functions with explicit names to avoid conflicts
export { detectContradictions as detectContradictionsBasic } from './analysis/contradiction'
export type { ContradictionResult } from './analysis/contradiction'
export * from './analysis/correlation'
export * from './analysis/bounce'
export * from './analysis/enhanced-metrics'
export * from './analysis/orderbook'
export * from './analysis/volume-profile'
export * from './analysis/market-structure'
export * from './analysis/volume-delta'
export * from './analysis/volume-analysis'
export * from './analysis/indicator-quality'
export * from './analysis/quality-weighted-justification'
// Export indicator-weights detectContradictions with explicit name
export { detectContradictions } from './analysis/indicator-weights'
export { calculateConflictSeverity, ConflictSeverity } from './analysis/indicator-weights'

// Data Fetchers
export * from './data-fetchers'
export { getRealTimePrice } from './data-fetchers/hyperliquid'

// Risk Management - Export functions explicitly
export * from './risk-management/leverage'
export * from './risk-management/margin'
// Export Position type explicitly to avoid conflicts
export type { Position as PositionRisk } from './risk-management/mae'
export { calculateMAE } from './risk-management/mae'
export * from './risk-management/take-profit'
export * from './risk-management/bounce'

// Utils - Export functions explicitly
export * from './utils/logger'
export * from './utils/interpolation'
export * from './utils/cache'
// Export TrendAlignment type explicitly to avoid conflicts
export type { TrendAlignment as TrendAlignmentUtil } from './utils/multi-timeframe'
export { checkTrendAlignment, calculateMultiTimeframeIndicators } from './utils/multi-timeframe'
export * from './utils/data-parsing'
export * from './utils/trend-strength'
export * from './utils/trading-style'

// Formatting
export * from './formatting'
export { formatSignal } from './formatting/format-signal'

// Signal Generation
export * from './signal-generation'
export { generateSignalForSingleAsset } from './signal-generation/generate-single-asset'

// Execution and Cycle Management - Removed

// Validation
export * from './validation'

// Position Management - Export functions explicitly
// Export Position type explicitly to avoid conflicts
export type { Position as PositionManagement } from './position-management/positions'
export { getActivePositions, updateActivePositions, activePositions } from './position-management/positions'
export * from './position-management/warnings'

// Config
export * from './config'
