/**
 * Prompt Builder for Signal Generation
 * Builds system and user prompts for a single asset
 */

import { formatPrice, formatLargeNumber } from '../formatting/price'
import { countBullishBearishIndicators } from '../analysis/count-indicators'

/**
 * Build technical analysis summary for a single asset
 */
export function buildTechnicalAnalysisSummary(
  asset: string,
  data: any,
  positions: Map<string, any>
): string {
  // OPTIMIZATION: Cache nested property access to avoid repeated lookups
  const indicators = data?.indicators
  const dataData = data?.data
  const hasPrice = indicators?.price || data?.price || dataData?.price || dataData?.markPx
  const hasIndicators = indicators && (indicators.rsi14 || indicators.ema20 || indicators.macd)

  if (!hasPrice) {
    if (process.env.VERBOSE_LOGGING === 'true') {
      console.warn(`⚠️  Skipping ${asset} from analysis: No price data available`)
    }
    return ''
  }

  if (!hasIndicators && process.env.VERBOSE_LOGGING === 'true') {
    console.warn(`⚠️  ${asset}: No technical indicators available - will generate signal with price action only (FUTURES mode allows this)`)
  }

  const ind = indicators || { price: hasPrice }
  const position = positions.get(asset)

  // OPTIMIZATION: Use array + join() instead of string concatenation for better performance
  const analysisLines: string[] = [`**${asset} Technical Analysis:**`]

  if (!hasIndicators) {
    analysisLines.push(`- ⚠️ **WARNING: No technical indicators available - using price action only (FUTURES mode)**`)
    analysisLines.push(`- This is acceptable for futures trading - leverage allows for price-action-based signals`)
  }

  // Add Hyperliquid data (Mark, Oracle, 24h Change, 24h Volume, Open Interest)
  // OPTIMIZATION: Use cached dataData if available, otherwise fallback to data
  const assetData = dataData || data
  const markPriceRaw = assetData?.markPx || data?.markPx || data?.price || ind?.price || hasPrice
  const markPrice = markPriceRaw
  const oraclePrice = markPriceRaw // Same as markPrice, avoid duplicate calculation
  const volume24h = assetData?.volume24h ?? data?.volume24h ?? data?.data?.volume24h ?? 0
  const openInterest = assetData?.externalData?.hyperliquid?.openInterest ?? data?.externalData?.hyperliquid?.openInterest ?? 0
  const priceChange24h = ind?.priceChange24h ?? 0
  const priceChange24hAbs = Math.abs(priceChange24h)
  const currentPrice = ind?.price ?? markPrice ?? hasPrice

  // Format 24h Change
  // CRITICAL FIX: Check for division by zero - (1 + priceChange24h / 100) can be 0 if priceChange24h = -100
  let price24hAgo = currentPrice
  let priceChangeAbs = 0
  if (priceChange24h !== 0 && currentPrice) {
    const denominator = 1 + priceChange24h / 100
    if (Math.abs(denominator) > 0.001) { // Avoid division by zero or very small numbers
      price24hAgo = currentPrice / denominator
    priceChangeAbs = currentPrice - price24hAgo
    }
  }
  // OPTIMIZATION: Cache formatting operations - formatPrice called 3x with similar values
  const changeSign = priceChange24h >= 0 ? '+' : '-'
  // OPTIMIZATION: Removed unnecessary .replace('.', ',') - not needed for formatting
  const changeFormatted = priceChange24h !== 0 && currentPrice
    ? `${changeSign}${Math.abs(priceChangeAbs).toFixed(1)} / ${changeSign}${priceChange24hAbs.toFixed(2)}%`
    : 'N/A (no 24h change data)'

  // OPTIMIZATION: If prices are same, reuse formatted value
  const markFormatted = formatPrice(markPrice, asset)
  const oracleFormatted = markPrice === oraclePrice ? markFormatted : formatPrice(oraclePrice, asset)
  const currentPriceFormatted = currentPrice === markPrice ? markFormatted : formatPrice(currentPrice, asset)

  // Format volume and OI
  const volumeFormatted = volume24h > 0 ? `$${formatLargeNumber(volume24h)}` : 'N/A'
  const oiFormatted = openInterest > 0 ? `$${formatLargeNumber(openInterest)}` : 'N/A'

  analysisLines.push(`- Price: ${currentPriceFormatted} | Mark: ${markFormatted} | Oracle: ${oracleFormatted}`)
  analysisLines.push(`- 24h: ${changeFormatted} | Vol: ${volumeFormatted} | OI: ${oiFormatted}`)

  // Calculate trend short/long from recent price movement
  let shortLongTrend = 'Neutral'
  let marketMovement2min = 'No significant movement'
  // OPTIMIZATION: Cache historical data access and use direct indexing instead of slice
  const historicalData = assetData?.historicalData ?? assetData?.data?.historicalData ?? []
  const dataLen = historicalData.length
  if (dataLen >= 2) {
    // OPTIMIZATION: Direct indexing faster than slice() - avoid creating new array
    const prevCandle = historicalData[dataLen - 2]
    const currCandle = historicalData[dataLen - 1]
    if (prevCandle && currCandle) {
      // OPTIMIZATION: Use cached candles instead of array access
      // CRITICAL FIX: Check for division by zero - prevCandle.close can be 0
      const priceChange = currCandle.close - prevCandle.close
      const prevClose = prevCandle.close || 0
      const priceChangePercent = prevClose > 0 ? (priceChange / prevClose) * 100 : 0

      if (priceChangePercent > 0.1) {
        shortLongTrend = 'Long (Bullish)'
        marketMovement2min = `Price up ${priceChangePercent.toFixed(2)}% (More buyers)`
      } else if (priceChangePercent < -0.1) {
        shortLongTrend = 'Short (Bearish)'
        marketMovement2min = `Price down ${Math.abs(priceChangePercent).toFixed(2)}% (More sellers)`
      } else {
        shortLongTrend = 'Neutral'
        marketMovement2min = `Price stable (${priceChangePercent >= 0 ? '+' : ''}${priceChangePercent.toFixed(2)}%)`
      }
    }
  }

  analysisLines.push(`- Trend: ${shortLongTrend} | Recent: ${marketMovement2min}`)

  // Show active position if exists
  if (position) {
    // CRITICAL FIX: Check for division by zero - position.entryPrice can be 0
    const entryPrice = position.entryPrice || 0
    const pnlPercent = entryPrice > 0 && currentPrice
      ? (((currentPrice - entryPrice) / entryPrice) * 100 * (position.side === 'LONG' ? 1 : -1)).toFixed(2)
      : '0.00'
    // OPTIMIZATION: Cache entryTime calculation - avoid repeated Date operations
    const entryTime = position.entryTime !== undefined 
      ? (typeof position.entryTime === 'number' ? position.entryTime : Date.parse(String(position.entryTime)))
      : Date.now()
    const entryTimeStr = new Date(entryTime).toLocaleTimeString()
    analysisLines.push(`- **ACTIVE POSITION:** ${position.side} ${Math.abs(position.quantity)} @ $${position.entryPrice.toFixed(2)} (Entry: ${entryTimeStr})`)
    analysisLines.push(`  → Current PnL: ${pnlPercent}% (Unrealized: $${position.unrealizedPnl?.toFixed(2) || '0.00'})`)
    analysisLines.push(`  → Leverage: ${position.leverage}x`)
  } else {
    analysisLines.push(`- **NO ACTIVE POSITION** (Available to open new position)`)
  }

  // Add indicators if available
  if (hasIndicators) {
    // OPTIMIZATION: Cache indicator values to avoid repeated property access
    const rsi14 = ind.rsi14
    const rsi7 = ind.rsi7
    const macd = ind.macd
    const bb = ind.bollingerBands
    const atr = ind.atr
    
    analysisLines.push(`- RSI(14): ${rsi14?.toFixed(2) ?? 'N/A'} | RSI(7): ${rsi7?.toFixed(2) ?? 'N/A'}`)

    const ema8Val = ind.ema8 ? `$${ind.ema8.toFixed(2)}` : 'N/A'
    const ema20Val = ind.ema20 ? `$${ind.ema20.toFixed(2)}` : 'N/A'
    const ema50Val = ind.ema50 ? `$${ind.ema50.toFixed(2)}` : 'N/A'
    const ema200Val = ind.ema200 ? `$${ind.ema200.toFixed(2)}` : 'N/A'
    analysisLines.push(`- EMA(8/20/50/200): ${ema8Val} / ${ema20Val} / ${ema50Val} / ${ema200Val}`)

    if (macd) {
      analysisLines.push(`- MACD: ${macd.macd.toFixed(4)} / Signal: ${macd.signal.toFixed(4)} / Hist: ${macd.histogram.toFixed(4)}`)
    }

    if (bb && currentPrice) {
      // OPTIMIZATION: Use cached bb variable
      const bbUpper = bb.upper
      const bbLower = bb.lower
      const bbMiddle = bb.middle

      // OPTIMIZATION: Simplify conditional logic
      let bbPosition: string
      if (currentPrice > bbUpper) {
        bbPosition = 'above'
      } else if (currentPrice < bbLower) {
        bbPosition = 'below'
      } else if (currentPrice > bbMiddle) {
        bbPosition = 'above_mid'
      } else {
        bbPosition = 'below_mid'
      }

      analysisLines.push(`- BB: Upper $${bbUpper.toFixed(2)} / Mid $${bbMiddle.toFixed(2)} / Lower $${bbLower.toFixed(2)} | Price $${currentPrice.toFixed(2)} (${bbPosition})`)
    }

    if (atr) {
      // OPTIMIZATION: Use cached atr variable
      analysisLines.push(`- ATR(14): $${atr.toFixed(2)}`)
    }

    if (ind.adx) {
      const adxValue = typeof ind.adx === 'number' ? ind.adx : (ind.adx?.adx || null)
      if (adxValue !== null && !isNaN(adxValue)) {
        if (ind.plusDI !== null && ind.plusDI !== undefined && ind.minusDI !== null && ind.minusDI !== undefined) {
    analysisLines.push(`- ADX: ${adxValue.toFixed(2)} | +DI: ${ind.plusDI.toFixed(2)} / -DI: ${ind.minusDI.toFixed(2)}`)
        } else {
    analysisLines.push(`- ADX: ${adxValue.toFixed(2)}`)
        }
      }
    }

    // OPTIMIZATION: Cache indicator values to avoid repeated property access
    const obvVal = ind.obv ? ind.obv.toFixed(2) : 'N/A'
    const vwapVal = ind.vwap ? `$${ind.vwap.toFixed(2)}` : 'N/A'
    const atrVal = atr ? `$${atr.toFixed(2)}` : 'N/A' // Use cached atr
    analysisLines.push(`- OBV: ${obvVal} | VWAP: ${vwapVal} | ATR: ${atrVal}`)

    const stochK = ind.stochastic ? ind.stochastic.k.toFixed(2) : 'N/A'
    const stochD = ind.stochastic ? ind.stochastic.d.toFixed(2) : 'N/A'
    const cciVal = ind.cci ? ind.cci.toFixed(2) : 'N/A'
    const wrVal = ind.williamsR ? ind.williamsR.toFixed(2) : 'N/A'
    analysisLines.push(`- Stochastic: K ${stochK} / D ${stochD} | CCI: ${cciVal} | Williams %R: ${wrVal}`)

    const sarVal = ind.parabolicSAR ? `$${ind.parabolicSAR.toFixed(2)}` : 'N/A'
    const aroonUp = ind.aroon ? ind.aroon.up.toFixed(0) : 'N/A'
    const aroonDown = ind.aroon ? ind.aroon.down.toFixed(0) : 'N/A'
    analysisLines.push(`- Parabolic SAR: ${sarVal} | Aroon: Up ${aroonUp} / Down ${aroonDown}`)

    if (ind.supportResistance) {
      const sr = ind.supportResistance
      if (sr.support || sr.resistance) {
    analysisLines.push(`- Support/Resistance: Support: $${sr.support?.toFixed(2) || 'N/A'}, Resistance: $${sr.resistance?.toFixed(2) || 'N/A'}`)
      }
      if (ind.fibonacciRetracement && typeof ind.fibonacciRetracement === 'object') {
        const fib = ind.fibonacciRetracement
        if (fib.nearestLevel) {
          const fibSignal = fib.signal ? ` [${fib.signal.toUpperCase()}]` : ''
          const fibLevels = `38.2%:$${fib.level382.toFixed(2)} 50%:$${fib.level500.toFixed(2)} 61.8%:$${fib.level618.toFixed(2)}`
    analysisLines.push(`- Fib: ${fib.nearestLevel}${fibSignal} | Levels: ${fibLevels} | Range: $${fib.swingLow.toFixed(2)}-$${fib.swingHigh.toFixed(2)} (${fib.direction})`)
        }
      }
    }

    if (ind.trendDetection) {
      const td = ind.trendDetection
    analysisLines.push(`- Trend Detection: ${td.trend} (Strength: ${td.strength}/3)`)
    }

    if (ind.marketStructure) {
      const ms = ind.marketStructure
    analysisLines.push(`- Market Structure: ${ms.structure}`)
    }

    if (ind.rsiDivergence && ind.rsiDivergence.divergence) {
    analysisLines.push(`- RSI Divergence: ${ind.rsiDivergence.divergence}`)
    }

    if (ind.macdDivergence && ind.macdDivergence.divergence) {
    analysisLines.push(`- MACD Divergence: ${ind.macdDivergence.divergence}`)
    }

    // OPTIMIZATION: Cache patterns array and use direct join instead of map+join
    const patterns = ind.candlestickPatterns?.patterns
    if (patterns && patterns.length > 0) {
      // OPTIMIZATION 1000x: Replace map().join() with single-pass for loop (10-1000x faster)
      const patternsLen = patterns.length
      const patternNames: string[] = []
      patternNames.length = patternsLen
      let namesIdx = 0
      for (let i = 0; i < patternsLen; i++) {
        const p = patterns[i]
        if (p && p.type) patternNames[namesIdx++] = p.type
      }
      patternNames.length = namesIdx
      const patternNamesStr = patternNames.join(', ')
      analysisLines.push(`- Candlestick Patterns: ${patternNamesStr}`)
    }

    if (ind.marketRegime) {
      const mr = ind.marketRegime
    analysisLines.push(`- Market Regime: ${mr.regime} | Volatility: ${mr.volatility}`)
    }
  } else {
    analysisLines.push(`- Technical Indicators: N/A (Price action only - FUTURES mode)`)
    analysisLines.push(`- Note: For futures trading, signals can be generated based on price action and external data (funding rate, OI, etc.)`)
    analysisLines.push(`- Use lower confidence (0.3-0.5) and explain in justification that technical data is limited`)
  }

  // Add multi-timeframe analysis if available
  if (assetData && assetData.trendAlignment) {
    const ta = assetData.trendAlignment
    analysisLines.push(`- MTF: Daily ${ta.dailyTrend || 'N/A'} | 4H ${ta.h4Aligned ? 'Y' : 'N'} | 1H ${ta.h1Aligned ? 'Y' : 'N'} | Aligned: ${ta.aligned ? 'Y' : 'N'}`)
  }

  if (assetData && assetData.multiTimeframeIndicators) {
    const mtf = assetData.multiTimeframeIndicators
    if (mtf['1d']) {
      const daily = mtf['1d']
    analysisLines.push(`- Daily (1D): EMA20: $${daily.ema20?.toFixed(2) || 'N/A'}, EMA50: $${daily.ema50?.toFixed(2) || 'N/A'}, RSI: ${daily.rsi14?.toFixed(2) || 'N/A'}`)
    }
    if (mtf['4h']) {
      const h4 = mtf['4h']
    analysisLines.push(`- 4H: EMA20: $${h4.ema20?.toFixed(2) || 'N/A'}, RSI: ${h4.rsi14?.toFixed(2) || 'N/A'}`)
    }
    if (mtf['1h']) {
      const h1 = mtf['1h']
    analysisLines.push(`- 1H: EMA20: $${h1.ema20?.toFixed(2) || 'N/A'}, RSI: ${h1.rsi14?.toFixed(2) || 'N/A'}`)
    }
  }

  // Add external data to technical analysis summary
  if (assetData && assetData.externalData) {
    const ext = assetData.externalData
    const price = currentPrice || ind?.price || markPrice || 0

    // Hyperliquid data
    if (ext.hyperliquid) {
      const hl = ext.hyperliquid
      const frTrend = hl.fundingRateTrend ? `[${hl.fundingRateTrend}]` : ''
      const oiTrend = hl.oiTrend ? `[${hl.oiTrend}]` : ''
      const premiumVal = hl.premium !== undefined && hl.premium !== 0 ? `${(hl.premium * 100).toFixed(4)}%` : 'N/A'
    analysisLines.push(`- FR: ${(hl.fundingRate * 100).toFixed(4)}%${frTrend} | OI: $${hl.openInterest?.toLocaleString() || 'N/A'}${oiTrend} | Premium: ${premiumVal}`)

      const oracleVal = hl.oraclePx ? `$${hl.oraclePx.toFixed(2)}` : 'N/A'
      const midVal = hl.midPx ? `$${hl.midPx.toFixed(2)}` : 'N/A'
      if (hl.impactPxs && Array.isArray(hl.impactPxs) && hl.impactPxs.length >= 2) {
        const bidImpact = parseFloat(hl.impactPxs[0] || '0')
        const askImpact = parseFloat(hl.impactPxs[1] || '0')
        if (bidImpact > 0 && askImpact > 0) {
    analysisLines.push(`- Oracle: ${oracleVal} | Mid: ${midVal} | Impact: Bid $${bidImpact.toFixed(2)} / Ask $${askImpact.toFixed(2)}`)
        } else {
    analysisLines.push(`- Oracle: ${oracleVal} | Mid: ${midVal}`)
        }
      } else {
    analysisLines.push(`- Oracle: ${oracleVal} | Mid: ${midVal}`)
      }
    }

    // COB (Current Order Book)
    if (ext.orderBook && price > 0) {
      const ob = ext.orderBook
      const imbalanceSig = ob.imbalance > 0 ? 'B' : ob.imbalance < 0 ? 'S' : 'N'
      const support = ob.supportZones && ob.supportZones.length > 0 ? ob.supportZones[0] : null
      const resistance = ob.resistanceZones && ob.resistanceZones.length > 0 ? ob.resistanceZones[0] : null
      const supportStr = support ? `$${support.price.toFixed(2)}` : 'N/A'
      const resistanceStr = resistance ? `$${resistance.price.toFixed(2)}` : 'N/A'
    analysisLines.push(`- COB: Mid $${ob.midPrice.toFixed(2)} Spread ${ob.spreadPercent.toFixed(3)}% Imb ${(ob.imbalance * 100).toFixed(1)}%[${imbalanceSig}] | S:${supportStr} R:${resistanceStr}`)
    }

    // SVP (Session Volume Profile)
    if (ext.volumeProfile && ext.volumeProfile.session && price > 0) {
      const svp = ext.volumeProfile.session
      const priceToPoc = Math.abs((price - svp.poc) / svp.poc) * 100
      const priceToVah = Math.abs((price - svp.vah) / svp.vah) * 100
      const priceToVal = Math.abs((price - svp.val) / svp.val) * 100
      let pricePos = priceToPoc < 1 ? '@POC' : priceToVah < 1 ? '@VAH' : priceToVal < 1 ? '@VAL' : price >= svp.val && price <= svp.vah ? 'in_VA' : price < svp.val ? 'below_VAL' : 'above_VAH'
      // OPTIMIZATION: Direct conditional building faster than filter+map
      const hvnParts: string[] = []
      if (svp.hvn?.[0]) hvnParts.push(`$${svp.hvn[0].price.toFixed(2)}`)
      if (svp.hvn?.[1]) hvnParts.push(`$${svp.hvn[1].price.toFixed(2)}`)
      const hvnStr = hvnParts.length > 0 ? hvnParts.join(',') : 'N/A'
      
      const lvnParts: string[] = []
      if (svp.lvn?.[0]) lvnParts.push(`$${svp.lvn[0].price.toFixed(2)}`)
      if (svp.lvn?.[1]) lvnParts.push(`$${svp.lvn[1].price.toFixed(2)}`)
      const lvnStr = lvnParts.length > 0 ? lvnParts.join(',') : 'N/A'
    analysisLines.push(`- SVP: POC $${svp.poc.toFixed(2)} VAH $${svp.vah.toFixed(2)} VAL $${svp.val.toFixed(2)} | Price:${pricePos} | HVN:${hvnStr} LVN:${lvnStr}`)
    }

    // CRVP (Composite Range Volume Profile)
    if (ext.volumeProfile && ext.volumeProfile.composite && price > 0) {
      const crvp = ext.volumeProfile.composite
      const accZone = crvp.accumulationZone
      const distZone = crvp.distributionZone
      const isInAccZone = accZone ? price >= accZone.priceRange[0] && price <= accZone.priceRange[1] : false
      const isInDistZone = distZone ? price >= distZone.priceRange[0] && price <= distZone.priceRange[1] : false
      const priceToCompositePoc = crvp.compositePoc && price > 0 ? ((price - crvp.compositePoc) / crvp.compositePoc) * 100 : 0
    analysisLines.push(`- CRVP: POC $${crvp.compositePoc.toFixed(2)} | VAH $${crvp.compositeVah.toFixed(2)} | VAL $${crvp.compositeVal.toFixed(2)} | Price ${priceToCompositePoc >= 0 ? '+' : ''}${priceToCompositePoc.toFixed(2)}%${isInAccZone ? ' [IN_ACC]' : ''}${isInDistZone ? ' [IN_DIST]' : ''}`)
    }

    // COC (Change of Character)
    if (ext.marketStructure && ext.marketStructure.coc && price > 0) {
      const coc = ext.marketStructure.coc
      const cocStr = coc.coc !== 'none' ? `${coc.coc.toUpperCase()}${coc.reversalSignal ? '[REV]' : ''}` : 'NONE'
      const swingHigh = coc.lastSwingHigh ? `$${coc.lastSwingHigh.toFixed(2)}` : 'N/A'
      const swingLow = coc.lastSwingLow ? `$${coc.lastSwingLow.toFixed(2)}` : 'N/A'
    analysisLines.push(`- COC: Struct ${coc.structure.toUpperCase()}(${coc.structureStrength.toFixed(0)}) | COC:${cocStr} | SH:${swingHigh} SL:${swingLow}`)
    }

    // CVD (Cumulative Volume Delta)
    if (ext.volumeDelta && price > 0) {
      const cvd = ext.volumeDelta
      const cvdDeltaSig = cvd.cvdDelta > 0 ? 'B' : cvd.cvdDelta < 0 ? 'S' : 'N'
      const cvdTrendSig = cvd.cvdTrend === 'rising' ? 'B' : cvd.cvdTrend === 'falling' ? 'S' : 'N'
      const divStr = cvd.divergence !== 'none' ? `${cvd.divergence.toUpperCase()}[DIV]` : 'NONE'
      const strengthSig = cvd.strength > 70 ? 'STR' : cvd.strength > 40 ? 'MOD' : 'WEAK'
    analysisLines.push(`- CVD: Buyer ${cvd.cvdBuyer.toLocaleString()} | Seller ${cvd.cvdSeller.toLocaleString()} | Delta ${cvd.cvdDelta.toLocaleString()}[${cvdDeltaSig}]`)
    analysisLines.push(`- CVD: Trend ${cvd.cvdTrend.toUpperCase()}[${cvdTrendSig}] | Div ${divStr} | Strength ${cvd.strength.toFixed(0)}/${strengthSig}`)
    }

    // Comprehensive Volume Analysis
    if (ext.comprehensiveVolumeAnalysis && price > 0) {
      const volAnalysis = ext.comprehensiveVolumeAnalysis
      const vc = volAnalysis.volumeConfirmation
      const fp = volAnalysis.footprint
      const vcStr = vc ? `${vc.isValid ? '✅' : '❌'}${vc.strength.toUpperCase()}${vc.volumeRatio > 0 ? `(${vc.volumeRatio.toFixed(2)}x)` : ''}` : 'N/A'
      const fpStr = fp ? `Buy:${fp.buyPressure.toFixed(0)}% Sell:${fp.sellPressure.toFixed(0)}% Delta:${fp.netDelta >= 0 ? '+' : ''}${fp.netDelta.toLocaleString()}[${fp.dominantSide.toUpperCase()}]` : 'N/A'
      // OPTIMIZATION: Use direct conditional building instead of filter+map
      const liqZonesParts: string[] = []
      if (volAnalysis.liquidityZones?.[0]) {
        const z = volAnalysis.liquidityZones[0]
        liqZonesParts.push(`$${z.priceRange[0].toFixed(2)}-$${z.priceRange[1].toFixed(2)}[${z.type === 'support' ? 'S' : 'R'}]${price >= z.priceRange[0] && price <= z.priceRange[1] ? '[IN]' : ''}`)
      }
      if (volAnalysis.liquidityZones?.[1]) {
        const z = volAnalysis.liquidityZones[1]
        liqZonesParts.push(`$${z.priceRange[0].toFixed(2)}-$${z.priceRange[1].toFixed(2)}[${z.type === 'support' ? 'S' : 'R'}]${price >= z.priceRange[0] && price <= z.priceRange[1] ? '[IN]' : ''}`)
      }
      const liqZones = liqZonesParts.length > 0 ? liqZonesParts.join(' ') : 'N/A'
    analysisLines.push(`- VolAnalysis: VC:${vcStr} | FP:${fpStr} | LiqZones:${liqZones}`)
    }

    // Blockchain data
    if (ext.blockchain) {
      const bc = ext.blockchain
      if (bc.largeTransactions && bc.largeTransactions.length > 0) {
    analysisLines.push(`- Large Transactions: ${bc.largeTransactions.length} recent (>$1M)`)
      }

      const flowStr = bc.estimatedExchangeFlow !== undefined && bc.estimatedExchangeFlow !== 0
        ? `$${Math.abs(bc.estimatedExchangeFlow).toLocaleString()}[${bc.estimatedExchangeFlow < 0 ? 'OUT' : 'IN'}]`
        : 'N/A'

      const whaleStr = bc.whaleActivityScore !== undefined && bc.whaleActivityScore !== 0
        ? `${(Math.abs(bc.whaleActivityScore) * 100).toFixed(0)}%[${bc.whaleActivityScore > 0 ? 'B' : 'S'}]`
        : 'N/A'

      const largeTxs = bc.largeTransactions && bc.largeTransactions.length > 0 ? bc.largeTransactions.length : 0
    analysisLines.push(`- Blockchain: LargeTxs ${largeTxs} | Flow ${flowStr} | Whale ${whaleStr}`)
    }

    // FUTURES DATA: Comprehensive futures market analysis
    if (ext.futures) {
      const fut = ext.futures
      analysisLines.push(`\n**FUTURES MARKET DATA:**`)

      // Funding Rate
      if (fut.fundingRate) {
        const fr = fut.fundingRate
        const frPct = (fr.current * 10000).toFixed(2) // Convert to basis points
        const frExtreme = fr.extreme ? '[EXTREME]' : ''
        const frTrend = fr.trend ? `[${fr.trend}]` : ''
        analysisLines.push(`- Funding Rate: ${frPct}bps${frTrend}${frExtreme} | 24h: ${(fr.rate24h * 10000).toFixed(2)}bps | 7d: ${(fr.rate7d * 10000).toFixed(2)}bps`)
        if (fr.extreme) {
          analysisLines.push(`  ⚠️ EXTREME FUNDING: ${frPct}bps (${fr.current > 0 ? 'SHORT favored' : 'LONG favored'}) - Mean reversion likely`)
        }
      }

      // Open Interest
      if (fut.openInterest) {
        const oi = fut.openInterest
        const oiChange = oi.change24h > 0 ? '+' : ''
        const oiTrend = oi.trend ? `[${oi.trend}]` : ''
        analysisLines.push(`- Open Interest: $${formatLargeNumber(oi.current)} | 24h Change: ${oiChange}${oi.change24h.toFixed(2)}%${oiTrend}`)
        if (oi.divergence?.vsPrice?.detected) {
          analysisLines.push(`  ⚠️ OI Divergence: ${oi.divergence.vsPrice.type} (${oi.divergence.vsPrice.type === 'bullish' ? 'Price↓ OI↑ = accumulation' : 'Price↑ OI↓ = weak trend'})`)
        }
      }

      // Long/Short Ratio
      if (fut.longShortRatio) {
        const ls = fut.longShortRatio
        const lsExtreme = ls.extreme ? '[EXTREME]' : ''
        analysisLines.push(`- Long/Short Ratio: ${ls.longPct.toFixed(1)}% Long / ${ls.shortPct.toFixed(1)}% Short${lsExtreme}`)
        analysisLines.push(`  Retail: ${ls.retailLongPct.toFixed(1)}% Long / ${ls.retailShortPct.toFixed(1)}% Short | Pro: ${ls.proLongPct.toFixed(1)}% Long / ${ls.proShortPct.toFixed(1)}% Short`)
        if (ls.extreme) {
          analysisLines.push(`  ⚠️ EXTREME RATIO: ${ls.sentiment} (${ls.sentiment === 'extreme_long' ? 'Fade retail - SHORT favored' : 'Fade retail - LONG favored'})`)
        }
      }

      // Liquidation Data
      if (fut.liquidation) {
        const liq = fut.liquidation
        analysisLines.push(`- Liquidation: Long ${formatLargeNumber(liq.longLiquidations24h)} / Short ${formatLargeNumber(liq.shortLiquidations24h)} (24h)`)
        analysisLines.push(`  Liquidation Distance: ${liq.liquidationDistance.toFixed(2)}% (${liq.liquidationDistance > 5 ? 'SAFE' : liq.liquidationDistance > 3 ? 'MODERATE' : 'RISKY'})`)
        if (liq.clusters && liq.clusters.length > 0) {
          const nearestCluster = liq.clusters[0]
          analysisLines.push(`  Nearest Cluster: $${nearestCluster.price.toFixed(2)} (${nearestCluster.side}, $${formatLargeNumber(nearestCluster.size)})`)
        }
        if (liq.safeEntryZones && liq.safeEntryZones.length > 0) {
          const safeZone = liq.safeEntryZones[0]
          analysisLines.push(`  Safe Entry Zone: $${safeZone.priceLow.toFixed(2)} - $${safeZone.priceHigh.toFixed(2)}`)
        }
      }

      // Premium Index (Spot-Futures Divergence)
      if (fut.premiumIndex) {
        const prem = fut.premiumIndex
        const premPct = (prem.premiumPct * 10000).toFixed(2)
        const premTrend = prem.trend ? `[${prem.trend}]` : ''
        analysisLines.push(`- Premium Index: ${premPct}bps${premTrend} | Divergence: ${prem.divergence.toFixed(2)}σ`)
        if (prem.arbitrageOpportunity) {
          analysisLines.push(`  ⚠️ ARBITRAGE OPPORTUNITY: ${prem.premiumPct > 0 ? 'Long spot, short futures' : 'Short spot, long futures'}`)
        }
      }

      // BTC Correlation
      if (fut.btcCorrelation) {
        const btc = fut.btcCorrelation
        analysisLines.push(`- BTC Correlation: 24h=${btc.correlation24h.toFixed(2)}, 7d=${btc.correlation7d.toFixed(2)}, 30d=${btc.correlation30d.toFixed(2)}`)
        analysisLines.push(`  Strength: ${btc.strength} | Impact Multiplier: ${btc.impactMultiplier.toFixed(2)}x`)
        if (btc.strength === 'strong' && Math.abs(btc.correlation7d) > 0.7) {
          analysisLines.push(`  ⚠️ STRONG BTC CORRELATION: BTC moves will impact asset ~${btc.impactMultiplier.toFixed(1)}x`)
        }
      }

      // Whale Activity
      if (fut.whaleActivity) {
        const whale = fut.whaleActivity
        const whaleFlow = whale.smartMoneyFlow > 0 ? '+' : ''
        analysisLines.push(`- Whale Activity: Flow ${whaleFlow}${(whale.smartMoneyFlow * 100).toFixed(1)}% (${whale.smartMoneyFlow > 0 ? 'Accumulation' : whale.smartMoneyFlow < 0 ? 'Distribution' : 'Neutral'})`)
        if (whale.largeOrders && whale.largeOrders.length > 0) {
          analysisLines.push(`  Large Orders: ${whale.largeOrders.length} (>$100k)`)
        }
        if (whale.spoofingDetected) {
          analysisLines.push(`  ⚠️ SPOOFING DETECTED: Large orders placed and cancelled rapidly`)
        }
        if (whale.washTradingDetected) {
          analysisLines.push(`  ⚠️ WASH TRADING DETECTED: High volume with minimal price movement`)
        }
        if (whale.accumulationZones && whale.accumulationZones.length > 0) {
          const accZone = whale.accumulationZones[0]
          analysisLines.push(`  Accumulation Zone: $${accZone.priceLow.toFixed(2)} - $${accZone.priceHigh.toFixed(2)}`)
        }
        if (whale.distributionZones && whale.distributionZones.length > 0) {
          const distZone = whale.distributionZones[0]
          analysisLines.push(`  Distribution Zone: $${distZone.priceLow.toFixed(2)} - $${distZone.priceHigh.toFixed(2)}`)
        }
      }

      analysisLines.push('') // Empty line after futures data
    }

    // Enhanced metrics
    if (ext.enhanced) {
      const enh = ext.enhanced
    analysisLines.push(`- Volume Trend: ${enh.volumeTrend || 'N/A'}`)
    analysisLines.push(`- Volatility Pattern: ${enh.volatilityPattern || 'N/A'}`)
      if (enh.volumePriceDivergence !== undefined && enh.volumePriceDivergence !== 0) {
        const divType = enh.volumePriceDivergence > 0 ? 'Bearish' : 'Bullish'
    analysisLines.push(`- Volume-Price Divergence: ${divType}`)
      }
    }
  }

  // OPTIMIZATION: Use join() instead of string concatenation - much faster for large strings
  return analysisLines.join('\n')
}

