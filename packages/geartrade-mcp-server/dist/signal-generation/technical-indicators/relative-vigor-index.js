/**
 * Relative Vigor Index (RVI) Indicator
 * Momentum indicator that compares closing price to opening price
 */
/**
 * Calculate Relative Vigor Index
 * @param opens Array of opening prices
 * @param highs Array of high prices
 * @param lows Array of low prices
 * @param closes Array of closing prices
 * @param period Period for RVI calculation (default 10)
 * @param signalPeriod Signal line period (default 4)
 * @returns RelativeVigorIndexData object
 */
export function calculateRelativeVigorIndex(opens, highs, lows, closes, period = 10, signalPeriod = 4) {
    if (opens.length !== highs.length || opens.length !== lows.length || opens.length !== closes.length || opens.length < period + signalPeriod) {
        return null;
    }
    // Calculate RVI components for each period
    const rviComponents = [];
    for (let i = 0; i < opens.length; i++) {
        const numerator = closes[i] - opens[i]; // Close - Open
        const denominator = highs[i] - lows[i]; // High - Low
        rviComponents.push({ numerator, denominator });
    }
    // Calculate RVI as SMA of (numerator/denominator) over period
    let rvi = 0;
    let totalWeight = 0;
    for (let i = Math.max(0, rviComponents.length - period); i < rviComponents.length; i++) {
        const weight = i - Math.max(0, rviComponents.length - period) + 1;
        const ratio = rviComponents[i].denominator > 0 ? rviComponents[i].numerator / rviComponents[i].denominator : 0;
        rvi += ratio * weight;
        totalWeight += weight;
    }
    rvi = totalWeight > 0 ? rvi / totalWeight : 0;
    // Calculate signal line (SMA of RVI)
    const rviValues = calculateRVIHistory(opens, highs, lows, closes, period);
    const signalValues = calculateSMA(rviValues, signalPeriod);
    const signal = signalValues.length > 0 ? signalValues[signalValues.length - 1] : rvi;
    // Get current components
    const currentComponent = rviComponents[rviComponents.length - 1];
    // Determine trend
    let trend = 'neutral';
    if (rvi > 0.1) {
        trend = 'bullish';
    }
    else if (rvi < -0.1) {
        trend = 'bearish';
    }
    // Calculate signal strength
    const strength = Math.min(100, Math.abs(rvi) * 500);
    // Check for crossovers
    let bullishCrossover = false;
    let bearishCrossover = false;
    if (rviValues.length >= signalPeriod + 1) {
        const prevRVI = rviValues[rviValues.length - 2];
        const prevSignalValues = calculateSMA(rviValues.slice(0, -1), signalPeriod);
        const prevSignal = prevSignalValues.length > 0 ? prevSignalValues[prevSignalValues.length - 1] : 0;
        if (prevRVI <= prevSignal && rvi > signal) {
            bullishCrossover = true;
        }
        else if (prevRVI >= prevSignal && rvi < signal) {
            bearishCrossover = true;
        }
    }
    // Check overbought/oversold levels
    const overbought = rvi > 0.8;
    const oversold = rvi < -0.8;
    // Generate trading signal
    let signal_out = 'neutral';
    if (bullishCrossover && rvi > 0) {
        signal_out = 'buy';
    }
    else if (bearishCrossover && rvi < 0) {
        signal_out = 'sell';
    }
    else if (oversold && trend === 'bullish') {
        signal_out = 'buy';
    }
    else if (overbought && trend === 'bearish') {
        signal_out = 'sell';
    }
    return {
        rvi,
        signalLine: signal,
        numerator: currentComponent.numerator,
        denominator: currentComponent.denominator,
        trend,
        strength,
        bullishCrossover,
        bearishCrossover,
        overbought,
        oversold,
        tradingSignal: signal_out
    };
}
/**
 * Helper function to calculate RVI history (non-recursive)
 */
function calculateRVIHistory(opens, highs, lows, closes, period) {
    const rviValues = [];
    // Start from where we have enough data
    for (let i = period; i <= opens.length; i++) {
        // Calculate RVI directly without recursion
        let rvi = 0;
        let totalWeight = 0;
        for (let j = Math.max(0, i - period); j < i; j++) {
            const weight = j - Math.max(0, i - period) + 1;
            const numerator = closes[j] - opens[j];
            const denominator = highs[j] - lows[j];
            const ratio = denominator > 0 ? numerator / denominator : 0;
            rvi += ratio * weight;
            totalWeight += weight;
        }
        rvi = totalWeight > 0 ? rvi / totalWeight : 0;
        rviValues.push(rvi);
    }
    return rviValues;
}
/**
 * Helper function to calculate SMA
 */
