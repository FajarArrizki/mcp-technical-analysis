/**
 * Rate of Change (ROC) Indicator
 * Percentage change in price over a specified period
 */
export function calculateROC(closes, period = 14) {
    // Minimum 3 data points required
    if (closes.length < 3) {
        return {
            roc: null,
            signal: null,
        };
    }
    // Use adaptive period
    const effectivePeriod = Math.min(period, closes.length - 1);
    const currentClose = closes[closes.length - 1];
    const pastClose = closes[closes.length - effectivePeriod - 1] ?? closes[0];
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
