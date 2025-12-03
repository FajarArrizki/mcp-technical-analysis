/**
 * Formatters for Position Setup Calculations
 * Extracted from index.ts for better modularity
 */

/**
 * Format position setup calculations (quantity, margin, capital allocation)
 */
export function formatPositionSetup(
  ticker: string,
  entryPrice: number,
  side: 'LONG' | 'SHORT',
  positionSizeUsd: number,
  leverage: number,
  marginPercent: number,
  capital: number,
  riskPct: number
) {
  const quantity = positionSizeUsd / entryPrice
  const marginUsed = positionSizeUsd / leverage
  const positionValue = entryPrice * quantity
  const capitalAllocated = positionSizeUsd

  return {
    ticker,
    entryPrice,
    side,
    positionSizeUsd,
    quantity,
    leverage,
    marginPercent,
    marginUsed,
    positionValue,
    capital,
    capitalAllocated,
    capitalAllocatedPct: capital > 0 ? (capitalAllocated / capital) * 100 : 0,
    riskPct,
  }
}
