/**
 * TRIX (Triple Smoothed EMA) Indicator
 * Triple exponentially smoothed moving average momentum oscillator
 */
import { calculateEMA } from './moving-averages';
export function calculateTRIX(closes, period = 15, signalPeriod = 9) {
    if (closes.length < period * 3 + signalPeriod) {
        return {
            trix: null,
            trixLine: null,
            signal: null,
            trend: null,
        };
    }
    // Calculate triple EMA
    const ema1 = calculateEMA(closes, period);
    const ema2 = calculateEMA(ema1, period);
    const ema3 = calculateEMA(ema2, period);
    if (ema3.length < 2) {
        return {
            trix: null,
            trixLine: null,
            signal: null,
            trend: null,
        };
    }
    // Calculate TRIX line: (EMA3_t - EMA3_t-1) / EMA3_t-1
    const trixLine = [];
    for (let i = 1; i < ema3.length; i++) {
        const currentEMA3 = ema3[i];
        const previousEMA3 = ema3[i - 1];
        if (previousEMA3 !== 0) {
            const trixValue = ((currentEMA3 - previousEMA3) / previousEMA3) * 100;
            trixLine.push(trixValue);
        }
    }
    if (trixLine.length === 0) {
        return {
            trix: null,
            trixLine: null,
            signal: null,
            trend: null,
        };
    }
    // Get current TRIX value
    const currentTrix = trixLine[trixLine.length - 1];
    // Calculate signal using signal period
    let signal = null;
    if (trixLine.length >= signalPeriod) {
        const recentTrix = trixLine.slice(-signalPeriod);
        const recentAvg = recentTrix.reduce((sum, val) => sum + val, 0) / signalPeriod;
        if (currentTrix > recentAvg * 1.01)
            signal = 'bullish'; // Above moving average
        else if (currentTrix < recentAvg * 0.99)
            signal = 'bearish'; // Below moving average
        else
            signal = 'neutral';
    }
    // Determine trend based on TRIX direction
    let trend = null;
    if (trixLine.length >= 3) {
        const recent = trixLine.slice(-3);
        const isIncreasing = recent[2] > recent[1] && recent[1] > recent[0];
        const isDecreasing = recent[2] < recent[1] && recent[1] < recent[0];
        if (isIncreasing)
            trend = 'uptrend';
        else if (isDecreasing)
            trend = 'downtrend';
        else
            trend = 'sideways';
    }
    return {
        trix: currentTrix,
        trixLine: currentTrix,
        signal,
        trend,
    };
}
