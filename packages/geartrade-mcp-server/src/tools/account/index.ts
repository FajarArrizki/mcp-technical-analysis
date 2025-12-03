/**
 * Account Management Tools
 * All tools related to account operations, memory, and transfers
 */

import { registerMemoryTools } from './memory-tools'
import { registerHyperliquidAccountOperations } from './hyperliquid-account-operations'
import { registerHyperliquidBridgeOperations } from './hyperliquid-bridge-operations'

/**
 * Register all account management tools
 */
export function registerAccountTools(server: any) {
  registerMemoryTools(server)
  registerHyperliquidAccountOperations(server)
  registerHyperliquidBridgeOperations(server)
}

// Export individual registration functions
export {
  registerMemoryTools,
  registerHyperliquidAccountOperations,
  registerHyperliquidBridgeOperations
}
