# Terminal UI Examples

## 🎯 Common Use Cases

### 1. Get Real-Time Price

```
Main Menu > Execute a tool > get_realtime_price

Parameters:
- ticker: BTC

Result:
{
  "ticker": "BTC",
  "price": 43250.50,
  "timestamp": "2024-01-15T12:30:00Z",
  "volume24h": 25000000000,
  "change24h": 2.5
}
```

### 2. Technical Analysis

```
Main Menu > Execute a tool > analyze_technical_indicators

Parameters:
- ticker: ETH
- timeframe: 1h

Result:
{
  "ticker": "ETH",
  "timeframe": "1h",
  "indicators": {
    "rsi": 65.5,
    "macd": {
      "macd": 120.5,
      "signal": 115.2,
      "histogram": 5.3
    },
    "bollingerBands": {
      "upper": 2350,
      "middle": 2300,
      "lower": 2250
    },
    "ema": {
      "ema20": 2310,
      "ema50": 2280,
      "ema200": 2150
    }
  }
}
```

### 3. Volume Analysis

```
Main Menu > Execute a tool > analyze_volume

Parameters:
- ticker: SOL
- timeframe: 4h

Result:
{
  "ticker": "SOL",
  "volumeAnalysis": {
    "buyVolume": 1500000,
    "sellVolume": 1200000,
    "buyPressure": 0.555,
    "cvd": 300000,
    "volumeTrend": "increasing"
  }
}
```

### 4. Execute Paper Trade

```
Main Menu > Execute a tool > execute_paper_trade

Parameters:
- ticker: BTC
- side: LONG
- quantity: 0.1
- leverage: 10
- stopLoss: 42000
- takeProfit: 45000

Result:
{
  "orderId": "paper-12345",
  "ticker": "BTC",
  "side": "LONG",
  "quantity": 0.1,
  "entryPrice": 43250.50,
  "leverage": 10,
  "stopLoss": 42000,
  "takeProfit": 45000,
  "status": "filled",
  "timestamp": "2024-01-15T12:30:00Z"
}
```

### 5. Multi-Asset Scan

```
Main Menu > Execute a tool > scan_multiple_assets

Parameters:
- tickers: ["BTC", "ETH", "SOL", "AVAX"]
- minRsi: 30
- maxRsi: 70
- timeframe: 1h

Result:
{
  "opportunities": [
    {
      "ticker": "ETH",
      "rsi": 35.5,
      "recommendation": "BUY",
      "confidence": 0.85
    },
    {
      "ticker": "SOL",
      "rsi": 68.2,
      "recommendation": "SELL",
      "confidence": 0.72
    }
  ]
}
```

### 6. Risk Analysis

```
Main Menu > Execute a tool > analyze_risk

Parameters:
- ticker: BTC
- positionSize: 0.5
- leverage: 15
- accountBalance: 10000

Result:
{
  "ticker": "BTC",
  "risk": {
    "positionValue": 323777.5,
    "margin": 21585.17,
    "marginPercentage": 21.59,
    "liquidationPrice": 40458.27,
    "riskPercentage": 6.24,
    "recommendation": "MODERATE RISK"
  }
}
```

### 7. Fibonacci Levels

```
Main Menu > Execute a tool > calculate_fibonacci_levels

Parameters:
- ticker: ETH
- high: 2500
- low: 2000
- direction: LONG

Result:
{
  "ticker": "ETH",
  "fibonacci": {
    "level_0": 2000,
    "level_23.6": 2118,
    "level_38.2": 2191,
    "level_50": 2250,
    "level_61.8": 2309,
    "level_78.6": 2393,
    "level_100": 2500
  },
  "recommendation": {
    "entry": 2191,
    "stopLoss": 1980,
    "takeProfit1": 2309,
    "takeProfit2": 2393
  }
}
```

### 8. Order Book Analysis

```
Main Menu > Execute a tool > analyze_orderbook

Parameters:
- ticker: BTC
- depth: 50

Result:
{
  "ticker": "BTC",
  "orderbook": {
    "bidWall": 42500,
    "askWall": 43800,
    "bidVolume": 125.5,
    "askVolume": 98.2,
    "imbalance": 0.278,
    "support": 42500,
    "resistance": 43800
  }
}
```

### 9. Market Structure

```
Main Menu > Execute a tool > analyze_market_structure

Parameters:
- ticker: SOL
- timeframe: 1h
- lookback: 100

Result:
{
  "ticker": "SOL",
  "structure": {
    "trend": "BULLISH",
    "higherHighs": [105, 108, 112],
    "higherLows": [98, 102, 106],
    "changeOfCharacter": false,
    "keyLevels": {
      "support": 106,
      "resistance": 115
    }
  }
}
```

### 10. Check Trading State

```
Main Menu > List resources > Trading State

Result:
{
  "activePositions": 3,
  "totalPnL": 1250.50,
  "winRate": 0.65,
  "sharpeRatio": 1.82,
  "maxDrawdown": -250.00,
  "trades": {
    "total": 50,
    "wins": 32,
    "losses": 18
  }
}
```

## 🔄 Workflow Examples

### Workflow 1: Complete Trading Setup

```
1. Main Menu > Execute tool > get_realtime_price
   - ticker: BTC
   - Check current price

2. Main Menu > Execute tool > analyze_technical_indicators
   - ticker: BTC
   - timeframe: 1h
   - Review indicators

3. Main Menu > Execute tool > analyze_risk
   - ticker: BTC
   - positionSize: 0.1
   - leverage: 10
   - Calculate risk

4. Main Menu > Execute tool > execute_paper_trade
   - ticker: BTC
   - side: LONG
   - quantity: 0.1
   - leverage: 10
   - Execute trade

5. Main Menu > Read resource > Trading State
   - Check position status
```

