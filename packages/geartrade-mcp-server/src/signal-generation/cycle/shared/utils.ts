/**
 * Cycle Utilities
 * Helper functions for cycle management
 */

/**
 * Generate cycle ID
 */
export function generateCycleId(): string {
  return `cycle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}
