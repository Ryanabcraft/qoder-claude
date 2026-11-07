#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process';
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

const ROOT = process.env.QODER_BRIDGE_HOME || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = process.env.BRIDGE_PORT || '8787';
const LOG = path.join(ROOT, 'bridge.log');
const serverEntry = path.join(ROOT, 'src', 'server.js');

const args = process.argv.slice(2);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function isUp() {
  try {
    const r = await fetch(`http://127.0.0.1:${PORT}/health`, { signal: AbortSignal.timeout(1500) });
    return r.ok;
  } catch {
    return false;
  }
}async function startServer({ window = true } = {}) {
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
  const child = spawn(process.execPath, [serverEntry], {
    cwd: ROOT,
    stdio: ['ignore', out, out],
    env: { ...process.env, BRIDGE_LOG_FILE: LOG },
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
      spawn(`start "qoder-bridge" cmd /k "${script}"`, {
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

function findClaude() {
  const win = process.platform === 'win32';
  const names = win ? ['claude.cmd', 'claude.exe', 'claude.bat', 'claude'] : ['claude'];
  const dirs = String(process.env.PATH || '').split(win ? ';' : ':').filter(Boolean);
  if (win) {
    if (process.env.APPDATA) dirs.push(path.join(process.env.APPDATA, 'npm'));
    if (process.env.LOCALAPPDATA) dirs.push(path.join(process.env.LOCALAPPDATA, 'Programs', 'claude'));
  } else {
    dirs.push(path.join(process.env.HOME || '', '.local', 'bin'), '/usr/local/bin', '/opt/homebrew/bin');
  }
  for (const dir of dirs) {
    for (const name of names) {
      const candidate = path.join(dir, name);
      try {
        if (fs.existsSync(candidate)) return candidate;
      } catch {}
    }
  }
  return null;
}

async function ensureClaude() {
  const found = findClaude();
  if (found) return found;

  console.log('qclaude: claude is not installed; installing @anthropic-ai/claude-code...');
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  await new Promise((resolve) => {
    const p = spawn(npm, ['install', '-g', '@anthropic-ai/claude-code'], {
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    p.on('close', resolve);
    p.on('error', resolve);
  });

  const after = findClaude();
  if (after) return after;
  console.error('qclaude: could not install claude.');
  console.error('qclaude: run this once and try again: npm install -g @anthropic-ai/claude-code');
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
      console.error('qclaude: install it with: npm install -g @anthropic-ai/claude-code');
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
    spawn('sh', ['-c', `pkill -f "node .*qoder-bridge/src/server.js" || true`], { stdio: 'ignore' });
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

if (args[0] === 'account') {
  process.exit(await accountCommand(args[1], args[2]));
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


if (args[0] === '--help' || args[0] === '-h') {
  console.log(`qclaude - Qoder models inside Claude Code

  qclaude                    starts the bridge, opens claude, stops the bridge on exit
  qclaude -p "..."           forwards any argument to claude
  qclaude --model X          same
  qclaude --account <name>   opens with a specific account
  qclaude --status           server, models and account
  qclaude --serve            server only, foreground
  qclaude --window           keeps the server in its own terminal window
  qclaude --stop             stops the server

  qclaude account            lists the accounts
  qclaude account add <name> connects another account (browser login)
  qclaude account use <name> switches the active account
  qclaude account pause <name>   takes an account out of rotation
  qclaude account resume <name>  puts it back in rotation
  qclaude account remove <name>
  qclaude account current

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
  console.log(`account  : ${acc.name}${acc.dir ? `  (${acc.dir})` : '  (global config)'}`);
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
  process.exit(up ? 0 : 1);
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
  const claudeArgs = args.filter((a) => a !== '--window' && a !== '--no-window');

  const claudeBin = await ensureClaude();
  const child = await startServer({ window: wantWindow });

  if (claudeArgs.length === 0) console.log(`qclaude: opening claude in ${process.cwd()}`);
  if (child) console.log(`qclaude: bridge started at 127.0.0.1:${PORT} (log: ${LOG})`);

  const stop = () => {
    if (child) {
      try { child.kill(); } catch {}
    }
  };
  process.on('SIGINT', () => { stop(); process.exit(130); });
  process.on('SIGTERM', () => { stop(); process.exit(143); });

  const code = await runClaude(claudeBin, claudeArgs);
  stop();
  process.exit(code);
}
