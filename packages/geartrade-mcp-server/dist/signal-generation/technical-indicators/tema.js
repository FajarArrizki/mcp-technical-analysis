/**
 * Triple Exponential Moving Average (TEMA) Indicator
 * Moving average designed to further reduce lag compared to DEMA
 */
import { calculateEMA } from './moving-averages';
export function calculateTEMA(closes, period = 20) {
    if (closes.length < 4)
        return [];
    // Use adaptive period if data is insufficient
    const effectivePeriod = Math.min(period, Math.max(2, Math.floor(closes.length / 3)));
    const tema = [];
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
    // Calculate EMA(EMA(EMA(n)))
    const ema3 = calculateEMA(ema2, Math.min(effectivePeriod, ema2.length));
    if (ema3.length === 0) {
        // Fallback: use DEMA calculation
        const demaValue = 2 * ema1[ema1.length - 1] - ema2[ema2.length - 1];
        return [demaValue];
    }
    // TEMA = 3 × EMA(n) - 3 × EMA(EMA(n)) + EMA(EMA(EMA(n)))
    const offset1 = ema1.length - ema3.length;
    const offset2 = ema2.length - ema3.length;
    for (let i = 0; i < ema3.length; i++) {
        const ema1Idx = i + offset1;
        const ema2Idx = i + offset2;
        if (ema1Idx >= 0 && ema1Idx < ema1.length && ema2Idx >= 0 && ema2Idx < ema2.length) {
            const temaValue = 3 * ema1[ema1Idx] - 3 * ema2[ema2Idx] + ema3[i];
            tema.push(temaValue);
        }
    }
    return tema.length > 0 ? tema : [closes[closes.length - 1]];
}
