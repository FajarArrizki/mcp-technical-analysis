/**
 * SuperTrend Indicator
 * Trend-following indicator using ATR for trailing stops
 */
import { calculateATR } from './volatility';
export function calculateSuperTrend(highs, lows, closes, atrPeriod = 14, multiplier = 3) {
    if (highs.length < atrPeriod + 1 || lows.length < atrPeriod + 1 || closes.length < atrPeriod + 1) {
        return {
            superTrend: null,
            trend: null,
            signal: null,
            upperBand: null,
            lowerBand: null,
            atr: null,
        };
    }
    // Calculate ATR
    const atr = calculateATR(highs, lows, closes, atrPeriod);
    const currentATR = atr[atr.length - 1];
    if (!currentATR) {
        return {
            superTrend: null,
            trend: null,
            signal: null,
            upperBand: null,
            lowerBand: null,
            atr: null,
        };
    }
    // Calculate Basic Bands
    const basicUpperBands = [];
    const basicLowerBands = [];
    const finalUpperBands = [];
    const finalLowerBands = [];
    const superTrends = [];
    for (let i = atrPeriod; i < closes.length; i++) {
        const hl2 = (highs[i] + lows[i]) / 2;
        const basicUpper = hl2 + (multiplier * atr[i - atrPeriod + 1]);
        const basicLower = hl2 - (multiplier * atr[i - atrPeriod + 1]);
        basicUpperBands.push(basicUpper);
        basicLowerBands.push(basicLower);
        // Calculate Final Bands
        let finalUpper;
        let finalLower;
        if (i === atrPeriod) {
            // First calculation
            finalUpper = basicUpper;
            finalLower = basicLower;
        }
        else {
            // Subsequent calculations
            const prevFinalUpper = finalUpperBands[finalUpperBands.length - 1];
            const prevFinalLower = finalLowerBands[finalLowerBands.length - 1];
            const prevClose = closes[i - 1];
            finalUpper = (basicUpper < prevFinalUpper || prevClose > prevFinalUpper) ? basicUpper : prevFinalUpper;
            finalLower = (basicLower > prevFinalLower || prevClose < prevFinalLower) ? basicLower : prevFinalLower;
        }
        finalUpperBands.push(finalUpper);
        finalLowerBands.push(finalLower);
        // Calculate SuperTrend
        let superTrend;
        if (i === atrPeriod) {
            // First SuperTrend
            superTrend = closes[i] > finalUpper ? finalLower : finalUpper;
        }
        else {
            // Subsequent SuperTrends
            const prevSuperTrend = superTrends[superTrends.length - 1];
            const prevFinalUpper = finalUpperBands[finalUpperBands.length - 2];
            const currentClose = closes[i];
            if (prevSuperTrend === prevFinalUpper) {
                // Previous trend was bearish
                superTrend = currentClose > finalUpper ? finalLower : finalUpper;
            }
            else {
                // Previous trend was bullish
                superTrend = currentClose < finalLower ? finalUpper : finalLower;
            }
        }
        superTrends.push(superTrend);
    }
    const currentSuperTrend = superTrends[superTrends.length - 1];
    const currentUpperBand = finalUpperBands[finalUpperBands.length - 1];
    const currentLowerBand = finalLowerBands[finalLowerBands.length - 1];
    const currentClose = closes[closes.length - 1];
    // Determine trend and signal
    let trend = null;
    let signal = null;
    if (currentSuperTrend === currentLowerBand) {
        trend = 'bullish';
        signal = 'buy';
    }
    else if (currentSuperTrend === currentUpperBand) {
        trend = 'bearish';
        signal = 'sell';
    }
    else {
        trend = null;
        signal = 'hold';
    }
    return {
        superTrend: currentSuperTrend,
        trend,
        signal,
        upperBand: currentUpperBand,
        lowerBand: currentLowerBand,
        atr: currentATR,
    };
}
