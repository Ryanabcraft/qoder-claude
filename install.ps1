#requires -Version 5.1
[CmdletBinding()]
param(
  [string]$InstallDir = (Join-Path $env:LOCALAPPDATA 'qoder-bridge'),
  [string]$ProjectDir = (Get-Location).Path,
  [switch]$ProjectOnly,
  [switch]$SkipDeps,
  [switch]$NoStart
)

$ErrorActionPreference = 'Continue'
$RepoSlug = 'Ryanabcraft/qoder-bridge'
$Branch = 'main'
$Port = if ($env:BRIDGE_PORT) { $env:BRIDGE_PORT } else { '8787' }

function Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Ok($msg) { Write-Host "    ok  $msg" -ForegroundColor Green }
function Warn($msg) { Write-Host "    !!  $msg" -ForegroundColor Yellow }
function Die($msg) { Write-Host "`n    x   $msg" -ForegroundColor Red; exit 1 }

function Have($cmd) { $null -ne (Get-Command $cmd -ErrorAction SilentlyContinue) }

$SourceDir = $PSScriptRoot
if (-not $SourceDir -or -not (Test-Path (Join-Path $SourceDir 'src\server.js'))) {
  Step 'Baixando o bridge'
  $zip = Join-Path $env:TEMP 'qoder-bridge.zip'
  $stage = Join-Path $env:TEMP ('qb-' + [guid]::NewGuid().ToString('N'))
  New-Item -ItemType Directory -Path $stage -Force | Out-Null
  try {
    Invoke-WebRequest -UseBasicParsing -Uri "https://github.com/$RepoSlug/archive/refs/heads/$Branch.zip" -OutFile $zip
  } catch {
    Die 'download falhou. Verifique a conexao ou clone manualmente.'
  }
  Expand-Archive -LiteralPath $zip -DestinationPath $stage -Force
  $SourceDir = Get-ChildItem -Path $stage -Directory | Select-Object -First 1 | ForEach-Object { $_.FullName }
  if (-not $SourceDir) { Die 'pacote invalido.' }
  Ok "codigo em $SourceDir"
}

function Install-Winget($id, $cmdName) {
  if (-not (Have 'winget')) { Die "$cmdName ausente e winget nao encontrado. Instale manualmente." }
  Warn "$cmdName ausente, instalando via winget ($id)..."
  winget install --id $id -e --source winget --accept-package-agreements --accept-source-agreements --silent | Out-Null
  $env:Path = [System.Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path', 'User')
  if (-not (Have $cmdName)) { Die "$cmdName nao entrou no PATH. Reabra o terminal." }
}

Step 'Verificando dependencias'

if (-not (Have 'node')) {
  if ($SkipDeps) { Die 'Node.js ausente (use sem -SkipDeps).' }
  Install-Winget 'OpenJS.NodeJS.LTS' 'Node.js'
}
if (Have 'node') { Ok "node $(& node --version)" } else { Die 'node continua ausente. Reabra o terminal.' }

if (-not (Have 'qodercli')) {
  Step 'Instalando Qoder CLI'
  npm install -g @qoder-ai/qodercli | Out-Null
  if (-not (Have 'qodercli')) { Die 'qodercli nao entrou no PATH. Reabra o terminal e rode de novo.' }
}
Ok ('qodercli ' + ((& cmd /c 'qodercli --version 2>nul' | Select-Object -First 1) -join '').Trim())

Step 'Verificando login do Qoder'
$status = (& cmd /c 'qodercli status 2>nul' | Out-String)
if ($status -match 'Username:') {
  Ok (($status -split "`n" | Where-Object { $_ -match 'Username:' }) -join '').Trim()
} else {
  Warn 'sem sessao ativa; abrindo login no navegador'
  & cmd /c 'qodercli login'
  if ($LASTEXITCODE -ne 0) { Die 'login do Qoder falhou.' }
}

Step "Copiando o bridge para $InstallDir"
if ($SourceDir -ne $InstallDir) {
  if (-not (Test-Path $InstallDir)) { New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null }
  foreach ($item in @('src', 'scripts', 'package.json', 'README.md', 'SETUP.md', 'start.cmd', 'stop.cmd', 'enable-here.cmd', '.gitignore')) {
    $from = Join-Path $SourceDir $item
    if (Test-Path $from) { Copy-Item $from (Join-Path $InstallDir $item) -Recurse -Force }
  }
  Ok 'arquivos copiados'
} else {
  Ok 'executando no local definitivo'
}

Step 'Configurando o Claude Code'
$targets = @()
if ($ProjectOnly) { $targets += $ProjectDir } else { $targets += $env:USERPROFILE }
foreach ($t in $targets) {
  $env:QODER_CLAUDE_TARGET = $t
  & node (Join-Path $InstallDir 'scripts\enable-here.js')
  if ($LASTEXITCODE -ne 0) { Die "falha ao configurar $t" }
  Ok "$t\.claude\settings.json"
}

if ($NoStart) {
  Warn 'servidor nao iniciado (-NoStart)'
} else {
  Step 'Subindo o servidor'
  $listening = $false
  try {
    $probe = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$Port/health" -TimeoutSec 2
    $listening = ($probe.StatusCode -eq 200)
  } catch {}
  if ($listening) {
    Ok "ja estava no ar em 127.0.0.1:$Port"
  } else {
    $startCmd = Join-Path $InstallDir 'start.cmd'
    Start-Process -FilePath 'cmd.exe' -ArgumentList "/c `"`"$startCmd`"`"" -WorkingDirectory $InstallDir | Out-Null
    $ready = $false
    for ($i = 0; $i -lt 40; $i++) {
      Start-Sleep -Milliseconds 500
      try {
        $probe = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$Port/health" -TimeoutSec 2
        if ($probe.StatusCode -eq 200) { $ready = $true; break }
      } catch {}
    }
    if (-not $ready) {
      Warn 'o servidor nao respondeu; veja bridge.log'
      $log = Join-Path $InstallDir 'bridge.log'
      if (Test-Path $log) { Get-Content $log -Tail 15 | ForEach-Object { Write-Host "    $_" } }
      Die 'instalacao incompleta: servidor nao subiu'
    }
    Ok "servidor no ar em 127.0.0.1:$Port (janela qoder-bridge aberta)"
  }
}

Step 'Validando o caminho completo'
try {
  $r = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/v1/models" -TimeoutSec 10
  Ok ("modelos: " + (($r.data | Select-Object -First 6 | ForEach-Object { $_.id }) -join ', ') + ', ...')
} catch { Warn 'nao foi possivel listar modelos' }

Write-Host ''
Write-Host '  pronto.' -ForegroundColor Green
Write-Host "  bridge    : $InstallDir"
Write-Host "  porta     : $Port"
Write-Host "  iniciar   : `"$InstallDir\start.cmd`""
Write-Host "  parar     : `"$InstallDir\stop.cmd`""
Write-Host "  statusline: Qoder > <model> dentro do claude"
Write-Host ''
Write-Host '  abra um terminal novo, entre no projeto e rode: claude' -ForegroundColor Cyan
Write-Host ''
