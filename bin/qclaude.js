#!/usr/bin/env node
import '../src/config.js';
import { spawn, spawnSync } from 'node:child_process';
import readline from 'node:readline/promises';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  ACCOUNTS_ROOT,
  activeAccount,
  addAccount,
  loadAccounts,
  removeAccount,
  rotationSnapshot,
  setAccountEnabled,
  setRotation,
  useAccount,
} from '../src/accounts.js';
import { installVision, visionCliPath, visionVersion } from '../src/vision.js';
import { ensureExa, EXA_URL, claudeConfigPath } from '../src/exaSetup.js';
import { ensureWebTools, settingsPath } from '../src/claudeSettings.js';
import { backupAccounts, filterPathEntries, installRoots, stripBridgeSettings } from '../src/uninstall.js';
import { applyUpdate, checkUpdate, localVersion, skippedVersion, skipVersion } from '../src/selfUpdate.js';
import { showReleaseNotes, showVersionNotes } from '../src/releaseNotes.js';
import { getQuota, quotaSnapshot } from '../src/quota.js';
import { claimReward, rewardsSnapshot } from '../src/rewards.js';
import { cachedModels, modelsStatus, refreshModels, refreshRemote } from '../src/models.js';
import { applyModelPicker } from '../src/claudePicker.js';
import { applyOpenCode, detect, paths } from '../src/integrations.js';

const ROOT = process.env.QODER_BRIDGE_HOME || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = process.env.BRIDGE_PORT || '8787';
const LOG = path.join(ROOT, 'bridge.log');
const serverEntry = path.join(ROOT, 'src', 'server.js');

const args = process.argv.slice(2);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function stopBridge(child) {
  if (child) {
    try { child.kill(); } catch {}
  }
  try {
    const pidFile = path.join(ROOT, 'bridge.pid');
    if (!fs.existsSync(pidFile)) return;
    const pid = Number(fs.readFileSync(pidFile, 'utf8').trim());
    if (pid > 0 && pid !== process.pid) {
      try { process.kill(pid); } catch {}
    }
    fs.rmSync(pidFile, { force: true });
  } catch {}
}

async function isUp() {
  try {
    const r = await fetch(`http://127.0.0.1:${PORT}/health`, { signal: AbortSignal.timeout(1500) });
    return r.ok;
  } catch {
    return false;
  }
}async function startServer({ window = true, persist = false } = {}) {
  if (await isUp()) return null;
  if (!fs.existsSync(serverEntry)) {
    console.error(`qclaude: server not found at ${serverEntry}`);
    process.exit(1);
  }

  if (window) {
    if (openServerWindow()) {
      for (let i = 0; i < 120; i++) {
        if (await isUp()) return null;
        await wait(500);
      }
      console.error('qclaude: the server window did not come up; starting it here instead.');
    } else {
      console.log(`qclaude: no terminal found; logging to ${LOG}`);
    }
  }

  const out = fs.openSync(LOG, 'a');
  const env = { ...process.env };
  if (!persist) env.BRIDGE_PARENT_PID = String(process.pid);
  delete env.BRIDGE_LOG_FILE;
  const child = spawn(process.execPath, [serverEntry], {
    cwd: ROOT,
    stdio: ['ignore', out, out],
    env,
  });
  for (let i = 0; i < 160; i++) {
    if (await isUp()) return child;
    if (child.exitCode !== null) break;
    await wait(500);
  }
  console.error(`qclaude: the server did not respond. see ${LOG}`);
  try { child.kill(); } catch {}
  process.exit(1);
}

function openDashboard() {
  if (process.env.BRIDGE_NO_BROWSER === '1') return;
  const key = process.env.BRIDGE_API_KEY;
  const url = `http://127.0.0.1:${PORT}/ui${key ? `#key=${encodeURIComponent(key)}` : ''}`;
  try {
    let child;
    if (process.platform === 'win32') {
      child = spawn(process.env.ComSpec || 'cmd.exe', ['/c', 'start', '', url], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
      });
    } else {
      child = spawn(process.platform === 'darwin' ? 'open' : 'xdg-open', [url], {
        detached: true,
        stdio: 'ignore',
      });
    }
    child.unref();
  } catch {}
}

function hasCommand(bin) {
  try {
    return spawnSync('sh', ['-c', `command -v ${JSON.stringify(bin)}`], { stdio: 'ignore' }).status === 0;
  } catch {
    return false;
  }
}

function openServerWindow() {
  const script = path.join(ROOT, process.platform === 'win32' ? 'start.cmd' : 'start.sh');
  if (!fs.existsSync(script)) return false;

  try {
    if (process.platform === 'win32') {
      spawn(`start "qoder-claude" cmd /k "${script}"`, {
        cwd: ROOT,
        shell: true,
        detached: true,
        stdio: 'ignore',
      }).unref();
      return true;
    }

    if (process.platform === 'darwin') {
      const cmd = `cd ${JSON.stringify(ROOT)} && ./${path.basename(script)}`;
      spawn('osascript', ['-e', `tell application "Terminal" to do script ${JSON.stringify(cmd)}`, '-e', 'tell application "Terminal" to activate'], {
        detached: true,
        stdio: 'ignore',
      }).unref();
      return true;
    }

    const cmd = `cd ${JSON.stringify(ROOT)} && ./${path.basename(script)}`;
    const candidates = [
      [process.env.TERMINAL, ['-e', 'bash', '-lc', cmd]],
      ['x-terminal-emulator', ['-e', 'bash', '-lc', cmd]],
      ['gnome-terminal', ['--', 'bash', '-lc', cmd]],
      ['konsole', ['-e', 'bash', '-lc', cmd]],
      ['xfce4-terminal', ['-x', 'bash', '-lc', cmd]],
      ['alacritty', ['-e', 'bash', '-lc', cmd]],
      ['kitty', ['bash', '-lc', cmd]],
      ['xterm', ['-e', 'bash', '-lc', cmd]],
    ].filter(([bin]) => bin && hasCommand(bin));

    if (!candidates.length) return false;
    const [bin, argv] = candidates[0];
    spawn(bin, argv, { detached: true, stdio: 'ignore' }).unref();
    return true;
  } catch {
    return false;
  }
}

