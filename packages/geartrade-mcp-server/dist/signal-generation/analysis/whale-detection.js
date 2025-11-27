/**
 * Whale Detection System
 * Detect large orders, spoofing, wash trading, smart money flow
 */
// Order tracking (in-memory cache for spoofing detection)
// const orderCache = new Map<string, Array<{ price: number; size: number; timestamp: number; side: 'buy' | 'sell'; canceled: boolean }>>()
// const ORDER_CACHE_TTL = 60000 // 1 minute
const SPOOFING_THRESHOLD = 3; // Orders cancelled within 5 seconds
const LARGE_ORDER_THRESHOLD = 100000; // $100k USD
/**
 * Detect large orders
 */
export function detectLargeOrders(historicalData, minSize = LARGE_ORDER_THRESHOLD) {
    const largeOrders = [];
    // Analyze historical data for large volume spikes
    // Large orders typically show up as volume spikes
    if (!historicalData || historicalData.length < 20) {
        return largeOrders;
    }
    // Calculate average volume
    const volumes = historicalData.map(d => d.volume);
    const avgVolume = volumes.reduce((sum, v) => sum + v, 0) / volumes.length;
    const stdDev = Math.sqrt(volumes.reduce((sum, v) => sum + Math.pow(v - avgVolume, 2), 0) / volumes.length);
    // Find large volume spikes (>2 standard deviations)
    for (let i = 0; i < historicalData.length; i++) {
        const candle = historicalData[i];
        const volume = candle.volume;
        if (volume > avgVolume + 2 * stdDev) {
            // Large volume spike detected
            // Estimate order size from volume and price
            const estimatedSize = volume * candle.close;
            if (estimatedSize >= minSize) {
                // Determine side based on price action
                const side = candle.close > candle.open ? 'buy' : 'sell';
                largeOrders.push({
                    price: candle.close,
                    size: estimatedSize,
                    side,
                    timestamp: candle.time,
                    isActive: false // Historical data, not active
                });
            }
        }
    }
    return largeOrders;
}
/**
 * Detect spoofing patterns
 */
export function detectSpoofing(orders) {
    // Spoofing: large orders placed and quickly cancelled
    // Look for patterns of orders that appear and disappear rapidly
    if (orders.length < SPOOFING_THRESHOLD) {
        return false;
    }
    // Group orders by price level (within 0.1%)
    const orderGroups = new Map();
    for (const order of orders) {
        const priceLevel = Math.floor(order.price / (order.price * 0.001)); // Round to 0.1%
        const key = `${priceLevel}_${order.side}`;
        if (!orderGroups.has(key)) {
            orderGroups.set(key, []);
        }
        orderGroups.get(key).push(order);
    }
    // Check for rapid order placement and cancellation at same levels
    for (const [, groupOrders] of orderGroups) {
        if (groupOrders.length >= SPOOFING_THRESHOLD) {
            // Multiple orders at same price level in short time = spoofing
            const timeRange = Math.max(...groupOrders.map(o => o.timestamp)) - Math.min(...groupOrders.map(o => o.timestamp));
            if (timeRange < 5000) { // Within 5 seconds
                return true;
            }
        }
    }
    return false;
}
/**
 * Detect wash trading
 */
export function detectWashTrading(historicalData) {
    // Wash trading: same entity buying and selling to create fake volume
    // Look for unusual volume patterns with minimal price movement
    if (!historicalData || historicalData.length < 10) {
        return false;
    }
    // Analyze recent candles
    const recentData = historicalData.slice(-20);
    const volumes = recentData.map(d => d.volume);
    const priceChanges = recentData.map((d, i) => {
        if (i === 0)
            return 0;
        return Math.abs((d.close - recentData[i - 1].close) / recentData[i - 1].close) * 100;
    });
    const avgVolume = volumes.reduce((sum, v) => sum + v, 0) / volumes.length;
    // const avgPriceChange = priceChanges.reduce((sum, p) => sum + p, 0) / priceChanges.length
    // Wash trading: high volume with low price movement
    // If volume is 2x average but price change < 0.1%, likely wash trading
    const highVolumeCandles = volumes.filter(v => v > avgVolume * 2).length;
    const lowPriceChangeCandles = priceChanges.filter(p => p < 0.1).length;
    if (highVolumeCandles > recentData.length * 0.5 && lowPriceChangeCandles > recentData.length * 0.7) {
        return true; // High volume with minimal price movement = wash trading
    }
    return false;
}
/**
 * Identify accumulation/distribution zones
 */
