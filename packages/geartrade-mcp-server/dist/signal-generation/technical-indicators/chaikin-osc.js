/**
 * Chaikin Oscillator Indicator
 * MACD of Accumulation/Distribution Line
 */
import { calculateEMA } from './moving-averages';
export function calculateChaikinOscillator(highs, lows, closes, volumes, fastPeriod = 3, slowPeriod = 10) {
    if (highs.length < slowPeriod || lows.length < slowPeriod || closes.length < slowPeriod || volumes.length < slowPeriod) {
        return {
            chaikinOsc: null,
            fastEMA: null,
            slowEMA: null,
            signal: null,
        };
    }
    // Calculate Accumulation/Distribution Line first
    const adl = [];
    let adlValue = 0;
    for (let i = 0; i < closes.length; i++) {
        const high = highs[i];
        const low = lows[i];
        const close = closes[i];
        const volume = volumes[i] || 0;
        // Avoid division by zero
        if (high === low) {
            adl.push(adlValue); // No change if no range
        }
        else {
            // Money Flow Multiplier = ((Close - Low) - (High - Close)) / (High - Low)
            const moneyFlowMultiplier = ((close - low) - (high - close)) / (high - low);
            const moneyFlowVolume = moneyFlowMultiplier * volume;
            adlValue += moneyFlowVolume;
            adl.push(adlValue);
        }
    }
    // Calculate EMAs of ADL
    const fastEMA_ADL = calculateEMA(adl, fastPeriod);
    const slowEMA_ADL = calculateEMA(adl, slowPeriod);
    if (fastEMA_ADL.length === 0 || slowEMA_ADL.length === 0) {
        return {
            chaikinOsc: null,
            fastEMA: null,
            slowEMA: null,
            signal: null,
        };
    }
    // Chaikin Oscillator = Fast EMA of ADL - Slow EMA of ADL
    const currentFastEMA = fastEMA_ADL[fastEMA_ADL.length - 1];
    const currentSlowEMA = slowEMA_ADL[slowEMA_ADL.length - 1];
    const chaikinOsc = currentFastEMA - currentSlowEMA;
    // Determine signal
    let signal = null;
    if (chaikinOsc > 0)
        signal = 'bullish';
    else if (chaikinOsc < 0)
        signal = 'bearish';
    else
        signal = 'neutral';
    return {
        chaikinOsc,
        fastEMA: currentFastEMA,
        slowEMA: currentSlowEMA,
        signal,
    };
}
