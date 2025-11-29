/**
 * True Strength Index (TSI) Indicator
 * Double-smoothed momentum oscillator that reduces noise for clearer signals
 */
/**
 * Calculate True Strength Index
 * @param closes Array of closing prices
 * @param shortPeriod Short EMA period (default 25)
 * @param longPeriod Long EMA period (default 13)
 * @param signalPeriod Signal line period (default 13)
 * @returns TrueStrengthIndexData object
 */
export function calculateTrueStrengthIndex(closes, shortPeriod = 25, longPeriod = 13, signalPeriod = 13) {
    if (closes.length < shortPeriod + longPeriod + signalPeriod) {
        return null;
    }
    // Step 1: Calculate price changes (momentum)
    const priceChanges = [];
    for (let i = 1; i < closes.length; i++) {
        priceChanges.push(closes[i] - closes[i - 1]);
    }
    // Step 2: Calculate double-smoothed momentum
    // First smoothing (short EMA of price changes)
    const firstSmooth = calculateEMA(priceChanges, shortPeriod);
    // Second smoothing (long EMA of first smoothed values)
    const doubleSmooth = calculateEMA(firstSmooth, longPeriod);
    if (!firstSmooth || !doubleSmooth || doubleSmooth.length === 0) {
        return null;
    }
    // Get the current values
    const currentPriceChange = priceChanges[priceChanges.length - 1];
    const smoothedMomentum = firstSmooth[firstSmooth.length - 1];
    const doubleSmoothedMomentum = doubleSmooth[doubleSmooth.length - 1];
    // Step 3: Calculate absolute values for denominator
    const absPriceChanges = [];
    for (let i = 1; i < closes.length; i++) {
        absPriceChanges.push(Math.abs(closes[i] - closes[i - 1]));
    }
    const absFirstSmooth = calculateEMA(absPriceChanges, shortPeriod);
    const absDoubleSmooth = calculateEMA(absFirstSmooth, longPeriod);
    if (!absFirstSmooth || !absDoubleSmooth || absDoubleSmooth.length === 0) {
        return null;
    }
    const absDoubleSmoothedMomentum = absDoubleSmooth[absDoubleSmooth.length - 1];
    // Step 4: Calculate TSI
    // TSI = 100 * (Double Smoothed Momentum / Double Smoothed Absolute Momentum)
    const tsi = absDoubleSmoothedMomentum > 0 ?
        100 * (doubleSmoothedMomentum / absDoubleSmoothedMomentum) : 0;
    // Step 5: Calculate signal line (EMA of TSI)
    const tsiHistory = calculateTSIHistory(closes, shortPeriod, longPeriod);
    const signalValues = calculateEMA(tsiHistory, signalPeriod);
    if (!signalValues || signalValues.length === 0) {
        return null;
    }
    const signal = signalValues[signalValues.length - 1];
    // Determine trend
    let trend = 'neutral';
    if (tsi > 0) {
        trend = 'bullish';
    }
    else if (tsi < 0) {
        trend = 'bearish';
    }
    // Calculate signal strength based on TSI magnitude
    const strength = Math.min(100, Math.abs(tsi) * 4);
    // Check for crossovers
    let bullishCrossover = false;
    let bearishCrossover = false;
    if (tsiHistory.length >= signalPeriod + 1 && signal) {
        const prevTSI = tsiHistory[tsiHistory.length - 2];
        const prevSignalValues = calculateEMA(tsiHistory.slice(0, -1), signalPeriod);
        const prevSignal = prevSignalValues ? prevSignalValues[prevSignalValues.length - 1] : null;
        if (prevSignal !== null && prevTSI <= prevSignal && tsi > signal) {
            bullishCrossover = true;
        }
        else if (prevSignal !== null && prevTSI >= prevSignal && tsi < signal) {
            bearishCrossover = true;
        }
    }
    // Check overbought/oversold levels
    const overbought = tsi > 25;
    const oversold = tsi < -25;
    // Check zero line crosses
    let bullishZeroCross = false;
    let bearishZeroCross = false;
    if (tsiHistory.length >= 2) {
        const prevTSI = tsiHistory[tsiHistory.length - 2];
        if (prevTSI <= 0 && tsi > 0) {
            bullishZeroCross = true;
        }
        else if (prevTSI >= 0 && tsi < 0) {
            bearishZeroCross = true;
        }
    }
    // Generate trading signal
    let signal_out = 'neutral';
    if (bullishCrossover || bullishZeroCross) {
        signal_out = 'buy';
    }
    else if (bearishCrossover || bearishZeroCross) {
        signal_out = 'sell';
    }
    else if (oversold && trend === 'bullish') {
        signal_out = 'buy';
    }
    else if (overbought && trend === 'bearish') {
        signal_out = 'sell';
    }
    // Determine momentum phase
    let momentumPhase = 'stable';
    const momentumChange = doubleSmoothedMomentum - (doubleSmooth.length >= 2 ? doubleSmooth[doubleSmooth.length - 2] : 0);
    if (momentumChange > 0.01) {
        momentumPhase = 'accelerating';
    }
    else if (momentumChange < -0.01) {
        momentumPhase = 'decelerating';
    }
    return {
        tsi,
        signalLine: signal || tsi,
        priceChange: currentPriceChange,
        smoothedMomentum,
        doubleSmoothedMomentum,
        trend,
        strength,
        bullishCrossover,
        bearishCrossover,
        overbought,
        oversold,
        bullishZeroCross,
        bearishZeroCross,
        tradingSignal: signal_out,
        momentumPhase
    };
}
/**
 * Helper function to calculate EMA
 */
