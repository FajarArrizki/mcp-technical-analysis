/**
 * Warning Collection
 * collectWarning, signalWarnings functions
 */
// Global warnings collection for signal processing
export const signalWarnings = [];
/**
 * Helper function to collect warnings instead of printing immediately
 */
export function collectWarning(asset, message, details = null) {
    signalWarnings.push({
        asset,
        message,
        details,
        timestamp: Date.now()
    });
}
/**
 * Clear all warnings
 */
export function clearWarnings() {
    signalWarnings.length = 0;
}
/**
 * Get all warnings for a specific asset
 */
export function getWarningsForAsset(asset) {
    return signalWarnings.filter(w => w.asset === asset);
}
