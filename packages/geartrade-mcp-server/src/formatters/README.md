# Formatters

This directory contains response formatting utilities for various tool outputs. Formatters ensure consistent, readable, and structured data presentation across all tools.

## 📁 Files

### Core Formatters

- **`index.ts`** - Main export file for all formatters
- **`indicators.ts`** - Format technical indicators (RSI, MACD, EMA, Bollinger Bands, etc.)
- **`volume.ts`** - Format volume analysis data (CVD, volume trends, spikes)
- **`multitimeframe.ts`** - Format multi-timeframe trend alignment
- **`position.ts`** - Format position data (size, PnL, leverage, margin)
- **`risk-management.ts`** - Format risk management calculations (stop loss, take profit, R/R ratio)
- **`position-setup.ts`** - Format position sizing and setup calculations

### Market Analysis Formatters

- **`orderbook.ts`** - Format L2 order book depth analysis (bid/ask imbalance, walls)
- **`liquidation.ts`** - Format liquidation level analysis and heatmap data
- **`long-short-ratio.ts`** - Format long/short ratio and whale position data
- **`external-data.ts`** - Format external market data (funding rates, open interest)
- **`market-structure.ts`** - Format market structure analysis (COC, swing highs/lows)
- **`volume-profile.ts`** - Format volume profile data (POC, VAH, VAL)

### Pattern & Signal Formatters

- **`candlestick.ts`** - Format candlestick pattern detection results
- **`divergence.ts`** - Format RSI divergence signals (bullish/bearish)
- **`fibonacci.ts`** - Format Fibonacci retracement levels
- **`spot-futures-divergence.ts`** - Format spot vs futures price divergence

## 🎯 Purpose

Formatters serve to:

1. **Standardize Output** - Consistent data structure across all tools
2. **Improve Readability** - Human-friendly formatting with emojis and labels
3. **Add Context** - Interpretation and trading signals alongside raw data
4. **Type Safety** - Proper TypeScript types for all formatted outputs
5. **Reduce Duplication** - Centralized formatting logic

## 📝 Usage Example

```typescript
import { formatTechnicalIndicators } from './formatters/indicators'
import { formatVolumeAnalysis } from './formatters/volume'

// Format technical indicators
const formattedIndicators = formatTechnicalIndicators(rawIndicators, price)

// Format volume analysis
const formattedVolume = formatVolumeAnalysis(volumeData, historicalData)
```

## 🔄 Integration

All formatters are imported and used by tools in the following categories:
- **Analysis Tools** - Market data, technical analysis, patterns
- **Data Tools** - Price, position, and market data retrieval
- **Indicator Tools** - Technical indicator calculations

## 🏗️ Architecture

```
formatters/
├── Core Formatters (indicators, volume, position)
├── Market Analysis (orderbook, liquidation, market structure)
└── Patterns & Signals (candlestick, divergence, fibonacci)
```

---

**Note**: These formatters are internal utilities. They are not exposed as MCP tools but support tool output formatting.
