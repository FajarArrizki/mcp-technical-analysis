/**
 * Indicator Quality Scoring
 * Score assets based on indicator quality and strength
 */
/**
 * Score asset based on indicator quality
 * Higher score = better indicators = more reliable signals
 */
export function scoreIndicatorQuality(asset, marketData) {
    const indicators = marketData?.indicators || {};
    const trendAlignment = marketData?.trendAlignment;
    const externalData = marketData?.externalData || {};
    const historicalData = marketData?.historicalData || [];
    const futures = marketData?.externalData?.futures || null;
    const btcCorr = futures?.btcCorrelation || null;
    const cva = marketData?.externalData?.comprehensiveVolumeAnalysis || null;
    let score = 0;
    const strengths = [];
    const weaknesses = [];
    let indicatorsCount = 0;
    // 1. Check if ANY indicators are available (relaxed check - accept any indicator, not just 5 "required" ones)
    // Check for any indicator: RSI, MACD, BB, EMA, ADX, Aroon, Volume, Support/Resistance, Fibonacci, etc.
    const hasAnyIndicator = !!((indicators.rsi14 !== null && indicators.rsi14 !== undefined) ||
        indicators.macd ||
        indicators.bollingerBands ||
        indicators.ema20 ||
        indicators.ema50 ||
        (indicators.adx !== null && indicators.adx !== undefined) ||
        indicators.aroon ||
        indicators.volume ||
        (indicators.supportLevels && Array.isArray(indicators.supportLevels) && indicators.supportLevels.length > 0) ||
        (indicators.resistanceLevels && Array.isArray(indicators.resistanceLevels) && indicators.resistanceLevels.length > 0) ||
        indicators.fibonacciRetracement ||
        indicators.stochastic ||
        indicators.cci !== null ||
        indicators.williamsR !== null ||
        indicators.parabolicSAR !== null ||
        indicators.obv !== null ||
        trendAlignment ||
        externalData.orderBook ||
        externalData.volumeProfile ||
        futures ||
        cva);
    if (!hasAnyIndicator) {
        return {
            asset,
            score: 0,
            indicatorsCount: 0,
            strengths: [],
            weaknesses: ['No indicators available'],
            quality: 'poor'
        };
    }
    // 14. BTC Correlation Shock Readiness (0-5 points)
    if (btcCorr && typeof btcCorr.correlation7d === 'number' && typeof btcCorr.impactMultiplier === 'number') {
        indicatorsCount++;
        const absCorr = Math.abs(btcCorr.correlation7d);
        if (absCorr >= 0.7 && btcCorr.impactMultiplier > 0.3 && btcCorr.impactMultiplier < 2.5) {
            score += 5;
            strengths.push(`BTC correlation strong (β≈${btcCorr.impactMultiplier.toFixed(2)}, ρ7d=${btcCorr.correlation7d.toFixed(2)})`);
        }
        else if (absCorr >= 0.5) {
            score += 3;
            strengths.push(`BTC correlation moderate (ρ7d=${btcCorr.correlation7d.toFixed(2)})`);
        }
        else {
            weaknesses.push('BTC correlation weak/unstable');
        }
    }
    // 2. RSI (0-18 points, max 18)
    // CRITICAL FIX: RSI scoring logic for QUALITY RANKING
    // For quality ranking, we want STABLE and RELIABLE indicators, not extreme conditions
    // RSI neutral (40-60) = most stable and reliable = highest quality score
    // RSI overbought/oversold = risky, high reversal risk = lower quality score
    if (indicators.rsi14 !== null && indicators.rsi14 !== undefined) {
        const rsi = indicators.rsi14;
        // CRITICAL FIX: Validate RSI is a valid number in range 0-100
        if (typeof rsi === 'number' && !isNaN(rsi) && isFinite(rsi) && rsi >= 0 && rsi <= 100) {
            indicatorsCount++;
            // RSI 40-60 (neutral middle): Highest score for quality (most stable, reliable, low reversal risk)
            if (rsi >= 40 && rsi <= 60) {
                score += 18; // Best quality - most stable, reliable signals
                strengths.push(`RSI in optimal neutral zone (${rsi.toFixed(1)} - stable, reliable)`);
            }
            // RSI 30-40 atau 60-70 (neutral edges): High score (stable, good quality)
            else if ((rsi >= 30 && rsi < 40) || (rsi > 60 && rsi <= 70)) {
                score += 15; // Good quality - stable with some directional bias
                strengths.push(`RSI in neutral zone (${rsi.toFixed(1)} - stable)`);
            }
            // RSI 20-30 atau 70-80 (oversold/overbought): Lower score (risky, high reversal risk)
            else if ((rsi >= 20 && rsi < 30) || (rsi > 70 && rsi <= 80)) {
                score += 12; // Moderate quality - risky, high reversal risk
                if (rsi > 70) {
                    weaknesses.push(`RSI overbought (${rsi.toFixed(1)} - high reversal risk)`);
                }
                else {
                    weaknesses.push(`RSI oversold (${rsi.toFixed(1)} - high reversal risk)`);
                }
            }
            // RSI < 20 atau > 80 (extreme): Lowest score (very risky, extreme reversal risk)
            else if (rsi < 20 || rsi > 80) {
                score += 8; // Poor quality - very risky, extreme reversal risk
                if (rsi > 80) {
                    weaknesses.push(`RSI extreme overbought (${rsi.toFixed(1)} - very high reversal risk)`);
                }
                else {
                    weaknesses.push(`RSI extreme oversold (${rsi.toFixed(1)} - very high reversal risk)`);
                }
            }
            // Should not reach here if validation is correct, but handle gracefully
            else {
                score += 5;
                weaknesses.push(`RSI out of range (${rsi.toFixed(1)})`);
            }
        }
        else {
            // Invalid RSI (NaN, Infinity, or out of range 0-100)
            weaknesses.push(`RSI invalid value (${rsi}) - must be 0-100`);
        }
    }
    // 3. MACD (0-20 points)
    // CRITICAL FIX: MACD histogram thresholds adjusted for crypto (values are typically 0.001-0.01 for most assets)
    // Previous thresholds (20, 10) were too high - crypto MACD histogram values are much smaller
    if (indicators.macd && indicators.macd.histogram !== undefined) {
        const macdHist = indicators.macd.histogram;
        // CRITICAL FIX: Validate MACD histogram is a valid number
        if (typeof macdHist === 'number' && !isNaN(macdHist) && isFinite(macdHist)) {
            indicatorsCount++;
            const absHist = Math.abs(macdHist);
            // Adjusted thresholds for crypto: > 0.01 = strong, > 0.005 = moderate, > 0 = weak but present
            // For BTC/ETH with higher prices, might use > 0.1, but for most altcoins, 0.01 is strong
            if (absHist > 0.01) {
                score += 20; // Strong momentum
                strengths.push(`MACD strong momentum (${macdHist.toFixed(4)})`);
            }
            else if (absHist > 0.005) {
                score += 15; // Moderate momentum
                strengths.push(`MACD moderate momentum (${macdHist.toFixed(4)})`);
            }
            else if (absHist > 0.001) {
                score += 12; // Weak but present momentum
                strengths.push(`MACD weak momentum (${macdHist.toFixed(4)})`);
            }
            else if (absHist > 0) {
                score += 8; // Very weak momentum
                weaknesses.push(`MACD very weak momentum (${macdHist.toFixed(4)})`);
            }
            else {
                // MACD histogram is exactly 0
                score += 5;
                weaknesses.push(`MACD histogram is zero (no momentum)`);
            }
        }
        else {
            // Invalid MACD histogram (NaN or Infinity)
            weaknesses.push(`MACD histogram invalid value (${macdHist})`);
        }
    }
    // 4. Bollinger Bands (0-15 points)
    // CRITICAL FIX: Check for division by zero and validate all values are valid numbers
    if (indicators.bollingerBands && indicators.price) {
        const bbUpper = indicators.bollingerBands.upper;
        const bbLower = indicators.bollingerBands.lower;
        const bbMiddle = indicators.bollingerBands.middle;
        const price = indicators.price;
        // CRITICAL FIX: Validate all values are valid numbers, > 0, and bbMiddle > 0 to avoid division by zero
        if (typeof bbUpper === 'number' && typeof bbLower === 'number' && typeof bbMiddle === 'number' && typeof price === 'number' &&
            !isNaN(bbUpper) && !isNaN(bbLower) && !isNaN(bbMiddle) && !isNaN(price) &&
            isFinite(bbUpper) && isFinite(bbLower) && isFinite(bbMiddle) && isFinite(price) &&
            bbMiddle > 0 && bbUpper > bbLower && price > 0) {
            indicatorsCount++;
            const bbWidth = (bbUpper - bbLower) / bbMiddle;
            // Additional validation: bbWidth should be positive and finite
            if (bbWidth > 0 && isFinite(bbWidth)) {
                if (bbWidth > 0.05) {
                    score += 15; // High volatility - good for trading
                    strengths.push(`BB high volatility (${(bbWidth * 100).toFixed(2)}%)`);
                }
                else if (bbWidth > 0.02) {
                    score += 10; // Moderate volatility
                    strengths.push(`BB moderate volatility (${(bbWidth * 100).toFixed(2)}%)`);
                }
                else {
                    score += 5;
                    weaknesses.push(`BB low volatility (${(bbWidth * 100).toFixed(2)}%)`);
                }
            }
            else {
                weaknesses.push(`BB invalid width calculation (${bbWidth})`);
            }
        }
    }
    // 5. EMA Alignment (0-15 points)
    // CRITICAL FIX: Validate all values are valid numbers and price > 0
    if (indicators.ema20 && indicators.ema50 && indicators.price) {
        const price = indicators.price;
        const ema20 = indicators.ema20;
        const ema50 = indicators.ema50;
        // CRITICAL FIX: Validate all values are valid numbers and > 0
        if (typeof price === 'number' && typeof ema20 === 'number' && typeof ema50 === 'number' &&
            !isNaN(price) && !isNaN(ema20) && !isNaN(ema50) &&
            isFinite(price) && isFinite(ema20) && isFinite(ema50) &&
            price > 0 && ema20 > 0 && ema50 > 0) {
            indicatorsCount++;
            if (price > ema20 && ema20 > ema50) {
                score += 15; // Uptrend structure
                strengths.push('EMA alignment: Price > EMA20 > EMA50 (uptrend)');
            }
            else if (price < ema20 && ema20 < ema50) {
                score += 15; // Downtrend structure
                strengths.push('EMA alignment: Price < EMA20 < EMA50 (downtrend)');
            }
            else {
                score += 5;
                weaknesses.push('EMA alignment: Mixed signals');
            }
        }
        else {
            // Invalid EMA or price values
            weaknesses.push(`EMA alignment: Invalid values (price: ${price}, ema20: ${ema20}, ema50: ${ema50})`);
        }
    }
    // 6. ADX (Trend Strength) (0-15 points)
    // CRITICAL FIX: ADX can be object {adx, plusDI, minusDI} or just number
    if (indicators.adx !== null && indicators.adx !== undefined) {
        // Handle ADX as object or number
        let adx = 0;
        if (typeof indicators.adx === 'object' && indicators.adx !== null && 'adx' in indicators.adx) {
            const adxObj = indicators.adx.adx;
            adx = (typeof adxObj === 'number' && !isNaN(adxObj) && isFinite(adxObj)) ? adxObj : 0;
        }
        else if (typeof indicators.adx === 'number') {
            adx = indicators.adx;
        }
        // CRITICAL FIX: Only score if we have valid ADX value (> 0, finite, not NaN, reasonable range 0-100)
        if (typeof adx === 'number' && !isNaN(adx) && isFinite(adx) && adx > 0 && adx <= 100) {
            indicatorsCount++;
            if (adx > 25) {
                score += 15; // Strong trend
                strengths.push(`ADX strong trend (${adx.toFixed(1)})`);
            }
            else if (adx > 20) {
                score += 10; // Moderate trend
                strengths.push(`ADX moderate trend (${adx.toFixed(1)})`);
            }
            else {
                score += 5;
                weaknesses.push(`ADX weak trend (${adx.toFixed(1)})`);
            }
        }
        else {
            // Invalid ADX value (0, NaN, Infinity, or out of range)
            weaknesses.push(`ADX invalid value (${adx}) - must be > 0 and <= 100`);
        }
    }
    // 7. Aroon (0-10 points)
    // CRITICAL FIX: Check for undefined values (aroonUp or aroonDown could be undefined)
    if (indicators.aroon &&
        indicators.aroon.up !== null && indicators.aroon.up !== undefined &&
        indicators.aroon.down !== null && indicators.aroon.down !== undefined) {
        indicatorsCount++;
        const aroonUp = indicators.aroon.up;
        const aroonDown = indicators.aroon.down;
        // Validate values are numbers
        if (typeof aroonUp === 'number' && typeof aroonDown === 'number' && !isNaN(aroonUp) && !isNaN(aroonDown)) {
            const aroonDiff = Math.abs(aroonUp - aroonDown);
            if (aroonDiff > 50) {
                score += 10; // Strong trend direction
                strengths.push(`Aroon strong direction (${aroonDiff.toFixed(0)} diff)`);
            }
            else if (aroonDiff > 30) {
                score += 7;
                strengths.push(`Aroon moderate direction (${aroonDiff.toFixed(0)} diff)`);
            }
            else {
                score += 3;
                weaknesses.push(`Aroon weak direction (${aroonDiff.toFixed(0)} diff)`);
            }
        }
    }
    // 8. Trend Alignment (0-15 points)
    // CRITICAL FIX: Validate strength is a valid number (0-1 range)
    if (trendAlignment) {
        const aligned = trendAlignment.aligned || false;
        const strength = trendAlignment.strength || 0;
        // CRITICAL FIX: Validate strength is a valid number in range 0-1
        if (typeof strength === 'number' && !isNaN(strength) && isFinite(strength) && strength >= 0 && strength <= 1) {
            indicatorsCount++;
            if (aligned && strength > 0.7) {
                score += 15; // All timeframes aligned
                strengths.push(`Trend alignment: All timeframes aligned (${(strength * 100).toFixed(0)}% strength)`);
            }
            else if (aligned) {
                score += 10;
                strengths.push(`Trend alignment: Aligned (${(strength * 100).toFixed(0)}% strength)`);
            }
            else {
                score += 5;
                weaknesses.push(`Trend alignment: Not aligned (${(strength * 100).toFixed(0)}% strength)`);
            }
        }
        else {
            // Invalid strength value
            weaknesses.push(`Trend alignment: Invalid strength value (${strength}) - must be 0-1`);
        }
    }
    // 9. Volume (0-10 points)
    // CRITICAL FIX: Check for division by zero and validate all values are valid numbers
    if (indicators.volume && historicalData.length > 0) {
        const currentVolume = indicators.volume;
        // CRITICAL FIX: Validate currentVolume is a valid number
        if (typeof currentVolume === 'number' && !isNaN(currentVolume) && isFinite(currentVolume) && currentVolume > 0) {
            const candlesToUse = Math.min(20, historicalData.length);
            const sumVolume = historicalData
                .slice(-candlesToUse)
                .reduce((sum, candle) => {
                const vol = (candle && typeof candle.volume === 'number' && !isNaN(candle.volume) && isFinite(candle.volume))
                    ? candle.volume
                    : 0;
                return sum + vol;
            }, 0);
            const avgVolume = sumVolume / candlesToUse;
            // Skip if avgVolume is 0 or invalid to avoid division by zero
            if (avgVolume > 0 && !isNaN(avgVolume) && isFinite(avgVolume)) {
                indicatorsCount++;
                const volumeRatio = currentVolume / avgVolume;
                // Additional validation: volumeRatio should be positive and finite
                if (volumeRatio > 0 && isFinite(volumeRatio)) {
                    if (volumeRatio > 1.5) {
                        score += 10; // High volume
                        strengths.push(`Volume: High (${(volumeRatio * 100).toFixed(0)}% of average)`);
                    }
                    else if (volumeRatio > 1.2) {
                        score += 7;
                        strengths.push(`Volume: Above average (${(volumeRatio * 100).toFixed(0)}% of average)`);
                    }
                    else {
                        score += 3;
                        weaknesses.push(`Volume: Below average (${(volumeRatio * 100).toFixed(0)}% of average)`);
                    }
                }
                else {
                    weaknesses.push(`Volume: Invalid ratio calculation (${volumeRatio})`);
                }
            }
        }
    }
    // 10. Order Book Imbalance (0-10 points)
    // CRITICAL FIX: Validate imbalance is a valid number
    if (externalData.orderBook?.imbalance !== undefined) {
        const imbalance = externalData.orderBook.imbalance;
        // CRITICAL FIX: Validate imbalance is a valid number
        if (typeof imbalance === 'number' && !isNaN(imbalance) && isFinite(imbalance)) {
            indicatorsCount++;
            const absImbalance = Math.abs(imbalance);
            if (absImbalance > 0.1) {
                score += 10; // Strong imbalance
                strengths.push(`Order book imbalance: ${(imbalance * 100).toFixed(2)}%`);
            }
            else if (absImbalance > 0.05) {
                score += 7;
                strengths.push(`Order book imbalance: ${(imbalance * 100).toFixed(2)}%`);
            }
            else {
                score += 3;
                weaknesses.push(`Order book: Balanced (${(imbalance * 100).toFixed(2)}%)`);
            }
        }
        else {
            // Invalid imbalance value
            weaknesses.push(`Order book imbalance invalid value (${imbalance})`);
        }
    }
    // 11. Support/Resistance Levels (0-10 points)
    // CRITICAL FIX: Check if supportLevels or resistanceLevels exist (can be empty arrays)
    if ((indicators.supportLevels && Array.isArray(indicators.supportLevels)) ||
        (indicators.resistanceLevels && Array.isArray(indicators.resistanceLevels))) {
        indicatorsCount++;
        const supportCount = (indicators.supportLevels && Array.isArray(indicators.supportLevels)) ? indicators.supportLevels.length : 0;
        const resistanceCount = (indicators.resistanceLevels && Array.isArray(indicators.resistanceLevels)) ? indicators.resistanceLevels.length : 0;
        const totalLevels = supportCount + resistanceCount;
        if (supportCount > 0 && resistanceCount > 0) {
            score += 10; // Has both support and resistance
            strengths.push(`Support/Resistance: ${supportCount} support, ${resistanceCount} resistance levels`);
        }
        else if (totalLevels > 0) {
            score += 5; // Has either support or resistance
            strengths.push(`Support/Resistance: ${totalLevels} level(s) (${supportCount} support, ${resistanceCount} resistance)`);
        }
        else {
            // Empty arrays - no levels identified
            score += 0;
            weaknesses.push('Support/Resistance: No levels identified');
        }
    }
    // 12. Fibonacci Retracement (0-15 points)
    if (indicators.fibonacciRetracement) {
        indicatorsCount++;
        const fib = indicators.fibonacciRetracement;
        if (fib.isNearLevel && fib.nearestLevel) {
            // Price is near a Fibonacci level - high quality signal
            // CRITICAL FIX: Validate strength is a valid number (0-100 range)
            const fibStrength = (fib.strength != null && typeof fib.strength === 'number' && !isNaN(fib.strength) && isFinite(fib.strength))
                ? fib.strength
                : 0;
            if (fib.signal && fibStrength > 60) {
                score += 15; // Strong Fibonacci signal
                strengths.push(`Fibonacci: Near ${fib.nearestLevel} level (${fib.signal.toUpperCase()} signal, Strength: ${fibStrength}/100)`);
            }
            else if (fib.signal && fibStrength > 40) {
                score += 12; // Moderate Fibonacci signal
                strengths.push(`Fibonacci: Near ${fib.nearestLevel} level (${fib.signal.toUpperCase()} signal, Strength: ${fibStrength}/100)`);
            }
            else {
                score += 8; // Near level but weak signal
                strengths.push(`Fibonacci: Near ${fib.nearestLevel} level`);
            }
        }
        else if (fib.nearestLevel) {
            // Has Fibonacci levels but price not near
            score += 5;
            strengths.push(`Fibonacci: ${fib.nearestLevel} level identified`);
        }
        else {
            score += 2;
            weaknesses.push('Fibonacci: No clear levels');
        }
        // Bonus for strong trend direction alignment (only if we have a valid level or signal)
        // CRITICAL FIX: Only give bonus if we have meaningful Fibonacci data (near level or valid signal)
        if (fib.direction && fib.direction !== 'neutral' && (fib.isNearLevel || fib.nearestLevel)) {
            score += 2;
            strengths.push(`Fibonacci: ${fib.direction} context`);
        }
    }
    // 13. Futures Data Bonus (0-20 points total distributed)
    // Integrate key futures metrics into quality ranking to prefer assets with cleaner futures context
    if (futures) {
        // Funding rate: prefer near-neutral (low bias) and non-extreme
        const fr = futures.fundingRate;
        if (fr && typeof fr.current === 'number') {
            indicatorsCount++;
            const absFr = Math.abs(fr.current);
            if (absFr < 0.0002) {
                score += 6;
                strengths.push('Funding: near-neutral (low bias)');
            }
            else if (absFr < 0.0006) {
                score += 4;
                strengths.push('Funding: mild (manageable bias)');
            }
            else {
                score += 1;
                weaknesses.push('Funding: elevated (potential bias)');
            }
        }
        // Open Interest: rising OI can indicate interest; penalize extremely low OI
        const oi = futures.openInterest;
        if (oi && typeof oi.current === 'number') {
            indicatorsCount++;
            if (oi.current > 0) {
                score += 4;
                strengths.push('Open Interest: healthy');
            }
            else {
                weaknesses.push('Open Interest: low/unknown');
            }
        }
        // Long/Short ratio: prefer balanced (avoid extremes)
        const ls = futures.longShortRatio;
        if (ls && typeof ls.longPct === 'number' && typeof ls.shortPct === 'number') {
            indicatorsCount++;
            const imbalance = Math.abs(ls.longPct - ls.shortPct);
            if (imbalance <= 10) {
                score += 5;
                strengths.push('L/S ratio: balanced (low crowding)');
            }
            else if (imbalance <= 20) {
                score += 3;
                strengths.push('L/S ratio: mildly imbalanced');
            }
            else {
                weaknesses.push('L/S ratio: crowded side (risk of squeeze)');
            }
        }
        // Liquidation proximity: prefer larger distance to nearest cluster (safer)
        const liq = futures.liquidation;
        if (liq && typeof liq.liquidationDistance === 'number') {
            indicatorsCount++;
            if (liq.liquidationDistance >= 5) {
                score += 3;
                strengths.push('Liquidation: distance comfortable');
            }
            else if (liq.liquidationDistance >= 2) {
                score += 1;
                strengths.push('Liquidation: moderate distance');
            }
            else {
                weaknesses.push('Liquidation: too close (hunt risk)');
            }
        }
        // Premium index: prefer small premium/discount (less distortion)
        const prem = futures.premiumIndex;
        if (prem && typeof prem.premiumPct === 'number') {
            indicatorsCount++;
            const absPrem = Math.abs(prem.premiumPct);
            if (absPrem < 0.0005) {
                score += 2;
                strengths.push('Premium: tight spot-future');
            }
            else if (absPrem > 0.002) {
                weaknesses.push('Premium: wide (arb distortions)');
            }
        }
    }
    // 13b. Spot-Futures divergence coherence (0-5)
    if (futures?.premiumIndex && typeof futures.premiumIndex.divergence === 'number') {
        indicatorsCount++;
        const div = Math.abs(futures.premiumIndex.divergence);
        if (div < 0.5) {
            score += 3;
            strengths.push('Spot-Futures divergence low');
        }
        else if (div > 1.5) {
            weaknesses.push('Spot-Futures divergence high');
        }
    }
    // 13c. Liquidation proximity reinforcement
    if (futures?.liquidation && typeof futures.liquidation.liquidationDistance === 'number') {
        const d = futures.liquidation.liquidationDistance;
        if (d >= 5)
            score += 2;
        else if (d < 2)
            weaknesses.push('Near liquidation cluster (<2%)');
    }
    // 13d. Delta/CVD confirmation (0-5)
    if (cva?.volumeConfirmation) {
        indicatorsCount++;
        const vc = cva.volumeConfirmation;
        if (vc.isValid) {
            score += vc.strength === 'strong' ? 5 : 3;
            strengths.push(`CVD confirms move (${vc.strength})`);
        }
        else {
            weaknesses.push('CVD does not confirm move');
        }
    }
    // 15. Influence Graph Adjustments (bonuses/penalties and mismatch tiers)
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { analyzeInfluence } = require('./influence-graph');
        const outcome = analyzeInfluence(marketData);
        if (outcome) {
            indicatorsCount++;
            score += Math.max(0, outcome.bonus);
            score -= Math.max(0, outcome.penalty);
            if (outcome.majorMismatches > 0) {
                const penaltyRatio = parseFloat(process.env.INFLUENCE_MAJOR_MISMATCH_PENALTY || '0.5');
                const ratio = isFinite(penaltyRatio) ? Math.min(Math.max(penaltyRatio, 0), 1) : 0.5;
                score = score * (1 - ratio);
                weaknesses.push(`Influence: ${outcome.majorMismatches} major mismatch(es) (score cut ${(ratio * 100).toFixed(0)}%)`);
            }
            if (Array.isArray(outcome.notes) && outcome.notes.length > 0) {
                strengths.push(...outcome.notes.slice(0, 2));
            }
        }
    }
    catch (_) {
        // no-op
    }
    // 16. Reward Bonuses (coherence and safety)
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { computeRewardBonuses } = require('./reward-bonuses');
        const rb = computeRewardBonuses(asset, marketData);
        if (rb && rb.reward > 0) {
            indicatorsCount++;
            score += rb.reward;
            if (Array.isArray(rb.reasons) && rb.reasons.length > 0)
                strengths.push(...rb.reasons.slice(0, 2));
        }
    }
    catch (_) {
        // no-op
    }
    // Composite Quality mapping based on Score, Issues, and Coverage%
    // Composite Quality mapping by Coverage% (from indicatorsCount/total) and Score
    const INDICATORS_TOTAL = parseInt(process.env.INDICATORS_TOTAL || '20');
    const coveragePct = INDICATORS_TOTAL > 0 ? (indicatorsCount / INDICATORS_TOTAL) * 100 : 0;
    function qualityFromCoverageAndScore(coverage, scoreValue) {
        // <50% → Very Poor
        if (coverage < 50)
            return 'very poor';
        // 50-59% → Poor (any score)
        if (coverage < 60)
            return 'poor';
        // 60-69% → 120+ Fair else Poor
        if (coverage < 70)
            return scoreValue >= 120 ? 'fair' : 'poor';
        // 70-79% → 130+ Good, 110-129 Fair, else Poor
        if (coverage < 80) {
            if (scoreValue >= 130)
                return 'good';
            if (scoreValue >= 110)
                return 'fair';
            return 'poor';
        }
        // 80-89% → 140+ Very Good, 120-139 Good, else Fair
        if (coverage < 90) {
            if (scoreValue >= 140)
                return 'very good';
            if (scoreValue >= 120)
                return 'good';
            return 'fair';
        }
        // 90-100% → 150+ Excellent, 140-149 Very Good, 130-139 Good, 120-129 Fair, <120 Poor
        if (scoreValue >= 150)
            return 'excellent';
        if (scoreValue >= 140)
            return 'very good';
        if (scoreValue >= 130)
            return 'good';
        if (scoreValue >= 120)
            return 'fair';
        return 'poor';
    }
    // const quality = qualityFromCoverageAndScore(coveragePct, score)
    // Deduplicate strengths/weaknesses to keep counts consistent across modules
    const unique = (arr) => Array.from(new Set(arr.filter(Boolean)));
    const strengthsUnique = unique(strengths);
    const weaknessesUnique = unique(weaknesses);
    const qualityFinal = qualityFromCoverageAndScore(coveragePct, score);
    return {
        asset,
        score,
        indicatorsCount,
        strengths: strengthsUnique,
        weaknesses: weaknessesUnique,
        quality: qualityFinal
    };
}
/**
 * Rank assets by indicator quality
 * Returns sorted array of assets (best first)
 */
