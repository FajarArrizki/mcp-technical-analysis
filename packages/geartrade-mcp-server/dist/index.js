/**
 * GearTrade MCP Server
 * Exposes trading functionality via Model Context Protocol using Nullshot MCP SDK
 * Local development server only
 */
// Load environment variables from .env file
import "dotenv/config";
// Import from Nullshot MCP SDK
import { z } from 'zod';
// Import existing functionality from signal-generation
import { getRealTimePrice, getL2OrderBook } from './signal-generation/data-fetchers/hyperliquid';
import { getLiquidations, getWhalePositions, getLongShortRatio as getHyperscreenerLongShortRatio, getTopGainers, getTopLosers, getLargeTrades, getMarketOverview, getLiquidationHeatmap, getTopTradersRanking, getPlatformStats } from './signal-generation/data-fetchers/hyperscreener';
import { getMarketData } from './signal-generation/data-fetchers/market-data';
import { performComprehensiveVolumeAnalysis, calculateCVD } from './signal-generation/analysis/volume-analysis';
import { calculateStopLoss } from './signal-generation/exit-conditions/stop-loss';
import { calculateDynamicLeverage } from './signal-generation/risk-management/leverage';
import { calculateDynamicMarginPercentage } from './signal-generation/risk-management/margin';
import { calculateFibonacciRetracement } from './signal-generation/technical-indicators/fibonacci';
import { detectChangeOfCharacter } from './signal-generation/analysis/market-structure';
import { detectCandlestickPatterns } from './signal-generation/analysis/candlestick';
import { detectDivergence } from './signal-generation/analysis/divergence';
import { detectMarketRegime } from './signal-generation/analysis/market-regime';
import { getTierByNotional, getTierLabel, classifyPositionsByTier, detectPositionChanges, TRADER_TIERS } from './signal-generation/analysis/tier-classification';
import { getPositionsBySymbol, getWhalePositions as getHyperscreenerWhalePositions } from './signal-generation/data-fetchers/hyperscreener';
import { calculateLiquidationIndicators } from './signal-generation/technical-indicators/liquidation';
import { calculateLongShortRatioIndicators } from './signal-generation/technical-indicators/long-short-ratio';
import { calculateRSI } from './signal-generation/technical-indicators/momentum';
import { checkBounceSetup, checkBouncePersistence } from './signal-generation/analysis/bounce';
import { detectTrend, detectMarketStructure } from './signal-generation/analysis/trend-detection';
import { calculateEnhancedMetrics } from './signal-generation/analysis/enhanced-metrics';
import { performCorrelationAnalysis, fetchBTCDominance, analyzeAltcoinCorrelation } from './signal-generation/technical-indicators/correlation-analysis';
import { getUserState } from './signal-generation/data-fetchers/hyperliquid';
// Import merged tools
import { registerAllMergedTools } from './tools';
// Helper function to format technical indicators
function formatTechnicalIndicators(assetData, price) {
    const indicators = assetData?.indicators || assetData?.data?.indicators || {};
    const trendAlignment = assetData?.data?.trendAlignment || assetData?.trendAlignment;
    const multiTimeframeIndicators = assetData?.data?.multiTimeframeIndicators || assetData?.multiTimeframeIndicators || {};
    const supportResistance = indicators.supportResistance || {};
    const bollingerBands = indicators.bollingerBands || {};
    // Calculate Bollinger Bands position if we have bands and price
    let bbPosition = null;
    if (price && bollingerBands.upper && bollingerBands.lower && bollingerBands.middle) {
        if (price > bollingerBands.upper) {
            bbPosition = 'Above upper (Overbought)';
        }
        else if (price < bollingerBands.lower) {
            bbPosition = 'Below lower (Oversold)';
        }
        else if (price > bollingerBands.middle) {
            bbPosition = 'Above middle (Bullish)';
        }
        else {
            bbPosition = 'Below middle (Bearish)';
        }
    }
    // Calculate 24h change if we have historical data
    let change24h = null;
    let volumeChange24h = null;
    const historicalData = assetData?.historicalData || assetData?.data?.historicalData || [];
    if (historicalData.length >= 24 && price) {
        // Get price 24 hours ago (assuming 1h candles, need 24 candles)
        // Or use last 24 candles if available
        const candles24hAgo = historicalData.length >= 24 ? historicalData[historicalData.length - 24] : null;
        if (candles24hAgo && candles24hAgo.close) {
            const price24hAgo = candles24hAgo.close;
            change24h = ((price - price24hAgo) / price24hAgo) * 100;
        }
        // Calculate volume change
        if (historicalData.length >= 24) {
            const recentVolumes = historicalData.slice(-24).map((c) => c.volume || 0).filter((v) => v > 0);
            const olderVolumes = historicalData.slice(-48, -24).map((c) => c.volume || 0).filter((v) => v > 0);
            if (recentVolumes.length > 0 && olderVolumes.length > 0) {
                const avgRecent = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;
                const avgOlder = olderVolumes.reduce((a, b) => a + b, 0) / olderVolumes.length;
                if (avgOlder > 0) {
                    volumeChange24h = ((avgRecent - avgOlder) / avgOlder) * 100;
                }
            }
        }
    }
    return {
        rsi: {
            rsi14: indicators.rsi14 || null,
            rsi7: indicators.rsi7 || null,
            rsi4h: multiTimeframeIndicators['4h']?.rsi14 || indicators.rsi4h || indicators['4h']?.rsi14 || null,
        },
        ema: {
            ema20: indicators.ema20 || null,
            ema50: indicators.ema50 || null,
        },
        macd: indicators.macd
            ? {
                macd: indicators.macd.macd || indicators.macd.macdLine || null,
                signal: indicators.macd.signal || indicators.macd.signalLine || null,
                histogram: indicators.macd.histogram || null,
            }
            : null,
        bollingerBands: indicators.bollingerBands || (bollingerBands.upper && bollingerBands.lower && bollingerBands.middle)
            ? {
                upper: indicators.bollingerBands?.upper || bollingerBands.upper || null,
                middle: indicators.bollingerBands?.middle || bollingerBands.middle || null,
                lower: indicators.bollingerBands?.lower || bollingerBands.lower || null,
                position: indicators.bollingerBands?.position || bbPosition || null,
            }
            : null,
        atr: indicators.atr || indicators.atr14 || null,
        adx: indicators.adx
            ? {
                adx: indicators.adx.adx || indicators.adx || null,
                plusDI: indicators.adx.plusDI || indicators.plusDI || null,
                minusDI: indicators.adx.minusDI || indicators.minusDI || null,
                trend: indicators.adx.trend || (indicators.adx?.adx > 25 ? 'Strong' : indicators.adx?.adx > 20 ? 'Moderate' : 'Weak') || null,
            }
            : null,
        obv: indicators.obv || null,
        vwap: indicators.vwap || null,
        stochastic: indicators.stochastic
            ? {
                k: indicators.stochastic.k || indicators.stochastic.stochK || null,
                d: indicators.stochastic.d || indicators.stochastic.stochD || null,
            }
            : null,
        cci: indicators.cci || null,
        williamsR: indicators.williamsR || indicators.williamsPercentR || null,
        parabolicSAR: indicators.parabolicSAR
            ? {
                value: typeof indicators.parabolicSAR === 'number' ? indicators.parabolicSAR : indicators.parabolicSAR.value || null,
                trend: indicators.parabolicSAR.trend || (price && indicators.parabolicSAR < price ? 'Bullish' : 'Bearish') || null,
            }
            : null,
        aroon: indicators.aroon
            ? {
                up: indicators.aroon.up || indicators.aroon.aroonUp || null,
                down: indicators.aroon.down || indicators.aroon.aroonDown || null,
                trend: indicators.aroon.trend || (indicators.aroon.up > 70 ? 'Strong Uptrend' : indicators.aroon.down > 70 ? 'Strong Downtrend' : 'Neutral') || null,
            }
            : null,
        support: supportResistance.support || indicators.support || assetData?.support || null,
        resistance: supportResistance.resistance || indicators.resistance || assetData?.resistance || null,
        fibonacci: (() => {
            // Try to get from indicators first
            if (indicators.fibonacci) {
                return {
                    level: indicators.fibonacci.level || null,
                    direction: indicators.fibonacci.direction || null,
                    range: indicators.fibonacci.range || null,
                    keyLevels: indicators.fibonacci.keyLevels || null,
                };
            }
            // Calculate from historical data if available
            if (historicalData.length >= 50 && price) {
                try {
                    const highs = historicalData.map((d) => d.high || d.close);
                    const lows = historicalData.map((d) => d.low || d.close);
                    const closes = historicalData.map((d) => d.close);
                    const fibResult = calculateFibonacciRetracement(closes, 50);
                    if (fibResult) {
                        return {
                            level: fibResult.currentLevel || null,
                            direction: fibResult.direction || null,
                            range: fibResult.range || null,
                            keyLevels: [
                                fibResult.level0,
                                fibResult.level236,
                                fibResult.level382,
                                fibResult.level500,
                                fibResult.level618,
                                fibResult.level786,
                                fibResult.level100,
                                fibResult.level1272,
                                fibResult.level1618,
                                fibResult.level2000,
                            ].filter((v) => v != null),
                        };
                    }
                }
                catch (fibError) {
                    // Fibonacci calculation failed
                }
            }
            return null;
        })(),
        trend: trendAlignment
            ? {
                direction: trendAlignment.dailyTrend || trendAlignment.trend || trendAlignment.direction || null,
                strength: trendAlignment.strength || trendAlignment.alignmentScore ? `${trendAlignment.alignmentScore}/100` : null,
            }
            : null,
        marketStructure: indicators.marketStructure
            ? {
                structure: indicators.marketStructure.structure || indicators.marketStructure || null,
                higherHigh: indicators.marketStructure.higherHigh || false,
                lowerLow: indicators.marketStructure.lowerLow || false,
            }
            : null,
        rsiDivergence: (() => {
            // Try to get from indicators first
            if (indicators.rsiDivergence) {
                if (typeof indicators.rsiDivergence === 'string')
                    return indicators.rsiDivergence;
                if (typeof indicators.rsiDivergence === 'object' && indicators.rsiDivergence.divergence) {
                    return String(indicators.rsiDivergence.divergence);
                }
            }
            // Calculate from historical data if available
            if (historicalData.length >= 20 && price) {
                try {
                    const prices = historicalData.map((d) => d.close || d.price);
                    const rsiValues = prices.map((_p, i) => {
                        if (i < 14)
                            return null;
                        const slice = prices.slice(i - 14, i + 1);
                        return calculateRSI(slice, 14);
                    }).filter((v) => v != null);
                    if (rsiValues.length >= 20) {
                        const divergence = detectDivergence(prices.slice(-rsiValues.length), rsiValues, 20);
                        if (divergence && divergence.divergence) {
                            return String(divergence.divergence);
                        }
                    }
                }
                catch (_divError) {
                    // Divergence calculation failed
                }
            }
            return null;
        })(),
        candlestick: (() => {
            // Try candlestick as string first
            if (indicators.candlestick && typeof indicators.candlestick === 'string') {
                return indicators.candlestick;
            }
            // Try candlestickPattern as string
            if (indicators.candlestickPattern && typeof indicators.candlestickPattern === 'string') {
                return indicators.candlestickPattern;
            }
            // Try candlestickPatterns object with patterns array
            if (indicators.candlestickPatterns) {
                if (typeof indicators.candlestickPatterns === 'string') {
                    return indicators.candlestickPatterns;
                }
                if (typeof indicators.candlestickPatterns === 'object') {
                    // If it's an object with patterns array
                    if (Array.isArray(indicators.candlestickPatterns.patterns)) {
                        const patterns = indicators.candlestickPatterns.patterns
                            .map((p) => (typeof p === 'object' ? p.type || p.pattern : String(p)))
                            .filter((p) => p);
                        return patterns.length > 0 ? patterns.join(', ') : null;
                    }
                    // If it's an object with type property
                    if (indicators.candlestickPatterns.type) {
                        return String(indicators.candlestickPatterns.type);
                    }
                    // If it's an object with pattern property
                    if (indicators.candlestickPatterns.pattern) {
                        return String(indicators.candlestickPatterns.pattern);
                    }
                    // If it's an object with latestPattern
                    if (indicators.candlestickPatterns.latestPattern && typeof indicators.candlestickPatterns.latestPattern === 'object') {
                        return indicators.candlestickPatterns.latestPattern.type || null;
                    }
                }
            }
            // Calculate from historical data if available
            if (historicalData.length >= 5) {
                try {
                    const patterns = detectCandlestickPatterns(historicalData, 5);
                    if (patterns && patterns.patterns && patterns.patterns.length > 0) {
                        const patternTypes = patterns.patterns
                            .map((p) => (typeof p === 'object' ? p.type || p.pattern : String(p)))
                            .filter((p) => p);
                        return patternTypes.length > 0 ? patternTypes.join(', ') : null;
                    }
                    // Get latest pattern from patterns array
                    if (patterns && patterns.patterns && patterns.patterns.length > 0) {
                        const latestPattern = patterns.patterns[patterns.patterns.length - 1];
                        return latestPattern?.type || null;
                    }
                }
                catch (candleError) {
                    // Candlestick calculation failed
                }
            }
            return null;
        })(),
        marketRegime: indicators.marketRegime && typeof indicators.marketRegime === 'object'
            ? indicators.marketRegime.regime || indicators.marketRegime.volatility || String(indicators.marketRegime)
            : indicators.marketRegime || indicators.regime || null,
        correlationCoefficient: indicators.correlationCoefficient
            ? {
                correlation: indicators.correlationCoefficient.correlation || null,
                strength: indicators.correlationCoefficient.strength || null,
                direction: indicators.correlationCoefficient.direction || null,
            }
            : null,
        mcclellanOscillator: indicators.mcclellanOscillator
            ? {
                oscillator: indicators.mcclellanOscillator.oscillator || null,
                signal: indicators.mcclellanOscillator.signal || null,
                ratio: indicators.mcclellanOscillator.ratio || null,
            }
            : null,
        armsIndex: indicators.armsIndex
            ? {
                index: indicators.armsIndex.index || null,
                trin: indicators.armsIndex.trin || null,
                adRatio: indicators.armsIndex.adRatio || null,
            }
            : null,
        bounceAnalysis: (() => {
            // Calculate bounce analysis from historical data
            if (historicalData.length >= 20 && price && indicators) {
                try {
                    const bounceSetup = checkBounceSetup(historicalData, indicators, price);
                    const bouncePersistence = checkBouncePersistence(historicalData, indicators, price);
                    return {
                        setup: bounceSetup || null,
                        persistence: bouncePersistence || null,
                    };
                }
                catch (error) {
                    return null;
                }
            }
            return null;
        })(),
        trendDetection: (() => {
            // Calculate trend detection
            if (historicalData.length >= 20) {
                try {
                    const closes = historicalData.map(d => d.close || d.price || 0);
                    const highs = historicalData.map(d => d.high || d.close || 0);
                    const lows = historicalData.map(d => d.low || d.close || 0);
                    const ema20 = historicalData.map((_, i) => indicators?.ema20 || 0);
                    const ema50 = historicalData.map((_, i) => indicators?.ema50 || 0);
                    const trend = detectTrend(closes, ema20, ema50);
                    const marketStructure = detectMarketStructure(highs, lows, closes);
                    return {
                        trend: trend || null,
                        marketStructure: marketStructure || null,
                    };
                }
                catch (error) {
                    return null;
                }
            }
            return null;
        })(),
        enhancedMetrics: (() => {
            // Calculate enhanced metrics
            if (historicalData.length >= 20 && price) {
                try {
                    const metrics = calculateEnhancedMetrics(historicalData, indicators, price);
                    return metrics || null;
                }
                catch (error) {
                    return null;
                }
            }
            return null;
        })(),
        change24h: change24h !== null ? change24h : (assetData?.change24h || assetData?.data?.change24h || null),
        volumeChange24h: volumeChange24h !== null ? volumeChange24h : (assetData?.volumeChange24h || assetData?.data?.volumeChange24h || null),
    };
}
// Helper function to format volume analysis
function formatVolumeAnalysis(volumeAnalysis, price) {
    if (!volumeAnalysis) {
        return null;
    }
    const footprint = volumeAnalysis.footprint;
    const liquidityZones = volumeAnalysis.liquidityZones || [];
    const volumeProfile = volumeAnalysis.volumeProfile;
    const cvd = volumeAnalysis.cvd;
    const recommendations = volumeAnalysis.recommendations;
    // Find key level (nearest liquidity zone or POC)
    let keyLevel = null;
    let keyLevelDelta = null;
    if (price && liquidityZones.length > 0) {
        // Find nearest zone
        const nearestZone = liquidityZones.reduce((closest, zone) => {
            const zoneCenter = (zone.priceRange[0] + zone.priceRange[1]) / 2;
            const currentDistance = Math.abs(price - zoneCenter);
            const closestDistance = closest ? Math.abs(price - (closest.priceRange[0] + closest.priceRange[1]) / 2) : Infinity;
            return currentDistance < closestDistance ? zone : closest;
        });
        const zoneCenter = (nearestZone.priceRange[0] + nearestZone.priceRange[1]) / 2;
        keyLevel = zoneCenter;
        keyLevelDelta = price - zoneCenter;
    }
    else if (price && volumeProfile?.poc) {
        keyLevel = volumeProfile.poc;
        keyLevelDelta = price - volumeProfile.poc;
    }
    // Format HVN (High Volume Nodes)
    const hvn = volumeProfile?.hvn
        ? volumeProfile.hvn
            .slice(0, 3)
            .map((node) => {
            if (typeof node === 'object' && node !== null) {
                return node.price || (typeof node === 'number' ? node : null);
            }
            return typeof node === 'number' ? node : null;
        })
            .filter((p) => p != null && typeof p === 'number')
        : [];
    // Format LVN (Low Volume Nodes)
    const lvn = volumeProfile?.lvn
        ? volumeProfile.lvn
            .slice(0, 3)
            .map((node) => {
            if (typeof node === 'object' && node !== null) {
                return node.price || (typeof node === 'number' ? node : null);
            }
            return typeof node === 'number' ? node : null;
        })
            .filter((p) => p != null && typeof p === 'number')
        : [];
    // Format top liquidity zones
    const topLiquidityZones = liquidityZones
        .slice(0, 2)
        .map((zone) => ({
        priceRange: `${zone.priceRange[0].toFixed(2)}-${zone.priceRange[1].toFixed(2)}`,
        type: zone.type,
        strength: zone.strength,
    }));
    return {
        buyVolume: footprint?.totalBuyVolume || null,
        sellVolume: footprint?.totalSellVolume || null,
        netDelta: footprint?.netDelta || null,
        buyPressure: footprint?.buyPressure || null,
        sellPressure: footprint?.sellPressure || null,
        dominantSide: footprint?.dominantSide?.toUpperCase() || 'NEUTRAL',
        keyLevel: keyLevel,
        keyLevelDelta: keyLevelDelta,
        poc: volumeProfile?.poc || null,
        vah: volumeProfile?.vah || null,
        val: volumeProfile?.val || null,
        hvn: hvn.length > 0 ? hvn.map((p) => typeof p === 'number' ? p.toFixed(4) : String(p)).join(', ') : null,
        lvn: lvn.length > 0 ? lvn.map((p) => typeof p === 'number' ? p.toFixed(4) : String(p)).join(', ') : null,
        cvdTrend: cvd?.cvdTrend?.toUpperCase() || null,
        cvdDelta: cvd?.cvdDelta || null,
        topLiquidityZones: topLiquidityZones.length > 0 ? topLiquidityZones : null,
        recommendation: recommendations?.action?.toUpperCase() || null,
        confidence: recommendations?.confidence ? Math.round(recommendations.confidence * 100) : null,
        riskLevel: recommendations?.riskLevel?.toUpperCase() || null,
    };
}
// Helper function to format multi-timeframe analysis
function formatMultiTimeframe(assetData) {
    const trendAlignment = assetData?.data?.trendAlignment || assetData?.trendAlignment;
    const multiTimeframeIndicators = assetData?.data?.multiTimeframeIndicators || assetData?.multiTimeframeIndicators || {};
    if (!trendAlignment) {
        return null;
    }
    return {
        dailyTrend: trendAlignment.dailyTrend || 'neutral',
        h4Aligned: trendAlignment.h4Aligned !== undefined ? trendAlignment.h4Aligned : null,
        h1Aligned: trendAlignment.h1Aligned !== undefined ? trendAlignment.h1Aligned : null,
        overall: trendAlignment.aligned ? 'Aligned' : 'Not Aligned',
        score: trendAlignment.alignmentScore !== undefined ? trendAlignment.alignmentScore : null,
        reason: trendAlignment.reason || null,
        // Additional timeframe data if available
        daily: multiTimeframeIndicators['1d'] ? {
            price: multiTimeframeIndicators['1d'].price || null,
            ema20: multiTimeframeIndicators['1d'].ema20 || null,
            ema50: multiTimeframeIndicators['1d'].ema50 || null,
            rsi14: multiTimeframeIndicators['1d'].rsi14 || null,
        } : null,
        h4: multiTimeframeIndicators['4h'] ? {
            price: multiTimeframeIndicators['4h'].price || null,
            ema20: multiTimeframeIndicators['4h'].ema20 || null,
            rsi14: multiTimeframeIndicators['4h'].rsi14 || null,
        } : null,
        h1: multiTimeframeIndicators['1h'] ? {
            price: multiTimeframeIndicators['1h'].price || null,
            ema20: multiTimeframeIndicators['1h'].ema20 || null,
            rsi14: multiTimeframeIndicators['1h'].rsi14 || null,
        } : null,
    };
}
// Helper function to format external data
function formatExternalData(assetData) {
    // Access externalData from assetData (which is result.data from market-data.ts)
    const externalData = assetData?.externalData || assetData?.data?.externalData || {};
    const hyperliquid = externalData.hyperliquid || {};
    const enhanced = externalData.enhanced || {};
    const futures = externalData.futures || {};
    // Get funding rate (from hyperliquid or futures)
    // Handle both number and object types (FundingRateData object has 'current' property)
    let fundingRateRaw = futures.fundingRate || hyperliquid.fundingRate || null;
    let fundingRate = null;
    if (fundingRateRaw !== null && fundingRateRaw !== undefined) {
        if (typeof fundingRateRaw === 'number') {
            fundingRate = isNaN(fundingRateRaw) ? null : fundingRateRaw;
        }
        else if (typeof fundingRateRaw === 'object') {
            // If it's an object (FundingRateData), extract the 'current' value
            fundingRate = fundingRateRaw.current || fundingRateRaw.value || fundingRateRaw.rate || null;
            if (fundingRate !== null && typeof fundingRate !== 'number') {
                fundingRate = parseFloat(String(fundingRate));
                if (isNaN(fundingRate)) {
                    fundingRate = null;
                }
            }
            else if (fundingRate !== null && isNaN(fundingRate)) {
                fundingRate = null;
            }
        }
        else if (typeof fundingRateRaw === 'string') {
            fundingRate = parseFloat(fundingRateRaw);
            if (isNaN(fundingRate)) {
                fundingRate = null;
            }
        }
    }
    const fundingRateTrend = hyperliquid.fundingRateTrend || 'stable';
    // Get open interest (prefer Hyperliquid as primary source, fallback to Binance futures)
    let openInterest = null;
    // Helper function to extract OI value from various formats
    const extractOIValue = (raw) => {
        if (raw === null || raw === undefined)
            return null;
        if (typeof raw === 'number') {
            return isNaN(raw) || !isFinite(raw) ? null : raw;
        }
        if (typeof raw === 'string') {
            const parsed = parseFloat(raw);
            return isNaN(parsed) || !isFinite(parsed) ? null : parsed;
        }
        if (typeof raw === 'object') {
            const val = raw.current || raw.value || raw.amount || raw.oi || null;
            if (val === null)
                return null;
            const parsed = typeof val === 'number' ? val : parseFloat(String(val));
            return isNaN(parsed) || !isFinite(parsed) ? null : parsed;
        }
        return null;
    };
    // Try multiple sources for open interest
    // 1. Direct hyperliquid.openInterest (number from market-data.ts)
    if (hyperliquid.openInterest !== undefined && hyperliquid.openInterest !== null) {
        openInterest = extractOIValue(hyperliquid.openInterest);
    }
    // 2. Try futures.openInterest if hyperliquid failed
    if (openInterest === null && futures.openInterest !== undefined) {
        openInterest = extractOIValue(futures.openInterest);
    }
    // 3. Fallback: try assetData directly (in case externalData path is wrong)
    if (openInterest === null && assetData?.openInterest !== undefined) {
        openInterest = extractOIValue(assetData.openInterest);
    }
    // 4. Try data.openInterest
    if (openInterest === null && assetData?.data?.openInterest !== undefined) {
        openInterest = extractOIValue(assetData.data.openInterest);
    }
    const oiTrend = hyperliquid.oiTrend || 'stable';
    // Get volume trend
    const volumeTrend = enhanced.volumeTrend || assetData?.indicators?.volumeTrend || 'stable';
    // Get volatility
    const volatilityPattern = enhanced.volatilityPattern || 'normal';
    let volatility = 'normal';
    if (volatilityPattern === 'low' || volatilityPattern === 'low_volatility') {
        volatility = 'low';
    }
    else if (volatilityPattern === 'high' || volatilityPattern === 'high_volatility') {
        volatility = 'high';
    }
    else if (volatilityPattern === 'normal' || volatilityPattern === 'normal_volatility') {
        volatility = 'normal';
    }
    // Format funding rate as percentage
    // Only format if fundingRate is a valid number
    let fundingRatePercent = null;
    if (fundingRate !== null && typeof fundingRate === 'number' && !isNaN(fundingRate) && isFinite(fundingRate)) {
        fundingRatePercent = (fundingRate * 100).toFixed(4);
    }
    // Format open interest (if it's a number, format it as string with commas)
    // Accept 0 as valid value (but format only positive values with commas)
    let openInterestFormatted = null;
    if (openInterest !== null && typeof openInterest === 'number' && !isNaN(openInterest) && isFinite(openInterest)) {
        if (openInterest > 0) {
            // Format large numbers with commas
            openInterestFormatted = openInterest.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        }
        else {
            openInterestFormatted = openInterest; // Return 0 as is
        }
    }
    return {
        fundingRate: fundingRatePercent ? `${fundingRatePercent}%` : null,
        fundingRateTrend: fundingRateTrend,
        openInterest: openInterestFormatted,
        openInterestTrend: oiTrend,
        volumeTrend: volumeTrend,
        volatility: volatility,
    };
}
// Helper function to format position data
function formatPosition(position, currentPrice, maeResult) {
    if (!position || !currentPrice) {
        return null;
    }
    const quantity = Math.abs(position.quantity);
    const entryPrice = position.entryPrice;
    const side = position.side || (position.quantity > 0 ? 'LONG' : 'SHORT');
    // Calculate unrealized PnL
    let unrealizedPnl = 0;
    let unrealizedPnlPct = 0;
    if (side === 'LONG') {
        unrealizedPnl = (currentPrice - entryPrice) * quantity;
        unrealizedPnlPct = entryPrice > 0 ? ((currentPrice - entryPrice) / entryPrice) * 100 : 0;
    }
    else {
        unrealizedPnl = (entryPrice - currentPrice) * quantity;
        unrealizedPnlPct = entryPrice > 0 ? ((entryPrice - currentPrice) / entryPrice) * 100 : 0;
    }
    // Calculate PnL based on margin (if leverage is available)
    const leverage = position.leverage || 1;
    const positionValue = entryPrice * quantity;
    const marginUsed = positionValue / leverage;
    const pnlPctOnMargin = marginUsed > 0 ? (unrealizedPnl / marginUsed) * 100 : 0;
    return {
        side,
        quantity,
        entryPrice,
        currentPrice,
        leverage,
        unrealizedPnl,
        unrealizedPnlPct,
        pnlPctOnMargin,
        mae: maeResult?.mae || null,
        worstPrice: maeResult?.worstPrice || null,
        entryTime: position.entryTime || null,
    };
}
// Helper function to format risk management calculations
function formatRiskManagement(entryPrice, side, stopLossPct, takeProfitPct, positionSizeUsd, currentPrice, indicators) {
    // Calculate stop loss
    const stopLossFixed = calculateStopLoss(entryPrice, side, stopLossPct);
    const stopLossFlexible = calculateStopLoss(entryPrice, side, stopLossPct * 0.385); // ~0.69% for 2% default
    // Calculate take profit levels (simplified)
    const takeProfitLevels = null;
    // Calculate main take profit
    const takeProfit = side === 'LONG'
        ? entryPrice * (1 + takeProfitPct / 100)
        : entryPrice * (1 - takeProfitPct / 100);
    // Calculate potential loss/profit
    const quantity = positionSizeUsd / entryPrice;
    let potentialLoss = 0;
    let potentialProfit = 0;
    if (side === 'LONG') {
        potentialLoss = (entryPrice - stopLossFixed) * quantity;
        potentialProfit = (takeProfit - entryPrice) * quantity;
    }
    else {
        potentialLoss = (stopLossFixed - entryPrice) * quantity;
        potentialProfit = (entryPrice - takeProfit) * quantity;
    }
    // Calculate R:R ratio
    const riskRewardRatio = potentialLoss > 0 ? potentialProfit / potentialLoss : 0;
    // Calculate trailing stop if current price is provided
    let trailingStopInfo = null;
    if (currentPrice) {
        // Simple trailing stop calculation
        const trailPercent = 5;
        const activationGain = 1; // Activate after 1% gain
        const gainPct = side === 'LONG'
            ? ((currentPrice - entryPrice) / entryPrice) * 100
            : ((entryPrice - currentPrice) / entryPrice) * 100;
        if (gainPct >= activationGain) {
            const trailingStopPrice = side === 'LONG'
                ? currentPrice * (1 - trailPercent / 100)
                : currentPrice * (1 + trailPercent / 100);
            trailingStopInfo = {
                active: true,
                price: trailingStopPrice,
                trailPercent,
            };
        }
    }
    // Check signal reversal if indicators are provided
    let signalReversalCheck = null;
    if (indicators) {
        // Simple signal reversal check based on RSI and MACD divergence
        const rsi = indicators.rsi14 || indicators.rsi;
        const macdHistogram = indicators.macd?.histogram;
        const shouldReverse = (rsi && rsi > 70 && macdHistogram && macdHistogram < 0) ||
            (rsi && rsi < 30 && macdHistogram && macdHistogram > 0);
        signalReversalCheck = {
            shouldReverse: shouldReverse || false,
            confidence: 0.6,
        };
    }
    return {
        stopLossFixed,
        stopLossFixedPct: stopLossPct,
        stopLossFlexible,
        stopLossFlexiblePct: stopLossPct * 0.385,
        takeProfit,
        takeProfitPct: takeProfitPct,
        takeProfitLevels,
        potentialLoss,
        potentialProfit,
        riskRewardRatio,
        trailingStop: trailingStopInfo,
        signalReversal: signalReversalCheck,
    };
}
// Helper function to format position setup calculations
function formatPositionSetup(ticker, entryPrice, side, positionSizeUsd, leverage, marginPercent, capital, riskPct) {
    const quantity = positionSizeUsd / entryPrice;
    const marginUsed = positionSizeUsd / leverage;
    const positionValue = entryPrice * quantity;
    const capitalAllocated = positionSizeUsd;
    return {
        ticker,
        entryPrice,
        side,
        positionSizeUsd,
        quantity,
        leverage,
        marginPercent,
        marginUsed,
        positionValue,
        capital,
        capitalAllocated,
        capitalAllocatedPct: capital > 0 ? (capitalAllocated / capital) * 100 : 0,
        riskPct,
    };
}
// Helper function to format Fibonacci retracement data
function formatFibonacci(fibonacci) {
    if (!fibonacci)
        return null;
    return {
        levels: {
            level0: fibonacci.level0,
            level236: fibonacci.level236,
            level382: fibonacci.level382,
            level500: fibonacci.level500,
            level618: fibonacci.level618,
            level786: fibonacci.level786,
            level100: fibonacci.level100,
            level1272: fibonacci.level1272,
            level1618: fibonacci.level1618,
            level2000: fibonacci.level2000,
        },
        currentLevel: fibonacci.currentLevel,
        distanceFromLevel: fibonacci.distanceFromLevel,
        isNearLevel: fibonacci.isNearLevel,
        nearestLevel: fibonacci.nearestLevel,
        nearestLevelPrice: fibonacci.nearestLevelPrice,
        swingHigh: fibonacci.swingHigh,
        swingLow: fibonacci.swingLow,
        range: fibonacci.range,
        direction: fibonacci.direction,
        strength: fibonacci.strength,
        signal: fibonacci.signal,
    };
}
// Helper function to format order book depth data
function formatOrderBookDepth(orderBookDepth) {
    if (!orderBookDepth)
        return null;
    return {
        bidPrice: orderBookDepth.bidPrice,
        askPrice: orderBookDepth.askPrice,
        midPrice: orderBookDepth.midPrice,
        spread: orderBookDepth.spread,
        spreadPercent: orderBookDepth.spreadPercent,
        bidDepth: orderBookDepth.bidDepth,
        askDepth: orderBookDepth.askDepth,
        imbalance: orderBookDepth.imbalance,
        supportZones: orderBookDepth.supportZones,
        resistanceZones: orderBookDepth.resistanceZones,
        liquidityScore: orderBookDepth.liquidityScore,
        timestamp: orderBookDepth.timestamp,
    };
}
// Helper function to format volume profile data
function formatVolumeProfile(sessionProfile, compositeProfile) {
    if (!sessionProfile && !compositeProfile)
        return null;
    return {
        session: sessionProfile
            ? {
                poc: sessionProfile.poc,
                vah: sessionProfile.vah,
                val: sessionProfile.val,
                hvn: sessionProfile.hvn,
                lvn: sessionProfile.lvn,
                totalVolume: sessionProfile.totalVolume,
                sessionType: sessionProfile.sessionType,
                timestamp: sessionProfile.timestamp,
            }
            : null,
        composite: compositeProfile
            ? {
                poc: compositeProfile.poc,
                vah: compositeProfile.vah,
                val: compositeProfile.val,
                compositePoc: compositeProfile.compositePoc,
                compositeVah: compositeProfile.compositeVah,
                compositeVal: compositeProfile.compositeVal,
                accumulationZone: compositeProfile.accumulationZone,
                distributionZone: compositeProfile.distributionZone,
                balanceZones: compositeProfile.balanceZones,
                timeRange: compositeProfile.timeRange,
                timestamp: compositeProfile.timestamp,
            }
            : null,
    };
}
// Helper function to format market structure data
function formatMarketStructure(marketStructure) {
    if (!marketStructure)
        return null;
    return {
        structure: marketStructure.structure,
        coc: marketStructure.coc,
        lastSwingHigh: marketStructure.lastSwingHigh,
        lastSwingLow: marketStructure.lastSwingLow,
        structureStrength: marketStructure.structureStrength,
        reversalSignal: marketStructure.reversalSignal,
        swingHighs: marketStructure.swingHighs,
        swingLows: marketStructure.swingLows,
        timestamp: marketStructure.timestamp,
    };
}
// Helper function to format candlestick patterns data
function formatCandlestickPatterns(patterns) {
    if (!patterns || !patterns.patterns) {
        return {
            patterns: [],
            latestPattern: null,
            bullishCount: 0,
            bearishCount: 0,
        };
    }
    return {
        patterns: patterns.patterns.map((p) => ({
            type: p.type,
            index: p.index,
            bullish: p.bullish,
        })),
        latestPattern: patterns.patterns.length > 0 ? patterns.patterns[patterns.patterns.length - 1] : null,
        bullishCount: patterns.patterns.filter((p) => p.bullish).length,
        bearishCount: patterns.patterns.filter((p) => !p.bullish).length,
    };
}
// Helper function to format divergence data
function formatDivergence(divergence) {
    if (!divergence)
        return null;
    return {
        bullishDivergence: divergence.bullishDivergence,
        bearishDivergence: divergence.bearishDivergence,
        divergence: divergence.divergence,
    };
}
// Helper function to format liquidation levels data
function formatLiquidationLevels(liquidation) {
    if (!liquidation)
        return null;
    return {
        clusters: {
            long: liquidation.clusters.long,
            short: liquidation.clusters.short,
            nearest: liquidation.clusters.nearest,
            distance: liquidation.clusters.distance,
        },
        liquidityGrab: liquidation.liquidityGrab,
        stopHunt: liquidation.stopHunt,
        cascade: liquidation.cascade,
        safeEntry: liquidation.safeEntry,
    };
}
// Helper function to format long/short ratio data
function formatLongShortRatio(ratio) {
    if (!ratio)
        return null;
    return {
        sentiment: ratio.sentiment,
        contrarian: ratio.contrarian,
        extreme: ratio.extreme,
        divergence: ratio.divergence,
    };
}
// Helper function to format spot-futures divergence data
function formatSpotFuturesDivergence(divergence) {
    if (!divergence)
        return null;
    return {
        premium: divergence.premium,
        arbitrage: divergence.arbitrage,
        meanReversion: divergence.meanReversion,
        divergence: divergence.divergence,
    };
}
// Simplified server object for Cloudflare Workers compatibility
const server = {
    name: 'geartrade',
    version: '1.0.0',
    tools: new Map(),
    resources: new Map(),
    prompts: new Map(),
    registerTool(name, config, handler) {
        this.tools.set(name, { config, handler });
    },
    registerResource(name, uri, config, handler) {
        this.resources.set(name, { uri, config, handler });
    },
    registerPrompt(name, config, handler) {
        this.prompts.set(name, { config, handler });
    }
};
// Register all merged tools (unified indicators)
// FIXED: Now 50 tools total (18 oscillators + 10 MAs + 22 others)
registerAllMergedTools(server);
// Register get_prices tool
server.registerTool('get_price', {
    title: 'Get Prices',
    description: 'Get latest prices for multiple trading tickers/symbols at once (e.g., ["BTC", "ETH", "SOL"])',
    inputSchema: {
        tickers: z
            .array(z.string())
            .min(1)
            .describe('Array of asset ticker symbols (e.g., ["BTC", "ETH", "SOL"])'),
    },
    outputSchema: {
        results: z.array(z.object({
            ticker: z.string(),
            price: z.number().nullable(),
            timestamp: z.string().optional(),
        })),
    },
}, async ({ tickers }) => {
    if (!Array.isArray(tickers) || tickers.length === 0) {
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        results: [],
                        error: 'Invalid tickers parameter',
                        message: 'Tickers must be a non-empty array of strings',
                    }, null, 2),
                },
            ],
            structuredContent: {
                results: [],
            },
        };
    }
    // Normalize all tickers (uppercase, remove spaces)
    const normalizedTickers = tickers
        .filter((t) => t && typeof t === 'string' && t.trim().length > 0)
        .map((t) => t.trim().toUpperCase());
    if (normalizedTickers.length === 0) {
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        results: [],
                        error: 'No valid tickers',
                        message: 'All tickers must be non-empty strings',
                    }, null, 2),
                },
            ],
            structuredContent: {
                results: [],
            },
        };
    }
    // Fetch prices for all tickers in parallel
    const pricePromises = normalizedTickers.map(async (ticker) => {
        try {
            const price = await getRealTimePrice(ticker);
            return {
                ticker,
                price: price,
                timestamp: new Date().toISOString(),
            };
        }
        catch (error) {
            return {
                ticker,
                price: null,
                timestamp: new Date().toISOString(),
            };
        }
    });
    const results = await Promise.all(pricePromises);
    return {
        content: [
            {
                type: 'text',
                text: JSON.stringify({
                    results,
                    summary: {
                        total: results.length,
                        found: results.filter((r) => r.price !== null).length,
                        notFound: results.filter((r) => r.price === null).length,
                    },
                }, null, 2),
            },
        ],
        structuredContent: {
            results,
        },
    };
});
// Register get_indicators tool
server.registerTool('get_indicators', {
    title: 'Get Technical Indicators',
    description: 'Get comprehensive technical analysis indicators for multiple trading tickers at once (e.g., ["BTC", "ETH", "SOL"])',
    inputSchema: {
        tickers: z
            .array(z.string())
            .min(1)
            .describe('Array of asset ticker symbols (e.g., ["BTC", "ETH", "SOL"])'),
    },
    outputSchema: {
        results: z.array(z.object({
            ticker: z.string(),
            price: z.number().nullable(),
            timestamp: z.string().optional(),
            technical: z
                .object({
                rsi: z
                    .object({
                    rsi14: z.number().nullable().optional(),
                    rsi7: z.number().nullable().optional(),
                    rsi4h: z.number().nullable().optional(),
                })
                    .nullable()
                    .optional(),
                ema: z
                    .object({
                    ema20: z.number().nullable().optional(),
                    ema50: z.number().nullable().optional(),
                })
                    .nullable()
                    .optional(),
                macd: z
                    .object({
                    macd: z.number().nullable().optional(),
                    signal: z.number().nullable().optional(),
                    histogram: z.number().nullable().optional(),
                })
                    .nullable()
                    .optional(),
                bollingerBands: z
                    .object({
                    upper: z.number().nullable().optional(),
                    middle: z.number().nullable().optional(),
                    lower: z.number().nullable().optional(),
                    position: z.string().nullable().optional(),
                })
                    .nullable()
                    .optional(),
                atr: z.number().nullable().optional(),
                adx: z
                    .object({
                    adx: z.number().nullable().optional(),
                    plusDI: z.number().nullable().optional(),
                    minusDI: z.number().nullable().optional(),
                    trend: z.string().nullable().optional(),
                })
                    .nullable()
                    .optional(),
                obv: z.number().nullable().optional(),
                vwap: z.number().nullable().optional(),
                stochastic: z
                    .object({
                    k: z.number().nullable().optional(),
                    d: z.number().nullable().optional(),
                })
                    .nullable()
                    .optional(),
                cci: z.number().nullable().optional(),
                williamsR: z.number().nullable().optional(),
                parabolicSAR: z
                    .object({
                    value: z.number().nullable().optional(),
                    trend: z.string().nullable().optional(),
                })
                    .nullable()
                    .optional(),
                aroon: z
                    .object({
                    up: z.number().nullable().optional(),
                    down: z.number().nullable().optional(),
                    trend: z.string().nullable().optional(),
                })
                    .nullable()
                    .optional(),
                support: z.number().nullable().optional(),
                resistance: z.number().nullable().optional(),
                fibonacci: z
                    .object({
                    level: z.string().nullable().optional(),
                    direction: z.string().nullable().optional(),
                    range: z.string().nullable().optional(),
                    keyLevels: z.string().nullable().optional(),
                })
                    .nullable()
                    .optional(),
                trend: z
                    .object({
                    direction: z.string().nullable().optional(),
                    strength: z.string().nullable().optional(),
                })
                    .nullable()
                    .optional(),
                marketStructure: z
                    .object({
                    structure: z.string().nullable().optional(),
                    higherHigh: z.boolean().optional(),
                    lowerLow: z.boolean().optional(),
                })
                    .nullable()
                    .optional(),
                rsiDivergence: z.string().nullable().optional(),
                candlestick: z.string().nullable().optional(),
                marketRegime: z.string().nullable().optional(),
                correlationCoefficient: z
                    .object({
                    correlation: z.number().nullable().optional(),
                    strength: z.string().nullable().optional(),
                    direction: z.string().nullable().optional(),
                })
                    .nullable()
                    .optional(),
                mcclellanOscillator: z
                    .object({
                    oscillator: z.number().nullable().optional(),
                    signal: z.number().nullable().optional(),
                    ratio: z.number().nullable().optional(),
                })
                    .nullable()
                    .optional(),
                armsIndex: z
                    .object({
                    index: z.number().nullable().optional(),
                    trin: z.number().nullable().optional(),
                    adRatio: z.number().nullable().optional(),
                })
                    .nullable()
                    .optional(),
                bounceAnalysis: z
                    .object({
                    setup: z.any().nullable().optional(),
                    persistence: z.any().nullable().optional(),
                })
                    .nullable()
                    .optional(),
                trendDetection: z
                    .object({
                    trend: z.any().nullable().optional(),
                    marketStructure: z.any().nullable().optional(),
                })
                    .nullable()
                    .optional(),
                enhancedMetrics: z.any().nullable().optional(),
                change24h: z.number().nullable().optional(),
                volumeChange24h: z.number().nullable().optional(),
            })
                .nullable()
                .optional(),
            btcCorrelation: z
                .object({
                correlation: z.number().nullable().optional(),
                strength: z.string().nullable().optional(),
                direction: z.string().nullable().optional(),
                beta: z.number().nullable().optional(),
                relativeStrength: z.number().nullable().optional(),
                decouplingSignal: z.enum(['decoupled', 'coupled', 'weakly_coupled']).nullable().optional(),
                interpretation: z.string().nullable().optional(),
            })
                .nullable()
                .optional(),
        })),
    },
}, async ({ tickers }) => {
    if (!Array.isArray(tickers) || tickers.length === 0) {
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        results: [],
                        error: 'Invalid tickers parameter',
                        message: 'Tickers must be a non-empty array of strings',
                    }, null, 2),
                },
            ],
            structuredContent: {
                results: [],
            },
        };
    }
    // Normalize all tickers (uppercase, remove spaces)
    const normalizedTickers = tickers
        .filter((t) => t && typeof t === 'string' && t.trim().length > 0)
        .map((t) => t.trim().toUpperCase());
    if (normalizedTickers.length === 0) {
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        results: [],
                        error: 'No valid tickers',
                        message: 'All tickers must be non-empty strings',
                    }, null, 2),
                },
            ],
            structuredContent: {
                results: [],
            },
        };
    }
    try {
        // Fetch market data with sufficient candles for volume analysis (75+ candles)
        if (!process.env.CANDLES_COUNT || parseInt(process.env.CANDLES_COUNT) < 200) {
            process.env.CANDLES_COUNT = '200';
        }
        // Always include BTC for correlation analysis
        const tickersWithBTC = normalizedTickers.includes('BTC')
            ? normalizedTickers
            : ['BTC', ...normalizedTickers];
        // Get market data for all tickers (fetched in parallel by getMarketData)
        const { marketDataMap } = await getMarketData(tickersWithBTC);
        // Extract BTC prices for correlation calculation
        const btcData = marketDataMap.get('BTC');
        const btcHistoricalData = btcData?.historicalData || btcData?.data?.historicalData || [];
        const btcPrices = btcHistoricalData.map((d) => d.close || d.price).filter((p) => p > 0);
        // Format results for each ticker
        const results = normalizedTickers.map((ticker) => {
            const assetData = marketDataMap.get(ticker);
            if (!assetData) {
                return {
                    ticker,
                    price: null,
                    timestamp: new Date().toISOString(),
                    technical: null,
                    btcCorrelation: null,
                };
            }
            const price = assetData.price || assetData.data?.price || null;
            const technical = formatTechnicalIndicators(assetData, price);
            // Calculate BTC correlation for non-BTC tickers
            let btcCorrelation = null;
            if (ticker !== 'BTC' && btcPrices.length >= 30) {
                const historicalData = assetData?.historicalData || assetData?.data?.historicalData || [];
                const assetPrices = historicalData.map((d) => d.close || d.price).filter((p) => p > 0);
                if (assetPrices.length >= 30) {
                    const correlation = analyzeAltcoinCorrelation(ticker, assetPrices, btcPrices, 30);
                    btcCorrelation = {
                        correlation: correlation.correlationWithBTC?.correlation || null,
                        strength: correlation.correlationWithBTC?.strength || null,
                        direction: correlation.correlationWithBTC?.direction || null,
                        beta: correlation.beta,
                        relativeStrength: correlation.relativeStrength,
                        decouplingSignal: correlation.decouplingSignal,
                        interpretation: correlation.interpretation,
                    };
                }
            }
            else if (ticker === 'BTC') {
                btcCorrelation = {
                    correlation: 1,
                    strength: 'perfect',
                    direction: 'positive',
                    beta: 1,
                    relativeStrength: 0,
                    decouplingSignal: 'coupled',
                    interpretation: 'BTC is the reference asset for correlation analysis.',
                };
            }
            return {
                ticker,
                price: price,
                timestamp: new Date().toISOString(),
                technical: technical,
                btcCorrelation: btcCorrelation,
            };
        });
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        results,
                        summary: {
                            total: results.length,
                            found: results.filter((r) => r.technical !== null).length,
                            notFound: results.filter((r) => r.technical === null).length,
                        },
                    }, null, 2),
                },
            ],
            structuredContent: {
                results,
            },
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        results: [],
                        error: error instanceof Error ? error.message : String(error),
                        message: 'Failed to fetch technical indicators',
                    }, null, 2),
                },
            ],
            structuredContent: {
                results: [],
            },
        };
    }
});
// Register get__volume_analysis tool
server.registerTool('get_volume_analysis', {
    title: 'Get Volume Analysis',
    description: 'Get comprehensive volume analysis for multiple trading tickers at once (e.g., ["BTC", "ETH", "SOL"])',
    inputSchema: {
        tickers: z
            .array(z.string())
            .min(1)
            .describe('Array of asset ticker symbols (e.g., ["BTC", "ETH", "SOL"])'),
    },
    outputSchema: z.object({
        results: z.array(z.object({
            ticker: z.string(),
            price: z.number().nullable(),
            timestamp: z.string().optional(),
            volumeAnalysis: z
                .object({
                buyVolume: z.number().nullable().optional(),
                sellVolume: z.number().nullable().optional(),
                netDelta: z.number().nullable().optional(),
                buyPressure: z.number().nullable().optional(),
                sellPressure: z.number().nullable().optional(),
                dominantSide: z.string().nullable().optional(),
                keyLevel: z.number().nullable().optional(),
                keyLevelDelta: z.number().nullable().optional(),
                poc: z.number().nullable().optional(),
                vah: z.number().nullable().optional(),
                val: z.number().nullable().optional(),
                hvn: z.string().nullable().optional(),
                lvn: z.string().nullable().optional(),
                cvdTrend: z.string().nullable().optional(),
                cvdDelta: z.number().nullable().optional(),
                topLiquidityZones: z
                    .array(z.object({
                    priceRange: z.string(),
                    type: z.string(),
                    strength: z.string(),
                }))
                    .nullable()
                    .optional(),
                recommendation: z.string().nullable().optional(),
                confidence: z.number().nullable().optional(),
                riskLevel: z.string().nullable().optional(),
            })
                .nullable()
                .optional(),
        })),
        summary: z
            .object({
            total: z.number(),
            found: z.number(),
            notFound: z.number(),
        })
            .optional(),
    }),
}, async ({ tickers }) => {
    if (!Array.isArray(tickers) || tickers.length === 0) {
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        results: [],
                        error: 'Invalid tickers parameter',
                        message: 'Tickers must be a non-empty array of strings',
                    }, null, 2),
                },
            ],
            structuredContent: {
                results: [],
            },
        };
    }
    // Normalize all tickers (uppercase, remove spaces)
    const normalizedTickers = tickers
        .filter((t) => t && typeof t === 'string' && t.trim().length > 0)
        .map((t) => t.trim().toUpperCase());
    if (normalizedTickers.length === 0) {
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        results: [],
                        error: 'No valid tickers',
                        message: 'All tickers must be non-empty strings',
                    }, null, 2),
                },
            ],
            structuredContent: {
                results: [],
            },
        };
    }
    try {
        // Fetch market data with sufficient candles for volume analysis (75+ candles)
        if (!process.env.CANDLES_COUNT || parseInt(process.env.CANDLES_COUNT) < 200) {
            process.env.CANDLES_COUNT = '200';
        }
        // Fetch market data for all tickers in parallel
        const { marketDataMap } = await getMarketData(normalizedTickers);
        const results = [];
        for (const ticker of normalizedTickers) {
            const assetData = marketDataMap.get(ticker);
            if (!assetData) {
                results.push({
                    ticker,
                    price: null,
                    timestamp: new Date().toISOString(),
                    volumeAnalysis: null,
                });
                continue;
            }
            const price = assetData.price || assetData.data?.price || null;
            const historicalData = assetData.historicalData || assetData.data?.historicalData || [];
            const externalData = assetData.externalData || assetData.data?.externalData || {};
            const volumeAnalysis = externalData.comprehensiveVolumeAnalysis || assetData.comprehensiveVolumeAnalysis || assetData.data?.comprehensiveVolumeAnalysis;
            // If volume analysis is not available but we have historical data, try to calculate it
            let finalVolumeAnalysis = volumeAnalysis;
            if (!finalVolumeAnalysis && historicalData && historicalData.length >= 20 && price) {
                // Use static import
                const volumeProfileData = externalData.volumeProfile || {};
                const sessionVolumeProfile = volumeProfileData.session || assetData.sessionVolumeProfile || assetData.data?.sessionVolumeProfile;
                const compositeVolumeProfile = volumeProfileData.composite || assetData.compositeVolumeProfile || assetData.data?.compositeVolumeProfile;
                let cumulativeVolumeDelta = externalData.volumeDelta || assetData.volumeDelta || assetData.data?.volumeDelta;
                // Calculate CVD if not available from external data
                if (!cumulativeVolumeDelta && historicalData && historicalData.length >= 10) {
                    cumulativeVolumeDelta = calculateCVD(historicalData);
                }
                try {
                    finalVolumeAnalysis = performComprehensiveVolumeAnalysis(historicalData, price, undefined, undefined, sessionVolumeProfile || compositeVolumeProfile || undefined, cumulativeVolumeDelta || undefined, undefined);
                }
                catch (error) {
                    // If calculation fails, keep it as null
                    console.error(`Failed to calculate volume analysis for ${ticker}:`, error);
                }
            }
            // Format volume analysis
            const formattedVolumeAnalysis = formatVolumeAnalysis(finalVolumeAnalysis, price);
            results.push({
                ticker,
                price,
                timestamp: new Date().toISOString(),
                volumeAnalysis: formattedVolumeAnalysis,
            });
        }
        const found = results.filter((r) => r.price !== null).length;
        const notFound = results.length - found;
        const result = {
            results,
            summary: {
                total: normalizedTickers.length,
                found,
                notFound,
            },
        };
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(result, null, 2),
                },
            ],
            structuredContent: result,
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        results: [],
                        error: error instanceof Error ? error.message : String(error),
                        message: 'Failed to fetch volume analysis',
                    }, null, 2),
                },
            ],
            structuredContent: {
                results: [],
            },
        };
    }
}),
    // Register get__multitimeframe tool
    server.registerTool('get_Multitimeframe', {
        title: 'Get Multi-Timeframe Analysis',
        description: 'Get multi-timeframe trend alignment analysis for multiple trading tickers at once (e.g., ["BTC", "ETH", "SOL"])',
        inputSchema: {
            tickers: z
                .array(z.string())
                .min(1)
                .describe('Array of asset ticker symbols (e.g., ["BTC", "ETH", "SOL"])'),
        },
        outputSchema: z.object({
            results: z.array(z.object({
                ticker: z.string(),
                price: z.number().nullable(),
                timestamp: z.string().optional(),
                multiTimeframe: z
                    .object({
                    dailyTrend: z.string().nullable().optional(),
                    h4Aligned: z.boolean().nullable().optional(),
                    h1Aligned: z.boolean().nullable().optional(),
                    overall: z.string().nullable().optional(),
                    score: z.number().nullable().optional(),
                    reason: z.string().nullable().optional(),
                    daily: z
                        .object({
                        price: z.number().nullable().optional(),
                        ema20: z.number().nullable().optional(),
                        ema50: z.number().nullable().optional(),
                        rsi14: z.number().nullable().optional(),
                    })
                        .nullable()
                        .optional(),
                    h4: z
                        .object({
                        price: z.number().nullable().optional(),
                        ema20: z.number().nullable().optional(),
                        rsi14: z.number().nullable().optional(),
                    })
                        .nullable()
                        .optional(),
                    h1: z
                        .object({
                        price: z.number().nullable().optional(),
                        ema20: z.number().nullable().optional(),
                        rsi14: z.number().nullable().optional(),
                    })
                        .nullable()
                        .optional(),
                })
                    .nullable()
                    .optional(),
            })),
            summary: z
                .object({
                total: z.number(),
                found: z.number(),
                notFound: z.number(),
            })
                .optional(),
        }),
    }, async ({ tickers }) => {
        if (!Array.isArray(tickers) || tickers.length === 0) {
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            results: [],
                            error: 'Invalid tickers parameter',
                            message: 'Tickers must be a non-empty array of strings',
                        }, null, 2),
                    },
                ],
                structuredContent: {
                    results: [],
                },
            };
        }
        // Normalize all tickers (uppercase, remove spaces)
        const normalizedTickers = tickers
            .filter((t) => t && typeof t === 'string' && t.trim().length > 0)
            .map((t) => t.trim().toUpperCase());
        if (normalizedTickers.length === 0) {
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            results: [],
                            error: 'No valid tickers',
                            message: 'All tickers must be non-empty strings',
                        }, null, 2),
                    },
                ],
                structuredContent: {
                    results: [],
                },
            };
        }
        try {
            // Fetch market data with sufficient candles for multi-timeframe analysis (75+ candles)
            if (!process.env.CANDLES_COUNT || parseInt(process.env.CANDLES_COUNT) < 200) {
                process.env.CANDLES_COUNT = '200';
            }
            // Fetch market data for all tickers in parallel
            const { marketDataMap } = await getMarketData(normalizedTickers);
            const results = [];
            for (const ticker of normalizedTickers) {
                const assetData = marketDataMap.get(ticker);
                if (!assetData) {
                    results.push({
                        ticker,
                        price: null,
                        timestamp: new Date().toISOString(),
                        multiTimeframe: null,
                    });
                    continue;
                }
                const price = assetData.price || assetData.data?.price || null;
                const formattedMultiTimeframe = formatMultiTimeframe(assetData);
                results.push({
                    ticker,
                    price,
                    timestamp: new Date().toISOString(),
                    multiTimeframe: formattedMultiTimeframe,
                });
            }
            const found = results.filter((r) => r.price !== null).length;
            const notFound = results.length - found;
            const result = {
                results,
                summary: {
                    total: normalizedTickers.length,
                    found,
                    notFound,
                },
            };
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(result, null, 2),
                    },
                ],
                structuredContent: result,
            };
        }
        catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            results: [],
                            error: error instanceof Error ? error.message : String(error),
                            message: 'Failed to fetch multi-timeframe analysis',
                        }, null, 2),
                    },
                ],
                structuredContent: {
                    results: [],
                },
            };
        }
    });
