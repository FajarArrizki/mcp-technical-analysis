# GearTrade MCP Server - AI Agent Workflow

## Initial Setup

When user starts a conversation by typing **"start"**, the AI should respond:

```
"Masukan hyperliquid api address"
```

Wait for user to provide their Hyperliquid API address/credentials.

## Two Modes: Analysis Only vs Real Trade

### Mode 1: Analysis Only (No Execution)

**Keywords:** `analisa`, `analisa $BTC`, `analisa BTC`

When user types:
- `analisa $BTC`
- `analisa BTC`
- `analisa ETH`
- Or just mentions a ticker like `$BTC` or `BTC`

**AI workflow:**
1. Use `analyze_asset` tool with the ticker
2. Present analysis results
3. **DO NOT execute any trades** - this is analysis only

**Example:**
```json
{
  "tool": "analyze_asset",
  "arguments": {
    "ticker": "BTC"
  }
}
```

**Output Format:**
The response is a formatted text string (not JSON) with box-drawing characters, showing:
- Complete technical analysis with all indicators
- Volume analysis with buy/sell pressure
- Multi-timeframe trend alignment
- External data (funding rate, open interest)
- Position setup with entry price, quantity, margin
- Risk management with stop loss and take profit
- Capital allocation details
- Confidence score and justification
- Red flags and invalidation conditions

**Response Format:**
The analysis is returned in a formatted box with ASCII art (same format as test-mode output), including:

