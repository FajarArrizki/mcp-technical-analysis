/**
 * Detrended Price Oscillator (DPO)
 * Removes trend from price data to identify cycles and overbought/oversold conditions
 */
/**
 * Calculate Detrended Price Oscillator
 * @param prices Array of closing prices
 * @param period Period for moving average (default 20)
 * @returns DetrendedPriceData object
 */
export function calculateDetrendedPrice(prices, period = 20) {
    if (prices.length < period * 2) {
        return null;
    }
    // Calculate the displaced moving average
    // DPO uses SMA displaced by (period/2 + 1) periods back
    const displacement = Math.floor(period / 2) + 1;
    if (prices.length < period + displacement) {
        return null;
    }
    // Get the price from (period + displacement) periods ago for the MA calculation
    const maStartIndex = prices.length - period - displacement;
    const maEndIndex = prices.length - displacement;
    if (maStartIndex < 0) {
        return null;
    }
    const maPrices = prices.slice(maStartIndex, maEndIndex);
    const ma = maPrices.reduce((sum, price) => sum + price, 0) / maPrices.length;
    // Current price
    const currentPrice = prices[prices.length - 1];
    // Calculate DPO: Price - Displaced MA
    const dpo = currentPrice - ma;
    // Determine cycle position
    let cyclePosition = 'neutral';
    if (prices.length >= period + displacement + 2) {
        const prevDpo = calculateDetrendedPrice(prices.slice(0, -1), period)?.dpo || 0;
        const prevPrevDpo = calculateDetrendedPrice(prices.slice(0, -2), period)?.dpo || 0;
        if (dpo > prevDpo && prevDpo > prevPrevDpo) {
            cyclePosition = 'rising';
        }
        else if (dpo < prevDpo && prevDpo < prevPrevDpo) {
            cyclePosition = 'falling';
        }
        else if (dpo < prevDpo && prevDpo > prevPrevDpo) {
            cyclePosition = 'peak';
        }
        else if (dpo > prevDpo && prevDpo < prevPrevDpo) {
            cyclePosition = 'trough';
        }
    }
    // Calculate overbought/oversold based on historical DPO values
    const dpoHistory = calculateDPOHistory(prices, period);
    let overbought = false;
    let oversold = false;
    if (dpoHistory.length >= 20) {
        const sortedDpo = [...dpoHistory].sort((a, b) => a - b);
        const lower80 = sortedDpo[Math.floor(sortedDpo.length * 0.2)];
        const upper80 = sortedDpo[Math.floor(sortedDpo.length * 0.8)];
        overbought = dpo > upper80;
        oversold = dpo < lower80;
    }
    // Zero line cross detection
    let zeroCross = 'none';
    if (dpoHistory.length >= 2) {
        const prevDpo = dpoHistory[dpoHistory.length - 2];
        if (dpo > 0 && prevDpo <= 0) {
            zeroCross = 'bullish';
        }
        else if (dpo < 0 && prevDpo >= 0) {
            zeroCross = 'bearish';
        }
    }
    // Detrended strength (absolute value of DPO)
    const detrendedStrength = Math.abs(dpo);
    // Generate signal
    let signal = 'neutral';
    if (oversold && (zeroCross === 'bullish' || cyclePosition === 'trough')) {
        signal = 'buy';
    }
    else if (overbought && (zeroCross === 'bearish' || cyclePosition === 'peak')) {
        signal = 'sell';
    }
    else if (zeroCross === 'bullish') {
        signal = 'buy';
    }
    else if (zeroCross === 'bearish') {
        signal = 'sell';
    }
    // Estimate cycle length based on recent peaks/troughs
    const estimatedCycleLength = estimateCycleLength(dpoHistory);
    return {
        dpo,
        ma,
        cyclePosition,
        overbought,
        oversold,
        zeroCross,
        detrendedStrength,
        signal,
        estimatedCycleLength
    };
}
/**
 * Helper function to calculate DPO history
 */
function calculateDPOHistory(prices, period) {
    const dpoValues = [];
    const maxHistory = Math.min(50, prices.length - period * 2); // Limit history for performance
    for (let i = period * 2; i <= prices.length; i++) {
        const slice = prices.slice(0, i);
        const dpo = calculateDetrendedPrice(slice, period);
        if (dpo) {
            dpoValues.push(dpo.dpo);
        }
    }
    return dpoValues.slice(-maxHistory);
}
/**
 * Helper function to estimate cycle length
 */
function estimateCycleLength(dpoHistory) {
    if (dpoHistory.length < 10) {
        return null;
    }
    // Find peaks and troughs
    const peaks = [];
    const troughs = [];
    for (let i = 1; i < dpoHistory.length - 1; i++) {
        if (dpoHistory[i] > dpoHistory[i - 1] && dpoHistory[i] > dpoHistory[i + 1]) {
            peaks.push(i);
        }
        else if (dpoHistory[i] < dpoHistory[i - 1] && dpoHistory[i] < dpoHistory[i + 1]) {
            troughs.push(i);
        }
    }
    // Calculate average distance between peaks and troughs
    const allPoints = [...peaks, ...troughs].sort((a, b) => a - b);
    if (allPoints.length < 3) {
        return null;
    }
    let totalDistance = 0;
    let count = 0;
    for (let i = 1; i < allPoints.length; i++) {
        totalDistance += allPoints[i] - allPoints[i - 1];
        count++;
    }
    return count > 0 ? totalDistance / count : null;
}
/**
 * Get DPO cycle analysis
 * @param dpo DetrendedPriceData object
 * @returns Cycle analysis description
 */
export function getDPOCycleAnalysis(dpo) {
    const { cyclePosition, estimatedCycleLength, dpo: value } = dpo;
    let analysis = `DPO: ${value.toFixed(4)}`;
    switch (cyclePosition) {
        case 'peak':
            analysis += ' - Cycle peak detected';
            break;
        case 'trough':
            analysis += ' - Cycle trough detected';
            break;
        case 'rising':
            analysis += ' - Rising in cycle';
            break;
        case 'falling':
            analysis += ' - Falling in cycle';
            break;
        default:
            analysis += ' - Neutral cycle position';
    }
    if (estimatedCycleLength) {
        analysis += ` - Estimated cycle: ${estimatedCycleLength.toFixed(1)} periods`;
    }
    return analysis;
}
/**
 * Calculate DPO for multiple periods
 * @param prices Array of closing prices
 * @param periods Array of periods to calculate DPO for
 * @returns Array of DetrendedPriceData objects
 */
export function calculateMultipleDetrendedPrice(prices, periods = [10, 20, 30]) {
    return periods
        .map(period => calculateDetrendedPrice(prices, period))
        .filter((dpo) => dpo !== null);
}
