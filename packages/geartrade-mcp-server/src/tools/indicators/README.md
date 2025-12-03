# Indicator Tools

This directory contains 35 technical indicator calculation tools organized by category.

## 📁 Files

- **`index.ts`** - Export file for all indicator tools (35 tools)
- **`moving-averages.ts`** - Moving average indicators (10 tools)
- **`oscillators.ts`** - Momentum oscillators (14 tools)
- **`channels.ts`** - Channel indicators (3 tools)
- **`pivot-points.ts`** - Pivot point calculations (3 tools)
- **`trend-indicators.ts`** - Trend following indicators (6 tools)
- **`patterns.ts`** - Pattern recognition (3 tools)
- **`strength-indicators.ts`** - Strength/power indicators (4 tools)
- **`volatility-indicators.ts`** - Volatility measures (6 tools)
- **`volume-indicators.ts`** - Volume-based indicators (8 tools)

## 🔧 Tools (35 Total)

### Moving Averages (10 tools)

1. **`ma_envelope`** - Moving Average Envelope
2. **`vwma`** - Volume Weighted Moving Average
3. **`mcginley_dynamic`** - McGinley Dynamic MA
4. **`rainbow_ma`** - Rainbow Moving Averages
5. **`kaufman_adaptive_ma`** - Kaufman Adaptive MA
6. **`hull_ma`** - Hull Moving Average
7. **`weighted_ma`** - Weighted Moving Average
8. **`smoothed_ma`** - Smoothed Moving Average
9. **`double_ema`** - Double Exponential MA
10. **`triple_ema`** - Triple Exponential MA

### Oscillators (14 tools)

11. **`stochastic_rsi`** - Stochastic RSI
12. **`chande_momentum`** - Chande Momentum Oscillator
13. **`percentage_price_oscillator`** - PPO
14. **`accelerator_oscillator`** - Accelerator Oscillator
15. **`awesome_oscillator`** - Awesome Oscillator
16. **`gator_oscillator`** - Gator Oscillator
17. **`elder_ray`** - Elder Ray Index
18. **`fisher_transform`** - Fisher Transform
19. **`know_sure_thing`** - Know Sure Thing
20. **`schaff_trend_cycle`** - Schaff Trend Cycle
21. **`coppock_curve`** - Coppock Curve
22. **`true_strength_index`** - True Strength Index
23. **`relative_vigor_index`** - Relative Vigor Index
24. **`detrended_price`** - Detrended Price Oscillator
25. **`momentum`** - Momentum Indicator
26. **`rate_of_change`** - Rate of Change
27. **`ultimate_oscillator`** - Ultimate Oscillator
28. **`trix`** - TRIX

### Channels (3 tools)

29. **`channels`** - Unified channel indicators
    - Keltner Channels
    - Donchian Channels
    - Price Channel

### Pivot Points (3 tools)

30. **`pivot_points`** - Unified pivot point calculations
    - Camarilla Pivots
    - Standard Pivot Points
    - Fibonacci Retracement

### Trend Indicators (6 tools)

31. **`trend_indicators`** - Unified trend indicators
    - SuperTrend
    - Alligator
    - Ichimoku Cloud
    - Vortex Indicator
    - Linear Regression
    - R-Squared

### Patterns (3 tools)

32. **`patterns`** - Pattern recognition
    - Fractals
    - ZigZag
    - Change of Character

### Strength Indicators (4 tools)

33. **`strength_indicators`** - Strength/power measures
    - Bull Bear Power
    - Force Index
    - Center of Gravity
    - Balance of Power

### Volatility Indicators (6 tools)

34. **`volatility_indicators`** - Volatility measures
    - Bollinger Band Width
    - Bollinger %B
    - Chaikin Volatility
    - Historical Volatility
    - Mass Index
    - Ulcer Index

### Volume Indicators (8 tools)

35. **`volume_indicators`** - Volume-based indicators
    - Chaikin Money Flow
    - Chaikin Oscillator
    - Volume Oscillator
    - Price Volume Trend
    - Positive Volume Index
    - Volume ROC
    - Volume Zone Oscillator
    - Money Flow Index

## 🎯 Use Cases

### Moving Averages
```typescript
// Hull Moving Average
hull_ma({
  prices: [100, 102, 101, 103, 105],
  period: 16
})

// Volume Weighted MA
vwma({
  prices: [100, 102, 101, 103, 105],
  volumes: [1000, 1200, 900, 1100, 1300],
  period: 20
})

// Rainbow MAs
rainbow_ma({
  prices: closesPrices,
  periods: [2, 3, 4, 5, 6, 7, 8, 9]
})
```

