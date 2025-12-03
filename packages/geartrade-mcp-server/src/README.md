# Source Code (src/)

This is the main source code directory for the GearTrade MCP Server. All TypeScript source files are organized here and compiled to the `dist/` directory.

## 📁 Directory Structure

```
src/
├── formatters/           Output formatting utilities (17 files)
├── memory/               AI memory storage and management
├── prompts/              AI prompt templates (31 prompts)
├── resources/            Educational resources (4 resources)
├── server/               HTTP/SSE infrastructure
├── signal-generation/    Core analysis engine
│   ├── analysis/         Market analysis modules
│   ├── data-fetchers/    API integrations
│   ├── exit-conditions/  Exit strategy calculations
│   ├── position-management/ Position tracking
│   ├── risk-management/  Risk and leverage calculations
│   ├── technical-indicators/ Indicator implementations
│   ├── types/            TypeScript type definitions
│   └── utils/            Utility functions
├── tools/                69 MCP tools (5 categories)
│   ├── account/          10 account management tools
│   ├── analysis/         15 market analysis tools
│   ├── data/             3 price & position tools
│   ├── indicators/       35 technical indicator tools
│   └── trading/          6 trading execution tools
└── index.ts              Main entry point
```

## 📝 Main Components

### 1. Entry Point (`index.ts`)
The main entry point that:
- Initializes the MCP server
- Registers all 69 tools
- Registers 31 prompts
- Registers 4 resources
- Sets up stdio or HTTP/SSE transport
- Handles errors and logging

### 2. Formatters
Utilities for formatting tool outputs:
- Technical indicators
- Volume analysis
- Market structure
- Order book depth
- Position data
- Risk calculations

See [formatters/README.md](formatters/README.md) for details.

### 3. Memory
AI memory storage using Mem0:
- Trade journaling
- Pattern learning
- Preference storage
- Performance tracking

See [memory/README.md](memory/README.md) for details.

### 4. Prompts
31 AI prompt templates for:
- Day trading workflows
- Swing trading strategies
- Position trading analysis

See [prompts/README.md](prompts/README.md) for details.

### 5. Resources
4 educational resources:
- Trading strategy guide
- Technical analysis reference
- Risk management guide
- Tool usage patterns

See [resources/README.md](resources/README.md) for details.

### 6. Server
HTTP/SSE infrastructure:
- CORS middleware
- JSON-RPC 2.0 handler
- Request/response processing

See [server/README.md](server/README.md) for details.

### 7. Signal Generation
Core analysis engine with:
- Market analysis algorithms
- Data fetchers (Hyperliquid, HyperScreener, etc.)
- Technical indicator calculations
- Risk management calculations
- Position management logic

See [signal-generation/README.md](signal-generation/README.md) for details.

### 8. Tools
69 MCP tools organized into 5 categories:
- **Account** (10 tools) - See [tools/account/README.md](tools/account/README.md)
- **Analysis** (15 tools) - See [tools/analysis/README.md](tools/analysis/README.md)
- **Data** (3 tools) - See [tools/data/README.md](tools/data/README.md)
- **Indicators** (35 tools) - See [tools/indicators/README.md](tools/indicators/README.md)
- **Trading** (6 tools) - See [tools/trading/README.md](tools/trading/README.md)

## 🔧 Architecture

### Component Flow

```
index.ts (Entry Point)
    ↓
MCP Server Initialization
    ↓
Register Components:
├── Tools (69)
│   ├── Use signal-generation for calculations
│   ├── Use formatters for output
│   └── Use data-fetchers for external data
├── Prompts (31)
│   └── Reference tools and resources
└── Resources (4)
    └── Provide educational content
    ↓
Transport Setup (stdio or HTTP)
    ↓
Ready to Accept Requests
```

### Data Flow

```
AI Assistant Request
    ↓
Tool Invocation
    ↓
Data Fetching (signal-generation/data-fetchers)
    ↓
Analysis/Calculation (signal-generation/analysis)
    ↓
Formatting (formatters)
    ↓
Response to AI Assistant
```

## 🎯 Key Features

### Modular Design
- Each directory has a specific purpose
- Clear separation of concerns
- Easy to maintain and extend

