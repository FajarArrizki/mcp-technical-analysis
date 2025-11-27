/**
 * Keltner Channels Indicator
 * Volatility-based channels using ATR around EMA
 */
import { calculateEMA } from './moving-averages';
import { calculateATR } from './volatility';
export function calculateKeltnerChannels(highs, lows, closes, emaPeriod = 20, atrPeriod = 14, multiplier = 2) {
    if (closes.length < Math.max(emaPeriod, atrPeriod + 1)) {
        return {
            middle: null,
            upper: null,
            lower: null,
            bandwidth: null,
            position: null,
            trend: null,
        };
    }
    // Calculate EMA for middle line
    const ema = calculateEMA(closes, emaPeriod);
    const currentEMA = ema[ema.length - 1];
    if (!currentEMA) {
        return {
            middle: null,
            upper: null,
            lower: null,
            bandwidth: null,
            position: null,
            trend: null,
        };
    }
    // Calculate ATR
    const atr = calculateATR(highs, lows, closes, atrPeriod);
    const currentATR = atr[atr.length - 1];
    if (!currentATR) {
        return {
            middle: currentEMA,
            upper: null,
            lower: null,
            bandwidth: null,
            position: null,
            trend: null,
        };
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
