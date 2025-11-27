/**
 * Elder-Ray Index Indicator
 * Measures buying and selling pressure using Bull Power and Bear Power
 */
/**
 * Calculate Elder-Ray Index
 * @param highs Array of high prices
 * @param lows Array of low prices
 * @param closes Array of close prices
 * @param period EMA period (default 13, as recommended by Elder)
 * @returns ElderRayData object
 */
export function calculateElderRay(highs, lows, closes, period = 13) {
    if (highs.length < period || lows.length < period || closes.length < period) {
        return null;
    }
    // Calculate EMA of closes
    const ema = calculateEMA(closes, period);
    if (!ema)
        return null;
    // Get current high, low, and close
    const currentHigh = highs[highs.length - 1];
    const currentLow = lows[lows.length - 1];
    // Calculate Bull Power and Bear Power
    const bullPower = currentHigh - ema;
    const bearPower = currentLow - ema;
    const totalPower = bullPower + bearPower;
    // Determine trend based on power balance
    let trend = 'neutral';
    if (bullPower > Math.abs(bearPower) * 0.7) {
        trend = 'bullish';
    }
    else if (Math.abs(bearPower) > bullPower * 0.7) {
        trend = 'bearish';
    }
    // Calculate power balance ratio
    const powerBalance = bearPower !== 0 ? bullPower / Math.abs(bearPower) : bullPower > 0 ? 1 : -1;
    // Calculate signal strength based on power magnitudes
    const bullStrength = Math.abs(bullPower) / ema * 100;
    const bearStrength = Math.abs(bearPower) / ema * 100;
    const strength = Math.min(100, (bullStrength + bearStrength) / 2);
    // Check for divergences (simplified version)
    let bullishDivergence = false;
    let bearishDivergence = false;
    if (highs.length >= period * 2 && lows.length >= period * 2) {
        // Compare recent bull power with previous period
        const recentBullPowers = highs.slice(-period).map((h, i) => h - calculateEMA(closes.slice(-period - i, -i || undefined), period));
        const prevBullPowers = highs.slice(-period * 2, -period).map((h, i) => h - calculateEMA(closes.slice(-period * 2 - i, -period - i), period));
        const recentAvgBull = recentBullPowers.reduce((sum, p) => sum + p, 0) / recentBullPowers.length;
        const prevAvgBull = prevBullPowers.reduce((sum, p) => sum + p, 0) / prevBullPowers.length;
        const recentHigh = Math.max(...highs.slice(-period));
        const prevHigh = Math.max(...highs.slice(-period * 2, -period));
        // Bullish divergence: lower highs but higher bull power
        if (recentHigh < prevHigh && recentAvgBull > prevAvgBull) {
            bullishDivergence = true;
        }
        // Similar check for bear power
        const recentBearPowers = lows.slice(-period).map((l, i) => l - calculateEMA(closes.slice(-period - i, -i || undefined), period));
        const prevBearPowers = lows.slice(-period * 2, -period).map((l, i) => l - calculateEMA(closes.slice(-period * 2 - i, -period - i), period));
        const recentAvgBear = recentBearPowers.reduce((sum, p) => sum + p, 0) / recentBearPowers.length;
        const prevAvgBear = prevBearPowers.reduce((sum, p) => sum + p, 0) / prevBearPowers.length;
        const recentLow = Math.min(...lows.slice(-period));
        const prevLow = Math.min(...lows.slice(-period * 2, -period));
        // Bearish divergence: higher lows but lower bear power (more negative)
        if (recentLow > prevLow && recentAvgBear < prevAvgBear) {
            bearishDivergence = true;
        }
    }
    // Determine current market pressure
    let pressure = 'balanced';
    if (bullPower > Math.abs(bearPower)) {
        pressure = 'buying';
    }
    else if (Math.abs(bearPower) > bullPower) {
        pressure = 'selling';
    }
    return {
        bullPower,
        bearPower,
        totalPower,
        trend,
        powerBalance,
        strength,
        bullishDivergence,
        bearishDivergence,
        pressure
    };
}
/**
 * Helper function to calculate EMA
 */
function calculateEMA(prices, period) {
    if (prices.length < period)
        return null;
    const multiplier = 2 / (period + 1);
    let ema = prices[0];
    for (let i = 1; i < prices.length; i++) {
        ema = (prices[i] - ema) * multiplier + ema;
    }
    return ema;
}
/**
 * Get Elder-Ray trading signal
 * @param elderRay ElderRayData object
 * @returns Trading signal
 */
export function getElderRaySignal(elderRay) {
    const { trend, bullishDivergence, bearishDivergence, pressure, bullPower, bearPower } = elderRay;
    // Strong divergence signals
    if (bullishDivergence && pressure === 'buying') {
        return 'buy';
    }
    else if (bearishDivergence && pressure === 'selling') {
        return 'sell';
    }
    // Trend continuation signals
    if (trend === 'bullish' && bullPower > 0 && bearPower > -0.5) {
        return 'buy';
    }
    else if (trend === 'bearish' && bearPower < 0 && bullPower < 0.5) {
        return 'sell';
    }
    // Extreme power signals
    const powerRatio = Math.abs(bullPower / bearPower);
    if (powerRatio > 3 && bullPower > 0) {
        return 'buy'; // Very strong buying pressure
    }
    else if (powerRatio > 3 && bearPower < 0) {
        return 'sell'; // Very strong selling pressure
    }
    return 'neutral';
}
/**
 * Calculate Elder-Ray Power Histogram
 * @param elderRay ElderRayData object
 * @returns Histogram value for visualization
 */
export function getElderRayHistogram(elderRay) {
    // Return the difference between bull and bear power
    return elderRay.bullPower - Math.abs(elderRay.bearPower);
}
/**
 * Check Elder-Ray for overbought/oversold conditions
 * @param elderRay ElderRayData object
 * @param history Array of previous ElderRayData for normalization
 * @returns Overbought/oversold status
 */
export function getElderRayOverboughtOversold(elderRay, history = []) {
    if (history.length < 20) {
        // Not enough history for reliable assessment
        return 'neutral';
    }
    // Calculate z-score of current bull power vs historical bull powers
    const bullPowers = history.map(h => h.bullPower);
    const bullMean = bullPowers.reduce((sum, p) => sum + p, 0) / bullPowers.length;
    const bullStd = Math.sqrt(bullPowers.reduce((sum, p) => sum + Math.pow(p - bullMean, 2), 0) / bullPowers.length);
    const bullZScore = (elderRay.bullPower - bullMean) / bullStd;
    // Similar for bear power
    const bearPowers = history.map(h => Math.abs(h.bearPower));
    const bearMean = bearPowers.reduce((sum, p) => sum + p, 0) / bearPowers.length;
    const bearStd = Math.sqrt(bearPowers.reduce((sum, p) => sum + Math.pow(p - bearMean, 2), 0) / bearPowers.length);
    const bearZScore = (Math.abs(elderRay.bearPower) - bearMean) / bearStd;
    if (bullZScore > 2)
        return 'overbought'; // Bull power is unusually high
    if (bearZScore > 2)
        return 'oversold'; // Bear power is unusually high
    return 'neutral';
}
