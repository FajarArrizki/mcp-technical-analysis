/**
 * Tools Index - Main entry point for all tools
 * 
 * Organized by category:
 * - indicators/  : Technical analysis indicators (MA, oscillators, volume, volatility, channels, pivots, trends, patterns, strength)
 * - trading/     : Trading execution (futures testnet/mainnet, spot trading, close position, risk management)
 * - account/     : Account management (memory, balance, transfers, bridge)
 * - analysis/    : Market analysis (sentiment, market data, technical analysis, patterns, whale tracking)
 * - data/        : Data fetching (prices, positions, correlations)
 */

// Import category registration functions
import { registerIndicatorTools } from './indicators'
import { registerTradingTools } from './trading'
import { registerAccountTools } from './account'
import { registerAnalysisTools } from './analysis'
import { registerAllDataTools } from './data'

/**
 * Register all tools across all categories
 */
export function registerAllMergedTools(server: any) {
  registerIndicatorTools(server)  // 9 indicator tools
  registerTradingTools(server)     // 6 trading tools (4 + 2 risk management)
  registerAccountTools(server)     // 3 account tools
  registerAnalysisTools(server)    // 15 analysis tools (1 + 14 new)
  registerAllDataTools(server)     // 3 data tools
}

// Re-export category registration functions
export { registerIndicatorTools } from './indicators'
export { registerTradingTools } from './trading'
export { registerAccountTools } from './account'
export { registerAnalysisTools } from './analysis'
export { registerAllDataTools } from './data'

// Re-export individual tool registration functions for backward compatibility
export {
  registerMovingAveragesTool,
  registerOscillatorsTool,
  registerVolumeIndicatorsTool,
  registerVolatilityIndicatorsTool,
  registerChannelsTool,
  registerPivotPointsTool,
  registerTrendIndicatorsTool,
  registerPatternsTool,
  registerStrengthIndicatorsTool
} from './indicators'

export {
  registerTestnetFuturesTradeTool,
  registerMainnetFuturesTradeTool,
  registerSpotTradingTools,
  registerClosePositionTool
} from './trading'

export {
  registerMemoryTools,
  registerHyperliquidAccountOperations,
  registerHyperliquidBridgeOperations
} from './account'

export {
  registerMarketSentimentTool
} from './analysis'
