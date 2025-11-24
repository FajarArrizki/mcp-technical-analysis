/**
 * Reward Bonuses
 * Compute positive rewards for coherent, low-risk conditions to balance penalties.
 */
export interface RewardBonusResult {
  reward: number
  reasons: string[]
  flags: number
}

function envNum(key: string, def: number): number {
  const v = parseFloat(process.env[key] || '')
  return isFinite(v) ? v : def
}

export function computeRewardBonuses(_asset: string, marketData: any): RewardBonusResult {
  let reward = 0
  const reasons: string[] = []
  let flags = 0

  const indicators = marketData?.indicators || marketData?.data?.indicators || {}
  const trend = marketData?.trendAlignment || marketData?.data?.trendAlignment || {}
  const ext = marketData?.externalData || marketData?.data?.externalData || {}
  const futures = ext?.futures || {}
  const cva = ext?.comprehensiveVolumeAnalysis || {}
  const btc = futures?.btcCorrelation || {}

  // Trend/EMA/Aroon coherence
  const REW_TREND_EMA_AROON = envNum('REW_TREND_EMA_AROON', 40)
  const ema20 = indicators?.ema20, ema50 = indicators?.ema50, price = indicators?.price
  const aroonUp = indicators?.aroon?.up, aroonDown = indicators?.aroon?.down
  const upStruct = typeof price === 'number' && typeof ema20 === 'number' && typeof ema50 === 'number' && price > ema20 && ema20 > ema50
  const downStruct = typeof price === 'number' && typeof ema20 === 'number' && typeof ema50 === 'number' && price < ema20 && ema20 < ema50
  const aroonUpDom = typeof aroonUp === 'number' && typeof aroonDown === 'number' && aroonUp - aroonDown > 30
  const aroonDownDom = typeof aroonUp === 'number' && typeof aroonDown === 'number' && aroonDown - aroonUp > 30
  if ((trend?.trend === 'uptrend' && upStruct && aroonUpDom) || (trend?.trend === 'downtrend' && downStruct && aroonDownDom)) {
    reward += REW_TREND_EMA_AROON
    reasons.push('Trend×EMA×Aroon coherence')
    flags++
  }

  // Volume × Delta confirmation
  const REW_VOL_DELTA = envNum('REW_VOL_DELTA', 25)
  const REW_VOL_DELTA_PARTIAL = envNum('REW_VOL_DELTA_PARTIAL', 10)
  if (cva?.volumeConfirmation) {
    const vc = cva.volumeConfirmation
    if (vc.isValid) {
      reward += vc.strength === 'strong' ? REW_VOL_DELTA : REW_VOL_DELTA_PARTIAL
      reasons.push(`Volume confirms (${vc.strength})`)
      flags++
    }
  }

  // Market regime favorable
  const REW_REGIME_STRONG = envNum('REW_REGIME_STRONG', 20)
  const REW_REGIME_MOD = envNum('REW_REGIME_MOD', 10)
  const adxVal = typeof indicators?.adx === 'number' ? indicators.adx : (indicators?.adx?.adx ?? 0)
  const bb = indicators?.bollingerBands
  let bbWidth = 0
  if (bb && typeof bb.middle === 'number' && bb.middle > 0) bbWidth = (bb.upper - bb.lower) / bb.middle
  if (adxVal >= 25 && bbWidth >= 0.02 && bbWidth <= 0.06) {
    reward += REW_REGIME_STRONG
    reasons.push('Strong regime (ADX≥25 & BB width 2–6%)')
    flags++
  } else if (adxVal >= 20 && bbWidth >= 0.015 && bbWidth <= 0.08) {
    reward += REW_REGIME_MOD
    reasons.push('Moderate regime')
    flags++
  }

  // Liquidity safety
  const REW_LIQ_SAFE_7 = envNum('REW_LIQ_SAFE_7', 25)
  const REW_LIQ_SAFE_5 = envNum('REW_LIQ_SAFE_5', 15)
  const liqDist = futures?.liquidation?.liquidationDistance
  if (typeof liqDist === 'number') {
    if (liqDist >= 7) {
      reward += REW_LIQ_SAFE_7
      reasons.push('Liquidation distance ≥7% (safe)')
      flags++
    } else if (liqDist >= 5) {
      reward += REW_LIQ_SAFE_5
      reasons.push('Liquidation distance ≥5% (safer)')
      flags++
    }
  }

  // RSI momentum confirmation
  const REW_RSI_MOMO = envNum('REW_RSI_MOMO', 10)
  const rsi = indicators?.rsi14
  const macdHist = indicators?.macd?.histogram
  if (typeof rsi === 'number' && typeof macdHist === 'number') {
    if ((rsi > 55 && macdHist > 0) || (rsi < 45 && macdHist < 0)) {
      reward += REW_RSI_MOMO
      reasons.push('RSI confirms momentum')
      flags++
    }
  }

  // BTC alignment
  const REW_BTC_ALIGN = envNum('REW_BTC_ALIGN', 20)
  const REW_BTC_MOD = envNum('REW_BTC_MOD', 10)
  if (btc && typeof btc.correlation7d === 'number') {
    const absCorr = Math.abs(btc.correlation7d)
    if (absCorr >= 0.6) {
      reward += REW_BTC_ALIGN
      reasons.push('BTC alignment strong')
      flags++
    } else if (absCorr >= 0.5) {
      reward += REW_BTC_MOD
      reasons.push('BTC alignment moderate')
      flags++
    }
  }

  // Premium/divergence
  const prem = futures?.premiumIndex
  const REW_PREMIUM_TIGHT = envNum('REW_PREMIUM_TIGHT', 10)
  const REW_DIV_LOW = envNum('REW_DIV_LOW', 10)
  if (prem && typeof prem.premiumPct === 'number') {
    const absPrem = Math.abs(prem.premiumPct)
    if (absPrem < 0.0005) {
      reward += REW_PREMIUM_TIGHT
      reasons.push('Premium tight')
      flags++
    }
  }
  if (prem && typeof (prem as any).divergence === 'number') {
    if (Math.abs((prem as any).divergence) < 0.5) {
      reward += REW_DIV_LOW
      reasons.push('Divergence low')
      flags++
    }
  }

  // Futures coherence bundle
  const REW_FUTURES_COH = envNum('REW_FUTURES_COH', 10)
  const fr = futures?.fundingRate?.current
  const oiChg = futures?.openInterest?.trend
  if (typeof fr === 'number' && Math.abs(fr) < 0.0006 && oiChg === 'rising') {
    reward += REW_FUTURES_COH
    reasons.push('Futures coherence (neutral funding + OI rising)')
    flags++
  }

  // Cap total reward
  const REWARD_CAP = envNum('REWARD_CAP', 60)
  if (reward > REWARD_CAP) reward = REWARD_CAP

  return { reward, reasons, flags }
}


