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

**Response includes:**
- Trading signal (BUY/SELL/HOLD)
- Confidence score
- Entry price, stop loss, take profit
- Leverage recommendation
- Reasoning and justification
- Market data (price, volume, 24h change)
- Risk/reward ratio
- Expected value
- **Note: "This is analysis only. No trades were executed."**

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
