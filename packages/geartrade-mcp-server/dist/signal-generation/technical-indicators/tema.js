/**
 * Triple Exponential Moving Average (TEMA) Indicator
 * Moving average designed to further reduce lag compared to DEMA
 */
import { calculateEMA } from './moving-averages';
export function calculateTEMA(closes, period = 20) {
    if (closes.length < period * 3)
        return [];
    const tema = [];
    // Calculate EMA(n)
    const ema1 = calculateEMA(closes, period);
    // Calculate EMA(EMA(n))
    const ema2 = calculateEMA(ema1, period);
    // Calculate EMA(EMA(EMA(n)))
    const ema3 = calculateEMA(ema2, period);
    // TEMA = 3 × EMA(n) - 3 × EMA(EMA(n)) + EMA(EMA(EMA(n)))
    for (let i = 0; i < ema3.length; i++) {
        const temaValue = 3 * ema1[i + 2 * (period - 1)] - 3 * ema2[i + period - 1] + ema3[i];
        tema.push(temaValue);
    }
    return tema;
}
