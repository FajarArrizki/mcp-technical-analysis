/**
 * Percentage Price Oscillator (PPO) Indicator
 * MACD expressed as a percentage for better comparability across assets
 */
/**
 * Calculate Percentage Price Oscillator
 * @param closes Array of closing prices
 * @param fastPeriod Fast EMA period (default 12)
 * @param slowPeriod Slow EMA period (default 26)
 * @param signalPeriod Signal line period (default 9)
 * @returns PercentagePriceOscillatorData object
 */
export function calculatePercentagePriceOscillator(closes, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    // Minimum 10 data points required
    if (closes.length < 10) {
        return null;
    }
    // Adjust periods if not enough data - use adaptive periods
    const effectiveSlowPeriod = Math.min(slowPeriod, Math.floor(closes.length * 0.6));
    const effectiveFastPeriod = Math.min(fastPeriod, Math.floor(effectiveSlowPeriod / 2));
    const effectiveSignalPeriod = Math.min(signalPeriod, Math.floor(closes.length * 0.2));
    // Calculate fast and slow EMAs using effective periods
    const fastEMA = calculateEMA(closes, effectiveFastPeriod);
    const slowEMA = calculateEMA(closes, effectiveSlowPeriod);
    if (!fastEMA || !slowEMA || fastEMA.length === 0 || slowEMA.length === 0) {
        return null;
    }
    // Calculate PPO: ((Fast EMA - Slow EMA) / Slow EMA) * 100
    // Use the last values from each EMA array
    const lastFastEMA = fastEMA[fastEMA.length - 1];
    const lastSlowEMA = slowEMA[slowEMA.length - 1];
    if (lastSlowEMA === 0) {
        return null;
    }
    const ppo = ((lastFastEMA - lastSlowEMA) / lastSlowEMA) * 100;
    // Calculate signal line (EMA of PPO values) using effective periods
    const ppoHistory = calculatePPOHistory(closes, effectiveFastPeriod, effectiveSlowPeriod);
    const signalValues = calculateEMA(ppoHistory, Math.max(2, effectiveSignalPeriod));
    if (!signalValues || signalValues.length === 0) {
        return null;
    }
    // Get the most recent signal value
    const signal = signalValues[signalValues.length - 1];
    // Calculate histogram
    const histogram = ppo - signal;
    // Determine trend
    let trend = 'neutral';
    if (ppo > 0) {
        trend = 'bullish';
    }
    else if (ppo < 0) {
        trend = 'bearish';
    }
    // Calculate signal strength based on PPO magnitude
    const strength = Math.min(100, Math.abs(ppo) * 10);
    // Check for crossovers
    let bullishCrossover = false;
    let bearishCrossover = false;
    if (ppoHistory.length >= signalPeriod + 1 && signal) {
        const prevPPO = ppoHistory[ppoHistory.length - 2];
        const prevSignalValues = calculateEMA(ppoHistory.slice(0, -1), signalPeriod);
        const prevSignal = prevSignalValues ? prevSignalValues[prevSignalValues.length - 1] : null;
        if (prevSignal !== null && prevPPO <= prevSignal && ppo > signal) {
            bullishCrossover = true;
        }
        else if (prevSignal !== null && prevPPO >= prevSignal && ppo < signal) {
            bearishCrossover = true;
        }
    }
    // Check zero line crosses
    let bullishZeroCross = false;
    let bearishZeroCross = false;
    if (ppoHistory.length >= 2) {
        const prevPPO = ppoHistory[ppoHistory.length - 2];
        if (prevPPO <= 0 && ppo > 0) {
            bullishZeroCross = true;
        }
        else if (prevPPO >= 0 && ppo < 0) {
            bearishZeroCross = true;
        }
    }
    // Simple divergence detection
    let divergence = 'none';
    if (closes.length >= 30 && ppoHistory.length >= 15) {
        const recentPrices = closes.slice(-15);
        const recentPPO = ppoHistory.slice(-15);
        // Check for price peak vs PPO peak divergence
        const pricePeak = Math.max(...recentPrices);
        const ppoPeak = Math.max(...recentPPO);
        const pricePeakIndex = recentPrices.indexOf(pricePeak);
        const ppoPeakIndex = recentPPO.indexOf(ppoPeak);
        // Bullish divergence: price makes lower peak but PPO makes higher peak
        if (pricePeakIndex > 7 && ppoPeakIndex > 7) { // Recent peaks
            const olderPricePeak = Math.max(...recentPrices.slice(0, 7));
            const olderPPOPeak = Math.max(...recentPPO.slice(0, 7));
            if (pricePeak < olderPricePeak && ppoPeak > olderPPOPeak) {
                divergence = 'bullish';
            }
            else if (pricePeak > olderPricePeak && ppoPeak < olderPPOPeak) {
                divergence = 'bearish';
            }
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
    else if (divergence === 'bullish') {
        signal_out = 'buy';
    }
    else if (divergence === 'bearish') {
        signal_out = 'sell';
    }
    return {
        ppo,
        signalLine: signal,
        histogram,
        trend,
        strength,
        bullishCrossover,
        bearishCrossover,
        bullishZeroCross,
        bearishZeroCross,
        divergence,
        tradingSignal: signal_out
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
 * Helper function to calculate PPO history (non-recursive)
 */
function calculatePPOHistory(closes, fastPeriod, slowPeriod) {
    const ppoValues = [];
    // Start from where we have enough data
    for (let i = slowPeriod; i <= closes.length; i++) {
        const slice = closes.slice(0, i);
        // Calculate PPO directly without recursion
        const fastEMA = calculateEMA(slice, fastPeriod);
        const slowEMA = calculateEMA(slice, slowPeriod);
        if (fastEMA.length > 0 && slowEMA.length > 0 && slowEMA[slowEMA.length - 1] !== 0) {
            const ppo = ((fastEMA[fastEMA.length - 1] - slowEMA[slowEMA.length - 1]) / slowEMA[slowEMA.length - 1]) * 100;
            ppoValues.push(ppo);
        }
    }
    return ppoValues;
}
/**
 * Calculate PPO for multiple parameter combinations
 * @param closes Array of closing prices
 * @param parameterSets Array of [fastPeriod, slowPeriod, signalPeriod] combinations
 * @returns Array of PercentagePriceOscillatorData objects
 */
export function calculateMultiplePPO(closes, parameterSets = [[12, 26, 9], [5, 13, 5]]) {
    return parameterSets
        .map(([fastPeriod, slowPeriod, signalPeriod]) => calculatePercentagePriceOscillator(closes, fastPeriod, slowPeriod, signalPeriod))
        .filter((ppo) => ppo !== null);
}
/**
 * Get PPO interpretation
 * @param ppo PercentagePriceOscillatorData object
 * @returns Human-readable interpretation
 */
export function getPPOInterpretation(ppo) {
    const { ppo: value, bullishCrossover, bearishCrossover, bullishZeroCross, bearishZeroCross, divergence, histogram } = ppo;
    let interpretation = `PPO: ${value.toFixed(2)}%`;
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
    else {
        interpretation += ` - Histogram: ${histogram.toFixed(4)}`;
    }
    if (divergence !== 'none') {
        interpretation += ` - ${divergence} divergence`;
    }
    return interpretation;
}
/**
 * Calculate PPO momentum strength
 * @param ppo PercentagePriceOscillatorData object
 * @returns Momentum strength analysis
 */
export function calculatePPOMomentumStrength(ppo) {
    const { strength, bullishCrossover, bearishCrossover, divergence } = ppo;
    let momentumStrength = strength;
    let trendReliability = 50;
    // Boost strength for crossovers and divergences
    if (bullishCrossover || bearishCrossover) {
        momentumStrength += 20;
        trendReliability += 25;
    }
    if (divergence !== 'none') {
        momentumStrength += 15;
        trendReliability += 20;
    }
    momentumStrength = Math.min(100, momentumStrength);
    trendReliability = Math.min(100, trendReliability);
    let signalQuality = 'fair';
    if (momentumStrength > 80 && trendReliability > 80) {
        signalQuality = 'excellent';
    }
    else if (momentumStrength > 60 && trendReliability > 60) {
        signalQuality = 'good';
    }
    else if (momentumStrength < 30 || trendReliability < 30) {
        signalQuality = 'poor';
    }
    return { momentumStrength, trendReliability, signalQuality };
}
