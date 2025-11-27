/**
 * BTC Correlation Engine
 * Track BTC price, calculate correlations, predict alt impact
 */
import { getHistoricalDataFromBinance } from '../data-fetchers/binance';
// BTC price cache (refresh every 30 seconds)
let btcPriceCache = null;
const BTC_CACHE_TTL = 30000; // 30 seconds
// Correlation cache (refresh every 5 minutes)
const correlationCache = new Map();
const CORRELATION_CACHE_TTL = 300000; // 5 minutes
/**
 * Get current BTC price
 */
export async function getBTCCurrentPrice() {
    // Check cache first
    if (btcPriceCache && Date.now() - btcPriceCache.timestamp < BTC_CACHE_TTL) {
        return btcPriceCache.price;
    }
    try {
        // Fetch BTC data from Binance
        const btcData = await getHistoricalDataFromBinance('BTC', '1m', 1);
        if (btcData && btcData.length > 0) {
            const price = btcData[btcData.length - 1].close;
            btcPriceCache = { price, timestamp: Date.now() };
            return price;
        }
    }
    catch (error) {
        console.warn(`⚠️  Failed to fetch BTC price: ${error.message}`);
        // Return cached price if available
        if (btcPriceCache) {
            return btcPriceCache.price;
        }
    }
    // Fallback: try to fetch from another endpoint or use cached value
    throw new Error('Failed to fetch BTC price');
}
/**
 * Calculate correlation between asset and BTC
 */
function calculateCorrelation(assetPrices, btcPrices, period) {
    if (assetPrices.length < period || btcPrices.length < period) {
        return 0;
    }
    const assetSlice = assetPrices.slice(-period);
    const btcSlice = btcPrices.slice(-period);
    if (assetSlice.length !== btcSlice.length) {
        return 0;
    }
    // Calculate returns
    const assetReturns = [];
    const btcReturns = [];
    for (let i = 1; i < assetSlice.length; i++) {
        if (assetSlice[i - 1] > 0 && btcSlice[i - 1] > 0) {
            assetReturns.push((assetSlice[i] - assetSlice[i - 1]) / assetSlice[i - 1]);
            btcReturns.push((btcSlice[i] - btcSlice[i - 1]) / btcSlice[i - 1]);
        }
    }
    if (assetReturns.length < 2 || btcReturns.length < 2) {
        return 0;
    }
    // Calculate means
    const assetMean = assetReturns.reduce((sum, r) => sum + r, 0) / assetReturns.length;
    const btcMean = btcReturns.reduce((sum, r) => sum + r, 0) / btcReturns.length;
    // Calculate covariance and variances
    let covariance = 0;
    let assetVariance = 0;
    let btcVariance = 0;
    for (let i = 0; i < assetReturns.length; i++) {
        const assetDiff = assetReturns[i] - assetMean;
        const btcDiff = btcReturns[i] - btcMean;
        covariance += assetDiff * btcDiff;
        assetVariance += assetDiff * assetDiff;
        btcVariance += btcDiff * btcDiff;
    }
    const n = assetReturns.length;
    covariance = covariance / n;
    assetVariance = assetVariance / n;
    btcVariance = btcVariance / n;
    // Calculate correlation
    const denominator = Math.sqrt(assetVariance * btcVariance);
    if (denominator === 0 || !isFinite(denominator)) {
        return 0;
    }
    const correlation = covariance / denominator;
    return isNaN(correlation) || !isFinite(correlation) ? 0 : Math.max(-1, Math.min(1, correlation));
}
/**
 * Calculate BTC correlation for an asset
 */