```
┌──────────────────────────────────────────────────────────────────────┐
│ Signal #1                                                            │
├──────────────────────────────────────────────────────────────────────┤
│ Asset:          │ BTC                                                 │
│ Signal:         │ BUY_TO_ENTER (Short Term)                           │
│ Current Price:  │ $45,200                                              │
├──────────────────────────────────────────────────────────────────────┤
│ Technical:                                                           │
├──────────────────────────────────────────────────────────────────────┤
│   RSI(14):      │ 45.25 (Neutral)                                      │
│   RSI(7):       │ 42.10 (Neutral)                                      │
│   4H RSI:       │ 38.50 (Neutral)                                      │
│   EMA(20):      │ $44,800.00                                           │
│   EMA(50):      │ $44,500.00                                           │
│   MACD:         │ 0.1234                                               │
│   MACD Signal:  │ 0.0987                                               │
│   MACD Hist:    │ 0.0247                                               │
│   BB Upper:     │ $46,000.00                                           │
│   BB Middle:    │ $45,200.00                                           │
│   BB Lower:     │ $44,400.00                                           │
│   BB Position:  │ Above middle (Bullish)                               │
│   ATR(14):      │ $800.00 (Volatility)                                 │
│   ADX(14):      │ 25.50 (Strong Trend)                                 │
│   +DI/-DI:      │ 28.15/22.40                                          │
│   OBV:          │ 1234567.89                                           │
│   VWAP:         │ $45,100.00                                           │
│   Stochastic:   │ K: 45.23, D: 48.58                                   │
│   CCI:          │ 12.73                                                │
│   Williams %R:  │ -54.77                                               │
│   Parabolic SAR:│ $44,500.00 (Bullish)                                 │
│   Aroon:        │ Up: 85.62, Down: 14.38 (Strong Uptrend)              │
│   Support:      │ $44,000.00                                           │
│   Resistance:   │ $46,500.00                                           │
│   Fibonacci:    │ 23.6%                                                │
│     Direction:  │ uptrend | Range: $46,000 - $44,000                   │
│     Key Levels: │ 38.2%: $44,800 | 50%: $45,000 | 61.8%: $45,200      │
│   Trend:        │ uptrend (Strength: 3/3)                              │
│   Market Struct:│ bullish | HH: Yes | LL: No                            │
│   RSI Divergence│ bullish                                              │
│   Candlestick:  │ bullish_engulfing                                    │
│   Market Regime:│ trending (normal volatility)                         │
│   24h Change:   │ +2.50%                                                │
│   Vol Change:   │ +15.30%                                               │
├──────────────────────────────────────────────────────────────────────┤
│ Volume Analysis:                                                     │
├──────────────────────────────────────────────────────────────────────┤
│   Buy Volume:   │ 1,234,567.89                                         │
│   Sell Volume:  │ 1,123,456.78                                         │
│   Net Delta:    │ +111,111.11                                          │
│   Buy Pressure: │ 52.3%                                                │
│   Sell Pressure:│ 47.7%                                                │
│   Dominant Side:│ BUY                                                   │
│   Key Level:    │ $45,200.00 (Δ: +50,000.00)                           │
│   POC:          │ $45,100.00                                           │
│   VAH/VAL:      │ $45,500.00 / $44,800.00                              │
│   HVN:          │ $45,200.00, $45,100.00, $45,000.00                   │
│   LVN:          │ $44,500.00, $44,400.00, $44,300.00                   │
│   CVD Trend:    │ RISING                                               │
│   CVD Delta:    │ +200,000.00                                           │
│   Top Liquidity:│ 2 zones                                              │
│     Zone 1:     │ $45,000-$45,500 (resistance, high)                   │
│     Zone 2:     │ $44,500-$45,000 (support, high)                       │
│   Recommendation│ ENTER                                                 │
│   Confidence:   │ 75.0%                                                 │
│   Risk Level:   │ MEDIUM                                                │
├──────────────────────────────────────────────────────────────────────┤
│ Multi-Timeframe:                                                     │
├──────────────────────────────────────────────────────────────────────┤
│   Daily Trend:  │ uptrend                                               │
│   4H Aligned:   │ Yes                                                  │
│   1H Aligned:   │ Yes                                                  │
│   Overall:      │ Aligned                                              │
│   Score:        │ 100%                                                  │
├──────────────────────────────────────────────────────────────────────┤
│ External Data:                                                       │
├──────────────────────────────────────────────────────────────────────┤
│   Funding Rate: │ 0.0015% (stable)                                     │
│   Open Interest:│ $2,500,000,000.00 (increasing)                       │
│   Volume Trend: │ increasing                                           │
│   Volatility:   │ normal                                               │
├──────────────────────────────────────────────────────────────────────┤
│ POSITION SETUP                                                       │
├──────────────────────────────────────────────────────────────────────┤
│ Capital:        │ $10000.00                                            │
│ Timeframe:      │ Short Term (short term/long term[ Flexible with m... │
│ Entry Price:    │ $45,200.00 (LONG)                                   │
│ Quantity:       │ 0.22123894 BTC                                       │
│ Margin Used:    │ $3,600.00 (80.0% of $4,500.00 allocated capital)     │
│ Position Value: │ $19,800.00 (Leverage 5.5x — Flexible with market c... │
├──────────────────────────────────────────────────────────────────────┤
│ RISK MANAGEMENT                                                      │
├──────────────────────────────────────────────────────────────────────┤
│ Stop Loss (Fixed):│ $44,386.40 (1.80%)                                │
│ → Potential Loss:│ $356.40                                             │
│ Stop Loss (Flexible):│ $44,886.40 (0.69% [Adjustable with market c... │
│ → Potential Loss:│ $136.97                                             │
├──────────────────────────────────────────────────────────────────────┤
│ 💰 Capital Allocation:                                               │
├──────────────────────────────────────────────────────────────────────┤
│ Equal Allocation:│ ✅ Enabled                                          │
│ Capital per Signal:│ $4,500.00                                        │
│ Risk per Signal:│ $90.00                                               │
│ Risk Percentage:│ 0.90% of total                                      │
│ Risk (Fixed):   │ $90.00 at SL $44,386.40 (1.80%)                     │
│ Risk (Flex):    │ $90.00 at SL $44,886.40 (0.69%)                     │
│ Take Profit:    │ $43,166.00 (4.50%)                                   │
│ Potential TP:   │ $891.00 (R:R = 9.90:1 fixed, 9.90:1 flex)           │
├──────────────────────────────────────────────────────────────────────┤
│ Leverage:       │ 1x-10x (Current: 5.5x)                               │
│ Margin:         │ 25%-100% (Current: 80% of $4,500.00 allocated = $3... │
├──────────────────────────────────────────────────────────────────────┤
│ Confidence:     │ 73.86%                                               │
├──────────────────────────────────────────────────────────────────────┤
│ Justification:                                                       │
├──────────────────────────────────────────────────────────────────────┤
│ [Detailed justification with quality-weighted indicators,            │
│  contradictions, and reasoning]                                      │
├──────────────────────────────────────────────────────────────────────┤
│ RED FLAGS TO MONITOR:                                                │
├──────────────────────────────────────────────────────────────────────┤
│ - Low volatility (ATR 0.46% - whipsaw risk)                          │
│ - Watch these closely for exit signals                               │
├──────────────────────────────────────────────────────────────────────┤
│ Invalidation:                                                        │
├──────────────────────────────────────────────────────────────────────┤
│ Price breaks below $44,000.00 (support level) OR RSI(14) < 50        │
│ OR MACD histogram < 0 OR volume < 50% of 24h average                 │
└──────────────────────────────────────────────────────────────────────┘
```

