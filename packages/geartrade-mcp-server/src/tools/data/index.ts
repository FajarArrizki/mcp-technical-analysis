/**
 * Data Tools
 * Tools for fetching prices, positions, and market correlations
 */

import { registerDataTools } from './price-position-tools'

/**
 * Register all data tools
 */
export function registerAllDataTools(server: any) {
  registerDataTools(server)
}

// Export individual registration functions
export { registerDataTools }
