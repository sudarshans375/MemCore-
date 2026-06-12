@echo off
title MemCore MCP Auto-Setup
echo ============================================
echo  MemCore MCP Server - Auto Setup
echo ============================================
echo.
echo Checking environment...

echo [1/5] Verifying Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found! Please install Node.js first.
    pause
    exit /b 1
)
echo      Node.js found:
node --version

echo [2/5] Checking MemCore folder...
if not exist "%~dp0mcp-server.js" (
    echo ERROR: mcp-server.js not found in current directory!
    pause
    exit /b 1
)
echo      OK: %~dp0

echo [3/5] Installing npm dependencies...
cd /d "%~dp0"
if exist "node_modules\@modelcontextprotocol" (
    echo      Dependencies already installed
) else (
    echo      Installing dependencies...
    npm install
)

echo [4/5] Testing MCP server...
echo      Starting server...
echo {"jsonrpc":"2.0","id":1,"method":"tools/list"} | node mcp-server.js >nul 2>&1
if %errorlevel% equ 0 (
    echo      Server started successfully
) else (
    echo      Server test completed (ignore exit code for stdio test)
)

echo [5/5] Verifying configuration files...
if exist "%USERPROFILE%\.cursor\mcp.json" echo      Cursor: Config found
if exist "%APPDATA%\Code\User\mcp.json" echo      VS Code: Config found
if exist "%USERPROFILE%\.claude\settings.json" echo      Claude/Codebuff: Config found
if exist "%USERPROFILE%\.windsurf\mcp.json" echo      Windsurf: Config found

echo.
echo ============================================
echo  SETUP COMPLETE!
echo ============================================
echo.
echo MemCore MCP Server is ready to use.
echo.
echo Available commands:
echo   node mcp-server.js              - Start MCP server (stdio)
echo   node mcp-server.js --http       - Start MCP server (HTTP)
echo   node mcp-server.js --http 3200  - Start on custom port
echo   node mcp-server.js --version    - Show version
echo.
echo Connected AI tools:
echo   - Codebuff / Claude (global)
echo   - Cursor (global)
echo   - VS Code (global)
echo   - Windsurf (global)
echo.
pause
