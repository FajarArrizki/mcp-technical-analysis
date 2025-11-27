/**
 * Trend Strength Calculation
 * calculateTrendStrengthIndex function
 */
/**
 * Calculate Trend Strength Index (-1 to +1)
 * Combines EMA alignment, ADX, Aroon, and multi-timeframe data
 */
export function calculateTrendStrengthIndex(indicators, trendAlignment) {
    let strength = 0;
    let components = 0;
    // 1. EMA Alignment (weight: 0.3)
    if (indicators && indicators.ema20 && indicators.ema50 && indicators.ema200 && indicators.price) {
        const price = indicators.price;
        const ema20 = indicators.ema20;
        const ema50 = indicators.ema50;
        const ema200 = indicators.ema200;
        // Perfect bullish: Price > EMA20 > EMA50 > EMA200
        if (price > ema20 && ema20 > ema50 && ema50 > ema200) {
            strength += 0.3;
        }
        // Good bullish: Price > EMA20 > EMA50
        else if (price > ema20 && ema20 > ema50) {
            strength += 0.2;
        }
        // Perfect bearish: Price < EMA20 < EMA50 < EMA200
        else if (price < ema20 && ema20 < ema50 && ema50 < ema200) {
            strength -= 0.3;
        }
        // Good bearish: Price < EMA20 < EMA50
        else if (price < ema20 && ema20 < ema50) {
            strength -= 0.2;
        }
        components++;
    }
    // 2. ADX Trend Strength (weight: 0.25)
    if (indicators && indicators.adx !== null && indicators.adx !== undefined) {
        const adxValue = indicators.adx;
        const adxNormalized = Math.min(1, adxValue / 50); // Normalize to 0-1
        // Use +DI and -DI to determine direction
        if (indicators.plusDI && indicators.minusDI) {
            const diDiff = indicators.plusDI - indicators.minusDI;
            const diNormalized = Math.max(-1, Math.min(1, diDiff / 25)); // Normalize DI difference
            strength += 0.25 * adxNormalized * diNormalized;
        }
        else {
            // If no DI, use ADX strength with price direction
            if (indicators.price && indicators.ema20) {
                const priceDirection = indicators.price > indicators.ema20 ? 1 : -1;
                strength += 0.25 * adxNormalized * priceDirection;
            }
        }
        components++;
    }
    // 3. Aroon Trend Strength (weight: 0.2)
    if (indicators && indicators.aroon && indicators.aroon.up !== undefined && indicators.aroon.down !== undefined) {
        const aroonDiff = indicators.aroon.up - indicators.aroon.down;
        const aroonNormalized = aroonDiff / 100; // Normalize to -1 to +1
        strength += 0.2 * aroonNormalized;
        components++;
    }
    // 4. Multi-timeframe Alignment (weight: 0.25)
    if (trendAlignment) {
        const alignmentScore = trendAlignment.alignmentScore || 0;
        const dailyTrend = trendAlignment.dailyTrend || trendAlignment.trend;
        let trendDirection = 0;
        if (dailyTrend === 'uptrend')
            trendDirection = 1;
        else if (dailyTrend === 'downtrend')
            trendDirection = -1;
        const alignmentNormalized = alignmentScore / 100; // 0-1
        strength += 0.25 * alignmentNormalized * trendDirection;
        components++;
    }
    // Normalize by number of components available
    if (components > 0) {
        strength = strength / components;
    }
    // Clamp to -1 to +1
    return Math.max(-1, Math.min(1, strength));
}
