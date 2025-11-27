/**
 * Futures Confidence Scoring System
 * Score signals based on funding rate, OI, liquidation, whale, BTC correlation
 */
import { calculateFundingRateIndicators } from '../technical-indicators/funding-rate';
import { calculateOpenInterestIndicators } from '../technical-indicators/open-interest';
import { calculateLiquidationIndicators } from '../technical-indicators/liquidation';
import { calculateLongShortRatioIndicators } from '../technical-indicators/long-short-ratio';
/**
 * Score funding rate (0-20 points)
 */
function scoreFundingRate(futuresData, context) {
    const fundingData = futuresData.fundingRate;
    const indicators = calculateFundingRateIndicators(fundingData, futuresData.openInterest.change24h, context.priceChange24h || 0);
    let score = 0;
    const reasons = [];
    // Base score: extreme funding = reversal opportunity (0-10 points)
    if (indicators.extreme.isExtreme) {
        if ((indicators.extreme.level === 'extreme_high' && context.signal === 'SHORT') ||
            (indicators.extreme.level === 'extreme_low' && context.signal === 'LONG')) {
            // Perfect: extreme funding + contrarian signal
            score += 10;
            reasons.push(`Extreme funding (${(fundingData.current * 10000).toFixed(2)}bps) favors ${context.signal} signal`);
        }
        else {
            // Mismatch: extreme funding but wrong direction
            score -= 5;
            reasons.push(`Warning: Extreme funding contradicts ${context.signal} signal`);
        }
    }
    // Momentum score (0-5 points)
    if (indicators.momentum.trend === 'rising' && context.signal === 'SHORT') {
        score += 5;
        reasons.push('Funding momentum rising (favor SHORT)');
    }
    else if (indicators.momentum.trend === 'falling' && context.signal === 'LONG') {
        score += 5;
        reasons.push('Funding momentum falling (favor LONG)');
    }
    // Mean reversion signal (0-5 points)
    if (indicators.meanReversion.signal) {
        if ((indicators.meanReversion.direction === 'long' && context.signal === 'LONG') ||
            (indicators.meanReversion.direction === 'short' && context.signal === 'SHORT')) {
            score += 5;
            reasons.push('Mean reversion signal aligns with entry');
        }
    }
    // Penalty for wrong divergence
    if (indicators.divergence.signal === 'bearish' && context.signal === 'LONG') {
        score -= 3;
        reasons.push('Funding divergence bearish (warning for LONG)');
    }
    else if (indicators.divergence.signal === 'bullish' && context.signal === 'SHORT') {
        score -= 3;
        reasons.push('Funding divergence bullish (warning for SHORT)');
    }
    return {
        score: Math.max(0, Math.min(20, score)),
        reasons
    };
}
/**
 * Score open interest (0-20 points)
 */
function scoreOpenInterest(futuresData, context) {
    const oiData = futuresData.openInterest;
    const indicators = calculateOpenInterestIndicators(oiData, context.priceChange24h || 0, context.volumeChange24h || 0);
    let score = 0;
    const reasons = [];
    // Trend alignment (0-8 points)
    if (indicators.trend.direction === 'rising' && context.signal === 'LONG') {
        score += 8;
        reasons.push('OI rising (favor LONG)');
    }
    else if (indicators.trend.direction === 'falling' && context.signal === 'SHORT') {
        score += 8;
        reasons.push('OI falling (favor SHORT)');
    }
    else if (indicators.trend.direction !== 'neutral') {
        score -= 4;
        reasons.push(`OI trend (${indicators.trend.direction}) contradicts ${context.signal} signal`);
    }
    // Divergence score (0-7 points)
    if (indicators.divergence.vsPrice.detected) {
        if ((indicators.divergence.vsPrice.type === 'bullish' && context.signal === 'LONG') ||
            (indicators.divergence.vsPrice.type === 'bearish' && context.signal === 'SHORT')) {
            score += 7;
            reasons.push(`OI divergence ${indicators.divergence.vsPrice.type} (favor ${context.signal})`);
        }
        else {
            score -= 3;
            reasons.push(`OI divergence ${indicators.divergence.vsPrice.type} (warning)`);
        }
    }
    // Momentum breakout (0-5 points)
    if (indicators.momentum.breakout) {
        if (indicators.trend.direction === 'rising' && context.signal === 'LONG') {
            score += 5;
            reasons.push('OI momentum breakout (bullish)');
        }
        else if (indicators.trend.direction === 'falling' && context.signal === 'SHORT') {
            score += 5;
            reasons.push('OI momentum breakout (bearish)');
        }
    }
    return {
        score: Math.max(0, Math.min(20, score)),
        reasons
    };
}
/**
 * Score liquidation zones (0-15 points)
 */
