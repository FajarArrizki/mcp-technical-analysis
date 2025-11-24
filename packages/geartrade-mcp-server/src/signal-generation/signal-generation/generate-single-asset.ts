/**
 * Generate Signal for Single Asset
 * Main function to generate signal for one asset: build prompt → call AI → parse → post-process
 * 
 * PERFORMANCE: Zero delay - Executes immediately when called in parallel
 */

import { Signal } from '../types'
import { buildSystemPromptForAsset, buildUserPromptForAsset } from './prompt-builder'
import { callAIForAsset, parseAIResponse } from './ai-processor'
import { processSignal } from './signal-processor'
// import { TechnicalIndicators } from '../technical-indicators/aggregator'
import { countBullishBearishIndicators } from '../analysis/count-indicators'

/**
 * REMOVED: Pre-validation function
 * 
 * REASON: Redundant with confidence system
 * - All checks (RSI, MACD, volume, etc.) are already handled by confidence penalties
 * - Confidence system auto-rejects if conditions are severe enough
 * - Pre-validation was duplicating logic and blocking signals unnecessarily
 * - Let confidence system handle all filtering for consistency
 * 
 * Benefits:
 * - Simpler code (removed ~70 lines of duplicate logic)
 * - More consistent filtering (single system, not multiple layers)
 * - Better signal quality (confidence system handles edge cases better)
 * - Fewer false rejections (confidence considers full context, not just single indicators)
 */

/**
 * Generate signal for a single asset
 * PERFORMANCE: No delays - executes immediately for parallel processing
 */
