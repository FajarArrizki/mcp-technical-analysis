/**
 * Technical Indicators Tools
 * All tools related to technical analysis indicators
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

/**
 * Register all indicator tools
 */
export function registerIndicatorTools(server: any) {
  registerMovingAveragesTool(server)
  registerOscillatorsTool(server)
  registerVolumeIndicatorsTool(server)
  registerVolatilityIndicatorsTool(server)
  registerChannelsTool(server)
  registerPivotPointsTool(server)
  registerTrendIndicatorsTool(server)
  registerPatternsTool(server)
  registerStrengthIndicatorsTool(server)
}

// Export individual registration functions
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
}
