/**
 * Position Synchronization
 * Sync tracked positions with actual Hyperliquid positions (detect manual closes/opens)
 */

import { PositionState, PositionSyncResult, ExitReason } from '../../types'
import { Position } from '../../position-management/positions'
import { getUserState } from '../../data-fetchers/hyperliquid'
import { getHyperliquidAccountAddress } from '../../config'

export interface PositionSyncConfig {
  enabled: boolean
  importManualOpens: boolean // Import manually opened positions (default: false)
}

/**
 * Sync tracked positions with actual Hyperliquid positions
 * Detect manual closes, manual opens, and size mismatches
 */
export async function syncPositionsWithHyperliquid(
  trackedPositions: Map<string, PositionState>,
  accountAddress: string | null = null,
  config: PositionSyncConfig
): Promise<PositionSyncResult> {
  if (!config.enabled) {
    return {
      manualCloses: [],
      manualOpens: [],
      sizeMismatches: [],
      reconciled: false,
      timestamp: Date.now()
    }
  }

  const address = accountAddress || getHyperliquidAccountAddress()
  if (!address) {
    // No account address, can't sync
    return {
      manualCloses: [],
      manualOpens: [],
      sizeMismatches: [],
      reconciled: false,
      timestamp: Date.now()
    }
  }

  try {
    // Fetch actual positions from Hyperliquid
    const userState = await getUserState(address, 3, 1000)
    const actualPositions = extractPositionsFromUserState(userState)

    return detectPositionDiscrepancies(trackedPositions, actualPositions, config)
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`Failed to sync positions with Hyperliquid: ${errorMsg}`)
    return {
      manualCloses: [],
      manualOpens: [],
      sizeMismatches: [],
      reconciled: false,
      timestamp: Date.now()
    }
  }
}

/**
 * Extract positions from Hyperliquid userState response
 */
export function extractPositionsFromUserState(userState: any): Map<string, Position> {
  const positions = new Map<string, Position>()

  if (!userState || !userState.data) {
    return positions
  }

  const stateData = userState.data || (userState.marginSummary || userState.crossMarginSummary ? userState : null)
  if (!stateData) {
    return positions
  }

  const assetPositions = stateData.assetPositions || []
  if (!Array.isArray(assetPositions)) {
    return positions
  }

  for (const pos of assetPositions) {
    if (!pos || !pos.position) continue

    const position = pos.position
    const coin = position.coin || ''
    if (!coin) continue

    const szi = parseFloat(position.szi || '0')
    if (Math.abs(szi) < 0.0001) continue // Skip zero positions

    const entryPx = parseFloat(position.entryPx || '0')
    const unrealizedPnl = parseFloat(position.unrealizedPnl || '0')

    let leverage = 1
    if (position.leverage) {
      if (typeof position.leverage === 'object' && position.leverage.value) {
        leverage = parseFloat(position.leverage.value || '1')
      } else {
        leverage = parseFloat(position.leverage || '1')
      }
    }

    positions.set(coin, {
      symbol: coin,
      coin,
      quantity: Math.abs(szi),
      entryPrice: entryPx,
      currentPrice: entryPx, // Will be updated later
      leverage,
      unrealizedPnl,
      side: szi > 0 ? 'LONG' : 'SHORT',
      entryTime: Date.now() // Hyperliquid doesn't provide entry time
    })
  }

  return positions
}

/**
 * Detect discrepancies between tracked and actual positions
 */
