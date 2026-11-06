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
$RepoSlug = 'Ryanabcraft/qoder-claude'
$Branch = 'main'
$Port = if ($env:BRIDGE_PORT) { $env:BRIDGE_PORT } else { '8787' }

function Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Ok($msg) { Write-Host "    ok  $msg" -ForegroundColor Green }
function Warn($msg) { Write-Host "    !!  $msg" -ForegroundColor Yellow }
function Die($msg) { Write-Host "`n    x   $msg" -ForegroundColor Red; exit 1 }

function Have($cmd) { $null -ne (Get-Command $cmd -ErrorAction SilentlyContinue) }

$SourceDir = $PSScriptRoot
if (-not $SourceDir -or -not (Test-Path (Join-Path $SourceDir 'src\server.js'))) {
  Step 'Downloading the bridge'
  $zip = Join-Path $env:TEMP 'qoder-bridge.zip'
  $stage = Join-Path $env:TEMP ('qb-' + [guid]::NewGuid().ToString('N'))
  New-Item -ItemType Directory -Path $stage -Force | Out-Null
  try {
    Invoke-WebRequest -UseBasicParsing -Uri "https://github.com/$RepoSlug/archive/refs/heads/$Branch.zip" -OutFile $zip
  } catch {
    Die 'download failed. Check the connection or clone manually.'
  }
  Expand-Archive -LiteralPath $zip -DestinationPath $stage -Force
  $SourceDir = Get-ChildItem -Path $stage -Directory | Select-Object -First 1 | ForEach-Object { $_.FullName }
  if (-not $SourceDir) { Die 'invalid package.' }
  Ok "code at $SourceDir"
}

function Install-Winget($id, $cmdName) {
  if (-not (Have 'winget')) { Die "$cmdName is missing and winget was not found. Install it manually." }
  Warn "$cmdName ausente, instalando via winget ($id)..."
  winget install --id $id -e --source winget --accept-package-agreements --accept-source-agreements --silent | Out-Null
  $env:Path = [System.Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path', 'User')
  if (-not (Have $cmdName)) { Die "$cmdName is not on PATH. Reopen the terminal." }
}

Step 'Checking dependencies'

if (-not (Have 'node')) {
  if ($SkipDeps) { Die 'Node.js is missing (run without -SkipDeps).' }
  Install-Winget 'OpenJS.NodeJS.LTS' 'Node.js'
}
if (Have 'node') { Ok "node $(& node --version)" } else { Die 'node is still missing. Reopen the terminal.' }

if (-not (Have 'qodercli')) {
  Step 'Installing Qoder CLI'
  npm install -g @qoder-ai/qodercli | Out-Null
  if (-not (Have 'qodercli')) { Die 'qodercli is not on PATH. Reopen the terminal and run again.' }
}
Ok ('qodercli ' + ((& cmd /c 'qodercli --version 2>nul' | Select-Object -First 1) -join '').Trim())

Step 'Checking Qoder login'
$status = (& cmd /c 'qodercli status 2>nul' | Out-String)
if ($status -match 'Username:') {
  Ok (($status -split "`n" | Where-Object { $_ -match 'Username:' }) -join '').Trim()
} else {
  Warn 'no active session; opening the browser login'
  & cmd /c 'qodercli login'
  if ($LASTEXITCODE -ne 0) { Die 'Qoder login failed.' }
}

Step "Copying the bridge to $InstallDir"
if ($SourceDir -ne $InstallDir) {
  if (-not (Test-Path $InstallDir)) { New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null }
  foreach ($item in @('src', 'scripts', 'bin', 'package.json', 'README.md', 'SETUP.md', 'LICENSE', 'CONTRIBUTING.md', 'start.cmd', 'stop.cmd', 'update.cmd', 'enable-here.cmd', 'start.sh', 'stop.sh', 'update.sh', 'install.cmd', '.gitignore')) {
    $from = Join-Path $SourceDir $item
    if (Test-Path $from) {
      $dest = Join-Path $InstallDir $item
      if (Test-Path $dest) { Remove-Item $dest -Recurse -Force }
      Copy-Item $from $dest -Recurse -Force
    }
  }
  Ok 'files copied'
} else {
  Ok 'running in place'
}

Step 'Installing the qclaude command'
$binDir = Join-Path $InstallDir 'bin'
New-Item -ItemType Directory -Path $binDir -Force | Out-Null
$shim = "@echo off`r`nnode `"$binDir\qclaude.js`" %*`r`n"
Set-Content -Path (Join-Path $binDir 'qclaude.cmd') -Value $shim -Encoding ascii
$userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
if (-not $userPath) { $userPath = '' }
if ($userPath -split ';' -notcontains $binDir) {
  $newPath = if ($userPath.TrimEnd(';')) { $userPath.TrimEnd(';') + ';' + $binDir } else { $binDir }
  [Environment]::SetEnvironmentVariable('Path', $newPath, 'User')
  Ok "user PATH updated with $binDir"
} else {
  Ok "qclaude was already on PATH"
}
if (-not (($env:Path -split ';') -contains $binDir)) { $env:Path = $env:Path + ';' + $binDir }

Step 'Configuring Claude Code'
$targets = @()
if ($ProjectOnly) { $targets += $ProjectDir } else { $targets += $env:USERPROFILE }
foreach ($t in $targets) {
  $env:QODER_CLAUDE_TARGET = $t
  & node (Join-Path $InstallDir 'scripts\enable-here.js')
  if ($LASTEXITCODE -ne 0) { Die "failed to configure $t" }
  Ok "$t\.claude\settings.json"
}

if ($NoStart) {
  Warn 'server not started (-NoStart)'
} else {
  Step 'Starting the server'
  $listening = $false
  try {
    $probe = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$Port/health" -TimeoutSec 2
    $listening = ($probe.StatusCode -eq 200)
  } catch {}
  if ($listening) {
    Ok "already running at 127.0.0.1:$Port"
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
      Warn 'the server did not respond; see bridge.log'
      $log = Join-Path $InstallDir 'bridge.log'
      if (Test-Path $log) { Get-Content $log -Tail 15 | ForEach-Object { Write-Host "    $_" } }
      Die 'incomplete install: server did not start'
    }
    Ok "server running at 127.0.0.1:$Port (qoder-bridge window open)"
  }
}

Step 'Validating the full path'
try {
  $r = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/v1/models" -TimeoutSec 10
  Ok ("models: " + (($r.data | Select-Object -First 6 | ForEach-Object { $_.id }) -join ', ') + ', ...')
} catch { Warn 'could not list models' }

Write-Host ''
Write-Host '  Qoder-Claude installed.' -ForegroundColor Green
Write-Host '  Open with: qclaude' -ForegroundColor Cyan
Write-Host ''
Write-Host "  bridge    : $InstallDir"
Write-Host "  port      : $Port"
Write-Host "  server    : `"$InstallDir\start.cmd`"  (window with logs)"
Write-Host "  stop      : `"$InstallDir\stop.cmd`""
Write-Host '  statusline: Qoder > <model> inside claude'
Write-Host ''
Write-Host '  open a new terminal and run: qclaude' -ForegroundColor Cyan
Write-Host ''
