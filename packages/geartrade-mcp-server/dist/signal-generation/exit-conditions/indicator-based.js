/**
 * Indicator-Based Exit Condition Checker
 * Check exit conditions based on technical indicators
 */
export function checkIndicatorBasedExit(position, marketData, config) {
    if (!config.enabled) {
        return null;
    }
    if (!marketData || !marketData.indicators) {
        return null;
    }
    const indicators = marketData.indicators;
    const exitConditions = [];
    // RSI reversal check
    if (indicators.rsi14 != null) {
        const rsi = indicators.rsi14;
        if (position.side === 'LONG' && rsi >= config.rsiThreshold) {
            exitConditions.push({
                indicator: 'RSI',
                reason: `RSI (${rsi.toFixed(2)}) >= ${config.rsiThreshold} (overbought)`
            });
        }
        else if (position.side === 'SHORT' && rsi <= (100 - config.rsiThreshold)) {
            exitConditions.push({
                indicator: 'RSI',
                reason: `RSI (${rsi.toFixed(2)}) <= ${100 - config.rsiThreshold} (oversold)`
            });
        }
    }
    // MACD crossover check (REQUIRES CONFIRMATION - don't exit only on MACD)
    // MACD is lagging indicator, prone to false signals in choppy/sideways market
    if (config.macdCrossover && indicators.macd != null) {
        const macd = indicators.macd;
        const macdLine = macd.MACD || macd.macd || 0;
        const signalLine = macd.signal || 0;
        const histogram = macd.histogram || (macdLine - signalLine);
        // Check for MACD crossover
        const macdBearishCross = position.side === 'LONG' && macdLine < signalLine;
        const macdBullishCross = position.side === 'SHORT' && macdLine > signalLine;
        if (macdBearishCross || macdBullishCross) {
            // CRITICAL FIX: MACD requires confirmation from other indicators
            // Don't exit ONLY on MACD cross - need at least ONE of:
            // 1. RSI overbought/oversold (strong momentum reversal)
            // 2. Price breaks EMA20/EMA50 (trend reversal)
            // 3. Volume drops significantly (loss of momentum)
            let macdConfirmation = false;
            const confirmations = [];
            // Confirmation 1: RSI overbought/oversold
            if (indicators.rsi14 != null) {
                const rsi = indicators.rsi14;
                if (position.side === 'LONG' && rsi >= 70) {
                    macdConfirmation = true;
                    confirmations.push(`RSI ${rsi.toFixed(1)} (overbought)`);
                }
                else if (position.side === 'SHORT' && rsi <= 30) {
                    macdConfirmation = true;
                    confirmations.push(`RSI ${rsi.toFixed(1)} (oversold)`);
                }
            }
            // Confirmation 2: Price breaks EMA
            if (marketData.price) {
                const price = marketData.price;
                if (position.side === 'LONG' && indicators.ema20 != null && price < indicators.ema20) {
                    macdConfirmation = true;
                    confirmations.push(`Price broke EMA20`);
                }
                else if (position.side === 'SHORT' && indicators.ema20 != null && price > indicators.ema20) {
                    macdConfirmation = true;
                    confirmations.push(`Price broke EMA20`);
                }
            }
            // Confirmation 3: Histogram shows strong momentum (for additional confirmation)
            if (Math.abs(histogram) > Math.abs(macdLine) * 0.3) {
                // Strong histogram divergence from MACD line
                confirmations.push(`Strong histogram divergence`);
            }
            // Only exit if MACD cross + at least ONE confirmation
            if (macdConfirmation || confirmations.length >= 1) {
                const confirmText = confirmations.length > 0 ? ` + ${confirmations.join(', ')}` : '';
                exitConditions.push({
                    indicator: 'MACD',
                    reason: `MACD (${macdLine.toFixed(4)}) crossed ${position.side === 'LONG' ? 'below' : 'above'} signal (${signalLine.toFixed(4)})${confirmText} - reversal confirmed`
                });
            }
            else {
                console.log(`\x1b[36m⚠️  MACD ${position.side === 'LONG' ? 'bearish' : 'bullish'} cross detected for ${position.symbol}, but no confirmation - ignoring (lagging indicator)\x1b[0m`);
            }
        }
    }
    // EMA break check (use multiple EMAs for confirmation)
    if (config.emaBreak && marketData.price) {
        const price = marketData.price;
        const ema20 = indicators.ema20;
        const ema50 = indicators.ema50;
        // Check EMA20 break (more sensitive, immediate exit)
        if (position.side === 'LONG' && ema20 != null && price < ema20) {
            exitConditions.push({
                indicator: 'EMA20',
                reason: `Price (${price.toFixed(4)}) broke below EMA20 (${ema20.toFixed(4)}) - trend reversal`
            });
        }
        else if (position.side === 'SHORT' && ema20 != null && price > ema20) {
            exitConditions.push({
                indicator: 'EMA20',
                reason: `Price (${price.toFixed(4)}) broke above EMA20 (${ema20.toFixed(4)}) - trend reversal`
            });
        }
        // Check EMA50 break (stronger confirmation, major trend reversal)
        if (position.side === 'LONG' && ema50 != null && price < ema50) {
            exitConditions.push({
                indicator: 'EMA50',
                reason: `Price (${price.toFixed(4)}) broke below EMA50 (${ema50.toFixed(4)}) - major trend reversal`
            });
        }
        else if (position.side === 'SHORT' && ema50 != null && price > ema50) {
            exitConditions.push({
                indicator: 'EMA50',
                reason: `Price (${price.toFixed(4)}) broke above EMA50 (${ema50.toFixed(4)}) - major trend reversal`
            });
        }
    }
    // Support/Resistance break check
    if (config.supportResistanceBreak && marketData.externalData?.marketStructure) {
        const structure = marketData.externalData.marketStructure;
        // const price = marketData.price
        // Check support break for LONG
        if (position.side === 'LONG' && structure.coc?.coc === 'bearish') {
            exitConditions.push({
                indicator: 'SUPPORT_RESISTANCE',
                reason: 'Support level broken (bearish structure change)'
            });
        }
        // Check resistance break for SHORT
        else if (position.side === 'SHORT' && structure.coc?.coc === 'bullish') {
            exitConditions.push({
                indicator: 'SUPPORT_RESISTANCE',
                reason: 'Resistance level broken (bullish structure change)'
            });
        }
    }
    // ATR expansion check (extreme volatility)
    if (config.atrExpansion && indicators.atr != null && marketData.price) {
        const atr = indicators.atr;
        const price = marketData.price;
        const atrPct = (atr / price) * 100;
        // Calculate average ATR from historical data
        if (marketData.historicalData && marketData.historicalData.length >= 14) {
            let avgATR = 0;
            const historicalLen = marketData.historicalData.length;
            for (let i = 1; i < Math.min(14, historicalLen); i++) {
                const high = marketData.historicalData[historicalLen - i].high;
                const low = marketData.historicalData[historicalLen - i].low;
                avgATR += (high - low) / price;
            }
            avgATR = (avgATR / Math.min(14, historicalLen - 1)) * 100;
            const atrExpansion = atrPct / avgATR;
            if (atrExpansion >= config.atrExpansionThreshold) {
                exitConditions.push({
                    indicator: 'ATR',
                    reason: `Extreme ATR expansion (${atrExpansion.toFixed(2)}x average)`
                });
            }
        }
    }
    // Decision logic
    if (exitConditions.length === 0) {
        return null;
    }
    // With requireConfirmation=false, exit on single indicator (default)
    // With requireConfirmation=true, need 2+ indicators
    const shouldExit = config.requireConfirmation
        ? exitConditions.length >= 2 // Exit only if multiple indicators agree
        : exitConditions.length >= 1; // Default: exit on any indicator
    if (!shouldExit) {
        return null;
    }
    const indicatorsList = exitConditions.map(ec => ec.indicator).join(', ');
    const reasonsList = exitConditions.map(ec => ec.reason).join('; ');
    // Log indicator-based exit detection
    console.log(`\x1b[33m📊 INDICATOR EXIT DETECTED for ${position.symbol}: ${indicatorsList} - ${reasonsList}\x1b[0m`);
    return {
        reason: 'INDICATOR_BASED',
        priority: 3, // Higher priority: after stop loss (2) and take profit (3), but before trailing stop (4)
        shouldExit: true,
        exitSize: 100, // Full exit
        exitPrice: marketData.price || position.currentPrice, // Use current market price
        metadata: {
            indicators: indicatorsList,
            exitConditions: exitConditions.map(ec => ec.indicator),
            strict: config.strict,
            requireConfirmation: config.requireConfirmation
        },
        timestamp: Date.now(),
        description: `Indicator-based exit: ${reasonsList}`
    };
}
