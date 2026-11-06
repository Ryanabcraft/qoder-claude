@echo off
setlocal
cd /d "%~dp0"
title qoder-bridge
if not defined BRIDGE_PORT set "BRIDGE_PORT=8787"
set "BRIDGE_LOG_FILE=%~dp0bridge.log"

echo.
echo  ==================================================
echo   qoder-bridge - modelos do Qoder no Claude Code
echo  ==================================================
echo   porta : %BRIDGE_PORT%
echo   url   : http://127.0.0.1:%BRIDGE_PORT%
echo   log   : %BRIDGE_LOG_FILE%
echo.
echo   Feche esta janela (ou Ctrl+C) para parar o servidor.
echo.

curl -s -m 2 http://127.0.0.1:%BRIDGE_PORT%/health >nul 2>&1
if not errorlevel 1 (
  echo  [i] ja existe um servidor no ar nesta porta.
  echo      feche esta janela. para reiniciar: stop.cmd e start.cmd.
  echo.
  pause
  exit /b 0
)

node src\server.js
set "RC=%ERRORLEVEL%"

echo.
echo  servidor encerrado (codigo %RC%).
pause >nul
exit /b %RC%
