@echo off
setlocal enabledelayedexpansion
REM Auto-start MCP Server for Cursor IDE - Windows Compatible

set SERVER_PORT=8787
set PROJECT_DIR=%~dp0..

REM Kill all processes using port 8787 (silent)
for /f "tokens=5" %%a in ('netstat -ano ^| find ":%SERVER_PORT%" ^| find "LISTENING"') do (
    taskkill /PID %%a /F >nul 2>&1
)

REM Kill any existing node/tsx processes that might be running the server
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM tsx.exe >nul 2>&1

REM Wait a moment for processes to terminate
timeout /t 2 /nobreak >nul

REM Start server in background
cd "%PROJECT_DIR%\packages\geartrade-mcp-server"
start /B cmd /C "pnpm run stream" >nul 2>&1

set SERVER_URL=http://localhost:%SERVER_PORT%

REM Wait for server to be ready (silent, max 15 seconds)
set COUNT=0

:WAIT_LOOP
set /a COUNT+=1
if %COUNT% GTR 15 goto TIMEOUT

curl -s --max-time 2 "%SERVER_URL%/health" >nul 2>&1
if %ERRORLEVEL% EQU 0 goto SERVER_READY

timeout /t 1 /nobreak >nul
goto WAIT_LOOP

:TIMEOUT
exit /b 1

:SERVER_READY
REM Connect via mcp-remote
npx -y mcp-remote "%SERVER_URL%/mcp"
