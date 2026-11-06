@echo off
setlocal
cd /d "%~dp0"
if not defined BRIDGE_PORT set "BRIDGE_PORT=8787"
node src\server.js
endlocal
