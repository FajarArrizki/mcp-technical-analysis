/**
 * Caching Utilities
 * getCacheTTLForInterval function
 */
export function getCacheTTLForInterval(interval) {
    // Cache TTL based on interval (milliseconds)
    // Shorter intervals = shorter cache (more frequent updates needed)
    if (interval === '1m' || interval === '3m' || interval === '5m') {
        return 60 * 1000; // 1 minute cache for 1-5m intervals
    }
    else if (interval === '15m' || interval === '30m') {
        return 5 * 60 * 1000; // 5 minutes cache for 15-30m intervals
    }
    else if (interval === '1h' || interval === '2h') {
        return 15 * 60 * 1000; // 15 minutes cache for 1-2h intervals
    }
    else if (interval === '4h' || interval === '6h' || interval === '8h' || interval === '12h') {
        return 60 * 60 * 1000; // 1 hour cache for 4-12h intervals
    }
    else if (interval === '1d' || interval === '3d' || interval === '1w' || interval === '1M') {
        return 6 * 60 * 60 * 1000; // 6 hours cache for daily+ intervals
    }
    else {
        return 15 * 60 * 1000; // Default: 15 minutes
    }
}
