/**
 * Indicator Quality Weights
 * Quality-weighted justification system instead of simple counting
 */
/**
 * Indicator groups to detect redundancy
 * Indicators in same group measure similar things
 */
export const INDICATOR_GROUPS = [
    {
        name: 'Price Position',
        weight: 0.5, // Reduce weight karena redundant
        indicators: ['EMA8', 'EMA20', 'VWAP', 'BB_MIDDLE'],
        description: 'Price above/below moving averages'
    },
    {
        name: 'Trend Momentum',
        weight: 1.0, // Full weight
        indicators: ['MACD', 'ADX', 'PLUS_DI', 'EMA_ALIGNMENT'],
        description: 'Trend strength and momentum'
    },
    {
        name: 'Overbought/Oversold',
        weight: 1.5, // Higher weight - very reliable
        indicators: ['RSI', 'STOCHASTIC', 'WILLIAMS_R', 'CCI'],
        description: 'Momentum extremes'
    },
    {
        name: 'Volume Confirmation',
        weight: 1.0,
        indicators: ['OBV', 'VOLUME_TREND', 'VOLUME_PRICE_DIVERGENCE'],
        description: 'Volume-based confirmation'
    },
    {
        name: 'Support/Resistance',
        weight: 1.2,
        indicators: ['SUPPORT_RESISTANCE', 'FIBONACCI', 'PARABOLIC_SAR'],
        description: 'Key price levels'
    },
    {
        name: 'Structure & Regime',
        weight: 1.3,
        indicators: ['MARKET_STRUCTURE', 'MARKET_REGIME', 'AROON'],
        description: 'Market structure and regime'
    },
    {
        name: 'Divergence',
        weight: 2.0, // Highest weight - most reliable reversal signal
        indicators: ['MACD_DIVERGENCE', 'RSI_DIVERGENCE'],
        description: 'Price vs momentum divergence'
    },
    {
        name: 'Pattern Recognition',
        weight: 0.8,
        indicators: ['CANDLESTICK_PATTERNS', 'TREND_DETECTION'],
        description: 'Chart patterns'
    }
];
/**
 * Individual indicator weights based on reliability
 */
