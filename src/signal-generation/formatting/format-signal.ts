/**
 * Signal Formatting Function
 * Formats and displays signal information in a table format
 */

import { log } from '../utils/logger'
import { formatPrice, formatLargeNumber } from './price'
import { determineTradingStyle } from '../utils/trading-style'
import { calculateMAE } from '../risk-management/mae'
import { calculateDynamicLeverage } from '../risk-management/leverage'
import { calculateDynamicMarginPercentage } from '../risk-management/margin'
import { getRealTimePrice } from '../data-fetchers/hyperliquid'
import { getTradingConfig, getThresholds } from '../config'
import { Signal } from '../types'

export async function formatSignal(
  signal: Signal & {
    quality?: 'high' | 'medium' | 'low' | 'very_low'
    quality_label?: string
    invalidation_condition?: string
    _invalidation_auto_generated?: boolean
    auto_tradeable?: boolean
    executionLevel?: string
    autoTradeReason?: string
    rejectReason?: string
    positionSizeMultiplier?: number
    position_size_note?: string
    warnings?: string[]
    anti_knife_warning?: string
    ev_warning?: boolean
    ev_warning_message?: string
    oversold_warning?: string
    confidence_breakdown?: string[]
    confidence_score?: number
    confidence_max_score?: number
    risk_usd?: number
    quantity?: number
  },
  index: number,
  marketData: Map<string, any> | Record<string, any>,
  activePositions: Map<string, any> | null,
  signalHistory: Map<string, any> = new Map(),
  accountState: any = null,
  metadata?: any // OPTIMIZATION: Accept metadata to avoid duplicate API call in getRealTimePrice
): Promise<void> {
    // OPTIMIZATION FINAL: Cache getTradingConfig() and getThresholds() at function start (called in loop per signal)
    const tradingConfig = getTradingConfig()
    const thresholds = getThresholds()
    const tradingMode = tradingConfig != null && tradingConfig.mode != null ? tradingConfig.mode : 'MANUAL'
    const autoTradeEV = thresholds != null && thresholds.expectedValue != null && thresholds.expectedValue.autoTrade != null 
      ? thresholds.expectedValue.autoTrade 
      : 0.8
    const displayEV = thresholds != null && thresholds.expectedValue != null && thresholds.expectedValue.display != null
      ? thresholds.expectedValue.display
      : 0.5
    const rejectEV = thresholds != null && thresholds.expectedValue != null && thresholds.expectedValue.reject != null
      ? thresholds.expectedValue.reject
      : 0.0
    
    // Determine signal type and color
    const signalType = signal.signal.toUpperCase()
    let signalColor = 'yellow' // Default: HOLD and other signals
    if (signalType === 'BUY_TO_ENTER' || signalType === 'ADD') signalColor = 'green' // BUY: hijau
    else if (signalType === 'SELL_TO_ENTER') signalColor = 'red' // SELL: merah
    else if (signalType === 'HOLD') signalColor = 'yellow' // HOLD: tetap kuning
    else if (signalType === 'CLOSE' || signalType === 'CLOSE_ALL') signalColor = 'magenta'
    else if (signalType === 'REDUCE') signalColor = 'yellow'

    // Get entry price - prioritize from signal, then from history, then from current price
    const isOpeningSignal = signal.signal === 'buy_to_enter' || signal.signal === 'sell_to_enter' || signal.signal === 'add'
    let entryPrice = signal.entry_price

    // If no entry price in signal, check history (for HOLD/CLOSE/REDUCE signals)
    if ((!entryPrice || entryPrice === 0) && signalHistory) {
      const history = signalHistory.get(signal.coin)
      if (history && history.entryPrice > 0) {
        entryPrice = history.entryPrice
      }
    }

    // Fallback to current price if still no entry price
    if (!entryPrice || entryPrice === 0) {
      const assetData = marketData instanceof Map 
        ? marketData.get(signal.coin)
        : marketData[signal.coin]
      if (assetData && assetData.price) {
        entryPrice = assetData.price
      }
    }

    // Get current position
    const position = activePositions?.get(signal.coin)

    // Get original price string from Hyperliquid (if available)
    // CRITICAL FIX: Always prioritize data.priceString/data.markPxString (where Hyperliquid stores the original string)
    const assetData = marketData instanceof Map 
      ? marketData.get(signal.coin)
      : marketData[signal.coin]
    const originalPriceString = assetData?.data?.priceString || assetData?.data?.markPxString || assetData?.priceString || assetData?.markPxString || null
    const originalEntryPriceString = signal.entry_price_string || null

    // Build table with box-drawing characters (warnings already displayed above, so start directly with table)
    const tableWidth = 72
    const labelWidth = 16
    const valueWidth = tableWidth - labelWidth - 4 // Account for borders: │ label│ value │

    // Helper function to pad string
    function padText(text: string | number | null | undefined, width: number): string {
      const str = String(text || '')
      if (str.length > width) {
        return str.substring(0, width - 3) + '...'
      }
      return str.padEnd(width)
    }

    // Helper function to create table row
    function tableRow(label: string, value: string | number | null | undefined, color: string = 'cyan'): void {
      log(`│ ${padText(label, labelWidth)}│ ${padText(value, valueWidth)} │`, color)
    }

    // Helper function to create full-width text row (for justification, invalidation, etc.)
    function fullWidthRow(text: string | null | undefined, color: string = 'cyan'): void {
      const cleanText = String(text || '').trim()
      if (!cleanText) return

      // Calculate available width (tableWidth - 4 for borders and padding)
      const availableWidth = tableWidth - 4
      const words = cleanText.split(' ')
      let currentLine = ''

      for (const word of words) {
        const testLine = currentLine ? currentLine + ' ' + word : word
        if (testLine.length <= availableWidth) {
          currentLine = testLine
        } else {
          // Output current line if it has content
          if (currentLine) {
            log(`│ ${currentLine.padEnd(availableWidth)} │`, color)
          }
          // Start new line with current word
          if (word.length > availableWidth) {
            // Very long word - split it
            let remaining = word
            while (remaining.length > availableWidth) {
              log(`│ ${remaining.substring(0, availableWidth)} │`, color)
              remaining = remaining.substring(availableWidth)
            }
            currentLine = remaining
          } else {
            currentLine = word
          }
        }
      }
      // Output remaining line
      if (currentLine) {
        log(`│ ${currentLine.padEnd(availableWidth)} │`, color)
      }
    }

    // Determine quality label and color
    const qualityLabel = signal.quality_label || (signal.quality === 'high' ? 'HIGH CONFIDENCE - AUTO-TRADEABLE' : signal.quality === 'medium' ? 'MANUAL REVIEW RECOMMENDED' : signal.quality === 'low' ? 'LOW CONFIDENCE - HIGH RISK' : signal.quality === 'very_low' ? 'VERY LOW CONFIDENCE - EXTREME RISK' : '')
    const qualityColor = signal.quality === 'high' ? 'green' : signal.quality === 'medium' ? 'yellow' : signal.quality === 'low' ? 'red' : signal.quality === 'very_low' ? 'red' : 'cyan'

    // Draw table border with quality label
    if (signal.quality === 'high') {
      log('┌' + '─'.repeat(tableWidth - 2) + '┐', qualityColor)
      log(`│ ${qualityLabel.padEnd(tableWidth - 4)} │`, qualityColor)
      log('├' + '─'.repeat(tableWidth - 2) + '┤', qualityColor)
    } else if (signal.quality === 'medium' || signal.quality === 'low' || signal.quality === 'very_low') {
      log('┌' + '─'.repeat(tableWidth - 2) + '┐', qualityColor)
      log(`│ ${qualityLabel.padEnd(tableWidth - 4)} │`, qualityColor)
      log('├' + '─'.repeat(tableWidth - 2) + '┤', qualityColor)
    } else {
      log('┌' + '─'.repeat(tableWidth - 2) + '┐', 'cyan')
    }
    const signalHeader = `Signal #${index + 1}`
    log(`│ ${padText(signalHeader, tableWidth - 4)} │`, 'bright')
    log('├' + '─'.repeat(tableWidth - 2) + '┤', 'cyan')

    // Get asset data and technical indicators (assetData is already defined above at line 80)
    const indicators = assetData?.indicators || assetData?.data?.indicators || null
    const multiTimeframeIndicators = assetData?.data?.multiTimeframeIndicators || assetData?.multiTimeframeIndicators || null

    // Get externalData for use throughout the function (leverage calculation and display)
    const externalData = assetData?.data?.externalData || assetData?.externalData || null

    // OPTIMIZATION: Fetch real-time price with metadata to avoid duplicate API call
    let currentPrice = assetData?.price || position?.currentPrice || entryPrice || 0
    try {
      const realTimePrice = await getRealTimePrice(signal.coin, metadata) // Pass metadata to avoid duplicate API call
      if (realTimePrice && realTimePrice > 0) {
        currentPrice = realTimePrice
        // Update assetData price for consistency
        if (assetData) {
          assetData.price = realTimePrice
        }
      }
    } catch (error: unknown) {
      // If real-time fetch fails, use cached price
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.warn(`Failed to fetch real-time price for ${signal.coin}: ${errorMessage}`)
    }

    // Asset & Signal
    tableRow('Asset:', signal.coin, 'cyan')

    // Determine trading style (Long Term vs Short Term)
    const assetDataForStyle = marketData instanceof Map ? marketData.get(signal.coin) : marketData[signal.coin]
    const indicatorsForStyle = assetDataForStyle?.indicators || assetDataForStyle?.data?.indicators
    const trendAlignmentForStyle = assetDataForStyle?.data?.trendAlignment || assetDataForStyle?.trendAlignment
    const marketRegimeForStyle = indicatorsForStyle?.marketRegime
    const tradingStyle = determineTradingStyle(signal, indicatorsForStyle, trendAlignmentForStyle, marketRegimeForStyle)
    const signalWithStyle = `${signalType} (${tradingStyle})`
    tableRow('Signal:', signalWithStyle, signalColor)

    // Current Price (always show - real-time, using original Hyperliquid format)
    // CRITICAL FIX: Always use originalPriceString from Hyperliquid for accurate price display
    // Even if we fetch real-time price for calculations, we use originalPriceString for display
    // This ensures price matches Hyperliquid UI exactly (same as ranking table and signal generation)
    if (currentPrice > 0) {
      // Always use original price string from Hyperliquid (preserves exact format without trailing zeros)
      // originalPriceString is already set from assetData above (line 98)
      tableRow('Current Price:', formatPrice(currentPrice, signal.coin, originalPriceString), 'cyan')
    }

    // Technical Indicators Section
    if (indicators) {
      log('├' + '─'.repeat(tableWidth - 2) + '┤', 'cyan')
      log(`│ ${'Technical:'.padEnd(tableWidth - 4)} │`, 'bright')
      log('├' + '─'.repeat(tableWidth - 2) + '┤', 'cyan')

      // RSI - ALL timeframes (comprehensive display)
      if (indicators.rsi14 !== null && indicators.rsi14 !== undefined) {
        const rsiValue = indicators.rsi14.toFixed(2)
        const rsiStatus = indicators.rsi14 > 70 ? '(Overbought)' : indicators.rsi14 < 30 ? '(Oversold)' : '(Neutral)'
        tableRow('  RSI(14):', `${rsiValue} ${rsiStatus}`, 'cyan')
      }
      if (indicators.rsi7 !== null && indicators.rsi7 !== undefined) {
        const rsi7Value = indicators.rsi7.toFixed(2)
        const rsi7Status = indicators.rsi7 > 70 ? '(Overbought)' : indicators.rsi7 < 30 ? '(Oversold)' : '(Neutral)'
        tableRow('  RSI(7):', `${rsi7Value} ${rsi7Status}`, 'cyan')
      }

      // Multi-timeframe RSI (1H, 4H) - if available
      if (multiTimeframeIndicators) {
        if (multiTimeframeIndicators['1h'] && multiTimeframeIndicators['1h'].rsi14 !== null && multiTimeframeIndicators['1h'].rsi14 !== undefined) {
          const rsi1h = multiTimeframeIndicators['1h'].rsi14.toFixed(2)
          const rsi1hStatus = multiTimeframeIndicators['1h'].rsi14 > 70 ? '(Overbought)' : multiTimeframeIndicators['1h'].rsi14 < 30 ? '(Oversold)' : '(Neutral)'
          tableRow('  1H RSI:', `${rsi1h} ${rsi1hStatus}`, 'cyan')
        }
        if (multiTimeframeIndicators['4h'] && multiTimeframeIndicators['4h'].rsi14 !== null && multiTimeframeIndicators['4h'].rsi14 !== undefined) {
          const rsi4h = multiTimeframeIndicators['4h'].rsi14.toFixed(2)
          const rsi4hStatus = multiTimeframeIndicators['4h'].rsi14 > 70 ? '(Overbought)' : multiTimeframeIndicators['4h'].rsi14 < 30 ? '(Oversold)' : '(Neutral)'
          tableRow('  4H RSI:', `${rsi4h} ${rsi4hStatus}`, 'cyan')
        }
      }

      // EMA (using original Hyperliquid format - no trailing zeros)
      if (indicators.ema20 !== null && indicators.ema20 !== undefined) {
        tableRow('  EMA(20):', '$' + formatPrice(indicators.ema20, signal.coin), 'cyan')
      }
      if (indicators.ema50 !== null && indicators.ema50 !== undefined) {
        tableRow('  EMA(50):', '$' + formatPrice(indicators.ema50, signal.coin), 'cyan')
      }
      if (indicators.ema200 !== null && indicators.ema200 !== undefined) {
        tableRow('  EMA(200):', '$' + formatPrice(indicators.ema200, signal.coin), 'cyan')
      }

      // MACD
      if (indicators.macd && typeof indicators.macd === 'object') {
        const macd = indicators.macd
        if (macd.macd !== null && macd.macd !== undefined) {
          tableRow('  MACD:', macd.macd.toFixed(4), 'cyan')
        }
        if (macd.signal !== null && macd.signal !== undefined) {
          tableRow('  MACD Signal:', macd.signal.toFixed(4), 'cyan')
        }
        if (macd.histogram !== null && macd.histogram !== undefined) {
          const histColor = macd.histogram >= 0 ? 'green' : 'red'
          tableRow('  MACD Hist:', macd.histogram.toFixed(4), histColor)
        }
      }

      // Bollinger Bands
      if (indicators.bollingerBands && typeof indicators.bollingerBands === 'object') {
        const bb = indicators.bollingerBands
        if (bb.upper !== null && bb.upper !== undefined) {
          tableRow('  BB Upper:', '$' + formatPrice(bb.upper, signal.coin), 'cyan')
        }
        if (bb.middle !== null && bb.middle !== undefined) {
          tableRow('  BB Middle:', '$' + formatPrice(bb.middle, signal.coin), 'cyan')
        }
        if (bb.lower !== null && bb.lower !== undefined) {
          tableRow('  BB Lower:', '$' + formatPrice(bb.lower, signal.coin), 'cyan')
        }

        // Validate and display BB position
        // CRITICAL: Use indicators.price (price from historical data used for BB calculation)
        // NOT currentPrice (real-time price) to ensure consistency
        const price = indicators.price || 0
        if (price > 0 && bb.upper && bb.lower) {
          let bbPos = ''
          if (price > bb.upper) {
            bbPos = 'ABOVE upper (Overbought)'
          } else if (price < bb.lower) {
            bbPos = 'BELOW lower (Oversold)'
          } else if (price > bb.middle) {
            bbPos = 'Above middle (Bullish)'
          } else {
            bbPos = 'Below middle (Bearish)'
          }
          tableRow('  BB Position:', bbPos, 'cyan')
        }
      }

      // ATR
      if (indicators.atr !== null && indicators.atr !== undefined) {
        tableRow('  ATR(14):', '$' + formatPrice(indicators.atr, signal.coin) + ' (Volatility)', 'cyan')
      }

      // ADX
      if (indicators.adx !== null && indicators.adx !== undefined) {
        const adxValue = typeof indicators.adx === 'number' ? indicators.adx : (indicators.adx?.adx || null)
        if (adxValue !== null && !isNaN(adxValue)) {
          const adxStatus = adxValue > 25 ? '(Strong Trend)' : adxValue < 20 ? '(Weak Trend)' : '(Moderate)'
          tableRow('  ADX(14):', `${adxValue.toFixed(2)} ${adxStatus}`, 'cyan')
          if (indicators.plusDI !== null && indicators.minusDI !== null) {
            tableRow('  +DI/-DI:', `${indicators.plusDI.toFixed(2)}/${indicators.minusDI.toFixed(2)}`, 'cyan')
          }
        }
      }

      // OBV & VWAP
      if (indicators.obv !== null && indicators.obv !== undefined) {
        tableRow('  OBV:', indicators.obv.toFixed(2), 'cyan')
      }
      if (indicators.vwap !== null && indicators.vwap !== undefined) {
        tableRow('  VWAP:', '$' + formatPrice(indicators.vwap, signal.coin), 'cyan')
      }

      // Stochastic
      if (indicators.stochastic && typeof indicators.stochastic === 'object') {
        const stoch = indicators.stochastic
        const stochStatus = stoch.k > 80 ? '(Overbought)' : stoch.k < 20 ? '(Oversold)' : ''
        tableRow('  Stochastic:', `K: ${stoch.k.toFixed(2)}, D: ${stoch.d.toFixed(2)} ${stochStatus}`, 'cyan')
      }

      // CCI & Williams %R
      if (indicators.cci !== null && indicators.cci !== undefined) {
        const cciStatus = indicators.cci > 100 ? '(Overbought)' : indicators.cci < -100 ? '(Oversold)' : ''
        tableRow('  CCI:', `${indicators.cci.toFixed(2)} ${cciStatus}`, 'cyan')
      }
      if (indicators.williamsR !== null && indicators.williamsR !== undefined) {
        const wrStatus = indicators.williamsR > -20 ? '(Overbought)' : indicators.williamsR < -80 ? '(Oversold)' : ''
        tableRow('  Williams %R:', `${indicators.williamsR.toFixed(2)} ${wrStatus}`, 'cyan')
      }

      // Parabolic SAR
      if (indicators.parabolicSAR !== null && indicators.parabolicSAR !== undefined) {
        const sarTrend = currentPrice > indicators.parabolicSAR ? 'Bullish' : 'Bearish'
        tableRow('  Parabolic SAR:', '$' + formatPrice(indicators.parabolicSAR, signal.coin) + ` (${sarTrend})`, 'cyan')
      }

      // Aroon
      if (indicators.aroon && typeof indicators.aroon === 'object') {
        const aroon = indicators.aroon
        const aroonStatus = aroon.up > 70 && aroon.down < 30 ? '(Strong Uptrend)' : aroon.down > 70 && aroon.up < 30 ? '(Strong Downtrend)' : ''
        tableRow('  Aroon:', `Up: ${aroon.up.toFixed(2)}, Down: ${aroon.down.toFixed(2)} ${aroonStatus}`, 'cyan')
      }

      // Support/Resistance
      if (indicators.supportResistance && typeof indicators.supportResistance === 'object') {
        const sr = indicators.supportResistance
        if (sr.support || sr.resistance) {
          tableRow('  Support:', sr.support ? '$' + formatPrice(sr.support, signal.coin) : 'N/A', 'cyan')
          tableRow('  Resistance:', sr.resistance ? '$' + formatPrice(sr.resistance, signal.coin) : 'N/A', 'cyan')
        }
      }

      // Fibonacci Retracement
      if (indicators.fibonacciRetracement && typeof indicators.fibonacciRetracement === 'object') {
        const fib = indicators.fibonacciRetracement
        const fibSignal = fib.signal ? ` (${fib.signal.toUpperCase()} signal, Strength: ${fib.strength}/100)` : ''
        const fibColor = fib.signal === 'buy' ? 'green' : fib.signal === 'sell' ? 'red' : 'cyan'
        tableRow('  Fibonacci:', `${fib.nearestLevel || 'N/A'}${fibSignal}`, fibColor)
        if (fib.isNearLevel && fib.nearestLevelPrice) {
          tableRow('    Near Level:', '$' + formatPrice(fib.nearestLevelPrice, signal.coin) + ` (${fib.currentLevel || 'N/A'})`, 'cyan')
        }
        if (fib.direction !== 'neutral') {
          tableRow('    Direction:', `${fib.direction} | Range: $${formatPrice(fib.swingHigh, signal.coin)} - $${formatPrice(fib.swingLow, signal.coin)}`, 'cyan')
        }
        // Key levels
        if (fib.level382 || fib.level618) {
          const keyLevels = []
          if (fib.level382) keyLevels.push(`38.2%: $${formatPrice(fib.level382, signal.coin)}`)
          if (fib.level500) keyLevels.push(`50%: $${formatPrice(fib.level500, signal.coin)}`)
          if (fib.level618) keyLevels.push(`61.8%: $${formatPrice(fib.level618, signal.coin)}`)
          if (keyLevels.length > 0) {
            tableRow('    Key Levels:', keyLevels.join(' | '), 'cyan')
          }
        }
      }

      // Trend Detection
      if (indicators.trendDetection) {
        const td = indicators.trendDetection
        const trendColor = td.trend === 'uptrend' ? 'green' : td.trend === 'downtrend' ? 'red' : 'yellow'
        tableRow('  Trend:', `${td.trend} (Strength: ${td.strength}/3)`, trendColor)
      }

      // Market Structure
      if (indicators.marketStructure) {
        const ms = indicators.marketStructure
        tableRow('  Market Struct:', `${ms.structure} | HH: ${ms.higherHighs ? 'Yes' : 'No'} | LL: ${ms.lowerLows ? 'Yes' : 'No'}`, 'cyan')
      }

      // Divergence
      if (indicators.rsiDivergence && indicators.rsiDivergence.divergence) {
        const divColor = indicators.rsiDivergence.divergence === 'bullish' ? 'green' : 'red'
        tableRow('  RSI Divergence:', indicators.rsiDivergence.divergence, divColor)
      }
      if (indicators.macdDivergence && indicators.macdDivergence.divergence) {
        const divColor = indicators.macdDivergence.divergence === 'bullish' ? 'green' : 'red'
        tableRow('  MACD Divergence:', indicators.macdDivergence.divergence, divColor)
      }

      // Candlestick Patterns
      if (indicators.candlestickPatterns && indicators.candlestickPatterns.patterns && indicators.candlestickPatterns.patterns.length > 0) {
        const patterns = indicators.candlestickPatterns.patterns.map((p: { type: string; strength?: number; description?: string }) => p.type).join(', ')
        tableRow('  Candlestick:', patterns, 'cyan')
      }

      // Market Regime
      if (indicators.marketRegime) {
        const mr = indicators.marketRegime
        const regimeColor = mr.regime === 'trending' ? 'green' : mr.regime === 'choppy' ? 'yellow' : 'cyan'
        tableRow('  Market Regime:', `${mr.regime} (${mr.volatility} volatility)`, regimeColor)
      }

      // Price Change
      if (indicators.priceChange24h !== null && indicators.priceChange24h !== undefined) {
        const changeColor = indicators.priceChange24h >= 0 ? 'green' : 'red'
        const changeSign = indicators.priceChange24h >= 0 ? '+' : ''
        tableRow('  24h Change:', `${changeSign}${indicators.priceChange24h.toFixed(2)}%`, changeColor)
      }

      // Volume Change
      if (indicators.volumeChange !== null && indicators.volumeChange !== undefined) {
        const volColor = indicators.volumeChange >= 0 ? 'green' : 'yellow'
        const volSign = indicators.volumeChange >= 0 ? '+' : ''
        tableRow('  Vol Change:', `${volSign}${indicators.volumeChange.toFixed(2)}%`, volColor)
      }
    }

    // Volume Analysis Section (Comprehensive Volume-Based Analysis)
    if (externalData?.comprehensiveVolumeAnalysis) {
      const volAnalysis = externalData.comprehensiveVolumeAnalysis
      log('├' + '─'.repeat(tableWidth - 2) + '┤', 'cyan')
      log(`│ ${'Volume Analysis:'.padEnd(tableWidth - 4)} │`, 'bright')
      log('├' + '─'.repeat(tableWidth - 2) + '┤', 'cyan')

      // Volume Confirmation for Breakout
      if (volAnalysis.volumeConfirmation) {
        const vc = volAnalysis.volumeConfirmation
        const strengthColor = vc.strength === 'strong' ? 'green' : vc.strength === 'moderate' ? 'yellow' : vc.strength === 'weak' ? 'yellow' : 'red'
        const statusIcon = vc.isValid ? '✅' : '❌'
        tableRow('  Breakout Confirm:', `${statusIcon} ${vc.strength.toUpperCase()}`, strengthColor)
        if (vc.volumeRatio > 0) {
          tableRow('  Volume Ratio:', `${vc.volumeRatio.toFixed(2)}x (${vc.volumeChange > 0 ? '+' : ''}${vc.volumeChange.toFixed(1)}%)`, strengthColor)
        }
        if (vc.reason && !vc.isValid) {
          const reasonShort = vc.reason.length > 55 ? vc.reason.substring(0, 52) + '...' : vc.reason
          fullWidthRow(`    ${reasonShort}`, 'red')
        }
      }

      // Footprint Analysis (Buying vs Selling Pressure)
      if (volAnalysis.footprint) {
        const fp = volAnalysis.footprint
        const buyColor = fp.dominantSide === 'buy' ? 'green' : 'cyan'
        const sellColor = fp.dominantSide === 'sell' ? 'red' : 'cyan'
        
        tableRow('  Buy Volume:', formatLargeNumber(fp.totalBuyVolume), buyColor)
        tableRow('  Sell Volume:', formatLargeNumber(fp.totalSellVolume), sellColor)
        tableRow('  Net Delta:', `${fp.netDelta >= 0 ? '+' : ''}${formatLargeNumber(fp.netDelta)}`, fp.netDelta > 0 ? 'green' : fp.netDelta < 0 ? 'red' : 'yellow')
        tableRow('  Buy Pressure:', `${fp.buyPressure.toFixed(1)}%`, buyColor)
        tableRow('  Sell Pressure:', `${fp.sellPressure.toFixed(1)}%`, sellColor)
        tableRow('  Dominant Side:', fp.dominantSide.toUpperCase(), fp.dominantSide === 'buy' ? 'green' : fp.dominantSide === 'sell' ? 'red' : 'yellow')
        if (fp.significantLevels && fp.significantLevels.length > 0) {
          const topLevel = fp.significantLevels[0]
          const levelColor = topLevel.delta > 0 ? 'green' : 'red'
          tableRow('  Key Level:', `$${formatPrice(topLevel.price, signal.coin)} (Δ: ${topLevel.delta > 0 ? '+' : ''}${formatLargeNumber(topLevel.delta)})`, levelColor)
        }
      }

      // Volume Profile (POC, HVN, LVN)
      if (volAnalysis.volumeProfile) {
        const vp = volAnalysis.volumeProfile
        tableRow('  POC:', vp.poc ? `$${formatPrice(vp.poc, signal.coin)}` : 'N/A', 'cyan')
        if (vp.vah && vp.val) {
          tableRow('  VAH/VAL:', `$${formatPrice(vp.vah, signal.coin)} / $${formatPrice(vp.val, signal.coin)}`, 'cyan')
        }
        if (vp.hvn && vp.hvn.length > 0) {
          const hvnPrices = vp.hvn.slice(0, 3).map((h: any) => `$${formatPrice(h.price, signal.coin)}`).join(', ')
          tableRow('  HVN:', hvnPrices, 'green')
        }
        if (vp.lvn && vp.lvn.length > 0) {
          const lvnPrices = vp.lvn.slice(0, 3).map((l: any) => `$${formatPrice(l.price, signal.coin)}`).join(', ')
          tableRow('  LVN:', lvnPrices, 'yellow')
        }
      }

      // CVD (Cumulative Volume Delta)
      if (volAnalysis.cvd) {
        const cvd = volAnalysis.cvd
        const cvdTrendColor = cvd.cvdTrend === 'rising' ? 'green' : cvd.cvdTrend === 'falling' ? 'red' : 'yellow'
        tableRow('  CVD Trend:', cvd.cvdTrend.toUpperCase(), cvdTrendColor)
        const cvdDeltaColor = cvd.cvdDelta > 0 ? 'green' : cvd.cvdDelta < 0 ? 'red' : 'yellow'
        tableRow('  CVD Delta:', `${cvd.cvdDelta > 0 ? '+' : ''}${formatLargeNumber(cvd.cvdDelta)}`, cvdDeltaColor)
        if (cvd.divergence && cvd.divergence !== 'none') {
          const divColor = cvd.divergence === 'bullish' ? 'green' : 'red'
          tableRow('  CVD Divergence:', cvd.divergence.toUpperCase(), divColor)
        }
      }

      // Liquidity Zones
      if (volAnalysis.liquidityZones && volAnalysis.liquidityZones.length > 0) {
        const topZones = volAnalysis.liquidityZones.slice(0, 2)
        tableRow('  Top Liquidity:', `${topZones.length} zones`, 'cyan')
        topZones.forEach((zone: { priceRange: [number, number]; type: string; strength: string }, idx: number) => {
          const zoneTypeColor = zone.type === 'support' ? 'green' : zone.type === 'resistance' ? 'red' : 'cyan'
          // const zoneStrengthColor = zone.strength === 'high' ? 'green' : zone.strength === 'medium' ? 'yellow' : 'yellow'
          tableRow(`    Zone ${idx + 1}:`, `$${formatPrice(zone.priceRange[0], signal.coin)}-$${formatPrice(zone.priceRange[1], signal.coin)} (${zone.type}, ${zone.strength})`, zoneTypeColor)
        })
      }

      // Recommendations
      if (volAnalysis.recommendations) {
        const rec = volAnalysis.recommendations
        const actionColor = rec.action === 'enter' ? 'green' : rec.action === 'exit' ? 'red' : rec.action === 'wait' ? 'yellow' : 'cyan'
        const riskColor = rec.riskLevel === 'low' ? 'green' : rec.riskLevel === 'medium' ? 'yellow' : 'red'
        
        tableRow('  Recommendation:', rec.action.toUpperCase(), actionColor)
        tableRow('  Confidence:', `${(rec.confidence * 100).toFixed(1)}%`, rec.confidence > 0.7 ? 'green' : rec.confidence > 0.5 ? 'yellow' : 'red')
        tableRow('  Risk Level:', rec.riskLevel.toUpperCase(), riskColor)
      }
    }

    // Multi-timeframe Trend Alignment (if available)
    const assetDataForMTF = marketData instanceof Map ? marketData.get(signal.coin) : marketData[signal.coin]
    if (assetDataForMTF) {
      const trendAlignment = assetDataForMTF?.data?.trendAlignment || assetDataForMTF?.trendAlignment
      if (trendAlignment) {
        log('├' + '─'.repeat(tableWidth - 2) + '┤', 'cyan')
        log(`│ ${'Multi-Timeframe:'.padEnd(tableWidth - 4)} │`, 'bright')
        log('├' + '─'.repeat(tableWidth - 2) + '┤', 'cyan')
        const dailyTrendColor = trendAlignment.dailyTrend === 'uptrend' ? 'green' : trendAlignment.dailyTrend === 'downtrend' ? 'red' : 'yellow'
        tableRow('  Daily Trend:', trendAlignment.dailyTrend || 'N/A', dailyTrendColor)
        tableRow('  4H Aligned:', trendAlignment.h4Aligned ? 'Yes' : 'No', trendAlignment.h4Aligned ? 'green' : 'yellow')
        tableRow('  1H Aligned:', trendAlignment.h1Aligned ? 'Yes' : 'No', trendAlignment.h1Aligned ? 'green' : 'yellow')
        tableRow('  Overall:', trendAlignment.aligned ? 'Aligned' : 'Not Aligned', trendAlignment.aligned ? 'green' : 'yellow')
        if (trendAlignment.alignmentScore !== undefined) {
          const scoreColor = trendAlignment.alignmentScore >= 75 ? 'green' : trendAlignment.alignmentScore >= 50 ? 'yellow' : 'red'
          tableRow('  Score:', `${trendAlignment.alignmentScore.toFixed(0)}%`, scoreColor)
        }
      }
    }

    // External Data (if available) - using externalData defined earlier in function
    if (externalData) {
        log('├' + '─'.repeat(tableWidth - 2) + '┤', 'cyan')
        log(`│ ${'External Data:'.padEnd(tableWidth - 4)} │`, 'bright')
        log('├' + '─'.repeat(tableWidth - 2) + '┤', 'cyan')

        // Hyperliquid data
        if (externalData.hyperliquid) {
          const hl = externalData.hyperliquid
          const fundingColor = Math.abs(hl.fundingRate) > 0.0015 ? 'red' : 'cyan'
          tableRow('  Funding Rate:', `${(hl.fundingRate * 100).toFixed(4)}% (${hl.fundingRateTrend || 'N/A'})`, fundingColor)
          if (hl.openInterest) {
            tableRow('  Open Interest:', `$${formatLargeNumber(hl.openInterest)} (${hl.oiTrend || 'N/A'})`, 'cyan')
          }
        }

        // Enhanced metrics
        if (externalData.enhanced) {
          const enh = externalData.enhanced
          const volTrendColor = enh.volumeTrend === 'increasing' ? 'green' : enh.volumeTrend === 'decreasing' ? 'red' : 'yellow'
          tableRow('  Volume Trend:', enh.volumeTrend || 'N/A', volTrendColor)
          tableRow('  Volatility:', enh.volatilityPattern || 'N/A', 'cyan')
          if (enh.volumePriceDivergence !== 0) {
            const divColor = enh.volumePriceDivergence > 0 ? 'green' : 'red'
            const divText = enh.volumePriceDivergence > 0 ? 'Bullish' : 'Bearish'
            tableRow('  Vol-Price Div:', `${divText} (${enh.volumePriceDivergence > 0 ? '+' : ''}${enh.volumePriceDivergence.toFixed(2)})`, divColor)
          }
        }
      }

    // Current Position (if exists) - always show section if position exists
    if (position) {
      log('├' + '─'.repeat(tableWidth - 2) + '┤', 'cyan')
      const pnlPercent = position.entryPrice > 0 
        ? (((currentPrice - position.entryPrice) / position.entryPrice) * 100 * (position.side === 'LONG' ? 1 : -1)).toFixed(2)
        : '0.00'
      const pnlColor = parseFloat(pnlPercent) >= 0 ? 'green' : 'red'
      const positionEntryPriceString = position.entryPriceString || null
      const positionEntryPriceFormatted = formatPrice(position.entryPrice, signal.coin, positionEntryPriceString)
      const posText = `${position.side} ${Math.abs(position.quantity).toFixed(4)} @ $${positionEntryPriceFormatted}`
      tableRow('Position:', posText, 'cyan')
      const pnlText = `${pnlPercent}% ($${position.unrealizedPnl?.toFixed(2) || '0.00'})`
      tableRow('PnL:', pnlText, pnlColor)
      // Show entry price for existing position (use original format if available)
      tableRow('Entry Price:', formatPrice(position.entryPrice, signal.coin, positionEntryPriceString) + ' (current position)', 'cyan')

      // Calculate and display MAE (Maximum Adverse Excursion)
      const assetData = marketData instanceof Map ? marketData.get(signal.coin) : marketData[signal.coin]
      const historicalData = assetData?.historicalData || []
      const maeResult = calculateMAE(position, currentPrice, historicalData)

      if (maeResult) {
        const maeColor = maeResult.mae > 5 ? 'red' : maeResult.mae > 2 ? 'yellow' : 'green'
        const maeText = `${maeResult.mae.toFixed(2)}% (Worst: $${formatPrice(maeResult.worstPrice, signal.coin)})`
        tableRow('MAE:', maeText, maeColor)

        // Show current adverse excursion if different from MAE
        if (Math.abs(maeResult.currentAdverseExcursion - maeResult.mae) > 0.01) {
          const currentAEColor = maeResult.currentAdverseExcursion > 5 ? 'red' : maeResult.currentAdverseExcursion > 2 ? 'yellow' : 'green'
          tableRow('Current AE:', `${maeResult.currentAdverseExcursion.toFixed(2)}%`, currentAEColor)
        }
      }
    }

    // Futures Trading Format Section
    log('├' + '─'.repeat(tableWidth - 2) + '┤', 'cyan')

    // POSITION SETUP Section
    log(`│ ${'POSITION SETUP'.padEnd(tableWidth - 4)} │`, 'bright')
    log('├' + '─'.repeat(tableWidth - 2) + '┤', 'cyan')

    // 1. Capital
    const capital = accountState?.accountValue || accountState?.accountBalance || 0
    const capitalText = capital > 0 ? `$${capital.toFixed(2)}` : '$ —'
    tableRow('Capital:', capitalText, 'cyan')

    // Get capital for margin calculation (needed for dynamic margin percentage)

    // 2. Timeframe
    const timeframeText = `${tradingStyle} (short term/long term[ Flexible with market conditions])`
    tableRow('Timeframe:', timeframeText, 'cyan')

    // 3. Entry Price with direction - Enhanced visibility with emoji and bold
    let entryDirection = 'HOLD'
    if (signal.signal === 'buy_to_enter' || signal.signal === 'add') {
      entryDirection = 'LONG'
    } else if (signal.signal === 'sell_to_enter') {
      entryDirection = 'SHORT'
    } else if (signal.signal === 'hold') {
      entryDirection = position ? 'HOLD[Hold if there is a position in the market]' : 'HOLD [No entry - no capital allocation]'
    } else if (signal.signal === 'reduce' || signal.signal === 'close_all') {
      entryDirection = 'HOLD'
    }

    // CRITICAL FIX: Define variables in outer scope (needed for risk management section)
    // Use effectiveEntryPrice for display and calculations (entryPrice or currentPrice fallback)
    const effectiveEntryPrice = entryPrice || currentPrice || 0 // Use currentPrice as fallback
    const displayEntryPrice = effectiveEntryPrice

    // Initialize variables for risk management section (needed outside if-else block)
    let leverage = signal.leverage || 1
    let marginUsed = 0
    let positionValue = 0
    let marginPercentage = 50
    let capitalForMargin = signal.capital_per_signal && signal.capital_per_signal > 0
      ? signal.capital_per_signal
      : capital

    // CRITICAL FIX: HOLD signal should NOT calculate entry price, quantity, margin
    // HOLD = no action, no capital allocation
    if (signal.signal === 'hold' && !position) {
      // HOLD without position = skip all calculations
      tableRow('Entry Price:', `— (${entryDirection})`, 'yellow')
      tableRow('Quantity:', '— (No entry)', 'yellow')
      tableRow('Margin Used:', '— (No capital allocation)', 'yellow')
      tableRow('Position Value:', '— (No position)', 'yellow')
      
      // Skip to risk management section (variables are initialized but not calculated)
    } else {

    if (displayEntryPrice > 0) {
      // Format Entry Price with $ prefix for futures trading (using original Hyperliquid format)
      // Use original entry price string if available, otherwise format current price string
      const entryPriceString = originalEntryPriceString || (entryPrice === currentPrice ? originalPriceString : null)
      const entryPriceFormatted = formatPrice(displayEntryPrice, signal.coin, entryPriceString)
      const entryPriceText = `$${entryPriceFormatted} (${entryDirection})`
      tableRow('Entry Price:', entryPriceText, 'cyan')
    } else {
      tableRow('Entry Price:', `$ — (${entryDirection})`, 'cyan')
    }

    // 4. Calculate dynamic leverage and margin percentage first (needed for quantity calculation)
    // Calculate dynamic leverage based on market conditions (volatility, trend, confidence, etc.)
    // externalData and assetData are already defined earlier in the function (line ~13776)
    // Get max leverage from asset data (from Hyperliquid API)
    const assetMaxLeverage = assetData?.maxLeverage || assetData?.data?.maxLeverage || assetData?.externalData?.hyperliquid?.maxLeverage || 10

      leverage = isOpeningSignal && indicators && externalData && effectiveEntryPrice > 0
      ? calculateDynamicLeverage(indicators, externalData, signal, effectiveEntryPrice, assetMaxLeverage)
      : (signal.leverage || 1) // Fallback to signal leverage or 1x for non-opening signals

    // Calculate margin used from capital percentage
    // CRITICAL FIX: Use capital_per_signal for equal allocation, otherwise use total capital
    // This prevents using more than allocated capital per signal
      capitalForMargin = signal.capital_per_signal && signal.capital_per_signal > 0
      ? signal.capital_per_signal  // Use allocated capital per signal (equal allocation)
      : capital  // Fallback to total capital (for backward compatibility)
    
    // Calculate dynamic margin percentage based on market conditions (volatility, trend, confidence, etc.)
    // CRITICAL FIX: Use capitalForMargin for validation, not total capital
      marginPercentage = isOpeningSignal && indicators && externalData && effectiveEntryPrice > 0 && capitalForMargin > 0
      ? calculateDynamicMarginPercentage(indicators, externalData, signal, effectiveEntryPrice)
      : 50 // Fallback to 50% (mid) for non-opening signals or when data is unavailable

      marginUsed = capitalForMargin > 0 
      ? (capitalForMargin * marginPercentage / 100) 
      : 0

    // Calculate position value from margin and leverage
      positionValue = marginUsed > 0 && leverage > 0 
      ? marginUsed * leverage 
      : 0

    // Calculate effective quantity from Position Value (if margin-based calculation is used)
    // CRITICAL FIX: For equal allocation, quantity must be calculated from capital_per_signal (margin-based)
    // This ensures quantity is consistent with capital allocation and doesn't exceed allocated capital
    // Priority: Use margin-based calculation if capital_per_signal is available (equal allocation)
    // Otherwise, use risk-based calculation from signal.quantity
    const effectiveQuantityCoin = isOpeningSignal && effectiveEntryPrice > 0
      ? (signal.capital_per_signal && signal.capital_per_signal > 0 && marginUsed > 0 && leverage > 0
          ? positionValue / effectiveEntryPrice // ✅ Use margin-based calculation (consistent with capital_per_signal)
          : (signal.quantity || 0)) // Fallback to risk-based calculation from generate-signals.ts
      : (signal.quantity || 0) // For non-opening signals, use signal.quantity

    // Quantity (coin units only) - display units to avoid redundancy with Position Value
    const quantityCoin = effectiveQuantityCoin
    let quantityText = ''
    if (signal.signal === 'reduce') {
      if (quantityCoin > 0 && effectiveEntryPrice > 0) {
        quantityText = `${quantityCoin.toFixed(8)} ${signal.coin} - Reduce`
      } else {
        quantityText = `${quantityCoin.toFixed(8)} ${signal.coin} - Reduce`
      }
    } else if (signal.signal === 'add') {
      if (quantityCoin > 0 && effectiveEntryPrice > 0) {
        quantityText = `${quantityCoin.toFixed(8)} ${signal.coin} - Add`
      } else {
        quantityText = `${quantityCoin.toFixed(8)} ${signal.coin} - Add`
      }
    } else if (signal.signal === 'close_all') {
      quantityText = 'Close All'
    } else if (quantityCoin > 0) {
      quantityText = `${quantityCoin.toFixed(8)} ${signal.coin}`
    } else {
      quantityText = '$ —'
    }
    tableRow('Quantity:', quantityText, 'cyan')

    // 5. Margin Used (dynamic percentage based on market conditions)
    // Margin Used = capital_per_signal * marginPercentage / 100 (for equal allocation)
    // OR Margin Used = capital * marginPercentage / 100 (for non-equal allocation)
    // leverage, marginPercentage, marginUsed, positionValue, and effectiveQuantityCoin are already calculated above
    // CRITICAL FIX: Use capitalForMargin for display validation, not total capital
    const marginUsedText = marginUsed > 0 && capitalForMargin > 0
      ? `$${marginUsed.toFixed(2)} (${marginPercentage.toFixed(1)}% of $${capitalForMargin.toFixed(2)} allocated capital)`
      : marginUsed > 0
      ? `$${marginUsed.toFixed(2)}`
      : '$ —'
    tableRow('Margin Used:', marginUsedText, 'cyan')

    // 6. Position Value (calculated from Margin Used and Leverage)
    // Position Value = Margin Used * Leverage (notional value with leverage)
    // positionValue is already calculated above
    const positionValueText = positionValue > 0 
      ? `$${positionValue.toFixed(2)} (Leverage ${leverage}x — Flexible with market conditions)`
      : '$ —'
    tableRow('Position Value:', positionValueText, 'cyan')
    }

    // RISK MANAGEMENT Section
    log('├' + '─'.repeat(tableWidth - 2) + '┤', 'cyan')
    log(`│ ${'RISK MANAGEMENT'.padEnd(tableWidth - 4)} │`, 'bright')
    log('├' + '─'.repeat(tableWidth - 2) + '┤', 'cyan')

    // 8. Stop Loss (Fixed) & Potential Loss
    let potentialLossFixed = 0
    let riskUSDFixed = 0
    if (isOpeningSignal && effectiveEntryPrice && effectiveEntryPrice > 0 && signal.stop_loss && signal.stop_loss > 0) {
      const stopLossPct = Math.abs((effectiveEntryPrice - signal.stop_loss) / effectiveEntryPrice * 100).toFixed(2)
      // Format stop loss using original Hyperliquid format (no trailing zeros)
      const stopLossFormatted = formatPrice(signal.stop_loss, signal.coin)
      const stopLossText = `$${stopLossFormatted} (${stopLossPct}%)`
      tableRow('Stop Loss (Fixed):', stopLossText, 'cyan')

      // Potential Loss from Fixed Stop Loss (with leverage)
      // CRITICAL FIX: For futures trading with leverage:
      // Potential Loss = (Stop Loss % / 100) × Position Value
      // Position Value = Margin × Leverage
      // So: Potential Loss = (Stop Loss % / 100) × Margin × Leverage
      // Formula yang benar: potentialLoss = positionValue * (stopLossPercent / 100)
      // atau: potentialLoss = (marginUsed * leverage) * (stopLossPercent / 100)
      if (marginUsed > 0 && leverage > 0 && effectiveEntryPrice > 0) {
        const stopLossDistance = Math.abs(effectiveEntryPrice - signal.stop_loss)
        const stopLossPercent = (stopLossDistance / effectiveEntryPrice) * 100
        // CRITICAL FIX: Use positionValue for risk calculation, not margin * stopLoss% * leverage
        // This ensures risk is calculated from actual position size, not margin allocation
        const positionValueForRisk = positionValue > 0 ? positionValue : (marginUsed * leverage)
        potentialLossFixed = positionValueForRisk * (stopLossPercent / 100)
        // For equal allocation, prefer to show target risk_per_signal if available
        // Otherwise show actual calculated risk
        riskUSDFixed = signal.risk_per_signal && signal.risk_per_signal > 0 
          ? signal.risk_per_signal  // Use target risk for consistency with equal allocation
          : potentialLossFixed  // Fallback to calculated risk
        if (potentialLossFixed > 0) {
          tableRow('→ Potential Loss:', `$${potentialLossFixed.toFixed(2)}`, 'red')
        }
      }
    }

    // 9. Stop Loss (Flexible) based on ATR/volatility
    let potentialLossFlexible = 0
    let riskUSDFlexible = 0
    let flexibleStopLoss = 0
    let flexibleStopLossPct = 0
    if (isOpeningSignal && effectiveEntryPrice && effectiveEntryPrice > 0) {
      const atr = indicators?.atr || 0

      if (atr > 0 && effectiveEntryPrice > 0) {
        // Calculate flexible multiplier based on volatility
        const atrPercent = (atr / effectiveEntryPrice) * 100
        let flexibleMultiplier = 1.5 // Default

        if (atrPercent > 4.0) {
          flexibleMultiplier = 2.5 // High volatility
        } else if (atrPercent > 2.5) {
          flexibleMultiplier = 2.0 // Medium-high volatility
        } else if (atrPercent > 1.5) {
          flexibleMultiplier = 1.75 // Medium volatility
        } else {
          flexibleMultiplier = 1.5 // Low volatility
        }

        // Calculate flexible stop loss distance
        const flexibleSLDistance = atr * flexibleMultiplier
        flexibleStopLoss = signal.signal === 'buy_to_enter'
          ? effectiveEntryPrice - flexibleSLDistance
          : effectiveEntryPrice + flexibleSLDistance
        flexibleStopLossPct = Math.abs((effectiveEntryPrice - flexibleStopLoss) / effectiveEntryPrice * 100)
      } else if (effectiveEntryPrice > 0) {
        // Fallback: Use 2% if ATR not available
        const defaultSLDistance = effectiveEntryPrice * 0.02
        flexibleStopLoss = signal.signal === 'buy_to_enter'
          ? effectiveEntryPrice - defaultSLDistance
          : effectiveEntryPrice + defaultSLDistance
        flexibleStopLossPct = 2.00
      }

      // Always show flexible SL for opening signals (futures trading format requirement)
      if (flexibleStopLoss > 0) {
        // Format flexible stop loss using original Hyperliquid format (no trailing zeros)
        const flexibleStopLossFormatted = formatPrice(flexibleStopLoss, signal.coin)
        const flexibleStopLossText = `$${flexibleStopLossFormatted} (${flexibleStopLossPct.toFixed(2)}% [Adjustable with market conditions])`
        tableRow('Stop Loss (Flexible):', flexibleStopLossText, 'cyan')

        // Potential Loss from Flexible Stop Loss (with leverage)
        // CRITICAL FIX: Use positionValue for risk calculation, same as fixed SL
        // For futures trading: Potential Loss = (Stop Loss % / 100) × Position Value
        if (marginUsed > 0 && leverage > 0 && effectiveEntryPrice > 0) {
          const flexibleStopLossDistance = Math.abs(effectiveEntryPrice - flexibleStopLoss)
          const flexibleStopLossPercent = (flexibleStopLossDistance / effectiveEntryPrice) * 100
          // CRITICAL FIX: Use positionValue for risk calculation
          const positionValueForFlexRisk = positionValue > 0 ? positionValue : (marginUsed * leverage)
          potentialLossFlexible = positionValueForFlexRisk * (flexibleStopLossPercent / 100)
          // For equal allocation, prefer to show target risk_per_signal if available
          riskUSDFlexible = signal.risk_per_signal && signal.risk_per_signal > 0 
            ? signal.risk_per_signal  // Use target risk for consistency with equal allocation
            : potentialLossFlexible  // Fallback to calculated risk
          if (potentialLossFlexible > 0) {
            // Always show flexible potential loss (it may differ from fixed due to volatility-based calculation)
            // Only skip if it's exactly the same as fixed (within 0.01 cent)
            if (!signal.stop_loss || Math.abs(potentialLossFlexible - potentialLossFixed) > 0.01 || potentialLossFixed === 0) {
              tableRow('→ Potential Loss:', `$${potentialLossFlexible.toFixed(2)}`, 'red')
            }
          }
        }
      }
    }

    // Equal Capital Allocation display (if enabled)
    if (signal.equal_allocation && signal.capital_per_signal !== undefined) {
      log('├' + '─'.repeat(tableWidth - 2) + '┤', 'cyan')
      log(`│ ${'💰 Capital Allocation:'.padEnd(tableWidth - 4)} │`, 'bright')
      log('├' + '─'.repeat(tableWidth - 2) + '┤', 'cyan')
      tableRow('Equal Allocation:', '✅ Enabled', 'green')
      tableRow('Capital per Signal:', `$${signal.capital_per_signal.toFixed(2)}`, 'cyan')
      if (signal.risk_per_signal !== undefined) {
        tableRow('Risk per Signal:', `$${signal.risk_per_signal.toFixed(2)}`, 'cyan')
        if (signal.risk_percent !== undefined) {
          tableRow('Risk Percentage:', `${signal.risk_percent.toFixed(2)}% of total`, 'cyan')
        }
      }
    }

    // Risk USD display - Enhanced visibility with emoji and details
    // Always show Risk USD if opening signal (calculate from available data)
    if (isOpeningSignal) {
      // CRITICAL FIX: Override with target risk_per_signal if equal allocation is enabled
      // This ensures Risk (Fixed) and Risk (Flex) show target risk, not calculated risk
      // For equal allocation, we want to show the intended risk per signal ($0.34), not actual potential loss
      if (signal.equal_allocation && signal.risk_per_signal && signal.risk_per_signal > 0) {
        riskUSDFixed = signal.risk_per_signal  // Override with target risk
        riskUSDFlexible = signal.risk_per_signal  // Override with target risk
      }
      
      // Calculate Risk USD from signal.risk_usd if available, otherwise use calculated values
      const riskUSDFromSignal = signal.risk_usd || 0
      const hasFixedSL = signal.stop_loss && signal.stop_loss > 0 && effectiveEntryPrice > 0
      const hasFlexibleSL = flexibleStopLoss > 0 && effectiveEntryPrice > 0

      // Display format: Risk (Fixed): $9.11 at SL $0.1730 (1.80%) - using original Hyperliquid format
      if (riskUSDFixed > 0 && riskUSDFlexible > 0) {
        // Show both Fixed and Flexible Risk USD
        const fixedSLPct = hasFixedSL && signal.stop_loss !== undefined && signal.stop_loss !== null ? Math.abs((effectiveEntryPrice - signal.stop_loss) / effectiveEntryPrice * 100).toFixed(2) : '0.00'
        const fixedSLFormatted = hasFixedSL && signal.stop_loss !== undefined && signal.stop_loss !== null ? formatPrice(signal.stop_loss, signal.coin) : ''
        const flexSLFormatted = hasFlexibleSL ? formatPrice(flexibleStopLoss, signal.coin) : ''
        const fixedSLText = hasFixedSL ? `at SL $${fixedSLFormatted} (${fixedSLPct}%)` : ''
        const flexSLText = hasFlexibleSL ? `at SL $${flexSLFormatted} (${flexibleStopLossPct.toFixed(2)}%)` : ''
        tableRow('Risk (Fixed):', `$${riskUSDFixed.toFixed(2)} ${fixedSLText}`, 'cyan')
        tableRow('Risk (Flex):', `$${riskUSDFlexible.toFixed(2)} ${flexSLText}`, 'cyan')
      } else if (riskUSDFixed > 0) {
        // Show only Fixed Risk USD
        const fixedSLPct = hasFixedSL && signal.stop_loss !== undefined && signal.stop_loss !== null ? Math.abs((effectiveEntryPrice - signal.stop_loss) / effectiveEntryPrice * 100).toFixed(2) : '0.00'
        const fixedSLFormatted = hasFixedSL && signal.stop_loss !== undefined && signal.stop_loss !== null ? formatPrice(signal.stop_loss, signal.coin) : ''
        const fixedSLText = hasFixedSL ? `at SL $${fixedSLFormatted} (${fixedSLPct}%)` : ''
        tableRow('Risk (Fixed):', `$${riskUSDFixed.toFixed(2)} ${fixedSLText}`, 'cyan')
      } else if (riskUSDFlexible > 0) {
        // Show only Flexible Risk USD
        const flexSLFormatted = hasFlexibleSL ? formatPrice(flexibleStopLoss, signal.coin) : ''
        const flexSLText = hasFlexibleSL ? `at SL $${flexSLFormatted} (${flexibleStopLossPct.toFixed(2)}%)` : ''
        tableRow('Risk (Flex):', `$${riskUSDFlexible.toFixed(2)} ${flexSLText}`, 'cyan')
      } else if (riskUSDFromSignal > 0) {
        // Fallback: Use signal.risk_usd if available
        tableRow('Risk USD:', `$${riskUSDFromSignal.toFixed(2)}`, 'cyan')
      }
    }

    // 10. Take Profit (if available) - use take_profit as primary, profit_target as fallback
    let potentialProfit = 0
    const profitTarget = signal.take_profit || signal.profit_target
    if (isOpeningSignal && effectiveEntryPrice && effectiveEntryPrice > 0 && profitTarget && profitTarget > 0) {
      const profitPct = Math.abs((profitTarget - effectiveEntryPrice) / effectiveEntryPrice * 100).toFixed(2)
      // Format take profit using original Hyperliquid format (no trailing zeros)
      const profitTargetFormatted = formatPrice(profitTarget, signal.coin)
      const profitText = `$${profitTargetFormatted} (${profitPct}%)`
      tableRow('Take Profit:', profitText, 'green')

      // For futures trading: Potential Profit = (Profit Distance / Entry Price) * Margin Used * Leverage
      // or: Potential Profit = Margin Used * (Profit % / 100) * Leverage
      if (isOpeningSignal && effectiveEntryPrice && effectiveEntryPrice > 0 && profitTarget && profitTarget > 0 && marginUsed > 0 && leverage > 0) {
        const profitDistance = Math.abs(profitTarget - effectiveEntryPrice)
        const profitPercent = (profitDistance / effectiveEntryPrice) * 100
        potentialProfit = marginUsed * (profitPercent / 100) * leverage
        if (potentialProfit > 0) {
          // Calculate Risk/Reward ratios
          const rrFixed = riskUSDFixed > 0 ? (potentialProfit / riskUSDFixed).toFixed(2) : 'N/A'
          const rrFlex = riskUSDFlexible > 0 ? (potentialProfit / riskUSDFlexible).toFixed(2) : 'N/A'
          const rrText = riskUSDFixed > 0 && riskUSDFlexible > 0 
            ? `(R:R = ${rrFixed}:1 fixed, ${rrFlex}:1 flex)`
            : riskUSDFixed > 0 
            ? `(R:R = ${rrFixed}:1 fixed)`
            : riskUSDFlexible > 0
            ? `(R:R = ${rrFlex}:1 flex)`
            : ''
          tableRow('Potential TP:', `$${potentialProfit.toFixed(2)} ${rrText}`, 'green')
        }
      }
    }

    // 11. Leverage Display - Simplified (range with current)
    log('├' + '─'.repeat(tableWidth - 2) + '┤', 'cyan')
    // Get max leverage from asset data (from Hyperliquid API) - reuse assetData already declared above
    const assetMaxLeverageDisplay = assetData?.maxLeverage || assetData?.data?.maxLeverage || assetData?.externalData?.hyperliquid?.maxLeverage || 10
    const leverageText = isOpeningSignal && leverage > 0
      ? `1x-${assetMaxLeverageDisplay}x (Current: ${leverage}x)`
      : `1x-${assetMaxLeverageDisplay}x (Flexible with market conditions)`
    tableRow('Leverage:', leverageText, 'cyan')

    // 12. Margin Display - Simplified (range with current)
    // CRITICAL FIX: Use capitalForMargin for validation, not total capital
    const marginText = isOpeningSignal && marginPercentage > 0 && marginUsed > 0 && capitalForMargin > 0
      ? `25%-100% (Current: ${marginPercentage.toFixed(0)}% of $${capitalForMargin.toFixed(2)} allocated = $${marginUsed.toFixed(2)})`
      : '25%-100% (Flexible with market conditions)'
    tableRow('Margin:', marginText, 'cyan')

    log('├' + '─'.repeat(tableWidth - 2) + '┤', 'cyan')
    const confidencePercent = ((signal.confidence || 0) * 100).toFixed(2)
    const confidenceColor = signal.confidence >= 0.7 ? 'green' : signal.confidence >= 0.5 ? 'yellow' : 'red'
    tableRow('Confidence:', confidencePercent + '%', confidenceColor)

        // Display Expected Value (EV) if available (using new autonomous thresholds)
        if (signal.expected_value !== undefined && signal.expected_value !== null) {
          log('├' + '─'.repeat(tableWidth - 2) + '┤', 'cyan')
          // OPTIMIZATION FINAL: Reuse cached thresholds and tradingMode (already computed at function start)
          // FUTURES TRADING: Use more relaxed EV threshold for futures
          // For futures, EV can be more negative because leverage amplifies both profit and loss
          // Only reject if EV < -$2.00 (extremely negative for futures)
          const FUTURES_EV_REJECT_THRESHOLD = -2.00  // Reject only if EV < -$2.00 for futures
          // OPTIMIZATION FINAL: Reuse cached tradingMode and rejectEV
          const rejectEVFinal = tradingMode === 'AUTONOMOUS' 
            ? FUTURES_EV_REJECT_THRESHOLD  // Use futures threshold for AUTONOMOUS mode
            : rejectEV  // Use standard threshold for other modes (already cached)
          // let evStatus = ''
          let evColor = 'green'
          let evStatusText = 'Auto-Tradeable'

          // In AUTONOMOUS mode, use execution level to determine EV status
          if (tradingMode === 'AUTONOMOUS' && signal.auto_tradeable) {
            // Signal is auto-tradeable - determine status based on execution level
            if (signal.executionLevel === 'HIGH_CONFIDENCE') {
              // evStatus = ''
              evColor = 'green'
              evStatusText = `High Confidence - Auto-Tradeable (≥$${autoTradeEV.toFixed(2)})`
            } else if (signal.executionLevel === 'MEDIUM_CONFIDENCE') {
              // evStatus = ''
              evColor = 'yellow'
              evStatusText = `Medium Confidence - Auto-Tradeable (≥$${displayEV.toFixed(2)})`
            } else if (signal.executionLevel === 'LOW_CONFIDENCE_EXTREME') {
              // evStatus = ''
              evColor = 'red'
              evStatusText = `Low Confidence - Extreme Condition - Auto-Tradeable (≥$${rejectEV.toFixed(2)})`
            } else {
              // Fallback to standard logic
              if (signal.expected_value >= autoTradeEV) {
                // evStatus = ''
                evColor = 'green'
                evStatusText = `Auto-Tradeable (≥$${autoTradeEV.toFixed(2)})`
              } else if (signal.expected_value >= displayEV) {
                // evStatus = ''
                evColor = 'yellow'
                evStatusText = `Auto-Tradeable (≥$${displayEV.toFixed(2)})`
              } else {
                // evStatus = ''
                evColor = 'red'
                evStatusText = `Auto-Tradeable (≥$${rejectEVFinal.toFixed(2)})`
              }
            }
          } else {
            // SIGNAL_ONLY or MANUAL_REVIEW mode, or rejected signal
            if (signal.expected_value >= autoTradeEV) {
              // evStatus = ''
              evColor = 'green'
              evStatusText = `High EV (≥$${autoTradeEV.toFixed(2)})`
            } else if (signal.expected_value >= displayEV) {
              // evStatus = ''
              evColor = 'yellow'
              evStatusText = `Medium EV (≥$${displayEV.toFixed(2)}) - Manual Review`
            } else if (signal.expected_value >= rejectEVFinal) {
              // evStatus = ''
              evColor = 'red'
              evStatusText = `Marginal EV (≥$${rejectEVFinal.toFixed(2)}) - High Risk`
            } else {
              // evStatus = ''
              evColor = 'red'
              evStatusText = `Rejected (<$${rejectEVFinal.toFixed(2)})`
            }
          }

          tableRow('Expected Value:', `$${signal.expected_value.toFixed(2)}`, evColor)
          tableRow('EV Status:', evStatusText, evColor)

          // OPTIMIZATION FINAL: Reuse cached tradingMode instead of repeated getTradingConfig() call
          // Show auto-tradeable status and trading mode
          if (tradingMode === 'AUTONOMOUS') {
            if (signal.auto_tradeable) {
              tableRow('Auto-Trade:', 'Yes', 'green')
              if (signal.autoTradeReason) {
                tableRow('Auto-Trade Reason:', signal.autoTradeReason, 'green')
              }
            } else {
              tableRow('Auto-Trade:', 'No - Manual Review', 'yellow')
              if (signal.rejectReason) {
                tableRow('Reject Reason:', signal.rejectReason, 'yellow')
              }
            }
          } else {
            // OPTIMIZATION FINAL: Reuse cached tradingMode instead of repeated getTradingConfig() call
            if (tradingMode === 'SEMI_AUTONOMOUS' || tradingMode === 'MANUAL') {
              tableRow('Trading Mode:', tradingMode, 'cyan')
            } else {
              tableRow('Trading Mode:', 'MANUAL_REVIEW', 'yellow')
            }
          }

          // Show position size adjustment if applied
          if (signal.positionSizeMultiplier && signal.positionSizeMultiplier !== 1.0) {
            tableRow('Position Size:', `${(signal.positionSizeMultiplier * 100).toFixed(0)}% of calculated size`, 'yellow')
            if (signal.position_size_note) {
              tableRow('Size Note:', signal.position_size_note, 'yellow')
            }
          }
        }

    // Display warnings section for low confidence signals
    if (signal.warnings && signal.warnings.length > 0) {
      log('├' + '─'.repeat(tableWidth - 2) + '┤', 'red')
      log(`│ WARNING:`.padEnd(tableWidth - 1) + '│', 'red')
      log('├' + '─'.repeat(tableWidth - 2) + '┤', 'red')
      signal.warnings.forEach(warning => {
        // Remove emoji from warning text
        const cleanWarning = warning.replace(/[🟢🟡🔴⚠️✅❌📊📈🌐🎯💰🛡️🔪📡→•]/g, '').trim()
        log(`│ • ${cleanWarning}`.padEnd(tableWidth - 1) + '│', 'yellow')
      })
      log('├' + '─'.repeat(tableWidth - 2) + '┤', 'red')
      log(`│ Proceed at your own risk`.padEnd(tableWidth - 1) + '│', 'yellow')
    }

    // Display anti-knife warning if present (separate from warnings array)
    if (signal.anti_knife_warning && (!signal.warnings || !signal.warnings.includes('Catching falling knife scenario detected'))) {
      log('├' + '─'.repeat(tableWidth - 2) + '┤', 'red')
      // Remove emoji from warning text
      const cleanKnifeWarning = signal.anti_knife_warning.replace(/[🟢🟡🔴⚠️✅❌📊📈🌐🎯💰🛡️🔪📡→•]/g, '').trim()
      tableRow('HIGH RISK:', cleanKnifeWarning, 'red')
    }

        // OPTIMIZATION FINAL: Reuse cached tradingMode instead of repeated getTradingConfig() call
        // Display EV warning if present (separate from warnings array)
        // Only show warning if signal is NOT auto-tradeable (in AUTONOMOUS mode) or in SIGNAL_ONLY/MANUAL_REVIEW mode
        if (signal.ev_warning && signal.ev_warning_message && 
            (!signal.warnings || !signal.warnings.some(w => w.includes('Marginal expected value'))) &&
            !(tradingMode === 'AUTONOMOUS' && signal.auto_tradeable)) {
          log('├' + '─'.repeat(tableWidth - 2) + '┤', 'yellow')
          // Remove emoji from warning text
          const cleanEVWarning = signal.ev_warning_message.replace(/[🟢🟡🔴⚠️✅❌📊📈🌐🎯💰🛡️🔪📡→•]/g, '').trim()
          tableRow('EV Warning:', cleanEVWarning, 'yellow')
        }

    // Display oversold warning if present (only if not already in warnings array)
    if (signal.oversold_warning && (!signal.warnings || !signal.warnings.some(w => w.includes('Oversold conditions')))) {
      log('├' + '─'.repeat(tableWidth - 2) + '┤', 'yellow')
      // Remove emoji from warning text
      const cleanOversoldWarning = signal.oversold_warning.replace(/[🟢🟡🔴⚠️✅❌📊📈🌐🎯💰🛡️🔪📡→•]/g, '').trim()
      tableRow('Warning:', cleanOversoldWarning, 'yellow')
    }

    // Display confidence breakdown if available
    if (signal.confidence_breakdown && Array.isArray(signal.confidence_breakdown) && signal.confidence_breakdown.length > 0) {
      log('├' + '─'.repeat(tableWidth - 2) + '┤', 'cyan')
      log(`│ ${'Confidence Breakdown:'.padEnd(tableWidth - 4)} │`, 'bright')
      log('├' + '─'.repeat(tableWidth - 2) + '┤', 'cyan')
      for (const breakdown of signal.confidence_breakdown) {
        const parts = breakdown.split(':')
        if (parts.length === 2) {
          const category = parts[0].trim()
          const score = parts[1].trim()
          const scoreValue = parseFloat(score.split('/')[0])
          const maxValue = parseFloat(score.split('/')[1])
          const scorePercent = maxValue > 0 ? (scoreValue / maxValue * 100) : 0
          const scoreColor = scorePercent >= 70 ? 'green' : scorePercent >= 50 ? 'yellow' : 'red'
          tableRow(`  ${category}:`, `${score} (${scorePercent.toFixed(0)}%)`, scoreColor)
        } else {
          tableRow('  ', breakdown, 'cyan')
        }
      }
      if (signal.confidence_score !== undefined && signal.confidence_max_score !== undefined) {
        const totalPercent = signal.confidence_max_score > 0 ? (signal.confidence_score / signal.confidence_max_score * 100).toFixed(0) : '0'
        tableRow('  Total Score:', `${signal.confidence_score}/${signal.confidence_max_score} (${totalPercent}%)`, confidenceColor)
      }
    }

    // Risk USD is already displayed in RISK MANAGEMENT section above
    // Remove duplicate display here to avoid confusion

    // Justification in table format (compact, wrapped text)
    if (signal.justification) {
      log('├' + '─'.repeat(tableWidth - 2) + '┤', 'cyan')
      log(`│ ${'Justification:'.padEnd(tableWidth - 4)} │`, 'bright')
      log('├' + '─'.repeat(tableWidth - 2) + '┤', 'cyan')

      // Handle comprehensive justification with newlines and sections
      const justification = signal.justification || 'N/A'

      // First, split by newlines to handle sections (ALL INDICATORS, RED FLAGS, etc.)
      const sections = justification.split('\n').filter(s => s.trim().length > 0)

      // Process each section
      let inRedFlagsSection = false
      let inAllIndicatorsSection = false

      for (let i = 0; i < sections.length; i++) {
        const section = sections[i]
        const trimmed = section.trim()
        if (!trimmed) continue

        // Remove emoji from section text before processing
        const cleanSection = trimmed.replace(/[🟢🟡🔴⚠️✅❌📊📈🌐🎯💰🛡️🔪📡→•]/g, '').trim()
        if (!cleanSection) continue

        // Check if this is a section header (RED FLAGS, ALL INDICATORS, etc.)
        const isRedFlagsHeader = cleanSection === 'RED FLAGS TO MONITOR:' || cleanSection.startsWith('RED FLAGS TO MONITOR:')
        const isAllIndicatorsHeader = cleanSection === 'ALL INDICATORS:' || cleanSection.startsWith('ALL INDICATORS:')
        const isWarning = cleanSection.includes('WARNING') || cleanSection.includes('CONTRADICTION')
        const isHighRisk = cleanSection.includes('HIGH RISK') || cleanSection.includes('CONTRADICTION')
        // const isListItem = cleanSection.startsWith('- ') || cleanSection.startsWith('  - ')
        // const isSubSection = cleanSection.startsWith('Supporting') || cleanSection.startsWith('Contradicting')

        // If this is a section header, display it with header format
        if (isRedFlagsHeader) {
          inRedFlagsSection = true
          inAllIndicatorsSection = false
          // Display as section header (no need for empty line, separator line is enough)
          log('├' + '─'.repeat(tableWidth - 2) + '┤', 'cyan')
          log(`│ ${'RED FLAGS TO MONITOR:'.padEnd(tableWidth - 4)} │`, 'bright')
          log('├' + '─'.repeat(tableWidth - 2) + '┤', 'cyan')
          continue
        } else if (isAllIndicatorsHeader) {
          inAllIndicatorsSection = true
          inRedFlagsSection = false
          // Display as section header (no need for empty line, separator line is enough)
          log('├' + '─'.repeat(tableWidth - 2) + '┤', 'cyan')
          log(`│ ${'ALL INDICATORS:'.padEnd(tableWidth - 4)} │`, 'bright')
          log('├' + '─'.repeat(tableWidth - 2) + '┤', 'cyan')
          continue
        }

        // Choose color based on section type
        let sectionColor = 'cyan'
        if (inRedFlagsSection || isHighRisk) {
          sectionColor = 'red'
        } else if (isWarning) {
          sectionColor = 'yellow'
        } else if (inAllIndicatorsSection) {
          sectionColor = 'cyan'
        }

        // Use full-width row for content
        fullWidthRow(cleanSection, sectionColor)
      }
    }

    // Invalidation Condition (ALWAYS display - CRITICAL field)
    // Based on Alpha Arena research: invalidation_condition improves performance
    log('├' + '─'.repeat(tableWidth - 2) + '┤', 'cyan')
    const invalidationLabel = 'Invalidation:'
    log(`│ ${invalidationLabel.padEnd(tableWidth - 4)} │`, 'bright')
    log('├' + '─'.repeat(tableWidth - 2) + '┤', 'cyan')
    // Standardize invalidation for BUY_TO_ENTER if not provided or to enforce stricter template
    let invalidation = signal.invalidation_condition || 'N/A - Not specified'
    const isBuy = signal.signal === 'buy_to_enter' || signal.signal === 'add'
    if (isBuy) {
      // Try to extract nearest support from indicators
      const assetDataForInvalidation = marketData instanceof Map ? marketData.get(signal.coin) : marketData[signal.coin]
      const indicatorsForInvalidation = assetDataForInvalidation?.indicators || assetDataForInvalidation?.data?.indicators
      const supportLevel = indicatorsForInvalidation?.supportResistance?.support || null
      const supportText = supportLevel ? `$${formatPrice(supportLevel, signal.coin)}` : 'key support'
      invalidation = `Price < ${supportText} OR RSI(14) < 50 OR MACD histogram < 0 OR volume < 50% of 24h average`
    }
    const isAutoGenerated = signal._invalidation_auto_generated === true

    // Show auto-generated warning as first line if applicable
    if (isAutoGenerated) {
      const autoGenWarning = 'This invalidation_condition was auto-generated based on Alpha Arena patterns'
      fullWidthRow(autoGenWarning, 'yellow')
    }

    // Use full-width row for invalidation text
    fullWidthRow(invalidation, 'cyan')

    log('└' + '─'.repeat(tableWidth - 2) + '┘', 'cyan')
  }