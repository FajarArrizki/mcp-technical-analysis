/**
 * Ichimoku Cloud Indicator
 * Tenkan-sen, Kijun-sen, Senkou Span A/B, Chikou Span calculations
 */

export interface IchimokuCloud {
  tenkanSen: number | null // Conversion Line (9-period)
  kijunSen: number | null // Base Line (26-period)
  senkouSpanA: number | null // Leading Span A (26 periods ahead)
  senkouSpanB: number | null // Leading Span B (26 periods ahead)
  chikouSpan: number | null // Lagging Span (26 periods back)
  cloudColor: 'bullish' | 'bearish' | 'neutral' | null // Cloud color based on Span A vs B
  priceVsCloud: 'above' | 'below' | 'inside' | null // Current price position vs cloud
  signals: {
    tkCross: 'bullish' | 'bearish' | 'neutral' | null // Tenkan vs Kijun crossover
    priceVsTk: 'above' | 'below' | null // Price vs Tenkan
    priceVsKj: 'above' | 'below' | null // Price vs Kijun
    cloudBreakout: 'bullish' | 'bearish' | 'neutral' | null // Price breaking cloud
  }
}

export function calculateIchimokuCloud(
  highs: number[],
  lows: number[],
  closes: number[],
  tenkanPeriod: number = 9,
  kijunPeriod: number = 26,
  senkouSpanBPeriod: number = 52,
  currentPrice?: number | null
): IchimokuCloud {
  // Minimum 5 data points required
  if (highs.length < 5 || lows.length < 5 || closes.length < 5) {
    return {
      tenkanSen: null,
      kijunSen: null,
      senkouSpanA: null,
      senkouSpanB: null,
      chikouSpan: null,
      cloudColor: null,
      priceVsCloud: null,
      signals: {
        tkCross: null,
        priceVsTk: null,
        priceVsKj: null,
        cloudBreakout: null,
      },
    }
  }
  
  // Use adaptive periods
  const dataRatio = Math.min(1, highs.length / senkouSpanBPeriod)
  const effectiveTenkanPeriod = Math.max(3, Math.floor(tenkanPeriod * dataRatio))
  const effectiveKijunPeriod = Math.max(5, Math.floor(kijunPeriod * dataRatio))
  const effectiveSenkouSpanBPeriod = Math.max(7, Math.floor(senkouSpanBPeriod * dataRatio))

  const currentIndex = closes.length - 1
  const price = currentPrice || closes[currentIndex]

  // Tenkan-sen (Conversion Line): (tenkanPeriod high + tenkanPeriod low) / 2
  const tenkanHigh = Math.max(...highs.slice(-effectiveTenkanPeriod))
  const tenkanLow = Math.min(...lows.slice(-effectiveTenkanPeriod))
  const tenkanSen = (tenkanHigh + tenkanLow) / 2

  // Kijun-sen (Base Line): (kijunPeriod high + kijunPeriod low) / 2
  const kijunHigh = Math.max(...highs.slice(-effectiveKijunPeriod))
  const kijunLow = Math.min(...lows.slice(-effectiveKijunPeriod))
  const kijunSen = (kijunHigh + kijunLow) / 2

  // Senkou Span A: (Tenkan-sen + Kijun-sen) / 2, plotted 26 periods ahead
  const senkouSpanA = (tenkanSen + kijunSen) / 2

  // Senkou Span B: (senkouSpanBPeriod high + senkouSpanBPeriod low) / 2, plotted kijunPeriod periods ahead
  const senkouBHigh = Math.max(...highs.slice(-effectiveSenkouSpanBPeriod))
  const senkouBLow = Math.min(...lows.slice(-effectiveSenkouSpanBPeriod))
  const senkouSpanB = (senkouBHigh + senkouBLow) / 2

  // Chikou Span: Current close plotted kijunPeriod periods back
  // For current candle, Chikou Span is current close
  // For historical analysis, we can show it as current close
  const chikouSpan = closes[currentIndex]

  // Cloud color: Bullish when Span A > Span B, Bearish when Span B > Span A
  let cloudColor: 'bullish' | 'bearish' | 'neutral' | null = null
  if (senkouSpanA > senkouSpanB) {
    cloudColor = 'bullish'
  } else if (senkouSpanB > senkouSpanA) {
    cloudColor = 'bearish'
  } else {
    cloudColor = 'neutral'
  }

  // Price vs Cloud position
  let priceVsCloud: 'above' | 'below' | 'inside' | null = null
  const cloudTop = Math.max(senkouSpanA, senkouSpanB)
  const cloudBottom = Math.min(senkouSpanA, senkouSpanB)

  if (price > cloudTop) {
    priceVsCloud = 'above'
  } else if (price < cloudBottom) {
    priceVsCloud = 'below'
  } else {
    priceVsCloud = 'inside'
  }

  // Calculate signals
  const signals = {
    tkCross: null as 'bullish' | 'bearish' | 'neutral' | null,
    priceVsTk: null as 'above' | 'below' | null,
    priceVsKj: null as 'above' | 'below' | null,
    cloudBreakout: null as 'bullish' | 'bearish' | 'neutral' | null,
  }

  // Price vs Tenkan/Kijun
  signals.priceVsTk = price > tenkanSen ? 'above' : 'below'
  signals.priceVsKj = price > kijunSen ? 'above' : 'below'

  // Cloud breakout signals
  if (priceVsCloud === 'above' && cloudColor === 'bullish') {
    signals.cloudBreakout = 'bullish' // Price above bullish cloud
  } else if (priceVsCloud === 'below' && cloudColor === 'bearish') {
    signals.cloudBreakout = 'bearish' // Price below bearish cloud
  } else {
    signals.cloudBreakout = 'neutral'
  }

  // Tenkan-Kijun crossover (basic signal, would need historical data for proper crossover)
  if (tenkanSen > kijunSen) {
    signals.tkCross = 'bullish'
  } else if (kijunSen > tenkanSen) {
    signals.tkCross = 'bearish'
  } else {
    signals.tkCross = 'neutral'
  }

  return {
    tenkanSen,
    kijunSen,
    senkouSpanA,
    senkouSpanB,
    chikouSpan,
    cloudColor,
    priceVsCloud,
    signals,
  }
}
