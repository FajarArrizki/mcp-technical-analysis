# Scripts

This directory contains automation scripts for running the MCP server.

## 📁 Files

- **`mcp-auto-start.bat`** - Windows batch script for auto-starting MCP server
- **`mcp-auto-start.sh`** - Unix/Linux shell script for auto-starting MCP server

## 🎯 Purpose

These scripts automate the process of:
1. Installing dependencies (if needed)
2. Building the TypeScript code
3. Starting the MCP server
4. Handling errors and restarts

## 🚀 Usage

### Windows
```bash
# Run from project root
scripts\mcp-auto-start.bat

# Or with full path
C:\path\to\mcp-technical-analysis\scripts\mcp-auto-start.bat
```

### Linux/Mac
```bash
# Make executable (first time only)
chmod +x scripts/mcp-auto-start.sh

# Run from project root
./scripts/mcp-auto-start.sh

# Or with full path
/path/to/mcp-technical-analysis/scripts/mcp-auto-start.sh
```

## 🔧 What the Scripts Do

### 1. Environment Check
- Verify Node.js is installed
- Check for required dependencies
- Validate project structure

### 2. Dependency Installation
- Run `npm install` if `node_modules` is missing
- Install TypeScript and build tools
- Set up development environment

### 3. Build Process
- Compile TypeScript to JavaScript (`npm run build`)
- Generate distribution files in `dist/`
- Report build errors if any

### 4. Server Startup
- Start MCP server with configured transport
- Set up stdio or HTTP/SSE mode
- Monitor for crashes and auto-restart

## 📋 Configuration

Scripts read environment variables from `.env` file:

```bash
# Transport mode (stdio or http)
MCP_TRANSPORT=stdio

# HTTP server port (if using http transport)
MCP_PORT=3000

# Hyperliquid configuration
AGENT_WALLET_PRIVATE_KEY=<your-private-key>
MAIN_WALLET_ADDRESS=<your-wallet-address>

# AI Memory (optional)
MEM0_API_KEY=<your-api-key>
MEM0_USER_ID=<your-user-id>
```

## 🔄 Auto-Restart

Both scripts include auto-restart logic:
- Monitor server process
- Restart on unexpected crashes
- Log restart attempts
- Maximum restart attempts before giving up

## 🛠️ Customization

### Windows (`mcp-auto-start.bat`)
```batch
REM Modify these variables
SET MAX_RESTARTS=5
SET RESTART_DELAY=3
```

### Linux/Mac (`mcp-auto-start.sh`)
```bash
# Modify these variables
MAX_RESTARTS=5
RESTART_DELAY=3
```

## 📊 Output

Scripts provide detailed logging:
```
[INFO] Checking dependencies...
[INFO] Building project...
[INFO] Starting MCP server...
[INFO] Server running on stdio transport
[ERROR] Server crashed, restarting in 3 seconds...
[INFO] Restart attempt 1/5
```

## 🚨 Troubleshooting

### Script won't run
**Windows:**
- Check execution policy: `Set-ExecutionPolicy RemoteSigned`
- Run as Administrator if needed

**Linux/Mac:**
- Ensure script is executable: `chmod +x mcp-auto-start.sh`
- Check shell compatibility (bash recommended)

### Dependencies not installing
- Check internet connection
- Verify Node.js version (14+ required)
- Clear npm cache: `npm cache clean --force`

### Build fails
- Check TypeScript errors in console
- Verify `tsconfig.json` is present
- Run `npm run build` manually to see detailed errors

### Server won't start
- Check `.env` file exists and has required variables
- Verify port is not already in use (HTTP mode)
- Check wallet private key is valid

## 🏗️ Architecture

```
scripts/
├── mcp-auto-start.bat  - Windows automation
└── mcp-auto-start.sh   - Unix/Linux automation
```

Both scripts follow the same workflow:
1. Check environment
2. Install dependencies
3. Build project
4. Start server
5. Monitor and restart if needed

## 🚀 Integration

### Windows Task Scheduler
Schedule the script to run on startup:
```
Task: MCP Server Auto-Start
Action: Start Program
Program: C:\path\to\scripts\mcp-auto-start.bat
Start in: C:\path\to\mcp-technical-analysis
```

### Linux systemd Service
Create a systemd service:
```ini
[Unit]
Description=MCP Technical Analysis Server
After=network.target

[Service]
Type=simple
User=youruser
WorkingDirectory=/path/to/mcp-technical-analysis
ExecStart=/path/to/scripts/mcp-auto-start.sh
Restart=always

[Install]
WantedBy=multi-user.target
```

### macOS launchd
Create a launch agent:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.geartrade.mcp</string>
    <key>ProgramArguments</key>
    <array>
        <string>/path/to/scripts/mcp-auto-start.sh</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
</dict>
</plist>
```

## 🚀 Future Enhancements

- Health check endpoint monitoring
- Automatic updates from git
- Log rotation and management
- Email/Slack notifications on failures
- Multi-instance support
- Docker container support

---

**Note**: These scripts are designed for development and testing. For production deployments, consider using proper process managers like PM2, systemd, or Docker.
