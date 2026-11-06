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

  if (window && openServerWindow()) {
    for (let i = 0; i < 120; i++) {
      if (await isUp()) return null;
      await wait(500);
    }
    console.error('qclaude: the server window did not come up; starting it here instead.');
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

function runClaude(claudeArgs) {
  const attempt = (useShell) => new Promise((resolve, reject) => {
    const p = spawn('claude', claudeArgs, { stdio: 'inherit', env: process.env, shell: useShell });
    p.on('close', (code) => resolve(code ?? 0));
    p.on('error', reject);
  });
  return attempt(false)
    .catch(() => attempt(true))
    .catch((e) => {
      console.error(`qclaude: could not open claude (${e.message}).`);
      console.error('qclaude: install it with: npm install -g @anthropic-ai/claude-code');
      return 127;
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
    const data = loadAccounts();
    console.log('accounts:');
    for (const [key, item] of Object.entries(data.accounts)) {
      const mark = key === data.active ? '*' : ' ';
      console.log(`  ${mark} ${key.padEnd(16)} ${item.dir || '(global config)'}`);
    }
    console.log('\nuse: qclaude account add <name>');
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


if (args[0] === '--help' || args[0] === '-h') {
  console.log(`qclaude - Qoder models inside Claude Code

  qclaude                    boots the server if needed, then opens claude
  qclaude -p "..."           forwards any argument to claude
  qclaude --model X          same
  qclaude --account <name>   opens with a specific account
  qclaude --status           server, models and account
  qclaude --serve            server only, foreground
  qclaude --window           opens the server in its own terminal window
  qclaude --no-window        keeps the server attached to this terminal
  qclaude --stop             stops the server

  qclaude account            lists the accounts
  qclaude account add <name> connects another account (browser login)
  qclaude account use <name> switches the active account
  qclaude account remove <name>
  qclaude account current
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
  console.log(`account  : ${acc.name}${acc.dir ? `  (${acc.dir})` : '  (global config)'}`);
  console.log(`server   : ${up ? `running at 127.0.0.1:${PORT}` : 'stopped'}`);
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
  const noWindow = args.includes('--no-window');
  const claudeArgs = args.filter((a) => a !== '--no-window');
  const child = await startServer({ window: !noWindow });
  if (claudeArgs.length === 0) console.log(`qclaude: opening claude in ${process.cwd()}`);
  const code = await runClaude(claudeArgs);
  if (child) {
    try { child.kill(); } catch {}
  }
  process.exit(code);
}
