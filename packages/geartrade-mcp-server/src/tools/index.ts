/**
 * Tools index - exports all merged tools registration functions
 */

import { registerMovingAveragesTool } from './moving-averages'
import { registerOscillatorsTool } from './oscillators'
import { registerVolumeIndicatorsTool } from './volume-indicators'
import { registerVolatilityIndicatorsTool } from './volatility-indicators'
import { registerChannelsTool } from './channels'
import { registerPivotPointsTool } from './pivot-points'
import { registerTrendIndicatorsTool } from './trend-indicators'
import { registerPatternsTool } from './patterns'
import { registerStrengthIndicatorsTool } from './strength-indicators'
import { registerTestnetFuturesTradeTool } from './hyperliquid-testnet-futures-trade'
import { registerMainnetFuturesTradeTool } from './hyperliquid-mainnet-futures-trade'
import { registerMemoryTools } from './memory-tools'
import { registerClosePositionTool } from './close-position'
import { registerMarketSentimentTool } from './market-sentiment'
import { registerHyperliquidAccountOperations } from './hyperliquid-account-operations'
import { registerSpotTradingTools } from './spot-trading'
import { registerHyperliquidBridgeOperations } from './hyperliquid-bridge-operations'

export function registerAllMergedTools(server: any) {
  registerMovingAveragesTool(server)
  registerOscillatorsTool(server)
  registerVolumeIndicatorsTool(server)
  registerVolatilityIndicatorsTool(server)
  registerChannelsTool(server)
  registerPivotPointsTool(server)
  registerTrendIndicatorsTool(server)
  registerPatternsTool(server)
  registerStrengthIndicatorsTool(server)
  registerTestnetFuturesTradeTool(server)
  registerMainnetFuturesTradeTool(server)
  registerMemoryTools(server)
  registerClosePositionTool(server)
  registerMarketSentimentTool(server)
  registerHyperliquidAccountOperations(server)  // Merged: balance + transfer operations (6 ops)
  registerSpotTradingTools(server)               // Spot trading (separate due to complexity)
  registerHyperliquidBridgeOperations(server)    // Bridge operations: withdraw/deposit L1 (2 ops)
}

export { registerMovingAveragesTool }
export { registerOscillatorsTool }
export { registerVolumeIndicatorsTool }
export { registerVolatilityIndicatorsTool }
export { registerChannelsTool }
export { registerPivotPointsTool }
export { registerTrendIndicatorsTool }
export { registerPatternsTool }
export { registerStrengthIndicatorsTool }
export { registerTestnetFuturesTradeTool }
export { registerMainnetFuturesTradeTool }
export { registerMemoryTools }
export { registerClosePositionTool }
export { registerMarketSentimentTool }
export { registerHyperliquidAccountOperations }
export { registerSpotTradingTools }
export { registerHyperliquidBridgeOperations }
