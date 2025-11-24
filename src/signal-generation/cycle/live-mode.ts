/**
 * Live Mode Runner
 * Real trading with API execution and safety checks
 */

import { CycleState, PositionState, Signal, MarketData } from '../types'
import { LiveExecutor, LiveExecutorConfig } from '../execution/live-executor'
import { PerformanceTracker, PerformanceTrackerConfig } from './shared/performance-tracker'
// import { CircuitBreakerState } from '../types'
import { initializeCircuitBreakerState } from './shared/circuit-breaker'
import { executeCycle, CycleCoreConfig } from './shared/cycle-core'
import { saveCycleState, loadCycleState, reconcileStateWithAPI, StateManagerConfig } from './shared/state-manager'
import { getHyperliquidAccountAddress, getHyperliquidWalletApiKey } from '../config'
import { generateCycleId } from './shared/utils'

export interface LiveModeConfig {
  cycleIntervalMs: number
  topNAssets: number
  stateFile: string
  performanceFile: string
  aiTrainingDataFile: string
  liveTradesFile: string
  enabled: boolean
}

/**
 * Initialize live mode cycle
 */
export async function initializeLiveMode(config: LiveModeConfig, model: any): Promise<{
  state: Partial<CycleState>
  executor: LiveExecutor
  performanceTracker: PerformanceTracker
  cycleConfig: CycleCoreConfig
  error?: string
}> {
  // Verify API connection
  const accountAddress = getHyperliquidAccountAddress()
  const walletApiKey = getHyperliquidWalletApiKey()

  if (!accountAddress || !walletApiKey) {
    return {
      state: {},
      executor: null as any,
      performanceTracker: null as any,
      cycleConfig: null as any,
      error: 'Account address and wallet API key must be configured for LIVE mode'
    }
  }

  // Load or create cycle state
  const stateManagerConfig: StateManagerConfig = {
    stateFile: config.stateFile,
    enabled: true
  }

  let state = loadCycleState(stateManagerConfig)
  if (!state) {
    state = createInitialState(config)
  } else {
    // Reconcile with API on startup
    const reconcileResult = await reconcileStateWithAPI(state, accountAddress)
    if (reconcileResult.reconciled) {
      console.log(`✅ Reconciled state: ${reconcileResult.positionsUpdated} updated, ${reconcileResult.positionsClosed} closed`)
    } else if (reconcileResult.error) {
      console.warn(`⚠️  State reconciliation failed: ${reconcileResult.error}`)
    }
  }

  // Initialize live executor
  const executorConfig: LiveExecutorConfig = {
    tradesFile: config.liveTradesFile,
    orderFillTimeoutMs: 30000,
    retryOnTimeout: true,
    maxRetries: 3
  }
  const executor = new LiveExecutor(executorConfig)

  // Initialize performance tracker
  const performanceConfig: PerformanceTrackerConfig = {
    reportFile: config.performanceFile,
    trackEquityCurve: true
  }
  const performanceTracker = new PerformanceTracker(performanceConfig, 0) // Will be set from account balance

  // Create cycle config
  const cycleConfig: CycleCoreConfig = {
    cycleConfig: {
      intervalMs: config.cycleIntervalMs,
      mode: 'LIVE',
      topNAssets: config.topNAssets,
      enabledExitConditions: {
        stopLoss: true,
        takeProfit: true,
        trailingStop: true,
        signalReversal: true,
        rankingDrop: true,
        indicatorBased: true
      }
    },
    intervalMs: config.cycleIntervalMs,
    stateFile: config.stateFile,
    performanceFile: config.performanceFile,
    aiTrainingDataFile: config.aiTrainingDataFile,
    model,
    executor,
    isLive: true,
    performanceTracker // Pass performance tracker to cycle core
  }

  return {
    state,
    executor,
    performanceTracker,
    cycleConfig
  }
}

/**
 * Run live mode cycle
 */
export async function runLiveModeCycle(
  currentState: Partial<CycleState>,
  cycleConfig: CycleCoreConfig,
  _performanceTracker: PerformanceTracker
): Promise<{
  success: boolean
  newState?: Partial<CycleState>
  error?: string
  signals?: Signal[]
  rejectedSignals?: Array<{ signal: Signal; reason: string }>
  marketData?: Map<string, MarketData> | Record<string, MarketData>
  aiGeneratedCount?: number
}> {
  try {
    const result = await executeCycle(currentState, cycleConfig)

    if (!result.success) {
      return {
        success: false,
        error: result.error
      }
    }

    // Update state with new positions from executeCycle result
    // Ensure positions Map from result.state is used (preserves deletions from exit execution)
    const updatedPositions = result.state?.positions || currentState.positions || new Map<string, PositionState>()
    const positionsCount = updatedPositions instanceof Map ? updatedPositions.size : Object.keys(updatedPositions).length
    
    const newState: Partial<CycleState> = {
      ...currentState,
      ...result.state,
      cycleId: generateCycleId(),
      startTime: currentState.startTime || Date.now(),
      status: 'RUNNING',
      lastRankingTime: Date.now(),
      topNAssets: cycleConfig.cycleConfig.topNAssets,
      positions: updatedPositions // Use positions from result.state (preserves deletions)
    }
    
    // Log state update
    const previousPositionsCount = currentState.positions instanceof Map ? currentState.positions.size : (currentState.positions ? Object.keys(currentState.positions).length : 0)
    if (positionsCount !== previousPositionsCount) {
      console.log(`\x1b[36m📊 State updated: ${previousPositionsCount} → ${positionsCount} positions\x1b[0m`)
    }

    // Save state
    const stateManagerConfig: StateManagerConfig = {
      stateFile: cycleConfig.stateFile,
      enabled: true
    }
    saveCycleState(newState as CycleState, stateManagerConfig)

    return {
      success: true,
      newState,
      signals: result.signals,
      rejectedSignals: result.rejectedSignals,
      marketData: result.marketData,
      aiGeneratedCount: result.aiGeneratedCount
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    return {
      success: false,
      error: errorMsg
    }
  }
}

/**
 * Create initial state for live mode
 */
function createInitialState(config: LiveModeConfig): Partial<CycleState> {
  return {
    cycleId: generateCycleId(),
    startTime: Date.now(),
    status: 'RUNNING',
    positions: new Map<string, PositionState>(),
    trades: [],
    performance: {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      totalReturnPct: 0,
      totalReturnUsd: 0,
      averageReturnPct: 0,
      averageRMultiple: 0,
      maxSingleTradeLoss: 0,
      maxDrawdownPct: 0,
      sharpeRatio: 0,
      tradesPerAsset: {},
      equityCurve: [],
      consecutiveWins: 0,
      consecutiveLosses: 0,
      averageHoldingTimeMinutes: 0
    },
    circuitBreaker: initializeCircuitBreakerState(),
    lastRankingTime: Date.now(),
    topNAssets: config.topNAssets,
    config: {
      intervalMs: config.cycleIntervalMs,
      mode: 'LIVE',
      topNAssets: config.topNAssets,
      enabledExitConditions: {
        stopLoss: true,
        takeProfit: true,
        trailingStop: true,
        signalReversal: true,
        rankingDrop: true,
        indicatorBased: true
      }
    }
  }
}
