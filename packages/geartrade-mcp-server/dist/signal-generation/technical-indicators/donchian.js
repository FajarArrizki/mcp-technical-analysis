/**
 * Donchian Channels Indicator
 * Channels based on highest high and lowest low over a period
 */
export function calculateDonchianChannels(highs, lows, period = 20) {
    if (highs.length < period || lows.length < period) {
        return {
            upper: null,
            middle: null,
            lower: null,
            position: null,
        };
    }
    // Calculate the most recent channel
    const recentHighs = highs.slice(-period);
    const recentLows = lows.slice(-period);
    const upper = Math.max(...recentHighs);
    const lower = Math.min(...recentLows);
    const middle = (upper + lower) / 2;
    return {
        upper,
        middle,
        lower,
        position: null, // Will be set by caller with current price
    };
}
