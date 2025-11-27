/**
 * Momentum Indicators
 * RSI, MACD, Stochastic, CCI, Williams %R calculations
 */
import { calculateEMA } from './moving-averages';
export function calculateRSI(closes, period = 14) {
    if (closes.length < period + 1)
        return [];
    const rsi = [];
    const gains = [];
    const losses = [];
    // Calculate price changes
    for (let i = 1; i < closes.length; i++) {
        const change = closes[i] - closes[i - 1];
        gains.push(change > 0 ? change : 0);
        losses.push(change < 0 ? Math.abs(change) : 0);
    }
    // Calculate initial average gain and loss
    let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
    let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
    // Calculate RSI
    for (let i = period; i < gains.length; i++) {
        if (avgLoss === 0) {
            rsi.push(100);
        }
        else {
            const rs = avgGain / avgLoss;
            const currentRSI = 100 - (100 / (1 + rs));
            rsi.push(currentRSI);
        }
        // Update averages
        avgGain = (avgGain * (period - 1) + gains[i]) / period;
        avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
    }
    return rsi;
}
export function calculateMACD(closes, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    if (closes.length < slowPeriod + signalPeriod)
        return [];
    const fastEMA = calculateEMA(closes, fastPeriod);
    const slowEMA = calculateEMA(closes, slowPeriod);
    // Align arrays (slowEMA starts later)
    const macdLine = [];
    const startIdx = slowPeriod - fastPeriod;
    for (let i = 0; i < slowEMA.length; i++) {
        if (fastEMA[startIdx + i] !== undefined) {
            macdLine.push(fastEMA[startIdx + i] - slowEMA[i]);
        }
    }
    // Calculate signal line (EMA of MACD line)
    const signalLine = calculateEMA(macdLine, signalPeriod);
    // Calculate histogram
    const histogram = [];
    const signalStartIdx = signalPeriod - 1;
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
    if (highs.length < kPeriod || lows.length < kPeriod || closes.length < kPeriod) {
        return { k: [], d: [] };
    }
    const stochK = [];
    const stochD = [];
    // Calculate %K (Stochastic %K)
    for (let i = kPeriod - 1; i < closes.length; i++) {
        const periodHighs = highs.slice(i - kPeriod + 1, i + 1);
        const periodLows = lows.slice(i - kPeriod + 1, i + 1);
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
    if (stochK.length >= dPeriod) {
        for (let i = dPeriod - 1; i < stochK.length; i++) {
            const sum = stochK.slice(i - dPeriod + 1, i + 1).reduce((a, b) => a + b, 0);
            stochD.push(sum / dPeriod);
        }
    }
    return {
        k: stochK,
        d: stochD
    };
}
export function calculateCCI(highs, lows, closes, period = 20) {
    if (highs.length < period || lows.length < period || closes.length < period) {
        return [];
    }
    const cci = [];
    for (let i = period - 1; i < closes.length; i++) {
        const typicalPrices = [];
        for (let j = i - period + 1; j <= i; j++) {
            const tp = (highs[j] + lows[j] + closes[j]) / 3;
            typicalPrices.push(tp);
        }
        const sma = typicalPrices.reduce((a, b) => a + b, 0) / period;
        const currentTP = (highs[i] + lows[i] + closes[i]) / 3;
        // Calculate Mean Deviation
        const meanDeviation = typicalPrices.reduce((sum, tp) => sum + Math.abs(tp - sma), 0) / period;
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
    if (highs.length < period || lows.length < period || closes.length < period) {
        return [];
    }
    const williamsR = [];
    for (let i = period - 1; i < closes.length; i++) {
        const periodHighs = highs.slice(i - period + 1, i + 1);
        const periodLows = lows.slice(i - period + 1, i + 1);
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