// Register get__external_data tool
server.registerTool('get_External_data', {
    title: 'Get External Data',
    description: 'Get comprehensive external market data including funding rates, open interest, liquidations, whale positions, and top traders for multiple trading tickers at once (e.g., ["BTC", "ETH", "SOL"])',
    inputSchema: {
        tickers: z
            .array(z.string())
            .min(1)
            .describe('Array of asset ticker symbols (e.g., ["BTC", "ETH", "SOL"])'),
        includeHyperscreener: z
            .boolean()
            .optional()
            .default(true)
            .describe('Include additional data from HyperScreener (liquidations, whales, top traders). Default: true'),
    },
    outputSchema: z.object({
        results: z.array(z.object({
            ticker: z.string(),
            price: z.number().nullable(),
            timestamp: z.string().optional(),
            externalData: z
                .object({
                fundingRate: z.string().nullable().optional(),
                fundingRateTrend: z.string().nullable().optional(),
                openInterest: z.union([z.string(), z.number()]).nullable().optional(),
                openInterestTrend: z.string().nullable().optional(),
                volumeTrend: z.string().nullable().optional(),
                volatility: z.string().nullable().optional(),
            })
                .nullable()
                .optional(),
            hyperscreenerData: z
                .object({
                longShortRatio: z.number().nullable().optional(),
                recentLiquidations: z.array(z.any()).nullable().optional(),
                whalePositions: z.array(z.any()).nullable().optional(),
                largeTrades: z.array(z.any()).nullable().optional(),
            })
                .nullable()
                .optional(),
        })),
        marketOverview: z.any().nullable().optional(),
        topGainers: z.array(z.any()).nullable().optional(),
        topLosers: z.array(z.any()).nullable().optional(),
        platformStats: z.any().nullable().optional(),
        summary: z
            .object({
            total: z.number(),
            found: z.number(),
            notFound: z.number(),
        })
            .optional(),
    }),
}, async ({ tickers, includeHyperscreener = true }) => {
    if (!Array.isArray(tickers) || tickers.length === 0) {
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        results: [],
                        error: 'Invalid tickers parameter',
                        message: 'Tickers must be a non-empty array of strings',
                    }, null, 2),
                },
            ],
            structuredContent: {
                results: [],
            },
        };
    }
    // Normalize all tickers (uppercase, remove spaces)
    const normalizedTickers = tickers
        .filter((t) => t && typeof t === 'string' && t.trim().length > 0)
        .map((t) => t.trim().toUpperCase());
    if (normalizedTickers.length === 0) {
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        results: [],
                        error: 'No valid tickers',
                        message: 'All tickers must be non-empty strings',
                    }, null, 2),
                },
            ],
            structuredContent: {
                results: [],
            },
        };
    }
    try {
        // Fetch market data
        if (!process.env.CANDLES_COUNT || parseInt(process.env.CANDLES_COUNT) < 200) {
            process.env.CANDLES_COUNT = '200';
        }
        // Fetch all data in parallel
        const [{ marketDataMap }, hyperscreenerLiquidations, hyperscreenerWhales, hyperscreenerLongShort, hyperscreenerLargeTrades, hyperscreenerMarketOverview, hyperscreenerTopGainers, hyperscreenerTopLosers, hyperscreenerPlatformStats] = await Promise.all([
            getMarketData(normalizedTickers),
            includeHyperscreener ? getLiquidations('notional_volume', 'desc', 20).catch(() => null) : Promise.resolve(null),
            includeHyperscreener ? getWhalePositions('notional_value', 'desc', 20).catch(() => null) : Promise.resolve(null),
            includeHyperscreener ? getHyperscreenerLongShortRatio('notional_value', 'desc', 50).catch(() => null) : Promise.resolve(null),
            includeHyperscreener ? getLargeTrades(50000, 'desc', 20).catch(() => null) : Promise.resolve(null),
            includeHyperscreener ? getMarketOverview().catch(() => null) : Promise.resolve(null),
            includeHyperscreener ? getTopGainers('24h', 10).catch(() => null) : Promise.resolve(null),
            includeHyperscreener ? getTopLosers('24h', 10).catch(() => null) : Promise.resolve(null),
            includeHyperscreener ? getPlatformStats().catch(() => null) : Promise.resolve(null),
        ]);
        // Create lookup maps for HyperScreener data
        const liquidationsMap = new Map();
        const whalesMap = new Map();
        const longShortMap = new Map();
        const largeTradesMap = new Map();
        // Process liquidations data
        if (hyperscreenerLiquidations && Array.isArray(hyperscreenerLiquidations)) {
            for (const liq of hyperscreenerLiquidations) {
                const symbol = (liq.symbol || liq.coin || '').toUpperCase();
                if (symbol) {
                    if (!liquidationsMap.has(symbol)) {
                        liquidationsMap.set(symbol, []);
                    }
                    liquidationsMap.get(symbol).push(liq);
                }
            }
        }
        // Process whale positions data
        if (hyperscreenerWhales && Array.isArray(hyperscreenerWhales)) {
            for (const whale of hyperscreenerWhales) {
                const symbol = (whale.symbol || whale.coin || '').toUpperCase();
                if (symbol) {
                    if (!whalesMap.has(symbol)) {
                        whalesMap.set(symbol, []);
                    }
                    whalesMap.get(symbol).push(whale);
                }
            }
        }
        // Process long/short ratio data
        if (hyperscreenerLongShort && Array.isArray(hyperscreenerLongShort)) {
            for (const ls of hyperscreenerLongShort) {
                const symbol = (ls.symbol || ls.coin || '').toUpperCase();
                const ratio = ls.long_short_ratio || ls.longShortRatio || ls.ratio;
                if (symbol && ratio !== undefined) {
                    longShortMap.set(symbol, parseFloat(ratio));
                }
            }
        }
        // Process large trades data
        if (hyperscreenerLargeTrades && Array.isArray(hyperscreenerLargeTrades)) {
            for (const trade of hyperscreenerLargeTrades) {
                const symbol = (trade.symbol || trade.coin || '').toUpperCase();
                if (symbol) {
                    if (!largeTradesMap.has(symbol)) {
                        largeTradesMap.set(symbol, []);
                    }
                    largeTradesMap.get(symbol).push(trade);
                }
            }
        }
        const results = [];
        for (const ticker of normalizedTickers) {
            const assetData = marketDataMap.get(ticker);
            if (!assetData) {
                results.push({
                    ticker,
                    price: null,
                    timestamp: new Date().toISOString(),
                    externalData: null,
                    hyperscreenerData: includeHyperscreener ? {
                        longShortRatio: longShortMap.get(ticker) || null,
                        recentLiquidations: liquidationsMap.get(ticker)?.slice(0, 5) || null,
                        whalePositions: whalesMap.get(ticker)?.slice(0, 5) || null,
                        largeTrades: largeTradesMap.get(ticker)?.slice(0, 5) || null,
                    } : null,
                });
                continue;
            }
            const price = assetData.price || assetData.data?.price || null;
            const formattedExternalData = formatExternalData(assetData);
            results.push({
                ticker,
                price,
                timestamp: new Date().toISOString(),
                externalData: formattedExternalData,
                hyperscreenerData: includeHyperscreener ? {
                    longShortRatio: longShortMap.get(ticker) || null,
                    recentLiquidations: liquidationsMap.get(ticker)?.slice(0, 5) || null,
                    whalePositions: whalesMap.get(ticker)?.slice(0, 5) || null,
                    largeTrades: largeTradesMap.get(ticker)?.slice(0, 5) || null,
                } : null,
            });
        }
        const found = results.filter((r) => r.price !== null).length;
        const notFound = results.length - found;
        const result = {
            results,
            marketOverview: hyperscreenerMarketOverview || null,
            topGainers: hyperscreenerTopGainers || null,
            topLosers: hyperscreenerTopLosers || null,
            platformStats: hyperscreenerPlatformStats || null,
            summary: {
                total: normalizedTickers.length,
                found,
                notFound,
            },
        };
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(result, null, 2),
                },
            ],
            structuredContent: result,
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        results: [],
                        error: error instanceof Error ? error.message : String(error),
                        message: 'Failed to fetch external data',
                    }, null, 2),
                },
            ],
            structuredContent: {
                results: [],
            },
        };
    }
}),
    // Register calculate_risk_management tool
    server.registerTool('calculate_risk_management', {
        title: 'Calculate Risk Management',
        description: 'Calculate stop loss, take profit, and risk/reward ratio for a trading position',
        inputSchema: {
            ticker: z.string().describe('Asset ticker symbol (e.g., "BTC", "ETH", "SOL")'),
            entryPrice: z.number().positive().describe('Entry price for the position'),
            side: z.enum(['LONG', 'SHORT']).describe('Position side (LONG or SHORT)'),
            stopLossPct: z.number().positive().optional().describe('Stop loss percentage (default: 2%)'),
            takeProfitPct: z.number().positive().optional().describe('Take profit percentage (default: 4.5%)'),
            positionSizeUsd: z.number().positive().optional().describe('Position size in USD (optional, for calculating potential loss/profit)'),
        },
        outputSchema: z.object({
            ticker: z.string(),
            entryPrice: z.number(),
            side: z.string(),
            riskManagement: z.object({
                stopLossFixed: z.number(),
                stopLossFixedPct: z.number(),
                stopLossFlexible: z.number(),
                stopLossFlexiblePct: z.number(),
                takeProfit: z.number(),
                takeProfitPct: z.number(),
                takeProfitLevels: z.any().nullable().optional(),
                potentialLoss: z.number().nullable().optional(),
                potentialProfit: z.number().nullable().optional(),
                riskRewardRatio: z.number().nullable().optional(),
                trailingStop: z.object({
                    active: z.boolean().nullable().optional(),
                    price: z.number().nullable().optional(),
                    trailPercent: z.number().nullable().optional(),
                }).nullable().optional(),
                signalReversal: z.object({
                    shouldReverse: z.boolean().nullable().optional(),
                    confidence: z.number().nullable().optional(),
                }).nullable().optional(),
            }),
        }),
    }, async ({ ticker, entryPrice, side, stopLossPct = 2, takeProfitPct = 4.5, positionSizeUsd, }) => {
        if (!ticker || typeof ticker !== 'string' || ticker.trim().length === 0) {
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            error: 'Invalid ticker parameter',
                            message: 'Ticker must be a non-empty string',
                        }, null, 2),
                    },
                ],
                structuredContent: {
                    ticker: ticker || '',
                    entryPrice: 0,
                    side: 'LONG',
                    riskManagement: {
                        stopLossFixed: 0,
                        stopLossFixedPct: 0,
                        stopLossFlexible: 0,
                        stopLossFlexiblePct: 0,
                        takeProfit: 0,
                        takeProfitPct: 0,
                        potentialLoss: null,
                        potentialProfit: null,
                        riskRewardRatio: null,
                    },
                },
            };
        }
        if (!entryPrice || entryPrice <= 0) {
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            error: 'Invalid entryPrice parameter',
                            message: 'Entry price must be a positive number',
                        }, null, 2),
                    },
                ],
                structuredContent: {
                    ticker: ticker.trim().toUpperCase(),
                    entryPrice: 0,
                    side,
                    riskManagement: {
                        stopLossFixed: 0,
                        stopLossFixedPct: 0,
                        stopLossFlexible: 0,
                        stopLossFlexiblePct: 0,
                        takeProfit: 0,
                        takeProfitPct: 0,
                        potentialLoss: null,
                        potentialProfit: null,
                        riskRewardRatio: null,
                    },
                },
            };
        }
        try {
            const normalizedTicker = ticker.trim().toUpperCase();
            const positionSize = positionSizeUsd || 10000; // Default position size for calculation
            // Get current market data for enhanced risk management features
            const { marketDataMap } = await getMarketData([normalizedTicker]);
            const assetData = marketDataMap.get(normalizedTicker);
            const currentPrice = assetData?.price || assetData?.data?.price || entryPrice;
            const indicators = assetData?.indicators || assetData?.data?.indicators;
            const riskManagement = formatRiskManagement(entryPrice, side, stopLossPct, takeProfitPct, positionSize, currentPrice, indicators);
            const result = {
                ticker: normalizedTicker,
                entryPrice,
                side,
                riskManagement,
            };
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(result, null, 2),
                    },
                ],
                structuredContent: result,
            };
        }
        catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            error: error instanceof Error ? error.message : String(error),
                            message: 'Failed to calculate risk management',
                        }, null, 2),
                    },
                ],
                structuredContent: {
                    ticker: ticker.trim().toUpperCase(),
                    entryPrice,
                    side,
                    riskManagement: {
                        stopLossFixed: 0,
                        stopLossFixedPct: 0,
                        stopLossFlexible: 0,
                        stopLossFlexiblePct: 0,
                        takeProfit: 0,
                        takeProfitPct: 0,
                        potentialLoss: null,
                        potentialProfit: null,
                        riskRewardRatio: null,
                    },
                },
            };
        }
    });
