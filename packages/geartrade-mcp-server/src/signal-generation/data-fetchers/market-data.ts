/**
 * Market Data Fetcher
 * getMarketData function - fetches comprehensive market data including technical indicators
 */

import { log } from '../utils/logger'
import { getAssetMetadata } from './hyperliquid'
import { getHistoricalData, getMultiTimeframeData } from './historical-data'
import { calculateTechnicalIndicators } from '../technical-indicators'
import { calculateMultiTimeframeIndicators, checkTrendAlignment } from '../utils/multi-timeframe'
import { calculateEnhancedMetrics } from '../analysis/enhanced-metrics'
import { calculateOrderBookDepth } from '../analysis/orderbook'
import { calculateSessionVolumeProfile, calculateCompositeVolumeProfile } from '../analysis/volume-profile'
import { detectChangeOfCharacter } from '../analysis/market-structure'
import { performComprehensiveVolumeAnalysis } from '../analysis/volume-analysis'
import { fetchFuturesData } from './binance-futures'

// Stub functions for removed modules
function calculateCumulativeVolumeDelta(_data: any, _price?: number): any { return null }
function formatPrice(price: number, _asset?: string, _priceString?: string): string { return price.toString() }
function calculateBTCCorrelation(_data: any, _btcData: any): any { return null }
function analyzeWhaleActivity(_data: any): any { return null }

// Cache for funding rate and open interest trends
const fundingRateCache = new Map<string, { value: number; timestamp: number }>()
const openInterestCache = new Map<string, { value: number; timestamp: number }>()
const FUNDING_OI_CACHE_TTL = 600000 // 10 minutes default

