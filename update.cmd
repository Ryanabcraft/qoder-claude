@echo off
setlocal
cd /d "%~dp0"

echo [1/3] atualizando qodercli...
call npm install -g @qoder-ai/qodercli >nul 2>&1
if errorlevel 1 echo    falhou; seguindo com a versao atual

echo [2/3] parando o servidor antigo...
call "%~dp0stop.cmd" >nul 2>&1

echo [3/3] baixando e aplicando a versao atual...
set "PS1=%TEMP%\qoder-bridge-install.ps1"
curl -fsSL "https://raw.githubusercontent.com/Ryanabcraft/qoder-claude/main/install.ps1" -o "%PS1%"
if errorlevel 1 (
  echo    download falhou.
  exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%PS1%"
set "RC=%ERRORLEVEL%"
del "%PS1%" >nul 2>&1

echo.
echo pronto. reinicie o claude para recarregar o /model.
exit /b %RC%
