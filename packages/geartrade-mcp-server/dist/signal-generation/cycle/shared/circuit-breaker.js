/**
 * Circuit Breaker
 * Monitor emergency conditions and trigger circuit breakers
 */
/**
 * Check circuit breaker conditions
 */
export function checkCircuitBreaker(currentState, config, _recentTrades, apiErrorCount = 0, apiRequestCount = 0, marginLevel) {
    const dailyPnL = currentState.dailyPnL || 0;
    const consecutiveLosses = currentState.consecutiveLosses || 0;
    const apiErrorRate = apiRequestCount > 0
        ? (apiErrorCount / apiRequestCount) * 100
        : 0;
    // 1. Daily loss limit
    if (dailyPnL < -Math.abs(config.dailyLossLimitPct)) {
        return {
            status: 'STOPPED',
            reason: `Daily loss limit exceeded (${dailyPnL.toFixed(2)}% < -${config.dailyLossLimitPct}%)`,
            shouldCloseAll: true,
            shouldPauseEntries: true
        };
    }
    // 2. Consecutive losses
    if (consecutiveLosses >= config.consecutiveLossesLimit) {
        return {
            status: 'PAUSED',
            reason: `Consecutive losses limit reached (${consecutiveLosses} >= ${config.consecutiveLossesLimit})`,
            shouldCloseAll: false,
            shouldPauseEntries: true
        };
    }
    // 3. API error rate
    if (apiErrorRate > config.apiErrorRateThreshold) {
        return {
            status: 'STOPPED',
            reason: `API error rate too high (${apiErrorRate.toFixed(1)}% > ${config.apiErrorRateThreshold}%)`,
            shouldCloseAll: true,
            shouldPauseEntries: true
        };
    }
    // 4. Margin level
    if (config.marginLevelThreshold != null && marginLevel != null) {
        if (marginLevel < config.marginLevelThreshold) {
            return {
                status: 'STOPPED',
                reason: `Margin level too low (${marginLevel.toFixed(2)}% < ${config.marginLevelThreshold}%)`,
                shouldCloseAll: true,
                shouldPauseEntries: true
            };
        }
    }
    // All checks passed
    return {
        status: 'NORMAL',
        shouldCloseAll: false,
        shouldPauseEntries: false
    };
}
/**
 * Update circuit breaker state with new trade
 */
export function updateCircuitBreakerState(currentState, trade, startOfDayTimestamp) {
    // const now = Date.now()
    const isToday = trade.exitTime >= startOfDayTimestamp;
    // Calculate daily PnL (only from today's trades)
    let dailyPnL = currentState.dailyPnL || 0;
    if (isToday) {
        dailyPnL += trade.pnlPct;
    }
    // Update consecutive losses/wins
    let consecutiveLosses = currentState.consecutiveLosses || 0;
    const isLoss = trade.pnl < 0;
    if (isLoss) {
        consecutiveLosses++;
    }
    else {
        consecutiveLosses = 0; // Reset on win
    }
    return {
        ...currentState,
        dailyPnL,
        consecutiveLosses
    };
}
/**
 * Initialize circuit breaker state
 */
export function initializeCircuitBreakerState() {
    return {
        status: 'NORMAL',
        dailyPnL: 0,
        consecutiveLosses: 0,
        apiErrorRate: 0
    };
}
/**
 * Reset daily PnL (call at start of new day)
 */
export function resetDailyPnL(state) {
    return {
        ...state,
        dailyPnL: 0
    };
}
