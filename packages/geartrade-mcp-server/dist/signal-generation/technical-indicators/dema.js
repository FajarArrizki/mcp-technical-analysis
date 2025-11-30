/**
 * Double Exponential Moving Average (DEMA) Indicator
 * Moving average designed to reduce lag
 */
import { calculateEMA } from './moving-averages';
export function calculateDEMA(closes, period = 20) {
    if (closes.length < 3)
        return [];
    // Use adaptive period if data is insufficient
    const effectivePeriod = Math.min(period, Math.max(2, Math.floor(closes.length / 2)));
    const dema = [];
    // Calculate EMA(n)
    const ema1 = calculateEMA(closes, effectivePeriod);
    if (ema1.length === 0) {
        // Fallback: return last close
        return [closes[closes.length - 1]];
    }
    // Calculate EMA(EMA(n))
    const ema2 = calculateEMA(ema1, Math.min(effectivePeriod, ema1.length));
    if (ema2.length === 0) {
        // Fallback: return last EMA value
        return [ema1[ema1.length - 1]];
    }
    // DEMA = 2 × EMA(n) - EMA(EMA(n))
    const offset = ema1.length - ema2.length;
    for (let i = 0; i < ema2.length; i++) {
        const ema1Idx = i + offset;
        if (ema1Idx >= 0 && ema1Idx < ema1.length) {
            const demaValue = 2 * ema1[ema1Idx] - ema2[i];
            dema.push(demaValue);
        }
    }
    return dema.length > 0 ? dema : [closes[closes.length - 1]];
}