export function rankAssetsByIndicatorQuality(marketData, allowedAssets // OPTIMIZATION: Only rank specific assets if provided
) {
    const scores = [];
    const TOTAL = parseInt(process.env.INDICATORS_TOTAL || '20');
    const BTC_ABS_MAX = parseFloat(process.env.AGGRV2_BTC_ABS_MAX || '0.8'); // %; skip if |BTC60%| > 0.8
    const QUALITY_MIN_COVERAGE = parseFloat(process.env.AGGRV2_QUALITY_MIN_COVERAGE || '70'); // %
    let skippedNoIndicators = 0;
    let skippedQuality = 0;
    let skippedBTC = 0;
    // Convert Map to array if needed
    const dataArray = marketData instanceof Map
        ? Array.from(marketData.entries())
        : Object.entries(marketData);
    // OPTIMIZATION: Filter to only process allowedAssets if provided
    // This prevents ranking all assets when only a few are needed
    const filteredArray = allowedAssets && allowedAssets.length > 0
        ? dataArray.filter(([asset]) => allowedAssets.includes(asset))
        : dataArray;
    // Score each asset (synchronous, fast enough for our needs)
    for (const [asset, data] of filteredArray) {
        const base = scoreIndicatorQuality(asset, data);
        if ((base.indicatorsCount || 0) === 0) {
            skippedNoIndicators++;
            // Debug: Log first 5 skipped assets to understand why
            if (skippedNoIndicators <= 5) {
                const hasHist = !!data?.historicalData && Array.isArray(data.historicalData) && data.historicalData.length > 0;
                const hasInd = !!data?.indicators && typeof data.indicators === 'object';
                const hasPrice = !!data?.price || !!data?.markPx;
                console.log(`\x1b[90m   ⚠️  ${asset}: No indicators (hasHist: ${hasHist}, hasInd: ${hasInd}, hasPrice: ${hasPrice})\x1b[0m`);
            }
            continue;
        }
        // Composite ranking
        const INDICATORS_TOTAL = parseInt(process.env.INDICATORS_TOTAL || '20');
        // Reweighted defaults emphasizing momentum/alignment per plan
        const wQuality = parseFloat(process.env.RANK_W_QUALITY || '0.35');
        const wCoverage = parseFloat(process.env.RANK_W_COVERAGE || '0.15');
        const wMomo = parseFloat(process.env.RANK_W_MOMO || '0.25');
        const wAlign = parseFloat(process.env.RANK_W_ALIGN || '0.20');
        const wExt = parseFloat(process.env.RANK_W_EXT || '0.05');
        // Coverage %
        const coveragePct = INDICATORS_TOTAL > 0 ? (base.indicatorsCount / INDICATORS_TOTAL) * 100 : 0;
        const coverageNorm = Math.max(0, Math.min(1, coveragePct / 100));
        // Momentum composite: weighted 5m,15m,60m (clip to [-5%,+5%] then map to [0,1])
        const historical = data?.historicalData || [];
        const hl = data?.externalData?.hyperliquid || {};
        const m5 = typeof hl?.momentum5m === 'number' ? hl.momentum5m : pctChangeOverMinutesFromHistorical(historical, 5);
        const m15 = typeof hl?.momentum15m === 'number' ? hl.momentum15m : pctChangeOverMinutesFromHistorical(historical, 15);
        const m60 = typeof hl?.momentum60m === 'number' ? hl.momentum60m : pctChangeOverMinutesFromHistorical(historical, 60);
        const clampPct = (v) => {
            if (typeof v !== 'number' || !isFinite(v))
                return 0;
            return Math.max(-5, Math.min(5, v));
        };
        const m5c = clampPct(m5);
        const m15c = clampPct(m15);
        const m60c = clampPct(m60);
        const momoPct = (0.5 * m5c) + (0.3 * m15c) + (0.2 * m60c); // in percent
        const momoNorm = (momoPct + 5) / 10; // map [-5,5] → [0,1]
        // Alignment score: prefer aligned daily + intraday; fallback to strength if present
        const ta = data?.trendAlignment || {};
        const aligned = !!ta.aligned;
        const strength = typeof ta.strength === 'number' && isFinite(ta.strength) ? Math.max(0, Math.min(1, ta.strength)) : 0;
        const alignScore = aligned ? (0.7 * strength + 0.3) : (0.3 * strength); // [0,1]
        // External data completeness: simple presence-based score in [0,1]
        const ext = data?.externalData || {};
        const extKeys = ext ? Object.keys(ext) : [];
        const extScore = Math.max(0, Math.min(1, extKeys.length > 0 ? Math.min(1, extKeys.length / 5) : 0));
        // Normalize base score to [0,1] (assume 0-200 typical range)
        const baseNorm = Math.max(0, Math.min(1, base.score / 200));
        let composite = wQuality * baseNorm +
            wCoverage * coverageNorm +
            wMomo * momoNorm +
            wAlign * alignScore +
            wExt * extScore;
        // Penalties and caps per plan
        const penaltiesApplied = [];
        // Lighter default nudges (can override via env)
        const penTrendMismatch = Math.max(0, Math.min(1, parseFloat(process.env.RANK_PEN_TREND_MISMATCH || '0.03')));
        const notAlignedCap = Math.max(0, Math.min(1, parseFloat(process.env.RANK_PEN_NOT_ALIGNED_CAP || '0.85')));
        const penIntradayPerTf = Math.max(0, Math.min(1, parseFloat(process.env.RANK_PEN_INTRADAY_PER_TF || '0.02')));
        const penChoppy = Math.max(0, Math.min(1, parseFloat(process.env.RANK_PEN_CHOPPY || '0.03')));
        const penVolMomo = Math.max(0, Math.min(1, parseFloat(process.env.RANK_PEN_VOL_MOMO_DISAGREE || '0.02')));
        // Daily vs momentum mismatch
        const dailyTrend = data?.trendAlignment?.dailyTrend;
        if (dailyTrend === 'uptrend' && momoPct < 0) {
            composite = Math.max(0, composite - penTrendMismatch);
            penaltiesApplied.push(`trend_mismatch_up_momo_neg_${penTrendMismatch}`);
        }
        else if (dailyTrend === 'downtrend' && momoPct > 0) {
            composite = Math.max(0, composite - penTrendMismatch);
            penaltiesApplied.push(`trend_mismatch_down_momo_pos_${penTrendMismatch}`);
        }
        // Overall not aligned cap + intraday per-TF penalties (if available)
        const h4Aligned = data?.trendAlignment?.h4Aligned;
        const h1Aligned = data?.trendAlignment?.h1Aligned;
        if (data?.trendAlignment && data.trendAlignment.aligned === false) {
            composite = Math.min(composite, notAlignedCap);
            penaltiesApplied.push(`not_aligned_cap_${notAlignedCap}`);
        }
        if (h4Aligned === false) {
            composite = Math.max(0, composite - penIntradayPerTf);
            penaltiesApplied.push(`h4_misaligned_${penIntradayPerTf}`);
        }
        if (h1Aligned === false) {
            composite = Math.max(0, composite - penIntradayPerTf);
            penaltiesApplied.push(`h1_misaligned_${penIntradayPerTf}`);
        }
        // Choppy regime penalty (atrPercent < 1.0 AND adx < 20)
        const indicatorsAny = data?.indicators || {};
        const adxValue = typeof indicatorsAny?.adx === 'object' && indicatorsAny?.adx?.adx != null
            ? indicatorsAny.adx.adx
            : indicatorsAny?.adx;
        const atr = indicatorsAny?.atr;
        const priceForAtr = indicatorsAny?.price;
        const atrPercentExplicit = indicatorsAny?.atrPercent;
        let atrPercent = typeof atrPercentExplicit === 'number' ? atrPercentExplicit
            : (typeof atr === 'number' && typeof priceForAtr === 'number' && priceForAtr > 0 ? (atr / priceForAtr) * 100 : 0);
        if (atrPercent > 0 && atrPercent < 1.0 && typeof adxValue === 'number' && adxValue > 0 && adxValue < 20) {
            composite = Math.max(0, composite - penChoppy);
            penaltiesApplied.push(`choppy_atr${atrPercent.toFixed(2)}_adx${adxValue.toFixed(1)}_${penChoppy}`);
        }
        // Volume vs momentum disagreement (if comprehensiveVolumeAnalysis available)
        const cva = ext?.comprehensiveVolumeAnalysis;
        const buyPressure = cva?.footprint?.buyPressure;
        const sellPressure = cva?.footprint?.sellPressure;
        if (typeof buyPressure === 'number' && typeof sellPressure === 'number') {
            if (buyPressure > sellPressure && momoPct < 0) {
                composite = Math.max(0, composite - penVolMomo);
                penaltiesApplied.push(`vol_momo_disagree_buy>sell_momo<0_${penVolMomo}`);
            }
            else if (sellPressure > buyPressure && momoPct > 0) {
                composite = Math.max(0, composite - penVolMomo);
                penaltiesApplied.push(`vol_momo_disagree_sell>buy_momo>0_${penVolMomo}`);
            }
        }
        // Clamp [0,1]
        composite = Math.max(0, Math.min(1, composite));
        // Rewards (small boosts)
        const rewardAlign = Math.max(0, Math.min(1, parseFloat(process.env.AGGR_REWARD_ALIGN || '0.03')));
        const rewardMomoTrend = Math.max(0, Math.min(1, parseFloat(process.env.AGGR_REWARD_MOMO_TREND || '0.03')));
        const rewardVolConfirm = Math.max(0, Math.min(1, parseFloat(process.env.AGGR_REWARD_VOL_CONFIRM || '0.02')));
        if (dailyTrend === 'uptrend' && m60c > 0)
            composite = Math.min(1, composite + rewardMomoTrend);
        if (dailyTrend === 'downtrend' && m60c < 0)
            composite = Math.min(1, composite + rewardMomoTrend);
        if (aligned)
            composite = Math.min(1, composite + rewardAlign);
        if (typeof buyPressure === 'number' && typeof sellPressure === 'number') {
            if (buyPressure > sellPressure && momoPct > 0)
                composite = Math.min(1, composite + rewardVolConfirm);
            if (sellPressure > buyPressure && momoPct < 0)
                composite = Math.min(1, composite + rewardVolConfirm);
        }
        // Aggressive Score calculation
        const wScore = parseFloat(process.env.AGGR_W_SCORE || '0.25');
        const wComp = parseFloat(process.env.AGGR_W_COMP || '0.25');
        const wConf = parseFloat(process.env.AGGR_W_CONF || '0.20');
        const wMomo60 = parseFloat(process.env.AGGR_W_MOMO60 || '0.30');
        const momo60Mult = parseFloat(process.env.AGGR_MOMO60_MULT || '15');
        const aggrMax = parseFloat(process.env.AGGR_MAX || '120');
        const compPercent = Math.max(0, Math.min(100, composite * 100));
        // Confidence percent via expected-confidence if available
        let confidencePercent = 0;
        try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const mod = require('./expected-confidence');
            if (mod && typeof mod.computeExpectedConfidence === 'function') {
                const res = mod.computeExpectedConfidence(asset, data);
                const val = typeof res?.expected === 'number' ? res.expected : 0;
                confidencePercent = Math.max(0, Math.min(100, val));
            }
        }
        catch (_) { /* no-op */ }
        const momo60Scaled = (isFinite(m60c) ? m60c : 0) * momo60Mult; // m60c in [-5..5], scaled
        const aggressiveRaw = (base.score * wScore) +
            (compPercent * wComp) +
            (confidencePercent * wConf) +
            (momo60Scaled * wMomo60);
        const aggressivePercent = Math.max(0, Math.min(100, (aggressiveRaw / (aggrMax || 120)) * 100));
        // AggressiveV2 additional fields
        // M60 raw pct
        const m60Pct = (typeof m60 === 'number' && isFinite(m60)) ? m60 : (typeof m60c === 'number' ? m60c : 0);
        const absM60Pct = Math.abs(m60Pct);
        // Volume ratio fallback (reuse volume calc if available from indicators + historical)
        let volumeRatio;
        const ind = data?.indicators || {};
        const hist = data?.historicalData || [];
        if (typeof ind?.volume === 'number' && Array.isArray(hist) && hist.length > 1) {
            const useN = Math.min(20, hist.length - 1);
            let sum = 0, cnt = 0;
            for (let i = hist.length - 1 - useN; i < hist.length - 1; i++) {
                const v = hist[i]?.volume;
                if (typeof v === 'number' && isFinite(v) && v > 0) {
                    sum += v;
                    cnt++;
                }
            }
            const avg = cnt > 0 ? sum / cnt : 0;
            if (avg > 0)
                volumeRatio = ind.volume / avg;
        }
        // S/R distance using supportLevels/resistanceLevels if present
        let srDistPct;
        const priceNow = typeof ind?.price === 'number' ? ind.price : undefined;
        if (typeof priceNow === 'number' && isFinite(priceNow) && priceNow > 0) {
            const supLevels = Array.isArray(ind?.supportLevels) ? ind.supportLevels : [];
            const resLevels = Array.isArray(ind?.resistanceLevels) ? ind.resistanceLevels : [];
            const dists = [];
            for (const s of supLevels)
                if (typeof s === 'number' && isFinite(s) && s > 0)
                    dists.push(Math.abs((priceNow - s) / priceNow) * 100);
            for (const r of resLevels)
                if (typeof r === 'number' && isFinite(r) && r > 0)
                    dists.push(Math.abs((r - priceNow) / priceNow) * 100);
            if (dists.length > 0)
                srDistPct = Math.min(...dists);
        }
        // Funding abs (%)
        let fundingAbsPct = 0;
        const fr = data?.externalData?.futures?.fundingRate;
        if (fr && typeof fr.current === 'number')
            fundingAbsPct = Math.abs(fr.current) * 100;
        // Confidence already computed above as confidencePercent
        // BTC 60m abs pct computed from BTC marketData if available
        let btc60mAbsPct = 0;
        try {
            const btcData = marketData instanceof Map ? marketData.get('BTC') : marketData['BTC'];
            const btcHist = btcData?.historicalData || [];
            const btcHL = btcData?.externalData?.hyperliquid || {};
            const btc60 = typeof btcHL?.momentum60m === 'number' ? btcHL.momentum60m : pctChangeOverMinutesFromHistorical(btcHist, 60);
            if (typeof btc60 === 'number' && isFinite(btc60))
                btc60mAbsPct = Math.abs(btc60);
        }
        catch (_) {
            // leave 0
        }
        // Quality filter (Aggressive mode):
        // - Hard reject: "very poor" (selalu di-skip dari ranking)
        // - "poor": boleh masuk hanya jika coverage >= QUALITY_MIN_COVERAGE
        // - excellent / very good / good / fair: selalu lolos
        const qualityOk = base.quality !== 'very poor' &&
            (base.quality !== 'poor' || (typeof coveragePct === 'number' && coveragePct >= QUALITY_MIN_COVERAGE));
        if (!qualityOk) {
            skippedQuality++;
            continue;
        }
        // BTC% filter: skip too-high BTC move magnitude (seek independence)
        if (btc60mAbsPct > BTC_ABS_MAX) {
            skippedBTC++;
            continue;
        }
        scores.push({
            ...base,
            coveragePct,
            momentumComposite: momoPct,
            trendAlignmentScore: alignScore * 100,
            externalDataScore: extScore * 100,
            compositeScore: composite,
            aggressiveScoreRaw: aggressiveRaw,
            aggressivePercent,
            m60Pct,
            absM60Pct,
            volumeRatio,
            srDistPct,
            btc60mAbsPct,
            fundingAbsPct,
            confidencePercent,
            // diagnostics
            ...(typeof atrPercent === 'number' ? { atrPercent } : {}),
            ...(typeof adxValue === 'number' ? { adxValue } : {}),
            ...(typeof buyPressure === 'number' ? { buyPressure } : {}),
            ...(typeof sellPressure === 'number' ? { sellPressure } : {}),
            ...(penaltiesApplied.length > 0 ? { penaltiesApplied } : {})
        });
    }
    // Aggressive sort (moderate, lebih stabil untuk execution dengan delay)
    // Primary order:
    //  1) Aggressive% desc      → prioritas utama (kombinasi score+composite+conf+m60)
    //  2) Composite desc        → kekuatan keseluruhan indikator
    //  3) Base Score desc       → score indikator dasar
    //  4) Coverage desc         → makin banyak indikator makin bagus
    //  5) Fewer weaknesses      → lebih sedikit weaknesses di atas
    //  Tie-breakers (lebih halus, tidak terlalu menggeser ranking utama):
    //  6) VolRatio desc         → volume konfirmasi
    //  7) |S/R Dist| desc       → lebih jauh dari level = lebih banyak ruang gerak
    //  8) |M60| desc            → momentum 60m
    //  9) |BTC60m| asc          → lebih independen dari BTC sedikit diutamakan
    // 10) FundingAbs asc        → hindari funding ekstrem sedikit
    scores.sort((a, b) => {
        // 1) Aggressive% DESC
        const aa = (a.aggressivePercent ?? 0);
        const ab = (b.aggressivePercent ?? 0);
        if (aa !== ab)
            return ab - aa;
        // 2) Composite DESC
        const ca = (a.compositeScore ?? 0);
        const cb = (b.compositeScore ?? 0);
        if (ca !== cb)
            return cb - ca;
        // 3) Base Score DESC
        const sa = a.score || 0;
        const sb = b.score || 0;
        if (sa !== sb)
            return sb - sa;
        // 4) Coverage DESC
        const ica = a.indicatorsCount || 0;
        const icb = b.indicatorsCount || 0;
        const covA = TOTAL > 0 ? ica / TOTAL : 0;
        const covB = TOTAL > 0 ? icb / TOTAL : 0;
        if (covA !== covB)
            return covB - covA;
        // 5) Fewer weaknesses
        const wa = (a.weaknesses?.length ?? 0);
        const wb = (b.weaknesses?.length ?? 0);
        if (wa !== wb)
            return wa - wb;
        // 6) VolRatio DESC (tie-breaker)
        const vra = typeof a.volumeRatio === 'number' && isFinite(a.volumeRatio) ? a.volumeRatio : -Infinity;
        const vrb = typeof b.volumeRatio === 'number' && isFinite(b.volumeRatio) ? b.volumeRatio : -Infinity;
        if (vra !== vrb)
            return vrb - vra;
        // 7) |S/R Dist| DESC
        const sra = typeof a.srDistPct === 'number' && isFinite(a.srDistPct) ? Math.abs(a.srDistPct) : -Infinity;
        const srb = typeof b.srDistPct === 'number' && isFinite(b.srDistPct) ? Math.abs(b.srDistPct) : -Infinity;
        if (sra !== srb)
            return srb - sra;
        // 8) |M60| DESC
        const m60a = typeof a.m60Pct === 'number' && isFinite(a.m60Pct) ? Math.abs(a.m60Pct) : 0;
        const m60b = typeof b.m60Pct === 'number' && isFinite(b.m60Pct) ? Math.abs(b.m60Pct) : 0;
        if (m60a !== m60b)
            return m60b - m60a;
        // 9) |BTC60m| ASC
        const btca = typeof a.btc60mAbsPct === 'number' && isFinite(a.btc60mAbsPct) ? a.btc60mAbsPct : Infinity;
        const btcb = typeof b.btc60mAbsPct === 'number' && isFinite(b.btc60mAbsPct) ? b.btc60mAbsPct : Infinity;
        if (btca !== btcb)
            return btca - btcb;
        // 10) FundingAbs ASC
        const fa = typeof a.fundingAbsPct === 'number' && isFinite(a.fundingAbsPct) ? a.fundingAbsPct : Infinity;
        const fb = typeof b.fundingAbsPct === 'number' && isFinite(b.fundingAbsPct) ? b.fundingAbsPct : Infinity;
        if (fa !== fb)
            return fa - fb;
        return 0;
    });
    // Debug: Log filter stats
    const totalProcessed = filteredArray.length;
    const totalRanked = scores.length;
    if (skippedNoIndicators > 0 || skippedQuality > 0 || skippedBTC > 0) {
        console.log(`\x1b[33m📊 Ranking filter stats: ${totalProcessed} processed → ${totalRanked} ranked (skipped: ${skippedNoIndicators} no indicators, ${skippedQuality} quality filter, ${skippedBTC} BTC correlation)\x1b[0m`);
    }
    return scores;
}
/**
 * Select top N assets based on indicator quality
 */
