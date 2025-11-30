/**
 * Chande Momentum Oscillator (CMO)
 * Alternative momentum oscillator developed by Tushar Chande
 */
/**
 * Calculate Chande Momentum Oscillator
 * @param prices Array of closing prices
 * @param period Period for calculation (default 14)
 * @returns ChandeMomentumData object
 */
export function calculateChandeMomentum(prices, period = 14) {
    // Minimum 5 prices required
    if (prices.length < 5) {
        return null;
    }
    // Adjust period if not enough data - use adaptive period
    const effectivePeriod = Math.min(period, prices.length - 1);
    if (effectivePeriod < 3) {
        return null;
    }
    // Calculate price changes
    const changes = [];
    for (let i = 1; i < prices.length; i++) {
        changes.push(prices[i] - prices[i - 1]);
    }
    // Use effective period for calculation
    const usePeriod = Math.min(effectivePeriod, changes.length);
    // Calculate sum of up moves and down moves over the period
    const recentChanges = changes.slice(-usePeriod);
    let sumUp = 0;
    let sumDown = 0;
    for (const change of recentChanges) {
        if (change > 0) {
            sumUp += change;
        }
        else {
            sumDown += Math.abs(change);
        }
    }
    // Calculate CMO
    // CMO = 100 * (sumUp - sumDown) / (sumUp + sumDown)
    const total = sumUp + sumDown;
    const cmo = total > 0 ? 100 * (sumUp - sumDown) / total : 0;
    // Determine trend
    let trend = 'neutral';
    if (cmo > 0) {
        trend = 'bullish';
    }
    else if (cmo < 0) {
        trend = 'bearish';
    }
    // Check overbought/oversold levels
    const overbought = cmo > 50;
    const oversold = cmo < -50;
    // Calculate signal strength based on CMO magnitude
    const strength = Math.min(100, Math.abs(cmo) * 2);
    // Simple divergence detection (requires more historical data)
    let divergence = 'none';
    if (prices.length >= period * 2 && changes.length >= period * 2) {
        // Compare recent CMO with previous period
        const prevChanges = changes.slice(-period * 2, -period);
        let prevSumUp = 0;
        let prevSumDown = 0;
        for (const change of prevChanges) {
            if (change > 0) {
                prevSumUp += change;
            }
            else {
                prevSumDown += Math.abs(change);
            }
        }
        const prevTotal = prevSumUp + prevSumDown;
        const prevCmo = prevTotal > 0 ? 100 * (prevSumUp - prevSumDown) / prevTotal : 0;
        const recentPrice = prices[prices.length - 1];
        const prevPrice = prices[prices.length - period - 1];
        // Bullish divergence: price makes lower low but CMO makes higher low
        if (recentPrice < prevPrice && cmo > prevCmo && cmo < 0) {
            divergence = 'bullish';
        }
        // Bearish divergence: price makes higher high but CMO makes lower high
        else if (recentPrice > prevPrice && cmo < prevCmo && cmo > 0) {
            divergence = 'bearish';
        }
    }
    // Generate trading signal
    let signal = 'neutral';
    if (oversold && divergence === 'bullish') {
        signal = 'buy';
    }
    else if (overbought && divergence === 'bearish') {
        signal = 'sell';
    }
    else if (oversold && trend === 'bullish') {
        signal = 'buy';
    }
    else if (overbought && trend === 'bearish') {
        signal = 'sell';
    }
    return {
        cmo,
        sumUp,
        sumDown,
        trend,
        overbought,
        oversold,
        strength,
        divergence,
        signal
    };
}
/**
 * Calculate Chande Momentum Oscillator for multiple periods
 * @param prices Array of closing prices
 * @param periods Array of periods to calculate CMO for
 * @returns Array of ChandeMomentumData objects
 */
export function calculateMultipleChandeMomentum(prices, periods = [9, 14, 21]) {
    return periods
        .map(period => calculateChandeMomentum(prices, period))
        .filter((cmo) => cmo !== null);
}
/**
 * Get CMO interpretation
 * @param cmo ChandeMomentumData object
 * @returns Human-readable interpretation
 */
export function getCMOInterpretation(cmo) {
    const { cmo: value, overbought, oversold, divergence } = cmo;
    if (overbought) {
        return `Overbought (${value.toFixed(2)}) - potential reversal down`;
    }
    if (oversold) {
        return `Oversold (${value.toFixed(2)}) - potential reversal up`;
    }
    if (divergence === 'bullish') {
        return `Bullish divergence (${value.toFixed(2)}) - potential buy signal`;
    }
    if (divergence === 'bearish') {
        return `Bearish divergence (${value.toFixed(2)}) - potential sell signal`;
    }
    if (value > 30) {
        return `Strong bullish momentum (${value.toFixed(2)})`;
    }
    if (value < -30) {
        return `Strong bearish momentum (${value.toFixed(2)})`;
    }
    if (value > 0) {
        return `Bullish momentum (${value.toFixed(2)})`;
    }
    if (value < 0) {
        return `Bearish momentum (${value.toFixed(2)})`;
    }
    return `Neutral (${value.toFixed(2)})`;
}
/**
 * Calculate CMO momentum strength rating
 * @param cmo ChandeMomentumData object
 * @returns Momentum strength rating (0-100)
 */
export function getCMOMomentumStrength(cmo) {
    const { cmo: value, sumUp, sumDown } = cmo;
    // Strength based on CMO value and the ratio of up vs down moves
    const cmoStrength = Math.abs(value);
    const ratioStrength = sumUp > 0 && sumDown > 0 ? Math.min(sumUp / sumDown, sumDown / sumUp) * 25 : 0;
    return Math.min(100, cmoStrength + ratioStrength);
}