**Note:** This is analysis only. No trades were executed.

### Mode 2: Real Trade Execution

**Keywords:** `Esekusi`, `Execute`

When user types:
- `Esekusi` (after analysis)
- `Execute`
- `Esekusi sekarang`

**AI workflow:**
1. Use `execute_trade` tool
2. Execute the trade immediately on Hyperliquid
3. Return execution status

**Example:**
```json
{
  "tool": "execute_trade",
  "arguments": {
    "ticker": "BTC",
    "action": "BUY"
  }
}
```

**Important:**
- This executes **REAL TRADES** with **REAL MONEY**
- Always confirm with user before executing
- Requires Hyperliquid API credentials to be configured
- Will use signal recommendations from previous analysis

## Complete Workflow Examples

### Example 1: Analysis Only

```
User: start
AI: Masukan hyperliquid api address

User: 0x1234...
AI: [Processes and confirms]

User: analisa $BTC
AI: [Calls analyze_asset tool]
    Analyzing BTC...
    
    Signal: BUY
    Confidence: 75%
    Entry: $45,200
    Stop Loss: $44,500
    Take Profit: $46,500
    Leverage: 2x
    Reasoning: [AI reasoning]
    
    Note: This is analysis only. No trades were executed.
```

### Example 2: Analysis + Execution

```
User: analisa $BTC
AI: [Calls analyze_asset tool]
    [Presents BTC analysis]
    Note: This is analysis only. No trades were executed.

User: Esekusi
AI: [Calls execute_trade tool]
    Executing trade for BTC...
    
    Status: executed
    Order ID: live_1234567890_abc123
    Symbol: BTC
    Side: LONG
    Quantity: 0.1
    Price: $45,200
    Status: FILLED
    
    Trade executed successfully for BTC
```

### Example 3: Multiple Assets Analysis

```
User: analisa $BTC
AI: [Presents BTC analysis]

User: analisa ETH
AI: [Presents ETH analysis]

User: Esekusi
AI: [Asks which asset to execute, or executes last analyzed asset]
```

## Available Tools

1. **`analyze_asset`** - Analyze single asset (NO EXECUTION) ⭐ Use for "analisa" keyword
2. **`execute_trade`** - Execute real trade in market ⭐ Use for "Esekusi" keyword
3. `generate_trading_signals` - Generate signals for multiple assets
4. `get_market_data` - Get market data
5. `get_active_positions` - Get current positions
6. `run_trading_cycle` - Execute trading cycle (test mode)
7. `get_performance` - Get performance metrics

## MCP Server Configuration

The MCP server should be configured with these instructions:

```
You are a trading analysis and execution assistant for GearTrade MCP Server.

WORKFLOW:
1. When user types "start", ask for Hyperliquid API address
2. When user types "analisa $BTC" or mentions a ticker, use analyze_asset tool (NO EXECUTION)
3. When user types "Esekusi" or "Execute", use execute_trade tool (REAL TRADE)
4. Always clarify mode: Analysis vs Execution

KEYWORDS:
- "analisa" / ticker mention = analyze_asset (analysis only)
- "Esekusi" / "Execute" = execute_trade (real execution)

TOOLS:
- analyze_asset: Use for "analisa" keyword or ticker mentions (NO EXECUTION)
- execute_trade: Use for "Esekusi" keyword (REAL TRADE - WARNING: Uses real money)
- generate_trading_signals: For multiple assets
- get_market_data: Get market data
- get_active_positions: Check current positions
- run_trading_cycle: Only use if user explicitly requests trade execution
- get_performance: Get performance metrics

IMPORTANT:
- "analisa" = Analysis only, no execution
- "Esekusi" = Real trade execution with real money
- Always inform user which mode is being used
- Confirm before executing real trades
- Analysis requests never execute trades automatically
```

## Safety Notes

⚠️ **CRITICAL WARNINGS:**

1. **`execute_trade` executes REAL TRADES with REAL MONEY**
2. Always confirm with user before executing
3. Requires valid Hyperliquid API credentials
4. Trades are executed immediately on Hyperliquid exchange
5. No undo or cancellation after execution
6. Use `analyze_asset` first to review before executing

## Error Handling

- If Hyperliquid credentials not configured: Show error message
- If signal generation fails: Show error with reason
- If execution fails: Show order status and rejection reason
- If ticker not found: Show error message
