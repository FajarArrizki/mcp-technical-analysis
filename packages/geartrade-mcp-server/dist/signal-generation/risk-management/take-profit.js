/**
 * Take Profit Calculations
 * calculateBounceTP, calculateDynamicTP functions
 */
export function calculateBounceTP(entryPrice, signal, indicators, trendAlignment, slDistance, bounceStrength) {
    const MIN_TP_PERCENT = 0.015; // 1.5% minimum
    const MAX_TP_PERCENT = 0.06; // 6% maximum
    const MIN_RR = 1.8; // Minimum R:R 1.8:1
    // Base TP based on bounce strength (0.2 to 1.0)
    let tpPercent = MIN_TP_PERCENT + (bounceStrength * 0.03); // 1.5% to 4.5% base
    const factors = {
        bounceStrength: bounceStrength,
        momentum: 0,
        volatility: 0,
        trendStrength: 0,
        volume: 0,
        counterTrend: false
    };
    // Momentum bonus
    if (indicators && indicators.macd && indicators.macd.histogram) {
        const macdStrength = Math.abs(indicators.macd.histogram);
        factors.momentum = macdStrength;
        if (macdStrength > 30) {
            tpPercent += 0.015;
        }
        else if (macdStrength > 20) {
            tpPercent += 0.01;
        }
        else if (macdStrength > 10) {
            tpPercent += 0.005;
        }
    }
    // Volatility bonus
    if (indicators && indicators.atr && entryPrice > 0) {
        const atrPercent = (indicators.atr / entryPrice) * 100;
        factors.volatility = atrPercent;
        if (atrPercent > 3) {
            tpPercent += 0.01;
        }
        else if (atrPercent > 2) {
            tpPercent += 0.005;
        }
    }
    // Check if bounce is counter-trend
    let isCounterTrend = false;
    if (trendAlignment && trendAlignment.trend) {
        const signalType = signal.signal;
        const dailyTrend = trendAlignment.dailyTrend || trendAlignment.trend;
        if ((signalType === 'buy_to_enter' && dailyTrend === 'downtrend') ||
            (signalType === 'sell_to_enter' && dailyTrend === 'uptrend')) {
            isCounterTrend = true;
            factors.counterTrend = true;
            tpPercent *= 0.75; // Reduce by 25%
        }
        else {
            const alignmentScore = trendAlignment.alignmentScore || 0;
            if (alignmentScore >= 75) {
                tpPercent += 0.01;
            }
            else if (alignmentScore >= 50) {
                tpPercent += 0.005;
            }
            factors.trendStrength = alignmentScore;
        }
    }
    // Volume bonus
    if (indicators && indicators.volumeChange && indicators.volumeChange > 10) {
        factors.volume = indicators.volumeChange;
        tpPercent += 0.005;
    }
    // Clamp to max
    tpPercent = Math.min(tpPercent, MAX_TP_PERCENT);
    // Calculate TP price
    let tpPrice = 0;
    const signalType = signal.signal;
    if (signalType === 'buy_to_enter' || signalType === 'add') {
        tpPrice = entryPrice * (1 + tpPercent);
    }
    else if (signalType === 'sell_to_enter') {
        tpPrice = entryPrice * (1 - tpPercent);
    }
    // Ensure minimum R:R
    const tpDistance = Math.abs(tpPrice - entryPrice);
    const minTPDistance = slDistance * MIN_RR;
    if (tpDistance < minTPDistance) {
        if (signalType === 'buy_to_enter' || signalType === 'add') {
            tpPrice = entryPrice + minTPDistance;
        }
        else {
            tpPrice = entryPrice - minTPDistance;
        }
    }
    // Recalculate final TP percent after R:R adjustment
    const finalTPDistance = Math.abs(tpPrice - entryPrice);
    const finalTPPercent = (finalTPDistance / entryPrice) * 100;
    // Calculate profit expectation
    const profitExpectation = bounceStrength * 100;
    return {
        tpPrice,
        tpPercent: finalTPPercent,
        factors: factors,
        isCounterTrend,
        profitExpectation,
        bounceTarget: tpPrice
    };
}
export function calculateDynamicTP(entryPrice, signal, indicators, trendAlignment, _marketRegime, slDistance) {
    const MIN_TP_PERCENT = 0.02; // 2% minimum
    const MAX_TP_PERCENT = 0.05; // 5% maximum
    const MIN_RR = 2.0; // Minimum R:R 2:1
    let tpPercent = MIN_TP_PERCENT;
    const factors = {
        momentum: 0,
        volatility: 0,
        trendStrength: 0,
        volume: 0
    };
    // Momentum bonus
    if (indicators && indicators.macd && indicators.macd.histogram) {
        const macdStrength = Math.abs(indicators.macd.histogram);
        factors.momentum = macdStrength;
        if (macdStrength > 30) {
            tpPercent += 0.01;
        }
        else if (macdStrength > 20) {
            tpPercent += 0.005;
        }
    }
    // Volatility bonus
    if (indicators && indicators.atr && entryPrice > 0) {
        const atrPercent = (indicators.atr / entryPrice) * 100;
        factors.volatility = atrPercent;
        if (atrPercent > 2) {
            tpPercent += 0.005;
        }
    }
    // Trend strength bonus
    if (trendAlignment) {
        const alignmentScore = trendAlignment.alignmentScore || 0;
        factors.trendStrength = alignmentScore;
        if (alignmentScore >= 75) {
            tpPercent += 0.01;
        }
        else if (alignmentScore >= 50) {
            tpPercent += 0.005;
        }
    }
    // Volume bonus
    if (indicators && indicators.volumeChange && indicators.volumeChange > 10) {
        factors.volume = indicators.volumeChange;
        tpPercent += 0.005;
    }
    // Clamp to max
    tpPercent = Math.min(tpPercent, MAX_TP_PERCENT);
    // Calculate TP price
    let tpPrice = 0;
    const signalType = signal.signal;
    if (signalType === 'buy_to_enter' || signalType === 'add') {
        tpPrice = entryPrice * (1 + tpPercent);
    }
    else if (signalType === 'sell_to_enter') {
        tpPrice = entryPrice * (1 - tpPercent);
    }
    // Ensure minimum R:R
    const tpDistance = Math.abs(tpPrice - entryPrice);
    const minTPDistance = slDistance * MIN_RR;
    if (tpDistance < minTPDistance) {
        if (signalType === 'buy_to_enter' || signalType === 'add') {
            tpPrice = entryPrice + minTPDistance;
        }
        else {
            tpPrice = entryPrice - minTPDistance;
        }
    }
    // Recalculate final TP percent after R:R adjustment
    const finalTPDistance = Math.abs(tpPrice - entryPrice);
    const finalTPPercent = (finalTPDistance / entryPrice) * 100;
    return {
        tpPrice,
        tpPercent: finalTPPercent,
        factors: factors
    };
}
