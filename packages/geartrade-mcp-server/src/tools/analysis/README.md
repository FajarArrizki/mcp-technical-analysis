# Analysis Tools

This directory contains tools for comprehensive market analysis, including technical indicators, volume analysis, market structure, patterns, and whale tracking.

## 📁 Files

- **`index.ts`** - Export file for all analysis tools (15 tools)
- **`market-sentiment.ts`** - Market sentiment analysis (1 tool)
- **`technical-analysis-tools.ts`** - Multi-timeframe and volume analysis (3 tools)
- **`market-data-tools.ts`** - Orderbook, liquidations, correlations (4 tools)
- **`pattern-analysis-tools.ts`** - Pattern and structure detection (5 tools)
- **`whale-analysis-tools.ts`** - Whale tracking and tier classification (2 tools)

## 🔧 Tools (15 Total)

### Market Sentiment (1 tool)

**`get_market_sentiment`** - Comprehensive sentiment analysis
- Fear & Greed Index (alternative.me)
- BTC Dominance (CoinGecko)
- Funding Rate Summary (Hyperliquid)
- Overall sentiment score (0-100)
- Trading recommendation

### Technical Analysis (3 tools)

**`get_indicators`** - Technical indicators for multiple tickers
- RSI, MACD, EMA, Bollinger Bands
- Stochastic, CCI, Williams %R
- Support/resistance levels
- Trend signals

**`get_volume_analysis`** - Volume analysis for multiple tickers
- CVD (Cumulative Volume Delta)
- Volume trends and spikes
- Volume-price correlation
- Accumulation/distribution

**`get_Multitimeframe`** - Multi-timeframe trend alignment
- Daily, 4H, 1H trend analysis
- Trend strength scoring
- Timeframe confluence

### Market Data Analysis (4 tools)

**`get_External_data`** - External market data
- Funding rates (current, 1H, 4H, 8H)
- Open interest trends
- Liquidations (optional HyperScreener data)
- Whale positions (optional)
- Top traders (optional)

**`get_orderbook_depth`** - L2 order book depth analysis
- Bid/ask imbalance
- Order book walls
- Liquidity clusters
- Depth visualization

**`get_liquidation_levels`** - Liquidation level analysis
- Calculated liquidation clusters
- HyperScreener liquidation heatmap (optional)
- High-risk zones

**`get_correlation_analysis`** - BTC correlation analysis
- BTC dominance trends
- Altcoin correlation with BTC
- Beta analysis
- Market regime detection

### Pattern Analysis (5 tools)

**`get_volume_profile`** - Volume profile analysis
- Point of Control (POC)
- Value Area High (VAH)
- Value Area Low (VAL)
- High volume nodes

**`get_market_structure`** - Market structure analysis
- Change of Character (COC) detection
- Swing highs and lows
- Break of Structure (BOS)
- Trend continuation/reversal

**`get_market_regime`** - Market regime detection
- Trending vs Choppy vs Volatile
- Regime strength scoring
- Trading recommendations per regime

**`get_candlestick_patterns`** - Candlestick pattern detection
- Doji, Hammer, Shooting Star
- Engulfing, Harami, Morning/Evening Star
- Pattern strength and reliability

**`get_divergence`** - RSI divergence detection
- Bullish divergence (oversold)
- Bearish divergence (overbought)
- Hidden divergence
- Divergence strength

### Whale Analysis (2 tools)

**`get_whale_position`** - Track whale positions
- Manual wallet tracking with labels
- Top whales from HyperScreener
- Position change detection
- Tier classification per wallet

**`get_tier_classification`** - Market breakdown by trader tier
- Shrimp to Institutional classification
- Long/Short breakdown per tier
- Top wallets per tier
- Whale concentration metrics

## 🎯 Use Cases

### Market Sentiment Analysis
```typescript
get_market_sentiment({
  includeFearGreed: true,
  includeBtcDominance: true,
  includeFundingSummary: true
})
```

### Technical Analysis
```typescript
// Multiple tickers at once
get_indicators({ tickers: ['BTC', 'ETH', 'SOL'] })
get_volume_analysis({ tickers: ['BTC', 'ETH'] })
get_Multitimeframe({ tickers: ['BTC'] })
```

### Market Data
```typescript
// External data with HyperScreener
get_External_data({
  tickers: ['BTC', 'ETH'],
  includeHyperscreener: true
})

// Order book depth
get_orderbook_depth({
  tickers: ['BTC'],
  nSigFigs: 2
})

// Correlation analysis
get_correlation_analysis({
  tickers: ['ETH', 'SOL', 'AVAX'],
  period: 30
})
```

### Pattern Detection
```typescript
// Volume profile
get_volume_profile({ tickers: ['BTC'] })

// Market structure
get_market_structure({ tickers: ['BTC', 'ETH'] })

// Candlestick patterns
get_candlestick_patterns({ tickers: ['BTC'] })

// RSI divergence
get_divergence({ tickers: ['BTC', 'ETH'] })
```

### Whale Tracking
```typescript
// Track specific wallets
get_whale_position({
  wallets: [
    { address: '0x...', label: 'Smart Money 1' },
    { address: '0x...', label: 'Competitor A' }
  ],
  includeHyperscreener: true,
  hyperscreenerLimit: 10,
  tickers: ['BTC', 'ETH'],
  detectChanges: true
})

// Tier classification
get_tier_classification({
  tickers: ['BTC', 'ETH'],
  limit: 200
})
```

## 📊 Data Sources

- **Hyperliquid** - Real-time prices, order book, funding rates
- **HyperScreener** - Liquidations, whale positions, top traders
- **CoinGecko** - BTC dominance, market data
- **Alternative.me** - Fear & Greed Index
- **Internal Calculations** - Technical indicators, patterns, volume analysis

## 🏗️ Architecture

```
analysis/
├── market-sentiment.ts          (1 tool)
├── technical-analysis-tools.ts  (3 tools)
├── market-data-tools.ts         (4 tools)
├── pattern-analysis-tools.ts    (5 tools)
└── whale-analysis-tools.ts      (2 tools)
```

## 🚀 Future Enhancements

- Machine learning pattern recognition
- Sentiment analysis from social media
- On-chain data integration
- Options flow analysis
- Institutional money flow tracking

---

**Note**: Analysis tools are the core of the MCP server, providing comprehensive market insights for informed trading decisions.