function scoreLiquidationZones(futuresData, context) {
    const liquidationData = futuresData.liquidation;
    const indicators = calculateLiquidationIndicators(liquidationData, context.currentPrice);
    let score = 0;
    const reasons = [];
    // Safe entry zones (0-8 points)
    if (indicators.safeEntry.zones.length > 0) {
        const inSafeZone = indicators.safeEntry.zones.some(zone => context.currentPrice >= zone.priceLow && context.currentPrice <= zone.priceHigh);
        if (inSafeZone) {
            score += 8;
            reasons.push('Price in safe entry zone (low liquidation density)');
        }
        else {
            // Not in safe zone, but zones exist
            score += 4;
            reasons.push('Safe entry zones identified (not at current price)');
        }
    }
    // Liquidation distance (0-4 points)
    const distance = indicators.clusters.distance;
    if (distance > 5) {
        score += 4;
        reasons.push(`Good liquidation distance (${distance.toFixed(1)}%)`);
    }
    else if (distance > 3) {
        score += 2;
        reasons.push(`Moderate liquidation distance (${distance.toFixed(1)}%)`);
    }
    else {
        score -= 3;
        reasons.push(`Warning: Low liquidation distance (${distance.toFixed(1)}%)`);
    }
    // Stop hunt prediction (0-3 points)
    if (indicators.stopHunt.predicted) {
        const targetPrice = indicators.stopHunt.targetPrice || 0;
        const distanceToTarget = Math.abs(targetPrice - context.currentPrice) / context.currentPrice * 100;
        if (distanceToTarget > 2) {
            score += 3;
            reasons.push(`Stop hunt predicted but far (${distanceToTarget.toFixed(1)}% away)`);
        }
        else {
            score -= 5;
            reasons.push(`Warning: Stop hunt likely nearby (${distanceToTarget.toFixed(1)}% away)`);
        }
    }
    return {
        score: Math.max(0, Math.min(15, score)),
        reasons
    };
}
/**
 * Score long/short ratio (0-15 points)
 */
function scoreLongShortRatio(futuresData, context) {
    const ratioData = futuresData.longShortRatio;
    const indicators = calculateLongShortRatioIndicators(ratioData);
    let score = 0;
    const reasons = [];
    // Contrarian signal (0-8 points)
    if (indicators.contrarian.signal) {
        if ((indicators.contrarian.direction === 'long' && context.signal === 'LONG') ||
            (indicators.contrarian.direction === 'short' && context.signal === 'SHORT')) {
            // Perfect: contrarian signal aligns
            const strength = indicators.contrarian.strength;
            score += 8 * strength;
            reasons.push(`Contrarian signal: fade retail (${indicators.contrarian.direction.toUpperCase()})`);
        }
        else {
            score -= 4;
            reasons.push(`Warning: Contrarian signal contradicts ${context.signal} entry`);
        }
    }
    // Extreme ratio (0-4 points)
    if (indicators.extreme.detected) {
        if ((indicators.extreme.level === 'extreme_short' && context.signal === 'LONG') ||
            (indicators.extreme.level === 'extreme_long' && context.signal === 'SHORT')) {
            score += 4;
            reasons.push(`Extreme ratio favors ${context.signal} (reversal likely)`);
        }
    }
    // Retail vs Pro divergence (0-3 points)
    if (indicators.divergence.signal === 'fade_retail') {
        // Fade retail sentiment
        if ((ratioData.retailLongPct > 60 && context.signal === 'SHORT') ||
            (ratioData.retailLongPct < 40 && context.signal === 'LONG')) {
            score += 3;
            reasons.push('Follow pro, fade retail (aligns with entry)');
        }
    }
    return {
        score: Math.max(0, Math.min(15, score)),
        reasons
    };
}
/**
 * Score BTC correlation (0-15 points)
 */
