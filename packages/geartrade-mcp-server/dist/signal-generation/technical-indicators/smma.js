/**
 * Smoothed Moving Average (SMMA) Indicator
 * Moving average with different smoothing method than EMA
 */
import { calculateSMA } from './moving-averages';
export function calculateSMMA(closes, period = 14) {
    if (closes.length < period)
        return [];
    const smma = [];
    // First SMMA value is SMA
    const firstSMA = calculateSMA(closes.slice(0, period), period);
    if (firstSMA.length > 0) {
        smma.push(firstSMA[0]);
    }
    // Subsequent SMMA values: SMMA = (SMMA_prev * (period - 1) + close_current) / period
    for (let i = period; i < closes.length; i++) {
        const prevSMMA = smma[smma.length - 1];
        const currentClose = closes[i];
        const currentSMMA = (prevSMMA * (period - 1) + currentClose) / period;
        smma.push(currentSMMA);
    }
    return smma;
}
