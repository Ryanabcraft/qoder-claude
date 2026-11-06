@echo off
setlocal
if not defined BRIDGE_PORT set "BRIDGE_PORT=8787"
for /f "tokens=5" %%p in ('netstat -ano ^| findstr /r /c:":%BRIDGE_PORT% .*LISTENING"') do taskkill /f /pid %%p >nul 2>&1
echo qoder-bridge parado na porta %BRIDGE_PORT%.
endlocal
