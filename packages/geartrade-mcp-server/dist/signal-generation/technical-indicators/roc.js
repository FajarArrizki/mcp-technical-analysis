/**
 * Rate of Change (ROC) Indicator
 * Percentage change in price over a specified period
 */
export function calculateROC(closes, period = 14) {
    if (closes.length < period + 1) {
        return {
            roc: null,
            signal: null,
        };
    }
    const currentClose = closes[closes.length - 1];
    const pastClose = closes[closes.length - period - 1];
    if (!pastClose || pastClose === 0) {
        return {
            roc: null,
            signal: null,
        };
    }
    const roc = ((currentClose - pastClose) / pastClose) * 100;
    // Determine signal
    let signal = null;
    if (roc > 10)
        signal = 'overbought';
    else if (roc < -10)
        signal = 'oversold';
    else if (roc > 0)
        signal = 'bullish';
    else if (roc < 0)
        signal = 'bearish';
    else
        signal = 'neutral';
    return {
        roc,
        signal,
    };
}
