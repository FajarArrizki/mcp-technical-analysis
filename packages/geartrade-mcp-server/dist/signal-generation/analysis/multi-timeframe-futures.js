/**
 * Multi-Timeframe Futures Analysis
 * Analyze futures data across 5m, 15m, 1h, 4h, 1d timeframes
 */
import { calculateFundingRateIndicators } from '../technical-indicators/funding-rate';
import { calculateOpenInterestIndicators } from '../technical-indicators/open-interest';
/**
 * Analyze single timeframe
 */
export function analyzeTimeframe(timeframe, fundingRate, openInterest, priceChange, volumeChange) {
    const fundingIndicators = calculateFundingRateIndicators(fundingRate);
    const oiIndicators = calculateOpenInterestIndicators(openInterest, priceChange, volumeChange);
    // Determine trend
    let trend = 'neutral';
    // Trend based on funding rate and OI
    if (fundingRate.trend === 'rising' || oiIndicators.trend.direction === 'rising') {
        trend = 'bearish'; // High funding / rising OI often precedes bearish moves
    }
    else if (fundingRate.trend === 'falling' || oiIndicators.trend.direction === 'falling') {
        trend = 'bullish'; // Low funding / falling OI often precedes bullish moves
    }
    // Signal based on indicators
    let signal = 'neutral';
    if (fundingIndicators.extreme.isExtreme && fundingIndicators.extreme.level === 'extreme_high') {
        signal = 'short'; // Extreme high funding = short signal
    }
    else if (fundingIndicators.extreme.isExtreme && fundingIndicators.extreme.level === 'extreme_low') {
        signal = 'long'; // Extreme low funding = long signal
    }
    else if (fundingIndicators.meanReversion.signal) {
        signal = fundingIndicators.meanReversion.direction; // Mean reversion signal
    }
    else if (oiIndicators.divergence.vsPrice.detected) {
        signal = oiIndicators.divergence.vsPrice.type === 'bullish' ? 'long' : 'short';
    }
    // Alignment score (placeholder - calculated in aggregate)
    const alignmentScore = 50;
    return {
        timeframe,
        fundingRate,
        openInterest,
        trend,
        alignmentScore,
        signal
    };
}
/**
 * Calculate alignment score across timeframes
 */
function calculateAlignmentScore(timeframes) {
    const signals = Array.from(timeframes.values()).map(tf => tf.signal);
    if (signals.length === 0) {
        return 0;
    }
    // Count signal types
    const longCount = signals.filter(s => s === 'long').length;
    const shortCount = signals.filter(s => s === 'short').length;
    const neutralCount = signals.filter(s => s === 'neutral').length;
    // Perfect alignment: all signals agree
    const totalTimeframes = signals.length;
    if (longCount === totalTimeframes) {
        return 100; // All long
    }
    else if (shortCount === totalTimeframes) {
        return 100; // All short
    }
    // Partial alignment: majority agree
    const majorityCount = Math.max(longCount, shortCount);
    const alignmentPct = (majorityCount / totalTimeframes) * 100;
    // Penalize neutral signals (reduce confidence)
    const neutralPenalty = (neutralCount / totalTimeframes) * 30;
    return Math.max(0, Math.min(100, alignmentPct - neutralPenalty));
}
/**
 * Determine consensus signal
 */
function determineConsensusSignal(timeframes) {
    const signals = Array.from(timeframes.values()).map(tf => tf.signal);
    const longCount = signals.filter(s => s === 'long').length;
    const shortCount = signals.filter(s => s === 'short').length;
    if (longCount > shortCount && longCount > signals.length / 2) {
        return 'long';
    }
    else if (shortCount > longCount && shortCount > signals.length / 2) {
        return 'short';
    }
    return 'neutral';
}
/**
 * Calculate confidence
 */
function calculateConfidence(alignmentScore, timeframes) {
    // Base confidence from alignment
    const baseConfidence = alignmentScore / 100;
    // Boost confidence if more timeframes align
    const signalCount = Array.from(timeframes.values()).filter(tf => tf.signal !== 'neutral').length;
    const totalTimeframes = timeframes.size;
    const signalRatio = totalTimeframes > 0 ? signalCount / totalTimeframes : 0;
    // Combined confidence
    const confidence = baseConfidence * 0.7 + signalRatio * 0.3;
    return Math.max(0, Math.min(1, confidence));
}
/**
 * Analyze multi-timeframe futures
 */
export function analyzeMultiTimeframeFutures(futuresDataMap, priceChanges, volumeChanges) {
    const timeframes = new Map();
    // Analyze each timeframe
    const timeframeKeys = ['5m', '15m', '1h', '4h', '1d'];
    for (const tf of timeframeKeys) {
        const data = futuresDataMap instanceof Map ? futuresDataMap.get(tf) : futuresDataMap[tf];
        if (data) {
            const priceChange = priceChanges
                ? (priceChanges instanceof Map ? priceChanges.get(tf) : priceChanges[tf]) || 0
                : 0;
            const volumeChange = volumeChanges
                ? (volumeChanges instanceof Map ? volumeChanges.get(tf) : volumeChanges[tf]) || 0
                : 0;
            const analysis = analyzeTimeframe(tf, data.fundingRate, data.openInterest, priceChange, volumeChange);
            timeframes.set(tf, analysis);
        }
    }
    // Calculate alignment
    const alignmentScore = calculateAlignmentScore(timeframes);
    // Determine consensus
    const consensusSignal = determineConsensusSignal(timeframes);
    // Calculate confidence
    const confidence = calculateConfidence(alignmentScore, timeframes);
    // Generate strengths and weaknesses
    const strengths = [];
    const weaknesses = [];
    const signals = Array.from(timeframes.values()).map(tf => tf.signal);
    const longCount = signals.filter(s => s === 'long').length;
    const shortCount = signals.filter(s => s === 'short').length;
    if (alignmentScore >= 80) {
        strengths.push(`Strong timeframe alignment (${alignmentScore}%)`);
    }
    else if (alignmentScore < 50) {
        weaknesses.push(`Weak timeframe alignment (${alignmentScore}%)`);
    }
    if (consensusSignal !== 'neutral') {
        strengths.push(`Consensus ${consensusSignal.toUpperCase()} across ${longCount + shortCount} timeframes`);
    }
    else {
        weaknesses.push('No clear consensus across timeframes');
    }
    return {
        timeframes,
        alignmentScore: isNaN(alignmentScore) ? 0 : alignmentScore,
        consensusSignal,
        confidence: isNaN(confidence) || !isFinite(confidence) ? 0 : confidence,
        strengths,
        weaknesses
    };
}