export async function generateSignalForSingleAsset(
  asset: string,
  marketData: Map<string, any> | Record<string, any>,
  accountState: any,
  positions: Map<string, any>,
  equalCapitalPerSignal: number,
  signalIndex: number,
  allowedAssets: string[],
  marketDataIsMap?: boolean, // OPTIMIZATION: Pre-computed Map check to avoid repeated instanceof
  assetRank: number | null = null, // PHASE 1: Asset rank for confidence calculation
  qualityScore: number | null = null // PHASE 1: Quality score for confidence calculation
): Promise<Signal | null> {
  const assetStartTime = Date.now()
  
  try {
    // OPTIMIZATION: Use pre-computed Map check or compute once
    const isMap = marketDataIsMap ?? (marketData instanceof Map)
    
    // Get asset data
    const assetData = isMap ? marketData.get(asset) : (marketData as Record<string, any>)[asset]
    if (!assetData) {
      console.warn(`⚠️  No market data available for ${asset}`)
      return null
    }

    // OPTIMIZATION: Cache nested property access
    const indicators = assetData?.indicators
    const assetDataData = assetData?.data
    // const externalData = assetData?.externalData
    
    // Check if asset has valid data
    const hasPrice = indicators?.price || assetData?.price || assetDataData?.price || assetDataData?.markPx
    if (!hasPrice) {
      console.warn(`⚠️  No price data available for ${asset}`)
      return null
    }

    // REMOVED: Pre-validation check
    // Let confidence system handle all filtering - it's more comprehensive and consistent
    // Confidence penalties and auto-rejection will filter out bad signals

    // Build prompts for this asset (executes in parallel per asset)
    const systemPrompt = buildSystemPromptForAsset(asset, marketData, accountState, positions, allowedAssets)
    const userPrompt = buildUserPromptForAsset(asset, marketData, accountState, positions)

    // PERFORMANCE: Call AI API immediately (zero delay between parallel calls)
    const aiCallStartTime = Date.now()
    console.log(`\x1b[36m🤖 ${asset}: Calling AI API for signal generation...\x1b[0m`)
    const response = await callAIForAsset(asset, systemPrompt, userPrompt)
    const aiCallDuration = Date.now() - aiCallStartTime
    
    // Log AI call completion (always log for debugging)
    console.log(`\x1b[36m⚡ ${asset}: AI API call completed in ${(aiCallDuration / 1000).toFixed(1)}s (${aiCallDuration}ms)\x1b[0m`)

    // Parse response to get signal
    let signal: Signal
    try {
      console.log(`\x1b[36m📝 ${asset}: Parsing AI response...\x1b[0m`)
      signal = parseAIResponse(response, asset)
      console.log(`\x1b[36m✓ ${asset}: AI response parsed - Signal: ${(signal.signal || 'unknown').toUpperCase()}, Confidence: ${((signal.confidence || 0) * 100).toFixed(1)}%\x1b[0m`)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      // OPTIMIZATION FINAL: Only log parse errors if verbose logging enabled (reduce error spam)
      if (process.env.VERBOSE_LOGGING === 'true') {
        console.error(`❌ Failed to parse AI response for ${asset}:`, errorMsg)
      }
      return null
    }

    // CRITICAL FIX: Set entry_price and entry_price_string from Hyperliquid for accurate price display
    // This ensures price in signal generation matches Hyperliquid UI exactly
    if (signal.signal === 'buy_to_enter' || signal.signal === 'sell_to_enter' || signal.signal === 'add') {
      // Get price and price string from Hyperliquid (preserves exact format without trailing zeros)
      const currentPrice = indicators?.price || assetData?.price || assetDataData?.price || assetDataData?.markPx || 0
      const priceString = assetDataData?.priceString || assetDataData?.markPxString || assetData?.priceString || assetData?.markPxString || null
      
      // If entry_price is not set or is 0, use current price from Hyperliquid
      if (!signal.entry_price || signal.entry_price === 0) {
        signal.entry_price = currentPrice
      }
      
      // Always set entry_price_string from Hyperliquid priceString for accurate display
      if (priceString) {
        signal.entry_price_string = priceString
      } else if (currentPrice > 0) {
        // Fallback: use currentPrice as string if priceString not available
        signal.entry_price_string = currentPrice.toString()
      }
    }

    // CRITICAL FIX: Auto-convert HOLD to BUY/SELL if no existing position
    // HOLD signals should only be used when there's an existing position
    // For assets without position, always generate directional signal (BUY or SELL)
    if (signal.signal === 'hold' && indicators) {
      const symbol = signal.coin || asset
      const hasPosition = positions.has(symbol)
      
      if (!hasPosition) {
        console.warn(`\x1b[33m⚠️  ${asset}: AI generated HOLD signal without existing position - auto-converting to directional signal\x1b[0m`)
        
        // Determine direction based on indicators
        const price = indicators.price || 0
        const indicatorCount = countBullishBearishIndicators(indicators, price)
        const bullishCount = indicatorCount.bullishCount
        const bearishCount = indicatorCount.bearishCount
        const summaryDir = indicatorCount.summaryDir
        
        // Choose direction based on indicator summary
        let newDirection: 'buy_to_enter' | 'sell_to_enter' | null = null
        
        if (summaryDir === 'BUY' || bullishCount > bearishCount) {
          newDirection = 'buy_to_enter'
        } else if (summaryDir === 'SELL' || bearishCount > bullishCount) {
          newDirection = 'sell_to_enter'
        } else {
          // MIXED - use additional factors to determine direction
          const ema20 = indicators.ema20 || 0
          const ema50 = indicators.ema50 || 0
          const vwap = indicators.vwap || 0
          
          // EMA alignment
          if (price > ema20 && ema20 > ema50 && price > 0) {
            newDirection = 'buy_to_enter'
          } else if (price < ema20 && ema20 < ema50 && price > 0) {
            newDirection = 'sell_to_enter'
          }
          // VWAP position
          else if (price > vwap && vwap > 0) {
            newDirection = 'buy_to_enter'
          } else if (price < vwap && vwap > 0) {
            newDirection = 'sell_to_enter'
          }
          // Default to BUY if still undecided (slightly bullish bias for futures)
          else {
            newDirection = 'buy_to_enter'
          }
        }
        
        if (newDirection) {
          // const originalSignal = signal.signal
          signal.signal = newDirection
          console.log(`\x1b[32m✅ ${asset}: Auto-converted HOLD → ${newDirection.toUpperCase()} (BULL: ${bullishCount} | BEAR: ${bearishCount} | Summary: ${summaryDir})\x1b[0m`)
        } else {
          console.error(`\x1b[31m❌ ${asset}: Failed to auto-convert HOLD - no clear direction indicators\x1b[0m`)
          return null
        }
      } else {
        // HOLD signal with existing position is valid - log if verbose
        if (process.env.VERBOSE_LOGGING === 'true') {
          console.log(`\x1b[36mℹ️  ${asset}: HOLD signal is valid (existing position exists)\x1b[0m`)
        }
      }
    }

    // CRITICAL FIX: Validate signal direction matches indicator summary
    // Use shared utility for 100% consistent indicator counting with prompt-builder
    if (indicators && signal && (signal.signal === 'buy_to_enter' || signal.signal === 'sell_to_enter')) {
      const price = indicators.price || 0
      const indicatorCount = countBullishBearishIndicators(indicators, price)
      const bullishCount = indicatorCount.bullishCount
      const bearishCount = indicatorCount.bearishCount
      const summaryDir = indicatorCount.summaryDir
      
      const expectedDirection = bullishCount > bearishCount ? 'buy_to_enter' : 
                                bearishCount > bullishCount ? 'sell_to_enter' : 
                                null // MIXED - no clear direction
      
      // Validate signal direction matches indicator summary
      if (expectedDirection && signal.signal !== expectedDirection) {
        const indicatorDifference = Math.abs(bullishCount - bearishCount)
        const contradictionSeverity = indicatorDifference < 2 ? 'MODERATE' : 'SEVERE'
        const warningMsg = `⚠️  ${asset}: SIGNAL DIRECTION CONTRADICTION (${contradictionSeverity}) - ` +
                          `AI generated ${signal.signal.toUpperCase()} but indicators suggest ${expectedDirection.toUpperCase()} ` +
                          `(BULL: ${bullishCount} | BEAR: ${bearishCount} | Summary: ${summaryDir})`
        
        console.warn(warningMsg)
        
        // CRITICAL FIX: Auto-correct severe contradictions (difference >= 3 indicators)
        // This ensures signal direction ALWAYS matches indicator summary
        if (contradictionSeverity === 'SEVERE' && indicatorDifference >= 3) {
          console.error(`❌ ${asset}: CRITICAL SIGNAL DIRECTION REVERSAL - ` +
                       `Indicators strongly suggest ${expectedDirection.toUpperCase()} ` +
                       `(BULL: ${bullishCount} | BEAR: ${bearishCount} | Summary: ${summaryDir}) ` +
                       `but AI generated ${signal.signal.toUpperCase()}`)
          
          // Auto-correct severe contradictions to ensure signal matches indicators
          const originalSignal = signal.signal
          signal.signal = expectedDirection as any
          console.log(`✅ ${asset}: Auto-corrected signal direction from ${originalSignal.toUpperCase()} to ${expectedDirection.toUpperCase()} ` +
                     `(BULL: ${bullishCount} | BEAR: ${bearishCount} | Summary: ${summaryDir})`)
          
          // Final validation: Verify auto-correction succeeded
          if (signal.signal !== expectedDirection) {
            console.error(`❌ ${asset}: AUTO-CORRECTION FAILED - Signal still incorrect after correction attempt`)
            // Force correction if it somehow failed
            signal.signal = expectedDirection as any
          }
        }
      } else if (expectedDirection && signal.signal === expectedDirection) {
        // Signal direction matches - log confirmation if verbose
        if (process.env.VERBOSE_LOGGING === 'true') {
          console.log(`✅ ${asset}: Signal direction validated - ${signal.signal.toUpperCase()} matches indicator summary (BULL: ${bullishCount} | BEAR: ${bearishCount} | Summary: ${summaryDir})`)
        }
      } else if (!expectedDirection) {
        // MIXED - no clear direction, but signal was generated
        if (process.env.VERBOSE_LOGGING === 'true') {
          console.log(`⚠️  ${asset}: Signal generated but indicators are MIXED (BULL: ${bullishCount} | BEAR: ${bearishCount}) - no clear direction`)
        }
      }
    }

    // Post-process signal (invalidation, position sizing, TP/SL, confidence, etc.)
    console.log(`\x1b[36m⚙️  ${asset}: Post-processing signal (validation, confidence calculation, position sizing)...\x1b[0m`)
    const processedSignal = await processSignal(
      signal,
      marketData,
      accountState,
      equalCapitalPerSignal,
      signalIndex,
      assetRank, // PHASE 1: Pass asset rank for confidence calculation
      qualityScore // PHASE 1: Pass quality score for confidence calculation
    )

    // Log final result (always log for debugging)
    const totalDuration = Date.now() - assetStartTime
    const finalSignal = processedSignal?.signal || 'unknown'
    const finalConfidence = (processedSignal?.confidence || 0) * 100
    const confidenceColor = finalConfidence >= 60 ? '\x1b[32m' : finalConfidence >= 50 ? '\x1b[33m' : '\x1b[31m'
    console.log(`\x1b[32m✅ ${asset}: Signal generation completed in ${(totalDuration / 1000).toFixed(1)}s - ${finalSignal.toUpperCase()} signal with ${confidenceColor}${finalConfidence.toFixed(1)}%\x1b[0m confidence`)

    return processedSignal
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    const errorDuration = Date.now() - assetStartTime
    // OPTIMIZATION FINAL: Only log errors if verbose logging enabled (reduce error spam for network issues)
    if (process.env.VERBOSE_LOGGING === 'true') {
      console.error(`❌ Failed to generate signal for ${asset} (${errorDuration}ms):`, errorMsg)
    }
    return null
  }
}