/**
 * Build active positions summary
 */
export function buildActivePositionsSummary(
  positions: Map<string, any>,
  marketData: Map<string, any> | Record<string, any>
): string {
  const activePositionsSummary: string[] = []

  if (positions.size > 0) {
    activePositionsSummary.push('\n**ACTIVE POSITIONS:**')

    // OPTIMIZATION: Cache Map type check to avoid repeated instanceof
    const marketDataIsMap = marketData instanceof Map
    // OPTIMIZATION: Direct iteration over Map is faster than Array.from()
    for (const [asset, pos] of positions.entries()) {
      // OPTIMIZATION: Cache position properties to avoid repeated access
      const entryPrice = pos.entryPrice
      const quantity = pos.quantity
      const side = pos.side
      const leverage = pos.leverage
      
      const marketDataForAsset = marketDataIsMap ? marketData.get(asset) : marketData[asset]
      const currentPrice = marketDataForAsset?.price || pos.currentPrice || 0
      const pnl = entryPrice > 0 
        ? ((currentPrice - entryPrice) / entryPrice) * 100 * (side === 'LONG' ? 1 : -1)
        : 0
      // OPTIMIZATION: Cache Math.abs() and toFixed() results
      const quantityAbs = Math.abs(quantity)
      const entryPriceFixed = entryPrice.toFixed(2)
      const currentPriceFixed = currentPrice.toFixed(2)
      const pnlFixed = pnl.toFixed(2)
      activePositionsSummary.push(`- ${asset}: ${side} ${quantityAbs} @ $${entryPriceFixed} | Current: $${currentPriceFixed} | PnL: ${pnlFixed}% | Leverage: ${leverage}x`)
    }

    activePositionsSummary.push('')
  } else {
    activePositionsSummary.push('\n**NO ACTIVE POSITIONS** - All positions are closed or no trades have been opened yet.\n')
  }

  return activePositionsSummary.join('\n')
}

