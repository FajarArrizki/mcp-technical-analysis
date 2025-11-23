/**
 * State Manager
 * Persist and recover cycle state (positions, performance, etc.)
 */

import { CycleState, PositionState } from '../../types'
import * as fs from 'fs'
import * as path from 'path'
import { getUserState } from '../../data-fetchers/hyperliquid'
import { getHyperliquidAccountAddress } from '../../config'
import { extractPositionsFromUserState } from './position-sync'

export interface StateManagerConfig {
  stateFile: string
  enabled: boolean
}

/**
 * Save cycle state to file
 */
export function saveCycleState(
  state: CycleState,
  config: StateManagerConfig
): void {
  if (!config.enabled) {
    return
  }

  try {
    const fileDir = path.dirname(config.stateFile)
    if (!fs.existsSync(fileDir)) {
      fs.mkdirSync(fileDir, { recursive: true })
    }

    // Convert Map to array for JSON serialization
    const positionsArray = Array.from(state.positions.entries()).map(([symbol, pos]) => ({
      ...pos,
      symbol // Put symbol last to avoid overwriting
    }))

    const stateToSave = {
      ...state,
      positions: positionsArray,
      lastSaved: Date.now()
    }

    fs.writeFileSync(config.stateFile, JSON.stringify(stateToSave, null, 2))
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`Failed to save cycle state: ${errorMsg}`)
  }
}

/**
 * Load cycle state from file
 */
export function loadCycleState(
  config: StateManagerConfig
): Partial<CycleState> | null {
  if (!config.enabled) {
    return null
  }

  try {
    if (!fs.existsSync(config.stateFile)) {
      return null
    }

    const content = fs.readFileSync(config.stateFile, 'utf-8')
    const stateData = JSON.parse(content)

    // Convert array back to Map
    const positions = new Map<string, PositionState>()
    if (Array.isArray(stateData.positions)) {
      for (const pos of stateData.positions) {
        const { symbol, ...positionData } = pos
        if (symbol) {
          positions.set(symbol, positionData as PositionState)
        }
      }
    }

    return {
      ...stateData,
      positions
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.warn(`Failed to load cycle state: ${errorMsg}`)
    return null
  }
}

/**
 * Reconcile state with Hyperliquid API (for LIVE mode)
 */
export async function reconcileStateWithAPI(
  currentState: Partial<CycleState>,
  accountAddress: string | null = null
): Promise<{
  reconciled: boolean
  positionsUpdated: number
  positionsClosed: number
  error?: string
}> {
  try {
    const address = accountAddress || getHyperliquidAccountAddress()
    if (!address) {
      return {
        reconciled: false,
        positionsUpdated: 0,
        positionsClosed: 0,
        error: 'Account address not configured'
      }
    }

    // Fetch actual positions from Hyperliquid
    const userState = await getUserState(address, 3, 1000)
    const actualPositions = extractPositionsFromUserState(userState)

    if (!currentState.positions) {
      return {
        reconciled: false,
        positionsUpdated: 0,
        positionsClosed: 0,
        error: 'Current state has no positions'
      }
    }

    const trackedPositions = currentState.positions
    let positionsUpdated = 0
    let positionsClosed = 0

    // Check for manual closes
    for (const [symbol, trackedPos] of trackedPositions.entries()) {
      const actualPos = actualPositions.get(symbol)

      if (!actualPos || Math.abs(actualPos.quantity) < 0.001) {
        // Position closed manually
        trackedPositions.delete(symbol)
        positionsClosed++
      } else {
        // Position still exists, update quantity if changed
        const trackedQuantity = Math.abs(trackedPos.quantity)
        const actualQuantity = Math.abs(actualPos.quantity)
        if (Math.abs(trackedQuantity - actualQuantity) > 0.001) {
          // Size mismatch - update to actual
          const sideMultiplier = actualPos.side === 'LONG' ? 1 : -1
          trackedPos.quantity = actualQuantity * sideMultiplier
          trackedPos.entryPrice = actualPos.entryPrice
          positionsUpdated++
        }
      }
    }

    // Check for manual opens (if enabled)
    // Note: This would need to be enabled via config

    return {
      reconciled: true,
      positionsUpdated,
      positionsClosed
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    return {
      reconciled: false,
      positionsUpdated: 0,
      positionsClosed: 0,
      error: errorMsg
    }
  }
}

/**
 * Clear cycle state (for fresh start)
 */
export function clearCycleState(config: StateManagerConfig): void {
  try {
    if (fs.existsSync(config.stateFile)) {
      fs.unlinkSync(config.stateFile)
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.warn(`Failed to clear cycle state: ${errorMsg}`)
  }
}
