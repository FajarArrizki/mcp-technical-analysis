/**
 * SuperTrend Indicator
 * Trend-following indicator using ATR for trailing stops
 */
import { calculateATR } from './volatility';
export function calculateSuperTrend(highs, lows, closes, atrPeriod = 14, multiplier = 3) {
    // Minimum 5 data points required
    if (highs.length < 5 || lows.length < 5 || closes.length < 5) {
        return {
            superTrend: null,
            trend: null,
            signal: null,
            upperBand: null,
            lowerBand: null,
            atr: null,
        };
    }
    // Use adaptive period
    const effectiveAtrPeriod = Math.min(atrPeriod, closes.length - 1);
    // Calculate ATR
    const atr = calculateATR(highs, lows, closes, effectiveAtrPeriod);
    // Fallback if ATR calculation fails
    if (atr.length === 0) {
        // Calculate simple ATR manually
        const simpleAtr = [];
        for (let i = 1; i < closes.length; i++) {
            const tr = Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1]));
            simpleAtr.push(tr);
        }
        if (simpleAtr.length > 0) {
            atr.push(...simpleAtr);
        }
    }
    const currentATR = atr[atr.length - 1] || (highs[highs.length - 1] - lows[lows.length - 1]);
    // Calculate Basic Bands
    const basicUpperBands = [];
    const basicLowerBands = [];
    const finalUpperBands = [];
    const finalLowerBands = [];
    const superTrends = [];
    // Start from index 1 at minimum, but prefer effectiveAtrPeriod if we have enough data
    const startIdx = Math.min(Math.max(1, effectiveAtrPeriod), closes.length - 1);
    for (let i = startIdx; i < closes.length; i++) {
        const hl2 = (highs[i] + lows[i]) / 2;
        const atrIdx = Math.max(0, i - startIdx);
        const atrValue = atr[atrIdx] || currentATR;
        const basicUpper = hl2 + (multiplier * atrValue);
        const basicLower = hl2 - (multiplier * atrValue);
        basicUpperBands.push(basicUpper);
        basicLowerBands.push(basicLower);
        // Calculate Final Bands
        let finalUpper;
        let finalLower;
        if (i === startIdx) {
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
        if (i === startIdx) {
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
    // Ensure we have calculated values
    if (superTrends.length === 0 || finalUpperBands.length === 0 || finalLowerBands.length === 0) {
        // Fallback: calculate simple values
        const hl2 = (highs[highs.length - 1] + lows[lows.length - 1]) / 2;
        const fallbackUpper = hl2 + (multiplier * currentATR);
        const fallbackLower = hl2 - (multiplier * currentATR);
        const fallbackSuperTrend = closes[closes.length - 1] > hl2 ? fallbackLower : fallbackUpper;
        return {
            superTrend: fallbackSuperTrend,
            trend: closes[closes.length - 1] > hl2 ? 'bullish' : 'bearish',
            signal: closes[closes.length - 1] > hl2 ? 'buy' : 'sell',
            upperBand: fallbackUpper,
            lowerBand: fallbackLower,
            atr: currentATR,
        };
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
