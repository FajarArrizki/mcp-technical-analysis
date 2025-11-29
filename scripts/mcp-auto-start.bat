@echo off
REM Auto-start MCP Server for Cursor IDE - Windows Compatible

set SERVER_PORT=8787
set PROJECT_DIR=%~dp0..

echo 🔧 Cleaning up existing processes...

REM Kill all processes using port 8787
for /f "tokens=5" %%a in ('netstat -ano ^| find ":%SERVER_PORT%" ^| find "LISTENING"') do (
    echo Killing process %%a using port %SERVER_PORT%
    taskkill /PID %%a /F >nul 2>&1
)

REM Kill any existing node/tsx processes that might be running the server
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM tsx.exe >nul 2>&1

REM Wait a moment for processes to terminate
timeout /t 2 /nobreak >nul

echo 🚀 Starting MCP Server...

REM Start server in background
cd "%PROJECT_DIR%\packages\geartrade-mcp-server"
start /B cmd /C "npm run stream"

REM Wait for server to be ready
echo ⏳ Waiting for server to start...
timeout /t 5 /nobreak >nul

set SERVER_URL=http://localhost:%SERVER_PORT%

REM Connect via mcp-remote
echo 🔗 Connecting to MCP server at %SERVER_URL%/mcp
npx -y mcp-remote "%SERVER_URL%/mcp"
