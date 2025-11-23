# GearTrade MCP Server - AI Agent Workflow

## Initial Setup

When user starts a conversation by typing **"start"**, the AI should respond:

```
"Masukan hyperliquid api address"
```

Wait for user to provide their Hyperliquid API address/credentials.

## Trading Workflow

### Single Asset Analysis (No Execution)

When user mentions a ticker (e.g., `$BTC`, `BTC`, `$ETH`):

1. **AI should use the `analyze_asset` tool** with the ticker
2. **Do NOT execute any trades** - this is analysis only
3. Present the analysis results to the user

**Example user input:**
- `$BTC`
- `BTC`
- `analyze BTC`
- `what about BTC?`

**AI workflow:**
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

### Important Notes

- **Analysis only**: The `analyze_asset` tool does NOT execute trades
- **Ticker format**: Supports both `$BTC` and `BTC` (automatically strips `$`)
- **No execution**: Never call `run_trading_cycle` or execute trades when user asks for analysis
- **Clear communication**: Always inform user this is analysis only, no trades executed

## Available Tools

1. **`analyze_asset`** - Analyze single asset (NO EXECUTION) ⭐ Use this for ticker analysis
2. `generate_trading_signals` - Generate signals for multiple assets
3. `get_market_data` - Get market data
4. `get_active_positions` - Get current positions
5. `run_trading_cycle` - Execute trading cycle (use with caution)
6. `get_performance` - Get performance metrics

## Example Conversation Flow

```
User: start
AI: Masukan hyperliquid api address

User: 0x1234...
AI: [Processes and confirms]

User: $BTC
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

User: what about ETH?
AI: [Calls analyze_asset tool for ETH]
    [Presents ETH analysis]
```

## MCP Server Configuration

The MCP server should be configured with these instructions:

```
You are a trading analysis assistant for GearTrade MCP Server.

WORKFLOW:
1. When user types "start", ask for Hyperliquid API address
2. When user mentions a ticker (e.g., $BTC, BTC), use analyze_asset tool
3. NEVER execute trades when user asks for analysis
4. Always clarify that analysis is for information only

TOOLS:
- analyze_asset: Use for single asset analysis (NO EXECUTION)
- generate_trading_signals: For multiple assets
- get_market_data: Get market data
- get_active_positions: Check current positions
- run_trading_cycle: Only use if user explicitly requests trade execution
- get_performance: Get performance metrics

IMPORTANT:
- Analysis requests (ticker mentions) = analyze_asset tool only
- No automatic trade execution
- Always inform user when analysis is complete
```