function scoreBTCCorrelation(correlationData, context) {
    let score = 0;
    const reasons = [];
    // Correlation strength (0-5 points)
    if (correlationData.strength === 'strong') {
        score += 5;
        reasons.push('Strong BTC correlation (predictable moves)');
    }
    else if (correlationData.strength === 'moderate') {
        score += 3;
        reasons.push('Moderate BTC correlation');
    }
    // Positive correlation for LONG, negative for SHORT (0-7 points)
    const correlation7d = correlationData.correlation7d;
    if (context.signal === 'LONG' && correlation7d > 0.5) {
        score += 7;
        reasons.push(`Strong positive BTC correlation (${correlation7d.toFixed(2)}) favors LONG`);
    }
    else if (context.signal === 'SHORT' && correlation7d < -0.5) {
        score += 7;
        reasons.push(`Strong negative BTC correlation (${correlation7d.toFixed(2)}) favors SHORT`);
    }
    else if (Math.abs(correlation7d) > 0.5) {
        // High correlation but wrong direction
        score -= 3;
        reasons.push(`Warning: BTC correlation (${correlation7d.toFixed(2)}) may oppose ${context.signal} signal`);
    }
    // Impact multiplier (0-3 points)
    if (correlationData.impactMultiplier > 1.5) {
        score += 3;
        reasons.push(`High BTC impact multiplier (${correlationData.impactMultiplier.toFixed(2)}x)`);
    }
    return {
        score: Math.max(0, Math.min(15, score)),
        reasons
    };
}
/**
 * Score whale activity (0-15 points)
 */
function scoreWhaleActivity(whaleFlow, whaleScore, context) {
    let score = 0;
    const reasons = [];
    // Base whale activity score (0-5 points)
    score += whaleScore * 5;
    // Smart money flow alignment (0-10 points)
    if (context.signal === 'LONG' && whaleFlow > 0.3) {
        score += 10;
        reasons.push(`Strong smart money accumulation (flow: ${whaleFlow.toFixed(2)})`);
    }
    else if (context.signal === 'SHORT' && whaleFlow < -0.3) {
        score += 10;
        reasons.push(`Strong smart money distribution (flow: ${whaleFlow.toFixed(2)})`);
    }
    else if (Math.abs(whaleFlow) > 0.2) {
        // Moderate flow
        const alignment = (context.signal === 'LONG' && whaleFlow > 0) || (context.signal === 'SHORT' && whaleFlow < 0);
        if (alignment) {
            score += 5;
            reasons.push(`Smart money flow aligns with ${context.signal} signal`);
        }
        else {
            score -= 3;
            reasons.push(`Warning: Smart money flow opposes ${context.signal} signal`);
        }
    }
    return {
        score: Math.max(0, Math.min(15, score)),
        reasons
    };
}
/**
 * Calculate futures signal confidence score
 */
export function calculateFuturesConfidence(futuresData, btcCorrelation, whaleFlow, whaleScore, context) {
    const signalContext = context || {
        signal: 'LONG', // Default
        currentPrice: futuresData.price
    };
    // Score each component
    const fundingScore = scoreFundingRate(futuresData, signalContext);
    const oiScore = scoreOpenInterest(futuresData, signalContext);
    const liquidationScore = scoreLiquidationZones(futuresData, signalContext);
    const ratioScore = scoreLongShortRatio(futuresData, signalContext);
    const btcScore = btcCorrelation ? scoreBTCCorrelation(btcCorrelation, signalContext) : { score: 0, reasons: [] };
    const whaleActivityScore = (whaleFlow !== undefined && whaleScore !== undefined)
        ? scoreWhaleActivity(whaleFlow, whaleScore, signalContext)
        : { score: 0, reasons: [] };
    // Calculate total score
    const totalScore = fundingScore.score + oiScore.score + liquidationScore.score +
        ratioScore.score + btcScore.score + whaleActivityScore.score;
    // Collect all reasons
    const strengths = [];
    const weaknesses = [];
    for (const reason of [
        ...fundingScore.reasons,
        ...oiScore.reasons,
        ...liquidationScore.reasons,
        ...ratioScore.reasons,
        ...btcScore.reasons,
        ...whaleActivityScore.reasons
    ]) {
        if (reason.startsWith('Warning:') || reason.startsWith('⚠️')) {
            weaknesses.push(reason);
        }
        else {
            strengths.push(reason);
        }
    }
    // Calculate confidence (0-1)
    const confidence = Math.min(1, Math.max(0, totalScore / 100));
    return {
        fundingRateScore: fundingScore.score,
        openInterestScore: oiScore.score,
        liquidationZoneScore: liquidationScore.score,
        longShortRatioScore: ratioScore.score,
        btcCorrelationScore: btcScore.score,
        whaleActivityScore: whaleActivityScore.score,
        totalScore: Math.max(0, Math.min(100, totalScore)),
        confidence,
        strengths,
        weaknesses
    };
}
