/**
 * Vortex Indicator
 * Identifies trend direction using positive and negative directional movement
 */
export function calculateVortex(highs, lows, closes, period = 14) {
    // Minimum 5 data points required
    if (highs.length < 5 || lows.length < 5 || closes.length < 5) {
        return {
            vortexPlus: null,
            vortexMinus: null,
            trend: null,
            strength: null,
        };
    }
    // Use adaptive period
    const effectivePeriod = Math.min(period, highs.length - 1);
    // Calculate True Range and Directional Movement
    const trueRanges = [];
    const plusDMs = [];
    const minusDMs = [];
    for (let i = 1; i < closes.length; i++) {
        const currentHigh = highs[i];
        const currentLow = lows[i];
        const previousHigh = highs[i - 1];
        const previousLow = lows[i - 1];
        const previousClose = closes[i - 1];
        // True Range = max(high - low, |high - prevClose|, |low - prevClose|)
        const tr1 = currentHigh - currentLow;
        const tr2 = Math.abs(currentHigh - previousClose);
        const tr3 = Math.abs(currentLow - previousClose);
        const trueRange = Math.max(tr1, tr2, tr3);
        trueRanges.push(trueRange);
        // Directional Movement
        const upMove = currentHigh - previousHigh;
        const downMove = previousLow - currentLow;
        let plusDM = 0;
        let minusDM = 0;
        if (upMove > downMove && upMove > 0) {
            plusDM = upMove;
        }
        if (downMove > upMove && downMove > 0) {
            minusDM = downMove;
        }
        plusDMs.push(plusDM);
        minusDMs.push(minusDM);
    }
    if (trueRanges.length < 2) {
        return {
            vortexPlus: null,
            vortexMinus: null,
            trend: null,
            strength: null,
        };
    }
    // Calculate sums for the effective period
    const usePeriod = Math.min(effectivePeriod, trueRanges.length);
    const sumTR = trueRanges.slice(-usePeriod).reduce((sum, tr) => sum + tr, 0);
    const sumPlusDM = plusDMs.slice(-usePeriod).reduce((sum, dm) => sum + dm, 0);
    const sumMinusDM = minusDMs.slice(-usePeriod).reduce((sum, dm) => sum + dm, 0);
    if (sumTR === 0) {
        return {
            vortexPlus: null,
            vortexMinus: null,
            trend: null,
            strength: null,
        };
    }
    // Calculate Vortex Indicators
    const vortexPlus = sumPlusDM / sumTR;
    const vortexMinus = sumMinusDM / sumTR;
    // Determine trend
    let trend = null;
    if (vortexPlus > vortexMinus)
        trend = 'uptrend';
    else if (vortexMinus > vortexPlus)
        trend = 'downtrend';
    else
        trend = 'neutral';
    // Determine strength
    let strength = null;
    const difference = Math.abs(vortexPlus - vortexMinus);
    if (difference > 0.15)
        strength = 'strong';
    else if (difference > 0.08)
        strength = 'moderate';
    else
        strength = 'weak';
    return {
        vortexPlus,
        vortexMinus,
        trend,
        strength,
    };
}
