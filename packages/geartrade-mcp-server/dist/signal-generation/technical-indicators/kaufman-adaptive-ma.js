/**
 * Kaufman Adaptive Moving Average (KAMA) Indicator
 * Adaptive moving average that adjusts smoothing based on market efficiency
 */
/**
 * Calculate Kaufman Adaptive Moving Average
 * @param closes Array of closing prices
 * @param efficiencyPeriod Period for efficiency ratio calculation (default 10)
 * @param fastPeriod Fast EMA period (default 2)
 * @param slowPeriod Slow EMA period (default 30)
 * @returns KaufmanAdaptiveMAData object
 */
export function calculateKaufmanAdaptiveMA(closes, efficiencyPeriod = 10, fastPeriod = 2, slowPeriod = 30) {
    // Minimum 5 data points required
    if (closes.length < 5) {
        return null;
    }
    // Use adaptive periods based on available data
    const dataRatio = Math.min(1, closes.length / 40);
    const effectiveEfficiencyPeriod = Math.max(3, Math.min(efficiencyPeriod, Math.floor(efficiencyPeriod * dataRatio)));
    const effectiveSlowPeriod = Math.max(5, Math.min(slowPeriod, Math.floor(slowPeriod * dataRatio)));
    // Step 1: Calculate Efficiency Ratio (ER)
    // ER = |Price - Price[n]| / Sum(|Price[i] - Price[i-1]| for i=1 to n)
    const currentPrice = closes[closes.length - 1];
    const priceNPeriodsAgo = closes[Math.max(0, closes.length - 1 - effectiveEfficiencyPeriod)];
    let sumPriceChanges = 0;
    for (let i = Math.max(0, closes.length - effectiveEfficiencyPeriod); i < closes.length - 1; i++) {
        sumPriceChanges += Math.abs(closes[i + 1] - closes[i]);
    }
    const efficiencyRatio = sumPriceChanges > 0 ?
        Math.abs(currentPrice - priceNPeriodsAgo) / sumPriceChanges : 0.5;
    // Step 2: Calculate Smoothing Constant (SC)
    // SC = [ER * (2/(fastPeriod+1) - 2/(slowPeriod+1)) + 2/(slowPeriod+1)]^2
    const fastSC = 2 / (fastPeriod + 1);
    const slowSC = 2 / (effectiveSlowPeriod + 1);
    const smoothingConstant = Math.pow(efficiencyRatio * (fastSC - slowSC) + slowSC, 2);
    // Step 3: Calculate KAMA iteratively (non-recursive to avoid stack overflow)
    let kama;
    // Use simple average for initial KAMA
    const initPeriod = Math.min(effectiveSlowPeriod, closes.length);
    kama = closes.slice(-initPeriod).reduce((sum, price) => sum + price, 0) / initPeriod;
    // Apply smoothing for recent prices
    const smoothingStart = Math.max(0, closes.length - effectiveEfficiencyPeriod);
    for (let i = smoothingStart; i < closes.length; i++) {
        kama = kama + smoothingConstant * (closes[i] - kama);
    }
    // Determine trend
    let trend = 'neutral';
    if (currentPrice > kama * 1.001) {
        trend = 'bullish';
    }
    else if (currentPrice < kama * 0.999) {
        trend = 'bearish';
    }
    // Price vs KAMA
    const priceVsKama = ((currentPrice - kama) / kama) * 100;
    let position = 'equal';
    if (currentPrice > kama * 1.001) {
        position = 'above';
    }
    else if (currentPrice < kama * 0.999) {
        position = 'below';
    }
    // Calculate signal strength
    const strength = Math.min(100, Math.abs(priceVsKama) * 2 + efficiencyRatio * 50);
    // Determine market condition based on efficiency ratio
    let marketCondition = 'neutral';
    if (efficiencyRatio > 0.6) {
        marketCondition = 'trending';
    }
    else if (efficiencyRatio < 0.3) {
        marketCondition = 'ranging';
    }
    // Determine responsiveness
    let responsiveness = 'moderate';
    if (smoothingConstant > 0.1) {
        responsiveness = 'high';
    }
    else if (smoothingConstant < 0.05) {
        responsiveness = 'low';
    }
    // Generate trading signal
    let signal = 'neutral';
    if (trend === 'bullish' && marketCondition === 'trending' && responsiveness === 'high') {
        signal = 'buy';
    }
    else if (trend === 'bearish' && marketCondition === 'trending' && responsiveness === 'high') {
        signal = 'sell';
    }
    return {
        kama,
        efficiencyRatio,
        smoothingConstant,
        trend,
        priceVsKama,
        position,
        strength,
        marketCondition,
        responsiveness,
        signal
    };
}
/**
 * Calculate KAMA for multiple parameter combinations
 * @param closes Array of closing prices
 * @param parameterSets Array of [efficiencyPeriod, fastPeriod, slowPeriod] combinations
 * @returns Array of KaufmanAdaptiveMAData objects
 */
