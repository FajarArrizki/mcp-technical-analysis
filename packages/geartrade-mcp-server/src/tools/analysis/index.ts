/**
 * Market Analysis Tools
 * All tools related to market analysis, patterns, and whale tracking
 */

import { registerMarketSentimentTool } from './market-sentiment'
import { registerMarketDataTools } from './market-data-tools'
import { registerTechnicalAnalysisTools } from './technical-analysis-tools'
import { registerPatternAnalysisTools } from './pattern-analysis-tools'
import { registerWhaleAnalysisTools } from './whale-analysis-tools'

/**
 * Register all market analysis tools
 */
export function registerAnalysisTools(server: any) {
  registerMarketSentimentTool(server)
  registerMarketDataTools(server)
  registerTechnicalAnalysisTools(server)
  registerPatternAnalysisTools(server)
  registerWhaleAnalysisTools(server)
}

// Export individual registration functions
export {
  registerMarketSentimentTool,
  registerMarketDataTools,
  registerTechnicalAnalysisTools,
  registerPatternAnalysisTools,
  registerWhaleAnalysisTools
}
