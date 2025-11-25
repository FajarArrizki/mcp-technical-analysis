# Terminal UI Deployment Guide

## 🎯 Deployment Strategy

Terminal UI dibuat khusus untuk mengatasi masalah import saat deployment. Berikut adalah solusi yang diimplementasikan:

## ❌ Common Import Issues

### Problem 1: Dynamic Imports

```typescript
// ❌ Bermasalah di deployment
const module = await import('./dynamic-module')
```

### Solution:
```typescript
// ✅ Static imports
import { Module } from './module.js'
```

### Problem 2: ESM/CJS Compatibility

```typescript
// ❌ Bermasalah dengan bundlers
require('some-package')
```

### Solution:
```typescript
// ✅ Pure ESM
import { Package } from 'some-package'
```

### Problem 3: Complex Dependencies

```typescript
// ❌ Heavy dependencies
import chalk from 'chalk'
import ora from 'ora'
```

### Solution:
```typescript
// ✅ Built-in ANSI codes
const colors = {
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
}
```

## 🏗️ Architecture Design

### 1. Pure Node.js Implementation

Terminal UI menggunakan **built-in Node.js APIs** tanpa external dependencies yang kompleks:

```typescript
// ui.ts - Pure ANSI codes
export function createTheme(): Theme {
  return {
    primary: (text) => `\x1b[36m${text}\x1b[0m`,
    success: (text) => `\x1b[32m${text}\x1b[0m`,
    error: (text) => `\x1b[31m${text}\x1b[0m`,
  }
}
```

### 2. MCP Client Implementation

```typescript
// mcp-client.ts - Minimal dependencies
import { spawn, ChildProcess } from 'child_process'

export class MCPClient {
  private process?: ChildProcess
  
  async connect(): Promise<void> {
    this.process = spawn(this.config.command, this.config.args)
    // ... pure JSON-RPC over stdio
  }
}
```

### 3. CLI Implementation

```typescript
// cli.ts - Standalone executable
#!/usr/bin/env node

// No problematic imports
import { createTheme } from './ui.js'
import { MCPClient } from './mcp-client.js'

async function main() {
  // Pure logic
}

main()
```

## 📦 Build Process

### TypeScript Compilation

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "node",
    "outDir": "./dist"
  }
}
```

### Build Command

```bash
# Compile TypeScript
tsc

# Make executable
chmod +x dist/cli.js
```

### Output Structure

```
dist/
├── cli.js          # Main executable
├── cli.d.ts        # Type definitions
├── ui.js           # UI components
├── ui.d.ts
├── mcp-client.js   # MCP client
└── mcp-client.d.ts
```

## 🚀 Deployment Methods

### Method 1: Direct Node Execution

**Pros:**
- Simple
- No bundling needed
- Fast startup

**Cons:**
- Requires Node.js installed
- Needs source files

```bash
node dist/cli.js
```

### Method 2: Global NPM Package

**Pros:**
- Run from anywhere
- Version management
- Easy updates

**Cons:**
- Needs npm/pnpm
- Global pollution

```bash
pnpm link --global
geartrade
```

### Method 3: Bundled Executable

**Pros:**
- Single file
- No Node.js needed
- Portable

**Cons:**
- Larger file size
- Platform-specific

```bash
# Using pkg
npm install -g pkg
pkg dist/cli.js -t node20-linux-x64 -o geartrade
```

### Method 4: Docker Container

**Pros:**
- Consistent environment
- Easy distribution
- Isolated dependencies

**Cons:**
- Larger image size
- Requires Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN cd packages/terminal-ui && npm install && npm run build
CMD ["node", "packages/terminal-ui/dist/cli.js"]
```

### Method 5: Systemd Service

**Pros:**
- Auto-start
- Service management
- Logging integration

**Cons:**
- Linux only
- Requires root

```ini
[Service]
ExecStart=/usr/bin/node /root/GEARTRADE/packages/terminal-ui/dist/cli.js
```

## 🔧 Platform-Specific Deployment

### Linux

```bash
# Build
cd /root/GEARTRADE/packages/terminal-ui
pnpm run build

# Create symlink
sudo ln -s $(pwd)/dist/cli.js /usr/local/bin/geartrade

# Run
geartrade
```

### macOS

```bash
# Same as Linux
cd ~/GEARTRADE/packages/terminal-ui
pnpm run build
sudo ln -s $(pwd)/dist/cli.js /usr/local/bin/geartrade
geartrade
```

### Windows

```powershell
# Build
cd C:\GEARTRADE\packages\terminal-ui
pnpm run build

# Add to PATH
$env:PATH += ";C:\GEARTRADE\packages\terminal-ui\dist"

# Run
node dist/cli.js
```

### WSL (Windows Subsystem for Linux)

```bash
# Build on WSL
cd /mnt/c/GEARTRADE/packages/terminal-ui
pnpm run build

# Run
node dist/cli.js
```

## 🐳 Docker Deployment

### Dockerfile

```dockerfile
FROM node:20-alpine

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/terminal-ui/package.json ./packages/terminal-ui/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/terminal-ui ./packages/terminal-ui
COPY mcp.json ./

# Build
RUN cd packages/terminal-ui && pnpm run build

# Run
CMD ["node", "packages/terminal-ui/dist/cli.js"]
```

### Build & Run

```bash
# Build image
docker build -t geartrade-terminal .

# Run interactively
docker run -it geartrade-terminal

# Run with volume for config
docker run -it -v $(pwd)/mcp.json:/app/mcp.json geartrade-terminal
```

### Docker Compose

```yaml
version: '3.8'

services:
  terminal:
    build: .
    image: geartrade-terminal
    container_name: geartrade-terminal
    volumes:
      - ./mcp.json:/app/mcp.json
    stdin_open: true
    tty: true
```

Run:
```bash
docker-compose up
```

## ☸️ Kubernetes Deployment

### Deployment YAML

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: geartrade-terminal
spec:
  replicas: 1
  selector:
    matchLabels:
      app: geartrade-terminal
  template:
    metadata:
      labels:
        app: geartrade-terminal
    spec:
      containers:
      - name: terminal
        image: geartrade-terminal:latest
        stdin: true
        tty: true
        volumeMounts:
        - name: config
          mountPath: /app/mcp.json
          subPath: mcp.json
      volumes:
      - name: config
        configMap:
          name: geartrade-config
```

### ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: geartrade-config
data:
  mcp.json: |
    {
      "mcpServers": {
        "geartrade": {
          "command": "tsx",
          "args": ["packages/geartrade-mcp-server/src/index.ts"]
        }
      }
    }
```

Deploy:
```bash
kubectl apply -f deployment.yaml
kubectl apply -f configmap.yaml
```

## 🌐 Cloud Deployment

### AWS EC2

```bash
# SSH to instance
ssh ec2-user@your-instance

# Clone repo
git clone https://github.com/FajarArrizki/ai-trading-mcp-server.git
cd ai-trading-mcp-server

# Install Node.js
curl -fsSL https://fnm.vercel.app/install | bash
fnm install 20
fnm use 20

# Install pnpm
npm install -g pnpm

# Build
pnpm install
pnpm run terminal:build

# Run
pnpm run terminal
```

### Google Cloud Platform

```bash
# Create VM
gcloud compute instances create geartrade-terminal \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --machine-type=e2-medium

# SSH
gcloud compute ssh geartrade-terminal

# Same setup as AWS
```

### Azure VM

```bash
# Create VM
az vm create \
  --resource-group geartrade-rg \
  --name geartrade-terminal \
  --image UbuntuLTS \
  --size Standard_B2s

# SSH
az vm ssh -n geartrade-terminal -g geartrade-rg

# Same setup as AWS
```

### DigitalOcean Droplet

```bash
# Create droplet via web UI or CLI
doctl compute droplet create geartrade-terminal \
  --image ubuntu-22-04-x64 \
  --size s-1vcpu-2gb \
  --region nyc1

# SSH
ssh root@your-droplet-ip

# Same setup as AWS
```

## 🔒 Production Hardening

### 1. Environment Variables

```bash
# .env file
AI_PROVIDER=openrouter
MODEL_ID=openai/gpt-4-turbo
HYPERLIQUID_API_URL=https://api.hyperliquid.xyz
```

Load in code:
```typescript
import { config } from 'dotenv'
config()

const provider = process.env.AI_PROVIDER
```

### 2. Secrets Management

```bash
# Using Vault
vault kv put secret/geartrade \
  wallet_key=your-key \
  api_key=your-api-key
```

### 3. Logging

```typescript
import { createWriteStream } from 'fs'

const logStream = createWriteStream('terminal.log', { flags: 'a' })
console.log = (msg) => {
  logStream.write(`[${new Date().toISOString()}] ${msg}\n`)
}
```

### 4. Error Handling

```typescript
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
  process.exit(1)
})

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason)
  process.exit(1)
})
```

### 5. Health Checks

```bash
#!/bin/bash
# health-check.sh

if pgrep -f "cli.js" > /dev/null; then
  echo "Terminal is running"
  exit 0
else
  echo "Terminal is not running"
  exit 1
fi
```

## 📊 Monitoring

### 1. Process Monitoring

```bash
# Using PM2
npm install -g pm2
pm2 start packages/terminal-ui/dist/cli.js --name geartrade-terminal
pm2 save
pm2 startup
```

### 2. Log Monitoring

```bash
# Using journalctl (systemd)
journalctl -u geartrade-terminal -f

# Using PM2
pm2 logs geartrade-terminal
```

### 3. Resource Monitoring

```bash
# CPU & Memory
top -p $(pgrep -f cli.js)

# Detailed stats
ps aux | grep cli.js
```

## 🔄 Updates & Rollback

### Updates

```bash
# Pull latest code
git pull origin main

# Rebuild
pnpm run terminal:build

# Restart service
systemctl restart geartrade-terminal
```

### Rollback

```bash
# Checkout previous version
git checkout v1.0.0

# Rebuild
pnpm run terminal:build

# Restart
systemctl restart geartrade-terminal
```

## 📝 Checklist

- [ ] Build passes without errors
- [ ] No dynamic imports
- [ ] No problematic dependencies
- [ ] Proper error handling
- [ ] Logging configured
- [ ] Environment variables set
- [ ] Secrets secured
- [ ] Health checks working
- [ ] Monitoring in place
- [ ] Backup strategy
- [ ] Update procedure documented
- [ ] Rollback procedure tested

## 🆘 Support

Jika mengalami masalah deployment:

1. Check build logs
2. Verify Node.js version (20+)
3. Check file permissions
4. Review error logs
5. Open GitHub issue

---

**Happy Deploying! 🚀**


