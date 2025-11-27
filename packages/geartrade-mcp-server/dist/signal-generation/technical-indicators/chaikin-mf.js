/**
 * Chaikin Money Flow (CMF) Indicator
 * Volume-weighted measure of accumulation/distribution
 */
export function calculateChaikinMF(highs, lows, closes, volumes, period = 21) {
    if (highs.length < period || lows.length < period || closes.length < period || volumes.length < period) {
        return {
            cmf: null,
            signal: null,
        };
    }
    // Calculate Money Flow Multiplier and Money Flow Volume
    const moneyFlowVolumes = [];
    let totalVolume = 0;
    for (let i = 0; i < closes.length; i++) {
        const high = highs[i];
        const low = lows[i];
        const close = closes[i];
        const volume = volumes[i] || 0;
        // Avoid division by zero
        if (high === low) {
            moneyFlowVolumes.push(0);
        }
        else {
            // Money Flow Multiplier = ((Close - Low) - (High - Close)) / (High - Low)
            const moneyFlowMultiplier = ((close - low) - (high - close)) / (high - low);
            const moneyFlowVolume = moneyFlowMultiplier * volume;
            moneyFlowVolumes.push(moneyFlowVolume);
        }
        totalVolume += volume;
    }
    // Calculate CMF for the specified period
    const startIdx = closes.length - period;
    let sumMoneyFlowVolume = 0;
    let sumVolume = 0;
    for (let i = startIdx; i < closes.length; i++) {
        sumMoneyFlowVolume += moneyFlowVolumes[i];
        sumVolume += volumes[i] || 0;
    }
    if (sumVolume === 0) {
        return {
            cmf: null,
            signal: null,
        };
    }
    const cmf = sumMoneyFlowVolume / sumVolume;
    // Determine signal
    let signal = null;
    if (cmf > 0.1)
        signal = 'accumulation';
    else if (cmf < -0.1)
        signal = 'distribution';
    else
        signal = 'neutral';
    return {
        cmf,
        signal,
    };
}
