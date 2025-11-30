/**
 * Momentum Indicators
 * RSI, MACD, Stochastic, CCI, Williams %R calculations
 */
import { calculateEMA } from './moving-averages';
export function calculateRSI(closes, period = 14) {
    // Minimum 5 data points required
    if (closes.length < 5)
        return [];
    // Use adaptive period
    const effectivePeriod = Math.min(period, closes.length - 1);
    const rsi = [];
    const gains = [];
    const losses = [];
    // Calculate price changes
    for (let i = 1; i < closes.length; i++) {
        const change = closes[i] - closes[i - 1];
        gains.push(change > 0 ? change : 0);
        losses.push(change < 0 ? Math.abs(change) : 0);
    }
    // Calculate initial average gain and loss using effective period
    let avgGain = gains.slice(0, effectivePeriod).reduce((a, b) => a + b, 0) / effectivePeriod;
    let avgLoss = losses.slice(0, effectivePeriod).reduce((a, b) => a + b, 0) / effectivePeriod;
    // Calculate RSI
    for (let i = effectivePeriod; i < gains.length; i++) {
        if (avgLoss === 0) {
            rsi.push(100);
        }
        else {
            const rs = avgGain / avgLoss;
            const currentRSI = 100 - (100 / (1 + rs));
            rsi.push(currentRSI);
        }
        // Update averages
        avgGain = (avgGain * (effectivePeriod - 1) + gains[i]) / effectivePeriod;
        avgLoss = (avgLoss * (effectivePeriod - 1) + losses[i]) / effectivePeriod;
    }
    return rsi;
}
export function calculateMACD(closes, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    // Minimum 10 data points required
    if (closes.length < 10)
        return [];
    // Use adaptive periods
    const dataRatio = Math.min(1, closes.length / 35);
    const effectiveSlowPeriod = Math.max(5, Math.floor(slowPeriod * dataRatio));
    const effectiveFastPeriod = Math.max(3, Math.floor(fastPeriod * dataRatio));
    const effectiveSignalPeriod = Math.max(3, Math.floor(signalPeriod * dataRatio));
    const fastEMA = calculateEMA(closes, effectiveFastPeriod);
    const slowEMA = calculateEMA(closes, effectiveSlowPeriod);
    if (fastEMA.length === 0 || slowEMA.length === 0)
        return [];
    // Align arrays (slowEMA starts later)
    const macdLine = [];
    const startIdx = Math.max(0, effectiveSlowPeriod - effectiveFastPeriod);
    for (let i = 0; i < slowEMA.length; i++) {
        if (fastEMA[startIdx + i] !== undefined) {
            macdLine.push(fastEMA[startIdx + i] - slowEMA[i]);
        }
    }
    if (macdLine.length === 0)
        return [];
    // Calculate signal line (EMA of MACD line) using effective period
    const signalLine = calculateEMA(macdLine, effectiveSignalPeriod);
    if (signalLine.length === 0) {
        // Fallback: return MACD without signal
        return macdLine.map(m => ({ MACD: m, signal: m, histogram: 0 }));
    }
    // Calculate histogram
    const histogram = [];
    const signalStartIdx = Math.max(0, effectiveSignalPeriod - 1);
    for (let i = 0; i < signalLine.length; i++) {
        if (macdLine[signalStartIdx + i] !== undefined) {
            histogram.push({
                MACD: macdLine[signalStartIdx + i],
                signal: signalLine[i],
                histogram: macdLine[signalStartIdx + i] - signalLine[i]
            });
        }
    }
    return histogram;
}
export function calculateStochastic(highs, lows, closes, kPeriod = 14, dPeriod = 3) {
    // Minimum 5 data points required
    if (highs.length < 5 || lows.length < 5 || closes.length < 5) {
        return { k: [], d: [] };
    }
    // Use adaptive periods
    const effectiveKPeriod = Math.min(kPeriod, highs.length);
    const effectiveDPeriod = Math.min(dPeriod, Math.floor(effectiveKPeriod / 3));
    const stochK = [];
    const stochD = [];
    // Calculate %K (Stochastic %K)
    for (let i = effectiveKPeriod - 1; i < closes.length; i++) {
        const periodHighs = highs.slice(i - effectiveKPeriod + 1, i + 1);
        const periodLows = lows.slice(i - effectiveKPeriod + 1, i + 1);
        const highestHigh = Math.max(...periodHighs);
        const lowestLow = Math.min(...periodLows);
        const currentClose = closes[i];
        if (highestHigh !== lowestLow) {
            const k = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
            stochK.push(k);
        }
        else {
            stochK.push(50); // Neutral if no range
        }
    }
    // Calculate %D (Stochastic %D) as SMA of %K
    const useDPeriod = Math.max(2, effectiveDPeriod);
    if (stochK.length >= useDPeriod) {
        for (let i = useDPeriod - 1; i < stochK.length; i++) {
            const sum = stochK.slice(i - useDPeriod + 1, i + 1).reduce((a, b) => a + b, 0);
            stochD.push(sum / useDPeriod);
        }
    }
    return {
        k: stochK,
        d: stochD
    };
}
export function calculateCCI(highs, lows, closes, period = 20) {
    // Minimum 5 data points required
    if (highs.length < 5 || lows.length < 5 || closes.length < 5) {
        return [];
    }
    // Use adaptive period
    const effectivePeriod = Math.min(period, highs.length);
    const cci = [];
    for (let i = effectivePeriod - 1; i < closes.length; i++) {
        const typicalPrices = [];
        for (let j = i - effectivePeriod + 1; j <= i; j++) {
            const tp = (highs[j] + lows[j] + closes[j]) / 3;
            typicalPrices.push(tp);
        }
        const sma = typicalPrices.reduce((a, b) => a + b, 0) / effectivePeriod;
        const currentTP = (highs[i] + lows[i] + closes[i]) / 3;
        // Calculate Mean Deviation
        const meanDeviation = typicalPrices.reduce((sum, tp) => sum + Math.abs(tp - sma), 0) / effectivePeriod;
        if (meanDeviation !== 0) {
            const cciValue = (currentTP - sma) / (0.015 * meanDeviation);
            cci.push(cciValue);
        }
        else {
            cci.push(0);
        }
    }
    return cci;
}
export function calculateWilliamsR(highs, lows, closes, period = 14) {
    // Minimum 5 data points required
    if (highs.length < 5 || lows.length < 5 || closes.length < 5) {
        return [];
    }
    // Use adaptive period
    const effectivePeriod = Math.min(period, highs.length);
    const williamsR = [];
    for (let i = effectivePeriod - 1; i < closes.length; i++) {
        const periodHighs = highs.slice(i - effectivePeriod + 1, i + 1);
        const periodLows = lows.slice(i - effectivePeriod + 1, i + 1);
        const highestHigh = Math.max(...periodHighs);
        const lowestLow = Math.min(...periodLows);
        const currentClose = closes[i];
        if (highestHigh !== lowestLow) {
            const wr = ((highestHigh - currentClose) / (highestHigh - lowestLow)) * -100;
            williamsR.push(wr);
        }
        else {
            williamsR.push(-50); // Neutral if no range
        }
    }
    return williamsR;
}
