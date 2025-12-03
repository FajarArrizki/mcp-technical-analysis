# Prompts

This directory contains AI prompt templates for various trading workflows and analysis scenarios. These prompts guide AI assistants to perform structured, comprehensive market analysis.

## 📁 Structure

- **`index.ts`** - Main export file registering all 31 AI prompts

## 🎯 Prompt Categories

### 1. Day Trading Prompts (9 prompts)
Pre-configured workflows for intraday trading strategies:
- Scalping setups (1-5 minute timeframes)
- Momentum trading (trend following, breakouts)
- Range trading (support/resistance bounces)
- Quick risk assessment and position sizing

### 2. Swing Trading Prompts (11 prompts)
Medium-term trading analysis (days to weeks):
- Multi-timeframe trend analysis
- Key level identification (support, resistance, Fibonacci)
- Pattern recognition (flags, triangles, head & shoulders)
- Risk/reward optimization

### 3. Position Trading Prompts (11 prompts)
Long-term trend following and macro analysis:
- Weekly/monthly trend alignment
- Fundamental + technical confluence
- Major support/resistance zones
- Portfolio-level risk management

## 📝 Prompt Features

Each prompt template includes:
- **Objective** - Clear goal definition
- **Timeframes** - Relevant timeframes for analysis
- **Indicators** - Which technical indicators to check
- **Risk Parameters** - Suggested risk/reward ratios
- **Entry/Exit Rules** - Systematic decision criteria
- **Market Context** - When to use this strategy

## 🔄 Usage

Prompts are automatically registered with the MCP server and can be invoked by AI assistants:

```typescript
// Prompts are registered in index.ts
server.registerPrompt('day_trading_scalp_btc', /* ... */)
server.registerPrompt('swing_trade_breakout_eth', /* ... */)
server.registerPrompt('position_trend_following', /* ... */)
```

## 🎨 Prompt Design

All prompts follow a structured format:
1. **Market Overview** - Current market state assessment
2. **Technical Analysis** - Indicator-based signals
3. **Volume Analysis** - Volume confirmation
4. **Risk Management** - Position sizing and stops
5. **Trade Plan** - Entry, exit, and management rules

## 📊 Integration with Tools

Prompts leverage all 69 available tools:
- **Technical Indicators** - RSI, MACD, EMA, Bollinger Bands
- **Volume Analysis** - CVD, volume profile, order flow
- **Market Structure** - Trend, support/resistance, patterns
- **Risk Management** - Position sizing, stop loss, take profit
- **External Data** - Funding rates, liquidations, whale activity

## 🏗️ Architecture

```
prompts/
└── index.ts (31 prompt templates)
    ├── Day Trading (9 prompts)
    ├── Swing Trading (11 prompts)
    └── Position Trading (11 prompts)
```

## 🚀 Future Enhancements

- Strategy backtesting prompts
- Multi-asset correlation prompts
- Options trading prompts
- DeFi-specific trading prompts

---

**Note**: Prompts are designed for AI assistants (Claude, GPT, etc.) to execute comprehensive trading analysis workflows.