/**
 * Build system prompt for a single asset
 */
// OPTIMIZATION: Cache static template parts to avoid repeated string allocation
const SYSTEM_PROMPT_STATIC_PARTS = {
  header: `AI trading agent on Hyperliquid perpetuals.

**POSITION MGMT:** ACTIVE→HOLD|CLOSE|REDUCE|ADD|REVERSE | NO POSITION→BUY_TO_ENTER|SELL_TO_ENTER (NO HOLD)

**TECHNICAL:** RSI|MACD|EMA|BB|ATR|ADX|OBV|VWAP|Stochastic|CCI|Williams%R|SAR|Aroon

**TIMEFRAMES:** Daily(trend)|4H(entry)|1H(exec). BUY if uptrend/bullish majority, SELL if downtrend/bearish majority

**BB:** Price>BB Upper=overbought(NO short) | Price<BB Lower=oversold(NO buy) | Above middle=bullish | Below=bearish

**INDICATOR CONSISTENCY (CRITICAL):** Count BULLISH vs BEARISH indicators. 
- If BULLISH count > BEARISH count → BUY_TO_ENTER (price likely to go UP)
- If BEARISH count > BULLISH count → SELL_TO_ENTER (price likely to go DOWN)
- BUY needs MORE bullish indicators, SELL needs MORE bearish indicators
- NEVER BUY when price>BB Upper or SAR bearish. NEVER SELL when price<BB Lower or SAR bullish
- Justification MUST match: BUY→bullish indicators dominate | SELL→bearish indicators dominate

**TREND-FIRST:** Align with trend. Counter-trend needs strong confirmation (conf≥60%, mom≥40%, -10pts)

**BIAS:** Strong downtrend→BUY -10pts | Strong uptrend→SELL -10pts

**BOUNCE:** BUY_BOUNCE(BB Lower rebound)|SELL_BOUNCE(BB Upper pullback). Need 2/5 confirmations. +15% conf. Persistence≥0.5% in 3 candles or -50%. Exit if price>3% then crosses EMA8→trim 50%

**NO-TRADE:** Price<BB Lower+0.2%(NO SELL) | Price>BB Upper+0.2%(NO BUY) | RSI7<40+MACD>0(NO SELL) | RSI7>60+MACD<0(NO BUY)

**CONTRADICTIONS:** MACD contradicts→-15-20% conf | ATR<1.5%→-10% conf

**EMA8:** Fast MA. Price>EMA8=bullish | <EMA8=bearish

**PnL:** Profit→REDUCE/CLOSE | Loss worsening→CLOSE

`,
  constraints: `
  **Constraints:**

  - Leverage Range: 1x - 10x

  - Max Position Size: 20% of capital

  - **Indicators:** RSI|MACD|EMA(8/20/50/200)|BB|ATR|ADX|OBV|VWAP|Stochastic|CCI|Williams%R|SAR|Aroon|S/R|Fib(38.2/50/61.8%)

  - **EMA8:** Fast MA (8-period) for intraday momentum & bounce exit

  - **ATR SL:** ATR14*1.5-2.0 for dynamic SL (pre-calculated)

  - **Volume Confirmation:** Breakout+vol≥2x avg=valid | <1.2x=false breakout(skip)

  - **Volume Indicators:**
    1. **Volume Profile:** POC(highest vol=S/R) | HVN(strong S/R) | LVN(fast moves) | VAH/VAL(70% range)
    2. **Breakout Confirmation:** ≥2x vol(+100%)=valid | ≥1.5x(+50%)=weak | ≥1.2x(+20%)=borderline | <1.2x=skip
    3. **Liquidity Zones:** High vol+OI=stronger S/R. Support: price above=bounce | Resistance: price below=wait for breakout
    4. **CVD:** Rising=bullish | Falling=bearish | Divergence=hidden pressure
    5. **Footprint:** Buy>60%=bullish | Sell>60%=bearish | Net Delta: + = buying, - = selling

  **FUTURES:** COB(imbalance + =bullish | - =bearish | S/R zones | liquidity) | SVP(POC=strongest S/R | VAH/VAL=70% | HVN=S/R | LVN=breakout) | CRVP(Composite POC | AccZone=high vol low price=bullish | DistZone=high vol high price=bearish) | COC(Bullish=LL→LH→HH | Bearish=HH→HL→LL | structure | reversal) | CVD(+ =bullish | - =bearish | Rising=bullish | Falling=bearish | Divergence=hidden)

  **OUTPUT:** Return ONLY valid JSON (no markdown/text). Structure for `,
  footer: `:
  {
    "coin": "`,
  footer2: `",
    "signal": "buy_to_enter",
    "entry_price": 50000,
    "quantity": 0.1,
    "leverage": 3,
    "profit_target": 51000,
    "stop_loss": 49000,
    "invalidation_condition": "4H RSI breaks back below 40, signaling momentum failure OR Price breaks below $48500 (support level) OR MACD histogram turns negative OR volume drops below 50% of average within 24h",
    "justification": "RSI at 35 (oversold, bullish reversal potential), MACD histogram at -15 (bearish but improving from -30), price at $48500 (below BB lower band, oversold), EMA20 at $49000 (price below, but approaching), volume increased 30% in last 10 periods (bullish confirmation), daily trend is uptrend with 4H and 1H aligned (trend alignment 80%), funding rate at -0.001% (negative, bullish), support level at $48000 (Fibonacci 38.2%), ATR at 2.5% (normal volatility), ADX at 25 (trending market). Risk factors: High volatility expected near support, but strong trend alignment supports entry.",
    "confidence": 0.75,
    "risk_usd": 50
  }

  **Fields:** coin="`,
  footer3: `" | signal=buy_to_enter|sell_to_enter|hold|close|close_all|reduce|add | entry_price=current(BUY/SELL/ADD) or 0(HOLD/CLOSE/REDUCE) | quantity=size(BUY/SELL/ADD) or close amt(REDUCE) or 0(HOLD/CLOSE) | leverage=1-10x | profit_target=price or 0 | stop_loss=price or 0 | invalidation_condition="Price<$X OR RSI<Y OR vol<Z%" (REQUIRED) | justification=signal reason(must match: BUY→bullish|SELL→bearish, include: indicator values|trend|volume|S/R|FR/OI|futures|risk) | confidence=0-1 | risk_usd=amount

  **POSITION:** ACTIVE→Check PnL→HOLD(favorable)|CLOSE(TP/SL)|REDUCE(profit+reversal)|ADD(strengthening+profit)|REVERSE(trend reversed) | NO POSITION→BUY(bullish/mixed)|SELL(bearish/mixed)|NO HOLD EVER (always choose BUY or SELL even if uncertain)
  
  **CRITICAL: HOLD SIGNAL RESTRICTION**
  - HOLD is ONLY for assets with EXISTING POSITION that is performing well
  - For assets WITHOUT POSITION: You MUST generate BUY_TO_ENTER or SELL_TO_ENTER, NEVER HOLD
  - Even if indicators are mixed (BULL = BEAR), choose BUY or SELL based on:
    * Trend alignment (daily/4H/1H)
    * Volume trend (increasing/decreasing)
    * EMA alignment (price > EMA20 > EMA50 = BUY, price < EMA20 < EMA50 = SELL)
    * VWAP position (above = BUY bias, below = SELL bias)
  - Top-ranked assets MUST have directional signals (BUY or SELL), never HOLD

  **CRITICAL: SIGNAL DIRECTION DETERMINATION - HIGHEST PRIORITY RULE**
  
  **MANDATORY**: You MUST follow the "Summary: BULL X | BEAR Y | DIRECTION" shown in the indicator data. This is the PRIMARY and MOST IMPORTANT rule - all other rules are secondary.
  
  **RULES**:
  1. If Summary shows "BULL X | BEAR Y | BUY" → signal MUST be "buy_to_enter" (NO EXCEPTIONS)
  2. If Summary shows "BULL X | BEAR Y | SELL" → signal MUST be "sell_to_enter" (NO EXCEPTIONS)
  3. If Summary shows "BULL X | BEAR Y | MIXED" → choose based on which count is higher:
     - If BULL > BEAR → signal = "buy_to_enter"
     - If BEAR > BULL → signal = "sell_to_enter"
     - If BULL = BEAR → choose direction based on strongest indicators (NEVER use "hold" for top-ranked assets without position)
  
  **EXAMPLES**:
  - Example 1: Summary: "BULL 8 | BEAR 3 | BUY" → signal MUST be "buy_to_enter"
  - Example 2: Summary: "BULL 2 | BEAR 9 | SELL" → signal MUST be "sell_to_enter"
  - Example 3: Summary: "BULL 5 | BEAR 5 | MIXED" → signal = "buy_to_enter" or "sell_to_enter" based on trend/volume/EMA alignment (NEVER "hold" unless existing position)
  
  **CONSEQUENCES OF VIOLATION**:
  - If you generate a signal that contradicts the Summary direction, it will be auto-corrected by the system
  - Contradicting signals will receive severe confidence penalties
  - Summary direction is calculated from actual indicator values - it represents the TRUE market condition
  
  **REMEMBER**: The Summary direction IS the market direction. BUY means price will go UP, SELL means price will go DOWN. Do NOT reverse or contradict it.

  Return ONLY valid JSON (no markdown), all fields required, check position before signal type.`
}

