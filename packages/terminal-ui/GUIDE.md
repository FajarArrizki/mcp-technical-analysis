# GearTrade Terminal UI - Complete Guide

## 📖 Table of Contents

1. [Introduction](#introduction)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Usage](#usage)
5. [Features](#features)
6. [Deployment](#deployment)
7. [Troubleshooting](#troubleshooting)

## 🎯 Introduction

Terminal UI adalah interface interaktif untuk berinteraksi dengan GearTrade MCP Server. Dibuat dengan pure Node.js tanpa dependency yang bermasalah untuk compatibility maksimal saat deployment.

### Why Terminal UI?

- ✅ **No Import Issues** - Dibuat tanpa dynamic imports yang bermasalah
- ✅ **Standalone** - Tidak bergantung pada external packages yang kompleks
- ✅ **Interactive** - UI yang cantik dan user-friendly
- ✅ **Development** - Perfect untuk testing dan development
- ✅ **Production Ready** - Bisa di-deploy tanpa masalah

## 🚀 Installation

### Quick Start

```bash
cd /root/GEARTRADE

# Install dependencies
pnpm install

# Build terminal UI
pnpm run terminal:build

# Run terminal
pnpm run terminal
```

### Manual Installation

```bash
cd packages/terminal-ui

# Install
pnpm install

# Build
pnpm run build

# Run
pnpm run start
```

## ⚙️ Configuration

Terminal UI membaca konfigurasi dari `mcp.json` di root directory:

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

Anda bisa menambahkan multiple MCP servers:

```json
{
  "mcpServers": {
    "geartrade-dev": {
      "command": "tsx",
      "args": ["packages/geartrade-mcp-server/src/index.ts"],
      "env": {
        "AI_PROVIDER": "openrouter",
        "MODEL_ID": "openai/gpt-4-turbo"
      }
    },
    "geartrade-prod": {
      "command": "node",
      "args": ["packages/geartrade-mcp-server/dist/index.js"],
      "env": {
        "AI_PROVIDER": "openai",
        "MODEL_ID": "gpt-4"
      }
    }
  }
}
```

## 🎮 Usage

### Starting the Terminal

```bash
# From root directory
pnpm run terminal

# Or using script
bash scripts/start-terminal.sh

# Or direct
node packages/terminal-ui/dist/cli.js
```

### Welcome Screen

```
            ░░░░░░
    ░░░   ░░░░░░░░░░
   ░░░░░░░░░░░░░░░░░░░

                           ░░░░                     ██
                         ░░░░░░░░░░               ██▒▒██
                                            ▒▒      ██   ▒
       █████████                          ▒▒░░▒▒      ▒ ▒▒
      ██▄█████▄██                           ▒▒         ▒▒
       █████████                           ░          ▒
…………………█ █   █ █……………………………………………………………………░…………………………▒…………

 GearTrade Terminal

 Interactive MCP Server Interface
```

### Main Menu

```
 ▐▛███▜▌   GearTrade Terminal v1.0.0
▝▜█████▛▘  geartrade · MCP Server
  ▘▘ ▝▝    /root/GEARTRADE

────────────────────────────────────────────────────────────────────────────────
> What would you like to do?
────────────────────────────────────────────────────────────────────────────────

❯ 1. List available tools
  2. Execute a tool
  3. List resources
  4. Read a resource
  5. Server status
  6. Exit
```

## 🎨 Features

### 1. List Available Tools

Menampilkan semua tools yang tersedia dari MCP server:

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
```

### 2. Execute a Tool

Jalankan tool dengan parameter interaktif:

```
Execute: get_realtime_price

ticker (required)
  The cryptocurrency ticker symbol (e.g. BTC, ETH)
  Type: string
  Value: BTC

Parameters:
{
  "ticker": "BTC"
}

Execute tool? (Y/n): y

✔ Tool executed successfully

Result:
╌─────────────────────────────────────────────────────────────────────────────╌
{
  "ticker": "BTC",
  "price": 43250.50,
  "timestamp": "2024-01-15T12:30:00Z"
}
╌─────────────────────────────────────────────────────────────────────────────╌
```

### 3. List Resources

Menampilkan resources yang tersedia:

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
```

### 4. Read a Resource

Baca content dari resource:

```
Resource: Trading State
╌─────────────────────────────────────────────────────────────────────────────╌
{
  "activePositions": 2,
  "totalPnL": 1250.50,
  "winRate": 0.65,
  "sharpeRatio": 1.82
}
╌─────────────────────────────────────────────────────────────────────────────╌
```

### 5. Server Status

Cek status dan statistik server:

```
Server Status

✔ Server is healthy

┌──────────────────┬──────────────────────────────────────────────────────┐
│Property          │Value                                                 │
├──────────────────┼──────────────────────────────────────────────────────┤
│Server Name       │geartrade                                             │
├──────────────────┼──────────────────────────────────────────────────────┤
│Status            │Connected                                             │
├──────────────────┼──────────────────────────────────────────────────────┤
│Available Tools   │36                                                    │
├──────────────────┼──────────────────────────────────────────────────────┤
│Available Resources│25                                                   │
├──────────────────┼──────────────────────────────────────────────────────┤
│Protocol Version  │2024-11-05                                            │
└──────────────────┴──────────────────────────────────────────────────────┘
```

## 🎯 Keyboard Shortcuts

### Navigation
- `↑` / `↓` - Navigate menu up/down
- `1-6` - Quick select menu item by number
- `Enter` - Confirm selection
- `Esc` - Cancel/Go back
- `Ctrl+C` - Exit application

### Input
- Type text and press `Enter` to submit
- Empty input on optional fields = skip
- `Y/n` - Confirm prompts (default Yes)
- `y/N` - Confirm prompts (default No)

## 🚀 Deployment

### Production Build

```bash
cd packages/terminal-ui

# Build for production
pnpm run build

# Test production build
node dist/cli.js
```

### Global Installation

```bash
cd packages/terminal-ui

# Link globally
pnpm link --global

# Now run from anywhere
geartrade
```

### Docker Deployment

Create `Dockerfile`:

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy terminal UI
COPY packages/terminal-ui ./packages/terminal-ui
COPY mcp.json ./

# Install dependencies
RUN cd packages/terminal-ui && npm install && npm run build

# Run
CMD ["node", "packages/terminal-ui/dist/cli.js"]
```

Build and run:

```bash
docker build -t geartrade-terminal .
docker run -it geartrade-terminal
```

### Systemd Service

Create `/etc/systemd/system/geartrade-terminal.service`:

```ini
[Unit]
Description=GearTrade Terminal UI
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/GEARTRADE
ExecStart=/usr/bin/node /root/GEARTRADE/packages/terminal-ui/dist/cli.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable geartrade-terminal
sudo systemctl start geartrade-terminal
sudo systemctl status geartrade-terminal
```

## 🔧 Troubleshooting

### Server Not Connecting

**Problem:** Terminal tidak bisa connect ke MCP server

**Solution:**
1. Check `mcp.json` exists di root directory
2. Verify command dan args sudah benar
3. Test MCP server manual:
   ```bash
   tsx packages/geartrade-mcp-server/src/index.ts
   ```
4. Check environment variables sudah set

### Module Not Found

**Problem:** Error "Cannot find module"

**Solution:**
```bash
cd packages/terminal-ui
rm -rf node_modules
pnpm install
pnpm run build
```

### Permission Denied

**Problem:** `EACCES: permission denied`

**Solution:**
```bash
chmod +x packages/terminal-ui/dist/cli.js
chmod +x scripts/start-terminal.sh
```

### Terminal Colors Not Working

**Problem:** ANSI colors tidak muncul

**Solution:**
1. Check terminal supports ANSI colors
2. Set environment variable:
   ```bash
   export FORCE_COLOR=1
   ```
3. Use different terminal (iTerm2, Windows Terminal, etc.)

### Slow Response

**Problem:** Tool execution lambat

**Solution:**
1. Check network connection
2. Verify MCP server responding:
   ```bash
   curl http://localhost:3000/health
   ```
3. Check server logs untuk errors
4. Increase timeout di `mcp-client.ts`

### JSON Parse Error

**Problem:** "Unexpected token in JSON"

**Solution:**
1. Check MCP server output format
2. Enable debug logging
3. Verify JSON responses valid
4. Check for partial JSON in buffer

## 📚 Advanced Usage

### Custom Configuration Path

```bash
MCP_CONFIG=/custom/path/mcp.json node dist/cli.js
```

### Debug Mode

```bash
DEBUG=1 node dist/cli.js
```

### Logging

```bash
node dist/cli.js 2>&1 | tee terminal.log
```

### Batch Execution

```bash
# Execute tool from command line
echo "BTC" | node dist/cli.js execute get_realtime_price
```

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

## 📄 License

MIT License - see LICENSE file for details

---

**Built with ❤️ for the AI trading community**



