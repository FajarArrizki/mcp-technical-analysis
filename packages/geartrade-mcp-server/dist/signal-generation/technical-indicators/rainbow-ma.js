/**
 * Rainbow Moving Average Indicator
 * Multiple moving averages with different periods for trend visualization
 */
/**
 * Calculate Rainbow Moving Average
 * @param prices Array of closing prices
 * @param periods Array of periods for each MA (default rainbow periods)
 * @returns RainbowMAData object
 */
export function calculateRainbowMA(prices, periods = [2, 3, 4, 5, 6, 7, 8, 9]) {
    if (periods.length < 8 || prices.length < Math.max(...periods)) {
        return null;
    }
    // Calculate all MAs
    const mas = [];
    for (const period of periods) {
        const ma = prices.slice(-period).reduce((sum, price) => sum + price, 0) / period;
        mas.push(ma);
    }
    // Extract individual MA values
    const [ma2, ma3, ma4, ma5, ma6, ma7, ma8, ma9] = mas;
    // Determine alignment (bullish = fast MAs above slow MAs)
    let bullishCount = 0;
    let bearishCount = 0;
    for (let i = 0; i < mas.length - 1; i++) {
        if (mas[i] > mas[i + 1]) {
            bullishCount++;
        }
        else if (mas[i] < mas[i + 1]) {
            bearishCount++;
        }
    }
    let alignment;
    if (bullishCount >= mas.length - 2) {
        alignment = 'bullish_alignment';
    }
    else if (bearishCount >= mas.length - 2) {
        alignment = 'bearish_alignment';
    }
    else {
        alignment = 'mixed';
    }
    // Determine trend based on alignment and price position
    let trend = 'neutral';
    if (alignment === 'bullish_alignment') {
        trend = 'bullish';
        // Check for strong bullish (price well above rainbow)
        const currentPrice = prices[prices.length - 1];
        if (currentPrice > ma2 * 1.02) {
            trend = 'strong_bullish';
        }
    }
    else if (alignment === 'bearish_alignment') {
        trend = 'bearish';
        // Check for strong bearish (price well below rainbow)
        const currentPrice = prices[prices.length - 1];
        if (currentPrice < ma9 * 0.98) {
            trend = 'strong_bearish';
        }
    }
    // Current price position vs rainbow
    const currentPrice = prices[prices.length - 1];
    const highestMA = Math.max(...mas);
    const lowestMA = Math.min(...mas);
    let position;
    if (currentPrice > highestMA) {
        position = 'above_rainbow';
    }
    else if (currentPrice < lowestMA) {
        position = 'below_rainbow';
    }
    else {
        position = 'in_rainbow';
    }
    // Calculate trend strength
    let strength = 50; // Base neutral strength
    if (alignment === 'bullish_alignment') {
        strength += bullishCount * 5;
        if (position === 'above_rainbow')
            strength += 20;
    }
    else if (alignment === 'bearish_alignment') {
        strength -= bearishCount * 5;
        if (position === 'below_rainbow')
            strength -= 20;
    }
    strength = Math.max(0, Math.min(100, strength));
    // Calculate spread between fastest and slowest MA
    const spread = ((ma2 - ma9) / ma9) * 100;
    // Check for compression (all MAs close together)
    const avgMA = mas.reduce((sum, ma) => sum + ma, 0) / mas.length;
    const variance = mas.reduce((sum, ma) => sum + Math.pow(ma - avgMA, 2), 0) / mas.length;
    const stdDev = Math.sqrt(variance);
    const compression = stdDev / avgMA < 0.01; // Less than 1% standard deviation
    return {
        ma2, ma3, ma4, ma5, ma6, ma7, ma8, ma9,
        trend,
        alignment,
        position,
        strength,
        spread,
        compression
    };
}
/**
 * Get Rainbow MA signal
 * @param rainbow RainbowMAData object
 * @returns Trading signal
 */
export function getRainbowMASignal(rainbow) {
    const { trend, alignment, position, compression } = rainbow;
    // Compression followed by alignment change is a strong signal
    if (compression && alignment === 'bullish_alignment') {
        return 'buy';
    }
    else if (compression && alignment === 'bearish_alignment') {
        return 'sell';
    }
    // Strong trend signals
    if (trend === 'strong_bullish' && position === 'above_rainbow') {
        return 'buy';
    }
    else if (trend === 'strong_bearish' && position === 'below_rainbow') {
        return 'sell';
    }
    // Moderate trend signals
    if (trend === 'bullish' && position === 'above_rainbow') {
        return 'buy';
    }
    else if (trend === 'bearish' && position === 'below_rainbow') {
        return 'sell';
    }
    return 'neutral';
}
/**
 * Calculate Rainbow MA slope
 * @param rainbow RainbowMAData object
 * @returns Average slope of all MAs
 */
export function getRainbowMASlope(rainbow) {
    const mas = [rainbow.ma2, rainbow.ma3, rainbow.ma4, rainbow.ma5,
        rainbow.ma6, rainbow.ma7, rainbow.ma8, rainbow.ma9];
    // Calculate slope using linear regression
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;
    for (let i = 0; i < mas.length; i++) {
        sumX += i;
        sumY += mas[i];
        sumXY += i * mas[i];
        sumXX += i * i;
    }
    const n = mas.length;
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope;
}
/**
 * Check for Rainbow MA fan formation
 * @param rainbow RainbowMAData object
 * @returns Whether MAs are forming a fan pattern
 */
export function isRainbowMAFan(rainbow) {
    const mas = [rainbow.ma2, rainbow.ma3, rainbow.ma4, rainbow.ma5,
        rainbow.ma6, rainbow.ma7, rainbow.ma8, rainbow.ma9];
    // Check if MAs are roughly parallel (fan formation)
    let parallelCount = 0;
    const tolerance = 0.005; // 0.5% tolerance
    for (let i = 0; i < mas.length - 2; i++) {
        const slope1 = mas[i + 1] - mas[i];
        const slope2 = mas[i + 2] - mas[i + 1];
        if (Math.abs(slope1 - slope2) / Math.abs(slope1) < tolerance) {
            parallelCount++;
        }
    }
    return parallelCount >= mas.length - 3; // Most MAs are parallel
}