function calculateEMA(values, period) {
    if (values.length < period) {
        return [];
    }
    const ema = [];
    const multiplier = 2 / (period + 1);
    // First EMA value is the simple average
    let sum = 0;
    for (let i = 0; i < period; i++) {
        sum += values[i];
    }
    ema.push(sum / period);
    // Calculate subsequent EMA values
    for (let i = period; i < values.length; i++) {
        const currentEMA = (values[i] - ema[ema.length - 1]) * multiplier + ema[ema.length - 1];
        ema.push(currentEMA);
    }
    return ema;
}
/**
 * Helper function to calculate TSI history (non-recursive)
 */
function calculateTSIHistory(closes, shortPeriod, longPeriod) {
    const tsiValues = [];
    // Start from where we have enough data
    for (let i = shortPeriod + longPeriod + 10; i <= closes.length; i++) {
        const slice = closes.slice(0, i);
        // Calculate TSI directly without recursion
        const priceChanges = [];
        for (let j = 1; j < slice.length; j++) {
            priceChanges.push(slice[j] - slice[j - 1]);
        }
        const firstSmooth = calculateEMA(priceChanges, shortPeriod);
        const doubleSmooth = calculateEMA(firstSmooth, longPeriod);
        const absPriceChanges = [];
        for (let j = 1; j < slice.length; j++) {
            absPriceChanges.push(Math.abs(slice[j] - slice[j - 1]));
        }
        const absFirstSmooth = calculateEMA(absPriceChanges, shortPeriod);
        const absDoubleSmooth = calculateEMA(absFirstSmooth, longPeriod);
        if (doubleSmooth.length > 0 && absDoubleSmooth.length > 0) {
            const doubleSmoothedMomentum = doubleSmooth[doubleSmooth.length - 1];
            const absDoubleSmoothedMomentum = absDoubleSmooth[absDoubleSmooth.length - 1];
            const tsi = absDoubleSmoothedMomentum > 0 ?
                100 * (doubleSmoothedMomentum / absDoubleSmoothedMomentum) : 0;
            tsiValues.push(tsi);
        }
    }
    return tsiValues;
}
/**
 * Calculate TSI for multiple parameter combinations
 * @param closes Array of closing prices
 * @param parameterSets Array of [shortPeriod, longPeriod, signalPeriod] combinations
 * @returns Array of TrueStrengthIndexData objects
 */
export function calculateMultipleTSI(closes, parameterSets = [[25, 13, 13], [14, 7, 7]]) {
    return parameterSets
        .map(([shortPeriod, longPeriod, signalPeriod]) => calculateTrueStrengthIndex(closes, shortPeriod, longPeriod, signalPeriod))
        .filter((tsi) => tsi !== null);
}
/**
 * Get TSI interpretation
 * @param tsi TrueStrengthIndexData object
 * @returns Human-readable interpretation
 */
