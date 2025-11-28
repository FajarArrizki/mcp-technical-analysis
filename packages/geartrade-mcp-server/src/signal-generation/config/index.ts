/**
 * Configuration Functions
 * getTradingConfig, constants, etc.
 * Cloudflare Workers compatible version
 */

import { TradingConfig } from '../types'
import path from 'path'
import fs from 'fs'

// Note: In Cloudflare Workers, environment variables are provided via the runtime
// .env file loading is not needed as Workers use environment variables set via deployment

// Read environment variables directly (not cached at module load time)
// In Cloudflare Workers, these are provided via the worker environment

function getHyperliquidApiUrlFromEnv(): string {
  // Check if custom URL is provided
  if (process.env.HYPERLIQUID_API_URL) {
    return process.env.HYPERLIQUID_API_URL
  }

  // Use testnet or mainnet based on configuration
  const isTestnet = process.env.HYPERLIQUID_TESTNET === 'true' ||
                   process.env.HYPERLIQUID_NETWORK === 'testnet'

  return isTestnet
    ? 'https://api.hyperliquid-testnet.xyz'
    : 'https://api.hyperliquid.xyz'
}

function getHyperliquidAccountAddressFromEnv(): string {
  return process.env.HYPERLIQUID_ACCOUNT_ADDRESS || ''
}

function getHyperliquidWalletApiKeyFromEnv(): string {
  return process.env.HYPERLIQUID_WALLET_API_KEY || ''
}

function getHyperliquidPrivateKeyFromEnv(): string {
  return process.env.HYPERLIQUID_PRIVATE_KEY || ''
}

function getHyperliquidMarketFromEnv(): string {
  return process.env.HYPERLIQUID_MARKET || 'FUTURES'
}

function getHyperliquidDefaultLeverageFromEnv(): number {
  const leverage = parseFloat(process.env.HYPERLIQUID_DEFAULT_LEVERAGE || '5')
  return isNaN(leverage) ? 5 : leverage
}

function getHyperliquidMaxPositionSizeFromEnv(): number {
  const size = parseFloat(process.env.HYPERLIQUID_MAX_POSITION_SIZE || '1000')
  return isNaN(size) ? 1000 : size
}

function getHyperliquidRiskPercentageFromEnv(): number {
  const risk = parseFloat(process.env.HYPERLIQUID_RISK_PERCENTAGE || '1.0')
  return isNaN(risk) ? 1.0 : risk
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
 * Get Hyperliquid private key
 */
export function getHyperliquidPrivateKey(): string {
  return getHyperliquidPrivateKeyFromEnv()
}

/**
 * Get Hyperliquid market type (SPOT, FUTURES, or BOTH)
 */
export function getHyperliquidMarket(): string {
  return getHyperliquidMarketFromEnv()
}

/**
 * Get Hyperliquid default leverage
 */
export function getHyperliquidDefaultLeverage(): number {
  return getHyperliquidDefaultLeverageFromEnv()
}

/**
 * Get Hyperliquid max position size
 */
export function getHyperliquidMaxPositionSize(): number {
  return getHyperliquidMaxPositionSizeFromEnv()
}

/**
 * Get Hyperliquid risk percentage
 */
export function getHyperliquidRiskPercentage(): number {
  return getHyperliquidRiskPercentageFromEnv()
}

/**
 * Get complete Hyperliquid configuration
 */
export function getHyperliquidConfig() {
  const isTestnet = process.env.HYPERLIQUID_TESTNET === 'true' ||
                   process.env.HYPERLIQUID_NETWORK === 'testnet'

  return {
    network: isTestnet ? 'testnet' : 'mainnet',
    apiUrl: getHyperliquidApiUrl(),
    market: getHyperliquidMarket(),
    privateKey: getHyperliquidPrivateKey(),
    walletApiKey: getHyperliquidWalletApiKey(),
    accountAddress: getHyperliquidAccountAddress(),
    defaultLeverage: getHyperliquidDefaultLeverage(),
    maxPositionSize: getHyperliquidMaxPositionSize(),
    riskPercentage: getHyperliquidRiskPercentage(),
    isTestnet
  }
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

