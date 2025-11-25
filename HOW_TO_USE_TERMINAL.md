# 🚀 How to Use GearTrade Terminal UI

## 🎯 Quick Start (3 Steps)

### Step 1: Build Terminal

```bash
cd /root/GEARTRADE
pnpm run terminal:build
```

### Step 2: Verify Setup

```bash
bash scripts/verify-terminal.sh
```

### Step 3: Run Terminal

```bash
pnpm run terminal
```

That's it! 🎉

---

## 📖 Complete Usage Guide

### Method 1: Using npm scripts (Recommended)

```bash
# From root directory
pnpm run terminal
```

### Method 2: Using launcher script

```bash
# Linux/Mac
bash scripts/start-terminal.sh

# Windows
scripts\start-terminal.bat
```

### Method 3: Direct execution

```bash
node packages/terminal-ui/dist/cli.js
```

### Method 4: Quick start script

```bash
# Automatically checks, builds, and runs
bash scripts/quick-start-terminal.sh
```

---

## 🎮 Using the Terminal

### Welcome Screen

When you start the terminal, you'll see:

```
            ░░░░░░
    ░░░   ░░░░░░░░░░
   ░░░░░░░░░░░░░░░░░░░

 GearTrade Terminal

 Interactive MCP Server Interface

╌───────────────────────────────────────────────────╌
  Security notes:
  
  • Always review tool execution results
  • MCP servers can execute code and make network requests
  • Only use with trusted server configurations
╌───────────────────────────────────────────────────╌

Press Enter to continue…
```

**Action:** Press `Enter` to continue

### Server Selection

If you have multiple servers configured:

```
Select MCP Server:

❯ 1. geartrade
  2. geartrade-dev
  3. geartrade-prod

Enter to confirm · Esc to cancel
```

**Actions:**
- `↑` / `↓` - Navigate
- `1-9` - Quick select
- `Enter` - Confirm
- `Esc` - Cancel

### Main Menu

After connection, you'll see:

```
 ▐▛███▜▌   GearTrade Terminal v1.0.0
▝▜█████▛▘  geartrade · MCP Server
  ▘▘ ▝▝    /root/GEARTRADE

────────────────────────────────────────────────────────────────
> What would you like to do?
────────────────────────────────────────────────────────────────

❯ 1. List available tools
  2. Execute a tool
  3. List resources
  4. Read a resource
  5. Server status
  6. Exit
```

**Actions:**
- `↑` / `↓` - Navigate menu
- `1-6` - Quick select option
- `Enter` - Confirm selection
- `Esc` or `Ctrl+C` - Exit

---

## 🛠️ Menu Options Explained

### 1. List Available Tools

Shows all tools from your MCP server:

```
Available Tools

1. get_realtime_price
   Get real-time price for a cryptocurrency
   Parameters: ticker

2. analyze_technical_indicators
   Analyze technical indicators for a cryptocurrency
   Parameters: ticker, timeframe

3. execute_paper_trade
   Execute a paper trade
   Parameters: ticker, side, quantity, leverage

... (and 33 more tools)
```

**Use this to:**
- Browse available functionality
- See tool descriptions
- Check required parameters
- Plan your workflow

### 2. Execute a Tool

Run a tool interactively:

**Step 1:** Select tool
```
Select tool to execute:

❯ 1. get_realtime_price - Get real-time price
  2. analyze_technical_indicators - Analyze indicators
  3. execute_paper_trade - Execute paper trade
  ...
```

**Step 2:** Enter parameters
```
Execute: get_realtime_price

ticker (required)
  The cryptocurrency ticker symbol (e.g. BTC, ETH)
  Type: string
  Value: █
```

Type: `BTC` and press `Enter`

**Step 3:** Confirm execution
```
Parameters:
{
  "ticker": "BTC"
}

Execute tool? (Y/n): █
```

Press `Y` or `Enter`

**Step 4:** View result
```
✔ Tool executed successfully

Result:
╌───────────────────────────────────────────────────╌
{
  "ticker": "BTC",
  "price": 43250.50,
  "timestamp": "2024-01-15T12:30:00Z",
  "volume24h": 25000000000,
  "change24h": 2.5
}
╌───────────────────────────────────────────────────╌

Press Enter to continue…
```

### 3. List Resources

Shows available data resources:

```
Available Resources

1. Trading State
   URI: geartrade://state
   Type: application/json

2. Performance Metrics
   URI: geartrade://performance
   Type: application/json

3. Configuration
   URI: geartrade://config
   Type: application/json

... (and 22 more resources)
```

**Use this to:**
- See available data
- Find specific resources
- Plan data access

### 4. Read a Resource

Access resource data:

**Step 1:** Select resource
```
Select resource to read:

❯ 1. Trading State - geartrade://state
  2. Performance Metrics - geartrade://performance
  3. Configuration - geartrade://config
  ...
```

