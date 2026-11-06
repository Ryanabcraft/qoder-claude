@echo off
setlocal
cd /d "%~dp0"
title qoder-bridge
if not defined BRIDGE_PORT set "BRIDGE_PORT=8787"
set "BRIDGE_LOG_FILE=%~dp0bridge.log"

echo.
echo  ==================================================
echo   qoder-bridge - Qoder models inside Claude Code
echo  ==================================================
echo   port  : %BRIDGE_PORT%
echo   url   : http://127.0.0.1:%BRIDGE_PORT%
echo   log   : %BRIDGE_LOG_FILE%
echo.
echo   Close this window (or Ctrl+C) to stop the server.
echo.

curl -s -m 2 http://127.0.0.1:%BRIDGE_PORT%/health >nul 2>&1
if not errorlevel 1 (
  echo  [i] a server is already running on this port.
  echo      close this window. to restart: stop.cmd then start.cmd.
  echo.
  pause
  exit /b 0
)

node src\server.js
set "RC=%ERRORLEVEL%"

echo.
echo  server stopped (code %RC%).
pause >nul
exit /b %RC%
