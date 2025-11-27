/**
 * Invalidation Condition Generation
 * generateInvalidationCondition function
 */
/**
 * Generate invalidation conditions based on Alpha Arena patterns
 * Alpha Arena research shows invalidation_condition improves performance when used properly
 */
export function generateInvalidationCondition(signal, indicators, entryPrice, stopLoss, supportResistance, trendAlignment, externalData, marketData = null) {
    const conditions = [];
    const signalType = signal.signal || signal;
    if (!indicators || !entryPrice || entryPrice <= 0) {
        // Fallback if no indicators available
        if (signalType === 'buy_to_enter' || signalType === 'add') {
            return `Price breaks below $${(stopLoss || entryPrice * 0.98).toFixed(2)} (stop loss level) OR main indicator reverses`;
        }
        else if (signalType === 'sell_to_enter') {
            return `Price breaks above $${(stopLoss || entryPrice * 1.02).toFixed(2)} (stop loss level) OR main indicator reverses`;
        }
        return `Price breaks key support/resistance OR main indicator reverses`;
    }
    const price = indicators.price || entryPrice;
    const rsi14 = indicators.rsi14;
    const macd = indicators.macd;
    const bollingerBands = indicators.bollingerBands;
    const supportLevels = supportResistance?.supportLevels || indicators.supportLevels || [];
    const resistanceLevels = supportResistance?.resistanceLevels || indicators.resistanceLevels || [];
    if (signalType === 'buy_to_enter' || signalType === 'add') {
        // For BUY signals: Comprehensive invalidation based on ALL indicators
        // 1. RSI conditions - ALL timeframes
        if (rsi14 !== null && rsi14 !== undefined) {
            if (rsi14 > 70) {
                conditions.push(`RSI(14) ${rsi14.toFixed(2)} breaks back below ${Math.max(65, Math.floor(rsi14 - 5))} (momentum failure)`);
            }
            else if (rsi14 < 50) {
                conditions.push(`RSI(14) breaks back below ${Math.max(30, Math.floor(rsi14 - 10))} (momentum failure)`);
            }
            else {
                conditions.push(`RSI(14) breaks below 50 (momentum failure)`);
            }
        }
        if (indicators.rsi7 !== null && indicators.rsi7 !== undefined) {
            if (indicators.rsi7 > 70) {
                conditions.push(`RSI(7) ${indicators.rsi7.toFixed(2)} breaks back below 65 (momentum failure)`);
            }
        }
        // 2. MACD histogram reversal
        if (macd && macd.histogram !== null && macd.histogram !== undefined) {
            if (macd.histogram > 0) {
                conditions.push(`MACD histogram turns negative (from +${macd.histogram.toFixed(4)}, bearish momentum)`);
            }
            else {
                conditions.push(`MACD histogram fails to recover above 0 (remains ${macd.histogram.toFixed(4)})`);
            }
        }
        // 3. OBV reversal
        if (indicators.obv !== undefined && indicators.obv !== null && indicators.obv > 0) {
            conditions.push(`OBV turns negative (from +${indicators.obv ? indicators.obv.toFixed(2) : '0'}, selling pressure)`);
        }
        // 4. Price level conditions
        if (supportLevels.length > 0) {
            supportLevels.forEach((support) => {
                if (support < price && support > 0) {
                    conditions.push(`Price breaks below $${support.toFixed(2)} (support level)`);
                }
            });
        }
        if (stopLoss && stopLoss > 0) {
            conditions.push(`Price breaks below $${stopLoss.toFixed(2)} (stop loss level)`);
        }
        // 5. Bollinger Bands condition
        if (bollingerBands) {
            if (bollingerBands.lower && price > bollingerBands.lower) {
                conditions.push(`Price breaks below $${bollingerBands.lower.toFixed(2)} (BB lower band)`);
            }
            if (bollingerBands.middle && price > bollingerBands.middle) {
                conditions.push(`Price breaks below $${bollingerBands.middle.toFixed(2)} (BB middle, bearish)`);
            }
        }
        // 6. Parabolic SAR reversal
        if (indicators.parabolicSAR && price > indicators.parabolicSAR) {
            conditions.push(`Price breaks below Parabolic SAR $${indicators.parabolicSAR.toFixed(2)} (bearish reversal)`);
        }
        // 7. VWAP break
        if (indicators.vwap && price > indicators.vwap) {
            conditions.push(`Price breaks below VWAP $${indicators.vwap.toFixed(2)} (bearish)`);
        }
        // 8. Aroon reversal
        if (indicators.aroon) {
            if (indicators.aroon.up > indicators.aroon.down) {
                conditions.push(`Aroon Down exceeds Up (from Up ${indicators.aroon.up.toFixed(2)} > Down ${indicators.aroon.down.toFixed(2)}, bearish trend)`);
            }
        }
        // 8a. EMA8 cross invalidation (momentum failure)
        if (indicators.ema8 !== null && indicators.ema8 !== undefined && price > indicators.ema8) {
            conditions.push(`Price breaks below EMA8 $${indicators.ema8.toFixed(2)} (momentum failure)`);
        }
        // 8b. EMA20/EMA50/EMA200 break (EMA alignment breakdown)
        if (indicators.ema20 && price > indicators.ema20) {
            conditions.push(`Price breaks below EMA20 $${indicators.ema20.toFixed(2)} (trend breakdown)`);
        }
        if (indicators.ema50 && price > indicators.ema50) {
            conditions.push(`Price breaks below EMA50 $${indicators.ema50.toFixed(2)} (major trend breakdown)`);
        }
        if (indicators.ema200 && price > indicators.ema200) {
            conditions.push(`Price breaks below EMA200 $${indicators.ema200.toFixed(2)} (major uptrend breakdown)`);
        }
        // 8c. ADX drop (trend weakening) - helper function for safe extraction
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
        if (adxValue !== null && adxValue > 20) {
            conditions.push(`ADX drops below 20 (from ${adxValue.toFixed(2)}, trend weakening)`);
        }
        // 8d. plusDI/minusDI reversal (directional movement reversal)
        if (indicators.plusDI !== null && indicators.plusDI !== undefined &&
            indicators.minusDI !== null && indicators.minusDI !== undefined) {
            if (indicators.plusDI > indicators.minusDI) {
                conditions.push(`-DI exceeds +DI (from +DI ${indicators.plusDI.toFixed(2)} > -DI ${indicators.minusDI.toFixed(2)}, bearish trend reversal)`);
            }
        }
        // 8e. Stochastic reversal
        if (indicators.stochastic?.k !== undefined && indicators.stochastic.k !== null) {
            const stochK = indicators.stochastic.k;
            if (stochK < 80) {
                conditions.push(`Stochastic K reverses from overbought zone (from ${stochK.toFixed(2)}, momentum failure)`);
            }
            else if (stochK > 20) {
                conditions.push(`Stochastic K exits oversold zone (from ${stochK.toFixed(2)}, momentum failure)`);
            }
        }
        // 8f. CCI reversal
        if (indicators.cci !== undefined && indicators.cci !== null) {
            if (indicators.cci > 100) {
                conditions.push(`CCI exits overbought zone (from ${indicators.cci.toFixed(2)} to below 100, momentum failure)`);
            }
            else if (indicators.cci < -100) {
                conditions.push(`CCI exits oversold zone (from ${indicators.cci.toFixed(2)} to above -100, momentum failure)`);
            }
        }
        // 8g. Williams %R reversal
        if (indicators.williamsR !== undefined && indicators.williamsR !== null) {
            if (indicators.williamsR > -20) {
                conditions.push(`Williams %R exits overbought zone (from ${indicators.williamsR.toFixed(2)} to below -20, momentum failure)`);
            }
            else if (indicators.williamsR < -80) {
                conditions.push(`Williams %R exits oversold zone (from ${indicators.williamsR.toFixed(2)} to above -80, momentum failure)`);
            }
        }
        // 8h. Fibonacci level break
        if (indicators.fibonacciRetracement && typeof indicators.fibonacciRetracement === 'object') {
            const fib = indicators.fibonacciRetracement;
            if (fib.nearestLevelPrice !== null && fib.nearestLevelPrice !== undefined &&
                fib.isNearLevel &&
                typeof fib.nearestLevelPrice === 'number' &&
                !isNaN(fib.nearestLevelPrice)) {
                if (fib.nearestLevel === '38.2%' || fib.nearestLevel === '50%' || fib.nearestLevel === '61.8%') {
                    conditions.push(`Price breaks below Fibonacci ${fib.nearestLevel} level $${fib.nearestLevelPrice.toFixed(2)} (support break)`);
                }
            }
        }
        // 8i. Market Structure breakdown
        if (indicators.marketStructure && typeof indicators.marketStructure === 'object') {
            const ms = indicators.marketStructure;
            if (ms.higherHighs && ms.higherLows) {
                conditions.push(`Market structure breaks: Higher highs/lower lows sequence breaks (structure breakdown)`);
            }
        }
        // 8j. Candlestick pattern failure
        if (indicators.candlestickPatterns &&
            indicators.candlestickPatterns.patterns &&
            Array.isArray(indicators.candlestickPatterns.patterns) &&
            indicators.candlestickPatterns.patterns.length > 0) {
            const patterns = indicators.candlestickPatterns.patterns;
            // Pattern types: 'doji', 'hammer', 'bullish_engulfing', 'bearish_engulfing'
            const bullishPatterns = patterns.filter((p) => p.type && (p.type === 'bullish_engulfing' ||
                p.type === 'hammer' ||
                (p.type === 'doji' && p.bullish === true)));
            if (bullishPatterns.length > 0) {
                conditions.push(`Bullish candlestick pattern fails to confirm (${bullishPatterns.map((p) => p.type).join(', ')})`);
            }
        }
        // 8k. Market Regime change
        if (indicators.marketRegime && typeof indicators.marketRegime === 'object') {
            const mr = indicators.marketRegime;
            if (mr.regime === 'trending') {
                conditions.push(`Market regime shifts from trending to choppy (unfavorable for trading)`);
            }
        }
        // 8l. MACD Divergence failure
        if (indicators.macdDivergence?.divergence) {
            const divLower = indicators.macdDivergence.divergence.toLowerCase();
            if (divLower.includes('bullish')) {
                conditions.push(`MACD bullish divergence fails to materialize (divergence invalidated)`);
            }
        }
        // 8m. RSI Divergence failure
        if (indicators.rsiDivergence?.divergence) {
            const divLower = indicators.rsiDivergence.divergence.toLowerCase();
            if (divLower.includes('bullish')) {
                conditions.push(`RSI bullish divergence fails to confirm (divergence invalidated)`);
            }
        }
        // 8n. MACD signal line crossover reversal
        if (macd && macd.macd !== undefined && macd.signal !== undefined) {
            if (macd.macd > macd.signal) {
                conditions.push(`MACD line crosses below Signal line (from ${macd.macd.toFixed(4)} > ${macd.signal.toFixed(4)}, bearish crossover)`);
            }
        }
        // 9. Multi-timeframe trend failure
        if (trendAlignment) {
            const dailyTrend = trendAlignment.dailyTrend || trendAlignment.trend;
            if (dailyTrend === 'uptrend') {
                conditions.push(`4H RSI breaks back below 40 (momentum failure)`);
            }
            else if (dailyTrend === 'downtrend') {
                conditions.push(`Daily trend confirms downtrend (counter-trend reversal)`);
            }
            const alignmentScore = trendAlignment.alignmentScore || 0;
            if (alignmentScore < 20) {
                conditions.push(`Trend alignment drops below 20% (momentum failure)`);
            }
        }
        // 10. Volume conditions - align with justification and current volume trend
        if (indicators.volumeChangePercent !== undefined) {
            const volChange = indicators.volumeChangePercent;
            if (volChange < 0) {
                // Volume is decreasing (currently -50% for example)
                const currentVolDrop = Math.abs(volChange);
                if (currentVolDrop < 50) {
                    conditions.push(`Volume drops further below 50% of average (currently ${volChange.toFixed(2)}%, bearish)`);
                }
                else {
                    conditions.push(`Volume continues dropping (currently ${volChange.toFixed(2)}%, already below 50%)`);
                }
            }
            else if (volChange > 0) {
                // Volume is increasing (supporting BUY)
                // Check if it reverses to decreasing (bearish)
                if (volChange > 50) {
                    conditions.push(`Volume trend reverses to decreasing (from +${volChange.toFixed(2)}%, bearish)`);
                }
                else {
                    conditions.push(`Volume trend reverses to decreasing (from +${volChange.toFixed(2)}%, bearish) OR Volume spike fails to continue (below 50%)`);
                }
            }
        }
        if (indicators.volumeTrend === 'increasing') {
            conditions.push(`Volume trend reverses to decreasing (from increasing, bearish)`);
        }
        else if (indicators.volumeTrend === 'decreasing') {
            conditions.push(`Volume trend continues decreasing (bearish)`);
        }
        // 11. Volume-Price Divergence
        if (indicators.volumePriceDivergence !== undefined) {
            if (indicators.volumePriceDivergence > -0.5) {
                conditions.push(`Volume-price divergence becomes bearish (from ${indicators.volumePriceDivergence.toFixed(2)}, price rising but volume decreasing)`);
            }
        }
        // 12. Funding Rate reversal
        if (externalData?.hyperliquid?.fundingRate !== undefined && externalData.hyperliquid.fundingRate < 0) {
            conditions.push(`Funding rate turns positive (from ${(externalData.hyperliquid.fundingRate * 100).toFixed(4)}%, bearish)`);
        }
        // 13. Premium to Oracle reversal
        if (externalData?.hyperliquid?.premium !== undefined && externalData.hyperliquid.premium < 0) {
            conditions.push(`Premium to oracle turns positive (from ${(externalData.hyperliquid.premium * 100).toFixed(4)}%, overvalued)`);
        }
        // 14. Whale Activity reversal
        if (externalData?.blockchain?.whaleActivityScore !== undefined && externalData.blockchain.whaleActivityScore > 0) {
            conditions.push(`Whale activity turns bearish (from +${externalData.blockchain.whaleActivityScore.toFixed(2)}, bearish pressure)`);
        }
        // 15. Order Book Imbalance reversal
        if (externalData?.orderBook?.imbalance !== undefined && externalData.orderBook.imbalance > 0.1) {
            conditions.push(`Order book imbalance turns bearish (from +${(externalData.orderBook.imbalance * 100).toFixed(2)}%, more asks than bids)`);
        }
        // 16. CVD Trend reversal
        if (externalData?.volumeDelta?.cvdTrend === 'rising') {
            conditions.push(`CVD trend reverses to falling (from rising, bearish)`);
        }
        // 17. Change of Character reversal
        if (externalData?.marketStructure?.coc?.coc === 'bullish') {
            conditions.push(`Change of Character reverses to bearish (from bullish, trend reversal)`);
        }
        // 18. Exchange Flow reversal
        if (externalData?.blockchain?.estimatedExchangeFlow !== undefined && externalData.blockchain.estimatedExchangeFlow < 0) {
            conditions.push(`Exchange flow reverses to inflow (from outflow $${Math.abs(externalData.blockchain.estimatedExchangeFlow / 1000000).toFixed(2)}M, bearish pressure)`);
        }
        // 19. ATR volatility increase
        // CRITICAL FIX: Fix division by zero and incorrect parentheses in ATR calculation
        if (indicators.atr !== undefined && price > 0) {
            const atr = (indicators.atr && indicators.atr !== null) ? indicators.atr : 0;
            const atrPercent = atr > 0 ? (atr / price) * 100 : 0;
            if (atrPercent < 1.5) {
                conditions.push(`ATR volatility increases above 2% (from ${atrPercent.toFixed(2)}%, whipsaw risk)`);
            }
        }
        // 20. Reference related assets
        if (signal.coin !== 'BTC' && marketData) {
            const btcData = marketData instanceof Map ? marketData.get('BTC') : marketData['BTC'];
            if (btcData && btcData.price) {
                const btcPrice = btcData.price;
                const btcSupport = btcPrice * 0.97; // 3% below current
                conditions.push(`BTC breaks below $${Math.round(btcSupport / 1000) * 1000} (deeper market correction)`);
            }
        }
    }
    else if (signalType === 'sell_to_enter') {
        // For SELL signals: Comprehensive invalidation based on ALL indicators
        // 1. RSI conditions
        if (rsi14 !== null && rsi14 !== undefined) {
            if (rsi14 < 30) {
                conditions.push(`RSI(14) ${rsi14.toFixed(2)} breaks back above ${Math.min(35, Math.ceil(rsi14 + 5))} (momentum failure)`);
            }
            else if (rsi14 > 50) {
                conditions.push(`RSI(14) breaks back above ${Math.min(70, Math.ceil(rsi14 + 10))} (momentum failure)`);
            }
            else {
                conditions.push(`RSI(14) breaks above 50 (momentum failure)`);
            }
        }
        if (indicators.rsi7 !== null && indicators.rsi7 !== undefined) {
            if (indicators.rsi7 < 30) {
                conditions.push(`RSI(7) ${indicators.rsi7.toFixed(2)} breaks back above 35 (momentum failure)`);
            }
        }
        // 2. MACD histogram reversal
        if (macd && macd.histogram !== null && macd.histogram !== undefined) {
            if (macd.histogram < 0) {
                conditions.push(`MACD histogram turns positive (from ${macd.histogram.toFixed(4)}, bullish momentum)`);
            }
            else {
                conditions.push(`MACD histogram fails to decline below 0 (remains +${macd.histogram.toFixed(4)})`);
            }
        }
        // 3. OBV reversal
        if (indicators.obv !== undefined && indicators.obv !== null && indicators.obv < 0) {
            conditions.push(`OBV turns positive (from ${indicators.obv.toFixed(2)}, buying pressure)`);
        }
        // 4. Price level conditions
        if (resistanceLevels.length > 0) {
            resistanceLevels.forEach((resistance) => {
                if (resistance > price && resistance > 0) {
                    conditions.push(`Price breaks above $${resistance.toFixed(2)} (resistance level)`);
                }
            });
        }
        if (stopLoss && stopLoss > 0) {
            conditions.push(`Price breaks above $${stopLoss.toFixed(2)} (stop loss level)`);
        }
        // 5. Bollinger Bands condition
        if (bollingerBands) {
            if (bollingerBands.upper && price < bollingerBands.upper) {
                conditions.push(`Price breaks above $${bollingerBands.upper.toFixed(2)} (BB upper band)`);
            }
            if (bollingerBands.middle && price < bollingerBands.middle) {
                conditions.push(`Price breaks above $${bollingerBands.middle.toFixed(2)} (BB middle, bullish)`);
            }
        }
        // 6. Parabolic SAR reversal
        if (indicators.parabolicSAR && price < indicators.parabolicSAR) {
            conditions.push(`Price breaks above Parabolic SAR $${indicators.parabolicSAR.toFixed(2)} (bullish reversal)`);
        }
        // 7. VWAP break
        if (indicators.vwap && price < indicators.vwap) {
            conditions.push(`Price breaks above VWAP $${indicators.vwap.toFixed(2)} (bullish)`);
        }
        // 8. Aroon reversal
        if (indicators.aroon) {
            if (indicators.aroon.down > indicators.aroon.up) {
                conditions.push(`Aroon Up exceeds Down (from Down ${indicators.aroon.down.toFixed(2)} > Up ${indicators.aroon.up.toFixed(2)}, bullish trend)`);
            }
        }
        // 8a. EMA8 cross invalidation (momentum failure)
        if (indicators.ema8 !== null && indicators.ema8 !== undefined && price < indicators.ema8) {
            conditions.push(`Price breaks above EMA8 $${indicators.ema8.toFixed(2)} (momentum failure)`);
        }
        // 8b. EMA20/EMA50/EMA200 break (EMA alignment breakdown)
        if (indicators.ema20 && price < indicators.ema20) {
            conditions.push(`Price breaks above EMA20 $${indicators.ema20.toFixed(2)} (trend breakdown)`);
        }
        if (indicators.ema50 && price < indicators.ema50) {
            conditions.push(`Price breaks above EMA50 $${indicators.ema50.toFixed(2)} (major trend breakdown)`);
        }
        if (indicators.ema200 && price < indicators.ema200) {
            conditions.push(`Price breaks above EMA200 $${indicators.ema200.toFixed(2)} (major downtrend breakdown)`);
        }
        // 8c. ADX drop (trend weakening) - helper function for safe extraction
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
        if (adxValue !== null && adxValue > 20) {
            conditions.push(`ADX drops below 20 (from ${adxValue.toFixed(2)}, trend weakening)`);
        }
        // 8d. plusDI/minusDI reversal (directional movement reversal)
        if (indicators.plusDI !== null && indicators.plusDI !== undefined &&
            indicators.minusDI !== null && indicators.minusDI !== undefined) {
            if (indicators.minusDI > indicators.plusDI) {
                conditions.push(`+DI exceeds -DI (from -DI ${indicators.minusDI.toFixed(2)} > +DI ${indicators.plusDI.toFixed(2)}, bullish trend reversal)`);
            }
        }
        // 8e. Stochastic reversal
        if (indicators.stochastic?.k !== undefined && indicators.stochastic.k !== null) {
            const stochK = indicators.stochastic.k;
            if (stochK > 20) {
                conditions.push(`Stochastic K reverses from oversold zone (from ${stochK.toFixed(2)}, momentum failure)`);
            }
            else if (stochK < 80) {
                conditions.push(`Stochastic K exits overbought zone (from ${stochK.toFixed(2)}, momentum failure)`);
            }
        }
        // 8f. CCI reversal
        if (indicators.cci !== undefined && indicators.cci !== null) {
            if (indicators.cci < -100) {
                conditions.push(`CCI exits oversold zone (from ${indicators.cci.toFixed(2)} to above -100, momentum failure)`);
            }
            else if (indicators.cci > 100) {
                conditions.push(`CCI exits overbought zone (from ${indicators.cci.toFixed(2)} to below 100, momentum failure)`);
            }
        }
        // 8g. Williams %R reversal
        if (indicators.williamsR !== undefined && indicators.williamsR !== null) {
            if (indicators.williamsR < -80) {
                conditions.push(`Williams %R exits oversold zone (from ${indicators.williamsR.toFixed(2)} to above -80, momentum failure)`);
            }
            else if (indicators.williamsR > -20) {
                conditions.push(`Williams %R exits overbought zone (from ${indicators.williamsR.toFixed(2)} to below -20, momentum failure)`);
            }
        }
        // 8h. Fibonacci level break
        if (indicators.fibonacciRetracement && typeof indicators.fibonacciRetracement === 'object') {
            const fib = indicators.fibonacciRetracement;
            if (fib.nearestLevelPrice !== null && fib.nearestLevelPrice !== undefined &&
                fib.isNearLevel &&
                typeof fib.nearestLevelPrice === 'number' &&
                !isNaN(fib.nearestLevelPrice)) {
                if (fib.nearestLevel === '38.2%' || fib.nearestLevel === '50%' || fib.nearestLevel === '61.8%') {
                    conditions.push(`Price breaks above Fibonacci ${fib.nearestLevel} level $${fib.nearestLevelPrice.toFixed(2)} (resistance break)`);
                }
            }
        }
        // 8i. Market Structure breakdown
        if (indicators.marketStructure && typeof indicators.marketStructure === 'object') {
            const ms = indicators.marketStructure;
            if (ms.lowerHighs && ms.lowerLows) {
                conditions.push(`Market structure breaks: Lower highs/lower lows sequence breaks (structure breakdown)`);
            }
        }
        // 8j. Candlestick pattern failure
        if (indicators.candlestickPatterns &&
            indicators.candlestickPatterns.patterns &&
            Array.isArray(indicators.candlestickPatterns.patterns) &&
            indicators.candlestickPatterns.patterns.length > 0) {
            const patterns = indicators.candlestickPatterns.patterns;
            // Pattern types: 'doji', 'hammer', 'bullish_engulfing', 'bearish_engulfing'
            const bearishPatterns = patterns.filter((p) => p.type && (p.type === 'bearish_engulfing' ||
                (p.type === 'doji' && p.bullish === false)));
            if (bearishPatterns.length > 0) {
                conditions.push(`Bearish candlestick pattern fails to confirm (${bearishPatterns.map((p) => p.type).join(', ')})`);
            }
        }
        // 8k. Market Regime change
        if (indicators.marketRegime && typeof indicators.marketRegime === 'object') {
            const mr = indicators.marketRegime;
            if (mr.regime === 'trending') {
                conditions.push(`Market regime shifts from trending to choppy (unfavorable for trading)`);
            }
        }
        // 8l. MACD Divergence failure
        if (indicators.macdDivergence?.divergence) {
            const divLower = indicators.macdDivergence.divergence.toLowerCase();
            if (divLower.includes('bearish')) {
                conditions.push(`MACD bearish divergence fails to materialize (divergence invalidated)`);
            }
        }
        // 8m. RSI Divergence failure
        if (indicators.rsiDivergence?.divergence) {
            const divLower = indicators.rsiDivergence.divergence.toLowerCase();
            if (divLower.includes('bearish')) {
                conditions.push(`RSI bearish divergence fails to confirm (divergence invalidated)`);
            }
        }
        // 8n. MACD signal line crossover reversal
        if (macd && macd.macd !== undefined && macd.signal !== undefined) {
            if (macd.macd < macd.signal) {
                conditions.push(`MACD line crosses above Signal line (from ${macd.macd.toFixed(4)} < ${macd.signal.toFixed(4)}, bullish crossover)`);
            }
        }
        // 9. Multi-timeframe trend failure
        if (trendAlignment) {
            const dailyTrend = trendAlignment.dailyTrend || trendAlignment.trend;
            if (dailyTrend === 'downtrend') {
                conditions.push(`4H RSI breaks back above 60 (momentum failure)`);
            }
            else if (dailyTrend === 'uptrend') {
                conditions.push(`Daily trend confirms uptrend (counter-trend reversal)`);
            }
            const alignmentScore = trendAlignment.alignmentScore || 0;
            if (alignmentScore < 20) {
                conditions.push(`Trend alignment drops below 20% (momentum failure)`);
            }
        }
        // 10. Volume conditions - align with justification and current volume trend
        if (indicators.volumeChangePercent !== undefined) {
            const volChange = indicators.volumeChangePercent;
            if (volChange > 0) {
                // Volume is increasing (currently +214% for example)
                const currentVolSpike = volChange;
                if (currentVolSpike < 50) {
                    conditions.push(`Volume continues increasing above 50% of average (currently +${volChange.toFixed(2)}%, bullish)`);
                }
                else if (currentVolSpike > 200) {
                    conditions.push(`Volume spike continues (>200%) with price bounce (currently +${volChange.toFixed(2)}%, accumulation signal)`);
                }
                else {
                    conditions.push(`Volume reverses: drops below 50% of 24h avg (from +${volChange.toFixed(2)}%, bearish)`);
                }
            }
            else if (volChange < 0) {
                // Volume is decreasing (supporting SELL)
                // Check if it reverses to increasing (bullish)
                if (volChange < -50) {
                    conditions.push(`Volume trend reverses to increasing (from ${volChange.toFixed(2)}%, bullish)`);
                }
                else {
                    conditions.push(`Volume trend reverses to increasing (from ${volChange.toFixed(2)}%, bullish) OR Volume continues dropping`);
                }
            }
        }
        if (indicators.volumeTrend === 'decreasing') {
            conditions.push(`Volume trend reverses to increasing (from decreasing, bullish)`);
        }
        else if (indicators.volumeTrend === 'increasing') {
            conditions.push(`Volume trend continues increasing (bullish - CONTRADICTS SELL)`);
        }
        // 11. Volume-Price Divergence
        if (indicators.volumePriceDivergence !== undefined) {
            if (indicators.volumePriceDivergence < 0.5) {
                conditions.push(`Volume-price divergence becomes bullish (from ${indicators.volumePriceDivergence.toFixed(2)}, price falling but volume increasing)`);
            }
        }
        // 12. Funding Rate reversal
        if (externalData?.hyperliquid?.fundingRate !== undefined && externalData.hyperliquid.fundingRate > 0) {
            conditions.push(`Funding rate turns negative (from +${(externalData.hyperliquid.fundingRate * 100).toFixed(4)}%, bullish)`);
        }
        // 13. Premium to Oracle reversal
        if (externalData?.hyperliquid?.premium !== undefined && externalData.hyperliquid.premium > 0) {
            conditions.push(`Premium to oracle turns negative (from +${(externalData.hyperliquid.premium * 100).toFixed(4)}%, undervalued)`);
        }
        // 14. Whale Activity reversal
        if (externalData?.blockchain?.whaleActivityScore !== undefined && externalData.blockchain.whaleActivityScore < 0) {
            conditions.push(`Whale activity turns bullish (from ${externalData.blockchain.whaleActivityScore.toFixed(2)}, bullish pressure)`);
        }
        // 15. Order Book Imbalance reversal
        if (externalData?.orderBook?.imbalance !== undefined && externalData.orderBook.imbalance < -0.1) {
            conditions.push(`Order book imbalance turns bullish (from ${(externalData.orderBook.imbalance * 100).toFixed(2)}%, more bids than asks)`);
        }
        // 16. CVD Trend reversal
        if (externalData?.volumeDelta?.cvdTrend === 'falling') {
            conditions.push(`CVD trend reverses to rising (from falling, bullish)`);
        }
        // 17. Change of Character reversal
        if (externalData?.marketStructure?.coc?.coc === 'bearish') {
            conditions.push(`Change of Character reverses to bullish (from bearish, trend reversal)`);
        }
        // 18. Exchange Flow reversal
        if (externalData?.blockchain?.estimatedExchangeFlow !== undefined && externalData.blockchain.estimatedExchangeFlow > 0) {
            conditions.push(`Exchange flow reverses to outflow (from inflow $${(externalData.blockchain.estimatedExchangeFlow / 1000000).toFixed(2)}M, bullish pressure)`);
        }
        // 19. ATR volatility increase
        // CRITICAL FIX: Fix division by zero and incorrect parentheses in ATR calculation
        if (indicators.atr !== undefined && price > 0) {
            const atr = (indicators.atr && indicators.atr !== null) ? indicators.atr : 0;
            const atrPercent = atr > 0 ? (atr / price) * 100 : 0;
            if (atrPercent < 1.5) {
                conditions.push(`ATR volatility increases above 2% (from ${atrPercent.toFixed(2)}%, whipsaw risk)`);
            }
        }
        // 20. Reference related assets
        if (signal.coin !== 'BTC' && marketData) {
            const btcData = marketData instanceof Map ? marketData.get('BTC') : marketData['BTC'];
            if (btcData && btcData.price) {
                const btcPrice = btcData.price;
                const btcResistance = btcPrice * 1.03; // 3% above current
                conditions.push(`BTC breaks above $${Math.round(btcResistance / 1000) * 1000} (stronger market rally)`);
            }
        }
    }
    // Format conditions as a single string with "OR" separator
    if (conditions.length === 0) {
        return `Price breaks key support/resistance OR main indicator reverses`;
    }
    // Return up to 5 most critical conditions (limit to avoid overwhelming output)
    const criticalConditions = conditions.slice(0, 5);
    return criticalConditions.join(' OR ');
}
