/**
 * Shared utility for counting bullish vs bearish indicators
 * Ensures 100% consistency between prompt-builder and signal validation
 */
/**
 * Count bullish vs bearish indicators
 * EXACT same logic used in both prompt-builder and signal validation
 */
export function countBullishBearishIndicators(indicators, currentPrice) {
    let bullishCount = 0;
    let bearishCount = 0;
    const price = indicators.price || currentPrice;
    // MACD Histogram
    if (indicators.macd?.histogram !== null && indicators.macd?.histogram !== undefined) {
        if (indicators.macd.histogram > 0)
            bullishCount++;
        else
            bearishCount++;
    }
    // Volume Change (proxy for OBV trend)
    // Volume increasing = buying pressure (bullish), volume decreasing = selling pressure (bearish)
    if (indicators.volumeChange !== null && indicators.volumeChange !== undefined) {
        if (indicators.volumeChange > 10)
            bullishCount++; // Volume increased significantly = bullish
        else if (indicators.volumeChange < -10)
            bearishCount++; // Volume decreased significantly = bearish
        // Volume change -10% to +10%: neutral, don't count
    }
    // Bollinger Bands Middle
    if (indicators.bollingerBands && price > 0) {
        if (price > indicators.bollingerBands.middle)
            bullishCount++;
        else
            bearishCount++;
    }
    // Parabolic SAR
    if (indicators.parabolicSAR !== null && indicators.parabolicSAR !== undefined && price > 0) {
        if (price > indicators.parabolicSAR)
            bullishCount++;
        else
            bearishCount++;
    }
    // Aroon
    if (indicators.aroon) {
        if (indicators.aroon.up > indicators.aroon.down)
            bullishCount++;
        else
            bearishCount++;
    }
    // CCI
    if (indicators.cci !== null && indicators.cci !== undefined) {
        if (indicators.cci > 100)
            bullishCount++;
        else if (indicators.cci < -100)
            bearishCount++;
    }
    // VWAP
    if (indicators.vwap !== null && indicators.vwap !== undefined && price > 0) {
        if (price > indicators.vwap)
            bullishCount++;
        else
            bearishCount++;
    }
    // 24h Price Change
    if (indicators.priceChange24h !== null && indicators.priceChange24h !== undefined) {
        if (indicators.priceChange24h > 0)
            bullishCount++;
        else
            bearishCount++;
    }
    // RSI - Oversold/Overbought
    // RSI < 30 = oversold (bullish reversal potential), RSI > 70 = overbought (bearish reversal potential)
    if (indicators.rsi14 !== null && indicators.rsi14 !== undefined) {
        if (indicators.rsi14 < 30)
            bullishCount++; // Oversold = bullish reversal potential
        else if (indicators.rsi14 > 70)
            bearishCount++; // Overbought = bearish reversal potential
        // RSI 30-70: neutral zone, don't count
    }
    // Stochastic - Oversold/Overbought
    // Stochastic K < 20 = oversold (bullish), K > 80 = overbought (bearish)
    if (indicators.stochastic?.k !== null && indicators.stochastic?.k !== undefined) {
        const stochK = indicators.stochastic.k;
        if (stochK < 20)
            bullishCount++; // Oversold = bullish reversal potential
        else if (stochK > 80)
            bearishCount++; // Overbought = bearish reversal potential
        // Stochastic 20-80: neutral zone, don't count
    }
    // Williams %R - Oversold/Overbought
    // Williams %R < -80 = oversold (bullish), Williams %R > -20 = overbought (bearish)
    if (indicators.williamsR !== null && indicators.williamsR !== undefined) {
        if (indicators.williamsR < -80)
            bullishCount++; // Oversold = bullish reversal potential
        else if (indicators.williamsR > -20)
            bearishCount++; // Overbought = bearish reversal potential
        // Williams %R -80 to -20: neutral zone, don't count
    }
    // EMA Alignment
    // Price > EMA20 > EMA50 = bullish uptrend, Price < EMA20 < EMA50 = bearish downtrend
    if (price > 0 &&
        indicators.ema20 !== null && indicators.ema20 !== undefined &&
        indicators.ema50 !== null && indicators.ema50 !== undefined) {
        if (price > indicators.ema20 && indicators.ema20 > indicators.ema50) {
            bullishCount++; // Uptrend structure = bullish
        }
        else if (price < indicators.ema20 && indicators.ema20 < indicators.ema50) {
            bearishCount++; // Downtrend structure = bearish
        }
        // Mixed alignment: neutral, don't count
    }
    // RSI Divergence
    if (indicators.rsiDivergence?.divergence) {
        const divLower = indicators.rsiDivergence.divergence.toLowerCase();
        if (divLower.includes('bullish'))
            bullishCount++;
        else if (divLower.includes('bearish'))
            bearishCount++;
    }
    // Calculate summary direction
    const summaryDir = bullishCount > bearishCount ? 'BUY' :
        bearishCount > bullishCount ? 'SELL' :
            'MIXED';
    return {
        bullishCount,
        bearishCount,
        summaryDir
    };
}
