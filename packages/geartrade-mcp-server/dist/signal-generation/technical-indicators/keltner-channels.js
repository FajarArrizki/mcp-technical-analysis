/**
 * Keltner Channels Indicator
 * Volatility-based channels using ATR around EMA
 */
import { calculateEMA } from './moving-averages';
import { calculateATR } from './volatility';
export function calculateKeltnerChannels(highs, lows, closes, emaPeriod = 20, atrPeriod = 14, multiplier = 2) {
    // Minimum 5 data points required
    if (closes.length < 5) {
        return {
            middle: null,
            upper: null,
            lower: null,
            bandwidth: null,
            position: null,
            trend: null,
        };
    }
    // Use adaptive periods
    const effectiveEmaPeriod = Math.min(emaPeriod, closes.length);
    const effectiveAtrPeriod = Math.min(atrPeriod, closes.length - 1);
    // Calculate EMA for middle line
    const ema = calculateEMA(closes, effectiveEmaPeriod);
    let currentEMA = ema[ema.length - 1];
    if (!currentEMA) {
        // Fallback: use simple average
        currentEMA = closes.slice(-effectiveEmaPeriod).reduce((a, b) => a + b, 0) / effectiveEmaPeriod;
    }
    // Calculate ATR
    const atr = calculateATR(highs, lows, closes, effectiveAtrPeriod);
    let currentATR = atr[atr.length - 1];
    if (!currentATR) {
        // Fallback: calculate simple ATR
        let trSum = 0;
        for (let i = 1; i < Math.min(effectiveAtrPeriod + 1, closes.length); i++) {
            const tr = Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1]));
            trSum += tr;
        }
        currentATR = trSum / Math.max(1, Math.min(effectiveAtrPeriod, closes.length - 1));
    }
    // Calculate channels
    const upper = currentEMA + (multiplier * currentATR);
    const lower = currentEMA - (multiplier * currentATR);
    const bandwidth = (upper - lower) / currentEMA;
    // Determine trend (expanding/contracting based on ATR change)
    let trend = null;
    if (atr.length >= 2) {
        const currentATR = atr[atr.length - 1];
        const previousATR = atr[atr.length - 2];
        const atrChange = (currentATR - previousATR) / previousATR;
        if (atrChange > 0.05)
            trend = 'expanding'; // ATR increased > 5%
        else if (atrChange < -0.05)
            trend = 'contracting'; // ATR decreased > 5%
        else
            trend = 'stable';
    }
    return {
        middle: currentEMA,
        upper,
        lower,
        bandwidth,
        position: null, // Will be set by caller with current price
        trend,
    };
}
