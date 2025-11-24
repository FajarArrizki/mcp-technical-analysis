/**
 * Validation - Main Export
 */

export * from './invalidation'
export * from './red-flags'
export * from './consistency'
// Export falling-knife functions explicitly to avoid TechnicalIndicators conflict
export { isCatchingFallingKnife } from './falling-knife'
export type { TechnicalIndicators as FallingKnifeTechnicalIndicators } from './falling-knife'
// Export reversal functions explicitly to avoid TechnicalIndicators conflict
export { hasReversalConfirmations, getReversalConfirmationCount } from './reversal'
export type { TechnicalIndicators as ReversalTechnicalIndicators } from './reversal'
export * from './helpers'

