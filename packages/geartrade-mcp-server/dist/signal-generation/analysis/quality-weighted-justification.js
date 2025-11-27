/**
 * Quality-Weighted Justification System
 * Instead of simple counting, weights indicators by reliability
 */
import { INDICATOR_WEIGHTS, detectContradictions, ConflictSeverity, calculateConflictSeverity } from './indicator-weights';
/**
 * Calculate quality-weighted justification
 */
export function calculateQualityWeightedJustification(signal, indicators, _trendAlignment, externalData) {
    const bullishIndicators = [];
    const bearishIndicators = [];
    let bullishScore = 0;
    let bearishScore = 0;
    const isBuySignal = signal.signal === 'buy_to_enter' || signal.signal === 'add';
    const price = indicators?.price || 0;
    // Detect contradictions first
    // Handle signal type compatibility - detectContradictions only accepts specific types
    const signalType = signal.signal === 'reduce' || signal.signal === 'close_all' || signal.signal === 'hold'
        ? 'buy_to_enter' // Default to buy_to_enter for non-trading signals
        : signal.signal;
    const contradictions = detectContradictions(indicators, signalType);
    const contradictionDescriptions = contradictions.map(c => c.description);
    // Track redundant groups
    const redundantGroups = new Set();
    // const usedGroups: Map<string, string[]> = new Map()
    if (!indicators) {
        return {
            bullishScore: 0,
            bearishScore: 0,
            bullishCount: 0,
            bearishCount: 0,
            uniqueBullishCount: 0,
            uniqueBearishCount: 0,
            bullishIndicators: [],
            bearishIndicators: [],
            contradictions: contradictionDescriptions,
            redundantGroups: [],
            qualityRatio: 0,
            conflictSeverity: ConflictSeverity.LOW,
            conflictScore: 0,
            totalContradictions: 0,
            baseConfidence: 0,
            adjustedConfidence: 0,
            redundancyPenalty: 0
        };
    }
    // Get market regime and volatility for context-aware weighting
    const marketRegime = indicators.marketRegime && typeof indicators.marketRegime === 'object'
        ? indicators.marketRegime.regime || 'trending'
        : 'trending';
    const volatility = indicators.marketRegime && typeof indicators.marketRegime === 'object'
        ? indicators.marketRegime.volatility || 'normal'
        : 'normal';
    /**
     * Apply context-aware weighting based on market regime and volatility
     */
    const applyContextAwareWeighting = (baseWeight, category) => {
        if (marketRegime === 'trending') {
            // ADX more important in trending market
            if (category === 'Trend Momentum')
                return baseWeight * 1.3;
            // Overbought less relevant in trending
            if (category === 'Overbought/Oversold')
                return baseWeight * 0.7;
        }
        if (marketRegime === 'ranging' || marketRegime === 'choppy') {
            // Oscillators more reliable in ranging market
            if (category === 'Overbought/Oversold')
                return baseWeight * 1.3;
            // Trend strength less important
            if (category === 'Trend Momentum')
                return baseWeight * 0.7;
        }
        if (volatility === 'high') {
            // Divergence can be false signal in high volatility
            if (category === 'Divergence')
                return baseWeight * 0.8;
        }
        return baseWeight;
    };
    // Process each indicator with weight
    // MACD Histogram
    if (indicators.macd?.histogram !== undefined) {
        const hist = indicators.macd.histogram;
        const baseWeight = INDICATOR_WEIGHTS.MACD_HISTOGRAM.weight;
        const weight = applyContextAwareWeighting(baseWeight, 'Trend Momentum');
        if (hist > 0 && isBuySignal) {
            const score = { name: 'MACD Histogram', weight, category: 'Trend Momentum',
                impact: 'low', description: `MACD histogram +${hist.toFixed(4)} (bullish momentum)` };
            bullishIndicators.push(score);
            bullishScore += weight;
        }
        else if (hist < 0 && !isBuySignal) {
            const score = { name: 'MACD Histogram', weight, category: 'Trend Momentum',
                impact: 'low', description: `MACD histogram ${hist.toFixed(4)} (bearish momentum)` };
            bearishIndicators.push(score);
            bearishScore += weight;
        }
        else if (hist > 0 && !isBuySignal) {
            // MACD histogram positif untuk SELL signal = kontradiksi (bullish indicator)
            // Tambahkan ke bullishIndicators untuk tracking tapi TIDAK tambah score
            const score = { name: 'MACD Histogram', weight, category: 'Trend Momentum',
                impact: 'low', description: `MACD histogram +${hist.toFixed(4)} (CONTRADICTS SELL - bullish momentum)` };
            bullishIndicators.push(score);
            // TIDAK menambahkan bearishScore karena ini kontradiksi yang sudah dihitung di conflict severity
        }
        else if (hist < 0 && isBuySignal) {
            // MACD histogram negatif untuk BUY signal = kontradiksi (bearish indicator)
            // Tambahkan ke bearishIndicators untuk tracking tapi TIDAK tambah score
            const score = { name: 'MACD Histogram', weight, category: 'Trend Momentum',
                impact: 'low', description: `MACD histogram ${hist.toFixed(4)} (CONTRADICTS BUY - bearish momentum)` };
            bearishIndicators.push(score);
            // TIDAK menambahkan bullishScore karena ini kontradiksi yang sudah dihitung di conflict severity
        }
    }
    // MACD Crossover
    if (indicators.macd?.macd !== undefined && indicators.macd?.signal !== undefined) {
        const baseWeight = INDICATOR_WEIGHTS.MACD_CROSSOVER.weight;
        const weight = applyContextAwareWeighting(baseWeight, 'Trend Momentum');
        const macdLine = indicators.macd.macd;
        const macdSignal = indicators.macd.signal;
        if (macdLine > macdSignal && isBuySignal) {
            // BUY signal dengan bullish crossover = supporting
            bullishIndicators.push({ name: 'MACD Crossover', weight, category: 'Trend Momentum',
                impact: 'medium', description: `MACD line ${macdLine.toFixed(4)} above Signal ${macdSignal.toFixed(4)} (bullish crossover)` });
            bullishScore += weight;
        }
        else if (macdLine < macdSignal && !isBuySignal) {
            // SELL signal dengan bearish crossover = supporting
            bearishIndicators.push({ name: 'MACD Crossover', weight, category: 'Trend Momentum',
                impact: 'medium', description: `MACD line ${macdLine.toFixed(4)} below Signal ${macdSignal.toFixed(4)} (bearish crossover)` });
            bearishScore += weight;
        }
        else if (macdLine > macdSignal && !isBuySignal) {
            // SELL signal dengan bullish crossover = kontradiksi
            bullishIndicators.push({ name: 'MACD Crossover', weight, category: 'Trend Momentum',
                impact: 'medium', description: `MACD line ${macdLine.toFixed(4)} above Signal ${macdSignal.toFixed(4)} (CONTRADICTS SELL - bullish crossover)` });
            // TIDAK menambahkan bullishScore karena ini kontradiksi
        }
        else if (macdLine < macdSignal && isBuySignal) {
            // BUY signal dengan bearish crossover = kontradiksi
            bearishIndicators.push({ name: 'MACD Crossover', weight, category: 'Trend Momentum',
                impact: 'medium', description: `MACD line ${macdLine.toFixed(4)} below Signal ${macdSignal.toFixed(4)} (CONTRADICTS BUY - bearish crossover)` });
            // TIDAK menambahkan bearishScore karena ini kontradiksi
        }
    }
    // Price Position Indicators (Redundant Group)
    const pricePositionIndicators = [];
    // BUY signals: Price above indicators
    if (isBuySignal && price > 0) {
        if (indicators.ema8 !== null && indicators.ema8 !== undefined && price > indicators.ema8) {
            pricePositionIndicators.push({ name: 'Price > EMA8', weight: INDICATOR_WEIGHTS.PRICE_ABOVE_EMA8.weight,
                category: 'Price Position', impact: 'low', description: `Price above EMA8 $${indicators.ema8.toFixed(2)}` });
        }
        if (indicators.ema20 !== null && indicators.ema20 !== undefined && price > indicators.ema20) {
            pricePositionIndicators.push({ name: 'Price > EMA20', weight: INDICATOR_WEIGHTS.PRICE_ABOVE_EMA20.weight,
                category: 'Price Position', impact: 'low', description: `Price above EMA20 $${indicators.ema20.toFixed(2)}` });
        }
        if (indicators.vwap !== null && indicators.vwap !== undefined && price > indicators.vwap) {
            pricePositionIndicators.push({ name: 'Price > VWAP', weight: INDICATOR_WEIGHTS.PRICE_ABOVE_VWAP.weight,
                category: 'Price Position', impact: 'low', description: `Price above VWAP $${indicators.vwap.toFixed(2)}` });
        }
        if (indicators.bollingerBands && indicators.bollingerBands.middle !== undefined && price > indicators.bollingerBands.middle) {
            pricePositionIndicators.push({ name: 'Price > BB Middle', weight: INDICATOR_WEIGHTS.PRICE_ABOVE_BB_MIDDLE.weight,
                category: 'Price Position', impact: 'low', description: `Price above BB middle $${indicators.bollingerBands.middle.toFixed(2)}` });
        }
    }
    // SELL signals: Price below indicators
    if (!isBuySignal && price > 0) {
        if (indicators.ema8 !== null && indicators.ema8 !== undefined && price < indicators.ema8) {
            pricePositionIndicators.push({ name: 'Price < EMA8', weight: INDICATOR_WEIGHTS.PRICE_ABOVE_EMA8.weight,
                category: 'Price Position', impact: 'low', description: `Price below EMA8 $${indicators.ema8.toFixed(2)}` });
        }
        if (indicators.ema20 !== null && indicators.ema20 !== undefined && price < indicators.ema20) {
            pricePositionIndicators.push({ name: 'Price < EMA20', weight: INDICATOR_WEIGHTS.PRICE_ABOVE_EMA20.weight,
                category: 'Price Position', impact: 'low', description: `Price below EMA20 $${indicators.ema20.toFixed(2)}` });
        }
        if (indicators.vwap !== null && indicators.vwap !== undefined && price < indicators.vwap) {
            pricePositionIndicators.push({ name: 'Price < VWAP', weight: INDICATOR_WEIGHTS.PRICE_ABOVE_VWAP.weight,
                category: 'Price Position', impact: 'low', description: `Price below VWAP $${indicators.vwap.toFixed(2)}` });
        }
        if (indicators.bollingerBands && indicators.bollingerBands.middle !== undefined && price < indicators.bollingerBands.middle) {
            pricePositionIndicators.push({ name: 'Price < BB Middle', weight: INDICATOR_WEIGHTS.PRICE_ABOVE_BB_MIDDLE.weight,
                category: 'Price Position', impact: 'low', description: `Price below BB middle $${indicators.bollingerBands.middle.toFixed(2)}` });
        }
    }
    // Only count unique price position indicators (avoid redundancy)
    // Apply context-aware weighting to each indicator first
    pricePositionIndicators.forEach(ind => {
        ind.weight = applyContextAwareWeighting(ind.weight, 'Price Position');
    });
    if (pricePositionIndicators.length > 0) {
        // Use highest weight indicator from group (after context weighting)
        const best = pricePositionIndicators.reduce((a, b) => a.weight > b.weight ? a : b);
        best.isRedundant = pricePositionIndicators.length > 1;
        best.redundancyGroup = 'Price Position';
        if (isBuySignal) {
            bullishIndicators.push(best);
            bullishScore += best.weight;
        }
        else {
            bearishIndicators.push(best);
            bearishScore += best.weight;
        }
        if (pricePositionIndicators.length > 1) {
            redundantGroups.add('Price Position');
        }
    }
    // EMA Alignment (Higher weight - unique insight)
    if (indicators.ema20 !== null && indicators.ema20 !== undefined &&
        indicators.ema50 !== null && indicators.ema50 !== undefined && price > 0) {
        const weight = INDICATOR_WEIGHTS.EMA_ALIGNMENT.weight;
        const ema20 = indicators.ema20;
        const ema50 = indicators.ema50;
        const uptrendStructure = price > ema20 && ema20 > ema50;
        const downtrendStructure = price < ema20 && ema20 < ema50;
        if (uptrendStructure && isBuySignal) {
            // BUY signal dengan uptrend structure = supporting
            bullishIndicators.push({ name: 'EMA Alignment', weight, category: 'Trend Momentum',
                impact: 'high', description: `EMA alignment: Price > EMA20 > EMA50 (uptrend structure)` });
            bullishScore += weight;
        }
        else if (downtrendStructure && !isBuySignal) {
            // SELL signal dengan downtrend structure = supporting
            bearishIndicators.push({ name: 'EMA Alignment', weight, category: 'Trend Momentum',
                impact: 'high', description: `EMA alignment: Price < EMA20 < EMA50 (downtrend structure)` });
            bearishScore += weight;
        }
        else if (downtrendStructure && isBuySignal) {
            // BUY signal dengan downtrend structure = kontradiksi
            bearishIndicators.push({ name: 'EMA Alignment', weight, category: 'Trend Momentum',
                impact: 'high', description: `EMA alignment: Price < EMA20 < EMA50 (CONTRADICTS BUY - downtrend structure)` });
            // TIDAK menambahkan bearishScore karena ini kontradiksi
        }
        else if (uptrendStructure && !isBuySignal) {
            // SELL signal dengan uptrend structure = kontradiksi
            bullishIndicators.push({ name: 'EMA Alignment', weight, category: 'Trend Momentum',
                impact: 'high', description: `EMA alignment: Price > EMA20 > EMA50 (CONTRADICTS SELL - uptrend structure)` });
            // TIDAK menambahkan bullishScore karena ini kontradiksi
        }
    }
    // ADX Strong Trend
    const getAdxValue = (adx) => {
        if (adx === null || adx === undefined)
            return null;
        if (typeof adx === 'number' && !isNaN(adx))
            return adx;
        if (typeof adx === 'object' && adx !== null && typeof adx.adx === 'number' && !isNaN(adx.adx)) {
            return adx.adx;
        }
        return null;
    };
    const adxValue = getAdxValue(indicators.adx);
    if (adxValue !== null && adxValue > 25) {
        const weight = INDICATOR_WEIGHTS.ADX_STRONG.weight;
        if (isBuySignal) {
            bullishIndicators.push({ name: 'ADX Strong Trend', weight, category: 'Trend Momentum',
                impact: 'high', description: `ADX ${adxValue.toFixed(2)} (strong trend)` });
            bullishScore += weight;
        }
        else {
            bearishIndicators.push({ name: 'ADX Strong Trend', weight, category: 'Trend Momentum',
                impact: 'high', description: `ADX ${adxValue.toFixed(2)} (strong trend)` });
            bearishScore += weight;
        }
    }
    // +DI/-DI
    if (indicators.plusDI !== null && indicators.minusDI !== null) {
        const weight = INDICATOR_WEIGHTS.PLUS_DI_DOMINANCE.weight;
        if (indicators.plusDI > indicators.minusDI && isBuySignal) {
            bullishIndicators.push({ name: '+DI > -DI', weight, category: 'Trend Momentum',
                impact: 'medium', description: `+DI ${indicators.plusDI.toFixed(2)} > -DI ${indicators.minusDI.toFixed(2)} (bullish trend)` });
            bullishScore += weight;
        }
        else if (indicators.minusDI > indicators.plusDI && !isBuySignal) {
            bearishIndicators.push({ name: '-DI > +DI', weight, category: 'Trend Momentum',
                impact: 'medium', description: `-DI ${indicators.minusDI.toFixed(2)} > +DI ${indicators.plusDI.toFixed(2)} (bearish trend)` });
            bearishScore += weight;
        }
    }
    // Dual Overbought/Oversold (HIGH IMPACT)
    if (isBuySignal && indicators.stochastic?.k && indicators.williamsR !== null && indicators.williamsR !== undefined) {
        const stochOverbought = indicators.stochastic.k > 80;
        const williamsOverbought = indicators.williamsR > -20;
        const rsiOverbought = indicators.rsi14 && indicators.rsi14 > 70;
        // Triple Overbought (CRITICAL)
        if (stochOverbought && williamsOverbought && rsiOverbought) {
            const baseWeight = INDICATOR_WEIGHTS.TRIPLE_OVERBOUGHT.weight;
            const weight = applyContextAwareWeighting(baseWeight, 'Overbought/Oversold');
            bearishIndicators.push({ name: 'Triple Overbought', weight, category: 'Overbought/Oversold',
                impact: 'high', description: `TRIPLE overbought: RSI ${(indicators.rsi14 || 0).toFixed(2)} + Stochastic K ${indicators.stochastic.k.toFixed(2)} + Williams %R ${indicators.williamsR.toFixed(2)} (extremely high reversal risk)` });
            bearishScore += weight;
        }
        else if (stochOverbought && williamsOverbought) {
            // Dual Overbought
            const baseWeight = INDICATOR_WEIGHTS.DUAL_OVERBOUGHT.weight;
            const weight = applyContextAwareWeighting(baseWeight, 'Overbought/Oversold');
            bearishIndicators.push({ name: 'Dual Overbought', weight, category: 'Overbought/Oversold',
                impact: 'high', description: `Dual overbought: Stochastic K ${indicators.stochastic.k.toFixed(2)} + Williams %R ${indicators.williamsR.toFixed(2)} (high reversal risk)` });
            bearishScore += weight;
        }
    }
    else if (!isBuySignal && indicators.stochastic?.k !== undefined && indicators.williamsR !== null && indicators.williamsR !== undefined) {
        // SELL signals: Check for oversold conditions (bullish for SELL)
        const stochK = indicators.stochastic.k;
        const williamsR = indicators.williamsR;
        const rsi14 = indicators.rsi14;
        const stochOversold = stochK < 20;
        const williamsOversold = williamsR < -80;
        const rsiOversold = rsi14 !== null && rsi14 !== undefined && rsi14 < 30;
        // Triple Oversold (CRITICAL)
        if (stochOversold && williamsOversold && rsiOversold && rsi14 !== null && rsi14 !== undefined) {
            const baseWeight = INDICATOR_WEIGHTS.TRIPLE_OVERSOLD.weight;
            const weight = applyContextAwareWeighting(baseWeight, 'Overbought/Oversold');
            bullishIndicators.push({ name: 'Triple Oversold', weight, category: 'Overbought/Oversold',
                impact: 'high', description: `TRIPLE oversold: RSI ${rsi14.toFixed(2)} + Stochastic K ${stochK.toFixed(2)} + Williams %R ${williamsR.toFixed(2)} (extremely high reversal risk)` });
            bullishScore += weight;
        }
        else if (stochOversold && williamsOversold) {
            // Dual Oversold
            const baseWeight = INDICATOR_WEIGHTS.DUAL_OVERSOLD.weight;
            const weight = applyContextAwareWeighting(baseWeight, 'Overbought/Oversold');
            bullishIndicators.push({ name: 'Dual Oversold', weight, category: 'Overbought/Oversold',
                impact: 'high', description: `Dual oversold: Stochastic K ${stochK.toFixed(2)} + Williams %R ${williamsR.toFixed(2)} (high reversal risk)` });
            bullishScore += weight;
        }
    }
    // Aroon Contradiction (HIGH IMPACT)
    if (indicators.aroon && indicators.ema20 && indicators.ema50 && price > 0) {
        const emaUptrend = price > indicators.ema20 && indicators.ema20 > indicators.ema50;
        const aroonDowntrend = indicators.aroon.down > indicators.aroon.up && indicators.aroon.down > 70;
        const aroonUptrend = indicators.aroon.up > indicators.aroon.down && indicators.aroon.up > 70;
        if (isBuySignal && emaUptrend && aroonDowntrend) {
            const baseWeight = INDICATOR_WEIGHTS.AROON_CONTRADICTION.weight;
            const weight = applyContextAwareWeighting(baseWeight, 'Structure & Regime');
            bearishIndicators.push({ name: 'Aroon Contradiction', weight, category: 'Structure & Regime',
                impact: 'high', description: `Aroon contradiction: EMA shows uptrend but Aroon Down ${indicators.aroon.down.toFixed(2)}% > Up ${indicators.aroon.up.toFixed(2)}% (downtrend)` });
            bearishScore += weight;
        }
        else if (!isBuySignal && !emaUptrend && aroonUptrend) {
            const baseWeight = INDICATOR_WEIGHTS.AROON_CONTRADICTION.weight;
            const weight = applyContextAwareWeighting(baseWeight, 'Structure & Regime');
            bullishIndicators.push({ name: 'Aroon Contradiction', weight, category: 'Structure & Regime',
                impact: 'high', description: `Aroon contradiction: EMA shows downtrend but Aroon Up ${indicators.aroon.up.toFixed(2)}% > Down ${indicators.aroon.down.toFixed(2)}% (uptrend)` });
            bullishScore += weight;
        }
    }
    // MACD Divergence (CRITICAL - Highest weight)
    if (indicators.macdDivergence && typeof indicators.macdDivergence === 'object') {
        const divergence = indicators.macdDivergence;
        const baseWeight = INDICATOR_WEIGHTS.MACD_DIVERGENCE.weight;
        const weight = applyContextAwareWeighting(baseWeight, 'Divergence');
        if (isBuySignal && divergence.divergence === 'bearish') {
            bearishIndicators.push({ name: 'MACD Bearish Divergence', weight, category: 'Divergence',
                impact: 'high', description: `MACD Bearish Divergence: Price rising but momentum declining (strong reversal warning)` });
            bearishScore += weight;
        }
        else if (!isBuySignal && divergence.divergence === 'bullish') {
            bullishIndicators.push({ name: 'MACD Bullish Divergence', weight, category: 'Divergence',
                impact: 'high', description: `MACD Bullish Divergence: Price falling but momentum rising (strong reversal warning)` });
            bullishScore += weight;
        }
    }
    // RSI Divergence (HIGH IMPACT)
    if (indicators.rsiDivergence && typeof indicators.rsiDivergence === 'object') {
        const divergence = indicators.rsiDivergence;
        const baseWeight = INDICATOR_WEIGHTS.RSI_DIVERGENCE.weight;
        const weight = applyContextAwareWeighting(baseWeight, 'Divergence');
        if (isBuySignal && divergence.divergence === 'bearish') {
            bearishIndicators.push({ name: 'RSI Bearish Divergence', weight, category: 'Divergence',
                impact: 'high', description: `RSI Bearish Divergence: Price making higher highs but RSI making lower highs (reversal warning)` });
            bearishScore += weight;
        }
        else if (!isBuySignal && divergence.divergence === 'bullish') {
            bullishIndicators.push({ name: 'RSI Bullish Divergence', weight, category: 'Divergence',
                impact: 'high', description: `RSI Bullish Divergence: Price making lower lows but RSI making higher lows (reversal warning)` });
            bullishScore += weight;
        }
    }
    // Volume Divergence (HIGH IMPACT)
    if (indicators.volumePriceDivergence !== null && indicators.volumePriceDivergence !== undefined) {
        const vpd = indicators.volumePriceDivergence;
        const baseWeight = INDICATOR_WEIGHTS.VOLUME_DIVERGENCE.weight;
        const weight = applyContextAwareWeighting(baseWeight, 'Volume Confirmation');
        // Bearish: Price rising but volume decreasing
        if (isBuySignal && vpd < -0.5) {
            bearishIndicators.push({ name: 'Volume Divergence', weight, category: 'Volume Confirmation',
                impact: 'high', description: `Volume Divergence: Price rising but volume declining (${vpd.toFixed(2)}, bearish signal)` });
            bearishScore += weight;
        }
        else if (!isBuySignal && vpd > 0.5) {
            bullishIndicators.push({ name: 'Volume Divergence', weight, category: 'Volume Confirmation',
                impact: 'high', description: `Volume Divergence: Price falling but volume increasing (${vpd.toFixed(2)}, bullish signal)` });
            bullishScore += weight;
        }
    }
    // OBV Divergence (HIGH IMPACT)
    if (indicators.obv !== null && indicators.obv !== undefined && price > 0 && indicators.priceChange24h !== undefined) {
        const priceChange = indicators.priceChange24h;
        const obvChange = indicators.volumeChange || 0; // Use volume change as proxy for OBV change
        // If price rising but OBV declining (or volume declining)
        if (isBuySignal && priceChange > 0 && obvChange < -20) {
            const baseWeight = INDICATOR_WEIGHTS.OBV_DIVERGENCE.weight;
            const weight = applyContextAwareWeighting(baseWeight, 'Volume Confirmation');
            bearishIndicators.push({ name: 'OBV Divergence', weight, category: 'Volume Confirmation',
                impact: 'high', description: `OBV Divergence: Price rising (+${priceChange.toFixed(2)}%) but volume declining (${obvChange.toFixed(2)}%, no confirmation)` });
            bearishScore += weight;
        }
        else if (!isBuySignal && priceChange < 0 && obvChange > 20) {
            const baseWeight = INDICATOR_WEIGHTS.OBV_DIVERGENCE.weight;
            const weight = applyContextAwareWeighting(baseWeight, 'Volume Confirmation');
            bullishIndicators.push({ name: 'OBV Divergence', weight, category: 'Volume Confirmation',
                impact: 'high', description: `OBV Divergence: Price falling (${priceChange.toFixed(2)}%) but volume increasing (+${obvChange.toFixed(2)}%, bullish signal)` });
            bullishScore += weight;
        }
    }
    // Support/Resistance Proximity (MEDIUM IMPACT)
    if (indicators.supportResistance && typeof indicators.supportResistance === 'object') {
        const sr = indicators.supportResistance;
        const baseWeight = INDICATOR_WEIGHTS.SUPPORT_RESISTANCE_PROXIMITY.weight;
        const weight = applyContextAwareWeighting(baseWeight, 'Support/Resistance');
        if (sr.support && price > 0) {
            const distanceFromSupport = ((price - sr.support) / price) * 100;
            if (distanceFromSupport >= 0 && distanceFromSupport <= 2 && isBuySignal) {
                bullishIndicators.push({ name: 'Support Proximity', weight, category: 'Support/Resistance',
                    impact: 'medium', description: `Price near support $${sr.support.toFixed(2)} (within ${distanceFromSupport.toFixed(2)}% - potential bounce)` });
                bullishScore += weight;
            }
        }
        if (sr.resistance && price > 0) {
            const distanceToResistance = ((sr.resistance - price) / price) * 100;
            if (distanceToResistance >= 0 && distanceToResistance <= 2 && isBuySignal) {
                bearishIndicators.push({ name: 'Resistance Proximity', weight, category: 'Support/Resistance',
                    impact: 'medium', description: `Price near resistance $${sr.resistance.toFixed(2)} (within ${distanceToResistance.toFixed(2)}% - potential rejection)` });
                bearishScore += weight;
            }
        }
    }
    // Funding Rate Extreme (MEDIUM IMPACT)
    if (externalData?.hyperliquid?.fundingRate !== null && externalData?.hyperliquid?.fundingRate !== undefined) {
        const fundingRate = externalData.hyperliquid.fundingRate;
        const fundingRatePercent = fundingRate * 100;
        const baseWeight = INDICATOR_WEIGHTS.FUNDING_RATE_EXTREME.weight;
        const weight = applyContextAwareWeighting(baseWeight, 'External');
        // Extreme positive funding rate (bearish for longs)
        if (isBuySignal && fundingRatePercent > 0.1) {
            bearishIndicators.push({ name: 'Funding Rate Extreme', weight, category: 'External',
                impact: 'medium', description: `Funding rate extremely positive ${fundingRatePercent.toFixed(4)}% (bearish for longs)` });
            bearishScore += weight;
        }
        else if (!isBuySignal && fundingRatePercent < -0.1) {
            bullishIndicators.push({ name: 'Funding Rate Extreme', weight, category: 'External',
                impact: 'medium', description: `Funding rate extremely negative ${fundingRatePercent.toFixed(4)}% (bullish for shorts)` });
            bullishScore += weight;
        }
    }
    // Calculate unique counts (excluding redundant groups)
    const uniqueBullish = bullishIndicators.filter(ind => !ind.isRedundant).length;
    const uniqueBearish = bearishIndicators.filter(ind => !ind.isRedundant).length;
    const totalScore = bullishScore + bearishScore;
    // CRITICAL FIX: qualityRatio harus sesuai dengan signal direction
    // BUY signal → gunakan bullishScore, SELL signal → gunakan bearishScore
    const qualityRatio = totalScore > 0
        ? (isBuySignal ? bullishScore / totalScore : bearishScore / totalScore)
        : 0;
    const baseConfidence = qualityRatio; // Same as qualityRatio
    // Calculate conflict severity
    const conflictSeverity = calculateConflictSeverity(contradictions);
    const conflictScore = contradictions.reduce((sum, c) => sum + (c.severityScore || 0), 0);
    // Calculate redundancy penalty
    const totalIndicators = bullishIndicators.length + bearishIndicators.length;
    const uniqueIndicators = uniqueBullish + uniqueBearish;
    const redundancyPenalty = totalIndicators > 0 ? (totalIndicators - uniqueIndicators) / totalIndicators : 0;
    /**
     * Calculate adjusted confidence with conflict severity penalty and redundancy penalty
     */
    const calculateAdjustedConfidence = (base, severity, redundancy) => {
        let adjusted = base;
        // Check if there's an Aroon contradiction specifically
        const hasAroonContradiction = contradictions.some(c => c.type === 'aroon_ema_contradiction');
        // Conflict severity penalty
        // CRITICAL FIX: Aroon contradiction gets -30% penalty even if severity is MEDIUM
        if (hasAroonContradiction && severity === ConflictSeverity.MEDIUM) {
            adjusted = adjusted * 0.70; // -30% penalty for Aroon contradiction (treating MEDIUM as CRITICAL)
        }
        else if (severity === ConflictSeverity.CRITICAL) {
            adjusted = adjusted * 0.7; // -30% penalty
        }
        else if (severity === ConflictSeverity.HIGH) {
            adjusted = adjusted * 0.85; // -15% penalty
        }
        else if (severity === ConflictSeverity.MEDIUM) {
            adjusted = adjusted * 0.95; // -5% penalty (only for non-Aroon contradictions)
        }
        // LOW severity: no penalty
        // CRITICAL FIX: Reduce redundancy penalty - multiple confirming indicators shouldn't be heavily penalized
        // Changed from -30% max to -10% max (reduced from 0.3 to 0.1)
        // Reason: Multiple confirming indicators (e.g., EMA8, EMA20, VWAP all bullish) should be rewarded, not penalized
        // Reduced penalty: ×(1 - redundancy * 0.1) = max -10% if 100% redundant
        adjusted = adjusted * (1 - redundancy * 0.1);
        return Math.max(0, Math.min(1, adjusted)); // Clamp between 0 and 1
    };
    const adjustedConfidence = calculateAdjustedConfidence(baseConfidence, conflictSeverity, redundancyPenalty);
    return {
        bullishScore,
        bearishScore,
        bullishCount: bullishIndicators.length,
        bearishCount: bearishIndicators.length,
        uniqueBullishCount: uniqueBullish,
        uniqueBearishCount: uniqueBearish,
        bullishIndicators,
        bearishIndicators,
        contradictions: contradictionDescriptions,
        redundantGroups: Array.from(redundantGroups),
        qualityRatio,
        conflictSeverity,
        conflictScore,
        totalContradictions: contradictions.length,
        baseConfidence,
        adjustedConfidence,
        redundancyPenalty
    };
}