export const INDICATOR_WEIGHTS = {
    // HIGH IMPACT (Weight 2.0-3.0)
    MACD_DIVERGENCE: {
        name: 'MACD Divergence',
        weight: 3.0,
        impact: 'high',
        reliability: 85,
        category: 'Divergence'
    },
    RSI_DIVERGENCE: {
        name: 'RSI Divergence',
        weight: 2.8,
        impact: 'high',
        reliability: 80,
        category: 'Divergence'
    },
    TRIPLE_OVERBOUGHT: {
        name: 'Triple Overbought (RSI + Stoch + Williams)',
        weight: 2.5,
        impact: 'high',
        reliability: 80,
        category: 'Overbought/Oversold'
    },
    VOLUME_DIVERGENCE: {
        name: 'Volume Divergence',
        weight: 2.2,
        impact: 'high',
        reliability: 75,
        category: 'Volume Confirmation'
    },
    OBV_DIVERGENCE: {
        name: 'OBV Divergence',
        weight: 1.8,
        impact: 'high',
        reliability: 70,
        category: 'Volume Confirmation'
    },
    SUPPORT_RESISTANCE_PROXIMITY: {
        name: 'Support/Resistance Proximity',
        weight: 1.6,
        impact: 'medium',
        reliability: 65,
        category: 'Support/Resistance'
    },
    FUNDING_RATE_EXTREME: {
        name: 'Funding Rate Extreme',
        weight: 1.5,
        impact: 'medium',
        reliability: 60,
        category: 'External'
    },
    // MEDIUM-HIGH IMPACT (Weight 1.5-2.0)
    DUAL_OVERBOUGHT: {
        name: 'Dual Overbought (Stoch + Williams)',
        weight: 2.0,
        impact: 'high',
        reliability: 75,
        category: 'Overbought/Oversold'
    },
    DUAL_OVERSOLD: {
        name: 'Dual Oversold (Stoch + Williams)',
        weight: 2.0,
        impact: 'high',
        reliability: 75,
        category: 'Overbought/Oversold'
    },
    TRIPLE_OVERSOLD: {
        name: 'Triple Oversold (RSI + Stoch + Williams)',
        weight: 2.5,
        impact: 'high',
        reliability: 80,
        category: 'Overbought/Oversold'
    },
    AROON_CONTRADICTION: {
        name: 'Aroon Contradiction',
        weight: 1.8,
        impact: 'high',
        reliability: 70,
        category: 'Structure & Regime'
    },
    ADX_STRONG: {
        name: 'ADX Strong Trend',
        weight: 1.8,
        impact: 'high',
        reliability: 75,
        category: 'Trend Momentum'
    },
    EMA_ALIGNMENT: {
        name: 'EMA Alignment',
        weight: 1.5,
        impact: 'high',
        reliability: 70,
        category: 'Trend Momentum'
    },
    // MEDIUM IMPACT (Weight 1.0-1.5)
    MACD_CROSSOVER: {
        name: 'MACD Crossover',
        weight: 1.2,
        impact: 'medium',
        reliability: 65,
        category: 'Trend Momentum'
    },
    PLUS_DI_DOMINANCE: {
        name: '+DI > -DI',
        weight: 1.2,
        impact: 'medium',
        reliability: 60,
        category: 'Trend Momentum'
    },
    SUPPORT_RESISTANCE: {
        name: 'Support/Resistance Level',
        weight: 1.3,
        impact: 'medium',
        reliability: 65,
        category: 'Support/Resistance'
    },
    FIBONACCI_LEVEL: {
        name: 'Fibonacci Level',
        weight: 1.2,
        impact: 'medium',
        reliability: 60,
        category: 'Support/Resistance'
    },
    MARKET_REGIME: {
        name: 'Market Regime',
        weight: 1.2,
        impact: 'medium',
        reliability: 65,
        category: 'Structure & Regime'
    },
    // LOWER IMPACT - REDUNDANT (Weight 0.3-0.8)
    PRICE_ABOVE_EMA8: {
        name: 'Price > EMA8',
        weight: 0.4,
        impact: 'low',
        reliability: 50,
        category: 'Price Position'
    },
    PRICE_ABOVE_EMA20: {
        name: 'Price > EMA20',
        weight: 0.5,
        impact: 'low',
        reliability: 55,
        category: 'Price Position'
    },
    PRICE_ABOVE_VWAP: {
        name: 'Price > VWAP',
        weight: 0.4,
        impact: 'low',
        reliability: 50,
        category: 'Price Position'
    },
    PRICE_ABOVE_BB_MIDDLE: {
        name: 'Price > BB Middle',
        weight: 0.4,
        impact: 'low',
        reliability: 50,
        category: 'Price Position'
    },
    MACD_HISTOGRAM: {
        name: 'MACD Histogram',
        weight: 0.6,
        impact: 'low',
        reliability: 45,
        category: 'Trend Momentum'
    },
    // NEUTRAL/MINOR (Weight 0.5-1.0)
    RSI_NEUTRAL: {
        name: 'RSI Neutral',
        weight: 0.3,
        impact: 'low',
        reliability: 40,
        category: 'Overbought/Oversold'
    },
    CCI_NEUTRAL: {
        name: 'CCI Neutral',
        weight: 0.3,
        impact: 'low',
        reliability: 40,
        category: 'Overbought/Oversold'
    },
    CANDLESTICK_PATTERN: {
        name: 'Candlestick Pattern',
        weight: 0.7,
        impact: 'medium',
        reliability: 55,
        category: 'Pattern Recognition'
    },
    OBV_POSITIVE: {
        name: 'OBV Positive',
        weight: 0.8,
        impact: 'medium',
        reliability: 60,
        category: 'Volume Confirmation'
    },
    PARABOLIC_SAR: {
        name: 'Parabolic SAR',
        weight: 0.7,
        impact: 'medium',
        reliability: 55,
        category: 'Support/Resistance'
    },
    PRICE_CHANGE_24H: {
        name: '24h Price Change',
        weight: 0.6,
        impact: 'low',
        reliability: 50,
        category: 'Price Position'
    },
    VOLUME_TREND_STABLE: {
        name: 'Volume Trend Stable',
        weight: 0.2,
        impact: 'low',
        reliability: 30,
        category: 'Volume Confirmation'
    },
    FUNDING_RATE_POSITIVE: {
        name: 'Funding Rate Positive',
        weight: 0.5,
        impact: 'low',
        reliability: 45,
        category: 'External'
    }
};
/**
 * Get weight for an indicator
 */
