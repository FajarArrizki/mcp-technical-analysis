/**
 * Validation Helpers
 * checkNoTradeZone, checkMomentumContradiction functions
 */
/**
 * Check No-Trade Zone
 * Returns true if price is in exhaustion zone (too close to support/resistance)
 */
export function checkNoTradeZone(signal, indicators, price) {
    if (!indicators || !price) {
        return { inNoTradeZone: false };
    }
    const bbLower = indicators.bollingerBands?.lower;
    const bbUpper = indicators.bollingerBands?.upper;
    const rsi7 = indicators.rsi7;
    const macdHist = indicators.macd?.histogram;
    // Check if price is too close to BB Lower (within 0.2%)
    if (bbLower !== null && bbLower !== undefined && price > 0) {
        const distanceToBBLower = ((price - bbLower) / price) * 100;
        if (distanceToBBLower < 0.2 && distanceToBBLower >= 0) {
            // Price is within 0.2% of BB Lower - exhaustion zone for SELL
            if (signal.signal === 'sell_to_enter') {
                return {
                    inNoTradeZone: true,
                    reason: `Price within 0.2% of BB Lower (exhaustion zone, momentum window too narrow)`,
                    distance: distanceToBBLower
                };
            }
        }
    }
    // Check if price is too close to BB Upper (within 0.2%)
    if (bbUpper !== null && bbUpper !== undefined && price > 0) {
        const distanceToBBUpper = ((bbUpper - price) / price) * 100;
        if (distanceToBBUpper < 0.2 && distanceToBBUpper >= 0) {
            // Price is within 0.2% of BB Upper - exhaustion zone for BUY
            if (signal.signal === 'buy_to_enter' || signal.signal === 'add') {
                return {
                    inNoTradeZone: true,
                    reason: `Price within 0.2% of BB Upper (exhaustion zone, momentum window too narrow)`,
                    distance: distanceToBBUpper
                };
            }
        }
    }
    // Check RSI(7) < 40 + MACD Hist > 0 (momentum exhaustion for SELL)
    if (rsi7 !== null && rsi7 !== undefined &&
        macdHist !== null && macdHist !== undefined) {
        if (rsi7 < 40 && macdHist > 0 && signal.signal === 'sell_to_enter') {
            return {
                inNoTradeZone: true,
                reason: `RSI(7) ${rsi7.toFixed(1)} < 40 + MACD Hist ${macdHist.toFixed(2)} > 0 (momentum exhaustion, potential reversal)`
            };
        }
        // Check RSI(7) > 60 + MACD Hist < 0 (momentum exhaustion for BUY)
        if (rsi7 > 60 && macdHist < 0 && (signal.signal === 'buy_to_enter' || signal.signal === 'add')) {
            return {
                inNoTradeZone: true,
                reason: `RSI(7) ${rsi7.toFixed(1)} > 60 + MACD Hist ${macdHist.toFixed(2)} < 0 (momentum exhaustion, potential reversal)`
            };
        }
    }
    return { inNoTradeZone: false };
}
/**
 * Check Momentum Contradiction
 * Returns penalty percentage if MACD histogram contradicts signal direction
 */
export function checkMomentumContradiction(signal, indicators) {
    if (!indicators || !indicators.macd ||
        indicators.macd.histogram === null ||
        indicators.macd.histogram === undefined) {
        return 0;
    }
    const macdHist = indicators.macd.histogram;
    const isBuySignal = signal.signal === 'buy_to_enter' || signal.signal === 'add';
    const isSellSignal = signal.signal === 'sell_to_enter';
    // MACD Histogram positive = bullish momentum, negative = bearish momentum
    // If signal is SELL but histogram is positive (or vice versa) = contradiction
    if (isSellSignal && macdHist > 0) {
        // SELL signal but bullish momentum (histogram positive)
        // Stronger contradiction if histogram is significantly positive
        if (macdHist > 30) {
            return 0.20; // 20% confidence penalty for strong contradiction
        }
        else if (macdHist > 10) {
            return 0.15; // 15% penalty for moderate contradiction
        }
        return 0.10; // 10% penalty for weak contradiction
    }
    else if (isBuySignal && macdHist < 0) {
        // BUY signal but bearish momentum (histogram negative)
        // Stronger contradiction if histogram is significantly negative
        if (macdHist < -30) {
            return 0.20; // 20% confidence penalty for strong contradiction
        }
        else if (macdHist < -10) {
            return 0.15; // 15% penalty for moderate contradiction
        }
        return 0.10; // 10% penalty for weak contradiction
    }
    return 0; // No contradiction
}