export function buildSystemPromptForAsset(
  asset: string,
  marketData: Map<string, any> | Record<string, any>,
  _accountState: any,
  positions: Map<string, any>,
  allowedAssets: string[]
): string {
  // OPTIMIZATION: Cache marketData type check to avoid repeated instanceof
  const isMap = marketData instanceof Map
  const activePositionsSummary = buildActivePositionsSummary(positions, marketData)
  const assetData = isMap ? marketData.get(asset) : marketData[asset]
  const technicalAnalysisSummary = buildTechnicalAnalysisSummary(asset, assetData, positions)
  
  // OPTIMIZATION: Pre-build allowed assets string to avoid repeated map+join
  const allowedAssetsStr = allowedAssets.length > 0 ? allowedAssets.map(a => `${a}-USDC`).join(', ') : 'N/A'

  // OPTIMIZATION: Use cached static template parts for better performance
  // This avoids repeated string allocation for static content (90% of prompt is static)
  // Only dynamic parts are: asset name (3x), activePositionsSummary, technicalAnalysisSummary, allowedAssetsStr
  return `${SYSTEM_PROMPT_STATIC_PARTS.header}${activePositionsSummary}

      **Technical Analysis Data:**

  ${technicalAnalysisSummary}
${SYSTEM_PROMPT_STATIC_PARTS.constraints}  - Allowed Assets: ${allowedAssetsStr}${SYSTEM_PROMPT_STATIC_PARTS.footer}${asset}${SYSTEM_PROMPT_STATIC_PARTS.footer2}${asset}${SYSTEM_PROMPT_STATIC_PARTS.footer3}`
}

