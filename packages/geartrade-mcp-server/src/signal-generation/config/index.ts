/**
 * Configuration Functions
 * getTradingConfig, constants, etc.
 * Cloudflare Workers compatible version
 */

import { TradingConfig } from '../types'

// Note: In Cloudflare Workers, environment variables are provided via the runtime
// .env file loading is not needed as Workers use environment variables set via deployment

// Read environment variables directly (not cached at module load time)
// In Cloudflare Workers, these are provided via the worker environment
function getAIProviderFromEnv(): string {
  return 'openrouter' // Use default, will be overridden by wrangler.toml vars
}

function getModelIdFromEnv(): string | undefined {
  return 'openai/gpt-4-turbo' // Use default, will be overridden by wrangler.toml vars
}

function getAIProviderApiKeyFromEnv(): string {
  return '' // Should be set via wrangler secret
}

function getHyperliquidApiUrlFromEnv(): string {
  return 'https://api.hyperliquid.xyz' // Default, can be overridden by wrangler.toml vars
}

function getHyperliquidAccountAddressFromEnv(): string {
  return '' // Should be set via wrangler secret
}

function getHyperliquidWalletApiKeyFromEnv(): string {
  return '' // Should be set via wrangler secret
}

// Cache for trading config to avoid reloading
let cachedConfig: TradingConfig | null = null
let configLoaded = false
let configLogPrinted = false

/**
 * Load trading configuration from config file
 */
export function getTradingConfig(): TradingConfig | null {
  // Return cached config if already loaded
  if (configLoaded && cachedConfig) {
    return cachedConfig
  }
  
  let config: TradingConfig | null = null
  try {
    const configPath = path.join(__dirname, '..', '..', '..', 'config', 'trading.config.js')
    if (fs.existsSync(configPath)) {
      // Use require for .js config files
      delete require.cache[require.resolve(configPath)]
      config = require(configPath)
      // Only log once on first load
      if (!configLogPrinted) {
        console.log(`📋 Loaded trading config: Mode=${config?.mode}`)
        configLogPrinted = true
      }
    }
  } catch (error: any) {
    if (!configLogPrinted) {
      console.warn(`⚠️  Failed to load trading config: ${error.message}, using defaults`)
      configLogPrinted = true
    }
  }
  
  // Return default config if loading failed
  if (!config) {
    config = {
      mode: 'AUTONOMOUS' as const,
      thresholds: {
        confidence: {
          high: 0.60, // CRITICAL FIX: Lowered from 70% to 60% for futures trading
          medium: 0.40,
          low: 0.35,
          reject: 0.30
        },
        expectedValue: {
          high: 0.5,
          medium: 0.2,
          low: 0.1,
          reject: -1.0
        }
      },
      positionSizing: {
        highConfidence: 1.0,
        mediumConfidence: 0.7,
        lowConfidence: 0.5
      },
      safety: {
        maxRiskPerTrade: 2.0,
        maxOpenPositions: 2,
        dailyLossLimit: 5.0,
        consecutiveLosses: 3
      },
      limitedPairsMode: {
        enabled: false,
        correlationThreshold: 0.7
      }
    }
  }
  
  // Cache the config
  cachedConfig = config
  configLoaded = true
  
  return config
}

/**
 * Get AI provider name
 */
export function getAIProvider(): string {
  return getAIProviderFromEnv()
}

/**
 * Get AI model ID
 */
export function getAIModel(): string {
  const modelId = getModelIdFromEnv()
  if (!modelId) {
    throw new Error('MODEL_ID not found in environment variables')
  }
  return modelId
}

/**
 * Get AI provider API key
 */
export function getAIProviderApiKey(): string {
  const apiKey = getAIProviderApiKeyFromEnv()
  if (!apiKey) {
    const provider = getAIProviderFromEnv()
    const keyName = (provider === 'openrouter' || provider.toLowerCase() === 'openrouter') ? 'OPENROUTER_API_KEY' : 'AI_PROVIDER_API_KEY'
    throw new Error(`${keyName} is required`)
  }
  return apiKey
}

/**
 * Get Hyperliquid API URL
 */
export function getHyperliquidApiUrl(): string {
  return getHyperliquidApiUrlFromEnv()
}

/**
 * Get Hyperliquid account address
 */
export function getHyperliquidAccountAddress(): string {
  return getHyperliquidAccountAddressFromEnv()
}

/**
 * Get Hyperliquid wallet API key
 */
export function getHyperliquidWalletApiKey(): string {
  return getHyperliquidWalletApiKeyFromEnv()
}

/**
 * Get thresholds based on trading config
 */
export function getThresholds() {
  const config = getTradingConfig()
  return {
    confidence: {
      autoTrade: config?.thresholds?.confidence?.high || 0.60, // CRITICAL FIX: Lowered from 70% to 60%
      display: config?.thresholds?.confidence?.medium || 0.40,
      reject: config?.thresholds?.confidence?.reject || 0.60 // CRITICAL FIX: Minimum 60% confidence required (range: 60% - 100%)
    },
    expectedValue: {
      autoTrade: config?.thresholds?.expectedValue?.high || config?.thresholds?.expected_value || 0.5,
      display: config?.thresholds?.expectedValue?.medium || 0.2,
      reject: config?.thresholds?.expectedValue?.reject || -1.0
    },
    limitedPairs: {
      minConfidence: config?.thresholds?.confidence?.medium || 0.40,
      minEV: config?.thresholds?.expectedValue?.medium || 0.2,
      allowOversold: config?.limitedPairsMode?.allowOversoldPlays || false,
      maxRisk: config?.safety?.maxRiskPerTrade || 2.0
    }
  }
}

