/**
 * Position Sizer
 * Calculate position size for each signal based on strategy
 */
/**
 * Calculate position size for a signal
 */
export function calculatePositionSize(signal, config, existingPositionsCount = 0) {
    const availableCapital = config.totalCapital * (1 - config.reserveCapitalPct / 100);
    const maxSizeUsd = config.totalCapital * (config.maxPositionSizePct / 100);
    let sizeUsd = 0;
    let reasoning = '';
    const constraints = {
        maxSizePct: config.maxPositionSizePct,
        reserveCapitalPct: config.reserveCapitalPct,
        applied: false
    };
    switch (config.strategy) {
        case 'equal':
            // Equal weight: Capital / N (where N is expected number of positions)
            const expectedPositions = Math.max(1, existingPositionsCount + 1);
            sizeUsd = availableCapital / expectedPositions;
            reasoning = `Equal weight: ${availableCapital.toFixed(2)} / ${expectedPositions} = ${sizeUsd.toFixed(2)}`;
            break;
        case 'confidence_weighted':
            // Higher confidence = larger size (proportional)
            const confidence = signal.confidence != null ? signal.confidence : 50;
            const baseSize = availableCapital / (existingPositionsCount + 1);
            const confidenceMultiplier = confidence / 50; // Normalize to 50% baseline
            sizeUsd = baseSize * confidenceMultiplier;
            reasoning = `Confidence weighted: base ${baseSize.toFixed(2)} × confidence ${confidence.toFixed(1)}% / 50 = ${sizeUsd.toFixed(2)}`;
            break;
        case 'ranking_weighted':
            // Top 1 = 2x base, Top 2 = 1.5x base, etc.
            const ranking = config.topNRanking != null ? config.topNRanking : 1;
            const baseRankingSize = availableCapital / (existingPositionsCount + 1);
            const rankingMultiplier = ranking === 1 ? 2.0 : ranking === 2 ? 1.5 : 1.0;
            sizeUsd = baseRankingSize * rankingMultiplier;
            reasoning = `Ranking weighted: rank ${ranking} = ${baseRankingSize.toFixed(2)} × ${rankingMultiplier}x = ${sizeUsd.toFixed(2)}`;
            break;
        case 'risk_parity':
            // Size based on volatility (lower vol = larger size)
            // Simplified: assume equal volatility for now (can be enhanced with actual ATR)
            sizeUsd = availableCapital / (existingPositionsCount + 1);
            reasoning = `Risk parity: ${availableCapital.toFixed(2)} / ${existingPositionsCount + 1} = ${sizeUsd.toFixed(2)} (volatility not yet implemented)`;
            break;
        case 'kelly':
            // Kelly Criterion: Size = (win_rate * avg_win - loss_rate * avg_loss) / avg_win
            if (config.winRate == null || config.averageWin == null || config.averageLoss == null) {
                // Fallback to equal if Kelly data not available
                sizeUsd = availableCapital / (existingPositionsCount + 1);
                reasoning = `Kelly criterion: insufficient data, using equal weight`;
                break;
            }
            const winRate = config.winRate;
            const lossRate = 1 - winRate;
            const avgWin = config.averageWin;
            const avgLoss = Math.abs(config.averageLoss);
            if (avgWin <= 0) {
                sizeUsd = availableCapital / (existingPositionsCount + 1);
                reasoning = `Kelly criterion: invalid avgWin, using equal weight`;
                break;
            }
            const kellyFraction = (winRate * avgWin - lossRate * avgLoss) / avgWin;
            // Apply Kelly fraction (cap at 25% for safety)
            const safeKellyFraction = Math.min(Math.max(kellyFraction, 0), 0.25);
            sizeUsd = availableCapital * safeKellyFraction;
            reasoning = `Kelly criterion: ${(safeKellyFraction * 100).toFixed(1)}% of capital = ${sizeUsd.toFixed(2)}`;
            break;
        default:
            // Default to equal
            sizeUsd = availableCapital / (existingPositionsCount + 1);
            reasoning = `Default (equal weight): ${availableCapital.toFixed(2)} / ${existingPositionsCount + 1} = ${sizeUsd.toFixed(2)}`;
    }
    // Apply max position size constraint
    if (sizeUsd > maxSizeUsd) {
        constraints.applied = true;
        sizeUsd = maxSizeUsd;
        reasoning += ` (capped at max ${config.maxPositionSizePct}% = ${maxSizeUsd.toFixed(2)})`;
    }
    // Calculate quantity (approximate, will be refined with actual entry price)
    const entryPrice = signal.entry_price || 0;
    const quantity = entryPrice > 0 ? sizeUsd / entryPrice : 0;
    return {
        sizeUsd,
        quantity,
        strategy: config.strategy,
        reasoning,
        constraints
    };
}