export async function calculateBTCCorrelation(asset, assetHistoricalData, btcHistoricalData) {
    // Check cache first
    const cached = correlationCache.get(asset);
    if (cached && Date.now() - cached.timestamp < CORRELATION_CACHE_TTL) {
        return cached.data;
    }
    try {
        // Fetch BTC data if not provided
        let btcData = btcHistoricalData;
        if (!btcData) {
            try {
                // Fetch 30 days of hourly data for correlation calculation
                btcData = await getHistoricalDataFromBinance('BTC', '1h', 720); // ~30 days
            }
            catch (error) {
                console.warn(`⚠️  Failed to fetch BTC historical data: ${error.message}`);
            }
        }
        if (!btcData || btcData.length === 0 || !assetHistoricalData || assetHistoricalData.length === 0) {
            // Return neutral correlation if data unavailable
            const neutralData = {
                correlation24h: 0,
                correlation7d: 0,
                correlation30d: 0,
                strength: 'weak',
                impactMultiplier: 1,
                lastUpdate: Date.now()
            };
            correlationCache.set(asset, { data: neutralData, timestamp: Date.now() });
            return neutralData;
        }
        // Align timestamps (take intersection of timestamps)
        const alignedData = [];
        const btcMap = new Map();
        for (const btcPoint of btcData) {
            // Round timestamp to nearest hour for alignment
            const roundedTime = Math.floor(btcPoint.time / 3600000) * 3600000;
            btcMap.set(roundedTime, btcPoint.close);
        }
        for (const assetPoint of assetHistoricalData) {
            const roundedTime = Math.floor(assetPoint.time / 3600000) * 3600000;
            const btcPrice = btcMap.get(roundedTime);
            if (btcPrice && btcPrice > 0 && assetPoint.close > 0) {
                alignedData.push({
                    assetPrice: assetPoint.close,
                    btcPrice,
                    time: roundedTime
                });
            }
        }
        if (alignedData.length < 24) {
            // Not enough data
            const neutralData = {
                correlation24h: 0,
                correlation7d: 0,
                correlation30d: 0,
                strength: 'weak',
                impactMultiplier: 1,
                lastUpdate: Date.now()
            };
            correlationCache.set(asset, { data: neutralData, timestamp: Date.now() });
            return neutralData;
        }
        // Extract price arrays
        const assetPrices = alignedData.map(d => d.assetPrice);
        const btcPrices = alignedData.map(d => d.btcPrice);
        // Calculate correlations for different periods
        const correlation24h = calculateCorrelation(assetPrices, btcPrices, 24);
        const correlation7d = calculateCorrelation(assetPrices, btcPrices, 168); // 7 days * 24 hours
        const correlation30d = calculateCorrelation(assetPrices, btcPrices, 720); // 30 days * 24 hours
        // Determine strength based on average correlation
        const avgCorrelation = (correlation24h + correlation7d + correlation30d) / 3;
        let strength = 'weak';
        if (Math.abs(avgCorrelation) > 0.7) {
            strength = 'strong';
        }
        else if (Math.abs(avgCorrelation) > 0.4) {
            strength = 'moderate';
        }
        // Calculate impact multiplier (beta)
        // If BTC moves 1%, asset typically moves X%
        // Use 7d correlation as base for impact multiplier
        const impactMultiplier = Math.abs(correlation7d) * 1.5; // Rough estimate, would need regression for accurate beta
        const result = {
            correlation24h: isNaN(correlation24h) ? 0 : correlation24h,
            correlation7d: isNaN(correlation7d) ? 0 : correlation7d,
            correlation30d: isNaN(correlation30d) ? 0 : correlation30d,
            strength,
            impactMultiplier: isNaN(impactMultiplier) || !isFinite(impactMultiplier) ? 1 : Math.max(0.1, Math.min(3, impactMultiplier)),
            lastUpdate: Date.now()
        };
        // Cache result
        correlationCache.set(asset, { data: result, timestamp: Date.now() });
        return result;
    }
    catch (error) {
        const errorMsg = error.message || String(error);
        console.warn(`⚠️  Failed to calculate BTC correlation for ${asset}: ${errorMsg}`);
        // Return neutral correlation on error
        const neutralData = {
            correlation24h: 0,
            correlation7d: 0,
            correlation30d: 0,
            strength: 'weak',
            impactMultiplier: 1,
            lastUpdate: Date.now()
        };
        correlationCache.set(asset, { data: neutralData, timestamp: Date.now() });
        return neutralData;
    }
}
/**
 * Get BTC dominance
 */
