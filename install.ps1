#requires -Version 5.1
[CmdletBinding()]
param(
  [string]$InstallDir = (Join-Path $env:LOCALAPPDATA 'qoder-bridge'),
  [string]$ProjectDir = (Get-Location).Path,
  [switch]$ProjectOnly,
  [switch]$SkipDeps,
  [switch]$SkipVision,
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
  Warn "$cmdName missing, installing via winget ($id)..."
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

function Test-PeArch($p) {
  try {
    $fs = [IO.File]::OpenRead($p)
    $br = New-Object IO.BinaryReader($fs)
    if ($br.ReadUInt16() -ne 0x5A4D) { $fs.Close(); return $false }
    $fs.Position = 0x3C
    $off = $br.ReadUInt32()
    $fs.Position = $off
    if ($br.ReadUInt32() -ne 0x00004550) { $fs.Close(); return $false }
    $machine = $br.ReadUInt16()
    $fs.Close()
    $want = if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64') { 0xAA64 } else { 0x8664 }
    return ($machine -eq $want)
  } catch { return $false }
}

function Find-Claude {
  $npmDir = if ($env:APPDATA) { Join-Path $env:APPDATA 'npm' } else { '' }
  $npmBroken = $false
  if ($npmDir) {
    $npmExe = Join-Path $npmDir 'node_modules\@anthropic-ai\claude-code\bin\claude.exe'
    if ((Test-Path $npmExe) -and -not (Test-PeArch $npmExe)) {
      Warn "the npm copy at $npmExe does not match this Windows build"
      $npmBroken = $true
    }
  }

  $dirs = @()
  if ($env:USERPROFILE) { $dirs += (Join-Path $env:USERPROFILE '.local\bin') }
  if ($env:LOCALAPPDATA) { $dirs += (Join-Path $env:LOCALAPPDATA 'Programs\claude') }
  $dirs += ($env:Path -split ';' | Where-Object { $_ })
  if ($npmDir -and -not $npmBroken) { $dirs += $npmDir }

  foreach ($d in $dirs) {
    if ($npmBroken -and $npmDir -and ($d.TrimEnd('\') -ieq $npmDir.TrimEnd('\'))) { continue }
    foreach ($n in @('claude.exe', 'claude.cmd', 'claude.bat')) {
      $p = Join-Path $d $n
      if (-not (Test-Path $p)) { continue }
      if ($n -eq 'claude.exe') {
        if (Test-PeArch $p) { return $p }
        Warn "ignoring incompatible binary at $p"
      } else {
        return $p
      }
    }
  }
  return $null
}

Step 'Installing Claude Code'
$claude = Find-Claude
if (-not $claude) {
  if ($SkipDeps) {
    Warn 'claude is missing (-SkipDeps). Install it with: irm https://claude.ai/install.ps1 | iex'
  } else {
    try {
      Invoke-RestMethod -UseBasicParsing -Uri 'https://claude.ai/install.ps1' | Invoke-Expression
    } catch {
      Warn 'the official installer failed; trying npm'
    }
    $claude = Find-Claude
    if (-not $claude -and (Have 'npm')) {
      npm install -g @anthropic-ai/claude-code | Out-Null
      $claude = Find-Claude
    }
  }
}
if ($claude) {
  Ok 'claude ready'
} else {
  Warn 'claude could not be installed; qclaude will retry on first run'
}

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
  foreach ($item in @('src', 'scripts', 'bin', 'vendor', 'package.json', 'README.md', 'SETUP.md', 'LICENSE', 'CONTRIBUTING.md', 'start.cmd', 'stop.cmd', 'update.cmd', 'enable-here.cmd', 'start.sh', 'stop.sh', 'update.sh', 'install.cmd', '.gitignore')) {
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

if (-not $SkipVision) {
  Step 'Installing the vision engine (images)'
  try {
    & node (Join-Path $InstallDir 'bin\qclaude.js') vision install
    if ($LASTEXITCODE -eq 0) { Ok 'image support ready' } else { Warn 'vision engine not installed; run later with: qclaude vision install' }
  } catch {
    Warn 'vision engine not installed; run later with: qclaude vision install'
  }
}

Step 'Configuring Claude Code'
$targets = @()
if ($ProjectOnly) { $targets += $ProjectDir } else { $targets += $env:USERPROFILE }
foreach ($t in $targets) {
  $env:QODER_CLAUDE_TARGET = $t
  & node (Join-Path $InstallDir 'scripts\enable-here.js')
  if ($LASTEXITCODE -ne 0) { Die "failed to configure $t" }
  Ok "$t\.claude\settings.json"
}

Write-Host ''
Write-Host '  Qoder-Claude installed.' -ForegroundColor Green
Write-Host ''
Write-Host '  Start with: qclaude' -ForegroundColor Cyan
Write-Host ''
Write-Host '  qclaude starts the bridge, opens the dashboard, then opens claude, and stops the bridge when claude exits.'
Write-Host ''
Write-Host "  bridge    : $InstallDir"
Write-Host "  port      : $Port"
Write-Host "  logs      : `"$InstallDir\bridge.log`""
Write-Host "  stop      : `"$InstallDir\stop.cmd`""
Write-Host '  statusline: Qoder > <model> inside claude'
Write-Host ''
Write-Host '  Open a new terminal first so qclaude is on PATH.' -ForegroundColor DarkGray
Write-Host ''
Write-Host '  open a new terminal and run: qclaude' -ForegroundColor Cyan
Write-Host ''
