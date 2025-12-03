/**
 * Trading Tools
 * All tools related to executing trades, managing positions, and risk management
 */

import { registerTestnetFuturesTradeTool } from './hyperliquid-testnet-futures-trade'
import { registerMainnetFuturesTradeTool } from './hyperliquid-mainnet-futures-trade'
import { registerSpotTradingTools } from './spot-trading'
import { registerClosePositionTool } from './close-position'
import { registerTradingRiskTools } from './risk-management-tools'

/**
 * Register all trading tools
 */
export function registerTradingTools(server: any) {
  registerTestnetFuturesTradeTool(server)
  registerMainnetFuturesTradeTool(server)
  registerSpotTradingTools(server)
  registerClosePositionTool(server)
  registerTradingRiskTools(server)
}

// Export individual registration functions
export {
  registerTestnetFuturesTradeTool,
  registerMainnetFuturesTradeTool,
  registerSpotTradingTools,
  registerClosePositionTool,
  registerTradingRiskTools
}
