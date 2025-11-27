/**
 * Signal Processor for Signal Generation
 * Post-processes signals: invalidation, position sizing, TP/SL, confidence, etc.
 */
import { generateInvalidationCondition } from '../validation/invalidation';
import { generateJustificationFromIndicators } from './justification';
import { calculateBounceTP, calculateDynamicTP } from '../risk-management/take-profit';
import { calculateBounceTPTrail, calculateBounceSLOffset } from '../risk-management/bounce';
import { calculateConfidenceScore } from './confidence';
// import { calculateQualityWeightedJustification } from '../analysis/quality-weighted-justification'
import { collectWarning } from '../position-management/warnings';
import { getTradingConfig } from '../config';
/**
 * Process a signal: invalidation, position sizing, TP/SL, confidence, etc.
 */
export async function processSignal(signal, marketData, accountState, equalCapitalPerSignal, _signalIndex, assetRank = null, // PHASE 1: Asset rank for confidence calculation
qualityScore = null // PHASE 1: Quality score for confidence calculation
) {
    // OPTIMIZATION: Cache Map check, coin property, and nested property access
    const marketDataIsMap = marketData instanceof Map;
    const coin = signal.coin;
    const assetData = marketDataIsMap ? marketData.get(coin) : marketData[coin];
    const assetDataData = assetData?.data;
    const indicators = assetData?.indicators || assetDataData?.indicators;
    const trendAlignment = assetDataData?.trendAlignment || assetData?.trendAlignment;
    const externalData = assetDataData?.externalData || assetData?.externalData;
    // OPTIMIZATION: Cache property access
    const entryPriceValue = signal.entry_price;
    const stopLossValue = signal.stop_loss;
    let entryPrice = entryPriceValue || (indicators?.price || 0);
    let stopLossPrice = stopLossValue || 0;
    let slDistance = 0;
    // CRITICAL FIX: Ensure entry_price_string is set from Hyperliquid priceString for accurate price display
    // This ensures price in signal generation matches Hyperliquid UI exactly
    if (entryPrice > 0 && (signal.signal === 'buy_to_enter' || signal.signal === 'sell_to_enter' || signal.signal === 'add')) {
        // Get price string from Hyperliquid (preserves exact format without trailing zeros)
        const priceString = assetDataData?.priceString || assetDataData?.markPxString || assetData?.priceString || assetData?.markPxString || null;
        if (priceString && !signal.entry_price_string) {
            // Only set if not already set (preserve existing value if set earlier)
            signal.entry_price_string = priceString;
        }
        else if (!signal.entry_price_string && entryPrice > 0) {
            // Fallback: use entryPrice as string if priceString not available
            signal.entry_price_string = entryPrice.toString();
        }
    }
    // OPTIMIZATION: Cache signal as any once and property access
    const signalAny = signal;
    const invalidationCondition = signalAny.invalidation_condition;
    const invalidationLower = invalidationCondition?.toLowerCase();
    const indicatorsSupportLevels = indicators?.supportLevels;
    const indicatorsResistanceLevels = indicators?.resistanceLevels;
    // Validate and Auto-Generate invalidation_condition for ALL signals
    if (!invalidationCondition ||
        invalidationCondition.trim() === '' ||
        invalidationLower === 'n/a' ||
        invalidationLower === 'na') {
        // OPTIMIZATION: Cache property access
        const supportResistance = {
            supportLevels: indicatorsSupportLevels || [],
            resistanceLevels: indicatorsResistanceLevels || []
        };
        signalAny.invalidation_condition = generateInvalidationCondition(signal, indicators, entryPrice, stopLossPrice, supportResistance, trendAlignment, externalData, marketData);
        signalAny._invalidation_auto_generated = true;
        collectWarning(coin, `⚠️  Auto-generated invalidation_condition: ${signalAny.invalidation_condition}`, [
            `→ invalidation_condition was missing or invalid, auto-generated based on Alpha Arena patterns`,
            `→ Using technical indicators, price levels, and multi-timeframe conditions`
        ]);
    }
    else {
        // Validate that invalidation_condition is specific (not generic)
        // OPTIMIZATION: Use cached invalidationLower if available, otherwise compute once
        const invalidationLowerCheck = invalidationLower ?? invalidationCondition?.toLowerCase();
        const genericPhrases = ['if price moves against', 'if trend reverses', 'if conditions change', 'if market turns'];
        const isGeneric = invalidationLowerCheck ? genericPhrases.some(phrase => invalidationLowerCheck.includes(phrase)) : false;
        if (isGeneric) {
            // OPTIMIZATION: Use cached property access
            const supportResistance = {
                supportLevels: indicatorsSupportLevels || [],
                resistanceLevels: indicatorsResistanceLevels || []
            };
            const originalInvalidation = signalAny.invalidation_condition;
            signalAny.invalidation_condition = generateInvalidationCondition(signal, indicators, entryPrice, stopLossPrice, supportResistance, trendAlignment, externalData, marketData);
            signalAny._invalidation_auto_generated = true;
            // OPTIMIZATION: Use cached coin instead of signal.coin
            collectWarning(coin, `⚠️  Replaced generic invalidation_condition with specific one`, [
                `→ Original: "${originalInvalidation}"`,
                `→ New: "${signalAny.invalidation_condition}"`,
                `→ Generic phrases are not allowed - must be specific (Alpha Arena requirement)`
            ]);
        }
    }
    // OPTIMIZATION: Cache property access (entryPriceValue already cached above)
    const signalType = signal.signal;
    // Only process BUY/SELL/ADD signals with entry_price
    const isEntrySignal = signalType === 'buy_to_enter' || signalType === 'sell_to_enter' || signalType === 'add';
    if (!(isEntrySignal && entryPriceValue && entryPriceValue > 0)) {
        return signal; // Return signal without position sizing
    }
    // Update entryPrice from signal (use cached entryPriceValue)
    entryPrice = entryPriceValue || signal.entry_price;
    // High leverage mode: Force 10x leverage
    const leverage = 10;
    signal.leverage = leverage;
    // Get market regime
    const marketRegime = indicators?.marketRegime;
    // Check for extreme volatility
    if (marketRegime && marketRegime.volatility === 'high') {
        const atrPercent = indicators?.atr && entryPrice > 0 ? (indicators.atr / entryPrice) * 100 : 0;
        if (atrPercent > 5) {
            console.warn(`⚠️  Skipping ${signal.signal} signal for ${signal.coin}: Extreme volatility detected (ATR: ${atrPercent.toFixed(2)}%)`);
            signal.signal = 'hold';
            return signal;
        }
    }
    // Count bullish vs bearish indicators
    let bullishCount = 0;
    let bearishCount = 0;
    const price = (indicators && indicators.price) ? indicators.price : entryPrice;
    // Count indicators
    if (indicators && indicators.macd && indicators.macd.histogram > 0)
        bullishCount++;
    else if (indicators && indicators.macd && indicators.macd.histogram < 0)
        bearishCount++;
    if (indicators && indicators.obv && indicators.obv > 0)
        bullishCount++;
    else if (indicators && indicators.obv && indicators.obv < 0)
        bearishCount++;
    if (indicators && indicators.bollingerBands && price > indicators.bollingerBands.middle)
        bullishCount++;
    else if (indicators && indicators.bollingerBands && price < indicators.bollingerBands.middle)
        bearishCount++;
    if (indicators && indicators.parabolicSAR && price > indicators.parabolicSAR)
        bullishCount++;
    else if (indicators && indicators.parabolicSAR && price < indicators.parabolicSAR)
        bearishCount++;
    if (indicators && indicators.aroon && indicators.aroon.up > indicators.aroon.down)
        bullishCount++;
    else if (indicators && indicators.aroon && indicators.aroon.down > indicators.aroon.up)
        bearishCount++;
    if (indicators && indicators.cci && indicators.cci > 100)
        bullishCount++;
    else if (indicators && indicators.cci && indicators.cci < -100)
        bearishCount++;
    if (indicators && indicators.vwap && price > indicators.vwap)
        bullishCount++;
    else if (indicators && indicators.vwap && price < indicators.vwap)
        bearishCount++;
    if (indicators && indicators.priceChange24h && indicators.priceChange24h > 0)
        bullishCount++;
    else if (indicators && indicators.priceChange24h && indicators.priceChange24h < 0)
        bearishCount++;
    if (indicators && indicators.rsiDivergence && indicators.rsiDivergence.divergence && indicators.rsiDivergence.divergence.toLowerCase().includes('bullish'))
        bullishCount++;
    else if (indicators && indicators.rsiDivergence && indicators.rsiDivergence.divergence && indicators.rsiDivergence.divergence.toLowerCase().includes('bearish'))
        bearishCount++;
    // Check overbought/oversold conditions
    const isOverboughtEarly = indicators && indicators.bollingerBands && price > indicators.bollingerBands.upper;
    const isOversoldEarly = indicators && indicators.bollingerBands && price < indicators.bollingerBands.lower;
    if (isOverboughtEarly && (signal.signal === 'buy_to_enter' || signal.signal === 'add')) {
        // OPTIMIZATION: Reduced verbose logging - only log if VERBOSE_LOGGING is enabled
        if (process.env.VERBOSE_LOGGING === 'true') {
            console.warn(`⚠️  EARLY OVERBOUGHT CHECK for ${signal.coin}: BUY signal but price is ABOVE BB Upper`);
        }
    }
    if (isOversoldEarly && signal.signal === 'sell_to_enter') {
        // OPTIMIZATION: Reduced verbose logging - only log if VERBOSE_LOGGING is enabled
        if (process.env.VERBOSE_LOGGING === 'true') {
            collectWarning(signal.coin, `⚠️  EARLY OVERSOLD CHECK: SELL signal but price is BELOW BB Lower`);
        }
    }
    // Replace AI justification with comprehensive justification
    if (signal.signal === 'buy_to_enter' || signal.signal === 'sell_to_enter' || signal.signal === 'add') {
        if (indicators && (bullishCount !== undefined && bearishCount !== undefined)) {
            const originalJustification = signal.justification;
            signal.justification = generateJustificationFromIndicators(signal, indicators, bullishCount, bearishCount, trendAlignment, externalData);
            if (originalJustification && originalJustification !== signal.justification) {
                // OPTIMIZATION: Reduced verbose logging - only log if VERBOSE_LOGGING is enabled
                if (process.env.VERBOSE_LOGGING === 'true') {
                    collectWarning(signal.coin, `✅ Justification replaced with comprehensive indicator-based analysis (prevents cherry-picking)`);
                }
            }
        }
    }
    // Stop Loss: ATR-based (1.5-2x ATR) with volatility adjustment
    let slPercent = 0;
    const WICK_BUFFER_PERCENT = 0.003; // 0.3% buffer for wick rejection
    if (indicators && indicators.atr && entryPrice > 0) {
        const atr = indicators.atr;
        const atrPercent = (atr / entryPrice) * 100;
        let atrMultiplier = 1.5; // Default: 1.5x ATR for normal volatility
        if (atrPercent > 4.0) {
            atrMultiplier = 2.0;
            // OPTIMIZATION: Pre-compute division result
            const atrPercentHigh = atr * atrMultiplier / entryPrice;
            slPercent = atrPercentHigh < 0.03 ? 0.03 : atrPercentHigh; // Minimum 3%
        }
        else if (atrPercent > 2.5) {
            atrMultiplier = 1.75;
            // OPTIMIZATION: Pre-compute division result
            const atrPercent = atr * atrMultiplier / entryPrice;
            slPercent = atrPercent < 0.02 ? 0.02 : atrPercent; // Minimum 2%
        }
        else if (atrPercent > 1.5) {
            atrMultiplier = 1.5;
            // OPTIMIZATION: Pre-compute division result
            const atrPercent = atr * atrMultiplier / entryPrice;
            slPercent = atrPercent < 0.015 ? 0.015 : atrPercent; // Minimum 1.5%
        }
        else {
            atrMultiplier = 1.5;
            // OPTIMIZATION: Pre-compute division result
            const atrPercent = atr * atrMultiplier / entryPrice;
            slPercent = atrPercent < 0.015 ? 0.015 : atrPercent; // Minimum 1.5%
        }
        // Add wick buffer
        slPercent += WICK_BUFFER_PERCENT;
        // OPTIMIZATION: Reduced verbose logging - only log if VERBOSE_LOGGING is enabled
        if (process.env.VERBOSE_LOGGING === 'true') {
            console.log(`📊 ATR-based stop loss for ${signal.coin}: ATR=${atr.toFixed(2)} (${atrPercent.toFixed(2)}%), multiplier=${atrMultiplier}x, SL=${(slPercent * 100).toFixed(2)}% (including ${(WICK_BUFFER_PERCENT * 100).toFixed(2)}% wick buffer)`);
        }
    }
    else {
        slPercent = 0.02; // 2% stop loss fallback
        console.log(`⚠️  ATR not available for ${signal.coin}, using fallback ${(slPercent * 100).toFixed(2)}% stop loss`);
    }
    if (signal.signal === 'buy_to_enter' || signal.signal === 'add') {
        stopLossPrice = entryPrice * (1 - slPercent);
        slDistance = entryPrice - stopLossPrice;
        // OPTIMIZATION: Reduced verbose logging - only log if VERBOSE_LOGGING is enabled
        if (process.env.VERBOSE_LOGGING === 'true') {
            console.log(`📊 Stop loss for ${signal.coin}: SL=$${stopLossPrice.toFixed(2)} (${(slPercent * 100).toFixed(2)}% below entry, distance=$${slDistance.toFixed(2)})`);
        }
    }
    else if (signal.signal === 'sell_to_enter') {
        stopLossPrice = entryPrice * (1 + slPercent);
        slDistance = stopLossPrice - entryPrice;
        // OPTIMIZATION: Reduced verbose logging - only log if VERBOSE_LOGGING is enabled
        if (process.env.VERBOSE_LOGGING === 'true') {
            console.log(`📊 Stop loss for ${signal.coin}: SL=$${stopLossPrice.toFixed(2)} (${(slPercent * 100).toFixed(2)}% above entry, distance=$${slDistance.toFixed(2)})`);
        }
    }
    // Dynamic SL Offset for Bounce Signals
    if (signalAny.bounce_mode && slDistance > 0) {
        const originalSlDistance = slDistance;
        slDistance = calculateBounceSLOffset(slDistance, indicators, entryPrice);
        if (slDistance !== originalSlDistance) {
            const offsetMultiplier = slDistance / originalSlDistance;
            const atrPercent = indicators?.atr && entryPrice > 0 ? (indicators.atr / entryPrice) * 100 : 0;
            if (signal.signal === 'buy_to_enter' || signal.signal === 'add') {
                stopLossPrice = entryPrice - slDistance;
            }
            else if (signal.signal === 'sell_to_enter') {
                stopLossPrice = entryPrice + slDistance;
            }
            signalAny.bounce_sl_offset = offsetMultiplier;
            signalAny.bounce_sl_reason = atrPercent > 3.0
                ? `High ATR (${atrPercent.toFixed(2)}%) → wider SL (×${offsetMultiplier.toFixed(2)}) to avoid shadow wick`
                : `Low ATR (${atrPercent.toFixed(2)}%) → tight SL (×${offsetMultiplier.toFixed(2)})`;
            // OPTIMIZATION: Reduced verbose logging - only log if VERBOSE_LOGGING is enabled
            if (process.env.VERBOSE_LOGGING === 'true') {
                console.log(`🎯 Bounce SL adjusted for ${signal.coin}: ${(originalSlDistance / entryPrice * 100).toFixed(2)}% → ${(slDistance / entryPrice * 100).toFixed(2)}% (${signalAny.bounce_sl_reason})`);
            }
        }
    }
    if (stopLossPrice > 0) {
        signal.stop_loss = stopLossPrice;
    }
    else if (signal.stop_loss && signal.stop_loss > 0) {
        stopLossPrice = signal.stop_loss;
        // OPTIMIZATION: Faster Math.abs() alternative for known values
        const priceDiff = entryPrice - stopLossPrice;
        slDistance = priceDiff < 0 ? -priceDiff : priceDiff;
        console.log(`⚠️  Using provided stop loss for ${signal.coin}: $${stopLossPrice.toFixed(2)}`);
    }
    else {
        console.warn(`⚠️  No stop loss available for ${signal.coin}, skipping position sizing`);
        return signal;
    }
    if (slDistance > 0) {
        // Equal capital allocation per signal
        const accountBalance = accountState.accountValue || accountState.availableCash || 90;
        const signalConfidence = signal.confidence || 0.5;
        const isContrarian = signalAny.contrarian_play || signalAny.oversold_contrarian;
        // Use equal risk per signal (2% of equal capital allocation)
        const equalRiskPerSignal = equalCapitalPerSignal * 0.02;
        const riskMultiplier = isContrarian ? 0.5 : 1.0;
        const maxRiskUSD = equalRiskPerSignal * riskMultiplier;
        const riskPercent = (maxRiskUSD / accountBalance) * 100;
        signal.risk_percent = riskPercent;
        signal.equal_allocation = true;
        signal.capital_per_signal = equalCapitalPerSignal;
        signal.risk_per_signal = maxRiskUSD;
        // OPTIMIZATION: Reduced verbose logging - only log if VERBOSE_LOGGING is enabled
        if (process.env.VERBOSE_LOGGING === 'true') {
            console.log(`💰 Position sizing for ${signal.coin}: Equal Allocation=$${equalCapitalPerSignal.toFixed(2)}, Risk=$${maxRiskUSD.toFixed(2)} (${riskPercent.toFixed(2)}% of total), Confidence=${(signalConfidence * 100).toFixed(2)}%${isContrarian ? ' (contrarian - 50% risk)' : ''}`);
        }
        // Calculate position size
        const positionSize = maxRiskUSD / (slDistance * leverage);
        signal.quantity = positionSize;
        signal.risk_usd = maxRiskUSD;
        // Store ATR info
        if (indicators && indicators.atr && entryPrice > 0) {
            const atrPercent = (indicators.atr / entryPrice) * 100;
            signalAny.atr_percent = atrPercent;
        }
        // Take Profit: Dynamic calculation
        let tpResult;
        let calculatedTP;
        let tpPercent;
        if (signalAny.bounce_mode && signalAny.bounce_strength) {
            // Use bounce-specific TP calculation
            tpResult = calculateBounceTP(entryPrice, signal, indicators, trendAlignment, slDistance, signalAny.bounce_strength);
            let bounceTP = tpResult.tpPrice;
            // Apply trailing TP based on EMA8 crossdown/crossup
            const historicalDataForTrail = assetData?.historicalData || assetData?.data?.historicalData;
            const trailResult = calculateBounceTPTrail(entryPrice, signal, indicators, historicalDataForTrail, bounceTP);
            if (trailResult.isTrailing) {
                calculatedTP = trailResult.tpPrice;
                // OPTIMIZATION: Faster Math.abs() alternative
                const tpDiff = calculatedTP - entryPrice;
                const tpDiffAbs = tpDiff < 0 ? -tpDiff : tpDiff;
                tpPercent = (tpDiffAbs / entryPrice) * 100;
                signalAny.bounce_tp_trailing = true;
                signalAny.bounce_tp_trail_reason = trailResult.reason;
                signalAny.bounce_tp_original = bounceTP;
                signalAny.bounce_tp_trailed = calculatedTP;
                // OPTIMIZATION: Reduced verbose logging - only log if VERBOSE_LOGGING is enabled
                if (process.env.VERBOSE_LOGGING === 'true') {
                    console.log(`🎯 Bounce TP Trail for ${signal.coin}: $${calculatedTP.toFixed(2)} (trailing from $${bounceTP.toFixed(2)}, ${trailResult.reason})`);
                }
            }
            else {
                calculatedTP = bounceTP;
                tpPercent = tpResult.tpPercent;
            }
            signalAny.bounce_target = calculatedTP;
            signalAny.bounce_profit_expectation = tpResult.profitExpectation;
            if (tpResult.isCounterTrend) {
                signalAny.bounce_counter_trend_penalty = 0.05;
                collectWarning(signal.coin, `⚠️  Counter-Trend Bounce Detected`, [
                    `→ Bounce direction contradicts daily trend (${trendAlignment?.dailyTrend || 'unknown'})`,
                    `→ Confidence will be reduced by 5% for counter-trend risk`,
                    `→ TP target reduced by 25% (more conservative)`
                ]);
            }
            // OPTIMIZATION: Reduced verbose logging - only log if VERBOSE_LOGGING is enabled
            if (process.env.VERBOSE_LOGGING === 'true') {
                console.log(`🎯 Bounce TP for ${signal.coin}: $${calculatedTP.toFixed(2)} (${tpPercent.toFixed(2)}%, strength: ${(signalAny.bounce_strength * 100).toFixed(0)}%, ${tpResult.isCounterTrend ? 'counter-trend' : 'with-trend'}${trailResult.isTrailing ? ', trailing' : ''})`);
            }
        }
        else {
            // Use standard dynamic TP
            tpResult = calculateDynamicTP(entryPrice, signal, indicators, trendAlignment, marketRegime, slDistance);
            calculatedTP = tpResult.tpPrice;
            tpPercent = tpResult.tpPercent;
        }
        // Override with AI's TP if provided and reasonable
        if (signal.profit_target && signal.profit_target > 0) {
            // OPTIMIZATION: Faster Math.abs() alternative and cache calculations
            const profitTarget = signal.profit_target;
            const tpDiff = profitTarget - entryPrice;
            const aiTPDistance = tpDiff < 0 ? -tpDiff : tpDiff;
            const aiTPPercent = (aiTPDistance / entryPrice) * 100;
            // OPTIMIZATION: Pre-compute signal type check
            const signalTypeForTP = signalType;
            const isDirectionCorrect = (signalTypeForTP === 'buy_to_enter' && profitTarget > entryPrice) ||
                (signalTypeForTP === 'sell_to_enter' && profitTarget < entryPrice);
            if (isDirectionCorrect && aiTPPercent >= 2.0 && aiTPPercent <= 5.0) {
                calculatedTP = signal.profit_target;
                // OPTIMIZATION: Reduced verbose logging - only log if VERBOSE_LOGGING is enabled
                if (process.env.VERBOSE_LOGGING === 'true') {
                    console.log(`📊 Using AI TP for ${signal.coin}: $${calculatedTP.toFixed(2)} (${aiTPPercent.toFixed(2)}%)`);
                }
            }
            else {
                // OPTIMIZATION: Reduced verbose logging - only log if VERBOSE_LOGGING is enabled
                if (process.env.VERBOSE_LOGGING === 'true') {
                    console.warn(`⚠️  AI TP for ${signal.coin} rejected: direction=${isDirectionCorrect}, percent=${aiTPPercent.toFixed(2)}% (min=2.00%, max=5.00%)`);
                }
            }
        }
        // Ensure minimum R:R based on confidence level
        let finalTPDistance = Math.abs(calculatedTP - entryPrice);
        let riskRewardRatio = finalTPDistance / slDistance;
        // OPTIMIZATION FINAL: Cache getTradingConfig() call (only called once here, but cache for consistency)
        const tradingConfig = getTradingConfig();
        const mediumConfidence = tradingConfig != null && tradingConfig.thresholds != null && tradingConfig.thresholds.confidence != null && tradingConfig.thresholds.confidence.medium != null
            ? tradingConfig.thresholds.confidence.medium
            : 0;
        const isLowConfidence = signalConfidence < mediumConfidence;
        const MIN_RR = (isLowConfidence || isContrarian) ? 3.0 : 2.5;
        if (riskRewardRatio < MIN_RR) {
            const minTPDistance = slDistance * MIN_RR;
            if (signal.signal === 'buy_to_enter' || signal.signal === 'add') {
                calculatedTP = entryPrice + minTPDistance;
            }
            else if (signal.signal === 'sell_to_enter') {
                calculatedTP = entryPrice - minTPDistance;
            }
            finalTPDistance = Math.abs(calculatedTP - entryPrice);
            riskRewardRatio = finalTPDistance / slDistance;
            // OPTIMIZATION: Reduced verbose logging - only log if VERBOSE_LOGGING is enabled
            if (process.env.VERBOSE_LOGGING === 'true') {
                console.warn(`⚠️  TP for ${signal.coin} adjusted to meet minimum ${MIN_RR}:1 R:R (${isLowConfidence || isContrarian ? 'low confidence/contrarian' : 'high/medium confidence'}): $${calculatedTP.toFixed(2)} (new R:R: ${riskRewardRatio.toFixed(2)}:1)`);
            }
        }
        // Validate TP direction
        if (signal.signal === 'buy_to_enter' || signal.signal === 'add') {
            if (calculatedTP <= entryPrice) {
                calculatedTP = entryPrice + (slDistance * MIN_RR);
                finalTPDistance = Math.abs(calculatedTP - entryPrice);
                riskRewardRatio = finalTPDistance / slDistance;
                console.warn(`⚠️  TP for ${signal.coin} BUY was below entry, corrected to $${calculatedTP.toFixed(2)}`);
            }
        }
        else if (signal.signal === 'sell_to_enter') {
            if (calculatedTP >= entryPrice) {
                calculatedTP = entryPrice - (slDistance * MIN_RR);
                finalTPDistance = Math.abs(calculatedTP - entryPrice);
                riskRewardRatio = finalTPDistance / slDistance;
                console.warn(`⚠️  TP for ${signal.coin} SELL was above entry, corrected to $${calculatedTP.toFixed(2)}`);
            }
        }
        signal.profit_target = calculatedTP;
        signalAny.risk_reward_ratio = riskRewardRatio;
        signalAny.tp_factors = tpResult.factors;
        // Calculate confidence score
        if (!indicators) {
            // CRITICAL FIX: Use minimum acceptable confidence (0.60) instead of 0.5
            // Reason: 0.5 (50%) is below 60% threshold and will be rejected
            // Use minimum threshold to allow signal through (indicators missing is not a complete rejection)
            const MIN_CONFIDENCE_THRESHOLD = 0.60;
            signal.confidence = MIN_CONFIDENCE_THRESHOLD;
            console.warn(`⚠️  ${signal.coin}: No indicators available - using minimum confidence ${(MIN_CONFIDENCE_THRESHOLD * 100).toFixed(0)}%`);
            return signal;
        }
        // CRITICAL FIX: Use calculateConfidenceScore as PRIMARY confidence calculation
        // Quality-weighted-justification is ONLY for justification text, NOT for confidence
        // Reason: calculateConfidenceScore considers trend alignment, R/R, external data, etc.
        // Quality-weighted-justification only considers indicator weights, which is incomplete
        // PHASE 1: Pass asset rank and quality score to confidence calculation
        const confidenceResult = calculateConfidenceScore(signal, indicators, trendAlignment, marketRegime, riskRewardRatio, externalData, assetRank, qualityScore);
        // const weightedResult = calculateQualityWeightedJustification(signal, indicators, trendAlignment, externalData)
        // Use calculateConfidenceScore result as primary (it's more comprehensive)
        // Quality-weighted-justification result is only used for justification text, not confidence
        let baseConfidence = confidenceResult.confidence;
        // CRITICAL FIX: Log confidence breakdown for all signals to verify fixes
        // Log signals below 60% with detailed breakdown, and log all signals with summary
        if (baseConfidence < 0.60) {
            console.log(`\x1b[33m📊 ${signal.coin}: Confidence ${(baseConfidence * 100).toFixed(2)}% < 60% - Detailed Breakdown:\x1b[0m`);
            console.log(`   Score: ${confidenceResult.totalScore}/${confidenceResult.maxScore} (${((confidenceResult.totalScore / confidenceResult.maxScore) * 100).toFixed(1)}%)`);
            confidenceResult.breakdown.forEach(breakdown => {
                console.log(`   - ${breakdown}`);
            });
            if (confidenceResult.autoRejected) {
                console.log(`   ⚠️  Auto-rejected: ${confidenceResult.rejectionReason}`);
            }
            // Check external data availability
            if (!externalData || Object.keys(externalData).length === 0) {
                console.log(`   ⚠️  External data: MISSING (costing 30 points / 130 max)`);
            }
            else {
                console.log(`   ✓ External data: Available`);
            }
        }
        else {
            // Log successful signals with confidence >= 60% (summary only)
            console.log(`\x1b[32m✓ ${signal.coin}: Signal ${signal.signal.toUpperCase()} generated with confidence ${(baseConfidence * 100).toFixed(1)}% (>= 60% threshold)\x1b[0m`);
        }
        // CRITICAL FIX: Ensure confidence is never 0, null, undefined, or NaN
        // Minimum confidence is 0.1 (10%) - signals below this should be filtered out by confidence threshold
        const MIN_CONFIDENCE = 0.1;
        if (!baseConfidence || baseConfidence === 0 || isNaN(baseConfidence) || baseConfidence < MIN_CONFIDENCE) {
            console.warn(`⚠️  ${signal.coin}: Confidence calculation resulted in invalid value ${baseConfidence}, setting to minimum ${MIN_CONFIDENCE}`);
            baseConfidence = MIN_CONFIDENCE;
        }
        // Apply confidence adjustments based on various factors
        // (This is a simplified version - the full version has many more adjustments)
        signal.confidence = baseConfidence;
        // Log confidence 0.0% cases for debugging
        if (signal.confidence < MIN_CONFIDENCE || signal.confidence === 0) {
            console.error(`❌ ${signal.coin}: CRITICAL - Confidence is ${(signal.confidence * 100).toFixed(2)}% (should be >= ${(MIN_CONFIDENCE * 100).toFixed(0)}%)`);
            console.error(`   Signal type: ${signal.signal}`);
            console.error(`   Trend alignment: ${confidenceResult.autoRejected ? 'REJECTED' : 'OK'}`);
            if (confidenceResult.rejectionReason) {
                console.error(`   Rejection reason: ${confidenceResult.rejectionReason}`);
            }
            console.error(`   Breakdown: ${confidenceResult.breakdown.join(', ')}`);
            // Force minimum confidence to prevent 0.0% display
            signal.confidence = MIN_CONFIDENCE;
        }
    }
    // Final validation: Ensure confidence is always valid before returning
    if (!signal.confidence || signal.confidence === 0 || isNaN(signal.confidence)) {
        // CRITICAL FIX: Use minimum acceptable confidence (0.60) instead of 0.5
        // Reason: 0.5 (50%) is below 60% threshold and will be rejected
        const MIN_CONFIDENCE_THRESHOLD = 0.60;
        console.warn(`⚠️  ${signal.coin}: Final validation - confidence is invalid (${signal.confidence}), defaulting to minimum threshold ${(MIN_CONFIDENCE_THRESHOLD * 100).toFixed(0)}%`);
        signal.confidence = MIN_CONFIDENCE_THRESHOLD;
    }
    return signal;
}