export function calculateMultipleKAMA(closes, parameterSets = [[10, 2, 30], [5, 2, 20]]) {
    return parameterSets
        .map(([efficiencyPeriod, fastPeriod, slowPeriod]) => calculateKaufmanAdaptiveMA(closes, efficiencyPeriod, fastPeriod, slowPeriod))
        .filter((kama) => kama !== null);
}
/**
 * Get KAMA interpretation
 * @param kama KaufmanAdaptiveMAData object
 * @returns Human-readable interpretation
 */
export function getKAMAInterpretation(kama) {
    const { kama: value, marketCondition, responsiveness, efficiencyRatio, trend } = kama;
    let interpretation = `KAMA: ${value.toFixed(4)}`;
    interpretation += ` - ${marketCondition} market (${responsiveness} responsiveness)`;
    interpretation += ` - ER: ${(efficiencyRatio * 100).toFixed(1)}%`;
    if (trend !== 'neutral') {
        interpretation += ` - ${trend} trend`;
    }
    return interpretation;
}
/**
 * Analyze KAMA adaptability
 * @param kama KaufmanAdaptiveMAData object
 * @returns Adaptability analysis
 */
export function analyzeKAMAAdaptability(kama) {
    const { efficiencyRatio, smoothingConstant, marketCondition } = kama;
    // Adaptability score based on how well the MA adapts to market conditions
    const adaptabilityScore = Math.min(100, efficiencyRatio * 100 + (1 - smoothingConstant) * 50);
    const marketEfficiency = efficiencyRatio * 100;
    let recommendedTimeframe = 'Daily';
    if (marketCondition === 'trending') {
        recommendedTimeframe = 'Daily to Weekly';
    }
    else if (marketCondition === 'ranging') {
        recommendedTimeframe = 'Intraday';
    }
    let strategySuggestion = 'Use for trend following';
    if (marketCondition === 'trending' && efficiencyRatio > 0.7) {
        strategySuggestion = 'Strong trending market - use breakout strategies';
    }
    else if (marketCondition === 'ranging' && efficiencyRatio < 0.3) {
        strategySuggestion = 'Sideways market - use mean reversion strategies';
    }
    else {
        strategySuggestion = 'Mixed market - use flexible strategies';
    }
    return { adaptabilityScore, marketEfficiency, recommendedTimeframe, strategySuggestion };
}
/**
 * Calculate KAMA slope for trend strength
 * @param closes Array of closing prices
 * @param period Period for slope calculation
 * @returns KAMA slope value
 */
export function calculateKAMASlope(closes, period = 5) {
    if (closes.length < period + 20) { // Need enough data for KAMA calculation
        return 0;
    }
    const kamaValues = [];
    // Calculate KAMA for the last 'period' points
    for (let i = Math.max(20, closes.length - period); i < closes.length; i++) {
        const slice = closes.slice(0, i + 1);
        const kama = calculateKaufmanAdaptiveMA(slice);
        if (kama) {
            kamaValues.push(kama.kama);
        }
    }
    if (kamaValues.length < 2) {
        return 0;
    }
    // Calculate slope using linear regression
    const n = kamaValues.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;
    for (let i = 0; i < n; i++) {
        sumX += i;
        sumY += kamaValues[i];
        sumXY += i * kamaValues[i];
        sumXX += i * i;
    }
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return slope;
}
