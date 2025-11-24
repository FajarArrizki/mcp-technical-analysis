/**
 * Influence Graph
 * Establish causal links between indicators and compute coherence penalties/bonuses.
 */

export interface InfluenceOutcome {
  bonus: number
  penalty: number
  minorMismatches: number
  majorMismatches: number
  criticalFlags: string[]
  notes: string[]
}

export function analyzeInfluence(marketData: any): InfluenceOutcome {
  const outcome: InfluenceOutcome = {
    bonus: 0,
    penalty: 0,
    minorMismatches: 0,
    majorMismatches: 0,
    criticalFlags: [],
    notes: []
  }

  const indicators = marketData?.indicators || marketData?.data?.indicators || {}
  const ext = marketData?.externalData || marketData?.data?.externalData || {}
  const futures = ext?.futures || {}
  const hl = ext?.hyperliquid || {}

  // Funding → Premium / OI coherence
  const funding = futures?.fundingRate || { current: hl.fundingRate }
  const premium = futures?.premiumIndex || { premiumPct: hl.premium }
  const oi = futures?.openInterest || { trend: hl.oiTrend }
  if (funding) {
    const fr = funding.current ?? 0
    const absFr = Math.abs(fr)
    const prem = premium?.premiumPct ?? 0
    // Neutral funding and tight premium = coherent futures
    if (absFr < 0.0005 && Math.abs(prem) < 0.001) {
      outcome.bonus += 4
      outcome.notes.push('Funding~neutral & Premium tight')
    } else if (absFr > 0.0015 && Math.abs(prem) > 0.002) {
      outcome.penalty += 4
      outcome.majorMismatches++
      outcome.notes.push('Funding high bias with wide premium')
    }
    // Funding rising but OI falling is suspicious
    if (funding?.trend === 'rising' && oi?.trend === 'falling') {
      outcome.penalty += 3
      outcome.majorMismatches++
      outcome.notes.push('Funding rising but OI falling (incoherent)')
    }
  }

  // OI → Liquidation proximity
  const liq = futures?.liquidation
  if (liq && typeof liq.liquidationDistance === 'number') {
    if (liq.liquidationDistance >= 5) {
      outcome.bonus += 3
      outcome.notes.push('Liquidation distance comfortable (>=5%)')
    } else if (liq.liquidationDistance < 2) {
      outcome.penalty += 5
      outcome.majorMismatches++
      outcome.criticalFlags.push('Liquidation proximity <2%')
      outcome.notes.push('Liquidation proximity high risk (<2%)')
    }
  }

  // Volume Delta → Breakout validity (use comprehensive volume analysis if present)
  const cva = ext?.comprehensiveVolumeAnalysis
  if (cva?.volumeConfirmation) {
    const vc = cva.volumeConfirmation
    if (vc.isValid && (vc.strength === 'strong' || vc.strength === 'moderate')) {
      outcome.bonus += vc.strength === 'strong' ? 4 : 2
      outcome.notes.push(`Volume confirms move (${vc.strength})`)
    } else if (!vc.isValid) {
      outcome.penalty += 3
      outcome.minorMismatches++
      outcome.notes.push('Volume does not confirm move')
    }
  }

  // Spoofing/Wash → False breakout propensity
  const whale = futures?.whaleActivity || ext?.enhanced // fallback
  if (whale?.spoofingDetected || whale?.washTradingDetected) {
    outcome.penalty += 5
    outcome.majorMismatches++
    outcome.notes.push('Spoofing/Wash trading detected')
  }

  // BTC → Alt reaction (corr stability)
  const btc = futures?.btcCorrelation
  if (btc && typeof btc.correlation7d === 'number') {
    const absCorr = Math.abs(btc.correlation7d)
    if (absCorr >= 0.7) {
      outcome.bonus += 3
      outcome.notes.push('BTC correlation stable/strong')
    } else if (absCorr < 0.3) {
      outcome.penalty += 2
      outcome.minorMismatches++
      outcome.notes.push('BTC correlation weak/unstable')
    }
  }

  // Volatility regime sanity (ATR + BB width)
  const atr = indicators?.atr
  const bb = indicators?.bollingerBands
  if (atr && bb) {
    const width = (bb.upper - bb.lower) / Math.max(1e-9, bb.middle)
    if (width > 0.08) {
      outcome.penalty += 2
      outcome.minorMismatches++
      outcome.notes.push('Volatility very high (BB width > 8%)')
    }
  }

  return outcome
}


