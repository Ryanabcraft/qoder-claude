@echo off
setlocal
cd /d "%~dp0"

echo [1/3] updating qodercli...
call npm install -g @qoder-ai/qodercli >nul 2>&1
if errorlevel 1 echo    failed; keeping the current version

echo [2/3] stopping the old server...
call "%~dp0stop.cmd" >nul 2>&1

echo [3/3] downloading and applying the current version...
set "PS1=%TEMP%\qoder-bridge-install.ps1"
curl -fsSL "https://raw.githubusercontent.com/Ryanabcraft/qoder-claude/main/install.ps1" -o "%PS1%"
if errorlevel 1 (
  echo    download failed.
  exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%PS1%"
set "RC=%ERRORLEVEL%"
del "%PS1%" >nul 2>&1

echo.
echo done. restart claude to reload /model.
exit /b %RC%
