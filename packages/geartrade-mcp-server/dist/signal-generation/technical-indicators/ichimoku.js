/**
 * Ichimoku Cloud Indicator
 * Tenkan-sen, Kijun-sen, Senkou Span A/B, Chikou Span calculations
 */
export function calculateIchimokuCloud(highs, lows, closes, tenkanPeriod = 9, kijunPeriod = 26, senkouSpanBPeriod = 52, currentPrice) {
    const maxPeriod = Math.max(tenkanPeriod, kijunPeriod, senkouSpanBPeriod);
    if (highs.length < maxPeriod || lows.length < maxPeriod || closes.length < maxPeriod) {
        return {
            tenkanSen: null,
            kijunSen: null,
            senkouSpanA: null,
            senkouSpanB: null,
            chikouSpan: null,
            cloudColor: null,
            priceVsCloud: null,
            signals: {
                tkCross: null,
                priceVsTk: null,
                priceVsKj: null,
                cloudBreakout: null,
            },
        };
    }
    const currentIndex = closes.length - 1;
    const price = currentPrice || closes[currentIndex];
    // Tenkan-sen (Conversion Line): (tenkanPeriod high + tenkanPeriod low) / 2
    const tenkanHigh = Math.max(...highs.slice(-tenkanPeriod));
    const tenkanLow = Math.min(...lows.slice(-tenkanPeriod));
    const tenkanSen = (tenkanHigh + tenkanLow) / 2;
    // Kijun-sen (Base Line): (kijunPeriod high + kijunPeriod low) / 2
    const kijunHigh = Math.max(...highs.slice(-kijunPeriod));
    const kijunLow = Math.min(...lows.slice(-kijunPeriod));
    const kijunSen = (kijunHigh + kijunLow) / 2;
    // Senkou Span A: (Tenkan-sen + Kijun-sen) / 2, plotted 26 periods ahead
    const senkouSpanA = (tenkanSen + kijunSen) / 2;
    // Senkou Span B: (senkouSpanBPeriod high + senkouSpanBPeriod low) / 2, plotted kijunPeriod periods ahead
    const senkouBHigh = Math.max(...highs.slice(-senkouSpanBPeriod));
    const senkouBLow = Math.min(...lows.slice(-senkouSpanBPeriod));
    const senkouSpanB = (senkouBHigh + senkouBLow) / 2;
    // Chikou Span: Current close plotted kijunPeriod periods back
    // For current candle, Chikou Span is current close
    // For historical analysis, we can show it as current close
    const chikouSpan = closes[currentIndex];
    // Cloud color: Bullish when Span A > Span B, Bearish when Span B > Span A
    let cloudColor = null;
    if (senkouSpanA > senkouSpanB) {
        cloudColor = 'bullish';
    }
    else if (senkouSpanB > senkouSpanA) {
        cloudColor = 'bearish';
    }
    else {
        cloudColor = 'neutral';
    }
    // Price vs Cloud position
    let priceVsCloud = null;
    const cloudTop = Math.max(senkouSpanA, senkouSpanB);
    const cloudBottom = Math.min(senkouSpanA, senkouSpanB);
    if (price > cloudTop) {
        priceVsCloud = 'above';
    }
    else if (price < cloudBottom) {
        priceVsCloud = 'below';
    }
    else {
        priceVsCloud = 'inside';
    }
    // Calculate signals
    const signals = {
        tkCross: null,
        priceVsTk: null,
        priceVsKj: null,
        cloudBreakout: null,
    };
    // Price vs Tenkan/Kijun
    signals.priceVsTk = price > tenkanSen ? 'above' : 'below';
    signals.priceVsKj = price > kijunSen ? 'above' : 'below';
    // Cloud breakout signals
    if (priceVsCloud === 'above' && cloudColor === 'bullish') {
        signals.cloudBreakout = 'bullish'; // Price above bullish cloud
    }
    else if (priceVsCloud === 'below' && cloudColor === 'bearish') {
        signals.cloudBreakout = 'bearish'; // Price below bearish cloud
    }
    else {
        signals.cloudBreakout = 'neutral';
    }
    // Tenkan-Kijun crossover (basic signal, would need historical data for proper crossover)
    if (tenkanSen > kijunSen) {
        signals.tkCross = 'bullish';
    }
    else if (kijunSen > tenkanSen) {
        signals.tkCross = 'bearish';
    }
    else {
        signals.tkCross = 'neutral';
    }
    return {
        tenkanSen,
        kijunSen,
        senkouSpanA,
        senkouSpanB,
        chikouSpan,
        cloudColor,
        priceVsCloud,
        signals,
    };
}