// Reads the PE header without running the file: a truncated or foreign binary
// only shows up as a modal "16-bit application" dialog once executed.
function peArchOk(file) {
  try {
    const fd = fs.openSync(file, 'r');
    const size = fs.fstatSync(fd).size;
    if (size < 64) { fs.closeSync(fd); return false; }
    const head = Buffer.alloc(64);
    fs.readSync(fd, head, 0, 64, 0);
    if (head[0] !== 0x4d || head[1] !== 0x5a) { fs.closeSync(fd); return false; }
    const peOff = head.readUInt32LE(0x3c);
    if (peOff + 6 > size) { fs.closeSync(fd); return false; }
    const pe = Buffer.alloc(6);
    fs.readSync(fd, pe, 0, 6, peOff);
    fs.closeSync(fd);
    if (pe[0] !== 0x50 || pe[1] !== 0x45) return false;
    const machine = pe.readUInt16LE(4);
    const want = process.arch === 'arm64' ? 0xaa64 : process.arch === 'ia32' ? 0x014c : 0x8664;
    return machine === want;
  } catch {
    return false;
  }
}

function claudeWorks(bin) {
  const win = process.platform === 'win32';
  if (win) {
    if (/\.exe$/i.test(bin)) return peArchOk(bin);
    if (/\.(cmd|bat)$/i.test(bin)) {
      try {
        const body = fs.readFileSync(bin, 'utf8');
        const hit = body.match(/([A-Za-z]:\\[^"\r\n]*?claude\.exe|%~?dp0%?[^"\r\n]*?claude\.exe)/i);
        if (!hit) return true;
        const target = hit[1].replace(/%~?dp0%?/i, path.dirname(bin));
        return fs.existsSync(target) ? peArchOk(target) : false;
      } catch {
        return false;
      }
    }
    return false;
  }
  try {
    const r = spawnSync(bin, ['--version'], { stdio: 'ignore', timeout: 8000 });
    return r.status === 0;
  } catch {
    return false;
  }
}

function findClaude() {
  const win = process.platform === 'win32';
  const names = win ? ['claude.exe', 'claude.cmd', 'claude.bat'] : ['claude'];
  const dirs = [];

  if (win) {
    if (process.env.USERPROFILE) dirs.push(path.join(process.env.USERPROFILE, '.local', 'bin'));
    if (process.env.LOCALAPPDATA) dirs.push(path.join(process.env.LOCALAPPDATA, 'Programs', 'claude'));
  } else {
    dirs.push(path.join(process.env.HOME || '', '.local', 'bin'), '/usr/local/bin', '/opt/homebrew/bin');
  }
  let npmBroken = false;
  let npmDir = '';
  if (win && process.env.APPDATA) {
    npmDir = path.join(process.env.APPDATA, 'npm');
    const npmExe = path.join(npmDir, 'node_modules', '@anthropic-ai', 'claude-code', 'bin', 'claude.exe');
    if (fs.existsSync(npmExe) && !peArchOk(npmExe)) {
      npmBroken = true;
      console.log(`qclaude: the npm copy at ${npmExe} does not match this Windows build; using the official install`);
    }
  }

  dirs.push(
    ...String(process.env.PATH || '')
      .split(win ? ';' : ':')
      .filter(Boolean)
      .filter((dir) => !(npmBroken && path.resolve(dir).toLowerCase() === path.resolve(npmDir).toLowerCase())),
  );
  if (win && npmDir && !npmBroken) dirs.push(npmDir);

  const seen = new Set();
  const broken = [];
  for (const dir of dirs) {
    for (const name of names) {
      const candidate = path.join(dir, name);
      if (seen.has(candidate)) continue;
      seen.add(candidate);
      try {
        if (!fs.existsSync(candidate)) continue;
      } catch {
        continue;
      }
      if (claudeWorks(candidate)) return candidate;
      broken.push(candidate);
    }
  }
  if (broken.length) {
    console.log(`qclaude: ignoring an unusable claude at ${broken[0]}`);
  }
  return null;
}

function runInstaller(command, args, shell) {
  return new Promise((resolve) => {
    const p = spawn(command, args, { stdio: 'inherit', shell });
    p.on('close', (code) => resolve(code === 0));
    p.on('error', () => resolve(false));
  });
}

