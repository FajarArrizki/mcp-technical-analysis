/**
 * Data Parsing Utilities
 * parseCandles function
 */
export function parseCandles(candles, _asset) {
    return candles
        .map((candle) => {
        let open, high, low, close, volume, time;
        if (Array.isArray(candle)) {
            // Array format: [time, open, high, low, close, volume] or [timestamp, open, high, low, close]
            if (candle.length === 6) {
                if (typeof candle[0] === 'number' && candle[0] > 1000000000000) {
                    // First element is timestamp (milliseconds)
                    time = candle[0];
                    open = parseFloat(candle[1] || 0);
                    high = parseFloat(candle[2] || 0);
                    low = parseFloat(candle[3] || 0);
                    close = parseFloat(candle[4] || 0);
                    volume = parseFloat(candle[5] || 0);
                }
                else {
                    // [open, high, low, close, volume, time]
                    open = parseFloat(candle[0] || 0);
                    high = parseFloat(candle[1] || 0);
                    low = parseFloat(candle[2] || 0);
                    close = parseFloat(candle[3] || 0);
                    volume = parseFloat(candle[4] || 0);
                    time = candle[5] || Date.now();
                }
            }
            else if (candle.length === 5) {
                // CoinGecko format: [timestamp, open, high, low, close]
                time = parseInt(candle[0]);
                open = parseFloat(candle[1] || 0);
                high = parseFloat(candle[2] || 0);
                low = parseFloat(candle[3] || 0);
                close = parseFloat(candle[4] || 0);
                volume = 0; // Will be estimated
            }
            else {
                return null;
            }
        }
        else {
            // Object format
            open = parseFloat(candle.open || candle.o || 0);
            high = parseFloat(candle.high || candle.h || 0);
            low = parseFloat(candle.low || candle.l || 0);
            close = parseFloat(candle.close || candle.c || 0);
            volume = parseFloat(candle.volume || candle.v || 0);
            time = candle.time || candle.t || candle.timestamp || Date.now();
        }
        // Estimate volume if not provided
        if (!volume || volume === 0) {
            const priceRange = high - low;
            const avgPrice = (high + low) / 2;
            volume = priceRange * avgPrice * 0.1; // Rough estimate
        }
        return {
            time: time,
            open: open,
            high: high,
            low: low,
            close: close,
            volume: volume
        };
    })
        .filter((c) => c !== null && c.close > 0 && c.open > 0 && c.high >= c.low);
}
