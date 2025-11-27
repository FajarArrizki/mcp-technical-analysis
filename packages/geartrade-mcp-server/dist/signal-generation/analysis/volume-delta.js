/**
 * Volume Delta Analysis
 * calculateCumulativeVolumeDelta function
 */
/**
 * Calculate Cumulative Volume Delta (CVD)
 * CVD measures cumulative difference between buyer and seller market orders
 */
export function calculateCumulativeVolumeDelta(historicalData, currentPrice) {
    if (!historicalData || historicalData.length < 20 || !currentPrice || currentPrice <= 0) {
        return null;
    }
    let cvdBuyer = 0; // Cumulative buy volume
    let cvdSeller = 0; // Cumulative sell volume
    const cvdHistory = []; // Track CVD over time for trend analysis
    // Estimate buy/sell volume from each candle
    // If close > open = bullish candle = more buy volume
    // If close < open = bearish candle = more sell volume
    for (let i = 0; i < historicalData.length; i++) {
        const candle = historicalData[i];
        const open = candle.open;
        const close = candle.close;
        const high = candle.high;
        const low = candle.low;
        const volume = candle.volume || 0;
        if (volume <= 0 || open <= 0)
            continue;
        // Estimate buy vs sell volume based on candle direction and body size
        const bodySize = Math.abs(close - open);
        const totalRange = high - low;
        if (totalRange > 0) {
            // Bullish candle: close > open
            if (close > open) {
                // More volume attributed to buyers
                const buyRatio = bodySize / totalRange;
                const buyVolume = volume * (0.5 + buyRatio * 0.5); // 50-100% buy volume
                const sellVolume = volume - buyVolume;
                cvdBuyer += buyVolume;
                cvdSeller += sellVolume;
            }
            else if (close < open) {
                // Bearish candle: close < open
                // More volume attributed to sellers
                const sellRatio = bodySize / totalRange;
                const sellVolume = volume * (0.5 + sellRatio * 0.5); // 50-100% sell volume
                const buyVolume = volume - sellVolume;
                cvdBuyer += buyVolume;
                cvdSeller += sellVolume;
            }
            else {
                // Doji: equal buy/sell volume
                cvdBuyer += volume * 0.5;
                cvdSeller += volume * 0.5;
            }
        }
        else {
            // No range: equal distribution
            cvdBuyer += volume * 0.5;
            cvdSeller += volume * 0.5;
        }
        // Track CVD history for trend analysis
        const cvdDelta = cvdBuyer - cvdSeller;
        cvdHistory.push({
            timestamp: candle.time || Date.now(),
            cvdBuyer: cvdBuyer,
            cvdSeller: cvdSeller,
            cvdDelta: cvdDelta
        });
    }
    // Calculate CVD delta
    const cvdDelta = cvdBuyer - cvdSeller;
    // Determine CVD trend (rising = bullish, falling = bearish)
    let cvdTrend = 'neutral';
    if (cvdHistory.length >= 10) {
        const recentCVD = cvdHistory.slice(-10);
        const olderCVD = cvdHistory.length >= 20 ? cvdHistory.slice(-20, -10) : cvdHistory.slice(0, 10);
        const recentAvg = recentCVD.reduce((sum, v) => sum + v.cvdDelta, 0) / recentCVD.length;
        const olderAvg = olderCVD.reduce((sum, v) => sum + v.cvdDelta, 0) / olderCVD.length;
        if (recentAvg > olderAvg * 1.1) {
            cvdTrend = 'rising'; // Bullish: buyers more aggressive
        }
        else if (recentAvg < olderAvg * 0.9) {
            cvdTrend = 'falling'; // Bearish: sellers more aggressive
        }
    }
    // Detect divergence: price vs CVD
    // Bullish divergence: price down but CVD up = hidden buying pressure
    // Bearish divergence: price up but CVD down = hidden selling pressure
    let divergence = 'none';
    if (cvdHistory.length >= 20 && historicalData.length >= 20) {
        const recentPrices = historicalData.slice(-10).map(d => d.close);
        const olderPrices = historicalData.slice(-20, -10).map(d => d.close);
        const recentPriceAvg = recentPrices.reduce((sum, p) => sum + p, 0) / recentPrices.length;
        const olderPriceAvg = olderPrices.reduce((sum, p) => sum + p, 0) / olderPrices.length;
        // CRITICAL FIX: Check for division by zero - olderPriceAvg can be 0
        const priceChange = olderPriceAvg > 0 ? (recentPriceAvg - olderPriceAvg) / olderPriceAvg : 0;
        const recentCVD = cvdHistory.slice(-10);
        const olderCVD = cvdHistory.slice(-20, -10);
        const recentCVDAvg = recentCVD.reduce((sum, v) => sum + v.cvdDelta, 0) / recentCVD.length;
        const olderCVDAvg = olderCVD.reduce((sum, v) => sum + v.cvdDelta, 0) / olderCVD.length;
        // CRITICAL FIX: Check for division by zero - olderCVDAvg can be 0
        const cvdChange = Math.abs(olderCVDAvg) > 0 ? (recentCVDAvg - olderCVDAvg) / Math.abs(olderCVDAvg) : 0;
        // Bullish divergence: price falling but CVD rising
        if (priceChange < -0.02 && cvdChange > 0.1) {
            divergence = 'bullish';
        }
        // Bearish divergence: price rising but CVD falling
        else if (priceChange > 0.02 && cvdChange < -0.1) {
            divergence = 'bearish';
        }
    }
    // Calculate strength (0-100)
    // Based on absolute CVD delta and trend consistency
    const totalVolume = cvdBuyer + cvdSeller;
    const strength = totalVolume > 0
        ? Math.min(100, Math.abs(cvdDelta) / totalVolume * 200) // Normalize to 0-100
        : 0;
    return {
        cvdBuyer: cvdBuyer, // Cumulative buy volume
        cvdSeller: cvdSeller, // Cumulative sell volume
        cvdDelta: cvdDelta, // CVD Buyer - CVD Seller
        cvdTrend: cvdTrend, // 'rising' | 'falling' | 'neutral'
        divergence: divergence, // 'bullish' | 'bearish' | 'none'
        strength: strength, // 0-100
        cvdHistory: cvdHistory.slice(-50), // Last 50 data points for analysis
        timestamp: Date.now()
    };
}
