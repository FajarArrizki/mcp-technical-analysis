/**
 * Formatters for Fibonacci Retracement Data
 * Extracted from index.ts for better modularity
 */

import type { FibonacciRetracement } from '../signal-generation/technical-indicators/fibonacci'

/**
 * Format Fibonacci retracement data
 */
export function formatFibonacci(fibonacci: FibonacciRetracement | null) {
  if (!fibonacci) return null

  return {
    levels: {
      level0: fibonacci.level0,
      level236: fibonacci.level236,
      level382: fibonacci.level382,
      level500: fibonacci.level500,
      level618: fibonacci.level618,
      level786: fibonacci.level786,
      level100: fibonacci.level100,
      level1272: fibonacci.level1272,
      level1618: fibonacci.level1618,
      level2000: fibonacci.level2000,
    },
    currentLevel: fibonacci.currentLevel,
    distanceFromLevel: fibonacci.distanceFromLevel,
    isNearLevel: fibonacci.isNearLevel,
    nearestLevel: fibonacci.nearestLevel,
    nearestLevelPrice: fibonacci.nearestLevelPrice,
    swingHigh: fibonacci.swingHigh,
    swingLow: fibonacci.swingLow,
    range: fibonacci.range,
    direction: fibonacci.direction,
    strength: fibonacci.strength,
    signal: fibonacci.signal,
  }
}
