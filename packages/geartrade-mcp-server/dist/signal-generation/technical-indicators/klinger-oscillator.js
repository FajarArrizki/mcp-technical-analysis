/**
 * Klinger Oscillator
 * Volume-based momentum indicator that compares short and long-term volume flow
 */
/**
 * Calculate Klinger Oscillator
 * @param highs Array of high prices
 * @param lows Array of low prices
 * @param closes Array of close prices
 * @param volumes Array of volume data
 * @returns KlingerOscillatorData object
 */
export function calculateKlingerOscillator(highs, lows, closes, volumes) {
    if (highs.length !== lows.length || highs.length !== closes.length || highs.length !== volumes.length) {
        return null;
    }
    if (highs.length < 55) { // Need at least 55 periods for long EMA
        return null;
    }
    // Calculate Volume Force (VF) for each period
    const volumeForces = [];
    for (let i = 1; i < highs.length; i++) {
        const high = highs[i];
        const low = lows[i];
        const close = closes[i];
        const prevClose = closes[i - 1];
        const volume = volumes[i];
        // Trend direction: +1 for up, -1 for down
        const trend = close > prevClose ? 1 : close < prevClose ? -1 : 0;
        // Volume Force = Volume * Trend * (2 * (Close - Low) / (High - Low) - 1)
        const range = high - low;
        const vf = range > 0 ?
            volume * trend * (2 * (close - low) / range - 1) :
            0;
        volumeForces.push(vf);
    }
    // Calculate short-term EMA (34 periods) of VF
    const shortEMA = calculateEMA(volumeForces, 34);
    // Calculate long-term EMA (55 periods) of VF
    const longEMA = calculateEMA(volumeForces, 55);
    // Check for valid EMA values (0 is valid, undefined/NaN is not)
    if (shortEMA === undefined || longEMA === undefined || isNaN(shortEMA) || isNaN(longEMA)) {
        return null;
    }
    // Klinger Oscillator = Short EMA - Long EMA
    const klinger = shortEMA - longEMA;
    // Calculate signal line (13-period MA of Klinger)
    const klingerHistory = calculateKlingerHistory(highs, lows, closes, volumes);
    const signal = calculateSMA(klingerHistory, 13);
    // Determine trend
    let trend = 'neutral';
    if (klinger > 0) {
        trend = 'bullish';
    }
    else if (klinger < 0) {
        trend = 'bearish';
    }
    // Check for crossovers
    let bullishCrossover = false;
    let bearishCrossover = false;
    if (klingerHistory.length >= 14) {
        const prevKlinger = klingerHistory[klingerHistory.length - 2];
        const prevSignal = calculateSMA(klingerHistory.slice(0, -1), 13);
        if (prevKlinger <= prevSignal && klinger > signal) {
            bullishCrossover = true;
        }
        else if (prevKlinger >= prevSignal && klinger < signal) {
            bearishCrossover = true;
        }
    }
    // Simple divergence detection
    let divergence = 'none';
    if (closes.length >= 60 && klingerHistory.length >= 30) {
        const recentPrices = closes.slice(-30);
        const prevPrices = closes.slice(-60, -30);
        const recentKlinger = klingerHistory.slice(-30);
        const prevKlinger = calculateKlingerHistory(highs.slice(-60, -30), lows.slice(-60, -30), closes.slice(-60, -30), volumes.slice(-60, -30));
        const recentPricePeak = Math.max(...recentPrices);
        const prevPricePeak = Math.max(...prevPrices);
        const recentKlingerPeak = Math.max(...recentKlinger);
        const prevKlingerPeak = Math.max(...prevKlinger);
        // Bullish divergence: lower price peak but higher Klinger peak
        if (recentPricePeak < prevPricePeak && recentKlingerPeak > prevKlingerPeak) {
            divergence = 'bullish';
        }
        const recentPriceLow = Math.min(...recentPrices);
        const prevPriceLow = Math.min(...prevPrices);
        const recentKlingerLow = Math.min(...recentKlinger);
        const prevKlingerLow = Math.min(...prevKlinger);
        // Bearish divergence: higher price low but lower Klinger low
        if (recentPriceLow > prevPriceLow && recentKlingerLow < prevKlingerLow) {
            divergence = 'bearish';
        }
    }
    // Generate signal
    let signal_out = 'neutral';
    if (bullishCrossover && divergence === 'bullish') {
        signal_out = 'buy';
    }
    else if (bearishCrossover && divergence === 'bearish') {
        signal_out = 'sell';
    }
    else if (bullishCrossover) {
        signal_out = 'buy';
    }
    else if (bearishCrossover) {
        signal_out = 'sell';
    }
    // Get current volume force
    const volumeForce = volumeForces[volumeForces.length - 1];
    return {
        klinger,
        shortEMA,
        longEMA,
        volumeForce,
        trend,
        signalLine: signal || klinger,
        bullishCrossover,
        bearishCrossover,
        divergence,
        tradingSignal: signal_out
    };
}
/**
 * Helper function to calculate EMA
 */