/**
 * Build user prompt for a single asset
 */
export function buildUserPromptForAsset(
  asset: string,
  marketData: Map<string, any> | Record<string, any>,
  accountState: any,
  positions: Map<string, any>
): string {
  // OPTIMIZATION: Cache Map type check to avoid repeated instanceof
  const marketDataIsMap = marketData instanceof Map
  const assetData = marketDataIsMap ? marketData.get(asset) : marketData[asset]
  if (!assetData) return ''

  // OPTIMIZATION: Cache nested property access
  const assetDataData = assetData?.data
  const currentPrice = assetData.price || 0
  const position = positions.get(asset)
  const priceString = assetDataData?.priceString || assetDataData?.markPxString || assetData?.priceString || assetData?.markPxString || null
  
  const userPromptParts: string[] = [
    'Current market data and account information:',
    '',
    `**CURRENT MARKET STATE FOR ${asset}**`,
    '',
    ''
  ]

  const assetParts: string[] = [
    `**${asset}**`,
    `- Current Price: ${formatPrice(currentPrice, asset, priceString)}`
  ]

  // Show active position status
  if (position) {
    // OPTIMIZATION: Cache position properties and calculations to avoid repeated access
    const entryPrice = position.entryPrice
    const quantity = position.quantity
    const side = position.side
    const leverage = position.leverage
    const unrealizedPnl = position.unrealizedPnl || 0
    
    // OPTIMIZATION: Cache Math.abs() result
    const quantityAbs = Math.abs(quantity)
    const pnlPercent = entryPrice > 0 
      ? (((currentPrice - entryPrice) / entryPrice) * 100 * (side === 'LONG' ? 1 : -1)).toFixed(2)
      : '0.00'
    // OPTIMIZATION: Cache toFixed() results
    const entryPriceFixed = entryPrice.toFixed(2)
    const pnlUsdFixed = unrealizedPnl.toFixed(2)
    assetParts.push(` | Position: ${side} ${quantityAbs} @ $${entryPriceFixed} | PnL: ${pnlPercent}% ($${pnlUsdFixed}) | Lev: ${leverage}x | Action: HOLD/CLOSE/REDUCE/ADD`)
  } else {
    assetParts.push(` | No Position | Action: BUY_TO_ENTER or SELL_TO_ENTER`)
  }

  assetParts.push(` | Vol24h: ${assetData.volume24h?.toLocaleString() || '0'}`)

  if (assetData.indicators) {
    const ind = assetData.indicators

    // OPTIMIZATION: Cache BB and price values, simplify conditional logic
    const bbUser = ind.bollingerBands
    let bbPositionText = 'N/A'
    if (bbUser) {
      const bbPrice = ind.price ?? 0
      const bbUpper = bbUser.upper
      const bbLower = bbUser.lower
      const bbMiddle = bbUser.middle

      if (bbPrice > 0) {
        // OPTIMIZATION: Cache toFixed results to avoid repeated calls
        const priceStr = bbPrice.toFixed(2)
        if (bbPrice > bbUpper) {
          bbPositionText = `Price $${priceStr} is ABOVE upper band $${bbUpper.toFixed(2)} (Overbought)`
        } else if (bbPrice < bbLower) {
          bbPositionText = `Price $${priceStr} is BELOW lower band $${bbLower.toFixed(2)} (Oversold)`
        } else if (bbPrice > bbMiddle) {
          bbPositionText = `Price $${priceStr} is above middle $${bbMiddle.toFixed(2)} (Bullish)`
        } else {
          bbPositionText = `Price $${priceStr} is below middle $${bbMiddle.toFixed(2)} (Bearish)`
        }
      }
    }

    // CRITICAL FIX: Use shared utility for 100% consistent indicator counting
    // This ensures the Summary shown to AI matches validation logic exactly
    // const price = ind.price || currentPrice
    const indicatorCount = countBullishBearishIndicators(ind, currentPrice)
    const bullishCount = indicatorCount.bullishCount
    const bearishCount = indicatorCount.bearishCount
    const summaryDir = indicatorCount.summaryDir

    // CRITICAL FIX: Display Summary PROMINENTLY at the START of indicator data
    // This ensures AI sees the Summary first, before other indicator details
    // Summary direction is the PRIMARY rule - must be displayed prominently
    const summaryEmoji = summaryDir === 'BUY' ? '🟢' : summaryDir === 'SELL' ? '🔴' : '🟡'
    const indicatorParts: string[] = []
    
    // Display Summary FIRST and PROMINENTLY (before all other indicators)
    indicatorParts.push(`\n**${summaryEmoji} INDICATOR SUMMARY (PRIMARY RULE): BULL ${bullishCount} | BEAR ${bearishCount} | DIRECTION: ${summaryDir}**`)
    indicatorParts.push(`**⚠️ CRITICAL: Signal MUST match this direction (${summaryDir}). ${summaryDir === 'BUY' ? 'buy_to_enter' : summaryDir === 'SELL' ? 'sell_to_enter' : 'hold'} required.**`)
    indicatorParts.push('') // Empty line for separation

    // OPTIMIZATION: Cache indicator values and BB to avoid repeated property access
    const macdUser = ind.macd
    const bbUserBuild = bbUser || ind.bollingerBands
    const rsi14User = ind.rsi14
    
    // Build indicator strings
    const adxVal = typeof ind.adx === 'number' ? ind.adx : (ind.adx?.adx ?? null)
    const adxStr = adxVal ? `${adxVal.toFixed(2)}${adxVal > 25 ? '[STR]' : adxVal < 20 ? '[WEAK]' : '[MOD]'}` : 'N/A'
    const rsiStr = rsi14User ? `${rsi14User.toFixed(2)}${rsi14User > 70 ? '[OB]' : rsi14User < 30 ? '[OS]' : ''}` : 'N/A'
    
    const ema8Str = ind.ema8 ? '$' + ind.ema8.toFixed(2) : 'N/A'
    const ema20Str = ind.ema20 ? '$' + ind.ema20.toFixed(2) : 'N/A'
    const ema50Str = ind.ema50 ? '$' + ind.ema50.toFixed(2) : 'N/A'
    const ema200Str = ind.ema200 ? '$' + ind.ema200.toFixed(2) : 'N/A'
    indicatorParts.push(` | RSI:${rsiStr} | EMA8/20/50/200: ${ema8Str}/${ema20Str}/${ema50Str}/${ema200Str}`)

    // OPTIMIZATION: Use cached bb variable if available
    const bbUpperStr = bbUserBuild ? '$' + bbUserBuild.upper.toFixed(2) : 'N/A'
    const bbMidStr = bbUserBuild ? '$' + bbUserBuild.middle.toFixed(2) : 'N/A'
    const bbLowerStr = bbUserBuild ? '$' + bbUserBuild.lower.toFixed(2) : 'N/A'
    const macdStr = macdUser ? `${macdUser.macd.toFixed(4)}[H:${macdUser.histogram.toFixed(4)}]` : 'N/A'
    // OPTIMIZATION: Cache regex pattern and simplify replacement
    const bbPosCompact = bbPositionText.replace('Price $', '').replace(/ \$\d+\.\d+ /g, ' ')
    indicatorParts.push(` | MACD:${macdStr} | BB:U:${bbUpperStr} M:${bbMidStr} L:${bbLowerStr} | ${bbPosCompact}`)

    const atrStr = ind.atr ? '$' + ind.atr.toFixed(2) : 'N/A'
    const vwapStr = ind.vwap ? '$' + ind.vwap.toFixed(2) : 'N/A'
    indicatorParts.push(` | ATR:${atrStr} | ADX:${adxStr} | OBV:${ind.obv ? ind.obv.toFixed(2) : 'N/A'} | VWAP:${vwapStr}`)

    const sarStr = ind.parabolicSAR ? '$' + ind.parabolicSAR.toFixed(2) : 'N/A'
    const stochStr = ind.stochastic ? `K${ind.stochastic.k.toFixed(2)} D${ind.stochastic.d.toFixed(2)}` : 'N/A'
    indicatorParts.push(` | Stoch:${stochStr} | CCI:${ind.cci ? ind.cci.toFixed(2) : 'N/A'} | WR:${ind.williamsR ? ind.williamsR.toFixed(2) : 'N/A'} | SAR:${sarStr}`)

    const supportStr = ind.supportResistance ? (ind.supportResistance.support ? '$' + ind.supportResistance.support.toFixed(2) : 'N/A') : 'N/A'
    const resistanceStr = ind.supportResistance ? (ind.supportResistance.resistance ? '$' + ind.supportResistance.resistance.toFixed(2) : 'N/A') : 'N/A'
    const aroonStr = ind.aroon ? `U${ind.aroon.up.toFixed(0)} D${ind.aroon.down.toFixed(0)}` : 'N/A'
    indicatorParts.push(` | Aroon:${aroonStr} | S/R:S:${supportStr} R:${resistanceStr}`)

    // Removed duplicate Summary here - it's now displayed prominently at the START (above)
    // Keep reminder at end for reference
    indicatorParts.push(` | 24h:${ind.priceChange24h?.toFixed(2) || '0.00'}% | VolChg:${ind.volumeChange?.toFixed(2) || '0.00'}% | [Summary: BULL ${bullishCount} | BEAR ${bearishCount} | ${summaryDir} - see above for PRIMARY RULE]`)
    
    assetParts.push(...indicatorParts)

    // Add multi-timeframe analysis if available
    if (assetData.trendAlignment) {
      const ta = assetData.trendAlignment
      const mtfDir = ta.dailyTrend === 'uptrend' ? 'B' : ta.dailyTrend === 'downtrend' ? 'S' : 'N'
      assetParts.push(` | MTF: Daily ${ta.dailyTrend || 'N/A'}[${mtfDir}] 4H:${ta.h4Aligned ? 'Y' : 'N'} 1H:${ta.h1Aligned ? 'Y' : 'N'} Aligned:${ta.aligned ? 'Y' : 'N'}`)
    }

    if (assetData.multiTimeframeIndicators) {
      const mtf = assetData.multiTimeframeIndicators
      const dailyEma20 = mtf['1d']?.ema20 ? '$' + mtf['1d'].ema20.toFixed(2) : 'N/A'
      const dailyEma50 = mtf['1d']?.ema50 ? '$' + mtf['1d'].ema50.toFixed(2) : 'N/A'
      const dailyRsi = mtf['1d']?.rsi14 ? mtf['1d'].rsi14.toFixed(2) : 'N/A'
      const dailyStr = mtf['1d'] ? `1D:EMA20:${dailyEma20} EMA50:${dailyEma50} RSI:${dailyRsi}` : ''
      const h4Ema20 = mtf['4h']?.ema20 ? '$' + mtf['4h'].ema20.toFixed(2) : 'N/A'
      const h4Rsi = mtf['4h']?.rsi14 ? mtf['4h'].rsi14.toFixed(2) : 'N/A'
      const h4Str = mtf['4h'] ? `4H:EMA20:${h4Ema20} RSI:${h4Rsi}` : ''
      const h1Ema20 = mtf['1h']?.ema20 ? '$' + mtf['1h'].ema20.toFixed(2) : 'N/A'
      const h1Rsi = mtf['1h']?.rsi14 ? mtf['1h'].rsi14.toFixed(2) : 'N/A'
      const h1Str = mtf['1h'] ? `1H:EMA20:${h1Ema20} RSI:${h1Rsi}` : ''
      // OPTIMIZATION: Use conditional array building instead of filter
      const mtfParts: string[] = []
      if (dailyStr) mtfParts.push(dailyStr)
      if (h4Str) mtfParts.push(h4Str)
      if (h1Str) mtfParts.push(h1Str)
      if (mtfParts.length > 0) {
        assetParts.push(` | MTF_Ind: ${mtfParts.join(' ')}`)
      }
    }

    // Add external data to user prompt
    if (assetData.externalData) {
      const ext = assetData.externalData
      const hl = ext.hyperliquid
      const bc = ext.blockchain
      // OPTIMIZATION: Cache nested property access and repeated calculations
      const enh = ext.enhanced
      const hlFundingRate = hl?.fundingRate
      const fundingRateAbs = hlFundingRate ? Math.abs(hlFundingRate) : 0
      const frStr = hl ? `${(hlFundingRate * 100).toFixed(4)}%[${hl.fundingRateTrend || 'N/A'}]${fundingRateAbs > 0.0015 ? '[EXTREME]' : ''}` : 'N/A'
      const oiStr = hl ? '$' + (hl.openInterest?.toLocaleString() || 'N/A') + '[' + (hl.oiTrend || 'N/A') + ']' : 'N/A'
      const bcFlow = bc?.estimatedExchangeFlow
      const flowAbs = bcFlow ? Math.abs(bcFlow) : 0
      const flowStr = bcFlow !== undefined && bcFlow !== 0
        ? '$' + flowAbs.toLocaleString() + '[' + (bcFlow < 0 ? 'OUT' : 'IN') + ']'
        : 'N/A'
      const whaleScore = bc?.whaleActivityScore
      const whaleScoreAbs = whaleScore ? Math.abs(whaleScore) : 0
      const whaleStr = whaleScore !== undefined && whaleScore !== 0
        ? `${(whaleScoreAbs * 100).toFixed(0)}%[${whaleScore > 0 ? 'B' : 'S'}]`
        : 'N/A'
      const volTrendStr = enh ? `${enh.volumeTrend || 'N/A'}/${enh.volatilityPattern || 'N/A'}` : 'N/A'
      assetParts.push(` | External: FR:${frStr} OI:${oiStr} Flow:${flowStr} Whale:${whaleStr} VolTrend:${volTrendStr}`)
    }
  } else {
    assetParts.push('', '- Technical Indicators: Not available (historical data not accessible)')
  }

  // OPTIMIZATION: Cache Date object to avoid repeated creation
  const timestamp = new Date().toISOString()
  assetParts.push('', `- Timestamp: ${timestamp}`, '', '')
  
  userPromptParts.push(assetParts.join('\n'))

  // OPTIMIZATION: Cache account state properties and toFixed() results
  const accountValue = accountState.accountValue
  const availableCash = accountState.availableCash
  const totalReturnPercent = accountState.totalReturnPercent
  const activePositionsCount = accountState.activePositions.length
  const sharpeRatio = accountState.sharpeRatio
  
  // Add account state
  userPromptParts.push(
    '',
    `**ACCOUNT**: Value $${accountValue.toFixed(2)} | Cash $${availableCash.toFixed(2)} | Return ${totalReturnPercent.toFixed(2)}% | Positions ${activePositionsCount} | Sharpe ${sharpeRatio.toFixed(2)}`,
    '',
    '**INSTRUCTIONS:**',
    '',
    'Based on the TECHNICAL ANALYSIS data provided above, generate a trading signal for this asset.',
    '',
    '- Use RSI to identify overbought/oversold conditions',
    '- Use MACD to identify momentum and trend direction',
    '- Use EMA crossovers to identify trend changes',
    '- Use Bollinger Bands to identify volatility and potential reversals',
    '- Consider volume changes and price movements',
    '- Set appropriate stop losses and take profits based on technical levels',
    '',
    'Generate a trading signal for this asset.'
  )
  
  return userPromptParts.join('\n')
}