function calculateSMA(values, period) {
    const sma = [];
    for (let i = period - 1; i < values.length; i++) {
        const sum = values.slice(i - period + 1, i + 1).reduce((acc, val) => acc + val, 0);
        sma.push(sum / period);
    }
    return sma;
}
/**
 * Get RVI interpretation
 * @param rvi RelativeVigorIndexData object
 * @returns Human-readable interpretation
 */
export function getRVIInterpretation(rvi) {
    const { rvi: value, bullishCrossover, bearishCrossover, overbought, oversold, trend } = rvi;
    let interpretation = `RVI: ${value.toFixed(4)}`;
    if (bullishCrossover) {
        interpretation += ' - Bullish signal crossover';
    }
    else if (bearishCrossover) {
        interpretation += ' - Bearish signal crossover';
    }
    else if (overbought) {
        interpretation += ' - Overbought (potential reversal down)';
    }
    else if (oversold) {
        interpretation += ' - Oversold (potential reversal up)';
    }
    else {
        interpretation += ` - ${trend} momentum`;
    }
    return interpretation;
}
/**
 * Calculate RVI for multiple periods
 * @param opens Array of opening prices
 * @param highs Array of high prices
 * @param lows Array of low prices
 * @param closes Array of closing prices
 * @param periods Array of periods to calculate RVI for
 * @returns Array of RelativeVigorIndexData objects
 */
export function calculateMultipleRVI(opens, highs, lows, closes, periods = [10, 14, 21]) {
    return periods
        .map(period => calculateRelativeVigorIndex(opens, highs, lows, closes, period))
        .filter((rvi) => rvi !== null);
}
/**
 * Analyze RVI momentum divergence
 * @param opens Array of opening prices
 * @param highs Array of high prices
 * @param lows Array of low prices
 * @param closes Array of closing prices
 * @param period RVI period
 * @returns Divergence analysis
 */
export function analyzeRVIDivergence(opens, highs, lows, closes, period = 10) {
    if (closes.length < period * 3) {
        return { divergence: 'none', strength: 0, reliability: 0 };
    }
    const rviHistory = calculateRVIHistory(opens, highs, lows, closes, period);
    if (rviHistory.length < 15) {
        return { divergence: 'none', strength: 0, reliability: 0 };
    }
    // Look for divergence over the last 15 periods
    const recentPrices = closes.slice(-15);
    const recentRVI = rviHistory.slice(-15);
    // Find peaks and troughs
    const pricePeaks = [];
    const priceTroughs = [];
    const rviPeaks = [];
    const rviTroughs = [];
    for (let i = 1; i < recentPrices.length - 1; i++) {
        if (recentPrices[i] > recentPrices[i - 1] && recentPrices[i] > recentPrices[i + 1]) {
            pricePeaks.push(i);
        }
        if (recentPrices[i] < recentPrices[i - 1] && recentPrices[i] < recentPrices[i + 1]) {
            priceTroughs.push(i);
        }
        if (recentRVI[i] > recentRVI[i - 1] && recentRVI[i] > recentRVI[i + 1]) {
            rviPeaks.push(i);
        }
        if (recentRVI[i] < recentRVI[i - 1] && recentRVI[i] < recentRVI[i + 1]) {
            rviTroughs.push(i);
        }
    }
    // Check for bearish divergence (price makes higher high, RVI makes lower high)
    if (pricePeaks.length >= 2 && rviPeaks.length >= 2) {
        const latestPricePeak = Math.max(...pricePeaks.map(i => recentPrices[i]));
        const prevPricePeak = Math.max(...pricePeaks.slice(0, -1).map(i => recentPrices[i]));
        const latestRVIPeak = Math.max(...rviPeaks.map(i => recentRVI[i]));
        const prevRVIPeak = Math.max(...rviPeaks.slice(0, -1).map(i => recentRVI[i]));
        if (latestPricePeak > prevPricePeak && latestRVIPeak < prevRVIPeak) {
            return { divergence: 'bearish', strength: 80, reliability: 75 };
        }
    }
    // Check for bullish divergence (price makes lower low, RVI makes higher low)
    if (priceTroughs.length >= 2 && rviTroughs.length >= 2) {
        const latestPriceTrough = Math.min(...priceTroughs.map(i => recentPrices[i]));
        const prevPriceTrough = Math.min(...priceTroughs.slice(0, -1).map(i => recentPrices[i]));
        const latestRVITrough = Math.min(...rviTroughs.map(i => recentRVI[i]));
        const prevRVITrough = Math.min(...rviTroughs.slice(0, -1).map(i => recentRVI[i]));
        if (latestPriceTrough < prevPriceTrough && latestRVITrough > prevRVITrough) {
            return { divergence: 'bullish', strength: 80, reliability: 75 };
        }
    }
    return { divergence: 'none', strength: 0, reliability: 0 };
}
