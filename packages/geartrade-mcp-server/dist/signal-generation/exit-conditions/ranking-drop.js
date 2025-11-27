/**
 * Ranking Drop Exit Condition Checker
 * Exit if asset falls below ranking threshold (with confirmation period)
 */
export function checkRankingDrop(position, currentRanking, // Current rank of the asset (null if not in ranking)
config) {
    if (!config.enabled || currentRanking == null) {
        return null;
    }
    // Initialize ranking history if not exists
    if (!position.rankingHistory) {
        position.rankingHistory = [];
    }
    const rankingHistory = position.rankingHistory;
    rankingHistory.push(currentRanking);
    // Keep only last N cycles for history
    const maxHistoryLength = config.confirmationCycles + 1;
    if (rankingHistory.length > maxHistoryLength) {
        rankingHistory.shift();
    }
    // Determine threshold
    const threshold = config.useBuffer
        ? config.topN + config.bufferSize
        : config.topN;
    // Check if asset is below threshold
    const isBelowThreshold = currentRanking > threshold;
    if (!isBelowThreshold) {
        // Asset is still in top N, reset history
        if (rankingHistory.length > 0 && rankingHistory[rankingHistory.length - 1] <= threshold) {
            // Reset history if back in top N
            position.rankingHistory = [currentRanking];
        }
        return null;
    }
    // Check confirmation period: asset must be out of Top N for X cycles
    if (rankingHistory.length < config.confirmationCycles) {
        // Not enough history yet, wait for confirmation
        return null;
    }
    // Check if asset was out of Top N for all confirmation cycles
    const lastNCycles = rankingHistory.slice(-config.confirmationCycles);
    const allOutOfTopN = lastNCycles.every(rank => rank > threshold);
    if (!allOutOfTopN) {
        // Asset was in top N during confirmation period, don't exit
        return null;
    }
    return {
        reason: 'RANKING_DROP',
        priority: 6, // Lowest priority
        shouldExit: true,
        exitSize: 100, // Full exit
        metadata: {
            currentRanking,
            threshold,
            topN: config.topN,
            confirmationCycles: config.confirmationCycles,
            rankingHistory: lastNCycles,
            useBuffer: config.useBuffer
        },
        timestamp: Date.now(),
        description: `Asset dropped out of top ${config.topN} for ${config.confirmationCycles} cycles (current rank: ${currentRanking}, threshold: ${threshold})`
    };
}
export function updateRankingHistory(position, currentRanking) {
    if (currentRanking == null) {
        return position;
    }
    const rankingHistory = position.rankingHistory || [];
    rankingHistory.push(currentRanking);
    // Keep last 10 cycles
    if (rankingHistory.length > 10) {
        rankingHistory.shift();
    }
    return {
        ...position,
        rankingHistory,
        lastRankingCheck: Date.now()
    };
}
