/**
 * Moving Average Envelope Indicator
 * Creates bands around a moving average for overbought/oversold signals
 */
/**
 * Calculate Moving Average Envelope
 * @param prices Array of prices
 * @param period MA period (default 20)
 * @param percentage Envelope percentage (default 2.5%)
 * @param maType Type of moving average ('sma' | 'ema', default 'sma')
 * @returns MAEnvelopeData object
 */
export function calculateMAEnvelope(prices, period = 20, percentage = 2.5, maType = 'sma') {
    if (prices.length < period) {
        return null;
    }
    // Calculate moving average
    let ma;
    if (maType === 'ema') {
        // Exponential Moving Average
        const multiplier = 2 / (period + 1);
        ma = prices[0];
        for (let i = 1; i < prices.length; i++) {
            ma = (prices[i] - ma) * multiplier + ma;
        }
    }
    else {
        // Simple Moving Average
        const sum = prices.slice(-period).reduce((acc, price) => acc + price, 0);
        ma = sum / period;
    }
    // Calculate envelope bands
    const bandOffset = ma * (percentage / 100);
    const upperBand = ma + bandOffset;
    const lowerBand = ma - bandOffset;
    // Get current price
    const currentPrice = prices[prices.length - 1];
    // Determine position
    let position;
    if (currentPrice > upperBand) {
        position = 'above_upper';
    }
    else if (currentPrice > ma) {
        position = 'above_ma';
    }
    else if (currentPrice < ma) {
        position = 'below_ma';
    }
    else {
        position = 'below_lower';
    }
    // Generate signal
    let signal = 'neutral';
    if (position === 'above_upper') {
        signal = 'overbought';
    }
    else if (position === 'below_lower') {
        signal = 'oversold';
    }
    // Calculate distances
    const distanceFromUpper = ((currentPrice - upperBand) / upperBand) * 100;
    const distanceFromLower = ((lowerBand - currentPrice) / lowerBand) * 100;
    // Calculate band width
    const bandWidth = ((upperBand - lowerBand) / ma) * 100;
    return {
        ma,
        upperBand,
        lowerBand,
        percentage,
        position,
        signal,
        distanceFromUpper,
        distanceFromLower,
        bandWidth
    };
}
/**
 * Calculate Multiple MA Envelopes
 * @param prices Array of prices
 * @param periods Array of periods for different envelopes
 * @param percentage Envelope percentage
 * @returns Array of MAEnvelopeData objects
 */
export function calculateMultipleMAEnvelopes(prices, periods = [10, 20, 50], percentage = 2.5) {
    return periods
        .map(period => calculateMAEnvelope(prices, period, percentage))
        .filter((envelope) => envelope !== null);
}
/**
 * Get MA Envelope Signal Strength
 * @param envelope MAEnvelopeData object
 * @returns Signal strength (0-100)
 */
export function getMAEnvelopeSignalStrength(envelope) {
    const { position, distanceFromUpper, distanceFromLower, percentage } = envelope;
    if (position === 'above_upper') {
        // Overbought signal strength based on distance from upper band
        const maxDistance = percentage * 2; // Consider 2x the band percentage as max
        return Math.min(100, (distanceFromUpper / maxDistance) * 100);
    }
    else if (position === 'below_lower') {
        // Oversold signal strength based on distance from lower band
        const maxDistance = percentage * 2;
        return Math.min(100, (distanceFromLower / maxDistance) * 100);
    }
    return 0; // Neutral
}