async function ensureClaude() {
  const found = findClaude();
  if (found) return found;

  console.log('qclaude: claude is not installed; running the official installer...');
  const win = process.platform === 'win32';
  const official = win
    ? await runInstaller(
        'powershell.exe',
        ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', 'irm https://claude.ai/install.ps1 | iex'],
        false,
      )
    : await runInstaller('bash', ['-lc', 'curl -fsSL https://claude.ai/install.sh | bash'], false);

  let after = findClaude();
  if (after) return after;

  if (!official) console.log('qclaude: official installer failed; trying npm...');
  const npm = win ? 'npm.cmd' : 'npm';
  await runInstaller(npm, ['install', '-g', '@anthropic-ai/claude-code'], win);

  after = findClaude();
  if (after) return after;

  console.error('qclaude: could not install claude.');
  console.error(`qclaude: ${win ? 'irm https://claude.ai/install.ps1 | iex' : 'curl -fsSL https://claude.ai/install.sh | bash'}`);
  console.error('qclaude: if an npm copy is broken, remove it: npm uninstall -g @anthropic-ai/claude-code');
  process.exit(127);
}

const quoteArg = (a) => (/[\s"]/.test(a) ? `"${String(a).replace(/"/g, '\\"')}"` : a);

function runClaude(bin, claudeArgs) {
  return new Promise((resolve) => {
    const isScript = /\.(cmd|bat)$/i.test(bin);
    const p = isScript
      ? spawn(`"${bin}" ${claudeArgs.map(quoteArg).join(' ')}`, {
          stdio: 'inherit',
          env: process.env,
          shell: true,
        })
      : spawn(bin, claudeArgs, { stdio: 'inherit', env: process.env });
    p.on('close', (code) => resolve(code ?? 0));
    p.on('error', (e) => {
      console.error(`qclaude: could not open claude (${e.message}).`);
      console.error(process.platform === 'win32'
        ? 'qclaude: install it with: irm https://claude.ai/install.ps1 | iex'
        : 'qclaude: install it with: curl -fsSL https://claude.ai/install.sh | bash');
      resolve(127);
    });
  });
}

async function stopServer() {
  if (!(await isUp())) {
    console.log('qclaude: server is not running.');
    return 0;
  }
  if (process.platform === 'win32') {
    spawn(`for /f "tokens=5" %p in ('netstat -ano ^| findstr ":${PORT} .*LISTENING"') do taskkill /f /pid %p >nul 2>&1`, {
      stdio: 'ignore',
      shell: true,
    });
  } else {
    spawn('sh', ['-c', `pkill -f "node .*/qoder-(bridge|claude)/src/server.js" || true`], { stdio: 'ignore' });
  }
  await wait(800);
  console.log((await isUp()) ? 'qclaude: could not stop it.' : 'qclaude: server stopped.');
  return 0;
}

function runSync(cmd, cmdArgs) {
  return new Promise((resolve) => {
    const p = spawn(cmd, cmdArgs, { stdio: 'inherit', shell: process.platform === 'win32', env: process.env });
    p.on('close', (code) => resolve(code ?? 0));
    p.on('error', () => resolve(127));
  });
}

async function accountCommand(sub, name) {
  if (!sub || sub === 'list') {
    const rot = rotationSnapshot();
    console.log(`accounts (failover ${rot.on ? 'on' : 'off'}):`);
    for (const item of rot.accounts) {
      const mark = item.active ? '*' : ' ';
      const state = !item.enabled
        ? 'disabled'
        : item.coolingLeft
          ? `paused ${Math.ceil(item.coolingLeft / 60)}m`
          : item.active
            ? 'active'
            : 'ready';
      console.log(`  ${mark} ${item.name.padEnd(16)} ${state.padEnd(12)} ${item.dir || '(global config)'}`);
    }
    console.log('\nadd: qclaude account add <name>   pause: qclaude account pause <name>');
    return 0;
  }

  if (sub === 'pause' || sub === 'resume') {
    if (!name) {
      console.error(`name required: qclaude account ${sub} <name>`);
      return 1;
    }
    try {
      setAccountEnabled(name, sub === 'resume');
    } catch (e) {
      console.error(e.message);
      return 1;
    }
    console.log(`account "${name}" ${sub === 'resume' ? 'enabled' : 'disabled'}.`);
    return 0;
  }

  if (sub === 'add') {
    if (!name) {
      console.error('name required: qclaude account add <name>');
      return 1;
    }
    const dir = path.join(ACCOUNTS_ROOT, name);
    fs.mkdirSync(dir, { recursive: true });
    console.log(`signing in with account "${name}" (browser)...`);
    const code = await runSync('qodercli', ['--config-dir', dir, 'login']);
    if (code !== 0) {
      console.error('login was not completed.');
      return code;
    }
    addAccount(name, dir);
    console.log(`account "${name}" connected and active.`);
    return 0;
  }

  if (sub === 'use') {
    if (!name) {
      console.error('name required: qclaude account use <name>');
      return 1;
    }
    try {
      useAccount(name);
    } catch (e) {
      console.error(e.message);
      return 1;
    }
    console.log(`active account: ${name}`);
    return 0;
  }

  if (sub === 'remove') {
    if (!name) {
      console.error('name required: qclaude account remove <name>');
      return 1;
    }
    const data = loadAccounts();
    const dir = data.accounts[name]?.dir;
    try {
      removeAccount(name);
    } catch (e) {
      console.error(e.message);
      return 1;
    }
    if (dir) fs.rmSync(dir, { recursive: true, force: true });
    console.log(`account "${name}" removed.`);
    return 0;
  }

  if (sub === 'current') {
    const a = activeAccount();
    console.log(`${a.name}${a.dir ? `  ${a.dir}` : '  (global config)'}`);
    return 0;
  }

  console.error(`unknown subcommand: ${sub}`);
  return 1;
}

async function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question(question);
    return /^y(es)?$/i.test(answer.trim());
  } finally {
    rl.close();
  }
}

function settingsPlan(file) {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    const { settings, removed } = stripBridgeSettings(parsed);
    return { file, settings, removed };
  } catch {
    return { file, settings: null, removed: [] };
  }
}

function userPath() {
  const r = spawnSync('powershell.exe', ['-NoProfile', '-Command', "[Environment]::GetEnvironmentVariable('Path','User')"], {
    encoding: 'utf8',
    windowsHide: true,
  });
  return r.status === 0 ? String(r.stdout || '').trim() : null;
}

function setUserPath(value) {
  const r = spawnSync('powershell.exe', ['-NoProfile', '-Command', "[Environment]::SetEnvironmentVariable('Path', $env:QODER_NEW_PATH, 'User')"], {
    env: { ...process.env, QODER_NEW_PATH: value },
    windowsHide: true,
    stdio: 'ignore',
  });
  return r.status === 0;
}

function removeLauncher(roots, home, dryRun) {
  const file = path.join(home, '.local', 'bin', 'qclaude');
  let text = '';
  try { text = fs.readFileSync(file, 'utf8'); } catch { return; }
  if (!roots.some((root) => text.includes(path.join(root, 'bin', 'qclaude.js')))) {
    console.log(`launcher: ${file} does not belong to this install; kept`);
    return;
  }
  if (dryRun) {
    console.log(`launcher: ${file}`);
    return;
  }
  try {
    fs.rmSync(file, { force: true });
    console.log(`launcher: removed ${file}`);
  } catch (e) {
    console.warn(`launcher: could not remove ${file} (${e.message})`);
  }
}

function scheduleRootRemoval(roots, dryRun) {
  if (!roots.length) return;
  if (dryRun) {
    for (const root of roots) console.log(`dir: ${root}`);
    return;
  }
  if (process.platform === 'win32') {
    const file = path.join(os.tmpdir(), `qoder-claude-cleanup-${Date.now()}.cmd`);
    const lines = [
      '@echo off',
      'cd /d "%TEMP%"',
      'ping -n 3 127.0.0.1 >nul',
      ...roots.map((root) => `rmdir /s /q "${root}"`),
      'del /f /q "%~f0"',
      '',
    ];
    try {
      fs.writeFileSync(file, lines.join('\r\n'));
      const child = spawn('cmd.exe', ['/c', file], { detached: true, stdio: 'ignore', windowsHide: true });
      child.unref();
      console.log('dir: removal scheduled for a few seconds from now');
    } catch (e) {
      console.warn(`dir: could not schedule removal (${e.message}); delete ${roots.join(', ')} manually`);
    }
    return;
  }
  for (const root of roots) {
    try {
      fs.rmSync(root, { recursive: true, force: true });
      console.log(`dir: removed ${root}`);
    } catch (e) {
      console.warn(`dir: could not remove ${root} (${e.message})`);
    }
  }
}

async function uninstallCommand(argv) {
  const yes = argv.includes('--yes') || argv.includes('-y');
  const dryRun = argv.includes('--dry-run');
  const noBackup = argv.includes('--no-backup');
  const removeExa = argv.includes('--remove-exa');
  const projectAt = argv.indexOf('--project');
  const project = projectAt === -1 ? '' : argv[projectAt + 1];
  if (projectAt !== -1 && !project) {
    console.error('qclaude: --project needs a directory');
    return 1;
  }

  const home = os.homedir();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const checkout = fs.existsSync(path.join(ROOT, '.git'));
  if (checkout) {
    console.error(`qclaude: ${ROOT} is a source checkout; run the installed copy to uninstall.`);
    return 1;
  }
  const roots = installRoots({ root: ROOT, home, includeDefaults: !process.env.QODER_BRIDGE_HOME });
  const settingsFiles = [
    settingsPath(home),
    project ? path.join(project, '.claude', 'settings.json') : '',
  ].filter(Boolean);
  const plans = settingsFiles.map(settingsPlan);
  const accountBackup = path.join(home, `.qoder-claude-accounts-${stamp}`);
  const rootsWithAccounts = roots.filter((root) =>
    fs.existsSync(path.join(root, 'accounts')) || fs.existsSync(path.join(root, 'accounts.json')));
  const backupDestFor = (root) => (rootsWithAccounts.length === 1 ? accountBackup : path.join(accountBackup, path.basename(root)));

  console.log(`qoder-claude ${localVersion(ROOT)}`);
  console.log(`install: ${ROOT}`);
  console.log('');
  console.log(dryRun ? 'dry run - nothing will change:' : 'this will remove:');
  for (const root of roots) console.log(`  dir      ${root}`);
  for (const plan of plans) {
    if (!fs.existsSync(plan.file)) {
      console.log(`  settings ${plan.file} (not found)`);
      continue;
    }
    if (!plan.removed.length) {
      console.log(`  settings ${plan.file} (no bridge entries)`);
      continue;
    }
    console.log(`  settings ${plan.file}`);
    for (const key of plan.removed) console.log(`             - ${key}`);
  }
  for (const root of rootsWithAccounts) {
    console.log(`  accounts ${noBackup ? `deleted (${root})` : `backup -> ${backupDestFor(root)}`}`);
  }
  if (removeExa) console.log('  exa      the qoder-claude Exa MCP entry (only if the URL matches)');
  if (process.platform === 'win32') {
    const current = userPath();
    if (current !== null) {
      const entries = current.split(';').filter(Boolean);
      const removed = entries.length - filterPathEntries(entries, roots.map((root) => path.join(root, 'bin'))).length;
      console.log(`  path      ${removed ? `${removed} entr${removed === 1 ? 'y' : 'ies'} in the user PATH` : 'no qoder-claude entry'}`);
    }
  } else {
    const launcher = path.join(home, '.local', 'bin', 'qclaude');
    try {
      const text = fs.readFileSync(launcher, 'utf8');
      if (roots.some((root) => text.includes(path.join(root, 'bin', 'qclaude.js')))) console.log(`  launcher  ${launcher}`);
    } catch {}
  }
  console.log('');
  console.log('kept: ~/.claude.json MCP servers, permissions.allow, Claude Code, Qoder CLI and login');
  console.log('');

  if (dryRun) return 0;
  if (!roots.length && !plans.some((p) => p.removed.length)) {
    console.log('qclaude: nothing to remove.');
    return 0;
  }
  if (!yes && !(await ask('Remove qoder-claude? [y/N] '))) {
    console.log('cancelled.');
    return 0;
  }

  await stopServer();

  if (rootsWithAccounts.length && !noBackup) {
    try {
      for (const root of rootsWithAccounts) {
        const dest = backupDestFor(root);
        backupAccounts(root, dest);
        console.log(`accounts: backed up to ${dest}`);
      }
    } catch (e) {
      console.error(`qclaude: could not back up accounts (${e.message}); nothing was removed.`);
      return 1;
    }
  }

  for (const plan of plans) {
    if (!plan.removed.length || !plan.settings) continue;
    try {
      fs.copyFileSync(plan.file, `${plan.file}.bak-uninstall-${stamp}`);
      fs.writeFileSync(plan.file, JSON.stringify(plan.settings, null, 2) + '\n');
      console.log(`settings: cleaned ${plan.file}`);
    } catch (e) {
      console.warn(`settings: could not clean ${plan.file} (${e.message})`);
    }
  }

  if (process.platform === 'win32') {
    const binDirs = roots.map((root) => path.join(root, 'bin'));
    const current = userPath();
    if (current === null) {
      console.warn('PATH: could not read the user PATH; remove the qclaude bin folder manually');
    } else {
      const entries = current.split(';').filter(Boolean);
      const kept = filterPathEntries(entries, binDirs);
      if (kept.length === entries.length) console.log('PATH: no qoder-claude entry');
      else if (!setUserPath(kept.join(';'))) console.warn('PATH: could not update; remove the qclaude bin folder manually');
      else console.log('PATH: removed the qclaude bin entry');
    }
  } else {
    removeLauncher(roots, home, false);
  }

  if (removeExa) {
    let config = null;
    try { config = JSON.parse(fs.readFileSync(claudeConfigPath(), 'utf8')); } catch {}
    if (config?.mcpServers?.exa?.url !== EXA_URL) {
      console.log('exa: no qoder-claude Exa entry found; kept');
    } else {
      const bin = process.env.CLAUDE_BIN || (process.platform === 'win32' ? 'claude.cmd' : 'claude');
      const r = spawnSync(bin, ['mcp', 'remove', 'exa', '-s', 'user'], {
        stdio: 'inherit',
        windowsHide: true,
        shell: process.platform === 'win32' && /\.(cmd|bat)$/i.test(bin),
      });
      if (r.status !== 0) console.warn('exa: could not remove; run: claude mcp remove exa -s user');
      else console.log('exa: removed');
    }
  }

  scheduleRootRemoval(roots, false);
  console.log('');
  console.log('qoder-claude removed. Open a new terminal so PATH is reloaded.');
  return 0;
}

if (args[0] === 'uninstall') {
  process.exit(await uninstallCommand(args.slice(1)));
}

if (args[0] === 'notes') {
  const version = args[1] || localVersion(ROOT);
  process.exit(showVersionNotes(ROOT, version) ? 0 : 1);
}

if (args[0] === 'update') {
  const before = localVersion(ROOT);
  console.log(`current: ${before}`);
  try {
    if (await applyUpdate(ROOT)) {
      const after = localVersion(ROOT);
      console.log(`updated to ${after}`);
      showReleaseNotes(ROOT, before, after);
    } else process.exitCode = 1;
  } catch (e) {
    console.error(`qclaude: update failed (${e.message})`);
    process.exit(1);
  }
  process.exit(0);
}

if (args[0] === 'account') {
  process.exit(await accountCommand(args[1], args[2]));
}

if (args[0] === 'vision') {
  if (args[1] === 'install') {
    try {
      if (visionCliPath() && args[2] !== '--force') {
        console.log(`vision: already installed (${visionVersion()})`);
        process.exit(0);
      }
      installVision((line) => console.log(line));
      console.log('vision enabled: run qclaude again and paste an image.');
    } catch (e) {
      console.error(`qclaude: could not install the vision engine (${e.message})`);
      process.exit(1);
    }
    process.exit(0);
  }
  const cli = visionCliPath();
  console.log(cli ? `vision: ready (${visionVersion()}) -> ${cli}` : 'vision: not installed. run: qclaude vision install');
  process.exit(0);
}

if (args[0] === 'rotation') {
  if (!args[1]) {
    const rot = rotationSnapshot();
    console.log(`failover: ${rot.on ? 'on' : 'off'}   pool: ${rot.accounts.filter((a) => a.enabled).length}`);
    for (const a of rot.accounts) {
      const state = !a.enabled ? 'disabled' : a.coolingLeft ? `paused ${Math.ceil(a.coolingLeft / 60)}m` : a.active ? 'active' : 'ready';
      console.log(`  ${a.name.padEnd(16)} ${state}`);
    }
    process.exit(0);
  }
  if (args[1] !== 'on' && args[1] !== 'off') {
    console.error('usage: qclaude rotation [on|off]');
    process.exit(1);
  }
  setRotation(args[1] === 'on');
  console.log(`failover ${args[1]}.`);
  process.exit(0);
}


if (args[0] === 'quota') {
  const json = args.includes('--json');
  const refresh = args.includes('--refresh');
  const name = args.slice(1).find((arg) => !arg.startsWith('-'));
  const snapshot = await quotaSnapshot({ refresh });
  if (name && !snapshot.accounts[name]) {
    console.error(`qclaude: account not found: ${name}`);
    process.exitCode = 1;
  } else if (json) {
    console.log(JSON.stringify(name ? snapshot.accounts[name] : snapshot, null, 2));
  } else {
    const rows = name ? [snapshot.accounts[name]] : Object.values(snapshot.accounts);
    for (const row of rows) {
      console.log(`${row.label || row.name}${row.active ? ' (active)' : ''}`);
      if (row.status !== 'ok') {
        console.log(`  quota : ${row.status}${row.reason ? ` (${row.reason})` : ''}`);
        continue;
      }
      const percent = Math.round(row.percent);
      console.log(`  quota : ${percent}% used · ${row.used}/${row.total} ${row.unit} · ${row.remaining} left${row.exceeded ? ' · EXCEEDED' : ''}`);
      console.log(`  plan  : ${row.plan || '—'}${row.expiresAt ? ` · expires ${new Date(row.expiresAt).toLocaleDateString()}` : ' · no expiry'}`);
      if (row.burnPerDay !== null && row.burnPerDay !== undefined) {
        const forecast = row.forecastAt ? new Date(row.forecastAt).toLocaleDateString() : '—';
        console.log(`  burn  : ${row.burnPerDay.toFixed(2)} ${row.unit}/day · forecast ${forecast}`);
      }
    }
    process.exitCode = 0;
  }
}

if (args[0] === 'models') {
  const json = args.includes('--json');
  if (args.includes('--refresh')) {
    console.log('qclaude: asking Qoder for the current model list…');
    await Promise.all([refreshModels({ force: true }), refreshRemote({ force: true })]);
  }
  if (args.includes('--apply')) {
    const applied = applyModelPicker();
    if (!applied.ok) console.error(`qclaude: could not update the Claude picker: ${applied.error}`);
    else console.log(applied.changed ? `qclaude: Claude picker updated (${applied.count} models).` : 'qclaude: Claude picker already up to date.');
  }
  const status = modelsStatus();
  if (json) {
    console.log(JSON.stringify(status, null, 2));
  } else {
    const when = status.fetchedAt ? new Date(status.fetchedAt).toLocaleString() : 'never';
    console.log(`${status.models.length} models · source: ${status.source} · updated: ${when}`);
    for (const model of status.models) console.log(`  ${model}`);
    if (status.lastError && status.source !== 'cli') console.log(`  note: ${status.lastError}`);
  }
  process.exitCode = 0;
}

if (args[0] === 'integrations') {
  const state = detect();
  const label = (ok) => (ok ? 'installed' : 'not found');
  console.log('qoder-claude integrations');
  console.log('');
  console.log(`  Claude Code  ${label(state.claude.installed)}  ${state.claude.path}`);
  console.log(`  OpenCode     ${label(state.opencode.installed)}  ${state.opencode.path}`);
  console.log(`  OpenBot      ${label(state.openbot.installed)}  ${state.openbot.path}`);

  const target = args.slice(1).find((arg) => !arg.startsWith('-'));
  const yes = args.includes('--apply') || args.includes('--yes');
  let choice = target;
  if (!choice && yes) choice = 'all';
  if (!choice && process.stdin.isTTY) {
    const { createInterface } = await import('node:readline/promises');
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    if (state.opencode.installed) {
      const answer = (await rl.question('Add qoder-claude to OpenCode? [y/N] ')).trim().toLowerCase();
      if (answer === 'y' || answer === 'yes') choice = 'opencode';
    }
    rl.close();
  }

  if (choice === 'opencode' || choice === 'all') {
    if (!state.opencode.installed) {
      console.error('qclaude: OpenCode config not found; open OpenCode once, then run this again.');
    } else {
      await refreshRemote().catch(() => false);
      await refreshModels().catch(() => false);
      const result = applyOpenCode({ models: cachedModels(), setDefault: false });
      if (!result.ok) console.error(`qclaude: ${result.error}`);
      else console.log(result.changed
        ? `
OpenCode: provider "qoder-claude" written (${result.models.length} models) -> ${result.path}`
        : `
OpenCode: provider "qoder-claude" already up to date -> ${result.path}`);
    }
  }

  if (choice === 'openbot' || choice === 'all') {
    console.log('');
    console.log('OpenBot: add a custom OpenAI-compatible provider with');
    console.log(`  base URL : http://127.0.0.1:${PORT}/v1`);
    console.log('  API key  : any value');
    console.log('  models   : GET /v1/models (Auto, Ultimate, Qwen3.8-Max, ...)');
    console.log('  launcher : qclaude openbot   (starts the bridge, then opens OpenBot)');
  }

  if (!choice) {
    console.log('');
    console.log('Nothing changed. Run:');
    console.log('  qclaude integrations opencode   # write the provider into OpenCode');
    console.log('  qclaude opencode                # start the bridge, then open OpenCode');
    console.log('  qclaude openbot                 # start the bridge, then open OpenBot');
  }
  process.exit(0);
}

if (args[0] === 'opencode') {
  await startServer({ window: true, persist: true });
  openDashboard();
  const child = spawn('opencode', args.slice(1), { stdio: 'inherit', shell: true, env: process.env });
  child.on('exit', (code) => process.exit(code ?? 0));
  child.on('error', (e) => { console.error(`qclaude: opencode failed: ${e.message}`); process.exit(1); });
} else if (args[0] === 'openbot') {
  const exe = paths().openbotExe;
  if (!exe || !fs.existsSync(exe)) {
    console.error('qclaude: OpenBot not found. Install it, or open it once so its folder exists.');
    process.exit(1);
  }
  await startServer({ window: true, persist: true });
  openDashboard();
  const child = spawn(exe, [], { detached: true, stdio: 'ignore' });
  child.unref();
  console.log(`qclaude: bridge up at http://127.0.0.1:${PORT}/v1, OpenBot launched.`);
  console.log('qclaude: in OpenBot, use a custom OpenAI-compatible provider with that base URL.');
  process.exit(0);
}

if (args[0] === 'rewards') {
  const json = args.includes('--json');
  const claim = args.includes('--claim');
  const name = args.slice(1).find((arg) => !arg.startsWith('-'));
  const snapshot = await rewardsSnapshot({ refresh: true });
  const rotation = rotationSnapshot();
  const dirFor = (account) => rotation.accounts.find((row) => row.name === account)?.dir || '';
  if (name && !snapshot.accounts[name]) {
    console.error(`qclaude: account not found: ${name}`);
    process.exitCode = 1;
  } else {
    const rows = name ? [snapshot.accounts[name]] : Object.values(snapshot.accounts);
    if (claim) {
      for (const row of rows) {
        if (row.status !== 'claimable' || !row.campaign?.id) continue;
        row.lastClaim = await claimReward(dirFor(row.name), row.campaign.id, { account: row.name });
      }
    }
    if (json) {
      console.log(JSON.stringify(name ? snapshot.accounts[name] : snapshot, null, 2));
    } else {
      for (const row of rows) {
        console.log(`${row.label || row.name}${row.active ? ' (active)' : ''}`);
        if (row.status === 'claimable') {
          const ends = row.campaign.endAt ? new Date(row.campaign.endAt).toLocaleString() : '—';
          console.log(`  reward: ${row.campaign.amount} credits available · ends ${ends}`);
          console.log('  claim : qclaude rewards --claim');
        } else if (row.status === 'claimed') {
          const expires = row.campaign.expiresAt ? new Date(row.campaign.expiresAt).toLocaleDateString() : '—';
          console.log(`  reward: ${row.campaign.amount} credits claimed · expires ${expires}`);
        } else if (row.status === 'none') {
          console.log('  reward: no campaign available for this account');
        } else {
          console.log(`  reward: ${row.status}${row.reason ? ` (${row.reason})` : ''}`);
        }
        if (row.lastClaim) console.log(`  result: ${row.lastClaim.status}${row.lastClaim.reason ? ` (${row.lastClaim.reason})` : ''}`);
      }
    }
    process.exitCode = 0;
  }
}

if (args[0] === '--help' || args[0] === '-h') {
  console.log(`qclaude - Qoder models inside Claude Code

  qclaude                    starts the bridge, opens claude, stops the bridge on exit
  qclaude -p "..."           forwards any argument to claude
  qclaude --model X          same
  qclaude --account <name>   opens with a specific account
  qclaude --status           server, models and account
  qclaude --serve            server only, foreground
  qclaude --window           keeps the server in its own terminal window
  qclaude --no-browser       does not open the dashboard
  qclaude --no-update        skips the update check
  qclaude update             checks and installs the latest version
  qclaude notes [version]    prints the changelog for this install
  qclaude quota [name]       shows Qoder credits, burn rate and forecast
  qclaude quota --json       machine-readable quota snapshot
  qclaude models             lists the models, where they came from and how old
  qclaude models --refresh   asks the Qoder CLI for the current list
  qclaude models --json      machine-readable model status
  qclaude integrations       shows Claude Code, OpenCode and OpenBot, and offers to wire them
  qclaude opencode [args]    starts the bridge, then opens OpenCode
  qclaude openbot            starts the bridge, then opens OpenBot
  qclaude rewards [name]     shows the daily 100-credit campaign
  qclaude rewards --claim    claims it (manual; never automatic by default)
  qclaude uninstall          removes qclaude, the launcher and its Claude settings
  qclaude uninstall --dry-run  lists what would be removed, changes nothing
  qclaude --stop             stops the server

  qclaude account            lists the accounts
  qclaude account add <name> connects another account (browser login)
  qclaude account use <name> switches the active account
  qclaude account pause <name>   takes an account out of rotation
  qclaude account resume <name>  puts it back in rotation
  qclaude account remove <name>
  qclaude account current

  qclaude vision             vision engine status
  qclaude vision install     downloads the image-capable engine

  qclaude rotation           shows the failover pool
  qclaude rotation on|off    switches automatic failover
`);
  process.exit(0);
}

const accountFlag = args.indexOf('--account');
if (accountFlag !== -1) {
  const name = args[accountFlag + 1];
  if (!name) {
    console.error('name required: qclaude --account <name>');
    process.exit(1);
  }
  try {
    useAccount(name);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
  args.splice(accountFlag, 2);
}

if (args[0] === '--status') {
  const up = await isUp();
  const acc = activeAccount();
  const rot = rotationSnapshot();
  const pool = rot.accounts.filter((a) => a.enabled).length;
  console.log(`version  : ${localVersion(ROOT)}`);
  console.log(`account  : ${acc.name}${acc.dir ? `  (${acc.dir})` : '  (global config)'}`);
  try {
    const quota = await getQuota(acc.dir, { account: acc.name });
    console.log(quota.status === 'ok'
      ? `quota    : ${Math.round(quota.percent)}% used · ${quota.used}/${quota.total} ${quota.unit} · ${quota.remaining} left`
      : `quota    : ${quota.status}${quota.reason ? ` (${quota.reason})` : ''}`);
  } catch {}
  console.log(`failover : ${rot.on ? `on (${pool} account${pool === 1 ? '' : 's'} in the pool)` : 'off'}`);
  console.log(`server   : ${up ? `running at 127.0.0.1:${PORT}` : 'stopped'}`);
  if (up) console.log(`dashboard: http://127.0.0.1:${PORT}/ui`);
  if (up) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/v1/models`);
      const j = await r.json();
      console.log(`models   : ${j.data.length} (${j.data.slice(0, 3).map((m) => m.id).join(', ')}, ...)`);
    } catch {}
  }
  console.log(`source   : ${ROOT}`);
  console.log(`log      : ${LOG}`);
  process.exitCode = up ? 0 : 1;
}

if (args[0] === '--stop') {
  process.exit(await stopServer());
}

if (args[0] === '--window') {
  if (await isUp()) {
    console.log(`qclaude: already running at 127.0.0.1:${PORT}`);
    process.exit(0);
  }
  if (!openServerWindow()) {
    console.error('qclaude: no supported terminal found to open a window.');
    process.exit(1);
  }
  for (let i = 0; i < 120; i++) {
    if (await isUp()) {
      console.log(`qclaude: server window opened at 127.0.0.1:${PORT}`);
      process.exit(0);
    }
    await wait(500);
  }
  console.error('qclaude: the server window did not respond.');
  process.exit(1);
}

if (!['quota', 'rewards', 'models', 'integrations', 'opencode', 'openbot', '--status'].includes(args[0])) {
if (args[0] === '--serve') {
  const child = await startServer({ window: false });
  if (!child) {
    console.log(`qclaude: already running at 127.0.0.1:${PORT}`);
    process.exit(0);
  }
  console.log(`qclaude: running at 127.0.0.1:${PORT}. Ctrl+C to stop.`);
  const stop = () => { try { child.kill(); } catch {} ; process.exit(0); };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  child.on('exit', (code) => process.exit(code ?? 0));
} else {
  const wantWindow = args.includes('--window');
  const noBrowser = args.includes('--no-browser');
  const noUpdate = args.includes('--no-update') || process.env.QODER_NO_UPDATE === '1';
  const claudeArgs = args.filter((a) => !['--window', '--no-window', '--no-browser', '--no-update'].includes(a));

  if (!noUpdate && process.stdin.isTTY && !fs.existsSync(path.join(ROOT, '.git'))) {
    const u = await checkUpdate(ROOT);
    if (u.hasUpdate && skippedVersion(ROOT) !== u.remote) {
      const yes = await ask(`qclaude ${u.local} -> ${u.remote} is available. Update now? [y/N] `);
      if (yes) {
        console.log('updating qclaude...');
        try {
          if (await applyUpdate(ROOT)) {
            const after = localVersion(ROOT);
            console.log(`updated to ${after}`);
            showReleaseNotes(ROOT, u.local, after);
            stopBridge(null);
            await wait(700);
            const child = spawn(process.execPath, [path.join(ROOT, 'bin', 'qclaude.js'), ...claudeArgs, '--no-update'], { stdio: 'inherit' });
            const code = await new Promise((resolve) => child.on('close', resolve));
            process.exit(code ?? 0);
          }
          console.warn('qclaude: update failed; using the current version.');
        } catch (e) {
          console.warn(`qclaude: update failed (${e.message}); using the current version.`);
        }
      } else {
        skipVersion(ROOT, u.remote);
      }
    }
  }

  const claudeBin = await ensureClaude();
  const exa = ensureExa({ bin: claudeBin });
  if (exa.added) console.log('qclaude: exa MCP configured (web search)');
  else if (exa.error) console.warn(`qclaude: exa MCP not configured (${exa.error}); web search may be unavailable.`);
  if (ensureWebTools()) console.log('qclaude: web tool permissions updated');
  const child = await startServer({ window: wantWindow });

  if (claudeArgs.length === 0) {
    console.log(`qclaude: opening claude in ${process.cwd()}`);
    if (!noBrowser) openDashboard();
  }
  if (child) console.log(`qclaude: bridge started at 127.0.0.1:${PORT} (log: ${LOG})`);

  const stop = () => stopBridge(child);
  process.on('SIGINT', () => { stop(); process.exit(130); });
  process.on('SIGTERM', () => { stop(); process.exit(143); });
  process.on('SIGHUP', () => { stop(); process.exit(129); });

  const code = await runClaude(claudeBin, claudeArgs);
  stop();
  process.exit(code);
}

}
