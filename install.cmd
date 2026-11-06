@echo off
setlocal
set "PS1=%TEMP%\qoder-bridge-install.ps1"
curl -fsSL "https://raw.githubusercontent.com/Ryanabcraft/qoder-claude/main/install.ps1" -o "%PS1%"
if errorlevel 1 (
  echo installer download failed.
  exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%PS1%"
set "RC=%ERRORLEVEL%"
del "%PS1%" >nul 2>&1
exit /b %RC%