export function identifyAccumulationDistributionZones(historicalData, largeOrders) {
    const accumulationZones = [];
    const distributionZones = [];
    if (!historicalData || historicalData.length < 10) {
        return { accumulationZones, distributionZones };
    }
    // Find price levels with high buy order concentration (accumulation)
    // Find price levels with high sell order concentration (distribution)
    const buyOrders = largeOrders.filter(o => o.side === 'buy');
    const sellOrders = largeOrders.filter(o => o.side === 'sell');
    // Cluster buy orders by price
    const buyClusters = clusterOrdersByPrice(buyOrders, 0.02); // 2% price range
    const sellClusters = clusterOrdersByPrice(sellOrders, 0.02);
    // Accumulation zones: price levels with many buy orders
    for (const cluster of buyClusters) {
        if (cluster.size > 3) { // At least 3 orders
            accumulationZones.push({
                priceLow: cluster.priceLow,
                priceHigh: cluster.priceHigh
            });
        }
    }
    // Distribution zones: price levels with many sell orders
    for (const cluster of sellClusters) {
        if (cluster.size > 3) {
            distributionZones.push({
                priceLow: cluster.priceLow,
                priceHigh: cluster.priceHigh
            });
        }
    }
    return { accumulationZones, distributionZones };
}
/**
 * Cluster orders by price
 */
function clusterOrdersByPrice(orders, rangePct) {
    const clusters = [];
    for (const order of orders) {
        let added = false;
        for (const cluster of clusters) {
            const clusterMid = (cluster.priceLow + cluster.priceHigh) / 2;
            const distance = Math.abs(order.price - clusterMid) / clusterMid;
            if (distance < rangePct) {
                // Add to existing cluster
                cluster.priceLow = Math.min(cluster.priceLow, order.price);
                cluster.priceHigh = Math.max(cluster.priceHigh, order.price);
                cluster.size++;
                cluster.orders.push(order);
                added = true;
                break;
            }
        }
        if (!added) {
            // Create new cluster
            clusters.push({
                priceLow: order.price,
                priceHigh: order.price,
                size: 1,
                orders: [order]
            });
        }
    }
    return clusters.map(c => ({
        priceLow: c.priceLow,
        priceHigh: c.priceHigh,
        size: c.size
    }));
}
/**
 * Calculate smart money flow
 */
export function calculateSmartMoneyFlow(largeOrders, accumulationZones, distributionZones) {
    // Smart money flow: accumulation - distribution
    // Positive = accumulation (bullish), negative = distribution (bearish)
    if (largeOrders.length === 0) {
        return 0;
    }
    // Calculate total buy vs sell volume
    const buyVolume = largeOrders.filter(o => o.side === 'buy').reduce((sum, o) => sum + o.size, 0);
    const sellVolume = largeOrders.filter(o => o.side === 'sell').reduce((sum, o) => sum + o.size, 0);
    const totalVolume = buyVolume + sellVolume;
    if (totalVolume === 0) {
        return 0;
    }
    // Flow: (buy - sell) / total, normalized to -1 to 1
    const flow = (buyVolume - sellVolume) / totalVolume;
    // Adjust based on accumulation/distribution zones
    const accumulationScore = accumulationZones.length;
    const distributionScore = distributionZones.length;
    const zoneAdjustment = (accumulationScore - distributionScore) / Math.max(1, accumulationScore + distributionScore);
    // Combined flow score
    const combinedFlow = (flow * 0.7 + zoneAdjustment * 0.3);
    return isNaN(combinedFlow) || !isFinite(combinedFlow) ? 0 : Math.max(-1, Math.min(1, combinedFlow));
}
/**
 * Calculate whale activity score
 */
export function calculateWhaleScore(largeOrders, spoofingDetected, washTradingDetected, smartMoneyFlow) {
    // Whale score: 0-1, higher = more whale activity
    let score = 0;
    // Base score from number of large orders (0-0.4)
    const orderScore = Math.min(0.4, largeOrders.length / 10); // Max 0.4 for 10+ orders
    score += orderScore;
    // Spoofing reduces reliability but indicates whale activity (0-0.2)
    if (spoofingDetected) {
        score += 0.2; // Spoofing = whale activity
    }
    // Wash trading reduces reliability but indicates manipulation (0-0.1)
    if (washTradingDetected) {
        score += 0.1; // Wash trading = whale activity
    }
    // Smart money flow strength (0-0.3)
    const flowScore = Math.abs(smartMoneyFlow) * 0.3;
    score += flowScore;
    return Math.min(1, Math.max(0, score));
}
/**
 * Analyze whale activity
 */
export function analyzeWhaleActivity(historicalData) {
    // Detect large orders
    const largeOrders = detectLargeOrders(historicalData);
    // Detect spoofing
    const spoofingDetected = detectSpoofing(largeOrders);
    // Detect wash trading
    const washTradingDetected = detectWashTrading(historicalData);
    // Identify accumulation/distribution zones
    const { accumulationZones, distributionZones } = identifyAccumulationDistributionZones(historicalData, largeOrders);
    // Calculate smart money flow
    const smartMoneyFlow = calculateSmartMoneyFlow(largeOrders, accumulationZones, distributionZones);
    // Calculate whale score
    const whaleScore = calculateWhaleScore(largeOrders, spoofingDetected, washTradingDetected, smartMoneyFlow);
    return {
        largeOrders,
        spoofingDetected,
        washTradingDetected,
        accumulationZones,
        distributionZones,
        smartMoneyFlow: isNaN(smartMoneyFlow) || !isFinite(smartMoneyFlow) ? 0 : smartMoneyFlow,
        whaleScore: isNaN(whaleScore) || !isFinite(whaleScore) ? 0 : whaleScore
    };
}
