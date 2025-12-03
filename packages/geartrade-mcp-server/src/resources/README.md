# Resources

This directory contains educational and reference resources for trading strategies, technical analysis guides, and best practices.

## 📁 Structure

- **`index.ts`** - Main export file registering all 4 MCP resources

## 📚 Available Resources

### 1. Trading Strategy Guide
Comprehensive guide covering:
- Day trading strategies (scalping, momentum, range)
- Swing trading strategies (trend following, breakout, reversal)
- Position trading strategies (macro trends, fundamental analysis)
- Risk management principles
- Trade execution best practices

### 2. Technical Analysis Reference
Complete reference for all technical indicators:
- **Trend Indicators** - EMA, SMA, MACD, ADX, Parabolic SAR
- **Momentum Indicators** - RSI, Stochastic, CCI, Williams %R
- **Volume Indicators** - OBV, CVD, Chaikin Money Flow
- **Volatility Indicators** - Bollinger Bands, ATR, Keltner Channels
- **Support/Resistance** - Pivot Points, Fibonacci, Key Levels

### 3. Risk Management Guide
Essential risk management practices:
- Position sizing methodologies
- Leverage calculation and limits
- Stop loss placement strategies
- Take profit targets and R/R ratios
- Portfolio diversification
- Drawdown management

### 4. Tool Usage Patterns
Practical examples and patterns for using MCP tools:
- Multi-timeframe analysis workflow
- Volume profile trading setup
- Liquidation level analysis
- Whale tracking and copy trading
- AI memory and pattern learning

## 🎯 Purpose

Resources provide:
1. **Educational Content** - Learn trading concepts and strategies
2. **Reference Material** - Quick lookup for indicator definitions
3. **Best Practices** - Proven methodologies and workflows
4. **Usage Examples** - How to use MCP tools effectively

## 📝 Resource Format

Each resource is structured as:
- **Overview** - High-level introduction
- **Sections** - Organized topic breakdown
- **Examples** - Practical usage demonstrations
- **Tips & Warnings** - Important considerations

## 🔄 Usage

Resources are automatically registered with the MCP server and can be accessed by AI assistants:

```typescript
// Resources are registered in index.ts
server.registerResource('trading_strategy_guide', /* ... */)
server.registerResource('technical_analysis_reference', /* ... */)
server.registerResource('risk_management_guide', /* ... */)
server.registerResource('tool_usage_patterns', /* ... */)
```

## 📊 Integration

Resources complement:
- **Tools** - Reference for what each tool does
- **Prompts** - Background knowledge for prompt execution
- **Analysis** - Interpretation of technical indicators

## 🏗️ Architecture

```
resources/
└── index.ts (4 resource documents)
    ├── Trading Strategy Guide
    ├── Technical Analysis Reference
    ├── Risk Management Guide
    └── Tool Usage Patterns
```

## 🚀 Future Additions

- Market psychology guide
- Options trading reference
- DeFi strategy guide
- Backtesting methodology
- Trading journal templates

---

**Note**: Resources are educational content for AI assistants to provide informed trading guidance.