// Register calculate_position_setup tool
server.registerTool('calculate_position_setup', {
    title: 'Calculate Position Setup',
    description: 'Calculate position size, leverage, margin, and quantity for a trading signal',
    inputSchema: {
        ticker: z.string().describe('Asset ticker symbol (e.g., "BTC", "ETH", "SOL")'),
        entryPrice: z.number().positive().describe('Entry price for the position'),
        side: z.enum(['LONG', 'SHORT']).describe('Position side (LONG or SHORT)'),
        capital: z.number().positive().optional().describe('Total capital available (optional, defaults to config)'),
        riskPct: z.number().positive().optional().describe('Risk percentage per trade (optional, default: 0.9%)'),
        strategy: z.enum(['equal', 'confidence_weighted', 'ranking_weighted']).optional().describe('Position sizing strategy (optional, default: equal)'),
        confidence: z.number().min(0).max(100).optional().describe('Signal confidence (0-100, required for confidence_weighted strategy)'),
        ranking: z.number().positive().optional().describe('Asset ranking (required for ranking_weighted strategy)'),
    },
    outputSchema: z.object({
        ticker: z.string(),
        entryPrice: z.number(),
        side: z.string(),
        positionSetup: z.object({
            positionSizeUsd: z.number(),
            quantity: z.number(),
            leverage: z.number(),
            marginPercent: z.number(),
            marginUsed: z.number(),
            positionValue: z.number(),
            capital: z.number(),
            capitalAllocated: z.number(),
            capitalAllocatedPct: z.number(),
            riskPct: z.number(),
        }),
    }),
}, async ({ ticker, entryPrice, side, capital, riskPct = 0.9, strategy = 'equal', confidence, ranking, }) => {
    if (!ticker || typeof ticker !== 'string' || ticker.trim().length === 0) {
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        error: 'Invalid ticker parameter',
                        message: 'Ticker must be a non-empty string',
                    }, null, 2),
                },
            ],
            structuredContent: {
                ticker: ticker || '',
                entryPrice: 0,
                side: 'LONG',
                positionSetup: {
                    positionSizeUsd: 0,
                    quantity: 0,
                    leverage: 1,
                    marginPercent: 0,
                    marginUsed: 0,
                    positionValue: 0,
                    capital: 0,
                    capitalAllocated: 0,
                    capitalAllocatedPct: 0,
                    riskPct: 0,
                },
            },
        };
    }
    if (!entryPrice || entryPrice <= 0) {
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        error: 'Invalid entryPrice parameter',
                        message: 'Entry price must be a positive number',
                    }, null, 2),
                },
            ],
            structuredContent: {
                ticker: ticker.trim().toUpperCase(),
                entryPrice: 0,
                side,
                positionSetup: {
                    positionSizeUsd: 0,
                    quantity: 0,
                    leverage: 1,
                    marginPercent: 0,
                    marginUsed: 0,
                    positionValue: 0,
                    capital: 0,
                    capitalAllocated: 0,
                    capitalAllocatedPct: 0,
                    riskPct: 0,
                },
            },
        };
    }
    try {
        const normalizedTicker = ticker.trim().toUpperCase();
        // Get default capital from config or env
        const defaultCapital = capital || parseFloat(process.env.PAPER_CAPITAL || '10000');
        const totalCapital = capital || defaultCapital;
        // Get market data for indicators and external data
        if (!process.env.CANDLES_COUNT || parseInt(process.env.CANDLES_COUNT) < 200) {
            process.env.CANDLES_COUNT = '200';
        }
        const { marketDataMap } = await getMarketData([normalizedTicker]);
        const assetData = marketDataMap.get(normalizedTicker);
        if (!assetData) {
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            error: 'Asset not found',
                            message: `No market data available for ${normalizedTicker}`,
                        }, null, 2),
                    },
                ],
                structuredContent: {
                    ticker: normalizedTicker,
                    entryPrice,
                    side,
                    positionSetup: {
                        positionSizeUsd: 0,
                        quantity: 0,
                        leverage: 1,
                        marginPercent: 0,
                        marginUsed: 0,
                        positionValue: 0,
                        capital: totalCapital,
                        capitalAllocated: 0,
                        capitalAllocatedPct: 0,
                        riskPct,
                    },
                },
            };
        }
        const indicators = assetData.indicators || assetData.data?.indicators || {};
        const externalData = assetData.externalData || assetData.data?.externalData || {};
        const maxLeverage = assetData.maxLeverage || externalData?.hyperliquid?.maxLeverage || 10;
        // Create a mock signal for position sizing calculation
        const mockSignal = {
            coin: normalizedTicker,
            signal: side === 'LONG' ? 'buy_to_enter' : 'sell_to_enter',
            confidence: confidence || 50,
            entry_price: entryPrice,
        };
        // Calculate position size (simplified - removed execution logic)
        const positionSizeUsd = totalCapital * 0.1; // Use 10% of capital
        // Calculate dynamic leverage
        const leverage = calculateDynamicLeverage(indicators, externalData, mockSignal, entryPrice, maxLeverage);
        // Calculate dynamic margin percentage
        const marginPercent = calculateDynamicMarginPercentage(indicators, externalData, mockSignal, entryPrice);
        const positionSetup = formatPositionSetup(normalizedTicker, entryPrice, side, positionSizeUsd, leverage, marginPercent, totalCapital, riskPct);
        const result = {
            ticker: normalizedTicker,
            entryPrice,
            side,
            positionSetup,
        };
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(result, null, 2),
                },
            ],
            structuredContent: result,
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        error: error instanceof Error ? error.message : String(error),
                        message: 'Failed to calculate position setup',
                    }, null, 2),
                },
            ],
            structuredContent: {
                ticker: ticker.trim().toUpperCase(),
                entryPrice,
                side,
                positionSetup: {
                    positionSizeUsd: 0,
                    quantity: 0,
                    leverage: 1,
                    marginPercent: 0,
                    marginUsed: 0,
                    positionValue: 0,
                    capital: capital || 10000,
                    capitalAllocated: 0,
                    capitalAllocatedPct: 0,
                    riskPct,
                },
            },
        };
    }
});
// Register get_orderbook_depth tool
server.registerTool('get_orderbook_depth', {
    title: 'Get Order Book Depth',
    description: 'Get real-time L2 order book depth analysis from Hyperliquid for multiple trading tickers at once (e.g., ["BTC", "ETH", "SOL"])',
    inputSchema: {
        tickers: z
            .array(z.string())
            .min(1)
            .describe('Array of asset ticker symbols (e.g., ["BTC", "ETH", "SOL"])'),
        nSigFigs: z
            .number()
            .int()
            .min(2)
            .max(5)
            .optional()
            .describe('Significant figures for price aggregation (2-5). Optional, defaults to full precision'),
    },
    outputSchema: z.object({
        results: z.array(z.object({
            ticker: z.string(),
            price: z.number().nullable(),
            timestamp: z.string().optional(),
            orderBookDepth: z
                .object({
                bidPrice: z.number(),
                askPrice: z.number(),
                midPrice: z.number(),
                spread: z.number(),
                spreadPercent: z.number(),
                bidDepth: z.number(),
                askDepth: z.number(),
                imbalance: z.number(),
                supportZones: z.array(z.object({
                    price: z.number(),
                    depth: z.number(),
                    distance: z.number(),
                })),
                resistanceZones: z.array(z.object({
                    price: z.number(),
                    depth: z.number(),
                    distance: z.number(),
                })),
                liquidityScore: z.number(),
                timestamp: z.number(),
            })
                .nullable()
                .optional(),
            l2Book: z
                .object({
                bids: z.array(z.object({ price: z.string(), size: z.string() })),
                asks: z.array(z.object({ price: z.string(), size: z.string() })),
                totalBidSize: z.number(),
                totalAskSize: z.number(),
                bidAskImbalance: z.number(),
            })
                .nullable()
                .optional(),
        })),
        summary: z
            .object({
            total: z.number(),
            found: z.number(),
            notFound: z.number(),
        })
            .optional(),
    }),
}, async ({ tickers, nSigFigs }) => {
    if (!Array.isArray(tickers) || tickers.length === 0) {
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        results: [],
                        error: 'Invalid tickers parameter',
                        message: 'Tickers must be a non-empty array of strings',
                    }, null, 2),
                },
            ],
            structuredContent: {
                results: [],
            },
        };
    }
    const normalizedTickers = tickers
        .filter((t) => t && typeof t === 'string' && t.trim().length > 0)
        .map((t) => t.trim().toUpperCase());
    if (normalizedTickers.length === 0) {
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        results: [],
                        error: 'No valid tickers',
                        message: 'All tickers must be non-empty strings',
                    }, null, 2),
                },
            ],
            structuredContent: {
                results: [],
            },
        };
    }
    try {
        if (!process.env.CANDLES_COUNT || parseInt(process.env.CANDLES_COUNT) < 200) {
            process.env.CANDLES_COUNT = '200';
        }
        // Fetch market data and L2 order books in parallel
        const [{ marketDataMap }, ...l2Books] = await Promise.all([
            getMarketData(normalizedTickers),
            ...normalizedTickers.map(ticker => getL2OrderBook(ticker, nSigFigs).catch(() => null))
        ]);
        const results = [];
        for (let i = 0; i < normalizedTickers.length; i++) {
            const ticker = normalizedTickers[i];
            const assetData = marketDataMap.get(ticker);
            const l2BookData = l2Books[i];
            const price = await getRealTimePrice(ticker).catch(() => null);
            const orderBookDepth = assetData?.externalData?.orderBook || assetData?.data?.externalData?.orderBook || null;
            const formattedOrderBook = formatOrderBookDepth(orderBookDepth);
            // Process L2 order book data
            let l2Book = null;
            if (l2BookData && l2BookData.levels) {
                const bids = (l2BookData.levels[0] || []).slice(0, 20).map((level) => ({
                    price: level.px,
                    size: level.sz
                }));
                const asks = (l2BookData.levels[1] || []).slice(0, 20).map((level) => ({
                    price: level.px,
                    size: level.sz
                }));
                const totalBidSize = bids.reduce((sum, b) => sum + parseFloat(b.size), 0);
                const totalAskSize = asks.reduce((sum, a) => sum + parseFloat(a.size), 0);
                const bidAskImbalance = totalBidSize + totalAskSize > 0
                    ? (totalBidSize - totalAskSize) / (totalBidSize + totalAskSize)
                    : 0;
                l2Book = {
                    bids,
                    asks,
                    totalBidSize,
                    totalAskSize,
                    bidAskImbalance
                };
            }
            results.push({
                ticker,
                price,
                timestamp: new Date().toISOString(),
                orderBookDepth: formattedOrderBook,
                l2Book,
            });
        }
        const found = results.filter((r) => r.orderBookDepth !== null).length;
        const notFound = results.length - found;
        const result = {
            results,
            summary: {
                total: normalizedTickers.length,
                found,
                notFound,
            },
        };
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(result, null, 2),
                },
            ],
            structuredContent: result,
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        results: [],
                        error: error instanceof Error ? error.message : String(error),
                        message: 'Failed to fetch order book depth',
                    }, null, 2),
                },
            ],
            structuredContent: {
                results: [],
            },
        };
    }
});
// Register get_volume_profile tool
server.registerTool('get_volume_profile', {
    title: 'Get Volume Profile',
    description: 'Get volume profile analysis for multiple trading tickers at once (e.g., ["BTC", "ETH", "SOL"])',
    inputSchema: {
        tickers: z
            .array(z.string())
            .min(1)
            .describe('Array of asset ticker symbols (e.g., ["BTC", "ETH", "SOL"])'),
    },
    outputSchema: z.object({
        results: z.array(z.object({
            ticker: z.string(),
            price: z.number().nullable(),
            timestamp: z.string().optional(),
            volumeProfile: z
                .object({
                session: z
                    .object({
                    poc: z.number(),
                    vah: z.number(),
                    val: z.number(),
                    hvn: z.array(z.object({ price: z.number(), volume: z.number() })),
                    lvn: z.array(z.object({ price: z.number(), volume: z.number() })),
                    totalVolume: z.number(),
                    sessionType: z.string(),
                    timestamp: z.number(),
                })
                    .nullable(),
                composite: z
                    .object({
                    poc: z.number(),
                    vah: z.number(),
                    val: z.number(),
                    compositePoc: z.number(),
                    compositeVah: z.number(),
                    compositeVal: z.number(),
                    accumulationZone: z
                        .object({
                        priceRange: z.tuple([z.number(), z.number()]),
                        volumeRatio: z.number(),
                        strength: z.string(),
                    })
                        .nullable(),
                    distributionZone: z
                        .object({
                        priceRange: z.tuple([z.number(), z.number()]),
                        volumeRatio: z.number(),
                        strength: z.string(),
                    })
                        .nullable(),
                    balanceZones: z.array(z.object({
                        priceRange: z.tuple([z.number(), z.number()]),
                        volume: z.number(),
                        center: z.number(),
                    })),
                    timeRange: z.string(),
                    timestamp: z.number(),
                })
                    .nullable(),
            })
                .nullable()
                .optional(),
        })),
        summary: z
            .object({
            total: z.number(),
            found: z.number(),
            notFound: z.number(),
        })
            .optional(),
    }),
}, async ({ tickers }) => {
    if (!Array.isArray(tickers) || tickers.length === 0) {
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        results: [],
                        error: 'Invalid tickers parameter',
                        message: 'Tickers must be a non-empty array of strings',
                    }, null, 2),
                },
            ],
            structuredContent: {
                results: [],
            },
        };
    }
    const normalizedTickers = tickers
        .filter((t) => t && typeof t === 'string' && t.trim().length > 0)
        .map((t) => t.trim().toUpperCase());
    if (normalizedTickers.length === 0) {
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        results: [],
                        error: 'No valid tickers',
                        message: 'All tickers must be non-empty strings',
                    }, null, 2),
                },
            ],
            structuredContent: {
                results: [],
            },
        };
    }
    try {
        if (!process.env.CANDLES_COUNT || parseInt(process.env.CANDLES_COUNT) < 200) {
            process.env.CANDLES_COUNT = '200';
        }
        const { marketDataMap } = await getMarketData(normalizedTickers);
        const results = [];
        for (const ticker of normalizedTickers) {
            const assetData = marketDataMap.get(ticker);
            const price = await getRealTimePrice(ticker).catch(() => null);
            const volumeProfileData = assetData?.externalData?.volumeProfile || assetData?.data?.externalData?.volumeProfile || null;
            const formattedVolumeProfile = formatVolumeProfile(volumeProfileData?.session || null, volumeProfileData?.composite || null);
            results.push({
                ticker,
                price,
                timestamp: new Date().toISOString(),
                volumeProfile: formattedVolumeProfile,
            });
        }
        const found = results.filter((r) => r.volumeProfile !== null).length;
        const notFound = results.length - found;
        const result = {
            results,
            summary: {
                total: normalizedTickers.length,
                found,
                notFound,
            },
        };
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(result, null, 2),
                },
            ],
            structuredContent: result,
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        results: [],
                        error: error instanceof Error ? error.message : String(error),
                        message: 'Failed to fetch volume profile',
                    }, null, 2),
                },
            ],
            structuredContent: {
                results: [],
            },
        };
    }
});
// Register get_market_structure tool
server.registerTool('get_market_structure', {
    title: 'Get Market Structure',
    description: 'Get market structure analysis for multiple trading tickers at once (e.g., ["BTC", "ETH", "SOL"])',
    inputSchema: {
        tickers: z
            .array(z.string())
            .min(1)
            .describe('Array of asset ticker symbols (e.g., ["BTC", "ETH", "SOL"])'),
    },
    outputSchema: z.object({
        results: z.array(z.object({
            ticker: z.string(),
            price: z.number().nullable(),
            timestamp: z.string().optional(),
            marketStructure: z
                .object({
                structure: z.enum(['bullish', 'bearish', 'neutral']),
                coc: z.enum(['bullish', 'bearish', 'none']),
                lastSwingHigh: z.number().nullable(),
                lastSwingLow: z.number().nullable(),
                structureStrength: z.number(),
                reversalSignal: z.boolean(),
                swingHighs: z.array(z.object({
                    price: z.number(),
                    index: z.number(),
                    timestamp: z.number(),
                })),
                swingLows: z.array(z.object({
                    price: z.number(),
                    index: z.number(),
                    timestamp: z.number(),
                })),
                timestamp: z.number(),
            })
                .nullable()
                .optional(),
        })),
        summary: z
            .object({
            total: z.number(),
            found: z.number(),
            notFound: z.number(),
        })
            .optional(),
    }),
}, async ({ tickers }) => {
    if (!Array.isArray(tickers) || tickers.length === 0) {
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        results: [],
                        error: 'Invalid tickers parameter',
                        message: 'Tickers must be a non-empty array of strings',
                    }, null, 2),
                },
            ],
            structuredContent: {
                results: [],
            },
        };
    }
    const normalizedTickers = tickers
        .filter((t) => t && typeof t === 'string' && t.trim().length > 0)
        .map((t) => t.trim().toUpperCase());
    if (normalizedTickers.length === 0) {
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        results: [],
                        error: 'No valid tickers',
                        message: 'All tickers must be non-empty strings',
                    }, null, 2),
                },
            ],
            structuredContent: {
                results: [],
            },
        };
    }
    try {
        if (!process.env.CANDLES_COUNT || parseInt(process.env.CANDLES_COUNT) < 200) {
            process.env.CANDLES_COUNT = '200';
        }
        const { marketDataMap } = await getMarketData(normalizedTickers);
        const results = [];
        for (const ticker of normalizedTickers) {
            const assetData = marketDataMap.get(ticker);
            const price = await getRealTimePrice(ticker).catch(() => null);
            if (!assetData || !price) {
                results.push({
                    ticker,
                    price,
                    timestamp: new Date().toISOString(),
                    marketStructure: null,
                });
                continue;
            }
            const historicalData = assetData?.historicalData || assetData?.data?.historicalData || [];
            if (historicalData.length < 20) {
                results.push({
                    ticker,
                    price,
                    timestamp: new Date().toISOString(),
                    marketStructure: null,
                });
                continue;
            }
            const marketStructure = detectChangeOfCharacter(historicalData, price);
            const formattedMarketStructure = formatMarketStructure(marketStructure);
            results.push({
                ticker,
                price,
                timestamp: new Date().toISOString(),
                marketStructure: formattedMarketStructure,
            });
        }
        const found = results.filter((r) => r.marketStructure !== null).length;
        const notFound = results.length - found;
        const result = {
            results,
            summary: {
                total: normalizedTickers.length,
                found,
                notFound,
            },
        };
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(result, null, 2),
                },
            ],
            structuredContent: result,
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        results: [],
                        error: error instanceof Error ? error.message : String(error),
                        message: 'Failed to fetch market structure',
                    }, null, 2),
                },
            ],
            structuredContent: {
                results: [],
            },
        };
    }
});
// Register get_market_regime tool
server.registerTool('get_market_regime', {
    title: 'Get Market Regime Analysis',
    description: 'Get market regime analysis (trending/choppy/volatile) for multiple trading tickers at once (e.g., ["BTC", "ETH", "SOL"])',
    inputSchema: {
        tickers: z
            .array(z.string())
            .min(1)
            .describe('Array of asset ticker symbols (e.g., ["BTC", "ETH", "SOL"])'),
    },
    outputSchema: z.object({
        results: z.array(z.object({
            ticker: z.string(),
            price: z.number().nullable(),
            timestamp: z.string().optional(),
            marketRegime: z
                .object({
                regime: z.enum(['trending', 'choppy', 'neutral']),
                volatility: z.enum(['high', 'normal', 'low']),
                adx: z.number().nullable(),
                atrPercent: z.number().nullable(),
                regimeScore: z.number(),
            })
                .nullable()
                .optional(),
        })),
        summary: z
            .object({
            total: z.number(),
            found: z.number(),
            notFound: z.number(),
        })
            .optional(),
    }),
}, async ({ tickers }) => {
    if (!Array.isArray(tickers) || tickers.length === 0) {
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        results: [],
                        error: 'Invalid tickers parameter',
                        message: 'Tickers must be a non-empty array of strings',
                    }, null, 2),
                },
            ],
            structuredContent: {
                results: [],
            },
        };
    }
    const normalizedTickers = tickers
        .filter((t) => t && typeof t === 'string' && t.trim().length > 0)
        .map((t) => t.trim().toUpperCase());
    if (normalizedTickers.length === 0) {
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        results: [],
                        error: 'No valid tickers',
                        message: 'All tickers must be non-empty strings',
                    }, null, 2),
                },
            ],
            structuredContent: {
                results: [],
            },
        };
    }
    const { marketDataMap } = await getMarketData(normalizedTickers);
    const results = [];
    for (const ticker of normalizedTickers) {
        try {
            const assetData = marketDataMap.get(ticker);
            const price = assetData?.price || null;
            let marketRegime = null;
            if (assetData?.indicators) {
                const adx = assetData.indicators.adx || null;
                const atr = assetData.indicators.atr || null;
                const historicalData = assetData.historicalData || [];
                marketRegime = detectMarketRegime(adx, atr, price || 0, historicalData);
            }
            results.push({
                ticker,
                price,
                timestamp: new Date().toISOString(),
                marketRegime,
            });
        }
        catch (error) {
            console.warn(`Failed to analyze market regime for ${ticker}:`, error);
            results.push({
                ticker,
                price: null,
                timestamp: new Date().toISOString(),
                marketRegime: null,
            });
        }
    }
    const found = results.filter((r) => r.marketRegime !== null).length;
    const notFound = results.length - found;
    const result = {
        results,
        summary: {
            total: normalizedTickers.length,
            found,
            notFound,
        },
    };
    return {
        content: [
            {
                type: 'text',
                text: JSON.stringify(result, null, 2),
            },
        ],
        structuredContent: result,
    };
});
// Register get_candlestick_patterns tool
server.registerTool('get_candlestick_patterns', {
    title: 'Get Candlestick Patterns',
    description: 'Get candlestick pattern detection for multiple trading tickers at once (e.g., ["BTC", "ETH", "SOL"])',
    inputSchema: {
        tickers: z
            .array(z.string())
            .min(1)
            .describe('Array of asset ticker symbols (e.g., ["BTC", "ETH", "SOL"])'),
    },
    outputSchema: z.object({
        results: z.array(z.object({
            ticker: z.string(),
            price: z.number().nullable(),
            timestamp: z.string().optional(),
            candlestickPatterns: z
                .object({
                patterns: z.array(z.object({
                    type: z.enum(['doji', 'hammer', 'bullish_engulfing', 'bearish_engulfing']),
                    index: z.number(),
                    bullish: z.boolean(),
                })),
                latestPattern: z
                    .object({
                    type: z.enum(['doji', 'hammer', 'bullish_engulfing', 'bearish_engulfing']),
                    index: z.number(),
                    bullish: z.boolean(),
                })
                    .nullable(),
                bullishCount: z.number(),
                bearishCount: z.number(),
            })
                .nullable()
                .optional(),
        })),
        summary: z
            .object({
            total: z.number(),
            found: z.number(),
            notFound: z.number(),
        })
            .optional(),
    }),
}, async ({ tickers }) => {
    if (!Array.isArray(tickers) || tickers.length === 0) {
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        results: [],
                        error: 'Invalid tickers parameter',
                        message: 'Tickers must be a non-empty array of strings',
                    }, null, 2),
                },
            ],
            structuredContent: {
                results: [],
            },
        };
    }
    const normalizedTickers = tickers
        .filter((t) => t && typeof t === 'string' && t.trim().length > 0)
        .map((t) => t.trim().toUpperCase());
    if (normalizedTickers.length === 0) {
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        results: [],
                        error: 'No valid tickers',
                        message: 'All tickers must be non-empty strings',
                    }, null, 2),
                },
            ],
            structuredContent: {
                results: [],
            },
        };
    }
    try {
        if (!process.env.CANDLES_COUNT || parseInt(process.env.CANDLES_COUNT) < 200) {
            process.env.CANDLES_COUNT = '200';
        }
        const { marketDataMap } = await getMarketData(normalizedTickers);
        const results = [];
        for (const ticker of normalizedTickers) {
            const assetData = marketDataMap.get(ticker);
            const price = await getRealTimePrice(ticker).catch(() => null);
            if (!assetData) {
                results.push({
                    ticker,
                    price,
                    timestamp: new Date().toISOString(),
                    candlestickPatterns: formatCandlestickPatterns(null),
                });
                continue;
            }
            const historicalData = assetData?.historicalData || assetData?.data?.historicalData || [];
            if (historicalData.length < 5) {
                results.push({
                    ticker,
                    price,
                    timestamp: new Date().toISOString(),
                    candlestickPatterns: formatCandlestickPatterns(null),
                });
                continue;
            }
            const patterns = detectCandlestickPatterns(historicalData, 5);
            const formattedPatterns = formatCandlestickPatterns(patterns);
            results.push({
                ticker,
                price,
                timestamp: new Date().toISOString(),
                candlestickPatterns: formattedPatterns,
            });
        }
        const found = results.filter((r) => r.candlestickPatterns !== null).length;
        const notFound = results.length - found;
        const result = {
            results,
            summary: {
                total: normalizedTickers.length,
                found,
                notFound,
            },
        };
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(result, null, 2),
                },
            ],
            structuredContent: result,
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        results: [],
                        error: error instanceof Error ? error.message : String(error),
                        message: 'Failed to fetch candlestick patterns',
                    }, null, 2),
                },
            ],
            structuredContent: {
                results: [],
            },
        };
    }
});
// Register get_divergence tool
server.registerTool('get_divergence', {
    title: 'Get Divergence Detection',
    description: 'Get RSI divergence detection for multiple trading tickers at once (e.g., ["BTC", "ETH", "SOL"])',
    inputSchema: {
        tickers: z
            .array(z.string())
            .min(1)
            .describe('Array of asset ticker symbols (e.g., ["BTC", "ETH", "SOL"])'),
    },
    outputSchema: z.object({
        results: z.array(z.object({
            ticker: z.string(),
            price: z.number().nullable(),
            timestamp: z.string().optional(),
            divergence: z
                .object({
                bullishDivergence: z.boolean(),
                bearishDivergence: z.boolean(),
                divergence: z.enum(['bullish', 'bearish']).nullable(),
            })
                .nullable()
                .optional(),
        })),
        summary: z
            .object({
            total: z.number(),
            found: z.number(),
            notFound: z.number(),
        })
            .optional(),
    }),
}, async ({ tickers }) => {
    if (!Array.isArray(tickers) || tickers.length === 0) {
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        results: [],
                        error: 'Invalid tickers parameter',
                        message: 'Tickers must be a non-empty array of strings',
                    }, null, 2),
                },
            ],
            structuredContent: {
                results: [],
            },
        };
    }
    const normalizedTickers = tickers
        .filter((t) => t && typeof t === 'string' && t.trim().length > 0)
        .map((t) => t.trim().toUpperCase());
    if (normalizedTickers.length === 0) {
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        results: [],
                        error: 'No valid tickers',
                        message: 'All tickers must be non-empty strings',
                    }, null, 2),
                },
            ],
            structuredContent: {
                results: [],
            },
        };
    }
    try {
        if (!process.env.CANDLES_COUNT || parseInt(process.env.CANDLES_COUNT) < 200) {
            process.env.CANDLES_COUNT = '200';
        }
        const { marketDataMap } = await getMarketData(normalizedTickers);
        const results = [];
        for (const ticker of normalizedTickers) {
            const assetData = marketDataMap.get(ticker);
            const price = await getRealTimePrice(ticker).catch(() => null);
            if (!assetData) {
                results.push({
                    ticker,
                    price,
                    timestamp: new Date().toISOString(),
                    divergence: null,
                });
                continue;
            }
            const historicalData = assetData?.historicalData || assetData?.data?.historicalData || [];
            if (historicalData.length < 20) {
                results.push({
                    ticker,
                    price,
                    timestamp: new Date().toISOString(),
                    divergence: null,
                });
                continue;
            }
            // Calculate RSI values for divergence detection
            const prices = historicalData.map((d) => d.close);
            const rsiValues = calculateRSI(prices, 14);
            if (rsiValues.length < 20) {
                results.push({
                    ticker,
                    price,
                    timestamp: new Date().toISOString(),
                    divergence: null,
                });
                continue;
            }
            // Use RSI array for divergence detection
            const divergence = detectDivergence(prices, rsiValues, 20);
            const formattedDivergence = formatDivergence(divergence);
            results.push({
                ticker,
                price,
                timestamp: new Date().toISOString(),
                divergence: formattedDivergence,
            });
        }
        const found = results.filter((r) => r.divergence !== null).length;
        const notFound = results.length - found;
        const result = {
            results,
            summary: {
                total: normalizedTickers.length,
                found,
                notFound,
            },
        };
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(result, null, 2),
                },
            ],
            structuredContent: result,
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        results: [],
                        error: error instanceof Error ? error.message : String(error),
                        message: 'Failed to fetch divergence data',
                    }, null, 2),
                },
            ],
            structuredContent: {
                results: [],
            },
        };
    }
});
// Register get_liquidation_levels tool
server.registerTool('get_liquidation_levels', {
    title: 'Get Liquidation Levels',
    description: 'Get liquidation level analysis with heatmap data from HyperScreener for multiple trading tickers at once (e.g., ["BTC", "ETH", "SOL"])',
    inputSchema: {
        tickers: z
            .array(z.string())
            .min(1)
            .describe('Array of asset ticker symbols (e.g., ["BTC", "ETH", "SOL"])'),
        includeHeatmap: z
            .boolean()
            .optional()
            .default(true)
            .describe('Include liquidation heatmap from HyperScreener. Default: true'),
    },
    outputSchema: z.object({
        results: z.array(z.object({
            ticker: z.string(),
            price: z.number().nullable(),
            timestamp: z.string().optional(),
            liquidationLevels: z
                .object({
                clusters: z.object({
                    long: z.array(z.any()),
                    short: z.array(z.any()),
                    nearest: z.any().nullable(),
                    distance: z.number(),
                }),
                liquidityGrab: z.object({
                    detected: z.boolean(),
                    zone: z
                        .object({
                        priceLow: z.number(),
                        priceHigh: z.number(),
                    })
                        .nullable(),
                    side: z.enum(['long', 'short', 'none']),
                }),
                stopHunt: z.object({
                    predicted: z.boolean(),
                    targetPrice: z.number().nullable(),
                    side: z.enum(['long', 'short', 'none']),
                }),
                cascade: z.object({
                    risk: z.enum(['high', 'medium', 'low']),
                    triggerPrice: z.number().nullable(),
                }),
                safeEntry: z.object({
                    zones: z.array(z.object({
                        priceLow: z.number(),
                        priceHigh: z.number(),
                    })),
                    confidence: z.number(),
                }),
            })
                .nullable()
                .optional(),
            liquidationHeatmap: z.any().nullable().optional(),
            recentLiquidations: z.array(z.any()).nullable().optional(),
        })),
        summary: z
            .object({
            total: z.number(),
            found: z.number(),
            notFound: z.number(),
        })
            .optional(),
    }),
}, async ({ tickers, includeHeatmap = true }) => {
    if (!Array.isArray(tickers) || tickers.length === 0) {
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        results: [],
                        error: 'Invalid tickers parameter',
                        message: 'Tickers must be a non-empty array of strings',
                    }, null, 2),
                },
            ],
            structuredContent: {
                results: [],
            },
        };
    }
    const normalizedTickers = tickers
        .filter((t) => t && typeof t === 'string' && t.trim().length > 0)
        .map((t) => t.trim().toUpperCase());
    if (normalizedTickers.length === 0) {
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        results: [],
                        error: 'No valid tickers',
                        message: 'All tickers must be non-empty strings',
                    }, null, 2),
                },
            ],
            structuredContent: {
                results: [],
            },
        };
    }
    try {
        if (!process.env.CANDLES_COUNT || parseInt(process.env.CANDLES_COUNT) < 200) {
            process.env.CANDLES_COUNT = '200';
        }
        // Fetch market data and HyperScreener liquidation data in parallel
        const [{ marketDataMap }, hyperscreenerLiquidations, ...heatmaps] = await Promise.all([
            getMarketData(normalizedTickers),
            includeHeatmap ? getLiquidations('notional_volume', 'desc', 50).catch(() => null) : Promise.resolve(null),
            ...(includeHeatmap
                ? normalizedTickers.map(ticker => getLiquidationHeatmap(ticker, '24h').catch(() => null))
                : normalizedTickers.map(() => Promise.resolve(null)))
        ]);
        // Create liquidations lookup map
        const liquidationsMap = new Map();
        if (hyperscreenerLiquidations && Array.isArray(hyperscreenerLiquidations)) {
            for (const liq of hyperscreenerLiquidations) {
                const symbol = (liq.symbol || liq.coin || '').toUpperCase();
                if (symbol) {
                    if (!liquidationsMap.has(symbol)) {
                        liquidationsMap.set(symbol, []);
                    }
                    liquidationsMap.get(symbol).push(liq);
                }
            }
        }
        const results = [];
        for (let i = 0; i < normalizedTickers.length; i++) {
            const ticker = normalizedTickers[i];
            const assetData = marketDataMap.get(ticker);
            const heatmapData = heatmaps[i];
            const price = await getRealTimePrice(ticker).catch(() => null);
            if (!assetData || !price) {
                results.push({
                    ticker,
                    price,
                    timestamp: new Date().toISOString(),
                    liquidationLevels: null,
                    liquidationHeatmap: heatmapData || null,
                    recentLiquidations: liquidationsMap.get(ticker)?.slice(0, 10) || null,
                });
                continue;
            }
            const futuresData = assetData?.externalData?.futures || assetData?.data?.externalData?.futures || null;
            const liquidationData = futuresData?.liquidation || null;
            if (!liquidationData) {
                results.push({
                    ticker,
                    price,
                    timestamp: new Date().toISOString(),
                    liquidationLevels: null,
                    liquidationHeatmap: heatmapData || null,
                    recentLiquidations: liquidationsMap.get(ticker)?.slice(0, 10) || null,
                });
                continue;
            }
            const liquidation = calculateLiquidationIndicators(liquidationData, price);
            const formattedLiquidation = formatLiquidationLevels(liquidation);
            results.push({
                ticker,
                price,
                timestamp: new Date().toISOString(),
                liquidationLevels: formattedLiquidation,
                liquidationHeatmap: heatmapData || null,
                recentLiquidations: liquidationsMap.get(ticker)?.slice(0, 10) || null,
            });
        }
        const found = results.filter((r) => r.liquidationLevels !== null || r.liquidationHeatmap !== null).length;
        const notFound = results.length - found;
        const result = {
            results,
            summary: {
                total: normalizedTickers.length,
                found,
                notFound,
            },
        };
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(result, null, 2),
                },
            ],
            structuredContent: result,
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        results: [],
                        error: error instanceof Error ? error.message : String(error),
                        message: 'Failed to fetch liquidation levels',
                    }, null, 2),
                },
            ],
            structuredContent: {
                results: [],
            },
        };
    }
});
// Register get_long_short_ratio tool
server.registerTool('get_long_short_ratio', {
    title: 'Get Long/Short Ratio',
    description: 'Get long/short ratio analysis with whale positions and top traders data from HyperScreener for multiple trading tickers at once (e.g., ["BTC", "ETH", "SOL"])',
    inputSchema: {
        tickers: z
            .array(z.string())
            .min(1)
            .describe('Array of asset ticker symbols (e.g., ["BTC", "ETH", "SOL"])'),
        includeWhales: z
            .boolean()
            .optional()
            .default(true)
            .describe('Include whale positions and top traders from HyperScreener. Default: true'),
    },
    outputSchema: z.object({
        results: z.array(z.object({
            ticker: z.string(),
            price: z.number().nullable(),
            timestamp: z.string().optional(),
            longShortRatio: z
                .object({
                sentiment: z.object({
                    overall: z.enum(['extreme_long', 'extreme_short', 'moderate_long', 'moderate_short', 'balanced']),
                    retail: z.enum(['long', 'short', 'balanced']),
                    pro: z.enum(['long', 'short', 'balanced']),
                }),
                contrarian: z.object({
                    signal: z.boolean(),
                    direction: z.enum(['long', 'short', 'neutral']),
                    strength: z.number(),
                }),
                extreme: z.object({
                    detected: z.boolean(),
                    level: z.enum(['extreme_long', 'extreme_short', 'normal']),
                    reversalSignal: z.boolean(),
                }),
                divergence: z.object({
                    retailVsPro: z.number(),
                    signal: z.enum(['follow_pro', 'fade_retail', 'neutral']),
                }),
            })
                .nullable()
                .optional(),
            hyperscreenerRatio: z.number().nullable().optional(),
            whalePositions: z.array(z.any()).nullable().optional(),
            topTraders: z.array(z.any()).nullable().optional(),
        })),
        topTradersOverall: z.array(z.any()).nullable().optional(),
        summary: z
            .object({
            total: z.number(),
            found: z.number(),
            notFound: z.number(),
        })
            .optional(),
    }),
}, async ({ tickers, includeWhales = true }) => {
    if (!Array.isArray(tickers) || tickers.length === 0) {
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        results: [],
                        error: 'Invalid tickers parameter',
                        message: 'Tickers must be a non-empty array of strings',
                    }, null, 2),
                },
            ],
            structuredContent: {
                results: [],
            },
        };
    }
    const normalizedTickers = tickers
        .filter((t) => t && typeof t === 'string' && t.trim().length > 0)
        .map((t) => t.trim().toUpperCase());
    if (normalizedTickers.length === 0) {
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        results: [],
                        error: 'No valid tickers',
                        message: 'All tickers must be non-empty strings',
                    }, null, 2),
                },
            ],
            structuredContent: {
                results: [],
            },
        };
    }
    try {
        if (!process.env.CANDLES_COUNT || parseInt(process.env.CANDLES_COUNT) < 200) {
            process.env.CANDLES_COUNT = '200';
        }
        // Fetch market data and HyperScreener data in parallel
        const [{ marketDataMap }, hyperscreenerLongShort, hyperscreenerWhales, hyperscreenerTopTraders] = await Promise.all([
            getMarketData(normalizedTickers),
            includeWhales ? getHyperscreenerLongShortRatio('notional_value', 'desc', 50).catch(() => null) : Promise.resolve(null),
            includeWhales ? getWhalePositions('notional_value', 'desc', 30).catch(() => null) : Promise.resolve(null),
            includeWhales ? getTopTradersRanking('D', 'pnl', 'desc', 20).catch(() => null) : Promise.resolve(null),
        ]);
        // Create lookup maps
        const longShortMap = new Map();
        const whalesMap = new Map();
        if (hyperscreenerLongShort && Array.isArray(hyperscreenerLongShort)) {
            for (const ls of hyperscreenerLongShort) {
                const symbol = (ls.symbol || ls.coin || '').toUpperCase();
                const ratio = ls.long_short_ratio || ls.longShortRatio || ls.ratio;
                if (symbol && ratio !== undefined) {
                    longShortMap.set(symbol, parseFloat(ratio));
                }
            }
        }
        if (hyperscreenerWhales && Array.isArray(hyperscreenerWhales)) {
            for (const whale of hyperscreenerWhales) {
                const symbol = (whale.symbol || whale.coin || '').toUpperCase();
                if (symbol) {
                    if (!whalesMap.has(symbol)) {
                        whalesMap.set(symbol, []);
                    }
                    whalesMap.get(symbol).push(whale);
                }
            }
        }
        const results = [];
        for (const ticker of normalizedTickers) {
            const assetData = marketDataMap.get(ticker);
            const price = await getRealTimePrice(ticker).catch(() => null);
            if (!assetData) {
                results.push({
                    ticker,
                    price,
                    timestamp: new Date().toISOString(),
                    longShortRatio: null,
                    hyperscreenerRatio: longShortMap.get(ticker) || null,
                    whalePositions: whalesMap.get(ticker)?.slice(0, 10) || null,
                    topTraders: null,
                });
                continue;
            }
            const futuresData = assetData?.externalData?.futures || assetData?.data?.externalData?.futures || null;
            const longShortRatioData = futuresData?.longShortRatio || null;
            if (!longShortRatioData) {
                results.push({
                    ticker,
                    price,
                    timestamp: new Date().toISOString(),
                    longShortRatio: null,
                    hyperscreenerRatio: longShortMap.get(ticker) || null,
                    whalePositions: whalesMap.get(ticker)?.slice(0, 10) || null,
                    topTraders: null,
                });
                continue;
            }
            const ratio = calculateLongShortRatioIndicators(longShortRatioData);
            const formattedRatio = formatLongShortRatio(ratio);
            results.push({
                ticker,
                price,
                timestamp: new Date().toISOString(),
                longShortRatio: formattedRatio,
                hyperscreenerRatio: longShortMap.get(ticker) || null,
                whalePositions: whalesMap.get(ticker)?.slice(0, 10) || null,
                topTraders: null,
            });
        }
        const found = results.filter((r) => r.longShortRatio !== null || r.hyperscreenerRatio !== null).length;
        const notFound = results.length - found;
        const result = {
            results,
            topTradersOverall: hyperscreenerTopTraders || null,
            summary: {
                total: normalizedTickers.length,
                found,
                notFound,
            },
        };
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(result, null, 2),
                },
            ],
            structuredContent: result,
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        results: [],
                        error: error instanceof Error ? error.message : String(error),
                        message: 'Failed to fetch long/short ratio',
                    }, null, 2),
                },
            ],
            structuredContent: {
                results: [],
            },
        };
    }
});
// =============================================================================
// POSITION MANAGEMENT TOOLS
// =============================================================================
// Register get_position tool
server.registerTool('get_position', {
    title: 'Get Position',
    description: 'Get current open positions, account balance, margin info, and PnL from Hyperliquid. Requires MAIN_WALLET_ADDRESS environment variable.',
    inputSchema: {
        walletAddress: z
            .string()
            .optional()
            .describe('Wallet address to check positions for. If not provided, uses MAIN_WALLET_ADDRESS from environment'),
    },
    outputSchema: z.object({
        success: z.boolean(),
        walletAddress: z.string().nullable(),
        accountValue: z.number().nullable(),
        totalMarginUsed: z.number().nullable(),
        totalUnrealizedPnl: z.number().nullable(),
        withdrawable: z.number().nullable(),
        positions: z.array(z.object({
            symbol: z.string(),
            side: z.enum(['LONG', 'SHORT']),
            size: z.number(),
            entryPrice: z.number(),
            markPrice: z.number().nullable(),
            liquidationPrice: z.number().nullable(),
            unrealizedPnl: z.number(),
            unrealizedPnlPercent: z.number().nullable(),
            leverage: z.number().nullable(),
            marginUsed: z.number().nullable(),
            returnOnEquity: z.number().nullable(),
            maxLeverage: z.number().nullable(),
        })),
        openOrders: z.number().nullable(),
        error: z.string().nullable(),
    }),
}, async ({ walletAddress }) => {
    try {
        const address = walletAddress || process.env.MAIN_WALLET_ADDRESS;
        if (!address) {
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: false,
                            walletAddress: null,
                            accountValue: null,
                            totalMarginUsed: null,
                            totalUnrealizedPnl: null,
                            withdrawable: null,
                            positions: [],
                            openOrders: null,
                            error: 'No wallet address provided. Set MAIN_WALLET_ADDRESS environment variable or provide walletAddress parameter.',
                        }, null, 2),
                    },
                ],
                structuredContent: {
                    success: false,
                    walletAddress: null,
                    accountValue: null,
                    totalMarginUsed: null,
                    totalUnrealizedPnl: null,
                    withdrawable: null,
                    positions: [],
                    openOrders: null,
                    error: 'No wallet address provided',
                },
            };
        }
        // Fetch user state from Hyperliquid
        const userState = await getUserState(address);
        if (!userState) {
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: false,
                            walletAddress: address,
                            accountValue: null,
                            totalMarginUsed: null,
                            totalUnrealizedPnl: null,
                            withdrawable: null,
                            positions: [],
                            openOrders: null,
                            error: 'Failed to fetch user state from Hyperliquid',
                        }, null, 2),
                    },
                ],
                structuredContent: {
                    success: false,
                    walletAddress: address,
                    accountValue: null,
                    totalMarginUsed: null,
                    totalUnrealizedPnl: null,
                    withdrawable: null,
                    positions: [],
                    openOrders: null,
                    error: 'Failed to fetch user state',
                },
            };
        }
        // Parse positions
        const assetPositions = userState.assetPositions || [];
        const marginSummary = userState.marginSummary || {};
        const crossMarginSummary = userState.crossMarginSummary || {};
        const positions = assetPositions
            .filter((pos) => {
            const position = pos.position || pos;
            const szi = parseFloat(position.szi || '0');
            return szi !== 0;
        })
            .map((pos) => {
            const position = pos.position || pos;
            const szi = parseFloat(position.szi || '0');
            const entryPx = parseFloat(position.entryPx || '0');
            const unrealizedPnl = parseFloat(position.unrealizedPnl || '0');
            const positionValue = parseFloat(position.positionValue || '0');
            const marginUsed = parseFloat(position.marginUsed || '0');
            const returnOnEquity = parseFloat(position.returnOnEquity || '0');
            const maxLeverage = parseFloat(position.maxLeverage || position.maxTradeLeverage || '0');
            const liquidationPx = position.liquidationPx ? parseFloat(position.liquidationPx) : null;
            // Calculate leverage from position value and margin
            const leverage = marginUsed > 0 ? positionValue / marginUsed : null;
            // Calculate unrealized PnL percent
            const entryValue = Math.abs(szi) * entryPx;
            const unrealizedPnlPercent = entryValue > 0 ? (unrealizedPnl / entryValue) * 100 : null;
            return {
                symbol: position.coin || pos.coin || 'UNKNOWN',
                side: szi > 0 ? 'LONG' : 'SHORT',
                size: Math.abs(szi),
                entryPrice: entryPx,
                markPrice: null, // Would need separate call to get mark price
                liquidationPrice: liquidationPx,
                unrealizedPnl,
                unrealizedPnlPercent,
                leverage,
                marginUsed,
                returnOnEquity: returnOnEquity * 100, // Convert to percentage
                maxLeverage,
            };
        });
        // Calculate totals
        const accountValue = parseFloat(marginSummary.accountValue || crossMarginSummary.accountValue || '0');
        const totalMarginUsed = parseFloat(marginSummary.totalMarginUsed || crossMarginSummary.totalMarginUsed || '0');
        const totalUnrealizedPnl = positions.reduce((sum, p) => sum + p.unrealizedPnl, 0);
        const withdrawable = parseFloat(marginSummary.withdrawable || crossMarginSummary.withdrawable || '0');
        const result = {
            success: true,
            walletAddress: address,
            accountValue,
            totalMarginUsed,
            totalUnrealizedPnl,
            withdrawable,
            positions,
            openOrders: userState.openOrders?.length || 0,
            error: null,
        };
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(result, null, 2),
                },
            ],
            structuredContent: result,
        };
    }
    catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        success: false,
                        walletAddress: walletAddress || process.env.MAIN_WALLET_ADDRESS || null,
                        accountValue: null,
                        totalMarginUsed: null,
                        totalUnrealizedPnl: null,
                        withdrawable: null,
                        positions: [],
                        openOrders: null,
                        error: errorMsg,
                    }, null, 2),
                },
            ],
            structuredContent: {
                success: false,
                walletAddress: walletAddress || process.env.MAIN_WALLET_ADDRESS || null,
                accountValue: null,
                totalMarginUsed: null,
                totalUnrealizedPnl: null,
                withdrawable: null,
                positions: [],
                openOrders: null,
                error: errorMsg,
            },
        };
    }
});
// =============================================================================
// CORRELATION ANALYSIS TOOLS
// =============================================================================
// Register get_correlation_analysis tool
server.registerTool('get_correlation_analysis', {
    title: 'Get Correlation Analysis',
    description: 'Get BTC dominance, altcoin correlation with BTC, beta analysis, and market regime for multiple tickers. Useful for understanding market dynamics and diversification.',
    inputSchema: {
        tickers: z
            .array(z.string())
            .min(1)
            .describe('Array of asset ticker symbols to analyze correlation (e.g., ["ETH", "SOL", "AVAX"])'),
        period: z
            .number()
            .int()
            .min(10)
            .max(100)
            .optional()
            .default(30)
            .describe('Period for correlation calculation (default: 30)'),
    },
    outputSchema: z.object({
        timestamp: z.number(),
        btcDominance: z.object({
            dominance: z.number(),
            dominanceChange24h: z.number(),
            dominanceTrend: z.enum(['increasing', 'decreasing', 'stable']),
            altcoinSeasonSignal: z.enum(['altcoin_season', 'btc_season', 'neutral']),
            interpretation: z.string(),
        }).nullable(),
        altcoinCorrelations: z.array(z.object({
            ticker: z.string(),
            correlationWithBTC: z.object({
                correlation: z.number(),
                strength: z.string(),
                direction: z.string(),
            }).nullable(),
            beta: z.number().nullable(),
            relativeStrength: z.number().nullable(),
            decouplingSignal: z.enum(['decoupled', 'coupled', 'weakly_coupled']),
            interpretation: z.string(),
        })),
        marketCorrelationAverage: z.number().nullable(),
        marketRegime: z.enum(['risk_on', 'risk_off', 'neutral']),
        tradingRecommendation: z.string(),
        error: z.string().nullable(),
    }),
}, async ({ tickers, period = 30 }) => {
    if (!Array.isArray(tickers) || tickers.length === 0) {
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        timestamp: Date.now(),
                        btcDominance: null,
                        altcoinCorrelations: [],
                        marketCorrelationAverage: null,
                        marketRegime: 'neutral',
                        tradingRecommendation: 'Invalid tickers parameter',
                        error: 'Tickers must be a non-empty array of strings',
                    }, null, 2),
                },
            ],
            structuredContent: {
                timestamp: Date.now(),
                btcDominance: null,
                altcoinCorrelations: [],
                marketCorrelationAverage: null,
                marketRegime: 'neutral',
                tradingRecommendation: 'Invalid tickers parameter',
                error: 'Invalid tickers parameter',
            },
        };
    }
    try {
        // Normalize tickers and ensure BTC is included
        const normalizedTickers = tickers
            .filter((t) => t && typeof t === 'string' && t.trim().length > 0)
            .map((t) => t.trim().toUpperCase());
        const allTickers = normalizedTickers.includes('BTC')
            ? normalizedTickers
            : ['BTC', ...normalizedTickers];
        // Fetch market data for all tickers including BTC
        const { marketDataMap } = await getMarketData(allTickers);
        // Extract price arrays
        const priceDataMap = new Map();
        for (const ticker of allTickers) {
            const assetData = marketDataMap.get(ticker);
            const historicalData = assetData?.historicalData || assetData?.data?.historicalData || [];
            if (historicalData.length > 0) {
                const prices = historicalData.map((d) => d.close || d.price).filter((p) => p > 0);
                priceDataMap.set(ticker, prices);
            }
        }
        const btcPrices = priceDataMap.get('BTC') || [];
        if (btcPrices.length < period) {
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            timestamp: Date.now(),
                            btcDominance: await fetchBTCDominance(),
                            altcoinCorrelations: [],
                            marketCorrelationAverage: null,
                            marketRegime: 'neutral',
                            tradingRecommendation: 'Insufficient BTC price data for correlation analysis',
                            error: 'Insufficient BTC price data',
                        }, null, 2),
                    },
                ],
                structuredContent: {
                    timestamp: Date.now(),
                    btcDominance: null,
                    altcoinCorrelations: [],
                    marketCorrelationAverage: null,
                    marketRegime: 'neutral',
                    tradingRecommendation: 'Insufficient data',
                    error: 'Insufficient BTC price data',
                },
            };
        }
        // Perform correlation analysis
        const result = await performCorrelationAnalysis(normalizedTickers, priceDataMap, btcPrices, period);
        // Format for output
        const formattedResult = {
            timestamp: result.timestamp,
            btcDominance: result.btcDominance,
            altcoinCorrelations: result.altcoinCorrelations.map(c => ({
                ticker: c.ticker,
                correlationWithBTC: c.correlationWithBTC ? {
                    correlation: c.correlationWithBTC.correlation,
                    strength: c.correlationWithBTC.strength,
                    direction: c.correlationWithBTC.direction,
                } : null,
                beta: c.beta,
                relativeStrength: c.relativeStrength,
                decouplingSignal: c.decouplingSignal,
                interpretation: c.interpretation,
            })),
            marketCorrelationAverage: result.marketCorrelationAverage,
            marketRegime: result.marketRegime,
            tradingRecommendation: result.tradingRecommendation,
            error: null,
        };
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(formattedResult, null, 2),
                },
            ],
            structuredContent: formattedResult,
        };
    }
    catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        timestamp: Date.now(),
                        btcDominance: null,
                        altcoinCorrelations: [],
                        marketCorrelationAverage: null,
                        marketRegime: 'neutral',
                        tradingRecommendation: 'Error performing correlation analysis',
                        error: errorMsg,
                    }, null, 2),
                },
            ],
            structuredContent: {
                timestamp: Date.now(),
                btcDominance: null,
                altcoinCorrelations: [],
                marketCorrelationAverage: null,
                marketRegime: 'neutral',
                tradingRecommendation: 'Error',
                error: errorMsg,
            },
        };
    }
});
// =============================================================================
// WHALE TRACKING & TIER CLASSIFICATION TOOLS
// =============================================================================
// In-memory cache for position change detection
const walletPositionCache = new Map();
// Register get_whale_position tool
server.registerTool('get_whale_position', {
    title: 'Get Whale Position',
    description: 'Track positions from specific wallet addresses with labeling support. Can also include top whales from HyperScreener. Supports change detection alerts.',
    inputSchema: {
        wallets: z
            .array(z.object({
            address: z.string().describe('Wallet address to track'),
            label: z.string().optional().describe('Optional label for the wallet (e.g., "Smart Money 1", "Competitor A")'),
        }))
            .optional()
            .describe('Array of wallet objects with address and optional label'),
        includeHyperscreener: z
            .boolean()
            .optional()
            .default(false)
            .describe('Include top whales from HyperScreener data'),
        hyperscreenerLimit: z
            .number()
            .int()
            .min(1)
            .max(50)
            .optional()
            .default(10)
            .describe('Number of top whales to fetch from HyperScreener (default: 10)'),
        tickers: z
            .array(z.string())
            .optional()
            .describe('Optional filter by tickers (e.g., ["BTC", "ETH"])'),
        detectChanges: z
            .boolean()
            .optional()
            .default(true)
            .describe('Enable change detection alerts (compares with previous call)'),
    },
    outputSchema: z.object({
        timestamp: z.number(),
        trackedWallets: z.array(z.any()),
        hyperscreenerWhales: z.array(z.any()).nullable(),
        changes: z.array(z.any()).nullable(),
        summary: z.object({
            totalWalletsTracked: z.number(),
            manualWallets: z.number(),
            hyperscreenerWallets: z.number(),
            combinedNotional: z.number(),
            changesDetected: z.number(),
        }),
        error: z.string().nullable(),
    }),
}, async ({ wallets, includeHyperscreener = false, hyperscreenerLimit = 10, tickers, detectChanges = true }) => {
    try {
        const trackedWallets = [];
        const allChanges = [];
        let combinedNotional = 0;
        // Normalize tickers filter
        const tickerFilter = tickers?.map(t => t.toUpperCase()) || null;
        // Process manual wallets
        if (wallets && wallets.length > 0) {
            for (const wallet of wallets) {
                try {
                    const userState = await getUserState(wallet.address);
                    if (!userState)
                        continue;
                    const assetPositions = userState.assetPositions || [];
                    const positions = [];
                    let walletNotional = 0;
                    for (const pos of assetPositions) {
                        const position = pos.position || pos;
                        const szi = parseFloat(position.szi || '0');
                        if (szi === 0)
                            continue;
                        const symbol = position.coin || pos.coin || 'UNKNOWN';
                        // Apply ticker filter
                        if (tickerFilter && !tickerFilter.includes(symbol.toUpperCase()))
                            continue;
                        const entryPx = parseFloat(position.entryPx || '0');
                        const currentPx = parseFloat(position.positionValue || '0') / Math.abs(szi) || entryPx;
                        const notional = Math.abs(szi) * currentPx;
                        const unrealizedPnl = parseFloat(position.unrealizedPnl || '0');
                        const pnlPercent = entryPx > 0 ? ((currentPx - entryPx) / entryPx) * 100 * (szi > 0 ? 1 : -1) : 0;
                        const leverage = parseFloat(position.leverage || '1');
                        const tier = getTierByNotional(notional);
                        positions.push({
                            address: wallet.address,
                            symbol,
                            side: szi > 0 ? 'LONG' : 'SHORT',
                            size: Math.abs(szi),
                            notionalValue: notional,
                            entryPrice: entryPx,
                            currentPrice: currentPx,
                            unrealizedPnl,
                            pnlPercent,
                            leverage,
                            tier: getTierLabel(notional),
                            tierEmoji: tier.emoji,
                            tierName: tier.name,
                        });
                        walletNotional += notional;
                    }
                    // Calculate wallet tier based on total notional
                    const walletTier = getTierByNotional(walletNotional);
                    // Change detection
                    if (detectChanges) {
                        const cacheKey = wallet.address.toLowerCase();
                        const cached = walletPositionCache.get(cacheKey);
                        if (cached) {
                            const changes = detectPositionChanges(cached.positions, positions, wallet.address);
                            allChanges.push(...changes);
                        }
                        // Update cache
                        walletPositionCache.set(cacheKey, {
                            positions: positions,
                            timestamp: Date.now()
                        });
                    }
                    trackedWallets.push({
                        address: wallet.address,
                        label: wallet.label || null,
                        source: 'manual',
                        tier: getTierLabel(walletNotional),
                        tierEmoji: walletTier.emoji,
                        accountValue: parseFloat(userState.marginSummary?.accountValue || userState.crossMarginSummary?.accountValue || '0'),
                        totalNotional: walletNotional,
                        positions,
                    });
                    combinedNotional += walletNotional;
                }
                catch (walletError) {
                    console.error(`Error fetching wallet ${wallet.address}:`, walletError);
                }
            }
        }
        // Process HyperScreener whales
        let hyperscreenerWhales = null;
        if (includeHyperscreener) {
            try {
                const whalePositions = await getHyperscreenerWhalePositions('notional_value', 'desc', hyperscreenerLimit * 3);
                // Group by address
                const whaleMap = new Map();
                for (const pos of whalePositions) {
                    const symbol = pos.asset_name || pos.symbol;
                    // Apply ticker filter
                    if (tickerFilter && !tickerFilter.includes(symbol.toUpperCase()))
                        continue;
                    const address = pos.address;
                    if (!whaleMap.has(address)) {
                        whaleMap.set(address, []);
                    }
                    whaleMap.get(address).push(pos);
                }
                hyperscreenerWhales = [];
                let count = 0;
                for (const [address, positions] of whaleMap) {
                    if (count >= hyperscreenerLimit)
                        break;
                    // Skip if already in manual wallets
                    if (wallets?.some(w => w.address.toLowerCase() === address.toLowerCase()))
                        continue;
                    let totalNotional = 0;
                    const formattedPositions = [];
                    for (const pos of positions) {
                        const notional = pos.notional_value || 0;
                        totalNotional += notional;
                        const tier = getTierByNotional(notional);
                        formattedPositions.push({
                            address,
                            symbol: pos.asset_name || pos.symbol,
                            side: pos.direction || pos.side,
                            size: pos.size || 0,
                            notionalValue: notional,
                            entryPrice: pos.entry_price || 0,
                            currentPrice: pos.current_price || 0,
                            unrealizedPnl: pos.unrealized_pnl || 0,
                            pnlPercent: pos.pnl_percent || 0,
                            leverage: pos.leverage || 1,
                            tier: getTierLabel(notional),
                            tierEmoji: tier.emoji,
                            tierName: tier.name,
                        });
                    }
                    const walletTier = getTierByNotional(totalNotional);
                    hyperscreenerWhales.push({
                        address,
                        label: null,
                        source: 'hyperscreener',
                        tier: getTierLabel(totalNotional),
                        tierEmoji: walletTier.emoji,
                        accountValue: totalNotional, // Approximate
                        totalNotional,
                        positions: formattedPositions,
                    });
                    combinedNotional += totalNotional;
                    count++;
                }
            }
            catch (hsError) {
                console.error('Error fetching HyperScreener whales:', hsError);
            }
        }
        const result = {
            timestamp: Date.now(),
            trackedWallets,
            hyperscreenerWhales,
            changes: allChanges.length > 0 ? allChanges : null,
            summary: {
                totalWalletsTracked: trackedWallets.length + (hyperscreenerWhales?.length || 0),
                manualWallets: trackedWallets.length,
                hyperscreenerWallets: hyperscreenerWhales?.length || 0,
                combinedNotional,
                changesDetected: allChanges.length,
            },
            error: null,
        };
        return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            structuredContent: result,
        };
    }
    catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return {
            content: [{ type: 'text', text: JSON.stringify({ error: errorMsg }, null, 2) }],
            structuredContent: {
                timestamp: Date.now(),
                trackedWallets: [],
                hyperscreenerWhales: null,
                changes: null,
                summary: { totalWalletsTracked: 0, manualWallets: 0, hyperscreenerWallets: 0, combinedNotional: 0, changesDetected: 0 },
                error: errorMsg,
            },
        };
    }
});
// Register get_tier_classification tool
server.registerTool('get_tier_classification', {
    title: 'Get Tier Classification',
    description: 'Get market breakdown by trader tier (Shrimp to Institutional) for given tickers. Shows count, notional, and wallet addresses per tier with Long/Short breakdown.',
    inputSchema: {
        tickers: z
            .array(z.string())
            .min(1)
            .describe('Array of ticker symbols to analyze (e.g., ["BTC", "ETH", "SOL"])'),
        limit: z
            .number()
            .int()
            .min(50)
            .max(500)
            .optional()
            .default(200)
            .describe('Maximum positions to fetch per ticker (default: 200)'),
    },
    outputSchema: z.object({
        timestamp: z.number(),
        results: z.record(z.string(), z.any()),
        tierDefinitions: z.array(z.object({
            name: z.string(),
            emoji: z.string(),
            range: z.string(),
        })),
        error: z.string().nullable(),
    }),
}, async ({ tickers, limit = 200 }) => {
    if (!Array.isArray(tickers) || tickers.length === 0) {
        return {
            content: [{ type: 'text', text: JSON.stringify({ error: 'Invalid tickers parameter' }, null, 2) }],
            structuredContent: {
                timestamp: Date.now(),
                results: {},
                tierDefinitions: TRADER_TIERS.map(t => ({
                    name: t.name,
                    emoji: t.emoji,
                    range: t.maxNotional === Infinity ? `> $${(t.minNotional / 1000).toFixed(0)}K` : `$${(t.minNotional / 1000).toFixed(0)}K - $${(t.maxNotional / 1000).toFixed(0)}K`
                })),
                error: 'Invalid tickers parameter',
            },
        };
    }
    try {
        const normalizedTickers = tickers.map(t => t.trim().toUpperCase());
        const results = {};
        for (const ticker of normalizedTickers) {
            try {
                // Fetch positions from HyperScreener
                const positions = await getPositionsBySymbol(ticker, 'notional_value', 'desc', limit);
                if (positions.length === 0) {
                    results[ticker] = {
                        error: 'No positions found',
                        totalPositions: 0,
                        breakdown: {},
                    };
                    continue;
                }
                // Classify positions by tier
                const classification = classifyPositionsByTier(positions, ticker);
                // Format breakdown with top wallets (sorted by notional desc)
                const formattedBreakdown = {};
                for (const tier of classification.breakdown) {
                    const key = `${tier.emoji} ${tier.tierName}`;
                    formattedBreakdown[key] = {
                        count: tier.total.count,
                        notional: tier.total.notional,
                        pct: parseFloat(tier.total.percentage.toFixed(2)),
                        long: {
                            count: tier.long.count,
                            notional: tier.long.notional,
                            topWallets: tier.long.topWallets.map(w => ({
                                address: w.address,
                                notional: w.notional,
                            })),
                        },
                        short: {
                            count: tier.short.count,
                            notional: tier.short.notional,
                            topWallets: tier.short.topWallets.map(w => ({
                                address: w.address,
                                notional: w.notional,
                            })),
                        },
                    };
                }
                results[ticker] = {
                    totalPositions: classification.totalPositions,
                    totalNotional: classification.totalNotional,
                    breakdown: formattedBreakdown,
                    dominance: classification.dominance.retailVsWhale,
                    topTier: `${classification.dominance.topTierEmoji} ${classification.dominance.topTier}`,
                    whaleConcentration: parseFloat(classification.dominance.whaleConcentration.toFixed(2)),
                    institutionalConcentration: parseFloat(classification.dominance.institutionalConcentration.toFixed(2)),
                    longVsShort: {
                        longCount: classification.longVsShort.longCount,
                        shortCount: classification.longVsShort.shortCount,
                        longNotional: classification.longVsShort.longNotional,
                        shortNotional: classification.longVsShort.shortNotional,
                        ratio: parseFloat(classification.longVsShort.ratio.toFixed(2)),
                    },
                };
            }
            catch (tickerError) {
                results[ticker] = {
                    error: tickerError instanceof Error ? tickerError.message : String(tickerError),
                    totalPositions: 0,
                    breakdown: {},
                };
            }
        }
        const result = {
            timestamp: Date.now(),
            results,
            tierDefinitions: TRADER_TIERS.map(t => ({
                name: t.name,
                emoji: t.emoji,
                range: t.maxNotional === Infinity
                    ? `> $${(t.minNotional / 1000000).toFixed(1)}M`
                    : t.minNotional >= 1000000
                        ? `$${(t.minNotional / 1000000).toFixed(1)}M - $${(t.maxNotional / 1000000).toFixed(1)}M`
                        : `$${(t.minNotional / 1000).toFixed(0)}K - $${(t.maxNotional / 1000).toFixed(0)}K`
            })),
            error: null,
        };
        return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            structuredContent: result,
        };
    }
    catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return {
            content: [{ type: 'text', text: JSON.stringify({ error: errorMsg }, null, 2) }],
            structuredContent: {
                timestamp: Date.now(),
                results: {},
                tierDefinitions: TRADER_TIERS.map(t => ({
                    name: t.name,
                    emoji: t.emoji,
                    range: `$${t.minNotional} - $${t.maxNotional}`
                })),
                error: errorMsg,
            },
        };
    }
});
// =============================================================================
// DEPRECATED: Individual tools below have been merged into unified tools
// These are kept for backward compatibility but will be removed in future versions
// New unified tools: moving_averages, oscillators, volume_indicators,
//                   volatility_indicators, channels, pivot_points, trend_indicators
// =============================================================================
// Register Resources
server.registerResource('trading-strategies', 'geartrade://docs/trading-strategies', {
    description: 'Comprehensive guide on trading strategies, technical analysis, and best practices for using GearTrade MCP Server',
    mimeType: 'text/markdown',
}, async () => {
    return {
        contents: [
            {
                uri: 'geartrade://docs/trading-strategies',
                mimeType: 'text/markdown',
                text: `# Trading Strategies Guide

## Overview

GearTrade MCP Server provides comprehensive tools for crypto trading analysis and execution. This guide covers effective trading strategies using the available tools.

## Recommended Workflow

### 1. Comprehensive Analysis
Start with systematic data gathering using specialized tools:

**Price & Market Data:**
- \`get_price\` - Current price, 24h change, market cap
- \`get_volume_analysis\` - Volume patterns, buy/sell pressure
- \`get_External_data\` - Funding rates, open interest, market sentiment

**Technical Analysis:**
- \`get_indicators\` - RSI, MACD, moving averages, momentum
- \`get_market_structure\` - Trend bias, support/resistance
- \`get_candlestick_patterns\` - Chart patterns, reversal signals
- \`get_fibonacci\` - Fibonacci retracements, golden ratio levels

### 2. Signal Identification
Look for high-confidence signals:
- **BUY Signals**: RSI oversold (<30), bullish divergence, support bounce, positive CVD trend
- **SELL Signals**: RSI overbought (>70), bearish divergence, resistance rejection, negative CVD trend
- **Multi-timeframe alignment**: Daily, 4H, and 1H all trending in same direction = higher confidence

### 3. Risk Management
Before execution, calculate:
- Position size based on capital and risk percentage
- Stop loss level (typically 1-3% from entry)
- Take profit level (aim for 2:1 or 3:1 risk/reward ratio)
- Maximum leverage (consider volatility and market conditions)

### 4. Execution
- Always test on TESTNET first using \`hyperliquid_testnet_futures_trade\`
- Get user confirmation before live execution
- Monitor positions after execution using \`get_position\`

## Technical Analysis Strategies

### Trend Following
1. Use \`get_Multitimeframe\` to identify trend alignment
2. Enter on pullbacks to support (for uptrends) or resistance (for downtrends)
3. Use Fibonacci retracement levels from \`get_fibonacci\` for entry zones
4. Confirm with volume analysis showing accumulation/distribution

### Mean Reversion
1. Identify overbought/oversold conditions using RSI from \`get_indicators\`
2. Look for divergence signals from \`get_divergence\`
3. Check order book depth for support/resistance zones
4. Enter when price reaches extreme levels with reversal candlestick patterns

### Breakout Trading
1. Identify consolidation zones using \`get_volume_profile\` (HVN/LVN)
2. Monitor order book depth for liquidity clusters
3. Wait for volume confirmation on breakout
4. Use liquidation levels to identify potential stop hunt zones

## Volume-Based Strategies

### CVD (Cumulative Volume Delta) Trading
- Positive CVD trend = buying pressure = bullish
- Negative CVD trend = selling pressure = bearish
- Use \`get_volume_analysis\` to track CVD trends
- Enter when CVD diverges from price (early signal)

### Volume Profile Trading
- POC (Point of Control) = high volume price level = strong support/resistance
- VAH/VAL = value area boundaries
- Trade from HVN to LVN (high volume to low volume)
- Use \`get_volume_profile\` for session and composite profiles

## Risk Management Best Practices

1. **Never risk more than 1-2% of capital per trade**
2. **Always set stop loss** - use \`calculate_risk_management\` tool
3. **Use position sizing** - use \`calculate_position_setup\` tool
4. **Monitor MAE (Maximum Adverse Excursion)** - track with \`get_position\`
5. **Diversify** - don't put all capital in one trade
6. **Respect leverage limits** - higher leverage = higher risk

## Advanced Analysis Tools

### Fibonacci Retracement
- Use swing highs/lows to identify key retracement levels
- 38.2%, 50%, 61.8% are common support/resistance zones
- Combine with volume profile for confirmation

### Order Book Depth
- Monitor bid/ask imbalance for short-term direction
- Large orders at specific levels = support/resistance
- Spread analysis indicates market liquidity

### Liquidation Levels
- Identify where stop losses are clustered
- Price often moves to liquidate positions before reversing
- Use safe entry zones to avoid stop hunts

### Long/Short Ratio
- Extreme ratios (>70% long or short) = contrarian signal
- Divergence between ratio and price = reversal potential
- Monitor sentiment shifts

## Execution Safety

1. **Always test with paper trading first**
2. **Get explicit user confirmation** before live execution
3. **Start with small position sizes**
4. **Monitor positions actively** after execution
5. **Use multiple timeframes** for confirmation
6. **Respect market conditions** - avoid trading during high volatility or low liquidity

## Common Mistakes to Avoid

1. ❌ Trading without stop loss
2. ❌ Over-leveraging (using too high leverage)
3. ❌ Ignoring volume analysis
4. ❌ Trading against the trend
5. ❌ Not waiting for confirmation signals
6. ❌ Emotional trading (FOMO, revenge trading)
7. ❌ Ignoring risk/reward ratios
8. ❌ Not monitoring open positions

## Tools Quick Reference (58 Tools)

### Market Data Tools
- **Price**: \`get_price\`
- **Technical Analysis**: \`get_indicators\`
- **Volume**: \`get_volume_analysis\`, \`get_volume_profile\`
- **Multi-timeframe**: \`get_Multitimeframe\`
- **Market Analysis**: \`get_market_structure\`, \`get_market_regime\`, \`get_candlestick_patterns\`, \`get_divergence\`
- **External Data**: \`get_External_data\`, \`get_orderbook_depth\`, \`get_liquidation_levels\`, \`get_long_short_ratio\`

### Position & Risk Tools
- **Position**: \`get_position\`, \`get_whale_position\`, \`get_tier_classification\`
- **Risk**: \`calculate_risk_management\`, \`calculate_position_setup\`
- **Correlation**: \`get_correlation_analysis\`

### Execution Tools
- **Testnet**: \`hyperliquid_testnet_futures_trade\`
- **Mainnet**: \`hyperliquid_mainnet_futures_trade\`

### Technical Indicator Tools (32)
- **Moving Averages**: \`double_ema\`, \`triple_ema\`, \`hull_ma\`, \`weighted_ma\`, \`smoothed_ma\`, \`vwma\`, \`kaufman_adaptive_ma\`, \`mcginley_dynamic\`, \`rainbow_ma\`, \`ma_envelope\`
- **Oscillators**: \`stochastic_rsi\`, \`chande_momentum\`, \`percentage_price_oscillator\`, \`accelerator_oscillator\`, \`awesome_oscillator\`, \`gator_oscillator\`, \`elder_ray\`, \`fisher_transform\`, \`know_sure_thing\`, \`schaff_trend_cycle\`, \`coppock_curve\`, \`true_strength_index\`, \`relative_vigor_index\`, \`detrended_price\`, \`momentum\`, \`rate_of_change\`, \`ultimate_oscillator\`, \`trix\`
- **Volume**: \`volume_indicators\`
- **Volatility**: \`volatility_indicators\`
- **Channels**: \`channels\`
- **Pivots**: \`pivot_points\`
- **Trend**: \`trend_indicators\`
- **Patterns**: \`patterns\`
- **Strength**: \`strength_indicators\`

### AI Memory Tools (8) - NEW
- **Preferences**: \`memory_save_preference\`
- **Trade Journal**: \`memory_log_trade\`
- **Insights**: \`memory_get_insights\`, \`memory_check_pattern\`
- **Notes**: \`memory_remember\`, \`memory_recall\`
- **Management**: \`memory_get_all\`, \`memory_delete\`
`,
            },
        ],
    };
});
server.registerResource('risk-management', 'geartrade://docs/risk-management', {
    description: 'Guide on risk management, position sizing, stop loss, and take profit strategies',
    mimeType: 'text/markdown',
}, async () => {
    return {
        contents: [
            {
                uri: 'geartrade://docs/risk-management',
                mimeType: 'text/markdown',
                text: `# Risk Management Guide

## Overview

Proper risk management is essential for successful trading. This guide covers position sizing, stop loss, take profit, and leverage management using GearTrade MCP Server tools.

## Position Sizing

### Basic Principles
- **Risk per trade**: Never risk more than 1-2% of total capital per trade
- **Position size calculation**: Use \`calculate_position_setup\` tool
- **Capital allocation**: Reserve 20-30% of capital for margin requirements

### Position Sizing Formula
\`\`\`
Position Size = (Capital × Risk %) / (Entry Price - Stop Loss Price)
\`\`\`

### Example
- Capital: $10,000
- Risk: 1% = $100
- Entry: $50,000
- Stop Loss: $49,000 (2% below entry)
- Position Size: $100 / $1,000 = 0.1 BTC

## Stop Loss Strategies

### Fixed Percentage Stop Loss
- Conservative: 1-2% from entry
- Moderate: 2-3% from entry
- Aggressive: 3-5% from entry

### Technical Stop Loss
- Below support level (for longs)
- Above resistance level (for shorts)
- Below/above key Fibonacci levels
- Below/above volume profile POC

### ATR-Based Stop Loss
- Use ATR (Average True Range) from technical indicators
- Stop Loss = Entry ± (2 × ATR) for volatility-adjusted stops

### Using calculate_risk_management Tool
The \`calculate_risk_management\` tool automatically calculates:
- Optimal stop loss level
- Take profit level
- Risk/reward ratio
- Position risk percentage

## Take Profit Strategies

### Risk/Reward Ratio
- **Minimum**: 1:1 (break-even after fees)
- **Recommended**: 2:1 or 3:1
- **Aggressive**: 4:1 or higher

### Multiple Take Profit Levels
1. **TP1**: 1:1 risk/reward (secure partial profit)
2. **TP2**: 2:1 risk/reward (let winners run)
3. **TP3**: 3:1 risk/reward (trailing stop)

### Technical Take Profit
- At resistance level (for longs)
- At support level (for shorts)
- At Fibonacci extension levels
- At volume profile VAH/VAL

## Leverage Management

### Leverage Guidelines
- **Conservative**: 1x-3x leverage
- **Moderate**: 3x-5x leverage
- **Aggressive**: 5x-10x leverage
- **Maximum**: Never exceed 10x for most traders

### Leverage Calculation
Use \`calculate_position_setup\` tool to determine:
- Required margin
- Maximum leverage based on capital
- Position quantity with leverage

### Dynamic Leverage
- **High volatility**: Reduce leverage (1x-3x)
- **Low volatility**: Can use higher leverage (3x-5x)
- **Trending markets**: Moderate leverage (3x-5x)
- **Ranging markets**: Lower leverage (1x-3x)

## Margin Management

### Margin Requirements
- **Initial Margin**: Required to open position
- **Maintenance Margin**: Required to keep position open
- **Liquidation Price**: Price where position gets liquidated

### Margin Safety
- Always maintain 20-30% buffer above maintenance margin
- Monitor margin ratio using \`get_position\` tool
- Reduce position size if margin ratio drops below 150%

## Maximum Adverse Excursion (MAE)

### What is MAE?
MAE measures the maximum unfavorable price movement after entry, even if the trade eventually becomes profitable.

### Using MAE
- Track MAE with \`get_position\` tool
- High MAE = poor entry timing
- Low MAE = good entry timing
- Use MAE to refine entry strategies

### MAE Analysis
- **MAE < Stop Loss**: Good entry, trade went as planned
- **MAE > Stop Loss but trade profitable**: Entry could be improved
- **MAE > Stop Loss and trade lost**: Entry was poor, review strategy

## Risk/Reward Ratio

### Calculation
\`\`\`
Risk/Reward Ratio = (Take Profit - Entry) / (Entry - Stop Loss)
\`\`\`

### Guidelines
- **Minimum**: 1:1 (break-even after fees)
- **Good**: 2:1 (profitable long-term)
- **Excellent**: 3:1 or higher

### Using calculate_risk_management
The tool automatically calculates optimal risk/reward ratios based on:
- Entry price
- Support/resistance levels
- Volatility (ATR)
- Market structure

## Portfolio Risk Management

### Capital Allocation
- **Per trade risk**: 1-2% of total capital
- **Total open positions**: Maximum 5-10 positions
- **Maximum portfolio risk**: 10-20% of total capital

### Diversification
- Don't put all capital in one asset
- Spread risk across different cryptocurrencies
- Consider correlation between assets

### Correlation Risk
- BTC and ETH are highly correlated
- Altcoins often follow BTC
- Diversify across different market segments

## Position Monitoring

### Active Monitoring
- Use \`get_position\` to track:
  - Unrealized PnL
  - MAE (Maximum Adverse Excursion)
  - Current price vs entry
  - Distance to stop loss/take profit

### Position Adjustments
- **Trailing Stop**: Move stop loss to breakeven after TP1 hit
- **Partial Close**: Close 50% at TP1, let rest run to TP2
- **Add to Position**: Only if original trade is profitable

## Common Risk Management Mistakes

1. ❌ **No stop loss**: Always set stop loss
2. ❌ **Too wide stop loss**: Defeats purpose of risk management
3. ❌ **Too tight stop loss**: Gets stopped out by noise
4. ❌ **Over-leveraging**: Using too high leverage
5. ❌ **Averaging down**: Adding to losing positions
6. ❌ **Ignoring MAE**: Not learning from trade analysis
7. ❌ **Emotional exits**: Closing positions based on fear/greed
8. ❌ **No position sizing**: Trading without calculating position size

## Tools for Risk Management

- **\`calculate_position_setup\`**: Calculate position size, leverage, margin
- **\`calculate_risk_management\`**: Calculate stop loss, take profit, risk/reward
- **\`get_position\`**: Monitor open positions, PnL, MAE
- **\`get_indicators\`**: Get ATR for volatility-based stops
- **\`get_market_structure\`**: Identify support/resistance for stop placement
- **\`memory_save_preference\`**: Save your risk settings for AI to remember
- **\`memory_log_trade\`**: Log trades with lessons for pattern learning

## Best Practices

1. ✅ Always calculate position size before trading
2. ✅ Always set stop loss (use calculate_risk_management)
3. ✅ Aim for minimum 2:1 risk/reward ratio
4. ✅ Monitor positions actively
5. ✅ Review MAE after each trade
6. ✅ Adjust leverage based on volatility
7. ✅ Maintain margin buffer
8. ✅ Diversify across assets
9. ✅ Never risk more than 2% per trade
10. ✅ Keep detailed trade journal
`,
            },
        ],
    };
});
server.registerResource('tools-overview', 'geartrade://docs/tools-overview', {
    description: 'Complete overview of all 58 MCP tools available in GearTrade',
    mimeType: 'text/markdown',
}, async () => {
    return {
        contents: [
            {
                uri: 'geartrade://docs/tools-overview',
                mimeType: 'text/markdown',
                text: `# Tools Overview

## Complete List of 58 MCP Tools

### Market Data Tools (18)
- **\`get_price\`**: Get latest prices for multiple tickers
- **\`get_indicators\`**: Comprehensive technical indicators (RSI, EMA, MACD, Bollinger Bands, ATR, ADX, etc.)
- **\`get_volume_analysis\`**: Buy/sell volume, POC, VAH/VAL, HVN/LVN, CVD, liquidity zones
- **\`get_volume_profile\`**: Volume profile analysis (POC, VAH, VAL)
- **\`get_Multitimeframe\`**: Multi-timeframe trend alignment analysis
- **\`get_market_structure\`**: Market structure and swing points
- **\`get_market_regime\`**: Market conditions (trending/choppy/volatile)
- **\`get_candlestick_patterns\`**: Candlestick pattern recognition
- **\`get_divergence\`**: RSI divergence detection
- **\`get_External_data\`**: Funding rates, open interest, liquidations
- **\`get_orderbook_depth\`**: Order book depth analysis
- **\`get_liquidation_levels\`**: Liquidation clusters and zones
- **\`get_long_short_ratio\`**: Long/short sentiment with whale data
- **\`get_position\`**: Current positions, balance, PnL
- **\`get_whale_position\`**: Track whale wallet positions
- **\`get_tier_classification\`**: Market breakdown by trader tier
- **\`get_correlation_analysis\`**: BTC dominance, altcoin correlation
- **\`calculate_risk_management\`**: Stop loss, take profit, R:R calculation
- **\`calculate_position_setup\`**: Position sizing calculations
### Execution Tools (2)
- **\`hyperliquid_testnet_futures_trade\`**: Execute futures trades on Hyperliquid TESTNET
- **\`hyperliquid_mainnet_futures_trade\`**: Execute REAL futures trades on Hyperliquid MAINNET

### Technical Indicator Tools (32)

#### Moving Averages (10)
- **\`double_ema\`**: Double Exponential Moving Average - reduced lag
- **\`triple_ema\`**: Triple Exponential Moving Average - smooth trend
- **\`hull_ma\`**: Hull Moving Average - smooth trend identification
- **\`weighted_ma\`**: Weighted Moving Average - recent price weighted
- **\`smoothed_ma\`**: Smoothed Moving Average - reduced noise
- **\`vwma\`**: Volume Weighted Moving Average
- **\`kaufman_adaptive_ma\`**: Kaufman Adaptive MA - adjusts to volatility
- **\`mcginley_dynamic\`**: McGinley Dynamic - adaptive to market
- **\`rainbow_ma\`**: Multiple MAs for trend visualization
- **\`ma_envelope\`**: Moving Average Envelope bands

#### Oscillators (18)
- **\`stochastic_rsi\`**: RSI + Stochastic for overbought/oversold
- **\`chande_momentum\`**: Chande Momentum Oscillator (-100 to +100)
- **\`percentage_price_oscillator\`**: MACD as percentage
- **\`accelerator_oscillator\`**: Momentum acceleration
- **\`awesome_oscillator\`**: Bill Williams AO
- **\`gator_oscillator\`**: Alligator divergence
- **\`elder_ray\`**: Bull/Bear power
- **\`fisher_transform\`**: Sharp reversal signals
- **\`know_sure_thing\`**: Multi-timeframe ROC
- **\`schaff_trend_cycle\`**: MACD + Stochastic
- **\`coppock_curve\`**: Long-term momentum
- **\`true_strength_index\`**: Double-smoothed momentum
- **\`relative_vigor_index\`**: Close vs open momentum
- **\`detrended_price\`**: Cycle identification
- **\`momentum\`**: Rate of price change
- **\`rate_of_change\`**: ROC percentage
- **\`ultimate_oscillator\`**: Three-timeframe oscillator
- **\`trix\`**: Triple EMA ROC

#### Other Indicators (4)
- **\`volume_indicators\`**: CMF, Chaikin Oscillator, PVT, VZO, MFI
- **\`volatility_indicators\`**: BB Width, %B, Chaikin Volatility, HV, Mass Index
- **\`channels\`**: Keltner Channels, Donchian Channels
- **\`pivot_points\`**: Standard, Camarilla, Fibonacci pivots
- **\`trend_indicators\`**: SuperTrend, Alligator, Ichimoku, Vortex
- **\`patterns\`**: Fractals, ZigZag, Change of Character
- **\`strength_indicators\`**: Bull/Bear Power, Force Index, COG, BOP

### AI Memory Tools (8) - NEW
- **\`memory_save_preference\`**: Save trading preferences (leverage, risk, rules)
- **\`memory_log_trade\`**: Log completed trades for pattern learning
- **\`memory_get_insights\`**: Get personalized insights from history
- **\`memory_check_pattern\`**: Check if setup matches winning patterns
- **\`memory_remember\`**: Store notes, levels, observations
- **\`memory_recall\`**: Search and retrieve memories
- **\`memory_get_all\`**: Get all stored memories
- **\`memory_delete\`**: Delete specific memory by ID

## Tool Categories

### Analysis Tools
Market data and technical analysis without executing trades.

### Execution Tools
Execute trades on Hyperliquid (testnet or mainnet).

### Risk Management Tools
Position sizing, stop loss, take profit calculations.

### AI Memory Tools
Personalized AI that learns from your trading history.

## Usage Patterns

### Single Asset Analysis
\`\`\`
1. get_price → get_indicators → get_volume_analysis → get_Multitimeframe
2. Add: get_market_structure, get_divergence, get_External_data
\`\`\`

### Multiple Asset Scan
\`\`\`
get_price(["BTC", "ETH", "SOL"]) → get_indicators(["BTC", "ETH", "SOL"])
\`\`\`

### Execution Workflow
\`\`\`
1. memory_recall (check preferences)
2. get_indicators + get_market_structure (analysis)
3. memory_check_pattern (validate setup)
4. calculate_position_setup (position sizing)
5. calculate_risk_management (stop loss/take profit)
6. hyperliquid_testnet_futures_trade (test first)
7. hyperliquid_mainnet_futures_trade (live with confirmation)
8. memory_log_trade (log for learning)
\`\`\`

### Memory-Enhanced Trading
\`\`\`
1. memory_save_preference - Set your trading rules
2. memory_remember - Store key levels and observations
3. memory_check_pattern - Validate setups before trading
4. memory_log_trade - Log all trades with lessons
5. memory_get_insights - Review performance and patterns
\`\`\`

## Best Practices

1. Always test on TESTNET before MAINNET
2. Get user confirmation before live trades
3. Use memory tools to build personalized AI
4. Log all trades for pattern learning
5. Monitor positions after execution
6. Use risk management tools before execution
`,
            },
        ],
    };
});
server.registerResource('execution-workflow', 'geartrade://docs/execution-workflow', {
    description: 'Step-by-step guide for analysis to execution workflow with safety best practices',
    mimeType: 'text/markdown',
}, async () => {
    return {
        contents: [
            {
                uri: 'geartrade://docs/execution-workflow',
                mimeType: 'text/markdown',
                text: `# Execution Workflow Guide

## Overview

This guide covers the complete workflow from market analysis to order execution using GearTrade MCP Server. Always follow safety best practices.

## Step-by-Step Workflow

### Step 1: Comprehensive Analysis

Gather data systematically using specialized tools:

#### 1.1 Price & Market Data
\`\`\`json
{
  "name": "get_price",
  "arguments": {
    "ticker": "BTC"
  }
}
\`\`\`

#### 1.2 Technical Indicators
\`\`\`json
{
  "name": "get_indicators",
  "arguments": {
    "ticker": "BTC"
  }
}
\`\`\`

#### 1.3 Volume Analysis
\`\`\`json
{
  "name": "get_volume_analysis",
  "arguments": {
    "ticker": "BTC"
  }
}
\`\`\`

#### 1.4 Market Structure
\`\`\`json
{
  "name": "get_market_structure",
  "arguments": {
    "ticker": "BTC"
  }
}
\`\`\`

#### 1.5 External Data
\`\`\`json
{
  "name": "get_External_data",
  "arguments": {
    "tickers": ["BTC"]
  }
}
\`\`\`

#### 1.6 Check Memory (AI Personalization)
\`\`\`json
{
  "name": "memory_recall",
  "arguments": {
    "query": "BTC leverage settings"
  }
}
\`\`\`

**Combined Analysis Output:**
- **get_price**: Current price, 24h change
- **get_indicators**: RSI, MACD, moving averages, momentum
- **get_volume_analysis**: Volume patterns, buy/sell pressure, CVD
- **get_market_structure**: Trend bias, support/resistance
- **get_External_data**: Funding rates, open interest, liquidations
- **memory_recall**: User's saved preferences and rules

### Step 2: Signal Identification

Analyze the comprehensive data to identify:
- **Signal**: BUY, SELL, or HOLD
- **Confidence**: Based on multiple confirmations
- **Entry Level**: Optimal entry price
- **Stop Loss**: Risk level
- **Take Profit**: Profit target

**Key Indicators:**
- RSI: Oversold (<30) = BUY, Overbought (>70) = SELL
- Trend Alignment: All timeframes aligned = higher confidence
- Volume: Positive CVD = bullish, Negative CVD = bearish
- Divergence: Bullish divergence = BUY signal, Bearish = SELL
- Market Structure: COC (Change of Character) = potential reversal

### Step 3: Present Analysis to User

**Always present clear summary:**
\`\`\`
📊 Analysis Summary for BTC

Current Price: $86,804
Signal: SELL
Confidence: 73.86%

Entry: $86,804
Stop Loss: $88,338 (1.77% risk)
Take Profit: $82,003 (5.53% reward)
Risk/Reward: 3.12:1

Position Size: 0.1 BTC
Leverage: 5x
Margin Required: $1,736

Technical Indicators:
- RSI(14): 68.5 (Overbought)
- Trend: Bearish (Daily, 4H, 1H aligned)
- Volume: Negative CVD trend
- Divergence: Bearish divergence detected

⚠️ Risk: Medium
\`\`\`

### Step 4: Request User Confirmation

**Always ask for explicit confirmation:**
\`\`\`
Berdasarkan analisis, sinyal SELL dengan confidence 73.86%.
Entry: $86,804, Stop Loss: $88,338, Take Profit: $82,003.
Risk/Reward: 3.12:1

Mau dieksekusi ke Hyperliquid? (YES/NO)
\`\`\`

**Never execute without user approval!**

### Step 5: Testnet First (Recommended)

Test execution on Hyperliquid TESTNET first:

\`\`\`json
{
  "name": "hyperliquid_testnet_futures_trade",
  "arguments": {
    "symbol": "BTC",
    "side": "sell",
    "sizeInUsd": 100,
    "orderMode": "market",
    "leverage": "5"
  }
}
\`\`\`

**Testnet benefits:**
- No real money at risk
- Test execution logic
- Verify position sizing
- Check order modes (market/limit/custom)

### Step 6: Mainnet Execution (If User Confirms)

Only execute on MAINNET if user explicitly confirms:

\`\`\`json
{
  "name": "hyperliquid_mainnet_futures_trade",
  "arguments": {
    "symbol": "BTC",
    "side": "sell",
    "sizeInUsd": 100,
    "orderMode": "market",
    "leverage": "5",
    "confirmExecution": "true"
  }
}
\`\`\`

**Safety checks:**
- ✅ User confirmed execution
- ✅ Testnet trading tested
- ✅ Position size calculated
- ✅ Stop loss/take profit planned
- ✅ Risk within limits (1-2% of capital)
- ✅ confirmExecution set to "true"

### Step 7: Position Monitoring

After execution, monitor the position:

\`\`\`json
{
  "name": "get_position",
  "arguments": {
    "walletAddress": "your_wallet_address"
  }
}
\`\`\`

**Monitor:**
- Unrealized PnL
- Current price vs entry
- Liquidation price
- Account equity and margin

### Step 8: Log Trade for AI Learning

After closing position, log the trade:

\`\`\`json
{
  "name": "memory_log_trade",
  "arguments": {
    "symbol": "BTC",
    "side": "SHORT",
    "entryPrice": 86804,
    "exitPrice": 82003,
    "pnlPercent": 5.53,
    "result": "win",
    "reason": "Bearish divergence at resistance, RSI overbought",
    "lesson": "Divergence + overbought RSI is reliable for shorts",
    "label": "swing",
    "categories": "reversal"
  }
}
\`\`\`

**Benefits of logging:**
- AI learns from your winning patterns
- Identifies common mistakes
- Provides personalized insights
- Improves future recommendations

## Multiple Asset Analysis

For multiple assets, use array parameters:

\`\`\`json
{
  "name": "get_indicators",
  "arguments": {
    "tickers": ["BTC", "ETH", "SOL"]
  }
}
\`\`\`

**Note:** Always test on TESTNET before MAINNET execution.

## Safety Features

### Testnet vs Mainnet
- Use \`hyperliquid_testnet_futures_trade\` for testing
- Use \`hyperliquid_mainnet_futures_trade\` for real trades
- Mainnet requires \`confirmExecution: "true"\`

### User Confirmation Required
- Always ask user before mainnet execution
- Present clear risk/reward summary
- Show position size and margin requirements

### Risk Limits
- Default risk: 1% of capital per trade
- Maximum recommended: 2% per trade
- Mainnet has built-in safety checks (min $10, max 25% equity)

## Error Handling

### Execution Errors
- Network errors: Retry with exponential backoff
- Insufficient balance: Show clear error message
- Invalid parameters: Validate before execution
- Order rejection: Log reason and inform user

### Position Monitoring Errors
- API failures: Retry and cache last known state
- Missing positions: Handle gracefully (position closed or never opened)

## Best Practices

1. ✅ **Always analyze first** - Use \`get_indicators\` + \`get_market_structure\` before execution
2. ✅ **Present clear summary** - Show all key metrics
3. ✅ **Ask for confirmation** - Never execute without user approval
4. ✅ **Paper trade first** - Test with paper trading
5. ✅ **Monitor positions** - Track PnL and MAE
6. ✅ **Respect risk limits** - Never exceed 2% risk per trade
7. ✅ **Handle errors gracefully** - Show user-friendly error messages
8. ✅ **Log all executions** - Keep record of all trades

## Common Workflow Patterns

### Quick Analysis
\`\`\`
get_indicators + get_market_structure → Present summary → User decision
\`\`\`

### Full Execution Workflow
\`\`\`
get_indicators + memory_recall → calculate_position_setup → calculate_risk_management → 
Present summary → User confirmation → Paper trade → Live execution → Monitor position
\`\`\`

### Multi-Asset Scan
\`\`\`
analisis_multiple_crypto → Identify opportunities → Present top 3 → 
User selects → Individual analysis → Execution workflow
\`\`\`
`,
            },
        ],
    };
});
// Register Prompts
server.registerPrompt('analyze_and_execute', {
    title: 'Analyze and Execute',
    description: 'Analyze a crypto asset and prepare execution plan with risk management',
    argsSchema: {
        ticker: z.string().describe('Asset ticker to analyze (e.g., BTC, ETH, SOL)'),
        capital: z.string().optional().describe('Trading capital in USD (default: 10000)'),
        riskPct: z.string().optional().describe('Risk percentage per trade (default: 1.0)'),
        leverage: z.string().optional().describe('Leverage multiplier (default: 1 for spot, 1-50 for futures)'),
        strategy: z.string().optional().describe('Trading strategy: day_trading, swing_trading, position_trading (default: swing_trading)'),
        timeframe: z.string().optional().describe('Primary timeframe: 1m, 5m, 15m, 1h, 4h, 1d (default: 1h)'),
    },
}, async (args) => {
    const ticker = args.ticker || 'BTC';
    const capital = args.capital ? parseFloat(args.capital) : 10000;
    const riskPct = args.riskPct ? parseFloat(args.riskPct) : 1.0;
    const leverage = args.leverage ? parseInt(args.leverage) : 1;
    const strategy = args.strategy || 'swing_trading';
    const timeframe = args.timeframe || '1h';
    return {
        messages: [
            {
                role: 'user',
                content: {
                    type: 'text',
                    text: `Please analyze ${ticker} comprehensively using these steps (Strategy: ${strategy}, Timeframe: ${timeframe}):

1. **Get Current Price & Basic Info:**
   - Use get_price tool for current price and market data

2. **Technical Analysis:**
   - Use get_indicators for RSI, MACD, moving averages
   - Use get_volume_analysis for volume patterns
   - Use get_market_structure for trend bias
   - Use get_candlestick_patterns for chart patterns
   - Use get_market_regime to identify market conditions

3. **Advanced Indicators (Based on Strategy: ${strategy}):**
   ${strategy === 'day_trading' ? `
   - Use stochastic_rsi for overbought/oversold with fast signals
   - Use fisher_transform for sharp reversal signals
   - Use get_orderbook_depth for order book analysis
   - Use get_liquidation_levels for liquidation zones` : ''}
   ${strategy === 'swing_trading' ? `
   - Use get_Multitimeframe for multi-timeframe trend alignment
   - Use get_divergence for RSI divergence detection
   - Use trend_indicators (supertrend) for trend following
   - Use elder_ray for buying/selling pressure
   - Use schaff_trend_cycle for MACD + Stochastic signals` : ''}
   ${strategy === 'position_trading' ? `
   - Use get_volume_profile for volume profile analysis
   - Use know_sure_thing for multi-timeframe ROC momentum
   - Use coppock_curve for long-term momentum
   - Use hull_ma, kaufman_adaptive_ma, mcginley_dynamic for trend following
   - Use get_market_regime to confirm market conditions` : ''}

4. **Risk Management Setup:**
   - Use calculate_risk_management with entry price, capital=${capital}, riskPct=${riskPct}
   - Use calculate_position_setup for position sizing with leverage=${leverage}

5. **Present Analysis Summary:**
   - Current price and 24h change
   - Technical signal (BUY/SELL/HOLD) with confidence %
   - Recommended entry, stop loss, take profit levels
   - Risk/reward ratio and position sizing
   - Key supporting indicators
   - Leverage: ${leverage}x

6. **Execution Preparation:**
   - If user wants to execute: Use hyperliquid_testnet_futures_trade for testing
   - Always start with TESTNET first
   - Only proceed to MAINNET (hyperliquid_mainnet_futures_trade) after explicit confirmation

Ask user: "Mau dieksekusi dengan paper trading dulu? (YES/NO)"
If YES, show the paper trade result first, then ask for live execution.

Safety first: Never execute live without explicit user approval twice.`,
                },
            },
        ],
    };
});
server.registerPrompt('multi_asset_scan', {
    title: 'Multi Asset Scan',
    description: 'Scan multiple assets for trading opportunities and rank by confidence',
    argsSchema: {
        tickers: z.string().describe('Comma-separated tickers to scan (e.g., "BTC,ETH,SOL")'),
        capital: z.string().optional().describe('Trading capital in USD (default: 10000)'),
        strategy: z.string().optional().describe('Trading strategy: day_trading, swing_trading, position_trading (default: swing_trading)'),
        minConfidence: z.string().optional().describe('Minimum confidence threshold for signals (default: 60)'),
        sortBy: z.string().optional().describe('Sort by: confidence, risk_reward, volume, trend_strength (default: confidence)'),
    },
}, async (args) => {
    const tickers = args.tickers ? args.tickers.split(',').map((t) => t.trim()) : ['BTC', 'ETH', 'SOL'];
    const capital = args.capital ? parseFloat(args.capital) : 10000;
    const strategy = args.strategy || 'swing_trading';
    const minConfidence = args.minConfidence ? parseInt(args.minConfidence) : 60;
    const sortBy = args.sortBy || 'confidence';
    return {
        messages: [
            {
                role: 'user',
                content: {
                    type: 'text',
                    text: `Please scan multiple assets for trading opportunities (Strategy: ${strategy}, Min Confidence: ${minConfidence}%):

**Step-by-Step Analysis for each asset in ${JSON.stringify(tickers)}:**

1. **Get Price & Volume Data:**
   - Use get_price for current price and market data
   - Use get_volume_analysis for volume patterns

2. **Technical Analysis:**
   - Use get_indicators for technical signals
   - Use get_market_structure for trend bias
   - Use get_candlestick_patterns for chart patterns
   - Use get_market_regime for market conditions

3. **Strategy-Specific Indicators (${strategy}):**
   ${strategy === 'day_trading' ? `
   - Use stochastic_rsi for fast overbought/oversold signals
   - Use fisher_transform for sharp reversal detection
   - Use get_orderbook_depth for order book analysis` : ''}
   ${strategy === 'swing_trading' ? `
   - Use get_Multitimeframe for trend alignment
   - Use get_divergence for divergence signals
   - Use schaff_trend_cycle for momentum` : ''}
   ${strategy === 'position_trading' ? `
   - Use know_sure_thing for multi-timeframe momentum
   - Use coppock_curve for long-term momentum
   - Use get_volume_profile for volume analysis` : ''}

4. **Risk Assessment:**
   - Use calculate_risk_management with capital=${capital}

5. **Ranking Criteria (Sort by: ${sortBy}):**
   - Signal confidence (minimum ${minConfidence}%)
   - Risk/Reward ratio quality
   - Trend alignment (multi-timeframe)
   - Volume confirmation

6. **Present Top 3 Opportunities:**
   - Asset ticker and current price
   - BUY/SELL/HOLD signal with confidence %
   - Recommended entry, SL, TP levels
   - Risk/Reward ratio
   - Key supporting indicators
   - Volume confirmation status

Ask user: "Asset mana yang ingin dianalisis lebih detail atau dieksekusi?"

Use the selected asset for further analysis or execution workflow.`,
                },
            },
        ],
    };
});
server.registerPrompt('risk_analysis', {
    title: 'Risk Analysis',
    description: 'Perform comprehensive risk analysis for a trading position',
    argsSchema: {
        ticker: z.string().describe('Asset ticker to analyze'),
        entry: z.string().describe('Entry price'),
        side: z.string().describe('Trade side (LONG or SHORT)'),
        capital: z.string().describe('Trading capital in USD'),
    },
}, async (args) => {
    const ticker = args.ticker || 'BTC';
    const entry = parseFloat(args.entry);
    const side = args.side || 'LONG';
    const capital = parseFloat(args.capital) || 10000;
    return {
        messages: [
            {
                role: 'user',
                content: {
                    type: 'text',
                    text: `Please perform comprehensive risk analysis for ${ticker}:
- Entry: ${entry}
- Side: ${side}
- Capital: ${capital}

Use these tools in sequence:
1. calculate_position_setup - Calculate optimal position size, leverage, and margin
2. calculate_risk_management - Calculate stop loss, take profit, and risk/reward ratio
3. get_position (if position exists) - Check current position status

Present:
1. Recommended position size (quantity, leverage, margin)
2. Stop loss level and risk amount
3. Take profit level and reward amount
4. Risk/Reward ratio
5. Maximum loss if stop loss hit
6. Maximum profit if take profit hit
7. Margin requirements and safety buffer

Provide clear risk assessment and recommendations.`,
                },
            },
        ],
    };
});
server.registerPrompt('position_monitoring', {
    title: 'Position Monitoring',
    description: 'Monitor open positions and provide status update',
    argsSchema: {
        tickers: z.string().optional().describe('Comma-separated tickers to monitor (monitors all positions if not provided)'),
    },
}, async (args) => {
    const tickers = args.tickers ? args.tickers.split(',').map((t) => t.trim()) : undefined;
    return {
        messages: [
            {
                role: 'user',
                content: {
                    type: 'text',
                    text: `Please monitor open positions${tickers ? ` for ${JSON.stringify(tickers)}` : ' (all positions)'}.

Use \`get_position\` to get current status for open positions.

For each position, present:
1. Ticker and side (LONG/SHORT)
2. Entry price vs current price
3. Unrealized PnL (profit/loss)
4. PnL percentage
5. Distance to stop loss
6. Distance to take profit
7. MAE (Maximum Adverse Excursion)
8. Risk/Reward status

If any position is:
- Near stop loss: Alert user
- Near take profit: Suggest partial close or trailing stop
- Showing high MAE: Suggest reviewing entry strategy

Provide actionable recommendations for each position.`,
                },
            },
        ],
    };
});
server.registerPrompt('comprehensive_analysis', {
    title: 'Comprehensive Analysis',
    description: 'Perform comprehensive market analysis for crypto assets without execution',
    argsSchema: {
        ticker: z.string().optional().describe('Single ticker to analyze (e.g., BTC, ETH, SOL). If not provided, can analyze multiple tickers'),
        tickers: z.string().optional().describe('Comma-separated tickers to analyze (e.g., "BTC,ETH,SOL"). Use this for multiple assets'),
        capital: z.string().optional().describe('Trading capital in USD (default: 10000)'),
        riskPct: z.string().optional().describe('Risk percentage per trade (default: 1.0)'),
        strategy: z.string().optional().describe('Trading strategy: day_trading, swing_trading, position_trading, flexible (default: flexible)'),
        includeAdvanced: z.string().optional().describe('Include advanced indicators: true/false (default: true)'),
        includeVolume: z.string().optional().describe('Include volume analysis: true/false (default: true)'),
        includeExternal: z.string().optional().describe('Include external data (funding, OI): true/false (default: true)'),
    },
}, async (args) => {
    const ticker = args.ticker;
    const tickers = args.tickers ? args.tickers.split(',').map((t) => t.trim()) : undefined;
    const capital = args.capital ? parseFloat(args.capital) : 10000;
    const riskPct = args.riskPct ? parseFloat(args.riskPct) : 1.0;
    const strategy = args.strategy || 'flexible';
    if (ticker) {
        // Single asset analysis
        return {
            messages: [
                {
                    role: 'user',
                    content: {
                        type: 'text',
                        text: `Please perform comprehensive analysis for ${ticker} using these tools:
- capital: ${capital}
- riskPct: ${riskPct}
- strategy: ${strategy}

After analysis, present a detailed report with:

1. **Price & Market Overview**
   - Current price and 24h change
   - Volume trends
   - Market sentiment

2. **Technical Analysis**
   - RSI levels (14, 7, 4H) and interpretation
   - EMA trends (20, 50)
   - MACD signals
   - Bollinger Bands position
   - Support and Resistance levels
   - Trend direction and strength

3. **Volume Analysis**
   - Buy/Sell pressure
   - CVD (Cumulative Volume Delta) trend
   - POC, VAH/VAL levels
   - Liquidity zones
   - Volume-based recommendation

4. **Multi-Timeframe Analysis**
   - Daily, 4H, 1H trend alignment
   - Trend strength score
   - Timeframe conflicts or confirmations

5. **Advanced Analysis**
   - Fibonacci retracement levels (if available)
   - Order book depth and imbalance (if available)
   - Volume profile key levels (if available)
   - Market structure (COC, swing patterns)
   - Candlestick patterns detected
   - RSI divergence signals
   - Liquidation levels and zones
   - Long/Short ratio sentiment
   - Spot-Futures divergence (if available)

6. **External Data**
   - Funding rate and trend
   - Open Interest and trend
   - Volatility analysis

7. **Trading Signal**
   - Recommended signal: BUY / SELL / HOLD
   - Confidence level (0-100%)
   - Reasoning based on all indicators

8. **Entry, Stop Loss, Take Profit Levels**
   - Optimal entry price
   - Stop loss level with risk percentage
   - Take profit level with reward percentage
   - Risk/Reward ratio

9. **Position Setup (if signal is BUY/SELL)**
   - Recommended position size
   - Suggested leverage
   - Margin requirements
   - Risk amount in USD

10. **Risk Assessment**
    - Overall risk level (Low/Medium/High)
    - Key risk factors
    - Market conditions to watch

**Important:** This is analysis only. Do NOT execute any trades. Present the analysis clearly and wait for user's decision on next steps.`,
                    },
                },
            ],
        };
    }
    else if (tickers && tickers.length > 0) {
        // Multiple assets analysis
        return {
            messages: [
                {
                    role: 'user',
                    content: {
                        type: 'text',
                        text: `Please perform comprehensive analysis for multiple assets using analisis_multiple_crypto with:
- tickers: ${JSON.stringify(tickers)}
- capital: ${capital}
- riskPct: ${riskPct}

After analysis, for each asset present:

1. **Quick Summary**
   - Ticker and current price
   - Signal (BUY/SELL/HOLD) and confidence
   - Key technical indicators summary

2. **Ranking**
   Rank all assets by:
   - Signal confidence (highest first)
   - Risk/Reward ratio (best first)
   - Trend alignment strength

3. **Top Opportunities**
   Present the top 3 opportunities with:
   - Complete technical analysis
   - Volume analysis summary
   - Multi-timeframe alignment
   - Entry, Stop Loss, Take Profit levels
   - Risk/Reward ratio
   - Position setup recommendations

4. **Comparison Table**
   Create a comparison table showing:
   - Ticker | Price | Signal | Confidence | R/R Ratio | Risk Level

**Important:** This is analysis only. Do NOT execute any trades. Present the analysis clearly and let user decide which assets to focus on or execute.`,
                    },
                },
            ],
        };
    }
    else {
        // No ticker provided
        return {
            messages: [
                {
                    role: 'user',
                    content: {
                        type: 'text',
                        text: `Please perform comprehensive market analysis. 

You can analyze:
- Single asset: Use get_indicators, get_market_structure, get_volume_analysis
- Multiple assets: Use get_indicators(["BTC", "ETH", "SOL"]) with array of tickers

For comprehensive analysis, include:
- Technical indicators (RSI, EMA, MACD, Bollinger Bands, etc.)
- Volume analysis (buy/sell pressure, CVD, liquidity zones)
- Multi-timeframe trend alignment
- Advanced analysis (Fibonacci, Order Book, Volume Profile, Market Structure, etc.)
- External data (funding rate, open interest)
- Trading signals with confidence levels
- Entry, Stop Loss, Take Profit recommendations
- Risk assessment

**Important:** This is analysis only. Do NOT execute any trades. Present findings clearly and wait for user's input on which assets to analyze.`,
                    },
                },
            ],
        };
    }
});
// Register Additional Prompts
server.registerPrompt('quick_price_check', {
    title: 'Quick Price Check',
    description: 'Quickly check prices for multiple crypto assets',
    argsSchema: {
        tickers: z.string().describe('Comma-separated tickers to check (e.g., "BTC,ETH,SOL,BNB")'),
    },
}, async (args) => {
    const tickers = args.tickers.split(',').map((t) => t.trim().toUpperCase());
    return {
        messages: [
            {
                role: 'user',
                content: {
                    type: 'text',
                    text: `Please check current prices for the following assets: ${tickers.join(', ')}

Use the get_price tool with tickers array to get prices for all tickers.

Present the results in a clear table format:
- Ticker
- Current Price (USD)
- 24h Change (%)
- Timestamp

Keep it concise and easy to read.`,
                },
            },
        ],
    };
});
server.registerPrompt('trend_analysis', {
    title: 'Trend Analysis',
    description: 'Analyze trend direction and strength across multiple timeframes',
    argsSchema: {
        ticker: z.string().describe('Asset ticker to analyze (e.g., BTC, ETH, SOL)'),
        timeframes: z.string().optional().describe('Comma-separated timeframes to analyze (e.g., "1D,4H,1H" or "daily,4h,1h"). Default: all timeframes'),
    },
}, async (args) => {
    const ticker = args.ticker.toUpperCase();
    const timeframes = args.timeframes ? args.timeframes.split(',').map((t) => t.trim()) : ['1D', '4H', '1H'];
    return {
        messages: [
            {
                role: 'user',
                content: {
                    type: 'text',
                    text: `Please perform trend analysis for ${ticker} across the following timeframes: ${timeframes.join(', ')}

Use the get_Multitimeframe tool to get trend data for ${ticker}.

Analyze and present:
1. **Trend Direction per Timeframe**
   - Daily trend: UPTREND / DOWNTREND / SIDEWAYS
   - 4H trend: UPTREND / DOWNTREND / SIDEWAYS
   - 1H trend: UPTREND / DOWNTREND / SIDEWAYS

2. **Trend Strength**
   - Strong / Moderate / Weak for each timeframe
   - Overall trend alignment score

3. **EMA Analysis**
   - EMA9 vs EMA21 position for each timeframe
   - Golden Cross / Death Cross signals
   - Price position relative to EMAs

4. **Trend Consistency**
   - Are all timeframes aligned? (Yes/No)
   - If not aligned, which timeframes conflict?
   - Overall trend recommendation

5. **Trading Implications**
   - Best timeframe for entry (if aligned)
   - Risk level based on trend alignment
   - Recommended action: BUY / SELL / WAIT

Present the analysis clearly with timeframe comparison.`,
                },
            },
        ],
    };
});
server.registerPrompt('divergence_scan', {
    title: 'Divergence Scan',
    description: 'Scan for RSI and price divergences that indicate potential reversals',
    argsSchema: {
        tickers: z.string().describe('Comma-separated tickers to scan (e.g., "BTC,ETH,SOL")'),
    },
}, async (args) => {
    const tickers = args.tickers.split(',').map((t) => t.trim().toUpperCase());
    return {
        messages: [
            {
                role: 'user',
                content: {
                    type: 'text',
                    text: `Please scan for divergence patterns in the following assets: ${tickers.join(', ')}

For each ticker, use the get_divergence tool to check for:
1. RSI Divergence (bullish or bearish)
2. Price-Volume Divergence
3. MACD Divergence (if available)

Present results in a clear format:

**For each ticker:**
- Ticker: [TICKER]
- RSI Divergence: [BULLISH / BEARISH / NONE]
  - Description: [explanation]
  - Strength: [STRONG / MODERATE / WEAK]
- Price-Volume Divergence: [BULLISH / BEARISH / NONE]
  - Description: [explanation]
- Overall Divergence Signal: [BULLISH / BEARISH / NEUTRAL]
- Trading Recommendation: [BUY / SELL / WAIT]
- Confidence: [HIGH / MEDIUM / LOW]

**Summary:**
- List tickers with bullish divergence (potential BUY)
- List tickers with bearish divergence (potential SELL)
- Rank by divergence strength

Divergences are early reversal signals - use with caution and wait for confirmation.`,
                },
            },
        ],
    };
});
server.registerPrompt('liquidation_analysis', {
    title: 'Liquidation Analysis',
    description: 'Analyze liquidation levels and potential stop hunt zones',
    argsSchema: {
        ticker: z.string().describe('Asset ticker to analyze (e.g., BTC, ETH, SOL)'),
    },
}, async (args) => {
    const ticker = args.ticker.toUpperCase();
    return {
        messages: [
            {
                role: 'user',
                content: {
                    type: 'text',
                    text: `Please analyze liquidation levels for ${ticker}.

Use the get_liquidation_levels tool to get liquidation data.

Present the analysis:

1. **Liquidation Clusters**
   - Long liquidation levels (price zones with high long liquidations)
   - Short liquidation levels (price zones with high short liquidations)
   - Liquidation density map

2. **Current Price Position**
   - Distance to nearest long liquidation cluster
   - Distance to nearest short liquidation cluster
   - Risk of stop hunt in each direction

3. **Stop Hunt Potential**
   - Likelihood of stop hunt to the downside (for longs)
   - Likelihood of stop hunt to the upside (for shorts)
   - Estimated price zones for potential stop hunts

4. **Trading Implications**
   - If holding LONG: Risk of stop hunt below current price
   - If holding SHORT: Risk of stop hunt above current price
   - Recommended stop loss placement (away from liquidation clusters)
   - Entry opportunities after stop hunt (contrarian play)

5. **Risk Assessment**
   - Overall liquidation risk: [LOW / MEDIUM / HIGH]
   - Recommendation: [SAFE TO HOLD / REDUCE POSITION / WAIT FOR STOP HUNT]

Use this analysis to avoid placing stops near liquidation clusters and to identify potential reversal zones.`,
                },
            },
        ],
    };
});
server.registerPrompt('portfolio_review', {
    title: 'Portfolio Review',
    description: 'Review all open positions and provide portfolio status',
    argsSchema: {
        includeAnalysis: z.string().optional().describe('Include detailed analysis for each position (true/false, default: true)'),
    },
}, async (args) => {
    const includeAnalysis = args.includeAnalysis !== 'false';
    return {
        messages: [
            {
                role: 'user',
                content: {
                    type: 'text',
                    text: `Please review all open positions in the portfolio.

Use the get_position tool for each open position to get current status.

Present a comprehensive portfolio review:

1. **Portfolio Summary**
   - Total number of open positions
   - Total invested capital
   - Total unrealized P&L
   - Overall portfolio performance (%)

2. **Position Details (for each position)**
   - Ticker: [TICKER]
   - Side: [LONG / SHORT]
   - Entry Price: [PRICE]
   - Current Price: [PRICE]
   - Quantity: [QTY]
   - Unrealized P&L: [P&L USD] ([P&L %])
   - Leverage: [X]
   - Margin Used: [USD]
   - Stop Loss: [PRICE] (Distance: [%])
   - Take Profit: [PRICE] (Distance: [%])
   - Risk/Reward: [R:R]

${includeAnalysis ? `3. **Current Analysis (for each position)**
   - Current signal: [BUY / SELL / HOLD]
   - Trend alignment: [ALIGNED / NOT ALIGNED]
   - Risk level: [LOW / MEDIUM / HIGH]
   - Recommendation: [HOLD / CLOSE / REDUCE / ADD]` : ''}

4. **Portfolio Risk Assessment**
   - Total risk exposure (% of capital)
   - Average leverage across positions
   - Correlation risk (if multiple similar assets)
   - Overall portfolio risk: [LOW / MEDIUM / HIGH]

5. **Recommendations**
   - Positions to close (if any)
   - Positions to reduce (if any)
   - Positions to add to (if any)
   - Overall portfolio adjustments needed

Present in a clear, organized format with actionable recommendations.`,
                },
            },
        ],
    };
});
server.registerPrompt('market_overview', {
    title: 'Market Overview',
    description: 'Get comprehensive market overview for major crypto assets',
    argsSchema: {
        tickers: z.string().optional().describe('Comma-separated tickers (default: "BTC,ETH,SOL,BNB,XRP,ADA,DOGE,AVAX,MATIC,DOT")'),
    },
}, async (args) => {
    const defaultTickers = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE', 'AVAX', 'MATIC', 'DOT'];
    const tickers = args.tickers ? args.tickers.split(',').map((t) => t.trim().toUpperCase()) : defaultTickers;
    return {
        messages: [
            {
                role: 'user',
                content: {
                    type: 'text',
                    text: `Please provide a comprehensive market overview for: ${tickers.join(', ')}

Use get_price with tickers array to get current prices for all tickers.

Present a market overview report:

1. **Market Summary**
   - Total market cap (if available)
   - Number of assets analyzed
   - Overall market sentiment: [BULLISH / BEARISH / NEUTRAL]

2. **Price Performance Table**
   | Ticker | Price (USD) | 24h Change | Trend | Signal |
   |--------|-------------|------------|-------|--------|
   | ...    | ...         | ...        | ...   | ...    |

3. **Top Performers**
   - Best 24h gainers (top 3)
   - Worst 24h losers (bottom 3)

4. **Market Leaders**
   - BTC dominance trend
   - ETH performance vs BTC
   - Altcoin performance vs BTC

5. **Trading Opportunities**
   - Assets with strong BUY signals
   - Assets with strong SELL signals
   - Assets to watch (neutral but interesting)

6. **Market Conditions**
   - Overall volatility: [LOW / MEDIUM / HIGH]
   - Market structure: [TRENDING / RANGING]
   - Recommended strategy: [TREND FOLLOWING / MEAN REVERSION / WAIT]

Keep it concise but informative. Focus on actionable insights.`,
                },
            },
        ],
    };
});
server.registerPrompt('entry_exit_strategy', {
    title: 'Entry & Exit Strategy',
    description: 'Get optimal entry and exit strategy for a trading position',
    argsSchema: {
        ticker: z.string().describe('Asset ticker to analyze (e.g., BTC, ETH, SOL)'),
        side: z.string().describe('Trade side: LONG or SHORT'),
        capital: z.string().optional().describe('Trading capital in USD (default: 10000)'),
        riskPct: z.string().optional().describe('Risk percentage per trade (default: 1.0)'),
    },
}, async (args) => {
    const ticker = args.ticker.toUpperCase();
    const side = args.side.toUpperCase();
    const capital = args.capital ? parseFloat(args.capital) : 10000;
    const riskPct = args.riskPct ? parseFloat(args.riskPct) : 1.0;
    return {
        messages: [
            {
                role: 'user',
                content: {
                    type: 'text',
                    text: `Please provide optimal entry and exit strategy for ${ticker} ${side} position.

Use get_indicators, get_market_structure, get_volume_analysis tools with:
- ticker: ${ticker}
- capital: ${capital}
- riskPct: ${riskPct}

Then use calculate_risk_management and calculate_position_setup tools to get precise levels.

Present a detailed entry/exit strategy:

1. **Entry Strategy**
   - Optimal Entry Price: [PRICE]
   - Entry Zone: [PRICE_MIN] - [PRICE_MAX]
   - Entry Conditions:
     * [ ] RSI condition
     * [ ] Trend alignment
     * [ ] Volume confirmation
     * [ ] Support/Resistance level
   - Entry Timing: [IMMEDIATE / WAIT FOR PULLBACK / WAIT FOR BREAKOUT]

2. **Stop Loss Strategy**
   - Stop Loss Price: [PRICE]
   - Stop Loss Distance: [%] from entry
   - Stop Loss Type: [FIXED / ATR-BASED / SUPPORT-RESISTANCE]
   - Risk Amount: [USD] (${riskPct}% of capital)
   - Stop Loss Reasoning: [explanation]

3. **Take Profit Strategy**
   - TP1 (2:1 R:R): [PRICE] - [%] gain
   - TP2 (3:1 R:R): [PRICE] - [%] gain
   - TP3 (5:1 R:R): [PRICE] - [%] gain
   - Take Profit Method: [ALL AT ONCE / SCALING OUT / TRAILING STOP]

4. **Position Sizing**
   - Position Size: [QUANTITY] ${ticker}
   - Leverage: [X]
   - Margin Required: [USD]
   - Risk/Reward Ratio: [R:R]

5. **Exit Strategy**
   - When to exit early:
     * [ ] Stop loss hit
     * [ ] Trend reversal signal
     * [ ] Divergence signal
     * [ ] Support/Resistance break
   - When to hold:
     * [ ] Trend still intact
     * [ ] Volume supports continuation
     * [ ] Multi-timeframe alignment

6. **Risk Management**
   - Maximum loss: [USD]
   - Maximum gain (if all TPs hit): [USD]
   - Risk level: [LOW / MEDIUM / HIGH]
   - Position monitoring: [Check every X hours]

Present clear, actionable strategy with specific price levels and conditions.`,
                },
            },
        ],
    };
});
server.registerPrompt('volatility_analysis', {
    title: 'Volatility Analysis',
    description: 'Analyze volatility for risk management and position sizing',
    argsSchema: {
        ticker: z.string().describe('Asset ticker to analyze (e.g., BTC, ETH, SOL)'),
    },
}, async (args) => {
    const ticker = args.ticker.toUpperCase();
    return {
        messages: [
            {
                role: 'user',
                content: {
                    type: 'text',
                    text: `Please analyze volatility for ${ticker} to determine appropriate risk management.

Use get_indicators tool to get ATR (Average True Range) values for ${ticker}.

Present volatility analysis:

1. **Volatility Metrics**
   - ATR (14-period): [VALUE]
   - ATR %: [%] of current price
   - Volatility Level: [LOW / MEDIUM / HIGH / EXTREME]
   - Historical Comparison: [ABOVE / BELOW / AVERAGE] historical average

2. **Volatility Interpretation**
   - Current Market Regime: [LOW VOLATILITY / NORMAL / HIGH VOLATILITY / EXTREME]
   - Volatility Trend: [INCREASING / DECREASING / STABLE]
   - Expected Price Movement: [TIGHT RANGE / NORMAL / WIDE RANGE]

3. **Risk Management Implications**
   - Recommended Stop Loss Distance:
     * Conservative: [%] (1.5x ATR)
     * Moderate: [%] (2x ATR)
     * Aggressive: [%] (3x ATR)
   - Stop Loss in USD: [USD] from current price
   - Position Size Adjustment: [REDUCE / NORMAL / INCREASE] size due to volatility

4. **Leverage Recommendation**
   - Recommended Leverage: [X] (based on volatility)
   - Maximum Safe Leverage: [X]
   - Reasoning: [explanation based on ATR]

5. **Trading Strategy Adjustment**
   - If HIGH VOLATILITY:
     * Use wider stops
     * Reduce position size
     * Lower leverage
     * Wait for volatility to decrease
   - If LOW VOLATILITY:
     * Tighter stops possible
     * Normal position size
     * Normal leverage
     * Watch for volatility expansion

6. **Volatility-Based Entry/Exit**
   - Entry: Wait for volatility contraction (squeeze) before breakout
   - Exit: Consider exiting if volatility expands beyond normal range
   - Position Monitoring: [MORE FREQUENT / NORMAL] due to volatility

Use this analysis to adjust your risk management and position sizing accordingly.`,
                },
            },
        ],
    };
});
// Register Additional Prompts for Complete Tool Coverage
server.registerPrompt('technical_indicator_analysis', {
    title: 'Technical Indicator Analysis',
    description: 'Analyze specific technical indicators for trading decisions',
    argsSchema: {
        ticker: z.string().describe('Asset ticker to analyze (e.g., BTC, ETH, SOL)'),
        indicators: z.string().optional().describe('Comma-separated indicators to analyze (e.g., "RSI,EMA,MACD,BB"). If not provided, analyzes all available indicators'),
    },
}, async (args) => {
    const ticker = args.ticker.toUpperCase();
    const indicators = args.indicators ? args.indicators.split(',').map((i) => i.trim().toUpperCase()) : ['RSI', 'EMA', 'MACD', 'BB', 'ATR', 'ADX', 'STOCH', 'CCI', 'WILLR', 'AROON', 'SAR', 'OBV'];
    return {
        messages: [
            {
                role: 'user',
                content: {
                    type: 'text',
                    text: `Please analyze technical indicators for ${ticker}. Use the get_indicators tool to get: ${indicators.join(', ')}. Present: 1) Indicator values and signals, 2) Trading signals (BUY/SELL/HOLD), 3) Indicator combination analysis, 4) Entry/exit recommendations.`,
                },
            },
        ],
    };
});
server.registerPrompt('volume_profile_analysis', {
    title: 'Volume Profile Analysis',
    description: 'Analyze volume profile to identify key support/resistance levels',
    argsSchema: {
        ticker: z.string().describe('Asset ticker to analyze (e.g., BTC, ETH, SOL)'),
    },
}, async (args) => {
    const ticker = args.ticker.toUpperCase();
    return {
        messages: [
            {
                role: 'user',
                content: {
                    type: 'text',
                    text: `Analyze volume profile for ${ticker} using get_volume_profile. Present: POC, VAH/VAL, HVN/LVN, current price position, support/resistance levels, and trading strategy with entry/exit zones.`,
                },
            },
        ],
    };
});
server.registerPrompt('orderbook_analysis', {
    title: 'Order Book Analysis',
    description: 'Analyze order book depth to identify support/resistance and market sentiment',
    argsSchema: {
        ticker: z.string().describe('Asset ticker to analyze (e.g., BTC, ETH, SOL)'),
    },
}, async (args) => {
    const ticker = args.ticker.toUpperCase();
    return {
        messages: [
            {
                role: 'user',
                content: {
                    type: 'text',
                    text: `Analyze order book for ${ticker} using get_orderbook_depth. Present: bid/ask volumes, support/resistance walls, market sentiment, trading implications, entry/exit strategy, and liquidity analysis.`,
                },
            },
        ],
    };
});
server.registerPrompt('market_structure_analysis', {
    title: 'Market Structure Analysis',
    description: 'Analyze market structure to identify trend changes and trading opportunities',
    argsSchema: {
        ticker: z.string().describe('Asset ticker to analyze (e.g., BTC, ETH, SOL)'),
    },
}, async (args) => {
    const ticker = args.ticker.toUpperCase();
    return {
        messages: [
            {
                role: 'user',
                content: {
                    type: 'text',
                    text: `Analyze market structure for ${ticker} using get_market_structure. Present: structure type, COC signals, swing patterns, support/resistance, trading implications, and entry strategy.`,
                },
            },
        ],
    };
});
server.registerPrompt('candlestick_pattern_analysis', {
    title: 'Candlestick Pattern Analysis',
    description: 'Analyze candlestick patterns to identify reversal and continuation signals',
    argsSchema: {
        ticker: z.string().describe('Asset ticker to analyze (e.g., BTC, ETH, SOL)'),
    },
}, async (args) => {
    const ticker = args.ticker.toUpperCase();
    return {
        messages: [
            {
                role: 'user',
                content: {
                    type: 'text',
                    text: `Analyze candlestick patterns for ${ticker} using get_candlestick_patterns. Present: detected patterns, pattern interpretation, reversal/continuation signals, trading signals, and entry/exit strategy.`,
                },
            },
        ],
    };
});
server.registerPrompt('external_data_analysis', {
    title: 'External Data Analysis',
    description: 'Analyze external market data: funding rate, open interest, volatility',
    argsSchema: {
        ticker: z.string().describe('Asset ticker to analyze (e.g., BTC, ETH, SOL)'),
    },
}, async (args) => {
    const ticker = args.ticker.toUpperCase();
    return {
        messages: [
            {
                role: 'user',
                content: {
                    type: 'text',
                    text: `Analyze external data for ${ticker} using get_External_data. Present: funding rate analysis, open interest trends, market sentiment, volatility, trading implications, and risk assessment.`,
                },
            },
        ],
    };
});
server.registerPrompt('spot_futures_arbitrage', {
    title: 'Spot-Futures Arbitrage Analysis',
    description: 'Analyze spot-futures divergence for arbitrage opportunities',
    argsSchema: {
        ticker: z.string().describe('Asset ticker to analyze (e.g., BTC, ETH, SOL)'),
    },
}, async (args) => {
    const ticker = args.ticker.toUpperCase();
    return {
        messages: [
            {
                role: 'user',
                content: {
                    type: 'text',
                    text: `Analyze spot-futures divergence for ${ticker} using get_spot_futures_divergence. Present: price comparison, divergence analysis, arbitrage opportunities, trading signals, and recommendations.`,
                },
            },
        ],
    };
});
server.registerPrompt('long_short_sentiment', {
    title: 'Long/Short Sentiment Analysis',
    description: 'Analyze long/short ratio to gauge market sentiment',
    argsSchema: {
        ticker: z.string().describe('Asset ticker to analyze (e.g., BTC, ETH, SOL)'),
    },
}, async (args) => {
    const ticker = args.ticker.toUpperCase();
    return {
        messages: [
            {
                role: 'user',
                content: {
                    type: 'text',
                    text: `Analyze long/short sentiment for ${ticker} using get_long_short_ratio. Present: ratio analysis, market sentiment, historical context, trading implications, risk assessment, and contrarian signals.`,
                },
            },
        ],
    };
});
server.registerPrompt('fibonacci_trading_strategy', {
    title: 'Fibonacci Trading Strategy',
    description: 'Use Fibonacci retracement levels for entry, stop loss, and take profit',
    argsSchema: {
        ticker: z.string().describe('Asset ticker to analyze (e.g., BTC, ETH, SOL)'),
    },
}, async (args) => {
    const ticker = args.ticker.toUpperCase();
    return {
        messages: [
            {
                role: 'user',
                content: {
                    type: 'text',
                    text: `Analyze Fibonacci retracement for ${ticker} using get_fibonacci. Present: Fibonacci levels, current price position, trading signals, support/resistance, entry strategy, stop loss/take profit, and risk/reward.`,
                },
            },
        ],
    };
});
server.registerPrompt('multi_asset_comparison', {
    title: 'Multi-Asset Comparison',
    description: 'Compare multiple assets across various metrics to identify best opportunities',
    argsSchema: {
        tickers: z.string().describe('Comma-separated tickers to compare (e.g., "BTC,ETH,SOL,BNB")'),
        metrics: z.string().optional().describe('Comma-separated metrics (e.g., "price,volume,rsi,trend"). Default: all'),
        strategy: z.string().optional().describe('Trading strategy: day_trading, swing_trading, position_trading (default: swing_trading)'),
        sortBy: z.string().optional().describe('Sort by: confidence, risk_reward, volume, trend_strength (default: confidence)'),
    },
}, async (args) => {
    const tickers = args.tickers.split(',').map((t) => t.trim().toUpperCase());
    const strategy = args.strategy || 'swing_trading';
    const sortBy = args.sortBy || 'confidence';
    return {
        messages: [
            {
                role: 'user',
                content: {
                    type: 'text',
                    text: `Compare assets: ${tickers.join(', ')} (Strategy: ${strategy}, Sort by: ${sortBy}). Use get_price, get_indicators, get_volume_analysis, get_Multitimeframe. Present: price comparison, technical comparison, signal comparison, risk/reward comparison, overall ranking (sorted by ${sortBy}), and top 3 recommendations for ${strategy}.`,
                },
            },
        ],
    };
});
// NEW: Day Trading Analysis Prompt (Based on MCP_TOOLS_TEST_RESULTS.md recommendations)
server.registerPrompt('day_trading_analysis', {
    title: 'Day Trading Analysis',
    description: 'Comprehensive day trading analysis with fast oscillators and order book depth',
    argsSchema: {
        ticker: z.string().describe('Asset ticker to analyze (e.g., BTC, ETH, SOL)'),
        capital: z.string().optional().describe('Trading capital in USD (default: 10000)'),
        riskPct: z.string().optional().describe('Risk percentage per trade (default: 0.5 for day trading)'),
        leverage: z.string().optional().describe('Leverage multiplier (default: 3 for day trading)'),
        timeframe: z.string().optional().describe('Primary timeframe: 1m, 5m, 15m (default: 5m)'),
    },
}, async (args) => {
    const ticker = args.ticker?.toUpperCase() || 'BTC';
    const capital = args.capital ? parseFloat(args.capital) : 10000;
    const riskPct = args.riskPct ? parseFloat(args.riskPct) : 0.5;
    const leverage = args.leverage ? parseInt(args.leverage) : 3;
    const timeframe = args.timeframe || '5m';
    return {
        messages: [
            {
                role: 'user',
                content: {
                    type: 'text',
                    text: `Please perform Day Trading analysis for ${ticker} (Timeframe: ${timeframe}, Capital: $${capital}, Risk: ${riskPct}%, Leverage: ${leverage}x):

**1. Price & Basic Data:**
- Use get_price for current price
- Use get_indicators for core technical indicators

**2. Fast Oscillators (Day Trading Focus):**
- Use stochastic_rsi for overbought/oversold with RSI + Stochastic combination
- Use fisher_transform for sharp reversal signals
- Use momentum for rate of price change
- Use chande_momentum for momentum on both sides (-100 to +100)

**3. Order Book & Liquidity:**
- Use get_orderbook_depth for bid/ask analysis, spread, liquidity scoring
- Use get_liquidation_levels for liquidation clusters and safe entry zones

**4. Volume Analysis:**
- Use get_volume_analysis for buy/sell pressure, POC levels
- Use volume_indicators for CMF (accumulation/distribution)

**5. Quick Trend Confirmation:**
- Use get_market_structure for immediate trend bias
- Use get_candlestick_patterns for reversal signals

**6. Risk Management:**
- Use calculate_risk_management with capital=${capital}, riskPct=${riskPct}
- Use calculate_position_setup with leverage=${leverage}

**Present Day Trading Summary:**
- Current price and immediate trend
- Fast oscillator signals (stochastic_rsi, fisher)
- Order book sentiment (bid/ask imbalance)
- Entry signal: SCALP LONG / SCALP SHORT / WAIT
- Entry price, tight stop loss (0.5-1%), quick take profit (1-2%)
- Risk/Reward ratio (aim for 1.5:1 minimum for day trades)
- Liquidation risk assessment

**Important:** Day trading requires quick decisions. Focus on:
- Fast oscillators for timing
- Order book for immediate direction
- Tight stops and quick profits
- Avoid trading during low liquidity periods`,
                },
            },
        ],
    };
});
// NEW: Swing Trading Analysis Prompt (Based on MCP_TOOLS_TEST_RESULTS.md recommendations)
server.registerPrompt('swing_trading_analysis', {
    title: 'Swing Trading Analysis',
    description: 'Comprehensive swing trading analysis with multi-timeframe and divergence detection',
    argsSchema: {
        ticker: z.string().describe('Asset ticker to analyze (e.g., BTC, ETH, SOL)'),
        capital: z.string().optional().describe('Trading capital in USD (default: 10000)'),
        riskPct: z.string().optional().describe('Risk percentage per trade (default: 1.0 for swing trading)'),
        leverage: z.string().optional().describe('Leverage multiplier (default: 5 for swing trading)'),
        holdPeriod: z.string().optional().describe('Expected hold period: 1d, 3d, 1w, 2w (default: 1w)'),
    },
}, async (args) => {
    const ticker = args.ticker?.toUpperCase() || 'BTC';
    const capital = args.capital ? parseFloat(args.capital) : 10000;
    const riskPct = args.riskPct ? parseFloat(args.riskPct) : 1.0;
    const leverage = args.leverage ? parseInt(args.leverage) : 5;
    const holdPeriod = args.holdPeriod || '1w';
    return {
        messages: [
            {
                role: 'user',
                content: {
                    type: 'text',
                    text: `Please perform Swing Trading analysis for ${ticker} (Hold Period: ${holdPeriod}, Capital: $${capital}, Risk: ${riskPct}%, Leverage: ${leverage}x):

**1. Multi-Timeframe Analysis:**
- Use get_Multitimeframe for Daily, 4H, 1H trend alignment
- Use get_market_structure for swing highs/lows identification

**2. Trend Indicators (Swing Trading Focus):**
- Use trend_indicators (supertrend) for ATR-based trend following
- Use elder_ray for bull/bear power (buying/selling pressure)
- Use schaff_trend_cycle for MACD + Stochastic with double smoothing
- Use trix for triple EMA rate of change

**3. Divergence Detection:**
- Use get_divergence for RSI divergence (bullish/bearish)
- Use get_candlestick_patterns for reversal patterns

**4. Momentum Confirmation:**
- Use get_indicators for RSI, MACD, ADX
- Use true_strength_index for double-smoothed momentum
- Use ultimate_oscillator for three-timeframe oscillator

**5. Volume & External Data:**
- Use get_volume_analysis for CVD trend, buy/sell pressure
- Use get_External_data for funding rate, open interest

**6. Risk Management:**
- Use calculate_risk_management with capital=${capital}, riskPct=${riskPct}
- Use calculate_position_setup with leverage=${leverage}

**Present Swing Trading Summary:**
- Multi-timeframe trend alignment (Daily/4H/1H)
- Trend strength score
- Divergence signals detected
- Entry signal: SWING LONG / SWING SHORT / WAIT
- Entry zone (support/resistance levels)
- Stop loss (2-3% for swing trades)
- Take profit levels (TP1: 5%, TP2: 10%, TP3: 15%)
- Risk/Reward ratio (aim for 2:1 minimum)
- Expected hold period: ${holdPeriod}

**Important:** Swing trading focuses on:
- Multi-timeframe alignment
- Divergence for reversal timing
- Trend indicators for confirmation
- Wider stops, bigger targets
- Patience for the setup to develop`,
                },
            },
        ],
    };
});
// NEW: Position Trading Analysis Prompt (Based on MCP_TOOLS_TEST_RESULTS.md recommendations)
server.registerPrompt('position_trading_analysis', {
    title: 'Position Trading Analysis',
    description: 'Long-term position trading analysis with volume profile and long-term momentum indicators',
    argsSchema: {
        ticker: z.string().describe('Asset ticker to analyze (e.g., BTC, ETH, SOL)'),
        capital: z.string().optional().describe('Trading capital in USD (default: 10000)'),
        riskPct: z.string().optional().describe('Risk percentage per trade (default: 2.0 for position trading)'),
        leverage: z.string().optional().describe('Leverage multiplier (default: 2 for position trading)'),
        holdPeriod: z.string().optional().describe('Expected hold period: 1m, 3m, 6m (default: 1m)'),
    },
}, async (args) => {
    const ticker = args.ticker?.toUpperCase() || 'BTC';
    const capital = args.capital ? parseFloat(args.capital) : 10000;
    const riskPct = args.riskPct ? parseFloat(args.riskPct) : 2.0;
    const leverage = args.leverage ? parseInt(args.leverage) : 2;
    const holdPeriod = args.holdPeriod || '1m';
    return {
        messages: [
            {
                role: 'user',
                content: {
                    type: 'text',
                    text: `Please perform Position Trading analysis for ${ticker} (Hold Period: ${holdPeriod}, Capital: $${capital}, Risk: ${riskPct}%, Leverage: ${leverage}x):

**1. Long-Term Trend Analysis:**
- Use get_market_regime for overall market conditions (trending/choppy/volatile)
- Use get_volume_profile for POC, VAH, VAL, accumulation/distribution zones

**2. Long-Term Momentum Indicators (Position Trading Focus):**
- Use know_sure_thing for multi-timeframe ROC momentum
- Use coppock_curve for major market bottoms, long-term momentum
- Use relative_vigor_index for close vs open momentum

**3. Adaptive Moving Averages:**
- Use hull_ma for smooth trend with reduced lag
- Use kaufman_adaptive_ma for adaptive to market efficiency
- Use mcginley_dynamic for adaptive to market volatility
- Use rainbow_ma for multi-period trend visualization

**4. Volume Profile Analysis:**
- Use get_volume_profile for session and composite profiles
- Use strength_indicators (bull_bear_power) for buying vs selling strength
- Use coppock_curve for contraction/expansion phases

**5. External Data (Long-Term Sentiment):**
- Use get_External_data for funding rate trends, open interest
- Use get_long_short_ratio for market sentiment

**6. Risk Management:**
- Use calculate_risk_management with capital=${capital}, riskPct=${riskPct}
- Use calculate_position_setup with leverage=${leverage}

**Present Position Trading Summary:**
- Market regime: trending/choppy/volatile
- Long-term trend direction
- Volume profile key levels (POC, VAH, VAL)
- Long-term momentum signals (KST, Coppock)
- Entry signal: POSITION LONG / POSITION SHORT / ACCUMULATE / WAIT
- Entry zone (accumulation zone from volume profile)
- Stop loss (5-10% for position trades)
- Take profit levels (TP1: 20%, TP2: 50%, TP3: 100%+)
- Risk/Reward ratio (aim for 3:1 minimum)
- Expected hold period: ${holdPeriod}

**Important:** Position trading focuses on:
- Long-term market regime
- Volume profile for key levels
- Long-term momentum for timing
- Lower leverage, wider stops
- Patience for major moves`,
                },
            },
        ],
    };
});
// NEW: Risk Management Analysis Prompt (Enhanced based on MCP_TOOLS_TEST_RESULTS.md)
server.registerPrompt('risk_management_analysis', {
    title: 'Risk Management Analysis',
    description: 'Comprehensive risk management analysis with liquidation levels and volatility assessment',
    argsSchema: {
        ticker: z.string().describe('Asset ticker to analyze (e.g., BTC, ETH, SOL)'),
        entryPrice: z.string().optional().describe('Planned entry price (uses current price if not provided)'),
        side: z.string().optional().describe('Trade side: LONG or SHORT (default: LONG)'),
        capital: z.string().optional().describe('Trading capital in USD (default: 10000)'),
        riskPct: z.string().optional().describe('Risk percentage per trade (default: 1.0)'),
        leverage: z.string().optional().describe('Planned leverage (default: 5)'),
    },
}, async (args) => {
    const ticker = args.ticker?.toUpperCase() || 'BTC';
    const entryPrice = args.entryPrice || 'current';
    const side = args.side?.toUpperCase() || 'LONG';
    const capital = args.capital ? parseFloat(args.capital) : 10000;
    const riskPct = args.riskPct ? parseFloat(args.riskPct) : 1.0;
    const leverage = args.leverage ? parseInt(args.leverage) : 5;
    return {
        messages: [
            {
                role: 'user',
                content: {
                    type: 'text',
                    text: `Please perform comprehensive Risk Management analysis for ${ticker} ${side} position:

**Entry Parameters:**
- Entry Price: ${entryPrice === 'current' ? 'Use current market price' : entryPrice}
- Side: ${side}
- Capital: $${capital}
- Risk: ${riskPct}%
- Planned Leverage: ${leverage}x

**1. Current Price & Volatility:**
- Use get_price for current price
- Use volatility_indicators (bollinger_band_width) for volatility assessment
- Use get_indicators for ATR (volatility measure)

**2. Liquidation Risk Assessment:**
- Use get_liquidation_levels for liquidation clusters
- Identify safe entry zones away from liquidation clusters
- Assess cascade risk potential

**3. Position Sizing:**
- Use calculate_position_setup with capital=${capital}, riskPct=${riskPct}, leverage=${leverage}
- Calculate optimal position size based on volatility

**4. Stop Loss Calculation:**
- Use calculate_risk_management for optimal stop loss levels
- Calculate ATR-based stop loss
- Identify support/resistance for technical stop loss

**5. Take Profit Planning:**
- Calculate multiple TP levels (TP1: 2:1, TP2: 3:1, TP3: 5:1)
- Use get_market_structure for resistance levels (for LONG) or support (for SHORT)

**6. Risk/Reward Assessment:**
- Calculate overall R:R ratio
- Assess probability of success based on technical signals

**Present Risk Management Summary:**

| Metric | Value |
|--------|-------|
| Entry Price | [PRICE] |
| Position Size | [QUANTITY] ${ticker} |
| Position Value | $[USD] |
| Leverage | ${leverage}x |
| Margin Used | $[USD] |
| Stop Loss | [PRICE] ([%] from entry) |
| TP1 (2:1) | [PRICE] ([%] gain) |
| TP2 (3:1) | [PRICE] ([%] gain) |
| TP3 (5:1) | [PRICE] ([%] gain) |
| Max Loss | $[USD] (${riskPct}% of capital) |
| Max Gain (TP3) | $[USD] |
| R:R Ratio | [X]:1 |
| Liquidation Price | [PRICE] |
| Liquidation Distance | [%] |

**Risk Assessment:**
- Volatility Level: [LOW / MEDIUM / HIGH]
- Liquidation Risk: [LOW / MEDIUM / HIGH]
- Overall Risk: [LOW / MEDIUM / HIGH]
- Recommendation: [PROCEED / REDUCE LEVERAGE / WAIT]`,
                },
            },
        ],
    };
});
// NEW: Oscillators Analysis Prompt (All 10 oscillator tools from MCP_TOOLS_TEST_RESULTS.md)
server.registerPrompt('oscillators_analysis', {
    title: 'Oscillators Analysis',
    description: 'Analyze all oscillator indicators for overbought/oversold and momentum signals',
    argsSchema: {
        ticker: z.string().describe('Asset ticker to analyze (e.g., BTC, ETH, SOL)'),
        focusType: z.string().optional().describe('Focus on: fast (day trading), medium (swing), slow (position). Default: all'),
    },
}, async (args) => {
    const ticker = args.ticker?.toUpperCase() || 'BTC';
    const focusType = args.focusType || 'all';
    return {
        messages: [
            {
                role: 'user',
                content: {
                    type: 'text',
                    text: `Please analyze all oscillator indicators for ${ticker} (Focus: ${focusType}):

**Fast Oscillators (Day Trading):**
- Use stochastic_rsi for overbought/oversold with RSI + Stochastic
- Use fisher_transform for sharp reversal signals
- Use momentum for rate of price change

**Medium Oscillators (Swing Trading):**
- Use chande_momentum for momentum on both sides (-100 to +100)
- Use rate_of_change for percentage change in price
- Use percentage_price_oscillator for MACD as percentage
- Use detrended_price for cycle identification

**Slow Oscillators (Position Trading):**
- Use gator_oscillator for Alligator convergence/divergence
- Use ultimate_oscillator for three-timeframe oscillator
- Use true_strength_index for double-smoothed momentum

**Trend Confirmation:**
- Use schaff_trend_cycle for MACD + Stochastic with double smoothing

**Present Oscillators Summary:**

| Oscillator | Value | Signal | Confidence |
|------------|-------|--------|------------|
| Stochastic RSI | [K/D] | [OVERBOUGHT/OVERSOLD/NEUTRAL] | [HIGH/MED/LOW] |
| Fisher Transform | [VALUE] | [BULLISH/BEARISH/NEUTRAL] | [HIGH/MED/LOW] |
| Momentum | [VALUE] | [BULLISH/BEARISH] | [HIGH/MED/LOW] |
| Chande Momentum | [VALUE] | [OVERBOUGHT/OVERSOLD/NEUTRAL] | [HIGH/MED/LOW] |
| ROC | [%] | [BULLISH/BEARISH] | [HIGH/MED/LOW] |
| PPO | [%] | [BULLISH/BEARISH] | [HIGH/MED/LOW] |
| Detrended Price | [VALUE] | [CYCLE POSITION] | [HIGH/MED/LOW] |
| Gator | [UPPER/LOWER] | [AWAKE/SLEEPING] | [HIGH/MED/LOW] |
| Ultimate Oscillator | [VALUE] | [OVERBOUGHT/OVERSOLD/NEUTRAL] | [HIGH/MED/LOW] |
| TSI | [VALUE] | [BULLISH/BEARISH] | [HIGH/MED/LOW] |
| Schaff Trend | [VALUE] | [BUY/SELL/NEUTRAL] | [HIGH/MED/LOW] |

**Overall Oscillator Consensus:**
- Bullish signals: [COUNT]/11
- Bearish signals: [COUNT]/11
- Neutral signals: [COUNT]/11
- Overall signal: [BULLISH/BEARISH/NEUTRAL]
- Recommendation: [BUY/SELL/WAIT]`,
                },
            },
        ],
    };
});
// NEW: Moving Averages Analysis Prompt (All 8 MA tools from MCP_TOOLS_TEST_RESULTS.md)
server.registerPrompt('moving_averages_analysis', {
    title: 'Moving Averages Analysis',
    description: 'Analyze all moving average indicators for trend direction and crossovers',
    argsSchema: {
        ticker: z.string().describe('Asset ticker to analyze (e.g., BTC, ETH, SOL)'),
        period: z.string().optional().describe('MA period focus: short (9,20), medium (50,100), long (200). Default: all'),
    },
}, async (args) => {
    const ticker = args.ticker?.toUpperCase() || 'BTC';
    const period = args.period || 'all';
    return {
        messages: [
            {
                role: 'user',
                content: {
                    type: 'text',
                    text: `Please analyze all moving average indicators for ${ticker} (Period focus: ${period}):

**Standard Moving Averages:**
- Use get_indicators for EMA20, EMA50 (baseline)
- Use double_ema for reduced lag EMA (DEMA)
- Use triple_ema for further reduced lag (TEMA)

**Weighted Moving Averages:**
- Use weighted_ma for recent price weighted MA (WMA)
- Use smoothed_ma for smooth trend following (SMMA)
- Use vwma for volume-weighted moving average

**Adaptive Moving Averages:**
- Use hull_ma for smooth trend with reduced lag (HMA)
- Use kaufman_adaptive_ma for adaptive to market efficiency (KAMA)
- Use mcginley_dynamic for adaptive to market volatility

**Visual Trend Analysis:**
- Use rainbow_ma for multi-period trend visualization

**Present Moving Averages Summary:**

| MA Type | Value | Price Position | Signal |
|---------|-------|----------------|--------|
| EMA20 | [PRICE] | [ABOVE/BELOW] | [BULLISH/BEARISH] |
| EMA50 | [PRICE] | [ABOVE/BELOW] | [BULLISH/BEARISH] |
| DEMA | [PRICE] | [ABOVE/BELOW] | [BULLISH/BEARISH] |
| TEMA | [PRICE] | [ABOVE/BELOW] | [BULLISH/BEARISH] |
| WMA | [PRICE] | [ABOVE/BELOW] | [BULLISH/BEARISH] |
| SMMA | [PRICE] | [ABOVE/BELOW] | [BULLISH/BEARISH] |
| VWMA | [PRICE] | [ABOVE/BELOW] | [BULLISH/BEARISH] |
| HMA | [PRICE] | [ABOVE/BELOW] | [BULLISH/BEARISH] |
| KAMA | [PRICE] | [ABOVE/BELOW] | [BULLISH/BEARISH] |
| McGinley | [PRICE] | [ABOVE/BELOW] | [BULLISH/BEARISH] |

**Rainbow MA Alignment:**
- Short-term MAs: [BULLISH/BEARISH] (2-5 periods)
- Medium-term MAs: [BULLISH/BEARISH] (6-7 periods)
- Long-term MAs: [BULLISH/BEARISH] (8-9 periods)
- Rainbow alignment: [PERFECT/MIXED/INVERTED]

**Crossover Signals:**
- Golden Cross (EMA20 > EMA50): [YES/NO]
- Death Cross (EMA20 < EMA50): [YES/NO]
- Recent crossover: [GOLDEN/DEATH/NONE]

**Overall MA Trend:**
- Bullish MAs: [COUNT]/10
- Bearish MAs: [COUNT]/10
- Overall trend: [STRONG UPTREND/UPTREND/NEUTRAL/DOWNTREND/STRONG DOWNTREND]
- Recommendation: [BUY/SELL/WAIT]`,
                },
            },
        ],
    };
});
// Register Additional Resource Templates
server.registerResource('technical-indicators-guide', 'geartrade://docs/technical-indicators', {
    description: 'Complete guide on technical indicators available in GearTrade: RSI, EMA, MACD, Bollinger Bands, ATR, ADX, and more',
    mimeType: 'text/markdown',
}, async () => {
    return {
        contents: [
            {
                uri: 'geartrade://docs/technical-indicators',
                mimeType: 'text/markdown',
                text: `# Technical Indicators Guide

## Overview

GearTrade MCP Server provides access to 20+ technical indicators for comprehensive market analysis. This guide explains each indicator, its interpretation, and trading applications.

## Momentum Indicators

### RSI (Relative Strength Index)
- **Range**: 0-100
- **Oversold**: <30 (potential BUY signal)
- **Overbought**: >70 (potential SELL signal)
- **Neutral**: 30-70
- **Usage**: Identify reversal points, confirm trends
- **Timeframes**: RSI14 (14-period), RSI7 (7-period), RSI4h (4-hour)

### Stochastic Oscillator
- **Range**: 0-100
- **Oversold**: <20
- **Overbought**: >80
- **Usage**: Momentum indicator, works well with RSI
- **Components**: %K (fast), %D (slow)

### CCI (Commodity Channel Index)
- **Range**: -100 to +100
- **Oversold**: <-100
- **Overbought**: >+100
- **Usage**: Identify cyclical trends, breakouts

### Williams %R
- **Range**: -100 to 0
- **Oversold**: <-80
- **Overbought**: >-20
- **Usage**: Momentum indicator, similar to Stochastic

## Trend Indicators

### EMA (Exponential Moving Average)
- **Common Periods**: EMA9, EMA21, EMA50, EMA100, EMA200
- **Golden Cross**: EMA9 > EMA21 (bullish)
- **Death Cross**: EMA9 < EMA21 (bearish)
- **Usage**: Identify trend direction, support/resistance levels

### MACD (Moving Average Convergence Divergence)
- **Components**: MACD line, Signal line, Histogram
- **Bullish**: MACD crosses above Signal
- **Bearish**: MACD crosses below Signal
- **Usage**: Trend confirmation, momentum shifts

### ADX (Average Directional Index)
- **Range**: 0-100
- **Strong Trend**: >25
- **Weak Trend**: <20
- **Usage**: Measure trend strength (not direction)

### Parabolic SAR
- **Above Price**: Bearish trend
- **Below Price**: Bullish trend
- **Usage**: Trend following, stop loss placement

### Aroon Indicator
- **Aroon Up**: Measures uptrend strength (0-100)
- **Aroon Down**: Measures downtrend strength (0-100)
- **Usage**: Identify trend changes, consolidation periods

## Volatility Indicators

### Bollinger Bands
- **Components**: Upper band, Middle band (SMA20), Lower band
- **Squeeze**: Bands narrow (low volatility, potential breakout)
- **Expansion**: Bands widen (high volatility)
- **Usage**: Identify overbought/oversold, volatility changes

### ATR (Average True Range)
- **Usage**: Measure volatility, set stop loss levels
- **Stop Loss**: 1.5x-3x ATR from entry
- **High ATR**: High volatility (wider stops)
- **Low ATR**: Low volatility (tighter stops)

## Volume Indicators

### OBV (On-Balance Volume)
- **Rising OBV**: Accumulation (bullish)
- **Falling OBV**: Distribution (bearish)
- **Usage**: Confirm price trends, detect divergences

### VWAP (Volume Weighted Average Price)
- **Above VWAP**: Bullish intraday
- **Below VWAP**: Bearish intraday
- **Usage**: Intraday trading, institutional price levels

### CVD (Cumulative Volume Delta)
- **Positive CVD**: Buying pressure
- **Negative CVD**: Selling pressure
- **Usage**: Early trend detection, divergence analysis

## Support & Resistance

### Support/Resistance Levels
- **Support**: Price level where buying interest is strong
- **Resistance**: Price level where selling interest is strong
- **Usage**: Entry/exit points, stop loss placement

### Fibonacci Retracement
- **Key Levels**: 23.6%, 38.2%, 50%, 61.8%, 78.6%
- **Usage**: Identify potential reversal zones
- **Calculation**: Based on swing highs and lows

## Multi-Timeframe Analysis

### Timeframes Available
- **Daily (1D)**: Long-term trend
- **4-Hour (4H)**: Medium-term trend
- **1-Hour (1H)**: Short-term trend

### Trend Alignment
- **Aligned**: All timeframes trending same direction (high confidence)
- **Not Aligned**: Mixed signals (lower confidence)
- **Usage**: Confirm trade setups, filter false signals

## Indicator Combinations

### High-Confidence BUY Setup
- RSI <30 (oversold)
- Price at support level
- EMA9 > EMA21 (uptrend)
- Positive CVD trend
- Multi-timeframe alignment (bullish)

### High-Confidence SELL Setup
- RSI >70 (overbought)
- Price at resistance level
- EMA9 < EMA21 (downtrend)
- Negative CVD trend
- Multi-timeframe alignment (bearish)

## Best Practices

1. **Never rely on single indicator** - Use multiple confirmations
2. **Combine different indicator types** - Momentum + Trend + Volume
3. **Use multi-timeframe analysis** - Confirm on higher timeframes
4. **Watch for divergences** - Price vs indicator divergence = early signal
5. **Respect market context** - Indicators work better in trending vs ranging markets

## Common Mistakes

1. ❌ Using too many indicators (analysis paralysis)
2. ❌ Ignoring volume confirmation
3. ❌ Trading against the trend
4. ❌ Not using multi-timeframe confirmation
5. ❌ Ignoring divergences
`,
            },
        ],
    };
});
server.registerResource('hyperliquid-api-reference', 'geartrade://docs/hyperliquid-api', {
    description: 'Hyperliquid API reference guide: endpoints, authentication, order types, and integration details',
    mimeType: 'text/markdown',
}, async () => {
    return {
        contents: [
            {
                uri: 'geartrade://docs/hyperliquid-api',
                mimeType: 'text/markdown',
                text: `# Hyperliquid API Reference

## Overview

GearTrade MCP Server integrates with Hyperliquid DEX for perpetual futures trading. This guide covers API endpoints, authentication, and order execution.

## Authentication

### EIP-712 Signing
- **Standard**: EIP-712 typed data signing
- **Purpose**: Secure order submission without exposing private keys
- **Implementation**: Automatic in \`hyperliquid_testnet_futures_trade\` and \`hyperliquid_mainnet_futures_trade\` tools

### Credentials
- **Account Address**: Your Hyperliquid wallet address (0x format)
- **Wallet API Key**: Your private key for signing (keep secure!)
- **Note**: Credentials can be provided via tool parameters (multi-user support)

## Order Types

### Market Orders
- **Execution**: Immediate at best available price
- **Slippage**: May occur during high volatility
- **Usage**: Fast execution, no price guarantee

### Limit Orders
- **Execution**: Only at specified price or better
- **Slippage**: None (price guaranteed)
- **Usage**: Price control, may not fill immediately

## Order Sides

### LONG (Buy)
- **Action**: Open long position or close short position
- **Profit**: When price increases
- **Usage**: Bullish market outlook

### SHORT (Sell)
- **Action**: Open short position or close long position
- **Profit**: When price decreases
- **Usage**: Bearish market outlook

## Leverage

### Available Leverage
- **Range**: 1x to 50x
- **Spot Trading**: 1x (no leverage)
- **Futures Trading**: 1x-50x

### Leverage Guidelines
- **Conservative**: 1x-3x
- **Moderate**: 3x-10x
- **Aggressive**: 10x-50x (high risk!)

### Dynamic Leverage
- Use \`calculate_dynamic_leverage\` tool
- Based on volatility (ATR), market conditions
- Recommended: Lower leverage in high volatility

## Position Management

### Position Sizing
- **Risk-Based**: 1-2% of capital per trade
- **Calculation**: Use \`calculate_position_setup\` tool
- **Formula**: (Capital × Risk %) / (Entry - Stop Loss)

### Stop Loss
- **Fixed**: 1-3% from entry
- **ATR-Based**: 1.5x-3x ATR
- **Support/Resistance**: Below support (longs) or above resistance (shorts)

### Take Profit
- **Risk/Reward**: Minimum 2:1, recommended 3:1
- **Multiple Levels**: TP1 (2:1), TP2 (3:1), TP3 (5:1)
- **Trailing Stop**: Move stop to breakeven after TP1

## API Endpoints

### Price Data
- **Real-time Price**: \`get_price\` tool
- **Multiple Prices**: \`get_price\` tool with tickers array
- **Source**: Hyperliquid and Binance APIs

### Market Data
- **Funding Rate**: Real-time funding rate with trend
- **Open Interest**: Total open positions
- **Volume**: 24h volume and trends

### Order Execution
- **Testnet Trading**: \`hyperliquid_testnet_futures_trade\` (test mode)
- **Mainnet Trading**: \`hyperliquid_mainnet_futures_trade\` (real money)
- **Leverage**: 1-100x supported
- **Safety**: Mainnet requires \`confirmExecution: "true"\`

## Safety Features

### Paper Trading (Default)
- **Purpose**: Test strategies without real money
- **Slippage Modeling**: Realistic execution simulation
- **Usage**: Always test before live trading

### Multi-Asset Execution
- **Default**: Paper trading (safety)
- **Reason**: Multiple simultaneous executions = higher risk
- **Override**: Explicit \`execute: true\` required

### User Confirmation
- **Required**: Always get user confirmation before live execution
- **Best Practice**: Present analysis, ask "Mau dieksekusi ke Hyperliquid? (YES/NO)"

## Error Handling

### Common Errors
- **Insufficient Balance**: Not enough funds for order
- **Invalid Leverage**: Leverage exceeds limits
- **Market Closed**: Trading not available
- **Network Error**: API connection issues

### Error Recovery
- **Retry Logic**: Automatic retry for network errors
- **User Notification**: Clear error messages
- **Fallback**: Paper trading if live execution fails

## Best Practices

1. **Always test with paper trading first**
2. **Start with small position sizes**
3. **Use appropriate leverage for volatility**
4. **Set stop loss on every trade**
5. **Monitor positions actively**
6. **Respect risk limits (1-2% per trade)**
7. **Get user confirmation before live execution**

## Rate Limits

- **Price Data**: No strict limits (cached)
- **Order Execution**: Follow Hyperliquid rate limits
- **Best Practice**: Avoid rapid-fire orders

## Security

- **Never share private keys**
- **Use environment variables or tool parameters**
- **Multi-user support**: Each user provides own credentials
- **EIP-712 signing**: Secure without exposing keys
`,
            },
        ],
    };
});
server.registerResource('market-analysis-patterns', 'geartrade://docs/market-patterns', {
    description: 'Common market analysis patterns: chart patterns, candlestick patterns, and market structure analysis',
    mimeType: 'text/markdown',
}, async () => {
    return {
        contents: [
            {
                uri: 'geartrade://docs/market-patterns',
                mimeType: 'text/markdown',
                text: `# Market Analysis Patterns Guide

## Overview

This guide covers common market patterns, chart formations, and market structure analysis techniques available in GearTrade MCP Server.

## Candlestick Patterns

### Reversal Patterns

#### Doji
- **Appearance**: Open and close are nearly equal
- **Signal**: Indecision, potential reversal
- **Usage**: Wait for confirmation on next candle

#### Hammer
- **Appearance**: Small body, long lower wick
- **Signal**: Bullish reversal (at support)
- **Usage**: Enter long after confirmation

#### Shooting Star
- **Appearance**: Small body, long upper wick
- **Signal**: Bearish reversal (at resistance)
- **Usage**: Enter short after confirmation

#### Engulfing Patterns
- **Bullish Engulfing**: Large green candle engulfs previous red
- **Bearish Engulfing**: Large red candle engulfs previous green
- **Signal**: Strong reversal signal
- **Usage**: High-confidence reversal entry

### Continuation Patterns

#### Three White Soldiers
- **Appearance**: Three consecutive green candles
- **Signal**: Strong uptrend continuation
- **Usage**: Add to long positions

#### Three Black Crows
- **Appearance**: Three consecutive red candles
- **Signal**: Strong downtrend continuation
- **Usage**: Add to short positions

## Chart Patterns

### Trend Patterns

#### Ascending Triangle
- **Formation**: Higher lows, horizontal resistance
- **Signal**: Bullish breakout expected
- **Entry**: On breakout above resistance

#### Descending Triangle
- **Formation**: Lower highs, horizontal support
- **Signal**: Bearish breakdown expected
- **Entry**: On breakdown below support

#### Symmetrical Triangle
- **Formation**: Converging support and resistance
- **Signal**: Breakout direction uncertain
- **Entry**: Wait for breakout confirmation

### Reversal Patterns

#### Head and Shoulders
- **Formation**: Three peaks, middle highest
- **Signal**: Bearish reversal
- **Entry**: On neckline breakdown

#### Inverse Head and Shoulders
- **Formation**: Three troughs, middle lowest
- **Signal**: Bullish reversal
- **Entry**: On neckline breakout

#### Double Top
- **Formation**: Two similar peaks
- **Signal**: Bearish reversal
- **Entry**: On breakdown below support

#### Double Bottom
- **Formation**: Two similar troughs
- **Signal**: Bullish reversal
- **Entry**: On breakout above resistance

## Market Structure

### Change of Character (COC)
- **Definition**: Shift in market structure (uptrend to downtrend or vice versa)
- **Detection**: Use \`get_market_structure\` tool
- **Signal**: Potential trend reversal
- **Usage**: Early warning for trend changes

### Swing Patterns
- **Swing High**: Local price peak
- **Swing Low**: Local price trough
- **Usage**: Identify trend direction, support/resistance

### Structure Strength
- **Strong Structure**: Clear trend with consistent swings
- **Weak Structure**: Choppy, ranging market
- **Usage**: Determine if trend-following or mean-reversion strategy

## Volume Patterns

### Volume Profile Patterns

#### POC (Point of Control)
- **Definition**: Price level with highest volume
- **Usage**: Strong support/resistance level
- **Trading**: Trade from POC to value area boundaries

#### Value Area
- **VAH (Value Area High)**: Upper boundary
- **VAL (Value Area Low)**: Lower boundary
- **Usage**: Identify fair value zone
- **Trading**: Price tends to return to value area

#### HVN/LVN (High/Low Volume Nodes)
- **HVN**: High volume price levels (support/resistance)
- **LVN**: Low volume price levels (quick price movement)
- **Usage**: Identify liquidity zones

### Volume Analysis Patterns

#### Accumulation
- **Pattern**: Increasing volume on up moves
- **Signal**: Bullish, smart money buying
- **Usage**: Enter long positions

#### Distribution
- **Pattern**: Increasing volume on down moves
- **Signal**: Bearish, smart money selling
- **Usage**: Enter short positions

#### Volume Divergence
- **Pattern**: Price makes new high/low, volume doesn't confirm
- **Signal**: Weak move, potential reversal
- **Usage**: Early reversal signal

## Order Book Patterns

### Bid/Ask Imbalance
- **Large Bid Wall**: Strong support, potential bounce
- **Large Ask Wall**: Strong resistance, potential rejection
- **Usage**: Short-term direction indicator

### Order Flow
- **Buying Pressure**: More buy orders than sell
- **Selling Pressure**: More sell orders than buy
- **Usage**: Immediate market sentiment

### Spread Analysis
- **Tight Spread**: High liquidity, low slippage
- **Wide Spread**: Low liquidity, high slippage
- **Usage**: Execution quality indicator

## Fibonacci Patterns

### Retracement Levels
- **23.6%**: Shallow retracement
- **38.2%**: Normal retracement
- **50%**: Psychological level
- **61.8%**: Deep retracement (golden ratio)
- **Usage**: Entry zones, support/resistance

### Extension Levels
- **127.2%**: First extension
- **161.8%**: Golden ratio extension
- **200%**: Double extension
- **Usage**: Take profit targets

## Divergence Patterns

### RSI Divergence
- **Bullish Divergence**: Price makes lower low, RSI makes higher low
- **Bearish Divergence**: Price makes higher high, RSI makes lower high
- **Signal**: Early reversal indicator
- **Usage**: Enter before price reversal

### Price-Volume Divergence
- **Pattern**: Price and volume move in opposite directions
- **Signal**: Weak trend, potential reversal
- **Usage**: Confirm with other indicators

## Liquidation Patterns

### Liquidation Clusters
- **Definition**: Concentration of stop losses
- **Detection**: Use \`get_liquidation_levels\` tool
- **Usage**: Identify potential stop hunt zones

### Stop Hunt
- **Pattern**: Price moves to liquidate positions before reversing
- **Signal**: Contrarian opportunity
- **Usage**: Enter opposite direction after liquidation

## Best Practices

1. **Wait for pattern confirmation** - Don't enter on pattern formation alone
2. **Combine multiple patterns** - Higher confidence with multiple confirmations
3. **Use volume confirmation** - Patterns work better with volume support
4. **Respect market structure** - Patterns work better in trending markets
5. **Set appropriate stop loss** - Patterns can fail, protect capital

## Common Mistakes

1. ❌ Entering before pattern confirmation
2. ❌ Ignoring volume confirmation
3. ❌ Trading patterns in ranging markets
4. ❌ Not setting stop loss
5. ❌ Over-trading on every pattern
`,
            },
        ],
    };
});
server.registerResource('common-trading-mistakes', 'geartrade://docs/common-mistakes', {
    description: 'Common trading mistakes to avoid: emotional trading, over-leveraging, ignoring risk management, and more',
    mimeType: 'text/markdown',
}, async () => {
    return {
        contents: [
            {
                uri: 'geartrade://docs/common-mistakes',
                mimeType: 'text/markdown',
                text: `# Common Trading Mistakes to Avoid

## Overview

This guide lists common trading mistakes and how to avoid them. Learning from these mistakes can significantly improve your trading performance.

## Risk Management Mistakes

### ❌ Not Setting Stop Loss
- **Problem**: Unlimited downside risk
- **Solution**: Always set stop loss (1-3% from entry)
- **Tool**: Use \`calculate_risk_management\` tool

### ❌ Risking Too Much Per Trade
- **Problem**: Large losses can wipe out account
- **Solution**: Never risk more than 1-2% per trade
- **Tool**: Use \`calculate_position_setup\` tool

### ❌ Moving Stop Loss Against Position
- **Problem**: Turning small loss into large loss
- **Solution**: Only move stop loss in profit direction
- **Exception**: Trailing stop to lock in profits

### ❌ Ignoring Risk/Reward Ratio
- **Problem**: Taking trades with poor R:R
- **Solution**: Minimum 2:1, recommended 3:1
- **Tool**: Use \`calculate_risk_management\` tool

## Leverage Mistakes

### ❌ Over-Leveraging
- **Problem**: Small price move = large loss
- **Solution**: Use appropriate leverage (1x-10x for most traders)
- **Tool**: Use \`calculate_dynamic_leverage\` tool

### ❌ Using Same Leverage for All Markets
- **Problem**: High volatility markets need lower leverage
- **Solution**: Adjust leverage based on volatility (ATR)
- **Tool**: Use \`calculate_dynamic_leverage\` tool

### ❌ Ignoring Margin Requirements
- **Problem**: Forced liquidation
- **Solution**: Maintain 150-200% of required margin
- **Tool**: Use \`calculate_dynamic_margin_percentage\` tool

## Analysis Mistakes

### ❌ Trading Without Analysis
- **Problem**: Random entries, poor results
- **Solution**: Always use comprehensive analysis
- **Tool**: Use \`get_indicators\` + \`get_market_structure\` tools before trading

### ❌ Ignoring Multi-Timeframe Analysis
- **Problem**: Trading against higher timeframe trend
- **Solution**: Check Daily, 4H, and 1H alignment
- **Tool**: Use \`get_Multitimeframe\` tool

### ❌ Not Waiting for Confirmation
- **Problem**: Entering too early, false signals
- **Solution**: Wait for multiple confirmations
- **Best Practice**: RSI + Volume + Trend alignment

### ❌ Ignoring Volume Analysis
- **Problem**: Missing important market signals
- **Solution**: Always check volume trends
- **Tool**: Use \`get_volume_analysis\` tool

## Execution Mistakes

### ❌ Executing Without User Confirmation
- **Problem**: Unauthorized trades, user frustration
- **Solution**: Always ask "Mau dieksekusi ke Hyperliquid? (YES/NO)"
- **Best Practice**: Present analysis first, then ask

### ❌ Skipping Paper Trading
- **Problem**: Testing strategies with real money
- **Solution**: Always test with paper trading first
- **Default**: All execution tools default to paper trading

### ❌ Not Monitoring Positions
- **Problem**: Missing exit signals, large losses
- **Solution**: Actively monitor open positions
- **Tool**: Use \`get_position\` tool regularly

### ❌ Trading During High Volatility
- **Problem**: Increased slippage, wider stops
- **Solution**: Avoid trading during extreme volatility
- **Indicator**: High ATR = high volatility

## Emotional Mistakes

### ❌ FOMO (Fear of Missing Out)
- **Problem**: Entering trades out of fear
- **Solution**: Stick to your strategy, wait for setups
- **Reminder**: There's always another opportunity

### ❌ Revenge Trading
- **Problem**: Trying to recover losses quickly
- **Solution**: Take a break after losses, review strategy
- **Best Practice**: Maximum 2-3 trades per day

### ❌ Greed
- **Problem**: Holding winners too long, not taking profits
- **Solution**: Use take profit levels, trail stop loss
- **Tool**: Use \`calculate_risk_management\` for TP levels

### ❌ Fear
- **Problem**: Exiting winners too early, not taking trades
- **Solution**: Trust your analysis, follow the plan
- **Reminder**: Risk is managed with stop loss

## Strategy Mistakes

### ❌ Changing Strategy After Losses
- **Problem**: No consistent approach
- **Solution**: Stick to one strategy, improve it
- **Best Practice**: Backtest before changing

### ❌ Over-Trading
- **Problem**: Too many trades, overtrading
- **Solution**: Quality over quantity
- **Best Practice**: 1-3 high-quality setups per day

### ❌ Trading Against the Trend
- **Problem**: Fighting the market
- **Solution**: Trade with the trend
- **Tool**: Use \`get_Multitimeframe\` to identify trend

### ❌ Not Diversifying
- **Problem**: All capital in one trade
- **Solution**: Spread risk across multiple positions
- **Best Practice**: Max 3-5 positions at once

## Technical Mistakes

### ❌ Using Too Many Indicators
- **Problem**: Analysis paralysis, conflicting signals
- **Solution**: Use 3-5 key indicators
- **Recommended**: RSI, EMA, Volume, Multi-timeframe

### ❌ Ignoring Divergences
- **Problem**: Missing early reversal signals
- **Solution**: Always check for divergences
- **Tool**: Use \`get_divergence\` tool

### ❌ Not Using Stop Loss Based on ATR
- **Problem**: Fixed stops don't account for volatility
- **Solution**: Use ATR-based stops (1.5x-3x ATR)
- **Tool**: Use \`get_indicators\` for ATR values

### ❌ Ignoring Market Structure
- **Problem**: Trading in wrong market regime
- **Solution**: Adapt strategy to market structure
- **Tool**: Use \`get_market_structure\` tool

## How to Avoid Mistakes

### Pre-Trade Checklist
- [ ] Comprehensive analysis completed
- [ ] Multi-timeframe alignment checked
- [ ] Volume analysis confirms signal
- [ ] Risk management calculated (1-2% risk)
- [ ] Stop loss set (1-3% from entry)
- [ ] Take profit set (2:1+ R:R)
- [ ] Leverage appropriate for volatility
- [ ] User confirmation obtained

### Post-Trade Review
- [ ] Review what went right
- [ ] Review what went wrong
- [ ] Identify mistakes made
- [ ] Plan improvements
- [ ] Update strategy if needed

## Recovery from Mistakes

### After a Loss
1. **Take a break** - Don't revenge trade
2. **Review the trade** - What went wrong?
3. **Identify the mistake** - Was it analysis, execution, or risk?
4. **Learn from it** - How to avoid next time?
5. **Return with plan** - Don't repeat the mistake

### After Multiple Losses
1. **Stop trading** - Take a longer break
2. **Review all trades** - Find common mistakes
3. **Revise strategy** - Fix identified issues
4. **Paper trade** - Test revised strategy
5. **Return gradually** - Start with smaller positions

## Key Takeaways

1. **Risk management is non-negotiable** - Always set stop loss
2. **Analysis before execution** - Never trade blindly
3. **Emotions kill profits** - Stick to the plan
4. **Learn from mistakes** - Every loss is a lesson
5. **Consistency matters** - Stick to your strategy
`,
            },
        ],
    };
});
server.registerResource('position-sizing-guide', 'geartrade://docs/position-sizing', {
    description: 'Complete guide on position sizing, leverage calculation, and margin management for optimal risk control',
    mimeType: 'text/markdown',
}, async () => {
    return {
        contents: [
            {
                uri: 'geartrade://docs/position-sizing',
                mimeType: 'text/markdown',
                text: `# Position Sizing Guide

## Overview

Proper position sizing is critical for long-term trading success. This guide covers position sizing formulas, leverage management, and margin calculations.

## Risk-Based Position Sizing

### Basic Formula
\`\`\`
Position Size = (Capital × Risk %) / (Entry Price - Stop Loss Price)
\`\`\`

### Example
- Capital: $10,000
- Risk: 1% = $100
- Entry: $50,000
- Stop Loss: $49,000 (2% below entry)
- Position Size = $100 / $1,000 = 0.1 BTC

## Leverage Management

### Leverage Guidelines
- **Conservative**: 1x-3x (low risk, steady growth)
- **Moderate**: 3x-10x (balanced risk/reward)
- **Aggressive**: 10x-50x (high risk, high reward)

### Dynamic Leverage
- Use \`calculate_dynamic_leverage\` tool
- Based on volatility (ATR)
- Lower leverage in high volatility
- Higher leverage in low volatility

## Margin Requirements

### Margin Calculation
\`\`\`
Margin = Position Size × Entry Price / Leverage
\`\`\`

### Margin Safety
- Maintain 150-200% of required margin
- Avoid margin calls
- Use \`calculate_dynamic_margin_percentage\` tool

## Position Sizing Tools

### calculate_position_setup
- Calculates optimal position size
- Considers risk percentage
- Includes leverage and margin
- Provides quantity and USD value

### calculate_risk_management
- Calculates stop loss levels
- Sets take profit targets
- Determines risk/reward ratio
- Provides risk amount in USD

## Best Practices

1. **Never risk more than 1-2% per trade**
2. **Adjust position size based on volatility**
3. **Use lower leverage in uncertain markets**
4. **Maintain adequate margin buffer**
5. **Scale position size with account growth**
`,
            },
        ],
    };
});
server.registerResource('multi-timeframe-guide', 'geartrade://docs/multi-timeframe', {
    description: 'Complete guide on multi-timeframe analysis: how to use Daily, 4H, and 1H timeframes for better trading decisions',
    mimeType: 'text/markdown',
}, async () => {
    return {
        contents: [
            {
                uri: 'geartrade://docs/multi-timeframe',
                mimeType: 'text/markdown',
                text: `# Multi-Timeframe Analysis Guide

## Overview

Multi-timeframe analysis is essential for high-probability trading. This guide explains how to use different timeframes effectively.

## Timeframe Hierarchy

### Daily (1D)
- **Purpose**: Long-term trend direction
- **Use**: Identify major trend, support/resistance
- **Trading**: Swing trades, position trades

### 4-Hour (4H)
- **Purpose**: Medium-term trend and entries
- **Use**: Confirm daily trend, find entry zones
- **Trading**: Day trades, swing trades

### 1-Hour (1H)
- **Purpose**: Short-term entries and exits
- **Use**: Precise entry timing, stop placement
- **Trading**: Day trades, scalping

## Trend Alignment

### Perfect Alignment (Highest Confidence)
- Daily: UPTREND
- 4H: UPTREND
- 1H: UPTREND
- **Action**: Strong BUY signal

### Partial Alignment (Medium Confidence)
- Daily: UPTREND
- 4H: UPTREND
- 1H: DOWNTREND (pullback)
- **Action**: Wait for 1H to align, then BUY

### No Alignment (Low Confidence)
- Daily: UPTREND
- 4H: DOWNTREND
- 1H: DOWNTREND
- **Action**: Avoid trading, wait for alignment

## Trading Strategy

### Top-Down Approach
1. **Daily**: Identify major trend
2. **4H**: Confirm trend, find entry zone
3. **1H**: Execute entry at optimal price

### Bottom-Up Approach
1. **1H**: Find short-term setup
2. **4H**: Check if aligns with medium trend
3. **Daily**: Confirm major trend direction

## Best Practices

1. **Always check higher timeframe first**
2. **Trade with the trend on higher timeframe**
3. **Use lower timeframe for entry timing**
4. **Wait for alignment for high-confidence trades**
5. **Avoid trading against higher timeframe trend**
`,
            },
        ],
    };
});
server.registerResource('execution-best-practices', 'geartrade://docs/execution-practices', {
    description: 'Best practices for order execution: market vs limit orders, slippage management, and execution timing',
    mimeType: 'text/markdown',
}, async () => {
    return {
        contents: [
            {
                uri: 'geartrade://docs/execution-practices',
                mimeType: 'text/markdown',
                text: `# Execution Best Practices

## Overview

Proper execution is crucial for trading success. This guide covers order types, execution timing, and slippage management.

## Order Types

### Market Orders
- **Pros**: Immediate execution, guaranteed fill
- **Cons**: No price control, potential slippage
- **Use**: When speed is critical, small positions

### Limit Orders
- **Pros**: Price control, no slippage
- **Cons**: May not fill, missed opportunities
- **Use**: When price is important, larger positions

## Execution Timing

### Best Times to Execute
- **High Liquidity**: During active trading hours
- **Low Volatility**: Avoid extreme volatility periods
- **Volume Confirmation**: Wait for volume spike

### Avoid Execution During
- **Low Liquidity**: Thin order books
- **High Volatility**: Extreme price swings
- **News Events**: Major announcements

## Slippage Management

### Understanding Slippage
- **Definition**: Difference between expected and actual price
- **Causes**: Low liquidity, high volatility, large orders
- **Impact**: Reduces profit, increases loss

### Reducing Slippage
1. Use limit orders when possible
2. Execute during high liquidity
3. Split large orders
4. Check order book depth first

## Paper Trading First

### Why Paper Trade
- Test strategies without risk
- Understand execution mechanics
- Practice order placement
- Build confidence

### When to Go Live
- Consistent paper trading profits
- Understanding of all tools
- Comfortable with risk management
- User explicitly confirms

## Safety Checklist

Before executing any trade:
- [ ] Analysis completed
- [ ] Risk management calculated
- [ ] Stop loss set
- [ ] Position size appropriate
- [ ] Leverage reasonable
- [ ] User confirmation obtained
- [ ] Paper trading tested (if new strategy)
`,
            },
        ],
    };
});
server.registerResource('volume-analysis-guide', 'geartrade://docs/volume-analysis', {
    description: 'Complete guide on volume analysis: CVD, buy/sell pressure, liquidity zones, and volume profile',
    mimeType: 'text/markdown',
}, async () => {
    return {
        contents: [
            {
                uri: 'geartrade://docs/volume-analysis',
                mimeType: 'text/markdown',
                text: `# Volume Analysis Guide

## Overview

Volume analysis is crucial for understanding market dynamics. This guide covers CVD, buy/sell pressure, and volume profile.

## Cumulative Volume Delta (CVD)

### What is CVD?
- Tracks cumulative buy vs sell volume
- Positive CVD: More buying pressure
- Negative CVD: More selling pressure
- Divergence: Price vs CVD divergence signals reversal

### Using CVD
- Rising price + Rising CVD: Strong uptrend
- Falling price + Falling CVD: Strong downtrend
- Rising price + Falling CVD: Bearish divergence (potential reversal)
- Falling price + Rising CVD: Bullish divergence (potential reversal)

## Buy/Sell Pressure

### Interpretation
- **High Buy Pressure**: Strong demand, bullish
- **High Sell Pressure**: Strong supply, bearish
- **Balanced**: Indecision, potential reversal

### Trading Signals
- Extreme buy pressure: Potential exhaustion, watch for reversal
- Extreme sell pressure: Potential exhaustion, watch for reversal
- Balanced pressure: Wait for breakout

## Volume Profile

### Key Levels
- **POC (Point of Control)**: Highest volume price
- **VAH/VAL**: Value area boundaries
- **HVN**: High volume nodes (support/resistance)
- **LVN**: Low volume nodes (quick movement zones)

### Trading Strategy
- Trade from POC to value area boundaries
- Use HVN as support/resistance
- LVN zones for quick entries/exits

## Best Practices

1. **Always confirm with price action**
2. **Use volume spikes for confirmation**
3. **Watch for volume divergences**
4. **Combine with technical indicators**
5. **Volume precedes price movement**
`,
            },
        ],
    };
});
server.registerResource('liquidation-levels-guide', 'geartrade://docs/liquidation-levels', {
    description: 'Complete guide on liquidation levels: liquidity grabs, stop hunts, cascade risks, and trading strategies',
    mimeType: 'text/markdown',
}, async () => {
    return {
        contents: [
            {
                uri: 'geartrade://docs/liquidation-levels',
                mimeType: 'text/markdown',
                text: `# Liquidation Levels Guide

## Overview

Understanding liquidation levels helps identify high-probability trading zones and avoid dangerous price areas.

## Liquidity Grab

### What is Liquidity Grab?
- Price moves to liquidate positions
- Creates temporary price spike/drop
- Often reverses after liquidation

### Trading Strategy
- **Before Liquidity**: Avoid entering near liquidation zones
- **After Liquidity**: Enter opposite direction (contrarian)
- **Risk**: Liquidity can be grabbed multiple times

## Stop Hunt

### What is Stop Hunt?
- Price moves to trigger stop losses
- Creates quick price movement
- Often reverses after stop hunt

### Trading Strategy
- **Before Stop Hunt**: Set stops outside obvious levels
- **After Stop Hunt**: Enter opposite direction
- **Risk**: Stop hunt can continue if trend is strong

## Cascade Risk

### What is Cascade?
- Chain reaction of liquidations
- One liquidation triggers another
- Can cause extreme price movement

### Risk Assessment
- **Low Risk**: Isolated liquidations
- **Medium Risk**: Clustered liquidations
- **High Risk**: Cascade potential

### Trading Strategy
- **Low Risk**: Trade normally
- **Medium Risk**: Reduce position size
- **High Risk**: Avoid trading, wait for stability

## Best Practices

1. **Check liquidation levels before entry**
2. **Avoid trading near high liquidation zones**
3. **Use liquidation zones as support/resistance**
4. **Watch for cascade risk in volatile markets**
5. **Enter after liquidity grab/stop hunt completes**
`,
            },
        ],
    };
});
server.registerResource('divergence-trading-guide', 'geartrade://docs/divergence-trading', {
    description: 'Complete guide on divergence trading: RSI divergence, price-action divergence, and trading strategies',
    mimeType: 'text/markdown',
}, async () => {
    return {
        contents: [
            {
                uri: 'geartrade://docs/divergence-trading',
                mimeType: 'text/markdown',
                text: `# Divergence Trading Guide

## Overview

Divergence is a powerful reversal signal. This guide covers RSI divergence, price-action divergence, and trading strategies.

## RSI Divergence

### Bullish Divergence
- Price makes lower low
- RSI makes higher low
- **Signal**: Potential bullish reversal

### Bearish Divergence
- Price makes higher high
- RSI makes lower high
- **Signal**: Potential bearish reversal

### Trading Strategy
- Wait for divergence confirmation
- Enter on price reversal
- Set stop below/above divergence point
- Target: Previous swing high/low

## Price-Action Divergence

### Types
- **Momentum Divergence**: Price vs momentum indicator
- **Volume Divergence**: Price vs volume
- **Time Divergence**: Price vs time cycles

### Trading Strategy
- Identify divergence pattern
- Wait for confirmation
- Enter on reversal signal
- Use stop loss to protect

## Best Practices

1. **Wait for confirmation** - Don't enter on divergence alone
2. **Use multiple timeframes** - Higher timeframe divergences are stronger
3. **Combine with support/resistance** - Divergence at key levels is more reliable
4. **Set appropriate stops** - Divergence can fail
5. **Don't force divergence** - Not all moves have divergence
`,
            },
        ],
    };
});
server.registerResource('orderbook-trading-guide', 'geartrade://docs/orderbook-trading', {
    description: 'Complete guide on order book trading: reading order book depth, identifying support/resistance walls, and market sentiment',
    mimeType: 'text/markdown',
}, async () => {
    return {
        contents: [
            {
                uri: 'geartrade://docs/orderbook-trading',
                mimeType: 'text/markdown',
                text: `# Order Book Trading Guide

## Overview

Order book analysis provides real-time market sentiment and liquidity information. This guide covers reading order books effectively.

## Reading Order Book

### Bid Side (Buy Orders)
- Shows demand at different price levels
- Large bid walls = strong support
- Thin bids = weak support

### Ask Side (Sell Orders)
- Shows supply at different price levels
- Large ask walls = strong resistance
- Thin asks = weak resistance

## Market Sentiment

### Bullish Signals
- Large bid walls below price
- Thin ask walls above price
- Bid/Ask ratio > 1.5

### Bearish Signals
- Large ask walls above price
- Thin bid walls below price
- Bid/Ask ratio < 0.67

### Neutral Signals
- Balanced bid/ask volumes
- Bid/Ask ratio ~1.0

## Support/Resistance Levels

### Identifying Walls
- **Bid Wall**: Large concentration of buy orders
- **Ask Wall**: Large concentration of sell orders
- **Wall Strength**: Volume at that level

### Trading Strategy
- Enter longs below bid walls
- Enter shorts above ask walls
- Set stops beyond walls
- Take profit at opposite walls

## Warning: Wall Removal

### Risk
- Walls can disappear quickly
- Market makers can fake walls
- Don't rely solely on order book

### Best Practices
1. Use order book as confirmation, not sole signal
2. Combine with price action
3. Watch for wall removal
4. Don't chase walls that are too far
5. Use order book for entry timing, not direction
`,
            },
        ],
    };
});
server.registerResource('market-structure-guide', 'geartrade://docs/market-structure', {
    description: 'Complete guide on market structure: trend identification, change of character (COC), swing patterns, and structure breaks',
    mimeType: 'text/markdown',
}, async () => {
    return {
        contents: [
            {
                uri: 'geartrade://docs/market-structure',
                mimeType: 'text/markdown',
                text: `# Market Structure Guide

## Overview

Market structure analysis identifies trend direction and potential reversals. This guide covers structure types, COC, and trading strategies.

## Market Structure Types

### Uptrend
- Higher highs and higher lows
- Structure: Bullish
- Trading: Buy on dips

### Downtrend
- Lower highs and lower lows
- Structure: Bearish
- Trading: Sell on rallies

### Sideways/Ranging
- Equal highs and lows
- Structure: Neutral
- Trading: Range trading

## Change of Character (COC)

### Bullish COC
- Previous downtrend breaks
- New higher high formed
- **Signal**: Potential trend reversal to uptrend

### Bearish COC
- Previous uptrend breaks
- New lower low formed
- **Signal**: Potential trend reversal to downtrend

### Trading Strategy
- Enter on COC confirmation
- Set stop below/above COC point
- Target: Previous structure level

## Swing Patterns

### Swing Highs
- Peaks in price movement
- Resistance levels
- Break above = bullish signal

### Swing Lows
- Troughs in price movement
- Support levels
- Break below = bearish signal

## Structure Breaks

### Break of Structure (BOS)
- Price breaks previous swing high/low
- Confirms trend continuation
- **Signal**: Strong trend continuation

### Trading Strategy
- Enter on BOS confirmation
- Follow the trend
- Set stop at previous structure level

## Best Practices

1. **Always identify structure first**
2. **Trade with the structure**
3. **Wait for COC confirmation**
4. **Use structure levels for stops**
5. **Avoid trading against structure**
`,
            },
        ],
    };
});
server.registerResource('external-data-guide', 'geartrade://docs/external-data', {
    description: 'Complete guide on external market data: funding rate, open interest, volatility, and market sentiment indicators',
    mimeType: 'text/markdown',
}, async () => {
    return {
        contents: [
            {
                uri: 'geartrade://docs/external-data',
                mimeType: 'text/markdown',
                text: `# External Data Guide

## Overview

External market data provides insights into market sentiment and potential reversals. This guide covers funding rate, OI, and volatility.

## Funding Rate

### What is Funding Rate?
- Fee paid between longs and shorts
- Positive: Longs pay shorts (more longs)
- Negative: Shorts pay longs (more shorts)

### Trading Signals
- **Extreme Positive (>0.1%)**: Potential bearish reversal
- **Extreme Negative (<-0.1%)**: Potential bullish reversal
- **Normal Range**: No contrarian signal

### Strategy
- Use extreme funding for contrarian trades
- Normal funding confirms trend direction

## Open Interest (OI)

### What is OI?
- Total number of open futures contracts
- Increasing OI: New money entering
- Decreasing OI: Money exiting

### Trading Signals
- **Rising OI + Rising Price**: Strong uptrend
- **Falling OI + Falling Price**: Strong downtrend
- **Rising OI + Falling Price**: Short squeeze potential
- **Falling OI + Rising Price**: Long squeeze potential

### Strategy
- OI confirms trend strength
- Divergence signals potential reversal

## Volatility

### Interpretation
- **High Volatility**: Wide price swings, higher risk
- **Low Volatility**: Tight range, lower risk
- **Expanding Volatility**: Trend acceleration
- **Contracting Volatility**: Potential breakout

### Strategy
- Adjust position size based on volatility
- Use volatility for stop loss placement
- High volatility = wider stops needed

## Best Practices

1. **Combine external data with technical analysis**
2. **Watch for extreme values**
3. **Use funding rate for contrarian signals**
4. **Monitor OI for trend confirmation**
5. **Adjust risk based on volatility**
`,
            },
        ],
    };
});
server.registerResource('candlestick-patterns-guide', 'geartrade://docs/candlestick-patterns', {
    description: 'Complete guide on candlestick patterns: reversal patterns, continuation patterns, and trading strategies',
    mimeType: 'text/markdown',
}, async () => {
    return {
        contents: [
            {
                uri: 'geartrade://docs/candlestick-patterns',
                mimeType: 'text/markdown',
                text: `# Candlestick Patterns Guide

## Overview

Candlestick patterns provide visual signals for potential reversals and continuations. This guide covers major patterns and trading strategies.

## Reversal Patterns

### Bullish Reversal
- **Hammer**: Long lower wick, small body
- **Engulfing**: Bullish candle engulfs previous bearish
- **Morning Star**: Three-candle pattern, bullish reversal
- **Doji**: Indecision, potential reversal

### Bearish Reversal
- **Shooting Star**: Long upper wick, small body
- **Engulfing**: Bearish candle engulfs previous bullish
- **Evening Star**: Three-candle pattern, bearish reversal
- **Doji**: Indecision, potential reversal

## Continuation Patterns

### Bullish Continuation
- **Rising Three Methods**: Consolidation in uptrend
- **Bullish Flag**: Brief pause in uptrend
- **Bullish Pennant**: Tight consolidation

### Bearish Continuation
- **Falling Three Methods**: Consolidation in downtrend
- **Bearish Flag**: Brief pause in downtrend
- **Bearish Pennant**: Tight consolidation

## Trading Strategy

### Pattern Confirmation
1. Identify pattern formation
2. Wait for confirmation candle
3. Enter on confirmation
4. Set stop below/above pattern

### Best Practices
- Combine with support/resistance
- Use volume confirmation
- Higher timeframe patterns are stronger
- Don't trade every pattern

## Common Mistakes

1. ❌ Entering before confirmation
2. ❌ Ignoring volume
3. ❌ Trading in ranging markets
4. ❌ Not setting stop loss
5. ❌ Over-trading on patterns
`,
            },
        ],
    };
});
server.registerResource('fibonacci-trading-guide', 'geartrade://docs/fibonacci-trading', {
    description: 'Complete guide on Fibonacci retracement: key levels, entry/exit strategies, and risk management',
    mimeType: 'text/markdown',
}, async () => {
    return {
        contents: [
            {
                uri: 'geartrade://docs/fibonacci-trading',
                mimeType: 'text/markdown',
                text: `# Fibonacci Trading Guide

## Overview

Fibonacci retracement levels identify potential support/resistance zones. This guide covers key levels and trading strategies.

## Key Fibonacci Levels

### Retracement Levels
- **23.6%**: Shallow retracement
- **38.2%**: Normal retracement
- **50%**: Psychological level
- **61.8%**: Golden ratio (most important)
- **78.6%**: Deep retracement

### Extension Levels
- **127.2%**: First extension
- **161.8%**: Golden ratio extension
- **200%**: Double extension

## Trading Strategy

### In Uptrend
- **Entry**: Buy at 38.2%, 50%, or 61.8% retracement
- **Stop Loss**: Below 78.6% retracement
- **Take Profit**: Above 0% (new highs) or extensions

### In Downtrend
- **Entry**: Sell at 38.2%, 50%, or 61.8% retracement
- **Stop Loss**: Above 78.6% retracement
- **Take Profit**: Below 100% (new lows) or extensions

## Best Practices

1. **Use in trending markets** - Not effective in ranging markets
2. **Combine with other indicators** - RSI, volume, structure
3. **61.8% is most important** - Golden ratio level
4. **Wait for bounce confirmation** - Don't enter blindly
5. **Set stops beyond 78.6%** - Deep retracement invalidates setup
`,
            },
        ],
    };
});
// NEW: Recommended Usage Patterns Resource (Based on MCP_TOOLS_TEST_RESULTS.md)
server.registerResource('usage-patterns-guide', 'geartrade://docs/usage-patterns', {
    description: 'Recommended usage patterns for Day Trading, Swing Trading, Position Trading, and Risk Management',
    mimeType: 'text/markdown',
}, async () => {
    return {
        contents: [
            {
                uri: 'geartrade://docs/usage-patterns',
                mimeType: 'text/markdown',
                text: `# Recommended Usage Patterns

## Overview

This guide covers recommended tool combinations for different trading styles based on the 52 available MCP tools.

---

## Day Trading Pattern

**Focus:** Quick decisions, fast oscillators, order book analysis

### Recommended Tools:

**1. Price & Market Data:**
- \`get_price\` - Current price
- \`get_indicators\` - Core technical indicators
- \`get_volume_analysis\` - Buy/sell pressure

**2. Fast Oscillators:**
- \`stochastic_rsi\` - Overbought/oversold with RSI + Stochastic combination
- \`fisher_transform\` - Sharp reversal signals
- \`momentum\` - Rate of price change
- \`chande_momentum\` - Momentum on both sides (-100 to +100)

**3. Order Book & Liquidity:**
- \`get_orderbook_depth\` - Bid/ask analysis, spread, liquidity scoring
- \`get_liquidation_levels\` - Liquidation clusters, safe entry zones

**4. Quick Confirmation:**
- \`get_market_structure\` - Immediate trend bias
- \`get_candlestick_patterns\` - Reversal signals

### Day Trading Workflow:
\`\`\`
1. get_price → Check current price
2. get_orderbook_depth → Check order book sentiment
3. stochastic_rsi + fisher_transform → Get oscillator signals
4. get_liquidation_levels → Identify safe entry zones
5. calculate_risk_management → Set tight stop (0.5-1%)
6. Execute with low leverage (2-3x)
\`\`\`

### Risk Parameters:
- Risk per trade: 0.5%
- Leverage: 2-3x
- Stop loss: 0.5-1%
- Take profit: 1-2%
- R:R target: 1.5:1 minimum

---

## Swing Trading Pattern

**Focus:** Multi-timeframe alignment, divergence detection, trend following

### Recommended Tools:

**1. Multi-Timeframe Analysis:**
- \`get_Multitimeframe\` - Daily, 4H, 1H trend alignment
- \`get_market_structure\` - Swing highs/lows identification

**2. Trend Indicators:**
- \`trend_indicators\` (supertrend) - ATR-based trend following
- \`elder_ray\` - Bull/bear power (buying/selling pressure)
- \`schaff_trend_cycle\` - MACD + Stochastic with double smoothing
- \`trix\` - Triple EMA rate of change

**3. Divergence & Patterns:**
- \`get_divergence\` - RSI divergence (bullish/bearish)
- \`get_candlestick_patterns\` - Reversal/continuation patterns

**4. Momentum Confirmation:**
- \`get_indicators\` - RSI, MACD, ADX
- \`true_strength_index\` - Double-smoothed momentum
- \`ultimate_oscillator\` - Three-timeframe oscillator

**5. Volume & External:**
- \`get_volume_analysis\` - CVD trend, buy/sell pressure
- \`get_External_data\` - Funding rate, open interest

### Swing Trading Workflow:
\`\`\`
1. get_Multitimeframe → Check trend alignment (Daily/4H/1H)
2. get_divergence → Look for RSI divergence
3. trend_indicators + elder_ray → Confirm trend direction
4. get_volume_analysis → Verify volume supports the move
5. calculate_risk_management → Set stop (2-3%)
6. Execute with moderate leverage (3-5x)
7. Hold for 1 day to 2 weeks
\`\`\`

### Risk Parameters:
- Risk per trade: 1.0%
- Leverage: 3-5x
- Stop loss: 2-3%
- Take profit: 5-15% (multiple TPs)
- R:R target: 2:1 minimum

---

## Position Trading Pattern

**Focus:** Long-term trends, volume profile, adaptive moving averages

### Recommended Tools:

**1. Market Regime:**
- \`get_market_regime\` - Overall market conditions (trending/choppy/volatile)
- \`get_volume_profile\` - POC, VAH, VAL, accumulation/distribution zones

**2. Long-Term Momentum:**
- \`know_sure_thing\` - Multi-timeframe ROC momentum
- \`coppock_curve\` - Major market bottoms, long-term momentum
- \`relative_vigor_index\` - Close vs open momentum

**3. Adaptive Moving Averages:**
- \`hull_ma\` - Smooth trend with reduced lag
- \`kaufman_adaptive_ma\` - Adaptive to market efficiency
- \`mcginley_dynamic\` - Adaptive to market volatility
- \`rainbow_ma\` - Multi-period trend visualization

**4. Volume & Strength:**
- \`get_volume_profile\` - Session and composite profiles
- \`strength_indicators\` (bull_bear_power) - Buying vs selling strength

**5. External Sentiment:**
- \`get_External_data\` - Funding rate trends, open interest
- \`get_long_short_ratio\` - Market sentiment

### Position Trading Workflow:
\`\`\`
1. get_market_regime → Confirm trending market
2. get_volume_profile → Identify accumulation zones
3. know_sure_thing + coppock_curve → Check long-term momentum
4. hull_ma + kaufman_adaptive_ma → Confirm trend direction
5. get_long_short_ratio → Check sentiment extremes
6. calculate_risk_management → Set wide stop (5-10%)
7. Execute with low leverage (1-2x)
8. Hold for 1-6 months
\`\`\`

### Risk Parameters:
- Risk per trade: 2.0%
- Leverage: 1-2x
- Stop loss: 5-10%
- Take profit: 20-100%+ (multiple TPs)
- R:R target: 3:1 minimum

---

## Risk Management Pattern

**Focus:** Comprehensive risk assessment before any trade

### Recommended Tools:

**1. Volatility Assessment:**
- \`volatility_indicators\` (bollinger_band_width) - Volatility measurement
- \`get_indicators\` - ATR (Average True Range)

**2. Liquidation Risk:**
- \`get_liquidation_levels\` - Liquidation clusters
- Safe entry zone identification

**3. Position Sizing:**
- \`calculate_position_setup\` - Optimal position size
- \`calculate_risk_management\` - Stop loss, take profit levels

**4. Market Structure:**
- \`get_market_structure\` - Support/resistance levels

### Risk Management Workflow:
\`\`\`
1. get_price → Current price
2. volatility_indicators → Check volatility level
3. get_liquidation_levels → Identify liquidation risk
4. calculate_position_setup → Calculate position size
5. calculate_risk_management → Set SL/TP levels
6. Assess overall risk: LOW / MEDIUM / HIGH
7. Proceed or wait based on risk assessment
\`\`\`

---

## Tool Categories Summary

| Category | Tools | Best For |
|----------|-------|----------|
| Market Data | 10 | All trading styles |
| Advanced Market Data | 5 | All trading styles |
| Oscillators | 10 | Day trading, swing trading |
| Trend Indicators | 7 | Swing trading, position trading |
| Volume Indicators | 4 | All trading styles |
| Channels & Bands | 3 | Volatility assessment |
| Moving Averages | 8 | Position trading, trend following |
| Specialized | 5 | Pattern recognition |

---

## Quick Reference

### For Scalping/Day Trading:
\`get_price\` → \`stochastic_rsi\` → \`fisher_transform\` → \`get_orderbook_depth\`

### For Swing Trading:
\`get_Multitimeframe\` → \`get_divergence\` → \`schaff_trend_cycle\` → \`get_volume_analysis\`

### For Position Trading:
\`get_market_regime\` → \`know_sure_thing\` → \`coppock_curve\` → \`get_volume_profile\`

### For Risk Management:
\`calculate_position_setup\` → \`calculate_risk_management\` → \`get_liquidation_levels\` → \`volatility_indicators\`
`,
            },
        ],
    };
});
// NEW: AI Memory Analysis Prompt
server.registerPrompt('memory_analysis', {
    title: 'AI Memory Analysis',
    description: 'Analyze trading history, preferences, and patterns stored in AI memory',
    argsSchema: {
        query: z.string().optional().describe('Specific query about trading history (e.g., "my BTC performance", "common mistakes")'),
        symbol: z.string().optional().describe('Filter by symbol (e.g., "BTC", "ETH")'),
        type: z.string().optional().describe('Filter by memory type: preference, trade, note, all (default: all)'),
    },
}, async (args) => {
    const query = args.query || 'trading performance and patterns';
    const symbol = args.symbol ? args.symbol.toUpperCase() : undefined;
    const type = args.type || 'all';
    return {
        messages: [
            {
                role: 'user',
                content: {
                    type: 'text',
                    text: `Please analyze my trading memory${symbol ? ` for ${symbol}` : ''}.

**Step 1: Retrieve All Memories**
Use \`memory_get_all\` to get complete trading history.

**Step 2: Search Specific Query**
Use \`memory_recall\` with query: "${query}"
${symbol ? `Filter results for symbol: ${symbol}` : ''}
${type !== 'all' ? `Filter by type: ${type}` : ''}

**Step 3: Analyze Patterns**
${symbol ? `Use \`memory_check_pattern\` for ${symbol} with common setups` : 'Identify common patterns across all trades'}

**Step 4: Get Insights**
Use \`memory_get_insights\` with query: "${query}"

**Present Analysis:**

1. **Memory Summary**
   - Total memories stored
   - Breakdown by type (preferences, trades, notes)
   - Most recent activity

2. **Trading Performance**
   - Total trades logged
   - Win rate (wins vs losses)
   - Common winning setups
   - Common losing patterns

3. **Preferences Stored**
   - Leverage settings per asset
   - Risk management rules
   - Trading strategies

4. **Key Lessons Learned**
   - Top lessons from winning trades
   - Top lessons from losing trades
   - Areas for improvement

5. **Personalized Recommendations**
   - Based on your history
   - Patterns to repeat
   - Mistakes to avoid

6. **Action Items**
   - Memories to update
   - Outdated info to delete
   - New preferences to save`,
                },
            },
        ],
    };
});
// NEW: Memory-Enhanced Trading Prompt
server.registerPrompt('memory_enhanced_trading', {
    title: 'Memory-Enhanced Trading',
    description: 'Execute trades with AI memory context for personalized risk management',
    argsSchema: {
        ticker: z.string().describe('Asset ticker symbol (e.g., "BTC", "ETH")'),
        side: z.string().describe('Trade direction: LONG or SHORT'),
        capital: z.string().optional().describe('Trading capital in USD (default: uses memory preference or 10000)'),
        testnet: z.string().optional().describe('Use testnet for paper trading: true/false (default: true)'),
    },
}, async (args) => {
    const ticker = args.ticker ? args.ticker.toUpperCase() : 'BTC';
    const side = args.side ? args.side.toUpperCase() : 'LONG';
    const capital = args.capital ? parseFloat(args.capital) : 10000;
    const testnet = args.testnet !== 'false';
    return {
        messages: [
            {
                role: 'user',
                content: {
                    type: 'text',
                    text: `Please execute a memory-enhanced ${side} trade for ${ticker}.

**Step 1: Check Memory for Preferences**
Use \`memory_recall\` with query: "leverage ${ticker} risk settings"
- Get preferred leverage for ${ticker}
- Get risk per trade setting
- Get any specific trading rules

**Step 2: Check Historical Performance**
Use \`memory_get_insights\` with query: "${ticker} ${side} trades performance"
- Review past ${side} trades on ${ticker}
- Identify win/loss patterns
- Get lessons from similar setups

**Step 3: Validate Current Setup**
Use \`memory_check_pattern\` with:
- symbol: "${ticker}"
- setup: "current market conditions for ${side}"
- Get historical win rate for similar setups

**Step 4: Technical Analysis**
Use \`get_indicators\` for ${ticker}:
- RSI, MACD, EMA analysis
- Support/resistance levels
- Trend direction

Use \`get_market_structure\` for ${ticker}:
- Market structure analysis
- Swing highs/lows

**Step 5: Calculate Position**
Use \`calculate_position_setup\`:
- ticker: ${ticker}
- capital: ${capital} (or from memory preference)
- Apply memory-based leverage and risk settings

Use \`calculate_risk_management\`:
- Calculate stop loss and take profit
- Based on historical patterns and current volatility

**Step 6: Present Trade Plan**
Show:
- Entry price and reasoning
- Stop loss (based on memory + technicals)
- Take profit (based on historical R:R)
- Position size and leverage
- Pattern confidence from memory
- Risk assessment

**Step 7: Execute Trade (with confirmation)**
${testnet ? `Use \`hyperliquid_testnet_futures_trade\`:
- symbol: ${ticker}
- side: ${side.toLowerCase()}
- Apply calculated position size
- Use memory-based leverage` : `Use \`hyperliquid_mainnet_futures_trade\`:
- symbol: ${ticker}
- side: ${side.toLowerCase()}
- confirmExecution: "true" (REQUIRES USER APPROVAL)`}

**Step 8: Log Trade for Learning**
After execution, use \`memory_log_trade\`:
- Log entry price and reason
- Set appropriate label and categories
- Include technical setup description

Ask user: "Ready to proceed with this ${testnet ? 'TESTNET' : 'MAINNET'} trade? (YES/NO)"`,
                },
            },
        ],
    };
});
// NEW: Complete Tools Reference Resource (60 Tools - Updated with Memory + Position Management)
server.registerResource('complete-tools-reference', 'geartrade://docs/complete-tools', {
    description: 'Complete reference of all 60 MCP tools with parameters and use cases',
    mimeType: 'text/markdown',
}, async () => {
    return {
        contents: [
            {
                uri: 'geartrade://docs/complete-tools',
                mimeType: 'text/markdown',
                text: `# Complete Tools Reference (60 Tools)

## Market Data Tools (10)

| Tool | Description | Parameters |
|------|-------------|------------|
| \`get_price\` | Get latest prices | tickers: string[] |
| \`get_indicators\` | Comprehensive technical indicators | tickers: string[] |
| \`get_market_structure\` | Market structure and swing points | tickers: string[] |
| \`get_volume_analysis\` | Volume profile and buy/sell pressure | tickers: string[] |
| \`get_divergence\` | RSI divergence detection | tickers: string[] |
| \`get_candlestick_patterns\` | Candlestick pattern recognition | tickers: string[] |
| \`get_market_regime\` | Market conditions (trending/choppy) | tickers: string[] |
| \`get_Multitimeframe\` | Multi-timeframe trend alignment | tickers: string[] |
| \`get_liquidation_levels\` | Liquidation clusters and zones | tickers: string[] |
| \`get_long_short_ratio\` | Long/short sentiment | tickers: string[] |

## Advanced Market Data Tools (5)

| Tool | Description | Parameters |
|------|-------------|------------|
| \`get_orderbook_depth\` | Order book depth analysis | tickers: string[] |
| \`get_volume_profile\` | Volume profile (POC, VAH, VAL) | tickers: string[] |
| \`get_External_data\` | Funding rate, open interest | tickers: string[] |
| \`calculate_position_setup\` | Position sizing calculations | ticker, entryPrice, side, capital, riskPct, leverage |
| \`calculate_risk_management\` | Stop loss, take profit, R:R | ticker, entryPrice, side, stopLossPct, takeProfitPct |

## Oscillators (10)

| Tool | Description | Key Output |
|------|-------------|------------|
| \`awesome_oscillator\` | Bill Williams AO | Momentum changes |
| \`accelerator_oscillator\` | AC momentum | Acceleration/deceleration |
| \`fisher_transform\` | Sharp reversal signals | Fisher value, trend |
| \`stochastic_rsi\` | RSI + Stochastic | K, D values, oversold/overbought |
| \`momentum\` | Rate of price change | Momentum value, signal |
| \`chande_momentum\` | CMO (-100 to +100) | CMO value, oversold/overbought |
| \`rate_of_change\` | ROC percentage | ROC %, direction |
| \`percentage_price_oscillator\` | MACD as percentage | PPO %, signal |
| \`detrended_price\` | Cycle identification | DPO, cycle position |
| \`gator_oscillator\` | Alligator divergence | Upper, lower values |

## Trend Indicators (7)

| Tool | Description | Key Output |
|------|-------------|------------|
| \`trend_indicators\` | SuperTrend ATR-based | Trend direction, ATR bands |
| \`elder_ray\` | Bull/Bear power | Bull power, bear power |
| \`know_sure_thing\` | Multi-timeframe ROC | KST value, momentum |
| \`trix\` | Triple EMA ROC | TRIX %, trend |
| \`ultimate_oscillator\` | Three-timeframe | UO value, oversold/overbought |
| \`true_strength_index\` | Double-smoothed momentum | TSI value, direction |
| \`schaff_trend_cycle\` | MACD + Stochastic | STC value, buy/sell signal |

## Volume Indicators (4)

| Tool | Description | Key Output |
|------|-------------|------------|
| \`volume_indicators\` | Chaikin Money Flow | CMF, accumulation/distribution |
| \`relative_vigor_index\` | Close vs open momentum | RVI value, trend |
| \`coppock_curve\` | Long-term momentum | Coppock value, phase |
| \`strength_indicators\` | Bull/Bear power | Bull/bear strength |

## Channels & Bands (3)

| Tool | Description | Key Output |
|------|-------------|------------|
| \`channels\` | Keltner Channels | Middle, upper, lower |
| \`volatility_indicators\` | Bollinger Band Width | Width, squeeze status |
| \`ma_envelope\` | MA with envelope | MA, upper, lower |

## Moving Averages (8)

| Tool | Description | Key Output |
|------|-------------|------------|
| \`double_ema\` | DEMA reduced lag | DEMA value |
| \`triple_ema\` | TEMA further reduced lag | TEMA value |
| \`hull_ma\` | HMA smooth trend | HMA value |
| \`weighted_ma\` | WMA recent weighted | WMA value |
| \`smoothed_ma\` | SMMA smooth | SMMA value |
| \`vwma\` | Volume-weighted MA | VWMA, efficiency |
| \`kaufman_adaptive_ma\` | KAMA adaptive | KAMA, efficiency ratio |
| \`mcginley_dynamic\` | McGinley adaptive | McGinley value, trend |

## Specialized (5)

| Tool | Description | Key Output |
|------|-------------|------------|
| \`rainbow_ma\` | Multi-period MAs | Multiple MA values, alignment |
| \`pivot_points\` | Standard pivots | Pivot, R1-R3, S1-S3 |
| \`patterns\` | Fractals, ZigZag, COC | Pattern detection |

---

## Common Parameters

### For Ticker-Based Tools:
- \`tickers\`: Array of strings (e.g., ["BTC", "ETH", "SOL"])

### For Calculation Tools:
- \`ticker\`: Single string (e.g., "BTC")
- \`entryPrice\`: Number (entry price)
- \`side\`: "LONG" or "SHORT"
- \`capital\`: Number (trading capital in USD)
- \`riskPct\`: Number (risk percentage, e.g., 1.0)
- \`leverage\`: Number (leverage multiplier, e.g., 5)

### For Indicator Tools:
- \`period\`: Number (indicator period, e.g., 14)
- \`prices\`: Array of numbers (price data)
- \`highs\`: Array of numbers (high prices)
- \`lows\`: Array of numbers (low prices)
- \`volumes\`: Array of numbers (volume data)

## AI Memory Tools (8) - NEW

| Tool | Description | Parameters |
|------|-------------|------------|
| \`memory_save_preference\` | Save trading preferences | preference, label?, categories? |
| \`memory_log_trade\` | Log completed trades | symbol, side, entryPrice, exitPrice, pnlPercent, result, reason, lesson?, label?, categories? |
| \`memory_get_insights\` | Get personalized insights | query |
| \`memory_check_pattern\` | Check pattern history | symbol, setup |
| \`memory_remember\` | Store notes/observations | content, label?, categories?, tags? |
| \`memory_recall\` | Search memories | query, limit? |
| \`memory_get_all\` | Get all memories | (none) |
| \`memory_delete\` | Delete specific memory | memoryId |

### Memory Tools Use Cases:
- **Preferences**: Store leverage, risk settings, trading rules
- **Trade Journal**: Log all trades with entry/exit reasons and lessons
- **Pattern Learning**: AI learns from your winning and losing patterns
- **Key Levels**: Remember support/resistance and market observations
- **Personalized Insights**: Get recommendations based on your history

### Memory Metadata Fields:
- \`label\`: Categorize memories (e.g., "leverage", "support", "scalp")
- \`categories\`: Group memories (e.g., "risk-management", "technical-analysis")
- \`tags\`: Additional tags for filtering

## Position Management & Sentiment Tools (2) - NEW

| Tool | Description | Parameters |
|------|-------------|------------|
| \`close_position\` | Close/reduce Hyperliquid positions | symbol, percentage?, isTestnet?, confirmMainnet? |
| \`get_market_sentiment\` | Fear & Greed + BTC Dominance + Funding | includeFearGreed?, includeBtcDominance?, includeFundingSummary? |

### close_position
Close or reduce existing positions on Hyperliquid (testnet/mainnet).

**Parameters:**
- \`symbol\` (required): Asset symbol (e.g., "BTC", "ETH")
- \`percentage\` (optional): 1-100%, default 100 for full close
- \`isTestnet\` (optional): true (default) or false for mainnet
- \`confirmMainnet\` (required for mainnet): Must be true to execute on mainnet

### get_market_sentiment
Get comprehensive market sentiment from FREE APIs.

**Output:**
- Fear & Greed Index (0-100, from alternative.me)
- BTC Dominance (%, from CoinGecko)
- Funding Rate Summary (from Hyperliquid)
- Overall sentiment score with trading recommendation
`,
            },
        ],
    };
});
// NEW: AI Memory Tools Guide Resource
server.registerResource('memory-tools-guide', 'geartrade://docs/memory-tools', {
    description: 'Complete guide to AI Memory tools for personalized trading',
    mimeType: 'text/markdown',
}, async () => {
    return {
        contents: [
            {
                uri: 'geartrade://docs/memory-tools',
                mimeType: 'text/markdown',
                text: `# AI Memory Tools Guide

## Overview
GearTrade includes 8 AI Memory tools powered by Mem0 for personalized trading assistance. The AI learns from your preferences, trades, and observations to provide better recommendations over time.

## Memory Tools (8)

### 1. memory_save_preference
Save trading preferences that the AI will remember.

**Parameters:**
- \`preference\` (required): What to remember
- \`label\` (optional): Category label (e.g., "leverage", "risk")
- \`categories\` (optional): Group category (e.g., "risk-management")

**Example:**
\`\`\`
preference: "Default leverage for BTC is 5x, for altcoins use 3x"
label: "leverage"
categories: "risk-management"
\`\`\`

### 2. memory_log_trade
Log completed trades for pattern learning.

**Parameters:**
- \`symbol\` (required): Asset symbol (BTC, ETH, SOL)
- \`side\` (required): LONG or SHORT
- \`entryPrice\` (required): Entry price
- \`exitPrice\` (required): Exit price
- \`pnlPercent\` (required): PnL percentage
- \`result\` (required): win, loss, or breakeven
- \`reason\` (required): Entry/exit reason
- \`lesson\` (optional): Lesson learned
- \`label\` (optional): Trade type (scalp, swing, position)
- \`categories\` (optional): Strategy category

**Example:**
\`\`\`
symbol: "BTC"
side: "LONG"
entryPrice: 95000
exitPrice: 97500
pnlPercent: 2.63
result: "win"
reason: "RSI oversold at support, took profit at resistance"
lesson: "Support levels are reliable for BTC entries"
label: "swing"
categories: "momentum"
\`\`\`

### 3. memory_get_insights
Get personalized insights based on your history.

**Parameters:**
- \`query\` (required): What insight you want

**Example Queries:**
- "my BTC trading performance"
- "common mistakes I make"
- "best setups for SOL"
- "lessons from losing trades"

### 4. memory_check_pattern
Check if current setup matches historical patterns.

**Parameters:**
- \`symbol\` (required): Asset symbol
- \`setup\` (required): Current setup description

**Example:**
\`\`\`
symbol: "ETH"
setup: "RSI oversold with bullish divergence at support"
\`\`\`

**Returns:** Win rate, similar trades, recommendation

### 5. memory_remember
Store any important note or observation.

**Parameters:**
- \`content\` (required): What to remember
- \`label\` (optional): Category label
- \`categories\` (optional): Group category
- \`tags\` (optional): Array of tags

**Example:**
\`\`\`
content: "BTC has strong support at 94000"
label: "support"
categories: "technical-analysis"
\`\`\`

### 6. memory_recall
Search and retrieve stored memories.

**Parameters:**
- \`query\` (required): Search query
- \`limit\` (optional): Max results (default: 5)

**Example Queries:**
- "leverage settings"
- "BTC support levels"
- "trading rules"

### 7. memory_get_all
Get all stored memories for review.

**Parameters:** None

### 8. memory_delete
Delete a specific memory by ID.

**Parameters:**
- \`memoryId\` (required): Memory ID to delete

---

## Best Practices

### Organizing Memories with Labels & Categories

**Labels (specific):**
- \`leverage\` - Leverage settings
- \`risk\` - Risk management rules
- \`support\` - Support levels
- \`resistance\` - Resistance levels
- \`scalp\` - Scalp trades
- \`swing\` - Swing trades
- \`position\` - Position trades

**Categories (broad):**
- \`risk-management\` - All risk-related
- \`technical-analysis\` - TA observations
- \`position-sizing\` - Size calculations
- \`momentum\` - Momentum strategies
- \`reversal\` - Reversal patterns
- \`breakout\` - Breakout trades

### Workflow Integration

**Before Trading:**
1. \`memory_recall\` - Check preferences for the asset
2. \`memory_check_pattern\` - Validate current setup
3. \`memory_get_insights\` - Review past performance

**After Trading:**
1. \`memory_log_trade\` - Log the trade with full context
2. Include lesson learned for future reference

**Regular Maintenance:**
1. \`memory_get_all\` - Review all memories
2. \`memory_delete\` - Remove outdated information
`,
            },
        ],
    };
});
// Export server for Nullshot MCP SDK
export { server };
// JSON-RPC 2.0 response helper
function jsonRpcResponse(id, result) {
    return {
        jsonrpc: '2.0',
        id,
        result
    };
}
function jsonRpcError(id, code, message, data) {
    return {
        jsonrpc: '2.0',
        id,
        error: { code, message, data }
    };
}
// MCP method handlers
async function handleMcpMethod(method, params, id) {
    switch (method) {
        case 'initialize':
            return jsonRpcResponse(id, {
                protocolVersion: params?.protocolVersion || '2024-11-05',
                serverInfo: {
                    name: server.name,
                    version: server.version
                },
                capabilities: {
                    tools: { listChanged: false },
                    resources: { listChanged: false, subscribe: false },
                    prompts: { listChanged: false }
                }
            });
        case 'initialized':
            // Notification, no response needed but return empty result for compatibility
            return jsonRpcResponse(id, {});
        case 'tools/list':
            const tools = Array.from(server.tools.entries()).map(([name, { config }]) => ({
                name,
                description: config.description || '',
                inputSchema: {
                    type: 'object',
                    properties: (() => {
                        try {
                            // Check if inputSchema is a Zod object schema
                            if (config.inputSchema && config.inputSchema._def && config.inputSchema._def.typeName === 'ZodObject') {
                                // Extract shape from Zod object schema
                                const shape = config.inputSchema._def.shape;
                                const shapeObj = typeof shape === 'function' ? shape() : shape || {};
                                return Object.fromEntries(Object.entries(shapeObj).map(([key, schema]) => {
                                    // Safely extract type and description from Zod schema
                                    let type = 'string'; // default fallback
                                    let description = '';
                                    try {
                                        if (schema && schema._def) {
                                            const typeName = schema._def.typeName;
                                            switch (typeName) {
                                                case 'ZodNumber':
                                                    type = 'number';
                                                    break;
                                                case 'ZodBoolean':
                                                    type = 'boolean';
                                                    break;
                                                case 'ZodArray':
                                                    type = 'array';
                                                    break;
                                                case 'ZodEnum':
                                                    type = 'string'; // enums are strings
                                                    break;
                                                case 'ZodString':
                                                default:
                                                    type = 'string';
                                                    break;
                                            }
                                            description = schema._def.description || '';
                                        }
                                    }
                                    catch (error) {
                                        // If anything fails, use safe defaults
                                        type = 'string';
                                        description = '';
                                    }
                                    return [
                                        key,
                                        {
                                            type,
                                            description
                                        }
                                    ];
                                }));
                            }
                            else {
                                // Fallback for plain objects (old format)
                                return Object.fromEntries(Object.entries(config.inputSchema || {})
                                    .filter(([key]) => !key.startsWith('~')) // Filter out internal Zod properties
                                    .map(([key, schema]) => {
                                    // Safely extract type and description from Zod schema
                                    let type = 'string'; // default fallback
                                    let description = '';
                                    try {
                                        if (schema && schema._def) {
                                            const typeName = schema._def.typeName;
                                            switch (typeName) {
                                                case 'ZodNumber':
                                                    type = 'number';
                                                    break;
                                                case 'ZodBoolean':
                                                    type = 'boolean';
                                                    break;
                                                case 'ZodArray':
                                                    type = 'array';
                                                    break;
                                                case 'ZodString':
                                                default:
                                                    type = 'string';
                                                    break;
                                            }
                                            description = schema._def.description || '';
                                        }
                                        else if (schema && typeof schema === 'object') {
                                            // Fallback for non-Zod objects
                                            type = schema.type || 'string';
                                            description = schema.description || '';
                                        }
                                    }
                                    catch (error) {
                                        // If anything fails, use safe defaults
                                        type = 'string';
                                        description = '';
                                    }
                                    return [
                                        key,
                                        {
                                            type,
                                            description
                                        }
                                    ];
                                }));
                            }
                        }
                        catch (error) {
                            // If all else fails, return empty properties
                            return {};
                        }
                    })(),
                    required: (() => {
                        try {
                            // Check if inputSchema is a Zod object schema
                            if (config.inputSchema && config.inputSchema._def && config.inputSchema._def.typeName === 'ZodObject') {
                                // Extract required fields from Zod object schema
                                const shape = config.inputSchema._def.shape;
                                const shapeObj = typeof shape === 'function' ? shape() : shape || {};
                                return Object.keys(shapeObj);
                            }
                            else {
                                // Fallback for plain objects
                                return Object.keys(config.inputSchema || {}).filter(key => !key.startsWith('~'));
                            }
                        }
                        catch (error) {
                            return [];
                        }
                    })()
                }
            }));
            return jsonRpcResponse(id, { tools });
        case 'tools/call':
            const toolName = params?.name;
            const toolArgs = params?.arguments || {};
            const tool = server.tools.get(toolName);
            if (!tool) {
                return jsonRpcError(id, -32601, `Tool not found: ${toolName}`);
            }
            try {
                const result = await tool.handler(toolArgs);
                return jsonRpcResponse(id, result);
            }
            catch (err) {
                return jsonRpcError(id, -32603, err.message || 'Tool execution failed');
            }
        case 'resources/list':
            const resources = Array.from(server.resources.entries()).map(([name, { config }]) => ({
                uri: `geartrade://${name}`,
                name: config.title || name,
                description: config.description || '',
                mimeType: 'text/plain'
            }));
            return jsonRpcResponse(id, { resources });
        case 'resources/read':
            const resourceUri = params?.uri || '';
            const resourceName = resourceUri.replace('geartrade://', '');
            const resource = server.resources.get(resourceName);
            if (!resource) {
                return jsonRpcError(id, -32601, `Resource not found: ${resourceUri}`);
            }
            try {
                const content = await resource.handler();
                return jsonRpcResponse(id, {
                    contents: [{
                            uri: resourceUri,
                            mimeType: 'text/plain',
                            text: typeof content === 'string' ? content : JSON.stringify(content, null, 2)
                        }]
                });
            }
            catch (err) {
                return jsonRpcError(id, -32603, err.message || 'Resource read failed');
            }
        case 'prompts/list':
            const prompts = Array.from(server.prompts.entries()).map(([name, { config }]) => {
                // Extract arguments from argsSchema (Zod schemas)
                const args = [];
                if (config.argsSchema) {
                    for (const [key, schema] of Object.entries(config.argsSchema)) {
                        const zodSchema = schema;
                        const isRequired = !zodSchema?._def?.typeName?.includes('Optional');
                        args.push({
                            name: key,
                            description: zodSchema?._def?.description || '',
                            required: isRequired
                        });
                    }
                }
                return {
                    name,
                    description: config.description || '',
                    arguments: args
                };
            });
            return jsonRpcResponse(id, { prompts });
        case 'prompts/get':
            const promptName = params?.name;
            const promptData = server.prompts.get(promptName);
            if (!promptData) {
                return jsonRpcError(id, -32601, `Prompt not found: ${promptName}`);
            }
            const { config: promptConfig, handler: promptHandler } = promptData;
            const promptArgs = params?.arguments || {};
            // If there's a handler function, call it with arguments
            if (promptHandler && typeof promptHandler === 'function') {
                try {
                    const result = await promptHandler(promptArgs);
                    return jsonRpcResponse(id, {
                        description: promptConfig.description,
                        messages: result.messages || [{
                                role: 'user',
                                content: { type: 'text', text: promptConfig.description }
                            }]
                    });
                }
                catch (err) {
                    return jsonRpcError(id, -32603, err.message || 'Prompt handler failed');
                }
            }
            // Fallback: use template or description
            let promptText = promptConfig.template || promptConfig.description || '';
            for (const [key, value] of Object.entries(promptArgs)) {
                promptText = promptText.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
            }
            return jsonRpcResponse(id, {
                description: promptConfig.description,
                messages: [{
                        role: 'user',
                        content: { type: 'text', text: promptText }
                    }]
            });
        case 'ping':
            return jsonRpcResponse(id, {});
        default:
            return jsonRpcError(id, -32601, `Method not found: ${method}`);
    }
}
// Default export for local HTTP server with streaming support
export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        // Enhanced CORS headers for streaming support
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Cache-Control, Last-Event-ID',
            'Access-Control-Max-Age': '86400'
        };
        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }
        // Basic health check endpoint
        if (request.method === 'GET' && request.url.endsWith('/health')) {
            return new Response(JSON.stringify({
                status: 'ok',
                server: server.name,
                version: server.version,
                streaming: true,
                endpoints: ['/stream', '/mcp', '/events']
            }), {
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        }
        // SSE (Server-Sent Events) streaming endpoint
        if (request.method === 'GET' && url.pathname === '/stream') {
            const streamHeaders = {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Cache-Control, Last-Event-ID'
            };
            let eventId = 0;
            const stream = new ReadableStream({
                start(controller) {
                    // Send initial connection event
                    const initEvent = `id: ${eventId++}\nevent: connected\ndata: ${JSON.stringify({
                        type: 'connection',
                        message: 'Connected to MCP streaming server',
                        server: server.name,
                        version: server.version,
                        timestamp: new Date().toISOString()
                    })}\n\n`;
                    controller.enqueue(new TextEncoder().encode(initEvent));
                    // Send periodic heartbeat
                    const heartbeatInterval = setInterval(() => {
                        const heartbeat = `id: ${eventId++}\nevent: heartbeat\ndata: ${JSON.stringify({
                            type: 'heartbeat',
                            timestamp: new Date().toISOString()
                        })}\n\n`;
                        try {
                            controller.enqueue(new TextEncoder().encode(heartbeat));
                        }
                        catch (error) {
                            clearInterval(heartbeatInterval);
                        }
                    }, 30000); // 30 seconds heartbeat
                    // Handle client disconnect
                    request.signal.addEventListener('abort', () => {
                        clearInterval(heartbeatInterval);
                        controller.close();
                    });
                }
            });
            return new Response(stream, { headers: streamHeaders });
        }
        // WebSocket-like streaming for MCP commands over HTTP
        if (request.method === 'POST' && url.pathname === '/stream') {
            const streamHeaders = {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type, Cache-Control, Last-Event-ID'
            };
            try {
                const body = await request.json();
                const { jsonrpc, id, method, params } = body;
                const stream = new ReadableStream({
                    async start(controller) {
                        let eventId = 0;
                        // Send request received event
                        const requestEvent = `id: ${eventId++}\nevent: request_received\ndata: ${JSON.stringify({
                            type: 'request',
                            method,
                            params,
                            id,
                            timestamp: new Date().toISOString()
                        })}\n\n`;
                        controller.enqueue(new TextEncoder().encode(requestEvent));
                        // Process the MCP method
                        try {
                            // Send processing event
                            const processingEvent = `id: ${eventId++}\nevent: processing\ndata: ${JSON.stringify({
                                type: 'processing',
                                method,
                                message: 'Processing MCP request...',
                                timestamp: new Date().toISOString()
                            })}\n\n`;
                            controller.enqueue(new TextEncoder().encode(processingEvent));
                            const response = await handleMcpMethod(method, params, id);
                            // Send response event
                            const responseEvent = `id: ${eventId++}\nevent: response\ndata: ${JSON.stringify({
                                type: 'response',
                                response,
                                timestamp: new Date().toISOString()
                            })}\n\n`;
                            controller.enqueue(new TextEncoder().encode(responseEvent));
                            // Send completion event
                            const completionEvent = `id: ${eventId++}\nevent: completed\ndata: ${JSON.stringify({
                                type: 'completed',
                                method,
                                success: true,
                                timestamp: new Date().toISOString()
                            })}\n\n`;
                            controller.enqueue(new TextEncoder().encode(completionEvent));
                        }
                        catch (error) {
                            // Send error event
                            const errorEvent = `id: ${eventId++}\nevent: error\ndata: ${JSON.stringify({
                                type: 'error',
                                error: error.message,
                                method,
                                timestamp: new Date().toISOString()
                            })}\n\n`;
                            controller.enqueue(new TextEncoder().encode(errorEvent));
                        }
                        finally {
                            controller.close();
                        }
                    }
                });
                return new Response(stream, { headers: streamHeaders });
            }
            catch (error) {
                const errorStream = new ReadableStream({
                    start(controller) {
                        const errorEvent = `id: 0\nevent: error\ndata: ${JSON.stringify({
                            type: 'error',
                            error: error.message,
                            timestamp: new Date().toISOString()
                        })}\n\n`;
                        controller.enqueue(new TextEncoder().encode(errorEvent));
                        controller.close();
                    }
                });
                return new Response(errorStream, { headers: streamHeaders });
            }
        }
        // Handle MCP JSON-RPC requests (traditional endpoint)
        if (request.method === 'POST' && url.pathname !== '/stream') {
            try {
                const body = await request.json();
                // Handle batch requests
                if (Array.isArray(body)) {
                    const responses = await Promise.all(body.map((req) => handleMcpMethod(req.method, req.params, req.id)));
                    return new Response(JSON.stringify(responses), {
                        headers: { 'Content-Type': 'application/json', ...corsHeaders }
                    });
                }
                // Single request
                const { jsonrpc, id, method, params } = body;
                if (jsonrpc !== '2.0') {
                    return new Response(JSON.stringify(jsonRpcError(id || null, -32600, 'Invalid Request: jsonrpc must be "2.0"')), {
                        status: 400,
                        headers: { 'Content-Type': 'application/json', ...corsHeaders }
                    });
                }
                const response = await handleMcpMethod(method, params, id);
                return new Response(JSON.stringify(response), {
                    headers: { 'Content-Type': 'application/json', ...corsHeaders }
                });
            }
            catch (err) {
                return new Response(JSON.stringify(jsonRpcError(null, -32700, 'Parse error', err.message)), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json', ...corsHeaders }
                });
            }
        }
        // GET request - return server info (for debugging)
        return new Response(JSON.stringify({
            name: server.name,
            version: server.version,
            endpoint: '/mcp',
            streaming: {
                enabled: true,
                endpoints: {
                    sse: '/stream',
                    mcp_stream: '/stream',
                    health: '/health'
                }
            },
            protocol: 'JSON-RPC 2.0',
            methods: ['initialize', 'tools/list', 'tools/call', 'resources/list', 'resources/read', 'prompts/list', 'prompts/get'],
            features: ['http-streaming', 'sse-events', 'real-time-responses']
        }), {
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
    }
};