function detectPositionDiscrepancies(
  trackedPositions: Map<string, PositionState>,
  actualPositions: Map<string, Position>,
  config: PositionSyncConfig
): PositionSyncResult {
  const manualCloses: PositionSyncResult['manualCloses'] = []
  const manualOpens: PositionSyncResult['manualOpens'] = []
  const sizeMismatches: PositionSyncResult['sizeMismatches'] = []

  const detectedAt = Date.now()

  // Check tracked positions
  for (const [symbol, trackedPos] of trackedPositions.entries()) {
    const actualPos = actualPositions.get(symbol)

    if (!actualPos) {
      // Position exists in tracking but not in Hyperliquid → Manual close detected
      manualCloses.push({
        symbol,
        detectedAt,
        lastKnownPrice: trackedPos.currentPrice || trackedPos.entryPrice,
        reason: 'MANUAL_CLOSE_DETECTED'
      })
    } else {
      // Position exists in both, check size mismatch
      const trackedSize = Math.abs(trackedPos.quantity)
      const actualSize = Math.abs(actualPos.quantity)
      const difference = Math.abs(trackedSize - actualSize)

      // If size differs significantly (>1%), it's a partial manual close
      if (difference > Math.max(0.001, trackedSize * 0.01)) {
        sizeMismatches.push({
          symbol,
          trackedSize,
          actualSize,
          difference
        })
      }
    }
  }

  // Check actual positions (for manual opens)
  if (config.importManualOpens) {
    for (const [symbol, actualPos] of actualPositions.entries()) {
      const trackedPos = trackedPositions.get(symbol)

      if (!trackedPos) {
        // Position exists in Hyperliquid but not in tracking → Manual open detected
        manualOpens.push({
          symbol,
          detectedAt,
          size: actualPos.quantity,
          price: actualPos.entryPrice,
          side: actualPos.side
        })
      }
    }
  }

  return {
    manualCloses,
    manualOpens,
    sizeMismatches,
    reconciled: true,
    timestamp: detectedAt
  }
}

/**
 * Reconcile position state (update tracked positions to match actual)
 */
export function reconcilePositionState(
  trackedPositions: Map<string, PositionState>,
  syncResult: PositionSyncResult
): {
  updatedPositions: Map<string, PositionState>
  closedPositions: Array<{ symbol: string; reason: ExitReason; exitPrice: number }>
  openedPositions: PositionState[]
} {
  const updatedPositions = new Map(trackedPositions)
  const closedPositions: Array<{ symbol: string; reason: ExitReason; exitPrice: number }> = []
  const openedPositions: PositionState[] = []

  // Handle manual closes
  for (const manualClose of syncResult.manualCloses) {
    const position = updatedPositions.get(manualClose.symbol)
    if (position) {
      updatedPositions.delete(manualClose.symbol)
      closedPositions.push({
        symbol: manualClose.symbol,
        reason: 'MANUAL_CLOSE_DETECTED',
        exitPrice: manualClose.lastKnownPrice
      })
    }
  }

  // Handle size mismatches (partial manual closes)
  for (const mismatch of syncResult.sizeMismatches) {
    const position = updatedPositions.get(mismatch.symbol)
    if (position) {
      // Update quantity to match actual
      const newQuantity = mismatch.actualSize
      const sideMultiplier = position.side === 'LONG' ? 1 : -1

      if (newQuantity < 0.001) {
        // Position fully closed
        updatedPositions.delete(mismatch.symbol)
        closedPositions.push({
          symbol: mismatch.symbol,
          reason: 'MANUAL_CLOSE_DETECTED',
          exitPrice: position.currentPrice || position.entryPrice
        })
      } else {
        // Partial close - update quantity
        updatedPositions.set(mismatch.symbol, {
          ...position,
          quantity: newQuantity * sideMultiplier
        })
      }
    }
  }

  // Handle manual opens (if import enabled)
  for (const manualOpen of syncResult.manualOpens) {
    const sideMultiplier = manualOpen.side === 'LONG' ? 1 : -1
    const newPosition: PositionState = {
      symbol: manualOpen.symbol,
      coin: manualOpen.symbol,
      quantity: manualOpen.size * sideMultiplier,
      entryPrice: manualOpen.price,
      entry_price: manualOpen.price,
      currentPrice: manualOpen.price,
      current_price: manualOpen.price,
      leverage: 1, // Default, will be updated
      unrealizedPnl: 0,
      unrealizedPnlPct: 0,
      side: manualOpen.side,
      entryTime: manualOpen.detectedAt,
      entry_time: manualOpen.detectedAt
    }
    updatedPositions.set(manualOpen.symbol, newPosition)
    openedPositions.push(newPosition)
  }

  return {
    updatedPositions,
    closedPositions,
    openedPositions
  }
}
