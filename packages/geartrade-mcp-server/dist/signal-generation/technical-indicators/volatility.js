/**
 * Volatility Indicators
 * ATR, Bollinger Bands calculations
 */
import { calculateSMA } from './moving-averages';
export function calculateBollingerBands(closes, period = 20, stdDev = 2) {
    if (closes.length === 0)
        return [];
    // Use adaptive period for small datasets
    const effectivePeriod = Math.min(period, closes.length);
    const bands = [];
    const sma = calculateSMA(closes, effectivePeriod);
    for (let i = effectivePeriod - 1; i < closes.length; i++) {
        const periodCloses = closes.slice(i - effectivePeriod + 1, i + 1);
        const mean = sma[i - effectivePeriod + 1];
        // Calculate standard deviation
        const variance = periodCloses.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / effectivePeriod;
        const standardDeviation = Math.sqrt(variance);
        bands.push({
            upper: mean + (stdDev * standardDeviation),
            middle: mean,
            lower: mean - (stdDev * standardDeviation)
        });
    }
    return bands;
}
export function calculateATR(highs, lows, closes, period = 14) {
    // Need at least 2 data points to calculate true range
    if (highs.length < 2 || lows.length < 2 || closes.length < 2) {
        return [];
    }
    // Use adaptive period for small datasets
    const effectivePeriod = Math.min(period, closes.length - 1);
    const trueRanges = [];
    // Calculate True Range for each period
    for (let i = 1; i < closes.length; i++) {
        const high = highs[i];
        const low = lows[i];
        const prevClose = closes[i - 1];
        // True Range = max(high - low, abs(high - prevClose), abs(low - prevClose))
        const tr1 = high - low;
        const tr2 = Math.abs(high - prevClose);
        const tr3 = Math.abs(low - prevClose);
        const trueRange = Math.max(tr1, tr2, tr3);
        trueRanges.push(trueRange);
    }
    if (trueRanges.length === 0) {
        return [];
    }
    // Calculate ATR as SMA of True Ranges
    const atr = [];
    let sum = 0;
    // Initial ATR = average of first effectivePeriod true ranges
    const initialPeriod = Math.min(effectivePeriod, trueRanges.length);
    for (let i = 0; i < initialPeriod; i++) {
        sum += trueRanges[i];
    }
    atr.push(sum / initialPeriod);
    // Subsequent ATR values use Wilder's smoothing method (exponential moving average)
    for (let i = initialPeriod; i < trueRanges.length; i++) {
        const currentATR = ((atr[atr.length - 1] * (effectivePeriod - 1)) + trueRanges[i]) / effectivePeriod;
        atr.push(currentATR);
    }
    return atr;
}