### Type Safety
- Full TypeScript coverage
- Zod schema validation
- Type definitions in `signal-generation/types/`

### Extensibility
- Easy to add new tools
- Simple to add new indicators
- Straightforward to add new data sources

### Performance
- Parallel tool execution support
- Efficient data fetching
- Minimal dependencies

## 📊 Code Statistics

```
Total Files:       ~150+
Total Lines:       ~30,000+
TypeScript:        100%
Components:        104 (69 tools + 31 prompts + 4 resources)
Categories:        5 (account, analysis, data, indicators, trading)
```

## 🚀 Development

### Adding a New Tool

1. **Choose Category**: Determine which category (account, analysis, data, indicators, trading)

2. **Create Tool File**: Add to appropriate subdirectory
```typescript
// tools/analysis/new-tool.ts
import { z } from 'zod'

export function registerNewTool(server: any) {
  server.registerTool(
    'new_tool',
    {
      title: 'New Tool',
      description: 'Tool description',
      inputSchema: z.object({
        param: z.string()
      }),
      outputSchema: z.object({
        result: z.string()
      })
    },
    async ({ param }) => {
      // Implementation
      return {
        content: [{ type: 'text', text: 'result' }],
        structuredContent: { result: 'data' }
      }
    }
  )
}
```

3. **Export from Category**: Add to category `index.ts`
```typescript
export { registerNewTool } from './new-tool'
```

4. **Register in Main**: Already handled by category registration

### Adding a New Indicator

1. **Implement Calculation**: Add to `signal-generation/technical-indicators/`
```typescript
export function calculateNewIndicator(data: number[], period: number) {
  // Calculation logic
  return {
    value: result,
    signal: 'BUY' | 'SELL' | 'NEUTRAL'
  }
}
```

2. **Create Tool**: Add to `tools/indicators/`

3. **Add Formatter**: If needed, add to `formatters/`

### Adding a New Data Source

1. **Create Fetcher**: Add to `signal-generation/data-fetchers/`
```typescript
export async function fetchNewData(symbol: string) {
  // API call
  return data
}
```

2. **Create Tool**: If exposing as tool, add to `tools/data/`

## 🛠️ Build Process

### TypeScript Compilation
```bash
# Compile TypeScript to JavaScript
npm run build

# Output directory: dist/
# Source maps: dist/**/*.js.map
# Type declarations: dist/**/*.d.ts
```

### Build Configuration
- **Target**: ES2020
- **Module**: CommonJS
- **Strict Mode**: Enabled
- **Source Maps**: Generated
- **Declaration Files**: Generated

## 📝 Code Style

### Naming Conventions
- **Files**: kebab-case (e.g., `market-sentiment.ts`)
- **Functions**: camelCase (e.g., `calculateRSI`)
- **Classes**: PascalCase (e.g., `TechnicalAnalyzer`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_RETRIES`)

### Import Order
1. External dependencies
2. Internal modules (signal-generation)
3. Formatters
4. Types
5. Utilities

### Documentation
- JSDoc comments for public functions
- Inline comments for complex logic
- README files in each directory

## 🔐 Security

- Environment variables for sensitive data
- No hardcoded secrets
- Input validation with Zod
- Safe wallet operations
- Testnet available for testing

## 🚀 Future Enhancements

- [ ] GraphQL API support
- [ ] WebSocket real-time streaming
- [ ] Plugin system for custom tools
- [ ] Hot reload for development
- [ ] Advanced caching layer
- [ ] Performance monitoring
- [ ] Unit test coverage
- [ ] Integration tests

## 📄 Related Documentation

- [Formatters](formatters/README.md)
- [Memory](memory/README.md)
- [Prompts](prompts/README.md)
- [Resources](resources/README.md)
- [Server](server/README.md)
- [Signal Generation](signal-generation/README.md)
- [Tools](tools/README.md)
  - [Account Tools](tools/account/README.md)
  - [Analysis Tools](tools/analysis/README.md)
  - [Data Tools](tools/data/README.md)
  - [Indicator Tools](tools/indicators/README.md)
  - [Trading Tools](tools/trading/README.md)

---

**Note**: This directory contains all source code. The compiled JavaScript is in `dist/` directory.