export function getIndicatorWeight(indicatorKey) {
    return INDICATOR_WEIGHTS[indicatorKey]?.weight || 1.0;
}
/**
 * Check if indicators are in same group (redundant)
 */
export function areIndicatorsRedundant(indicator1, indicator2) {
    for (const group of INDICATOR_GROUPS) {
        if (group.indicators.includes(indicator1) && group.indicators.includes(indicator2)) {
            return true;
        }
    }
    return false;
}
/**
 * Conflict Severity Levels
 */
export var ConflictSeverity;
(function (ConflictSeverity) {
    ConflictSeverity[ConflictSeverity["CRITICAL"] = 3] = "CRITICAL";
    ConflictSeverity[ConflictSeverity["HIGH"] = 2] = "HIGH";
    ConflictSeverity[ConflictSeverity["MEDIUM"] = 1.5] = "MEDIUM";
    ConflictSeverity[ConflictSeverity["LOW"] = 1] = "LOW"; // Minor inconsistencies
})(ConflictSeverity || (ConflictSeverity = {}));
export function detectContradictions(indicators, signal) {
    const contradictions = [];
    if (!indicators)
        return contradictions;
    const isBuySignal = signal === 'buy_to_enter' || signal === 'add';
    // 1. Aroon contradiction with EMA trend
    if (indicators.aroon && indicators.ema20 && indicators.ema50 && indicators.price) {
        const price = indicators.price;
        const ema20 = indicators.ema20;
        const ema50 = indicators.ema50;
        const aroonDown = indicators.aroon.down;
        const aroonUp = indicators.aroon.up;
        const emaUptrend = price > ema20 && ema20 > ema50;
        const aroonDowntrend = aroonDown > aroonUp && aroonDown > 70;
        if (isBuySignal && emaUptrend && aroonDowntrend) {
            contradictions.push({
                type: 'aroon_ema_contradiction',
                severity: 'critical',
                severityScore: ConflictSeverity.CRITICAL,
                description: 'EMA shows uptrend but Aroon shows strong downtrend (Down: ' +
                    aroonDown.toFixed(2) + '% > Up: ' + aroonUp.toFixed(2) + '%)',
                indicators: ['AROON', 'EMA20', 'EMA50']
            });
        }
        if (!isBuySignal && !emaUptrend && aroonUp > aroonDown && aroonUp > 70) {
            contradictions.push({
                type: 'aroon_ema_contradiction',
                severity: 'critical',
                severityScore: ConflictSeverity.CRITICAL,
                description: 'EMA shows downtrend but Aroon shows strong uptrend (Up: ' +
                    aroonUp.toFixed(2) + '% > Down: ' + aroonDown.toFixed(2) + '%)',
                indicators: ['AROON', 'EMA20', 'EMA50']
            });
        }
    }
    // 2. Dual/Triple overbought/oversold
    if (indicators.stochastic?.k !== undefined && indicators.williamsR !== undefined && indicators.williamsR !== null) {
        const stochK = indicators.stochastic.k;
        const williamsR = indicators.williamsR;
        const rsi14 = indicators.rsi14;
        if (isBuySignal) {
            // BUY signals: Check for overbought conditions
            const stochOverbought = stochK > 80;
            const williamsOverbought = williamsR > -20;
            const rsiOverbought = rsi14 !== null && rsi14 !== undefined && rsi14 > 70;
            if (stochOverbought && williamsOverbought && rsiOverbought && rsi14 !== null && rsi14 !== undefined) {
                contradictions.push({
                    type: 'triple_overbought',
                    severity: 'critical',
                    severityScore: ConflictSeverity.CRITICAL,
                    description: 'TRIPLE overbought: RSI ' + rsi14.toFixed(2) +
                        ' + Stochastic ' + stochK.toFixed(2) +
                        ' + Williams %R ' + williamsR.toFixed(2) + ' (extremely high reversal risk)',
                    indicators: ['RSI', 'STOCHASTIC', 'WILLIAMS_R']
                });
            }
            else if (stochOverbought && williamsOverbought) {
                contradictions.push({
                    type: 'dual_overbought',
                    severity: 'high',
                    severityScore: ConflictSeverity.HIGH,
                    description: 'Dual overbought: Stochastic K ' + stochK.toFixed(2) +
                        ' + Williams %R ' + williamsR.toFixed(2) + ' (high reversal risk)',
                    indicators: ['STOCHASTIC', 'WILLIAMS_R']
                });
            }
        }
        else {
            // SELL signals: Check for oversold conditions
            const stochOversold = stochK < 20;
            const williamsOversold = williamsR < -80;
            const rsiOversold = rsi14 !== null && rsi14 !== undefined && rsi14 < 30;
            if (stochOversold && williamsOversold && rsiOversold && rsi14 !== null && rsi14 !== undefined) {
                contradictions.push({
                    type: 'triple_oversold',
                    severity: 'critical',
                    severityScore: ConflictSeverity.CRITICAL,
                    description: 'TRIPLE oversold: RSI ' + rsi14.toFixed(2) +
                        ' + Stochastic ' + stochK.toFixed(2) +
                        ' + Williams %R ' + williamsR.toFixed(2) + ' (extremely high reversal risk)',
                    indicators: ['RSI', 'STOCHASTIC', 'WILLIAMS_R']
                });
            }
            else if (stochOversold && williamsOversold) {
                contradictions.push({
                    type: 'dual_oversold',
                    severity: 'high',
                    severityScore: ConflictSeverity.HIGH,
                    description: 'Dual oversold: Stochastic K ' + stochK.toFixed(2) +
                        ' + Williams %R ' + williamsR.toFixed(2) + ' (high reversal risk)',
                    indicators: ['STOCHASTIC', 'WILLIAMS_R']
                });
            }
        }
    }
    // 3. MACD divergence contradiction
    if (indicators.macdDivergence && typeof indicators.macdDivergence === 'object') {
        const divergence = indicators.macdDivergence;
        if (isBuySignal && divergence.divergence === 'bearish') {
            contradictions.push({
                type: 'macd_divergence',
                severity: 'critical',
                severityScore: ConflictSeverity.CRITICAL,
                description: 'MACD Bearish Divergence: Price rising but momentum declining (strong reversal warning)',
                indicators: ['MACD_DIVERGENCE']
            });
        }
        if (!isBuySignal && divergence.divergence === 'bullish') {
            contradictions.push({
                type: 'macd_divergence',
                severity: 'critical',
                severityScore: ConflictSeverity.CRITICAL,
                description: 'MACD Bullish Divergence: Price falling but momentum rising (strong reversal warning)',
                indicators: ['MACD_DIVERGENCE']
            });
        }
    }
    return contradictions;
}
/**
 * Calculate conflict severity based on contradictions
 */
export function calculateConflictSeverity(contradictions) {
    if (contradictions.length === 0) {
        return ConflictSeverity.LOW;
    }
    // Count critical contradictions
    const criticalCount = contradictions.filter(c => c.severity === 'critical').length;
    const highCount = contradictions.filter(c => c.severity === 'high').length;
    // CRITICAL: 3+ major bearish signals OR 2+ critical contradictions
    if (criticalCount >= 2 || (criticalCount >= 1 && highCount >= 2)) {
        return ConflictSeverity.CRITICAL;
    }
    // HIGH: 2 major bearish signals (1 critical + 1 high, or 2 high)
    if ((criticalCount === 1 && highCount >= 1) || highCount >= 2) {
        return ConflictSeverity.HIGH;
    }
    // MEDIUM: 1 major contradiction
    if (criticalCount === 1 || highCount === 1) {
        return ConflictSeverity.MEDIUM;
    }
    // LOW: Minor inconsistencies
    return ConflictSeverity.LOW;
}
