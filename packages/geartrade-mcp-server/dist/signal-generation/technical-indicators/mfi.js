/**
 * Money Flow Index (MFI) Indicator
 * Volume-weighted momentum oscillator
 */
export function calculateMFI(highs, lows, closes, volumes, period = 14) {
    // Minimum 5 data points required
    if (highs.length < 5 || lows.length < 5 || closes.length < 5 || volumes.length < 5) {
        return {
            mfi: null,
            signal: null,
            trend: null,
        };
    }
    // Use adaptive period
    const effectivePeriod = Math.min(period, highs.length - 1);
    // Calculate Typical Price and Raw Money Flow
    const typicalPrices = [];
    const rawMoneyFlows = [];
    for (let i = 0; i < closes.length; i++) {
        const typicalPrice = (highs[i] + lows[i] + closes[i]) / 3;
        typicalPrices.push(typicalPrice);
        rawMoneyFlows.push(typicalPrice * volumes[i]);
    }
    // Calculate Positive and Negative Money Flow
    const positiveFlows = [];
    const negativeFlows = [];
    for (let i = 1; i < typicalPrices.length; i++) {
        const currentTP = typicalPrices[i];
        const previousTP = typicalPrices[i - 1];
        const rawMF = rawMoneyFlows[i];
        if (currentTP > previousTP) {
            positiveFlows.push(rawMF);
            negativeFlows.push(0);
        }
        else if (currentTP < previousTP) {
            positiveFlows.push(0);
            negativeFlows.push(rawMF);
        }
        else {
            positiveFlows.push(0);
            negativeFlows.push(0);
        }
    }
    // Calculate Money Flow Ratio for the specified period using effective period
    const usePeriod = Math.min(effectivePeriod, positiveFlows.length);
    const startIdx = Math.max(0, positiveFlows.length - usePeriod);
    const periodPositiveFlows = positiveFlows.slice(startIdx);
    const periodNegativeFlows = negativeFlows.slice(startIdx);
    const positiveMF = periodPositiveFlows.reduce((sum, flow) => sum + flow, 0);
    const negativeMF = periodNegativeFlows.reduce((sum, flow) => sum + flow, 0);
    if (negativeMF === 0) {
        return {
            mfi: 100,
            signal: 'overbought',
            trend: 'bullish',
        };
    }
    const moneyFlowRatio = positiveMF / negativeMF;
    const mfi = 100 - (100 / (1 + moneyFlowRatio));
    // Determine signal
    let signal = null;
    if (mfi >= 80)
        signal = 'overbought';
    else if (mfi <= 20)
        signal = 'oversold';
    else
        signal = 'neutral';
    // Determine trend (comparing with previous MFI if available)
    let trend = null;
    if (positiveFlows.length > period) {
        const prevStartIdx = startIdx - 1;
        if (prevStartIdx >= 0) {
            const prevPositiveFlows = positiveFlows.slice(prevStartIdx, prevStartIdx + period);
            const prevNegativeFlows = negativeFlows.slice(prevStartIdx, prevStartIdx + period);
            const prevPositiveMF = prevPositiveFlows.reduce((sum, flow) => sum + flow, 0);
            const prevNegativeMF = prevNegativeFlows.reduce((sum, flow) => sum + flow, 0);
            if (prevNegativeMF > 0) {
                const prevMoneyFlowRatio = prevPositiveMF / prevNegativeMF;
                const prevMFI = 100 - (100 / (1 + prevMoneyFlowRatio));
                if (mfi > prevMFI)
                    trend = 'bullish';
                else if (mfi < prevMFI)
                    trend = 'bearish';
                else
                    trend = 'neutral';
            }
        }
    }
    return {
        mfi,
        signal,
        trend,
    };
}
