/**
 * Position Warnings - Stub implementation
 * Simplified version for MCP compatibility
 */
/**
 * Collect warning - stub implementation
 */
export function collectWarning(asset, message, metadata, severity = 'medium') {
    console.warn(`[${asset}] ${message}`);
}
/**
 * Get warnings for asset - stub implementation
 */
export function getWarningsForAsset(asset) {
    return [];
}
/**
 * Clear warnings for asset - stub implementation
 */
export function clearWarningsForAsset(asset) {
    // No-op
}
