/**
 * Test Mode Runner
 * Paper trading with virtual positions and simulated execution
 */
import { PaperExecutor } from '../execution/paper-executor';
import { PerformanceTracker } from './shared/performance-tracker';
// import { CircuitBreakerState } from '../types'
import { initializeCircuitBreakerState } from './shared/circuit-breaker';
import { executeCycle } from './shared/cycle-core';
import { saveCycleState, loadCycleState } from './shared/state-manager';
/**
 * Initialize test mode cycle
 */
export function initializeTestMode(config, model) {
    // Load or create cycle state
    const stateManagerConfig = {
        stateFile: config.stateFile,
        enabled: true
    };
    let state = loadCycleState(stateManagerConfig);
    if (!state) {
        state = createInitialState(config);
    }
    // Initialize paper executor
    const executorConfig = {
        paperCapital: config.paperCapital,
        tradesFile: config.paperTradesFile,
        simulateSlippage: true,
        slippagePct: 0.01
    };
    const executor = new PaperExecutor(executorConfig);
    // Initialize performance tracker
    const performanceConfig = {
        reportFile: config.performanceFile,
        trackEquityCurve: true
    };
    const performanceTracker = new PerformanceTracker(performanceConfig, config.paperCapital);
    // Create cycle config
    const cycleConfig = {
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
    };
    return {
        state,
        executor,
        performanceTracker,
        cycleConfig
    };
}
/**
 * Run test mode cycle
 */
export async function runTestModeCycle(currentState, cycleConfig, _performanceTracker) {
    try {
        const result = await executeCycle(currentState, cycleConfig);
        if (!result.success) {
            return {
                success: false,
                error: result.error
            };
        }
        // Update state with new positions from executeCycle result
        // Ensure positions Map from result.state is used (preserves deletions from exit execution)
        const updatedPositions = result.state?.positions || currentState.positions || new Map();
        const positionsCount = updatedPositions instanceof Map ? updatedPositions.size : Object.keys(updatedPositions).length;
        const newState = {
            ...currentState,
            ...result.state,
            cycleId: generateCycleId(),
            startTime: currentState.startTime || Date.now(),
            status: 'RUNNING',
            lastRankingTime: Date.now(),
            topNAssets: cycleConfig.cycleConfig.topNAssets,
            positions: updatedPositions // Use positions from result.state (preserves deletions)
        };
        // Log state update
        const previousPositionsCount = currentState.positions instanceof Map ? currentState.positions.size : (currentState.positions ? Object.keys(currentState.positions).length : 0);
        if (positionsCount !== previousPositionsCount) {
            console.log(`\x1b[36m📊 State updated: ${previousPositionsCount} → ${positionsCount} positions\x1b[0m`);
        }
        // Save state
        const stateManagerConfig = {
            stateFile: cycleConfig.stateFile,
            enabled: true
        };
        saveCycleState(newState, stateManagerConfig);
        return {
            success: true,
            newState,
            signals: result.signals,
            rejectedSignals: result.rejectedSignals,
            marketData: result.marketData,
            aiGeneratedCount: result.aiGeneratedCount
        };
    }
    catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return {
            success: false,
            error: errorMsg
        };
    }
}
/**
 * Create initial state for test mode
 */
function createInitialState(config) {
    return {
        cycleId: generateCycleId(),
        startTime: Date.now(),
        status: 'RUNNING',
        positions: new Map(),
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
    };
}
/**
 * Generate cycle ID
 */
export function generateCycleId() {
    return `cycle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
