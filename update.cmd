@echo off
setlocal
cd /d "%~dp0"

echo [1/4] atualizando qodercli...
call npm install -g @qoder-ai/qodercli >nul 2>&1
if errorlevel 1 echo    falhou (siga sem atualizar o CLI)

echo [2/4] atualizando o bridge...
git pull --ff-only -q 2>nul
if errorlevel 1 echo    sem git ou sem remote; pulando

echo [3/4] regravando settings e model picker...
set "QODER_CLAUDE_TARGET=%USERPROFILE%"
node scripts\enable-here.js

echo [4/4] reiniciando o servidor...
call stop.cmd >nul 2>&1
start "qoder-bridge" cmd /c "%~dp0start.cmd"

timeout /t 3 >nul
powershell -NoProfile -Command "try { (Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8787/health -TimeoutSec 5).StatusCode } catch { 'servidor nao respondeu' }"

echo.
echo pronto. reinicie o claude para recarregar o /model.
endlocal