### Oscillators
```typescript
// Stochastic RSI
stochastic_rsi({
  closes: closePrices,
  period: 14,
  kPeriod: 14,
  dPeriod: 3
})

// Fisher Transform
fisher_transform({
  highs: highPrices,
  lows: lowPrices,
  period: 10,
  triggerPeriod: 5
})

// Schaff Trend Cycle
schaff_trend_cycle({
  highs: highPrices,
  lows: lowPrices,
  closes: closePrices,
  cycleLength: 23,
  fastLength: 23,
  slowLength: 50,
  kPeriod: 10,
  dPeriod: 3
})
```

### Channels
```typescript
// Keltner Channels
channels({
  type: 'keltner_channels',
  closes: closePrices,
  highs: highPrices,
  lows: lowPrices,
  period: 20,
  atrPeriod: 10,
  multiplier: 2
})

// Donchian Channels
channels({
  type: 'donchian_channels',
  closes: closePrices,
  highs: highPrices,
  lows: lowPrices,
  period: 20
})
```

### Pivot Points
```typescript
// Standard Pivots
pivot_points({
  type: 'standard',
  high: 100,
  low: 95,
  close: 98
})

// Fibonacci Retracement
pivot_points({
  type: 'fibonacci_retracement',
  closes: closePrices,
  lookbackPeriod: 50
})
```

### Trend Indicators
```typescript
// SuperTrend
trend_indicators({
  type: 'supertrend',
  closes: closePrices,
  highs: highPrices,
  lows: lowPrices,
  period: 14,
  multiplier: 3
})

// Ichimoku Cloud
trend_indicators({
  type: 'ichimoku_cloud',
  closes: closePrices,
  highs: highPrices,
  lows: lowPrices,
  tenkanPeriod: 9,
  kijunPeriod: 26,
  senkouPeriod: 52
})
```

### Patterns
```typescript
// Fractals
patterns({
  type: 'fractals',
  closes: closePrices,
  highs: highPrices,
  lows: lowPrices
})

// ZigZag
patterns({
  type: 'zigzag',
  closes: closePrices,
  highs: highPrices,
  lows: lowPrices,
  deviation: 5
})
```

### Strength Indicators
```typescript
// Bull Bear Power
strength_indicators({
  type: 'bull_bear_power',
  closes: closePrices,
  highs: highPrices,
  lows: lowPrices,
  period: 13
})

// Balance of Power
strength_indicators({
  type: 'balance_of_power',
  opens: openPrices,
  highs: highPrices,
  lows: lowPrices,
  closes: closePrices
})
```

### Volatility Indicators
```typescript
// Bollinger %B
volatility_indicators({
  type: 'bollinger_percent_b',
  closes: closePrices,
  period: 20,
  stdDev: 2
})

// Historical Volatility
volatility_indicators({
  type: 'historical_volatility',
  closes: closePrices,
  period: 20
})
```

### Volume Indicators
```typescript
// Chaikin Money Flow
volume_indicators({
  type: 'chaikin_money_flow',
  closes: closePrices,
  highs: highPrices,
  lows: lowPrices,
  volumes: volumeData,
  period: 20
})

// Money Flow Index
volume_indicators({
  type: 'money_flow_index',
  closes: closePrices,
  highs: highPrices,
  lows: lowPrices,
  volumes: volumeData,
  period: 14
})
```

## 📊 Input Requirements

### Common Parameters
- **prices/closes** - Array of closing prices (minimum 5-50 values depending on indicator)
- **highs** - Array of high prices (for some indicators)
- **lows** - Array of low prices (for some indicators)
- **opens** - Array of opening prices (for some indicators)
- **volumes** - Array of volume data (for volume indicators)
- **period** - Calculation period (default varies by indicator)

### Optional Parameters
- **multiplier** - ATR or standard deviation multiplier
- **fastPeriod/slowPeriod** - For dual-period indicators
- **signalPeriod** - For signal line calculations
- **lookbackPeriod** - Historical data lookback

## 🏗️ Architecture

```
indicators/
├── moving-averages.ts      (10 tools)
├── oscillators.ts          (14 tools)
├── channels.ts             (3 tools)
├── pivot-points.ts         (3 tools)
├── trend-indicators.ts     (6 tools)
├── patterns.ts             (3 tools)
├── strength-indicators.ts  (4 tools)
├── volatility-indicators.ts (6 tools)
└── volume-indicators.ts    (8 tools)
```

## 🎨 Indicator Categories

### Trend Following
- Moving Averages (10)
- Trend Indicators (6)
- Channels (3)

### Momentum
- Oscillators (14)
- Strength Indicators (4)

### Volatility
- Volatility Indicators (6)

### Volume
- Volume Indicators (8)

### Support/Resistance
- Pivot Points (3)
- Patterns (3)

## 🚀 Future Enhancements

- Machine learning-based indicators
- Composite indicators (multi-indicator fusion)
- Custom indicator builder
- Backtesting support
- Signal optimization

---

**Note**: All indicators return standardized output with interpretation, signals, and trading recommendations.