### Workflow 2: Market Scanning

```
1. Main Menu > Execute tool > scan_multiple_assets
   - tickers: ["BTC", "ETH", "SOL", "AVAX", "MATIC"]
   - Find opportunities

2. For each opportunity:
   a. Execute tool > analyze_technical_indicators
   b. Execute tool > analyze_volume
   c. Execute tool > analyze_orderbook
   
3. Main Menu > Execute tool > comprehensive_analysis
   - ticker: <selected asset>
   - Get complete analysis

4. Main Menu > Execute tool > execute_paper_trade
   - Execute best opportunity
```

### Workflow 3: Risk Management

```
1. Main Menu > Read resource > Trading State
   - Check current positions

2. Main Menu > Execute tool > analyze_risk
   - For each position
   - Check risk levels

3. Main Menu > Execute tool > calculate_stop_loss
   - Update stop losses if needed

4. Main Menu > Read resource > Performance
   - Review performance metrics

5. Adjust positions based on risk analysis
```

### Workflow 4: Technical Analysis Deep Dive

```
1. Main Menu > Execute tool > analyze_technical_indicators
   - ticker: ETH
   - Get basic indicators

2. Main Menu > Execute tool > calculate_fibonacci_levels
   - Identify key levels

3. Main Menu > Execute tool > analyze_market_structure
   - Understand trend

4. Main Menu > Execute tool > detect_candlestick_patterns
   - Find patterns

5. Main Menu > Execute tool > detect_divergence
   - Check for divergence

6. Combine all analysis for trading decision
```

### Workflow 5: Position Monitoring

```
1. Main Menu > Read resource > Trading State
   - Check active positions

2. For each position:
   a. Execute tool > get_realtime_price
   b. Execute tool > analyze_technical_indicators
   c. Check if targets reached

3. Main Menu > Read resource > Performance
   - Review overall performance

4. Main Menu > Execute tool > risk_analysis
   - Ensure risk within limits

5. Adjust or close positions as needed
```

## 🎨 Advanced Examples

### Example 1: Automated Strategy Testing

```bash
# Script to test strategy
#!/bin/bash

# Get assets
assets=("BTC" "ETH" "SOL" "AVAX")

for asset in "${assets[@]}"; do
  echo "Analyzing $asset..."
  
  # Execute comprehensive analysis
  echo "$asset\n4h" | node dist/cli.js execute comprehensive_analysis
  
  # Wait for response
  sleep 2
done
```

### Example 2: Risk Report Generation

```bash
#!/bin/bash

# Generate daily risk report
date=$(date +%Y-%m-%d)
report="risk_report_$date.txt"

echo "Risk Report - $date" > $report
echo "===================" >> $report

# Get trading state
echo "" | node dist/cli.js read geartrade://state >> $report

# Get performance
echo "" | node dist/cli.js read geartrade://performance >> $report

# Email report
mail -s "Daily Risk Report" admin@example.com < $report
```

### Example 3: Multi-Timeframe Analysis

```typescript
// analyze.ts
const timeframes = ['15m', '1h', '4h', '1d']
const ticker = 'BTC'

for (const tf of timeframes) {
  const result = await client.callTool('analyze_technical_indicators', {
    ticker,
    timeframe: tf
  })
  
  console.log(`${ticker} ${tf}:`, result)
}
```

### Example 4: Alert System

```typescript
// alerts.ts
const thresholds = {
  rsi_oversold: 30,
  rsi_overbought: 70
}

setInterval(async () => {
  const result = await client.callTool('analyze_technical_indicators', {
    ticker: 'BTC',
    timeframe: '1h'
  })
  
  if (result.indicators.rsi < thresholds.rsi_oversold) {
    console.log('🚨 ALERT: BTC RSI Oversold!')
  }
  
  if (result.indicators.rsi > thresholds.rsi_overbought) {
    console.log('🚨 ALERT: BTC RSI Overbought!')
  }
}, 60000) // Check every minute
```

## 📚 Quick Reference

### Common Tools

| Tool | Parameters | Use Case |
|------|------------|----------|
| `get_realtime_price` | ticker | Quick price check |
| `analyze_technical_indicators` | ticker, timeframe | Technical analysis |
| `analyze_volume` | ticker, timeframe | Volume analysis |
| `execute_paper_trade` | ticker, side, quantity, leverage | Paper trading |
| `scan_multiple_assets` | tickers, filters | Market scanning |
| `comprehensive_analysis` | ticker | Complete analysis |

### Common Resources

| Resource | URI | Description |
|----------|-----|-------------|
| Trading State | `geartrade://state` | Active positions & PnL |
| Performance | `geartrade://performance` | Metrics & statistics |
| Configuration | `geartrade://config` | Server config |
| Documentation | `geartrade://docs/*` | Trading docs |

### Parameter Patterns

```
Tickers: BTC, ETH, SOL, AVAX, MATIC, etc.
Timeframes: 1m, 5m, 15m, 1h, 4h, 1d
Sides: LONG, SHORT
Leverage: 1-125 (use with caution!)
```

## 🎓 Best Practices

1. **Always check price first** before executing trades
2. **Use paper trading** to test strategies
3. **Analyze multiple timeframes** for confirmation
4. **Check volume** for liquidity validation
5. **Monitor risk** continuously
6. **Review performance** regularly
7. **Start with low leverage** (1-3x)
8. **Use stop losses** always
9. **Diversify** across assets
10. **Keep learning** from results

---

**Happy Trading! 📈**



