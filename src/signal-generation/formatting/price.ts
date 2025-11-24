/**
 * Price Formatting Functions
 * Format prices using original Hyperliquid format (preserves precision, no trailing zeros)
 */

/**
 * Format price using original Hyperliquid format
 * Uses original price string from Hyperliquid if available, otherwise formats number without trailing zeros
 * This matches Hyperliquid's display format which preserves precision (e.g., "16.038" not "16.0380")
 */
export function formatPrice(
  price: number | string | null | undefined, 
  _asset?: string | null,
  originalPriceString?: string | null
): string {
  // CRITICAL FIX: If original price string from Hyperliquid is provided, use it directly (preserves exact format)
  // This ensures price matches Hyperliquid UI exactly (same format, same precision, same trailing zeros if any)
  // Do NOT remove trailing zeros - use Hyperliquid's exact format
  if (originalPriceString && typeof originalPriceString === 'string' && originalPriceString !== '0') {
    // Use original string directly from Hyperliquid (preserves exact format including trailing zeros if any)
    return originalPriceString
  }
  
  // If price is already a string, return it as-is but remove trailing zeros
  if (typeof price === 'string') {
    // Remove trailing zeros if any
    return price.replace(/\.?0+$/, '')
  }
  
  // Convert number to string without trailing zeros (matches Hyperliquid format)
  if (!price || isNaN(price as number)) return '0'
  
  const numPrice = price as number
  
  // CRITICAL FIX: Always use toFixed(8) then remove trailing zeros to ensure consistent formatting
  // This prevents floating point precision issues (e.g., 505.8300 vs 505.83)
  const formatted = numPrice.toFixed(8)
  // Remove trailing zeros, then remove decimal point if no digits remain
  // Example: "505.83000000" -> "505.83", "506.33580000" -> "506.3358"
  return formatted.replace(/0+$/, '').replace(/\.$/, '')
}

/**
 * Format large numbers (volume, OI) with thousand separators
 */
export function formatLargeNumber(num: number | null | undefined): string {
  if (!num || isNaN(num)) return '0'
  return num.toLocaleString('de-DE', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  }).replace(/\./g, '.')
}