**Step 2:** View content
```
⠋ Reading resource...
✔ Resource loaded

Resource: Trading State
╌───────────────────────────────────────────────────╌
{
  "activePositions": 2,
  "totalPnL": 1250.50,
  "winRate": 0.65,
  "sharpeRatio": 1.82,
  "maxDrawdown": -250.00
}
╌───────────────────────────────────────────────────╌

Press Enter to continue…
```

### 5. Server Status

Check server health:

```
⠋ Checking server status...
✔ Server is healthy

┌──────────────────┬─────────────────────────────────┐
│Property          │Value                            │
├──────────────────┼─────────────────────────────────┤
│Server Name       │geartrade                        │
├──────────────────┼─────────────────────────────────┤
│Status            │Connected                        │
├──────────────────┼─────────────────────────────────┤
│Available Tools   │36                               │
├──────────────────┼─────────────────────────────────┤
│Available Resources│25                              │
├──────────────────┼─────────────────────────────────┤
│Protocol Version  │2024-11-05                       │
└──────────────────┴─────────────────────────────────┘

Press Enter to continue…
```

### 6. Exit

Disconnect and exit:

```
✔ Disconnected from server

Goodbye! 👋
```

---

## ⌨️ Keyboard Shortcuts

### Navigation

| Key | Action |
|-----|--------|
| `↑` | Move selection up |
| `↓` | Move selection down |
| `1-9` | Quick select by number |
| `Enter` | Confirm/Continue |
| `Esc` | Go back/Cancel |
| `Ctrl+C` | Exit immediately |

### Input

| Key | Action |
|-----|--------|
| Type | Enter text |
| `Enter` | Submit input |
| `Backspace` | Delete character |
| `Ctrl+U` | Clear line |

### Prompts

| Input | Action |
|-------|--------|
| `Y` or `y` | Yes |
| `N` or `n` | No |
| `Enter` | Use default |

---

## 📚 Common Workflows

### Workflow 1: Check Price & Analysis

```
1. Select: Execute a tool
2. Choose: get_realtime_price
3. Enter: BTC
4. View price result
5. Back to main menu
6. Select: Execute a tool
7. Choose: analyze_technical_indicators
8. Enter: BTC, 1h
9. View analysis result
```

### Workflow 2: Execute Paper Trade

```
1. Select: Execute a tool
2. Choose: execute_paper_trade
3. Enter parameters:
   - ticker: BTC
   - side: LONG
   - quantity: 0.1
   - leverage: 10
4. Confirm execution
5. View trade result
6. Select: Read a resource
7. Choose: Trading State
8. Check position status
```

### Workflow 3: Multi-Asset Scan

```
1. Select: Execute a tool
2. Choose: scan_multiple_assets
3. Enter:
   - tickers: ["BTC", "ETH", "SOL"]
   - minRsi: 30
   - maxRsi: 70
4. View opportunities
5. For each opportunity:
   - Execute comprehensive_analysis
   - Review results
6. Execute best trade
```

---

## 🔧 Configuration

### mcp.json Setup

Create or edit `mcp.json` in root:

```json
{
  "mcpServers": {
    "geartrade": {
      "command": "tsx",
      "args": ["packages/geartrade-mcp-server/src/index.ts"],
      "env": {
        "AI_PROVIDER": "openrouter",
        "MODEL_ID": "openai/gpt-4-turbo",
        "HYPERLIQUID_API_URL": "https://api.hyperliquid.xyz"
      }
    }
  }
}
```

### Multiple Servers

```json
{
  "mcpServers": {
    "geartrade-dev": {
      "command": "tsx",
      "args": ["packages/geartrade-mcp-server/src/index.ts"],
      "env": {
        "NODE_ENV": "development"
      }
    },
    "geartrade-prod": {
      "command": "node",
      "args": ["packages/geartrade-mcp-server/dist/index.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

---

## 🐛 Troubleshooting

### Terminal won't start

```bash
# Rebuild
pnpm run terminal:build

# Verify
bash scripts/verify-terminal.sh

# Try again
pnpm run terminal
```

### Can't connect to server

```bash
# Check mcp.json exists
cat mcp.json

# Test server manually
tsx packages/geartrade-mcp-server/src/index.ts

# Check logs for errors
```

### Colors not showing

```bash
# Enable colors
export FORCE_COLOR=1

# Run terminal
pnpm run terminal
```

### Permission denied

```bash
# Fix permissions
chmod +x packages/terminal-ui/dist/cli.js
chmod +x scripts/*.sh

# Try again
pnpm run terminal
```

---

## 📖 More Help

- **Full Guide**: [packages/terminal-ui/GUIDE.md](packages/terminal-ui/GUIDE.md)
- **Examples**: [packages/terminal-ui/EXAMPLES.md](packages/terminal-ui/EXAMPLES.md)
- **Deployment**: [packages/terminal-ui/DEPLOYMENT.md](packages/terminal-ui/DEPLOYMENT.md)
- **Summary**: [TERMINAL_UI_SUMMARY.md](TERMINAL_UI_SUMMARY.md)

---

## 🎉 You're Ready!

Start trading with:

```bash
pnpm run terminal
```

**Happy trading! 📈**


