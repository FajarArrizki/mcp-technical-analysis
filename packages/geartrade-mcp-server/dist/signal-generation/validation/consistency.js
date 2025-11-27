/**
 * Signal-Justification Consistency Validation
 * validateSignalJustificationConsistency function
 */
/**
 * Validate that signal and justification are consistent
 */
export function validateSignalJustificationConsistency(signal, justification) {
    if (!justification || typeof justification !== 'string') {
        return { isValid: false, reason: 'Justification is missing or invalid' };
    }
    const justificationLower = justification.toLowerCase();
    const signalType = signal.signal?.toLowerCase();
    // Define keywords for each direction
    const bullishKeywords = ['long', 'bullish', 'buy', 'buying', 'uptrend', 'upward', 'oversold', 'bounce', 'rebound', 'entering long'];
    const bearishKeywords = ['short', 'bearish', 'sell', 'selling', 'downtrend', 'downward', 'overbought', 'reversal', 'entering short'];
    // Count keyword matches
    let bullishMatches = 0;
    let bearishMatches = 0;
    bullishKeywords.forEach(keyword => {
        if (justificationLower.includes(keyword))
            bullishMatches++;
    });
    bearishKeywords.forEach(keyword => {
        if (justificationLower.includes(keyword))
            bearishMatches++;
    });
    // Check consistency
    if (signalType === 'buy_to_enter' || signalType === 'add') {
        if (bearishMatches > bullishMatches && bearishMatches > 0) {
            return {
                isValid: false,
                reason: `BUY signal but justification contains more bearish keywords (${bearishMatches} bearish vs ${bullishMatches} bullish)`
            };
        }
        if (bullishMatches === 0 && bearishMatches > 0) {
            return {
                isValid: false,
                reason: `BUY signal but justification contains only bearish keywords`
            };
        }
    }
    else if (signalType === 'sell_to_enter') {
        if (bullishMatches > bearishMatches && bullishMatches > 0) {
            return {
                isValid: false,
                reason: `SELL signal but justification contains more bullish keywords (${bullishMatches} bullish vs ${bearishMatches} bearish)`
            };
        }
        if (bearishMatches === 0 && bullishMatches > 0) {
            return {
                isValid: false,
                reason: `SELL signal but justification contains only bullish keywords`
            };
        }
    }
    return { isValid: true };
}