export function selectTopAssetsByIndicatorQuality(marketData, topN = 15, allowedAssets // OPTIMIZATION: Only rank specific assets if provided
) {
    const ranked = rankAssetsByIndicatorQuality(marketData, allowedAssets);
    return ranked
        .slice(0, topN)
        .map(score => score.asset)
        .filter(asset => asset && asset.length > 0);
}
// Helper: compute percent change over minutes from historical data array
function pctChangeOverMinutesFromHistorical(historical, minutes) {
    try {
        const candles = Array.isArray(historical) ? historical : [];
        if (candles.length < 2)
            return null;
        const last = candles[candles.length - 1];
        const lastTs = last?.timestamp || last?.time || last?.t;
        const lastClose = last?.close ?? last?.c ?? last?.price;
        if (!lastTs || typeof lastClose !== 'number')
            return null;
        const targetTs = lastTs - minutes * 60_000;
        let base = null;
        for (let j = candles.length - 2; j >= 0; j--) {
            const ts = candles[j]?.timestamp || candles[j]?.time || candles[j]?.t;
            if (!ts)
                continue;
            if (ts <= targetTs) {
                base = candles[j];
                break;
            }
        }
        if (!base)
            base = candles[0];
        const baseClose = base?.close ?? base?.c ?? base?.price;
        if (typeof baseClose !== 'number' || baseClose <= 0)
            return null;
        return ((lastClose - baseClose) / baseClose) * 100;
    }
    catch {
        return null;
    }
}
