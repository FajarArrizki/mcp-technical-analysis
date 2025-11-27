/**
 * Volume Indicators
 * OBV, VWAP calculations
 */
export function calculateOBV(closes, volumes) {
    if (closes.length < 2 || volumes.length < 2 || closes.length !== volumes.length) {
        return [];
    }
    const obv = [];
    let cumulativeOBV = 0;
    for (let i = 1; i < closes.length; i++) {
        if (closes[i] > closes[i - 1]) {
            // Price up: add volume
            cumulativeOBV += volumes[i];
        }
        else if (closes[i] < closes[i - 1]) {
            // Price down: subtract volume
            cumulativeOBV -= volumes[i];
        }
        // Price unchanged: OBV stays the same
        obv.push(cumulativeOBV);
    }
    return obv;
}
export function calculateVWAP(historicalData) {
    if (!historicalData || historicalData.length === 0) {
        return null;
    }
    let cumulativeTPV = 0; // Cumulative Typical Price * Volume
    let cumulativeVolume = 0;
    for (const candle of historicalData) {
        const typicalPrice = (candle.high + candle.low + candle.close) / 3;
        const volume = candle.volume || 0;
        cumulativeTPV += typicalPrice * volume;
        cumulativeVolume += volume;
    }
    if (cumulativeVolume === 0) {
        return null;
    }
    return cumulativeTPV / cumulativeVolume;
}
