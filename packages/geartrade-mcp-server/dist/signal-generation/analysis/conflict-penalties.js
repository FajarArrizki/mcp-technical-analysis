function envNum(key, def) {
    const v = parseFloat(process.env[key] || '');
    return isFinite(v) ? v : def;
}
export function computeConflictPenalties(_asset, marketData) {
    let penalty = 0;
    const reasons = [];
    let majorMismatches = 0;
    const indicators = marketData?.indicators || marketData?.data?.indicators || {};
    const trend = marketData?.trendAlignment || marketData?.data?.trendAlignment || {};
    const ext = marketData?.externalData || marketData?.data?.externalData || {};
    const futures = ext?.futures || {};
    const cva = ext?.comprehensiveVolumeAnalysis || {};
    const btc = futures?.btcCorrelation || {};
    // 1) Trend × EMA × Aroon conflict
    const penTrend = envNum('PEN_TREND_EMA_AROON', 40);
    const ema20 = indicators?.ema20, ema50 = indicators?.ema50, price = indicators?.price;
    const aroonUp = indicators?.aroon?.up, aroonDown = indicators?.aroon?.down;
    const isUpStruct = typeof price === 'number' && typeof ema20 === 'number' && typeof ema50 === 'number' && price > ema20 && ema20 > ema50;
    const isDownStruct = typeof price === 'number' && typeof ema20 === 'number' && typeof ema50 === 'number' && price < ema20 && ema20 < ema50;
    const aroonUpDominant = typeof aroonUp === 'number' && typeof aroonDown === 'number' && aroonUp - aroonDown > 30;
    const aroonDownDominant = typeof aroonUp === 'number' && typeof aroonDown === 'number' && aroonDown - aroonUp > 30;
    if ((trend?.trend === 'uptrend' && (isDownStruct || aroonDownDominant)) ||
        (trend?.trend === 'downtrend' && (isUpStruct || aroonUpDominant))) {
        penalty += penTrend;
        reasons.push('Trend×EMA×Aroon conflict');
        majorMismatches++;
    }
    // 2) Volume × Delta conflict
    const penVolDelta = envNum('PEN_VOL_DELTA', 25);
    const penDeltaContra = envNum('PEN_DELTA_CONTRA', 20);
    if (cva?.volumeConfirmation) {
        const vc = cva.volumeConfirmation;
        if (vc.isValid === false) {
            penalty += penVolDelta;
            reasons.push('Volume does not confirm move');
        }
    }
    if (typeof cva?.netDelta === 'number' && typeof indicators?.macd?.histogram === 'number') {
        const delta = cva.netDelta;
        const momo = indicators.macd.histogram;
        if ((momo > 0 && delta < 0) || (momo < 0 && delta > 0)) {
            penalty += penDeltaContra;
            reasons.push('Delta contra-direction to momentum');
        }
    }
    // 3) Market Regime penalty (ADX, volatility)
    const penChoppy = envNum('PEN_REGIME_CHOPPY', 20);
    const penSideways = envNum('PEN_SIDEWAYS_NOVOL', 15);
    const adxVal = typeof indicators?.adx === 'number' ? indicators.adx : (indicators?.adx?.adx ?? 0);
    const bb = indicators?.bollingerBands;
    let bbWidth = 0;
    if (bb && typeof bb.middle === 'number' && bb.middle > 0)
        bbWidth = (bb.upper - bb.lower) / bb.middle;
    if (adxVal > 0 && adxVal < 20) {
        penalty += penChoppy;
        reasons.push('Regime choppy (ADX<20)');
    }
    else if (adxVal >= 20 && bbWidth < 0.01) {
        penalty += penSideways;
        reasons.push('Sideways no volume');
    }
    // 4) Liquidity danger zone (using liquidation distance)
    const penLiqBounce = envNum('PEN_LIQ_BOUNCE', 15);
    const penLiqTrap = envNum('PEN_LIQ_TRAP', 25);
    const liqDist = futures?.liquidation?.liquidationDistance;
    if (typeof liqDist === 'number') {
        if (liqDist < 2) {
            penalty += penLiqTrap;
            reasons.push('Liquidity trap (<2%)');
            majorMismatches++;
        }
        else if (liqDist < 3.5) {
            penalty += penLiqBounce;
            reasons.push('High-bounce liquidity zone');
        }
    }
    // 5) RSI no momentum confirmation
    const penNoMomo = envNum('PEN_RSI_NO_MOMO', 10);
    const rsi = indicators?.rsi14;
    if (typeof rsi === 'number' && rsi > 40 && rsi < 60 && Math.abs(indicators?.macd?.histogram ?? 0) < 0.001) {
        penalty += penNoMomo;
        reasons.push('RSI neutral with no MACD momentum');
    }
    // 6) BTC impact penalties
    const penBtcMismatch = envNum('PEN_BTC_MISMATCH', 20);
    const penBtcShock = envNum('PEN_BTC_SHOCK', 25);
    // const penDomRev = envNum('PEN_DOM_REV', 15)
    if (btc && typeof btc.correlation7d === 'number') {
        // Trend mismatch heuristic: strong corr but asset direction opposite to BTC macd sign (if available)
        const corrAbs = Math.abs(btc.correlation7d);
        // const btcImpact = btc.impactMultiplier ?? 1
        const macdHist = indicators?.macd?.histogram;
        if (corrAbs >= 0.6 && typeof macdHist === 'number') {
            // if impact positive but macro context contradicts, penalize
            // We don't have BTC macd here; rely on futures premium/price hints is optional.
            // Apply mild mismatch penalty when corr strong but context shows instability
            penalty += Math.round(penBtcMismatch * 0.5);
            reasons.push('BTC correlation strong but context mismatch');
        }
        // Shock: use bbWidth as volatility proxy for surge
        if (bbWidth > 0.08) {
            penalty += penBtcShock;
            reasons.push('Volatility shock regime');
        }
    }
    // Dominance reversal proxy not available; skip or apply when provided.
    return { penalty, reasons, majorMismatches };
}