export function getTSIInterpretation(tsi) {
    const { tsi: value, bullishCrossover, bearishCrossover, bullishZeroCross, bearishZeroCross, overbought, oversold, momentumPhase } = tsi;
    let interpretation = `TSI: ${value.toFixed(2)}`;
    if (bullishCrossover) {
        interpretation += ' - Bullish signal crossover';
    }
    else if (bearishCrossover) {
        interpretation += ' - Bearish signal crossover';
    }
    else if (bullishZeroCross) {
        interpretation += ' - Bullish zero line crossover';
    }
    else if (bearishZeroCross) {
        interpretation += ' - Bearish zero line crossover';
    }
    else if (overbought) {
        interpretation += ' - Overbought';
    }
    else if (oversold) {
        interpretation += ' - Oversold';
    }
    else {
        interpretation += ` - ${momentumPhase} momentum`;
    }
    return interpretation;
}
/**
 * Analyze TSI momentum divergence
 * @param tsi TrueStrengthIndexData object
 * @param closes Array of closing prices
 * @returns Divergence analysis
 */
export function analyzeTSIMomentumDivergence(tsi, closes) {
    if (closes.length < 30) {
        return { divergence: 'none', strength: 0, reliability: 0 };
    }
    const tsiHistory = calculateTSIHistory(closes, 25, 13);
    if (tsiHistory.length < 20) {
        return { divergence: 'none', strength: 0, reliability: 0 };
    }
    // Look for divergence over the last 20 periods
    const recentPrices = closes.slice(-20);
    const recentTSI = tsiHistory.slice(-20);
    // Find peaks and troughs
    const pricePeaks = [];
    const priceTroughs = [];
    const tsiPeaks = [];
    const tsiTroughs = [];
    for (let i = 1; i < recentPrices.length - 1; i++) {
        if (recentPrices[i] > recentPrices[i - 1] && recentPrices[i] > recentPrices[i + 1]) {
            pricePeaks.push(i);
        }
        if (recentPrices[i] < recentPrices[i - 1] && recentPrices[i] < recentPrices[i + 1]) {
            priceTroughs.push(i);
        }
        if (recentTSI[i] > recentTSI[i - 1] && recentTSI[i] > recentTSI[i + 1]) {
            tsiPeaks.push(i);
        }
        if (recentTSI[i] < recentTSI[i - 1] && recentTSI[i] < recentTSI[i + 1]) {
            tsiTroughs.push(i);
        }
    }
    // Check for bullish divergence (price makes lower low, TSI makes higher low)
    if (priceTroughs.length >= 2 && tsiTroughs.length >= 2) {
        const latestPriceTrough = recentPrices[priceTroughs[priceTroughs.length - 1]];
        const prevPriceTrough = recentPrices[priceTroughs[priceTroughs.length - 2]];
        const latestTSITrough = recentTSI[tsiTroughs[tsiTroughs.length - 1]];
        const prevTSITrough = recentTSI[tsiTroughs[tsiTroughs.length - 2]];
        if (latestPriceTrough < prevPriceTrough && latestTSITrough > prevTSITrough) {
            return { divergence: 'bullish', strength: 80, reliability: 75 };
        }
    }
    // Check for bearish divergence (price makes higher high, TSI makes lower high)
    if (pricePeaks.length >= 2 && tsiPeaks.length >= 2) {
        const latestPricePeak = recentPrices[pricePeaks[pricePeaks.length - 1]];
        const prevPricePeak = recentPrices[pricePeaks[pricePeaks.length - 2]];
        const latestTSIPeak = recentTSI[tsiPeaks[tsiPeaks.length - 1]];
        const prevTSIPeak = recentTSI[tsiPeaks[tsiPeaks.length - 2]];
        if (latestPricePeak > prevPricePeak && latestTSIPeak < prevTSIPeak) {
            return { divergence: 'bearish', strength: 80, reliability: 75 };
        }
    }
    return { divergence: 'none', strength: 0, reliability: 0 };
}
