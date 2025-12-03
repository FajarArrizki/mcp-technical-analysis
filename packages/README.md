# Packages

This directory contains the monorepo packages for the MCP Technical Analysis project.

## 📁 Structure

```
packages/
├── geartrade-mcp-server/    - Main MCP server package
└── .env.example             - Example environment configuration
```

## 📦 Packages

### geartrade-mcp-server

The core MCP (Model Context Protocol) server providing technical analysis tools for AI assistants.

**Key Features:**
- 69 analysis and trading tools
- 35 technical indicators
- 31 AI prompts
- 4 educational resources
- Hyperliquid integration (futures & spot trading)
- AI memory with Mem0
- Real-time market data
- Whale tracking and tier classification

**Technologies:**
- TypeScript
- Nullshot MCP SDK
- Hyperliquid API
- HyperScreener API
- Mem0 AI Memory

See [geartrade-mcp-server/README.md](geartrade-mcp-server/README.md) for detailed documentation.

## 🔧 Environment Configuration

Copy `.env.example` to each package directory and configure:

```bash
# Copy example to package
cp packages/.env.example packages/geartrade-mcp-server/.env

# Edit with your values
nano packages/geartrade-mcp-server/.env
```

### Required Variables

```bash
# Hyperliquid Trading (required for trading tools)
AGENT_WALLET_PRIVATE_KEY=<your-private-key>
MAIN_WALLET_ADDRESS=<your-wallet-address>

# AI Memory (optional, for memory tools)
MEM0_API_KEY=<your-api-key>
MEM0_USER_ID=<your-user-id>

# Server Configuration
MCP_TRANSPORT=stdio    # or 'http' for HTTP/SSE mode
MCP_PORT=3000         # only for HTTP mode
```

## 🚀 Quick Start

### Install Dependencies
```bash
# From project root
npm install

# Or from specific package
cd packages/geartrade-mcp-server
npm install
```

### Build Package
```bash
# From project root
npm run build

# Or from specific package
cd packages/geartrade-mcp-server
npm run build
```

### Run Package
```bash
# From specific package directory
cd packages/geartrade-mcp-server
node dist/index.js
```

## 🏗️ Monorepo Structure

This project uses a monorepo structure with:
- **Workspace Management**: pnpm workspaces
- **Shared Dependencies**: Common packages in root
- **Independent Versioning**: Each package has its own version

### Workspace Configuration

`pnpm-workspace.yaml`:
```yaml
packages:
  - 'packages/*'
```

`package.json` (root):
```json
{
  "workspaces": [
    "packages/*"
  ]
}
```

## 📊 Package Dependencies

### geartrade-mcp-server
- **Runtime**: Node.js 14+
- **Framework**: Nullshot MCP SDK
- **Language**: TypeScript 5.x
- **APIs**: Hyperliquid, HyperScreener, CoinGecko, Alternative.me
- **Memory**: Mem0 AI Memory

## 🔄 Development Workflow

### 1. Install Dependencies
```bash
# Install all packages
pnpm install
```

### 2. Build All Packages
```bash
# Build from root
npm run build
```

### 3. Test Package
```bash
cd packages/geartrade-mcp-server
npm test
```

### 4. Run in Development
```bash
cd packages/geartrade-mcp-server
npm run dev
```

## 📝 Adding New Packages

To add a new package to the monorepo:

1. Create package directory:
```bash
mkdir -p packages/new-package
cd packages/new-package
```

2. Initialize package:
```bash
npm init -y
```

3. Configure `package.json`:
```json
{
  "name": "@geartrade/new-package",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts"
}
```

4. Add to workspace:
Package is automatically included via `packages/*` glob.

## 🔗 Inter-Package Dependencies

Packages can depend on each other:

```json
{
  "dependencies": {
    "@geartrade/shared-utils": "workspace:*"
  }
}
```

## 🚀 Build System

Each package has its own build configuration:

### TypeScript Configuration
- Individual `tsconfig.json` per package
- Shared base config from root (optional)
- Incremental builds for faster compilation

### Build Outputs
- Source: `src/`
- Distribution: `dist/`
- Type definitions: `dist/**/*.d.ts`

## 📦 Publishing

Packages are published independently:

```bash
# Version bump
cd packages/geartrade-mcp-server
npm version patch

# Publish
npm publish --access public
```

## 🛠️ Maintenance

### Update Dependencies
```bash
# Update all packages
pnpm update

# Update specific package
cd packages/geartrade-mcp-server
pnpm update
```

### Clean Build Artifacts
```bash
# Clean all packages
npm run clean

# Or manually
rm -rf packages/*/dist
rm -rf packages/*/node_modules
```

## 🏗️ Architecture

```
packages/
├── geartrade-mcp-server/     Main MCP server
│   ├── src/                  Source code
│   │   ├── formatters/      Output formatters
│   │   ├── prompts/         AI prompt templates
│   │   ├── resources/       Educational resources
│   │   ├── server/          HTTP/SSE infrastructure
│   │   ├── signal-generation/ Analysis engine
│   │   └── tools/           69 MCP tools
│   ├── dist/                Built JavaScript
│   ├── package.json         Package manifest
│   └── tsconfig.json        TypeScript config
└── .env.example             Environment template
```

## 🚀 Future Packages

Planned additions to the monorepo:
- **@geartrade/shared-types** - Shared TypeScript types
- **@geartrade/utils** - Common utilities
- **@geartrade/backtesting** - Strategy backtesting engine
- **@geartrade/web-ui** - Web dashboard
- **@geartrade/cli** - Command-line interface

---

**Note**: This is a monorepo structure designed for scalability and code sharing across multiple packages.
