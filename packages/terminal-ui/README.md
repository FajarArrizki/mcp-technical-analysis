# GearTrade Terminal UI

Terminal UI interaktif untuk menghubungkan dan berinteraksi dengan MCP server GearTrade.

## Features

- 🎨 UI Terminal yang cantik seperti Claude Code
- 🔌 Connect ke MCP server tanpa masalah import
- 🛠️ List dan execute tools interaktif
- 📦 Akses resources dari MCP server
- ✅ Compatible dengan deployment (no problematic imports)

## Installation

```bash
cd packages/terminal-ui
pnpm install
pnpm run build
```

## Usage

### Development Mode

```bash
pnpm run dev
```

### Production Mode

```bash
pnpm run start
```

### Global Installation

```bash
pnpm link --global
geartrade
```

## Configuration

Terminal UI membaca konfigurasi dari `mcp.json` di root project:

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

## Menu Options

1. **List available tools** - Lihat semua tools yang tersedia di MCP server
2. **Execute a tool** - Jalankan tool dengan parameter interaktif
3. **List resources** - Lihat semua resources yang tersedia
4. **Read a resource** - Baca content dari resource
5. **Server status** - Cek status dan statistik server
6. **Exit** - Keluar dari terminal

## Screenshots

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

## Deployment

Terminal UI ini dibuat tanpa dependency yang bermasalah saat deployment:

- ✅ No dynamic imports
- ✅ Pure Node.js modules
- ✅ Compatible dengan bundlers
- ✅ Works di production environment

## Keyboard Shortcuts

- `↑` / `↓` - Navigate menu
- `1-6` - Quick select menu item
- `Enter` - Confirm selection
- `Esc` or `Ctrl+C` - Exit

## Development

```bash
# Build
pnpm run build

# Watch mode
pnpm run dev

# Test connection
node dist/cli.js
```

## Troubleshooting

### MCP Server not connecting

1. Pastikan `mcp.json` ada di root directory
2. Check command dan args sudah benar
3. Pastikan MCP server bisa dijalankan manual

### Module not found errors

```bash
pnpm install
pnpm run build
```

### Permission denied

```bash
chmod +x dist/cli.js
```