export async function getBTCDominance() {
    try {
        // Binance doesn't provide BTC dominance directly
        // We can calculate from market caps or use CoinGecko API
        // For now, return placeholder (would need external API)
        // Placeholder: return neutral dominance
        return {
            current: 50, // Placeholder
            change24h: 0,
            trend: 'neutral',
            lastUpdate: Date.now()
        };
    }
    catch (error) {
        console.warn(`⚠️  Failed to fetch BTC dominance: ${error.message}`);
        return {
            current: 50,
            change24h: 0,
            trend: 'neutral',
            lastUpdate: Date.now()
        };
    }
}
/**
 * Predict alt impact from BTC move
 */
export function predictAltImpactFromBTCMove(btcMovePct, correlationData) {
    // Predicted alt move = BTC move * correlation * impact multiplier
    const predictedMove = btcMovePct * correlationData.correlation7d * correlationData.impactMultiplier;
    return isNaN(predictedMove) || !isFinite(predictedMove) ? 0 : predictedMove;
}
/**
 * Check if BTC move is significant enough to affect alt
 */
export function isBTCMoveSignificant(btcMovePct, correlationData, threshold = 2 // 2% BTC move threshold
) {
    if (Math.abs(btcMovePct) < threshold) {
        return false;
    }
    // Significant if correlation is strong/moderate
    if (correlationData.strength === 'strong' || correlationData.strength === 'moderate') {
        return true;
    }
    // Check predicted impact
    const predictedImpact = predictAltImpactFromBTCMove(btcMovePct, correlationData);
    return Math.abs(predictedImpact) > 1; // 1% predicted impact
}
/**
 * Batch calculate BTC correlations for multiple assets
 */
export async function batchCalculateBTCCorrelations(assets, assetHistoricalDataMap) {
    const results = new Map();
    // Fetch BTC data once for all assets
    let btcHistoricalData;
    try {
        btcHistoricalData = await getHistoricalDataFromBinance('BTC', '1h', 720);
    }
    catch (error) {
        console.warn(`⚠️  Failed to fetch BTC historical data for batch: ${error.message}`);
    }
    // Calculate correlations in parallel
    const promises = assets.map(async (asset) => {
        const historicalData = assetHistoricalDataMap instanceof Map
            ? assetHistoricalDataMap.get(asset)
            : assetHistoricalDataMap[asset];
        if (!historicalData || historicalData.length === 0) {
            return { asset, correlation: null };
        }
        try {
            const correlation = await calculateBTCCorrelation(asset, historicalData, btcHistoricalData);
            return { asset, correlation };
        }
        catch (error) {
            console.warn(`⚠️  Failed to calculate BTC correlation for ${asset}: ${error.message}`);
            return { asset, correlation: null };
        }
    });
    const resultsArray = await Promise.all(promises);
    for (const { asset, correlation } of resultsArray) {
        if (correlation) {
            results.set(asset, correlation);
        }
    }
    return results;
}
/**
 * BTC Correlation Indicator - Explained (multiline help text)
 *
 * Use this string to display/expose the correlation concept in UIs or logs.
 */
export const BTC_CORRELATION_EXPLANATION = [
    '📊 BTC Correlation Indicator - Explained',
    '',
    'Konsep Dasar:',
    'BTC Correlation mengukur seberapa kuat pergerakan harga suatu altcoin mengikuti pergerakan BTC.',
    '',
    '🎯 Cara Kerja (Correlation Score: -1.0 s/d +1.0):',
    '+1.0  = Perfect Positive Correlation',
    '        └─ BTC naik 1% → Altcoin naik 1% (perfectly synced)',
    '',
    '+0.8  = Strong Positive Correlation',
    '        └─ BTC naik 1% → Altcoin naik ~0.8% (sangat mengikuti)',
    '',
    '+0.5  = Moderate Positive Correlation',
    '        └─ BTC naik 1% → Altcoin naik ~0.5% (agak mengikuti)',
    '',
    ' 0.0  = No Correlation',
    '        └─ BTC naik/turun → Altcoin random (independent)',
    '',
    '-0.5  = Moderate Negative Correlation',
    '        └─ BTC naik 1% → Altcoin turun ~0.5% (berlawanan)',
    '',
    '-1.0  = Perfect Negative Correlation',
    '        └─ BTC naik 1% → Altcoin turun 1% (inverse)'
].join('\n');
