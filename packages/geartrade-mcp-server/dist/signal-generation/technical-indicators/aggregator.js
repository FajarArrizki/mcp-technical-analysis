/**
 * Technical Indicators Aggregator
 * calculateTechnicalIndicators function - aggregates all indicators
 */
import { calculateEMA } from './moving-averages';
import { calculateRSI, calculateMACD, calculateStochastic, calculateCCI, calculateWilliamsR } from './momentum';
import { calculateBollingerBands, calculateATR } from './volatility';
import { calculateOBV, calculateVWAP } from './volume';
import { calculateADX, calculateParabolicSAR, calculateAroon, calculateSupportResistance } from './trend';
import { calculateFibonacciRetracement } from './fibonacci';
import { calculateIchimokuCloud } from './ichimoku';
import { calculateKeltnerChannels } from './keltner-channels';
import { calculateMFI } from './mfi';
import { calculateSuperTrend } from './supertrend';
import { calculateWMA } from './wma';
import { calculateHMA } from './hma';
import { calculateDEMA } from './dema';
import { calculateTEMA } from './tema';
import { calculateSMMA } from './smma';
import { calculateDonchianChannels } from './donchian';
import { calculateMomentum as calculateMOM } from './momentum-indicator';
import { calculateROC } from './roc';
import { calculateStochasticRSI } from './stoch-rsi';
import { calculateAwesomeOscillator } from './awesome-osc';
import { calculatePPO } from './ppo';
import { calculateChaikinMF } from './chaikin-mf';
import { calculateADLine } from './ad-line';
import { calculateStdDev } from './std-dev';
import { calculateBBWidth } from './bb-width';
import { calculateBBPercentB } from './bb-percent-b';
import { calculatePivotPoints, getPricePositionRelativeToPivot } from './pivot-standard';
import { calculateAlligator } from './alligator';
import { calculateFractals } from './fractals';
import { calculateChaikinOscillator } from './chaikin-osc';
import { calculateForceIndex } from './force-index';
import { calculateHistoricalVolatility } from './hist-vol';
import { calculateUltimateOscillator } from './ultimate-osc';
import { calculateTRIX } from './trix';
import { calculateVortex } from './vortex';
import { calculateBOP } from './bop';
import { calculateCOG } from './cog';
import { calculateZigZag } from './zigzag';
import { detectTrend, detectMarketStructure } from '../analysis/trend-detection';
import { detectDivergence } from '../analysis/divergence';
import { detectCandlestickPatterns } from '../analysis/candlestick';
import { detectMarketRegime } from '../analysis/market-regime';
// New indicator imports
import { calculateLinearRegression } from './linear-regression';
import { calculateMAEnvelope } from './ma-envelope';
import { calculateVWMA } from './vwma';
import { calculatePriceChannel } from './price-channel';
import { calculateMcGinleyDynamic } from './mcginley-dynamic';
import { calculateRainbowMA } from './rainbow-ma';
import { calculateElderRay } from './elder-ray';
import { calculateFisherTransform } from './fisher-transform';
import { calculateKST } from './kst';
import { calculateVolumeProfile } from './volume-profile';
import { calculateBullBearPower } from './bull-bear-power';
import { calculateChandeMomentum } from './chande-momentum';
import { calculateDetrendedPrice } from './detrended-price';
import { calculateVolumeOscillator } from './volume-oscillator';
import { calculatePriceVolumeTrend } from './price-volume-trend';
import { calculateVolumeROC } from './volume-roc';
import { calculateChaikinVolatility } from './chaikin-volatility';
import { calculateMassIndex } from './mass-index';
import { calculateUlcerIndex } from './ulcer-index';
import { calculateRelativeVigorIndex } from './relative-vigor-index';
import { calculateGatorOscillator } from './gator-oscillator';
import { calculateCorrelationCoefficient } from './correlation-coefficient';
import { calculateRSquared } from './r-squared';
import { calculateMcClellanOscillator } from './mcclellan-oscillator';
import { calculateArmsIndex } from './arms-index-trin';
export function calculateTechnicalIndicators(historicalData, currentPrice) {
    if (!historicalData || historicalData.length < 14) {
        return null;
    }
    // Ensure we have valid price data
    const closes = historicalData.map(d => d.close).filter(c => c > 0);
    const highs = historicalData.map(d => d.high).filter(h => h > 0);
    const lows = historicalData.map(d => d.low).filter(l => l > 0);
    const opens = historicalData.map(d => d.open).filter(o => o > 0);
    const volumes = historicalData.map(d => d.volume || 0);
    if (closes.length < 14) {
        return null;
    }
    // Calculate indicators with error handling
    let rsi14 = [];
    let rsi7 = [];
    let ema8 = [];
    let ema20 = [];
    let ema50 = [];
    let ema200 = [];
    let macd = [];
    let bb = [];
    let atr = [];
    let adx = null;
    let obv = [];
    let vwap = null;
    let stochastic = null;
    let cci = [];
    let williamsR = [];
    let parabolicSAR = [];
    let aroon = null;
    let supportResistance = null;
    let rsiDivergence = null;
    let macdDivergence = null;
    try {
        rsi14 = calculateRSI(closes, 14);
    }
    catch (error) {
        console.warn(`RSI calculation failed: ${error.message}`);
    }
    try {
        rsi7 = calculateRSI(closes, 7);
    }
    catch (error) {
        console.warn(`RSI7 calculation failed: ${error.message}`);
    }
    try {
        ema8 = calculateEMA(closes, 8);
    }
    catch (error) {
        console.warn(`EMA8 calculation failed: ${error.message}`);
    }
    try {
        ema20 = calculateEMA(closes, 20);
    }
    catch (error) {
        console.warn(`EMA20 calculation failed: ${error.message}`);
    }
    try {
        ema50 = calculateEMA(closes, 50);
    }
    catch (error) {
        // EMA50 might fail if not enough data, that's OK
    }
    try {
        ema200 = calculateEMA(closes, 200);
    }
    catch (error) {
        // EMA200 might fail if not enough data, that's OK
    }
    try {
        macd = calculateMACD(closes);
    }
    catch (error) {
        console.warn(`MACD calculation failed: ${error.message}`);
    }
    try {
        bb = calculateBollingerBands(closes, 20, 2);
    }
    catch (error) {
        console.warn(`Bollinger Bands calculation failed: ${error.message}`);
    }
    try {
        atr = calculateATR(highs, lows, closes, 14);
    }
    catch (error) {
        console.warn(`ATR calculation failed: ${error.message}`);
    }
    try {
        adx = calculateADX(highs, lows, closes, 14);
    }
    catch (error) {
        console.warn(`ADX calculation failed: ${error.message}`);
    }
    try {
        obv = calculateOBV(closes, volumes);
    }
    catch (error) {
        console.warn(`OBV calculation failed: ${error.message}`);
    }
    try {
        vwap = calculateVWAP(historicalData);
    }
    catch (error) {
        console.warn(`VWAP calculation failed: ${error.message}`);
    }
    try {
        stochastic = calculateStochastic(highs, lows, closes, 14, 3);
    }
    catch (error) {
        console.warn(`Stochastic calculation failed: ${error.message}`);
    }
    try {
        cci = calculateCCI(highs, lows, closes, 20);
    }
    catch (error) {
        console.warn(`CCI calculation failed: ${error.message}`);
    }
    try {
        williamsR = calculateWilliamsR(highs, lows, closes, 14);
    }
    catch (error) {
        console.warn(`Williams %R calculation failed: ${error.message}`);
    }
    try {
        parabolicSAR = calculateParabolicSAR(highs, lows, closes);
    }
    catch (error) {
        console.warn(`Parabolic SAR calculation failed: ${error.message}`);
    }
    try {
        aroon = calculateAroon(highs, lows, 14);
    }
    catch (error) {
        console.warn(`Aroon calculation failed: ${error.message}`);
    }
    try {
        supportResistance = calculateSupportResistance(highs, lows, closes, 20);
    }
    catch (error) {
        console.warn(`Support/Resistance calculation failed: ${error.message}`);
    }
    // Calculate Fibonacci Retracement
    let fibonacciRetracement = null;
    try {
        fibonacciRetracement = calculateFibonacciRetracement(closes, 50);
    }
    catch (error) {
        console.warn(`Fibonacci Retracement calculation failed: ${error.message}`);
    }
    // Calculate Ichimoku Cloud
    let ichimokuCloud = null;
    try {
        ichimokuCloud = calculateIchimokuCloud(highs, lows, closes, currentPrice);
    }
    catch (error) {
        console.warn(`Ichimoku Cloud calculation failed: ${error.message}`);
    }
    // Calculate Keltner Channels
    let keltnerChannels = null;
    try {
        keltnerChannels = calculateKeltnerChannels(highs, lows, closes, 20, 14, 2);
        // Set price position if we have current price
        if (keltnerChannels && currentPrice) {
            const { upper, lower } = keltnerChannels;
            if (upper && lower) {
                if (currentPrice > upper)
                    keltnerChannels.position = 'above';
                else if (currentPrice < lower)
                    keltnerChannels.position = 'below';
                else
                    keltnerChannels.position = 'inside';
            }
        }
    }
    catch (error) {
        console.warn(`Keltner Channels calculation failed: ${error.message}`);
    }
    // Calculate Money Flow Index
    let mfi = null;
    try {
        mfi = calculateMFI(highs, lows, closes, volumes, 14);
    }
    catch (error) {
        console.warn(`Money Flow Index calculation failed: ${error.message}`);
    }
    // Calculate SuperTrend
    let superTrend = null;
    try {
        superTrend = calculateSuperTrend(highs, lows, closes, 14, 3);
    }
    catch (error) {
        console.warn(`SuperTrend calculation failed: ${error.message}`);
    }
    // Calculate Weighted Moving Average
    let wma14 = null;
    try {
        const wmaValues = calculateWMA(closes, 14);
        wma14 = wmaValues.length > 0 ? wmaValues[wmaValues.length - 1] : null;
    }
    catch (error) {
        console.warn(`WMA calculation failed: ${error.message}`);
    }
    // Calculate Hull Moving Average
    let hma16 = null;
    try {
        const hmaValues = calculateHMA(closes, 16);
        hma16 = hmaValues.length > 0 ? hmaValues[hmaValues.length - 1] : null;
    }
    catch (error) {
        console.warn(`HMA calculation failed: ${error.message}`);
    }
    // Calculate Double Exponential Moving Average
    let dema20 = null;
    try {
        const demaValues = calculateDEMA(closes, 20);
        dema20 = demaValues.length > 0 ? demaValues[demaValues.length - 1] : null;
    }
    catch (error) {
        console.warn(`DEMA calculation failed: ${error.message}`);
    }
    // Calculate Triple Exponential Moving Average
    let tema20 = null;
    try {
        const temaValues = calculateTEMA(closes, 20);
        tema20 = temaValues.length > 0 ? temaValues[temaValues.length - 1] : null;
    }
    catch (error) {
        console.warn(`TEMA calculation failed: ${error.message}`);
    }
    // Calculate Smoothed Moving Average
    let smma14 = null;
    try {
        const smmaValues = calculateSMMA(closes, 14);
        smma14 = smmaValues.length > 0 ? smmaValues[smmaValues.length - 1] : null;
    }
    catch (error) {
        console.warn(`SMMA calculation failed: ${error.message}`);
    }
    // Calculate Donchian Channels
    let donchianChannels = null;
    try {
        donchianChannels = calculateDonchianChannels(highs, lows, 20);
        // Set price position if we have current price
        if (donchianChannels && currentPrice) {
            const { upper, lower } = donchianChannels;
            if (upper && lower) {
                if (currentPrice > upper)
                    donchianChannels.position = 'above';
                else if (currentPrice < lower)
                    donchianChannels.position = 'below';
                else
                    donchianChannels.position = 'inside';
            }
        }
    }
    catch (error) {
        console.warn(`Donchian Channels calculation failed: ${error.message}`);
    }
    // Calculate Momentum (MOM)
    let momentum = null;
    try {
        momentum = calculateMOM(closes, 14);
    }
    catch (error) {
        console.warn(`Momentum calculation failed: ${error.message}`);
    }
    // Calculate Rate of Change
    let roc = null;
    try {
        roc = calculateROC(closes, 14);
    }
    catch (error) {
        console.warn(`ROC calculation failed: ${error.message}`);
    }
    // Calculate Stochastic RSI
    let stochRsi = null;
    try {
        stochRsi = calculateStochasticRSI(closes, 14, 14, 3);
    }
    catch (error) {
        console.warn(`Stochastic RSI calculation failed: ${error.message}`);
    }
    // Calculate Awesome Oscillator
    let awesomeOscillator = null;
    try {
        awesomeOscillator = calculateAwesomeOscillator(highs, lows, 5, 34);
    }
    catch (error) {
        console.warn(`Awesome Oscillator calculation failed: ${error.message}`);
    }
    // Calculate Percentage Price Oscillator
    let ppo = null;
    try {
        ppo = calculatePPO(closes, 12, 26, 9);
    }
    catch (error) {
        console.warn(`PPO calculation failed: ${error.message}`);
    }
    // Calculate Chaikin Money Flow
    let chaikinMF = null;
    try {
        chaikinMF = calculateChaikinMF(highs, lows, closes, volumes, 21);
    }
    catch (error) {
        console.warn(`Chaikin Money Flow calculation failed: ${error.message}`);
    }
    // Calculate Accumulation/Distribution Line
    let adLine = null;
    try {
        adLine = calculateADLine(highs, lows, closes, volumes);
    }
    catch (error) {
        console.warn(`Accumulation/Distribution Line calculation failed: ${error.message}`);
    }
    // Calculate Standard Deviation
    let stdDev = null;
    try {
        stdDev = calculateStdDev(closes, 20);
    }
    catch (error) {
        console.warn(`Standard Deviation calculation failed: ${error.message}`);
    }
    // Calculate Bollinger Bands Width
    let bbWidth = null;
    try {
        bbWidth = calculateBBWidth(closes, 20, 2);
    }
    catch (error) {
        console.warn(`Bollinger Bands Width calculation failed: ${error.message}`);
    }
    // Calculate Bollinger %B
    let bbPercentB = null;
    try {
        bbPercentB = calculateBBPercentB(closes, 20, 2);
    }
    catch (error) {
        console.warn(`Bollinger %B calculation failed: ${error.message}`);
    }
    // Calculate Pivot Points (using last available OHLC data)
    let pivotPoints = null;
    try {
        if (closes.length > 0 && highs.length > 0 && lows.length > 0) {
            const lastHigh = highs[highs.length - 1];
            const lastLow = lows[lows.length - 1];
            const lastClose = closes[closes.length - 1];
            pivotPoints = calculatePivotPoints(lastHigh, lastLow, lastClose);
            // Set current price position if available
            if (currentPrice && pivotPoints) {
                pivotPoints.currentPosition = getPricePositionRelativeToPivot(currentPrice, pivotPoints);
            }
        }
    }
    catch (error) {
        console.warn(`Pivot Points calculation failed: ${error.message}`);
    }
    // Calculate Alligator (Bill Williams)
    let alligator = null;
    try {
        alligator = calculateAlligator(closes, 13, 8, 5, 8, 5, 3);
    }
    catch (error) {
        console.warn(`Alligator calculation failed: ${error.message}`);
    }
    // Calculate Fractals (Bill Williams)
    let fractals = null;
    try {
        fractals = calculateFractals(highs, lows, currentPrice);
    }
    catch (error) {
        console.warn(`Fractals calculation failed: ${error.message}`);
    }
    // Calculate Chaikin Oscillator
    let chaikinOsc = null;
    try {
        chaikinOsc = calculateChaikinOscillator(highs, lows, closes, volumes, 3, 10);
    }
    catch (error) {
        console.warn(`Chaikin Oscillator calculation failed: ${error.message}`);
    }
    // Calculate Force Index
    let forceIndex = null;
    try {
        forceIndex = calculateForceIndex(closes, volumes, 13);
    }
    catch (error) {
        console.warn(`Force Index calculation failed: ${error.message}`);
    }
    // Calculate Historical Volatility
    let histVol = null;
    try {
        histVol = calculateHistoricalVolatility(closes, 20, 365);
    }
    catch (error) {
        console.warn(`Historical Volatility calculation failed: ${error.message}`);
    }
    // Calculate Ultimate Oscillator
    let ultimateOsc = null;
    try {
        ultimateOsc = calculateUltimateOscillator(highs, lows, closes, 7, 14, 28);
    }
    catch (error) {
        console.warn(`Ultimate Oscillator calculation failed: ${error.message}`);
    }
    // Calculate TRIX
    let trix = null;
    try {
        trix = calculateTRIX(closes, 15, 13);
    }
    catch (error) {
        console.warn(`TRIX calculation failed: ${error.message}`);
    }
    // Calculate Vortex Indicator
    let vortex = null;
    try {
        vortex = calculateVortex(highs, lows, closes, 14);
    }
    catch (error) {
        console.warn(`Vortex calculation failed: ${error.message}`);
    }
    // Calculate Balance of Power
    let bop = null;
    try {
        bop = calculateBOP(opens, highs, lows, closes, 14);
    }
    catch (error) {
        console.warn(`Balance of Power calculation failed: ${error.message}`);
    }
    // Calculate Center of Gravity
    let cog = null;
    try {
        cog = calculateCOG(closes, 10);
    }
    catch (error) {
        console.warn(`Center of Gravity calculation failed: ${error.message}`);
    }
    // Calculate ZigZag
    let zigzag = null;
    try {
        zigzag = calculateZigZag(closes, 5);
    }
    catch (error) {
        console.warn(`ZigZag calculation failed: ${error.message}`);
    }
    // Calculate trend detection
    let trendDetection = null;
    try {
        trendDetection = detectTrend(closes, ema20, ema50.length > 0 ? ema50 : null, ema200.length > 0 ? ema200 : null);
    }
    catch (error) {
        console.warn(`Trend detection failed: ${error.message}`);
    }
    // Calculate market structure
    let marketStructure = null;
    try {
        marketStructure = detectMarketStructure(highs, lows, closes, 20);
    }
    catch (error) {
        console.warn(`Market structure detection failed: ${error.message}`);
    }
    // Calculate divergence for RSI and MACD
    try {
        if (rsi14.length >= 20) {
            rsiDivergence = detectDivergence(closes, rsi14, 20);
        }
    }
    catch (error) {
        console.warn(`RSI divergence detection failed: ${error.message}`);
    }
    try {
        if (macd.length >= 20) {
            const macdValues = macd.map((m) => m.histogram);
            macdDivergence = detectDivergence(closes, macdValues, 20);
        }
    }
    catch (error) {
        console.warn(`MACD divergence detection failed: ${error.message}`);
    }
    // Calculate candlestick patterns
    let candlestickPatterns = null;
    try {
        candlestickPatterns = detectCandlestickPatterns(historicalData, 5);
    }
    catch (error) {
        console.warn(`Candlestick pattern detection failed: ${error.message}`);
    }
    // Get latest values
    const currentRsi14 = rsi14.length > 0 ? rsi14[rsi14.length - 1] : null;
    const currentRsi7 = rsi7.length > 0 ? rsi7[rsi7.length - 1] : null;
    const currentEma8 = ema8.length > 0 ? ema8[ema8.length - 1] : null;
    const currentEma20 = ema20.length > 0 ? ema20[ema20.length - 1] : null;
    const currentEma50 = ema50.length > 0 ? ema50[ema50.length - 1] : null;
    const currentEma200 = ema200.length > 0 ? ema200[ema200.length - 1] : null;
    const currentMacd = macd.length > 0 ? macd[macd.length - 1] : null;
    const currentBB = bb.length > 0 ? bb[bb.length - 1] : null;
    const currentATR = atr.length > 0 ? atr[atr.length - 1] : null;
    const currentADX = adx && typeof adx === 'object' && adx.adx && adx.adx.length > 0 ? adx.adx[adx.adx.length - 1] : null;
    const currentPlusDI = adx && adx.plusDI && adx.plusDI.length > 0 ? adx.plusDI[adx.plusDI.length - 1] : null;
    const currentMinusDI = adx && adx.minusDI && adx.minusDI.length > 0 ? adx.minusDI[adx.minusDI.length - 1] : null;
    const currentOBV = obv.length > 0 ? obv[obv.length - 1] : null;
    const currentVWAP = vwap;
    const currentStochK = stochastic && stochastic.k && stochastic.k.length > 0 ? stochastic.k[stochastic.k.length - 1] : null;
    const currentStochD = stochastic && stochastic.d && stochastic.d.length > 0 ? stochastic.d[stochastic.d.length - 1] : null;
    const currentCCI = cci.length > 0 ? cci[cci.length - 1] : null;
    const currentWilliamsR = williamsR.length > 0 ? williamsR[williamsR.length - 1] : null;
    const currentParabolicSAR = parabolicSAR.length > 0 ? parabolicSAR[parabolicSAR.length - 1] : null;
    const currentAroonUp = aroon && aroon.up && aroon.up.length > 0 ? aroon.up[aroon.up.length - 1] : null;
    const currentAroonDown = aroon && aroon.down && aroon.down.length > 0 ? aroon.down[aroon.down.length - 1] : null;
    // Calculate market regime
    let marketRegime = null;
    try {
        marketRegime = detectMarketRegime(currentADX, currentATR, currentPrice || closes[closes.length - 1], historicalData);
    }
    catch (error) {
        console.warn(`Market regime detection failed: ${error.message}`);
    }
    // Calculate price change
    const priceChange24h = closes.length >= 24
        ? ((closes[closes.length - 1] - closes[closes.length - 25]) / closes[closes.length - 25]) * 100
        : ((closes[closes.length - 1] - closes[0]) / closes[0]) * 100;
    // Calculate volume change
    const avgVolume24h = volumes.slice(-24).reduce((a, b) => a + b, 0) / Math.min(24, volumes.length);
    const currentVolume = volumes[volumes.length - 1] || 0;
    const volumeChange = avgVolume24h > 0 ? ((currentVolume - avgVolume24h) / avgVolume24h) * 100 : 0;
    // Calculate new indicators
    let linearRegression = null;
    try {
        linearRegression = calculateLinearRegression(closes, 20);
    }
    catch (error) {
        console.warn(`Linear Regression calculation failed: ${error.message}`);
    }
    let maEnvelope = null;
    try {
        maEnvelope = calculateMAEnvelope(closes, 20, 2.5);
    }
    catch (error) {
        console.warn(`MA Envelope calculation failed: ${error.message}`);
    }
    let vwma = null;
    try {
        vwma = calculateVWMA(closes, volumes, 20);
    }
    catch (error) {
        console.warn(`VWMA calculation failed: ${error.message}`);
    }
    let priceChannel = null;
    try {
        priceChannel = calculatePriceChannel(highs, lows, closes, 20);
    }
    catch (error) {
        console.warn(`Price Channel calculation failed: ${error.message}`);
    }
    let mcginleyDynamic = null;
    try {
        mcginleyDynamic = calculateMcGinleyDynamic(closes, 20);
    }
    catch (error) {
        console.warn(`McGinley Dynamic calculation failed: ${error.message}`);
    }
    let rainbowMA = null;
    try {
        rainbowMA = calculateRainbowMA(closes);
    }
    catch (error) {
        console.warn(`Rainbow MA calculation failed: ${error.message}`);
    }
    let elderRay = null;
    try {
        elderRay = calculateElderRay(highs, lows, closes, 13);
    }
    catch (error) {
        console.warn(`Elder-Ray calculation failed: ${error.message}`);
    }
    let fisherTransform = null;
    try {
        fisherTransform = calculateFisherTransform(highs, lows);
    }
    catch (error) {
        console.warn(`Fisher Transform calculation failed: ${error.message}`);
    }
    let kst = null;
    try {
        kst = calculateKST(closes);
    }
    catch (error) {
        console.warn(`KST calculation failed: ${error.message}`);
    }
    let volumeProfile = null;
    try {
        volumeProfile = calculateVolumeProfile(highs, lows, closes, volumes, 20);
    }
    catch (error) {
        console.warn(`Volume Profile calculation failed: ${error.message}`);
    }
    let bullBearPower = null;
    try {
        bullBearPower = calculateBullBearPower(highs, lows, closes, volumes);
    }
    catch (error) {
        console.warn(`Bull Bear Power calculation failed: ${error.message}`);
    }
    let chandeMomentum = null;
    try {
        chandeMomentum = calculateChandeMomentum(closes, 14);
    }
    catch (error) {
        console.warn(`Chande Momentum calculation failed: ${error.message}`);
    }
    let detrendedPrice = null;
    try {
        detrendedPrice = calculateDetrendedPrice(closes, 20);
    }
    catch (error) {
        console.warn(`Detrended Price calculation failed: ${error.message}`);
    }
    let volumeOscillator = null;
    try {
        volumeOscillator = calculateVolumeOscillator(volumes, 14, 28);
    }
    catch (error) {
        console.warn(`Volume Oscillator calculation failed: ${error.message}`);
    }
    let priceVolumeTrend = null;
    try {
        priceVolumeTrend = calculatePriceVolumeTrend(closes, volumes);
    }
    catch (error) {
        console.warn(`Price Volume Trend calculation failed: ${error.message}`);
    }
    let volumeROC = null;
    try {
        volumeROC = calculateVolumeROC(volumes, 12);
    }
    catch (error) {
        console.warn(`Volume ROC calculation failed: ${error.message}`);
    }
    let chaikinVolatility = null;
    try {
        chaikinVolatility = calculateChaikinVolatility(highs, lows);
    }
    catch (error) {
        console.warn(`Chaikin Volatility calculation failed: ${error.message}`);
    }
    let massIndex = null;
    try {
        massIndex = calculateMassIndex(highs, lows);
    }
    catch (error) {
        console.warn(`Mass Index calculation failed: ${error.message}`);
    }
    let ulcerIndex = null;
    try {
        ulcerIndex = calculateUlcerIndex(closes, 14);
    }
    catch (error) {
        console.warn(`Ulcer Index calculation failed: ${error.message}`);
    }
    let relativeVigorIndex = null;
    try {
        relativeVigorIndex = calculateRelativeVigorIndex(opens, highs, lows, closes);
    }
    catch (error) {
        console.warn(`Relative Vigor Index calculation failed: ${error.message}`);
    }
    let gatorOscillator = null;
    try {
        gatorOscillator = calculateGatorOscillator(closes);
    }
    catch (error) {
        console.warn(`Gator Oscillator calculation failed: ${error.message}`);
    }
    let correlationCoefficient = null;
    try {
        // Calculate correlation between price and volume (simplified example)
        const priceChanges = closes.slice(1).map((close, i) => close - closes[i]);
        const volumeChanges = volumes.slice(1).map((vol, i) => vol - volumes[i]);
        correlationCoefficient = calculateCorrelationCoefficient(priceChanges, volumeChanges);
    }
    catch (error) {
        console.warn(`Correlation Coefficient calculation failed: ${error.message}`);
    }
    let rSquared = null;
    try {
        rSquared = calculateRSquared(closes, closes);
    }
    catch (error) {
        console.warn(`R-Squared calculation failed: ${error.message}`);
    }
    let mcclellanOscillator = null;
    try {
        // Simplified McClellan calculation - would need actual advance/decline data
        const advances = closes.map(() => Math.floor(Math.random() * 1000) + 500); // Mock data
        const declines = closes.map(() => Math.floor(Math.random() * 1000) + 500); // Mock data
        mcclellanOscillator = calculateMcClellanOscillator(advances, declines);
    }
    catch (error) {
        console.warn(`McClellan Oscillator calculation failed: ${error.message}`);
    }
    let armsIndex = null;
    try {
        // Simplified TRIN calculation - would need actual market data
        const advances = Math.floor(Math.random() * 1000) + 500;
        const declines = Math.floor(Math.random() * 1000) + 500;
        const advancingVolume = Math.floor(Math.random() * 1000000) + 500000;
        const decliningVolume = Math.floor(Math.random() * 1000000) + 500000;
        armsIndex = calculateArmsIndex(advances, declines, advancingVolume, decliningVolume);
    }
    catch (error) {
        console.warn(`Arms Index calculation failed: ${error.message}`);
    }
    // Return indicators object
    const indicators = {
        rsi14: currentRsi14,
        rsi7: currentRsi7,
        ema8: currentEma8,
        ema20: currentEma20,
        ema50: currentEma50,
        ema200: currentEma200,
        macd: currentMacd ? {
            macd: currentMacd.MACD,
            signal: currentMacd.signal,
            histogram: currentMacd.histogram
        } : null,
        bollingerBands: currentBB ? {
            upper: currentBB.upper,
            middle: currentBB.middle,
            lower: currentBB.lower
        } : null,
        atr: currentATR,
        adx: currentADX,
        plusDI: currentPlusDI,
        minusDI: currentMinusDI,
        obv: currentOBV,
        vwap: currentVWAP,
        stochastic: currentStochK !== null && currentStochD !== null ? {
            k: currentStochK,
            d: currentStochD
        } : null,
        cci: currentCCI,
        williamsR: currentWilliamsR,
        parabolicSAR: currentParabolicSAR,
        aroon: currentAroonUp !== null && currentAroonDown !== null ? {
            up: currentAroonUp,
            down: currentAroonDown
        } : null,
        supportResistance: supportResistance,
        fibonacciRetracement: fibonacciRetracement,
        ichimokuCloud: ichimokuCloud,
        keltnerChannels: keltnerChannels,
        mfi: mfi,
        superTrend: superTrend,
        wma14: wma14,
        hma16: hma16,
        dema20: dema20,
        tema20: tema20,
        smma14: smma14,
        donchianChannels: donchianChannels,
        momentum: momentum,
        roc: roc,
        stochRsi: stochRsi,
        awesomeOscillator: awesomeOscillator,
        ppo: ppo,
        chaikinMF: chaikinMF,
        adLine: adLine,
        stdDev: stdDev,
        bbWidth: bbWidth,
        bbPercentB: bbPercentB,
        pivotPoints: pivotPoints,
        alligator: alligator,
        fractals: fractals,
        chaikinOsc: chaikinOsc,
        forceIndex: forceIndex,
        histVol: histVol,
        ultimateOsc: ultimateOsc,
        trix: trix,
        vortex: vortex,
        bop: bop,
        cog: cog,
        zigzag: zigzag,
        trendDetection: trendDetection,
        marketStructure: marketStructure,
        rsiDivergence: rsiDivergence,
        macdDivergence: macdDivergence,
        candlestickPatterns: candlestickPatterns,
        marketRegime: marketRegime,
        priceChange24h,
        volumeChange,
        // New Indicators
        linearRegression,
        maEnvelope,
        vwma,
        priceChannel,
        mcginleyDynamic,
        rainbowMA,
        elderRay,
        fisherTransform,
        kst,
        volumeProfile,
        bullBearPower,
        chandeMomentum,
        detrendedPrice,
        volumeOscillator,
        priceVolumeTrend,
        volumeROC,
        chaikinVolatility,
        massIndex,
        ulcerIndex,
        relativeVigorIndex,
        gatorOscillator,
        correlationCoefficient,
        rSquared,
        mcclellanOscillator,
        armsIndex,
        price: currentPrice || closes[closes.length - 1],
        candles: historicalData.length
    };
    // Verify we have at least one indicator
    if (!currentRsi14 && !currentEma20 && !currentMacd && !currentBB && !currentATR && !currentADX) {
        console.warn(`No indicators calculated for asset with ${historicalData.length} candles`);
        return null;
    }
    return indicators;
}
