/**
 * Test Mode Runner
 * Paper trading with virtual positions and simulated execution
 */

import { CycleState, CycleConfig, PositionState, Signal, MarketData } from '../types'
import { PaperExecutor, PaperExecutorConfig } from '../execution/paper-executor'
import { PerformanceTracker, PerformanceTrackerConfig } from './shared/performance-tracker'
import { CircuitBreakerState } from '../types'
import { initializeCircuitBreakerState } from './shared/circuit-breaker'
import { executeCycle, CycleCoreConfig } from './shared/cycle-core'
import { saveCycleState, loadCycleState, StateManagerConfig } from './shared/state-manager'
import { getTradingConfig } from '../config'
import { getAIModel, getAIProvider } from '../config'
// generateCycleId is defined locally in this file, no need to import

export interface TestModeConfig {
  cycleIntervalMs: number
  paperCapital: number
  topNAssets: number
  stateFile: string
  performanceFile: string
  aiTrainingDataFile: string
  paperTradesFile: string
  enabled: boolean
}

/**
 * Initialize test mode cycle
 */
export function initializeTestMode(config: TestModeConfig, model: any): {
  state: Partial<CycleState>
  executor: PaperExecutor
  performanceTracker: PerformanceTracker
  cycleConfig: CycleCoreConfig
} {
  // Load or create cycle state
  const stateManagerConfig: StateManagerConfig = {
    stateFile: config.stateFile,
    enabled: true
  }

  let state = loadCycleState(stateManagerConfig)
  if (!state) {
    state = createInitialState(config)
  }

  // Initialize paper executor
  const executorConfig: PaperExecutorConfig = {
    paperCapital: config.paperCapital,
    tradesFile: config.paperTradesFile,
    simulateSlippage: true,
    slippagePct: 0.01
  }
  const executor = new PaperExecutor(executorConfig)

  // Initialize performance tracker
  const performanceConfig: PerformanceTrackerConfig = {
    reportFile: config.performanceFile,
    trackEquityCurve: true
  }
  const performanceTracker = new PerformanceTracker(performanceConfig, config.paperCapital)

  // Create cycle config
  const cycleConfig: CycleCoreConfig = {
    cycleConfig: {
      intervalMs: config.cycleIntervalMs,
      mode: 'TEST',
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
    isLive: false,
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
 * Run test mode cycle
 */
export async function runTestModeCycle(
  currentState: Partial<CycleState>,
  cycleConfig: CycleCoreConfig,
  performanceTracker: PerformanceTracker
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
 * Create initial state for test mode
 */
function createInitialState(config: TestModeConfig): Partial<CycleState> {
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
      mode: 'TEST',
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

/**
 * Generate cycle ID
 */
export function generateCycleId(): string {
  return `cycle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}