function calculateEMA(values, period) {
    if (values.length < period)
        return 0;
    const multiplier = 2 / (period + 1);
    let ema = values[0];
    for (let i = 1; i < values.length; i++) {
        ema = (values[i] - ema) * multiplier + ema;
    }
    return ema;
}
/**
 * Helper function to calculate SMA
 */
function calculateSMA(values, period) {
    if (values.length < period) {
        return values.reduce((sum, val) => sum + val, 0) / values.length;
    }
    const sum = values.slice(-period).reduce((acc, val) => acc + val, 0);
    return sum / period;
}
/**
 * Helper function to calculate Klinger history (non-recursive)
 */
function calculateKlingerHistory(highs, lows, closes, volumes) {
    const klingerValues = [];
    // Start from where we have enough data
    for (let i = 55; i <= highs.length; i++) {
        const sliceHighs = highs.slice(0, i);
        const sliceLows = lows.slice(0, i);
        const sliceCloses = closes.slice(0, i);
        const sliceVolumes = volumes.slice(0, i);
        // Calculate Klinger directly without recursion
        const volumeForces = [];
        for (let j = 1; j < sliceHighs.length; j++) {
            const high = sliceHighs[j];
            const low = sliceLows[j];
            const close = sliceCloses[j];
            const prevClose = sliceCloses[j - 1];
            const volume = sliceVolumes[j];
            const trend = close > prevClose ? 1 : close < prevClose ? -1 : 0;
            const range = high - low;
            const vf = range > 0 ? volume * trend * (2 * (close - low) / range - 1) : 0;
            volumeForces.push(vf);
        }
        const shortEMA = calculateEMA(volumeForces, 34);
        const longEMA = calculateEMA(volumeForces, 55);
        if (shortEMA && longEMA) {
            const klinger = shortEMA - longEMA;
            klingerValues.push(klinger);
        }
    }
    return klingerValues;
}
/**
 * Get Klinger Oscillator interpretation
 * @param klinger KlingerOscillatorData object
 * @returns Human-readable interpretation
 */
export function getKlingerInterpretation(klinger) {
    const { klinger: value, bullishCrossover, bearishCrossover, divergence } = klinger;
    if (bullishCrossover) {
        return `Bullish crossover - potential buy signal (${value.toFixed(2)})`;
    }
    if (bearishCrossover) {
        return `Bearish crossover - potential sell signal (${value.toFixed(2)})`;
    }
    if (divergence === 'bullish') {
        return `Bullish divergence - potential buy signal (${value.toFixed(2)})`;
    }
    if (divergence === 'bearish') {
        return `Bearish divergence - potential sell signal (${value.toFixed(2)})`;
    }
    if (value > 0) {
        return `Bullish volume momentum (${value.toFixed(2)})`;
    }
    if (value < 0) {
        return `Bearish volume momentum (${value.toFixed(2)})`;
    }
    return `Neutral volume momentum (${value.toFixed(2)})`;
}
/**
 * Calculate volume flow strength
 * @param klinger KlingerOscillatorData object
 * @returns Volume flow strength rating (0-100)
 */
export function getKlingerVolumeStrength(klinger) {
    const { volumeForce, shortEMA, longEMA } = klinger;
    // Strength based on volume force magnitude and EMA separation
    const vfStrength = Math.min(50, Math.abs(volumeForce) / 1000000); // Normalize volume force
    const emaSeparation = Math.abs(shortEMA - longEMA);
    const separationStrength = Math.min(50, emaSeparation / 100000);
    return vfStrength + separationStrength;
}