export async function getMarketData(assets: string[], metadata?: any): Promise<{
  marketDataMap: Map<string, any>
  allowedAssets: string[]
}> {
  try {
    // OPTIMIZATION: Use provided metadata if available (avoid duplicate API call)
    const hyperliquidMetadata = metadata || await getAssetMetadata()
    const marketData = new Map<string, any>()
    
    // Hyperliquid returns array: [metaObject, assetCtxsArray]
    let assetCtxs: any[] = []
    let universe: any[] = []
    let marginTables: any[] = []
    
    if (Array.isArray(hyperliquidMetadata) && hyperliquidMetadata.length >= 2) {
      const metaObj = hyperliquidMetadata[0]
      if (metaObj && metaObj.universe) {
        universe = metaObj.universe || []
      }
      if (metaObj && metaObj.marginTables) {
        marginTables = metaObj.marginTables || []
      }
      assetCtxs = Array.isArray(hyperliquidMetadata[1]) ? hyperliquidMetadata[1] : []
    } else if (hyperliquidMetadata && (hyperliquidMetadata as any).data) {
      assetCtxs = (hyperliquidMetadata as any).data.assetCtxs || []
      universe = (hyperliquidMetadata as any).data.universe || []
      marginTables = (hyperliquidMetadata as any).data.marginTables || []
    }
    
    log(`   Found ${universe.length} assets in universe, ${assetCtxs.length} asset contexts, ${marginTables.length} margin tables`, 'cyan')
    
    // CRITICAL FIX: Remove rate limiting - process ALL assets in parallel without limits
    // Batch size set to very large number (999999) to effectively remove batching
    // All assets processed in parallel for maximum speed (no rate limit restrictions)
    const BATCH_SIZE = 999999 // Effectively unlimited - process all assets in parallel
    // const BATCH_DELAY = 0 // 0ms delay between batches (no throttling)

    // OPTIMIZATION FINAL: Cache all configuration constants at function start (avoid repeated checks per asset)
    // CRITICAL FIX: Increased to 75 candles minimum for better volume analysis and indicator accuracy
    // Volume analysis requires sufficient historical data to calculate POC, VAH/VAL, HVN/LVN, CVD, etc.
    const CANDLES_COUNT = 200
    // FUTURES / SCALPING MODE: default primary TF → 5m (lebih responsif untuk entry cepat)
    // Bisa override via env: PRIMARY_DATA_INTERVAL=10m/15m/1h, dll.
    const PRIMARY_INTERVAL = '5m'
    // CRITICAL FIX: Enable multi-timeframe by default for better trend alignment scoring
    // Multi-timeframe provides alignmentScore (0-100) which is critical for confidence calculation (25 points)
    // Can disable via MULTI_TIMEFRAME="" if needed (for speed)
    const MULTI_TIMEFRAME = ['1d', '4h', '1h'] // Default: daily, 4h, 1h timeframes
    // CRITICAL FIX: Enable all external data features by default for better confidence calculation
    // These features provide 30 points in confidence scoring (external data category)
    // Disabling them causes external score to be 0-5/30, reducing max confidence to ~76%
    // Enable all by default to maximize confidence scoring accuracy
    // Block explorer APIs disabled: always skip external blockchain explorer calls
    // const USE_BLOCKCHAIN_DATA = false
    const USE_ENHANCED_METRICS = true // Default: true
    const USE_ORDER_BOOK_DEPTH = true // Default: true
    const USE_VOLUME_PROFILE = true // Default: true
    const USE_COMPOSITE_VOLUME_PROFILE = true // Default: true
    const USE_MARKET_STRUCTURE = true // Default: true
    const USE_COMPREHENSIVE_VOLUME_ANALYSIS = true // Default: true
    const USE_FUTURES_DATA = true // Default: true
    const USE_BTC_CORRELATION = true // Default: true
    const USE_WHALE_DETECTION = true // Default: true
    
    // Helper function to process a single asset
    const processAsset = async (asset: string): Promise<any> => {
      try {
        // OPTIMIZATION FINAL: Cache Date.now() once per asset to avoid repeated calls
        const assetTimestamp = Date.now()
        
        const universeIndex = universe.findIndex((item: any) => {
          if (typeof item === 'string') return item === asset
          return item.name === asset || item.symbol === asset
        })
        
        // CRITICAL FIX: Skip delisted assets (they exist in universe but can't be traded)
        if (universeIndex >= 0) {
          const universeItem = universe[universeIndex]
          if (typeof universeItem === 'object' && universeItem.isDelisted === true) {
            // OPTIMIZATION: Removed error logging - only show successful fetches
            return null
          }
        }
        
        if (universeIndex >= 0 && universeIndex < assetCtxs.length) {
        const assetCtx = assetCtxs[universeIndex]
        // CRITICAL: Current price MUST come from Hyperliquid (markPx), NOT from Binance historical data
        // Binance historical data is ONLY for indicators calculation, NOT for current price
        // Store original price string from Hyperliquid to preserve precision
        const priceString = assetCtx.markPx || '0'
        const price = parseFloat(priceString) // Current price from Hyperliquid real-time API
        const volume = parseFloat(assetCtx.dayNtlVlm || '0')
        
        // Get max leverage from universe or marginTables
        let maxLeverage = 10
        if (universeIndex < universe.length) {
          const universeItem = universe[universeIndex]
          if (universeItem && typeof universeItem === 'object') {
            maxLeverage = (universeItem as any).maxLeverage || (universeItem as any).maxLeverageFromMargin || ((universeItem as any).config?.maxLeverage) || 10
          }
        }
        if (marginTables && marginTables.length > universeIndex) {
          const marginTable = marginTables[universeIndex]
          if (marginTable && typeof marginTable === 'object') {
            maxLeverage = (marginTable as any).maxLeverage || (marginTable as any).maxLv || maxLeverage
          }
        }
        
        // OPTIMIZATION: Removed per-asset logging for speed (only log on success/error)
        let historicalData: any[] = []
        let indicators: any = null
        let multiTimeframeData: Record<string, any[]> = {}
        let multiTimeframeIndicators: Record<string, any> = {}
        let trendAlignment: any = null
        
        try {
          // OPTIMIZATION FINAL: Use cached env vars instead of repeated process.env checks
          // OPTIMIZATION: Fetch primary and multi-timeframe data in parallel (if enabled)
          // Multi-timeframe doesn't depend on primary data, so they can be fetched simultaneously
          const [primaryData, mtfData] = await Promise.all([
            getHistoricalData(asset, PRIMARY_INTERVAL, CANDLES_COUNT).catch(_err => {
              // OPTIMIZATION: Removed error logging - only show successful fetches
            return []
            }),
            MULTI_TIMEFRAME.length > 0 
              ? getMultiTimeframeData(asset, MULTI_TIMEFRAME).catch(_err => {
                  // OPTIMIZATION: Removed error logging - only show successful fetches
              return {}
            })
              : Promise.resolve({} as Record<string, any[]>)
          ])
          
          historicalData = primaryData
          
          // OPTIMIZATION FINAL: Cache Object.keys(mtfData) check to avoid repeated computation
          const mtfDataKeys = Object.keys(mtfData)
          const hasMtfData = mtfDataKeys.length > 0
          
          // Calculate multi-timeframe indicators (reduced logging for speed)
          if (hasMtfData) {
            multiTimeframeData = mtfData
            multiTimeframeIndicators = calculateMultiTimeframeIndicators(mtfData, price)
            trendAlignment = checkTrendAlignment(multiTimeframeIndicators)
          }
          
          // Calculate indicators (skip retry for speed)
          if (historicalData.length >= 14) {
            indicators = calculateTechnicalIndicators(historicalData, price)
          }
          
          // OPTIMIZATION: formatPrice already imported statically at top of file
          // Log only on success (reduced logging for speed, using original Hyperliquid price format)
          if (indicators && historicalData.length >= 14 && (indicators.rsi14 || indicators.ema20 || indicators.macd || indicators.bollingerBands)) {
            // Use original price string from Hyperliquid for display (preserves format without trailing zeros)
            const priceFormatted = formatPrice(price, asset, priceString)
            log(`   ✅ ${asset}: $${priceFormatted} | ${historicalData.length} candles | RSI(14): ${indicators.rsi14?.toFixed(2) || 'N/A'} | EMA(20): $${indicators.ema20?.toFixed(2) || 'N/A'} | MACD: ${indicators.macd ? indicators.macd.histogram.toFixed(4) : 'N/A'}`, 'green')
          }
        } catch (error: any) {
          // OPTIMIZATION: Removed error logging - only show successful fetches
        }
        
        // Extract Hyperliquid native data fields
        const fundingRate = parseFloat(assetCtx.funding || '0')
        const openInterest = parseFloat(assetCtx.openInterest || '0')
        const premium = parseFloat(assetCtx.premium || '0')
        const oraclePx = parseFloat(assetCtx.oraclePx || '0')
        const midPx = parseFloat(assetCtx.midPx || '0')
        const impactPxs = assetCtx.impactPxs || null
        const prevDayPx = parseFloat(assetCtx.prevDayPx || '0')
        const dayBaseVlm = parseFloat(assetCtx.dayBaseVlm || '0')
        
        // Calculate funding rate and OI trends
        let fundingRateTrend = 'stable'
        let oiTrend = 'stable'
        
        // OPTIMIZATION FINAL: Reuse cached assetTimestamp instead of repeated Date.now() calls
        const previousFundingRate = fundingRateCache.get(asset)
        if (previousFundingRate && previousFundingRate.timestamp && (assetTimestamp - previousFundingRate.timestamp) < FUNDING_OI_CACHE_TTL) {
          const prevValue = previousFundingRate.value
          const currentValue = fundingRate
          
          if (Math.abs(prevValue) > 0.0001) {
            const changePercent = Math.abs((currentValue - prevValue) / Math.abs(prevValue))
            if (changePercent > 0.05) {
              if (currentValue > prevValue * 1.05) {
                fundingRateTrend = 'increasing'
              } else if (currentValue < prevValue * 0.95) {
                fundingRateTrend = 'decreasing'
              }
            } else if (changePercent > 0.02) {
              if (currentValue > prevValue * 1.02) {
                fundingRateTrend = 'increasing'
              } else if (currentValue < prevValue * 0.98) {
                fundingRateTrend = 'decreasing'
              }
            }
          } else if (Math.abs(currentValue) > 0.0001) {
            fundingRateTrend = currentValue > 0 ? 'increasing' : 'decreasing'
          }
        }
        // OPTIMIZATION: Removed first-time funding rate logging for speed
        
        // OPTIMIZATION FINAL: Reuse cached assetTimestamp
        fundingRateCache.set(asset, {
          value: fundingRate,
          timestamp: assetTimestamp
        })
        
        const previousOI = openInterestCache.get(asset)
        if (previousOI && previousOI.timestamp && (assetTimestamp - previousOI.timestamp) < FUNDING_OI_CACHE_TTL) {
          const prevValue = previousOI.value
          const currentValue = openInterest
          
          if (prevValue > 0) {
            const changePercent = Math.abs((currentValue - prevValue) / prevValue)
            if (changePercent > 0.05) {
              if (currentValue > prevValue * 1.05) {
                oiTrend = 'increasing'
              } else if (currentValue < prevValue * 0.95) {
                oiTrend = 'decreasing'
              }
            } else if (changePercent > 0.02) {
              if (currentValue > prevValue * 1.02) {
                oiTrend = 'increasing'
              } else if (currentValue < prevValue * 0.98) {
                oiTrend = 'decreasing'
              }
            }
          } else if (currentValue > 0) {
            oiTrend = 'increasing'
          }
        }
        // Removed first-time and trend logging for speed
        
        // OPTIMIZATION FINAL: Reuse cached assetTimestamp
        openInterestCache.set(asset, {
          value: openInterest,
          timestamp: assetTimestamp
        })
        
        // Skip blockchain explorer data entirely (disabled by design)
        const blockchainData: any = {
            largeTransactions: [],
            estimatedExchangeFlow: 0,
            whaleActivityScore: 0,
            timestamp: assetTimestamp
        }
        
        // OPTIMIZATION FINAL: Use cached USE_ENHANCED_METRICS instead of repeated process.env check
        // CRITICAL FIX: Enhanced metrics enabled by default for better confidence calculation
        // Can disable via USE_ENHANCED_METRICS=false if needed (for speed)
        const enhancedMetrics = USE_ENHANCED_METRICS && indicators 
          ? calculateEnhancedMetrics(historicalData, indicators, null) 
          : null
        
        if (indicators && enhancedMetrics) {
          indicators.volumePriceDivergence = enhancedMetrics.volumePriceDivergence
          indicators.volumeTrend = enhancedMetrics.volumeTrend
          indicators.volumeChangePercent = enhancedMetrics.volumeChangePercent
        } else if (indicators) {
          // Set default values if enhanced metrics disabled
          indicators.volumePriceDivergence = 0
          indicators.volumeTrend = 'stable'
          indicators.volumeChangePercent = 0
        }
        
        // OPTIMIZATION FINAL: Use cached USE_ORDER_BOOK_DEPTH instead of repeated process.env check
        const orderBookDepth = USE_ORDER_BOOK_DEPTH && impactPxs && price > 0 
          ? calculateOrderBookDepth(impactPxs, price, assetCtx)
          : null
        
        // OPTIMIZATION FINAL: Use cached USE_VOLUME_PROFILE instead of repeated process.env check
        // CRITICAL FIX: Session volume profile enabled by default for better confidence calculation
        // Can disable via USE_VOLUME_PROFILE=false if needed (for speed)
        const sessionVolumeProfile = USE_VOLUME_PROFILE && historicalData && historicalData.length >= 20
          ? calculateSessionVolumeProfile(historicalData, price, 'daily')
          : null
        
        // OPTIMIZATION FINAL: Use cached USE_COMPOSITE_VOLUME_PROFILE instead of repeated process.env check
        // CRITICAL FIX: Composite volume profile enabled by default (requires 50+ candles, now 80)
        // Can disable via USE_COMPOSITE_VOLUME_PROFILE=false if needed (for speed)
        const compositeVolumeProfile = USE_COMPOSITE_VOLUME_PROFILE && historicalData && historicalData.length >= 50
          ? calculateCompositeVolumeProfile(historicalData, price, 'weekly')
          : null
        
        // OPTIMIZATION FINAL: Use cached USE_MARKET_STRUCTURE instead of repeated process.env check
        // CRITICAL FIX: Change of Character and CVD enabled by default for better confidence calculation
        // Can disable via USE_MARKET_STRUCTURE=false if needed (for speed)
        const changeOfCharacter = USE_MARKET_STRUCTURE && historicalData && historicalData.length >= 20
          ? detectChangeOfCharacter(historicalData, price)
          : null
        
        const cumulativeVolumeDelta = USE_MARKET_STRUCTURE && historicalData && historicalData.length >= 20
          ? calculateCumulativeVolumeDelta(historicalData, price)
          : null
        
        // OPTIMIZATION FINAL: Use cached USE_COMPREHENSIVE_VOLUME_ANALYSIS instead of repeated process.env check
        // CRITICAL FIX: Comprehensive Volume Analysis enabled by default for better confidence calculation
        // This is computationally expensive but provides better scoring accuracy
        const comprehensiveVolumeAnalysis = USE_COMPREHENSIVE_VOLUME_ANALYSIS && historicalData && historicalData.length >= 20
          ? performComprehensiveVolumeAnalysis(
              historicalData,
              price,
              undefined, // breakoutLevel - can be calculated from support/resistance
              undefined, // breakoutDirection
              sessionVolumeProfile || compositeVolumeProfile || undefined,
              cumulativeVolumeDelta || undefined,
              openInterest ? [{ price, openInterest }] : undefined
            )
          : null
        
        // Fetch futures data (Binance futures: funding, OI, long/short ratio, liquidations)
        let futuresData: any = null
        let btcCorrelationData: any = null
        let whaleActivityData: any = null

        if (USE_FUTURES_DATA && price > 0) {
          try {
            const futures = await fetchFuturesData(asset, price).catch(() => null)
            if (futures) {
              futuresData = futures
            }
          } catch (error: any) {
            // Silent fail - futures data is optional
          }
        }

        // Calculate BTC correlation
        if (USE_BTC_CORRELATION && historicalData && historicalData.length >= 24) {
          try {
            const correlation = await calculateBTCCorrelation(asset, historicalData).catch(() => null)
            if (correlation) {
              btcCorrelationData = correlation
            }
          } catch (error: any) {
            // Silent fail - BTC correlation is optional
          }
        }

        // Analyze whale activity
        if (USE_WHALE_DETECTION && historicalData && historicalData.length >= 20) {
          try {
            const whale = analyzeWhaleActivity(historicalData)
            if (whale) {
              whaleActivityData = whale
            }
          } catch (error: any) {
            // Silent fail - whale detection is optional
          }
        }
        
        // OPTIMIZATION FINAL: Reuse cached assetTimestamp for all timestamp fields
        const externalData = {
          hyperliquid: {
            fundingRate: fundingRate,
            openInterest: openInterest,
            fundingRateTrend: fundingRateTrend,
            oiTrend: oiTrend,
            premium: premium,
            oraclePx: oraclePx,
            midPx: midPx,
            impactPxs: impactPxs,
            prevDayPx: prevDayPx,
            dayBaseVlm: dayBaseVlm,
            maxLeverage: maxLeverage,
            timestamp: assetTimestamp
          },
          blockchain: blockchainData || {
            largeTransactions: [],
            estimatedExchangeFlow: 0,
            whaleActivityScore: 0,
            timestamp: assetTimestamp
          },
          enhanced: enhancedMetrics || {
            volumeTrend: 'stable',
            volatilityPattern: 'normal',
            volumePriceDivergence: 0,
            timestamp: assetTimestamp
          },
          orderBook: orderBookDepth,
          volumeProfile: {
            session: sessionVolumeProfile,
            composite: compositeVolumeProfile
          },
          marketStructure: {
            coc: changeOfCharacter
          },
          volumeDelta: cumulativeVolumeDelta,
          comprehensiveVolumeAnalysis: comprehensiveVolumeAnalysis,
          futures: futuresData ? {
            fundingRate: futuresData.fundingRate,
            openInterest: futuresData.openInterest,
            longShortRatio: futuresData.longShortRatio,
            liquidation: futuresData.liquidation,
            premiumIndex: futuresData.premiumIndex,
            btcCorrelation: btcCorrelationData,
            whaleActivity: whaleActivityData
          } : undefined
        }
        
        // OPTIMIZATION FINAL: Reuse cached assetTimestamp for result timestamp
        // CRITICAL: Both price and markPx come from Hyperliquid real-time API (NOT from Binance)
        // Binance historical data is stored separately and used ONLY for indicators
        const result = {
          asset: asset,
          data: {
            symbol: asset,
            price: price, // Current price from Hyperliquid (same as markPx)
            priceString: priceString, // Store original price string from Hyperliquid
            volume24h: volume,
            markPx: price, // Current mark price from Hyperliquid (real-time, primary source)
            markPxString: priceString, // Store original markPx string from Hyperliquid
            maxLeverage: maxLeverage,
            timestamp: assetTimestamp,
            historicalData: historicalData,
            indicators: indicators,
            multiTimeframeData: multiTimeframeData,
            multiTimeframeIndicators: multiTimeframeIndicators,
            trendAlignment: trendAlignment,
            externalData: externalData,
            // Direct access to openInterest for redundancy
            openInterest: openInterest,
            fundingRate: fundingRate,
          }
        }
        
          return result
        } else {
          log(`   ⚠️  ${asset}: Not found in universe (index: ${universeIndex})`, 'yellow')
          return null
        }
      } catch (error: any) {
        // OPTIMIZATION: Removed error logging - only show successful fetches
        return null
      }
    }
    
    // OPTIMIZATION: Process all batches in parallel instead of sequential
    const results: any[] = []
    
    // Split assets into batches
    const batches: string[][] = []
    for (let i = 0; i < assets.length; i += BATCH_SIZE) {
      batches.push(assets.slice(i, i + BATCH_SIZE))
    }
    
    const totalBatches = batches.length
    if (totalBatches > 0) {
      log(`   📊 Processing ${totalBatches} batch(es) in parallel (${assets.length} total assets)...`, 'cyan')
      
      // Process all batches in parallel (not sequential)
      const allBatchPromises = batches.map((batch, batchIndex) => {
        const batchNumber = batchIndex + 1
        log(`   📊 Batch ${batchNumber}/${totalBatches}: ${batch.length} assets`, 'cyan')
      
        // Process each batch in parallel
        return Promise.allSettled(batch.map(asset => processAsset(asset)))
      })
      
      // Wait for all batches to complete in parallel
      const allBatchResults = await Promise.allSettled(allBatchPromises)
      
      // Collect results from all batches - only process successful results (no error logging)
      allBatchResults.forEach((batchResult) => {
        if (batchResult.status === 'fulfilled' && Array.isArray(batchResult.value)) {
          batchResult.value.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          results.push(result.value)
            }
            // OPTIMIZATION: Removed error logging for failed batch processing - only show successful fetches
          })
        }
        // OPTIMIZATION: Removed error logging for failed batches - only show successful fetches
      })
    }
    
    // Store results in marketData map
    for (const result of results) {
      if (result && result.data) {
        marketData.set(result.asset, result.data)
      }
    }
    
    log(`   ✅ Fetched market data for ${results.length} assets`, 'green')
    
    return { marketDataMap: marketData, allowedAssets: assets }
  } catch (error: any) {
    log(`   ❌ Error: ${error.message}`, 'red')
    throw new Error(`Failed to fetch market data: ${error.message}`)
  }
}

