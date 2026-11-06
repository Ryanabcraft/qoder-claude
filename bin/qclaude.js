#!/usr/bin/env node
import { spawn } from 'node:child_process';
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
}async function startServer() {
  if (await isUp()) return null;
  if (!fs.existsSync(serverEntry)) {
    console.error(`qclaude: servidor nao encontrado em ${serverEntry}`);
    process.exit(1);
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
  console.error(`qclaude: o servidor nao respondeu. veja ${LOG}`);
  try { child.kill(); } catch {}
  process.exit(1);
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
      console.error(`qclaude: nao consegui abrir o claude (${e.message}).`);
      console.error('qclaude: instale com: npm install -g @anthropic-ai/claude-code');
      return 127;
    });
}

async function stopServer() {
  if (!(await isUp())) {
    console.log('qclaude: servidor nao esta rodando.');
    return 0;
  }
  if (process.platform === 'win32') {
    spawn('cmd', ['/c', `for /f "tokens=5" %p in ('netstat -ano ^| findstr ":${PORT} .*LISTENING"') do taskkill /f /pid %p >nul 2>&1`], { stdio: 'ignore', shell: true });
  } else {
    spawn('sh', ['-c', `pkill -f "node .*qoder-bridge/src/server.js" || true`], { stdio: 'ignore' });
  }
  await wait(800);
  console.log((await isUp()) ? 'qclaude: nao consegui parar.' : 'qclaude: servidor parado.');
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
    console.log('contas:');
    for (const [key, item] of Object.entries(data.accounts)) {
      const mark = key === data.active ? '*' : ' ';
      console.log(`  ${mark} ${key.padEnd(16)} ${item.dir || '(config global)'}`);
    }
    console.log('\nuse: qclaude account add <nome>');
    return 0;
  }

  if (sub === 'add') {
    if (!name) {
      console.error('informe o nome: qclaude account add <nome>');
      return 1;
    }
    const dir = path.join(ACCOUNTS_ROOT, name);
    fs.mkdirSync(dir, { recursive: true });
    console.log(`entrando com a conta "${name}" (navegador)...`);
    const code = await runSync('qodercli', ['--config-dir', dir, 'login']);
    if (code !== 0) {
      console.error('login nao concluido.');
      return code;
    }
    addAccount(name, dir);
    console.log(`conta "${name}" conectada e ativa.`);
    return 0;
  }

  if (sub === 'use') {
    if (!name) {
      console.error('informe o nome: qclaude account use <nome>');
      return 1;
    }
    try {
      useAccount(name);
    } catch (e) {
      console.error(e.message);
      return 1;
    }
    console.log(`conta ativa: ${name}`);
    return 0;
  }

  if (sub === 'remove') {
    if (!name) {
      console.error('informe o nome: qclaude account remove <nome>');
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
    console.log(`conta "${name}" removida.`);
    return 0;
  }

  if (sub === 'current') {
    const a = activeAccount();
    console.log(`${a.name}${a.dir ? `  ${a.dir}` : '  (config global)'}`);
    return 0;
  }

  console.error(`subcomando desconhecido: ${sub}`);
  return 1;
}

if (args[0] === 'account') {
  process.exit(await accountCommand(args[1], args[2]));
}


if (args[0] === '--help' || args[0] === '-h') {
  console.log(`qclaude - Qoder models inside Claude Code

  qclaude                    sobe o servidor (se preciso) e abre o claude
  qclaude -p "..."           repassa qualquer argumento para o claude
  qclaude --model X          idem
  qclaude --account <nome>   abre usando uma conta especifica
  qclaude --status           servidor, modelos e conta
  qclaude --serve            roda so o servidor, em primeiro plano
  qclaude --stop             derruba o servidor

  qclaude account            lista as contas
  qclaude account add <nome> conecta outra conta (login no navegador)
  qclaude account use <nome> troca a conta ativa
  qclaude account remove <nome>
  qclaude account current
`);
  process.exit(0);
}

const accountFlag = args.indexOf('--account');
if (accountFlag !== -1) {
  const name = args[accountFlag + 1];
  if (!name) {
    console.error('informe o nome: qclaude --account <nome>');
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
  console.log(`conta    : ${acc.name}${acc.dir ? `  (${acc.dir})` : '  (config global)'}`);
  console.log(`servidor : ${up ? `no ar em 127.0.0.1:${PORT}` : 'parado'}`);
  if (up) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/v1/models`);
      const j = await r.json();
      console.log(`modelos  : ${j.data.length} (${j.data.slice(0, 3).map((m) => m.id).join(', ')}, ...)`);
    } catch {}
  }
  console.log(`origem   : ${ROOT}`);
  console.log(`log      : ${LOG}`);
  process.exit(up ? 0 : 1);
}

if (args[0] === '--stop') {
  process.exit(await stopServer());
}

if (args[0] === '--serve') {
  const child = await startServer();
  if (!child) {
    console.log(`qclaude: ja esta no ar em 127.0.0.1:${PORT}`);
    process.exit(0);
  }
  console.log(`qclaude: no ar em 127.0.0.1:${PORT}. Ctrl+C para parar.`);
  const stop = () => { try { child.kill(); } catch {} ; process.exit(0); };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  child.on('exit', (code) => process.exit(code ?? 0));
} else {
  const child = await startServer();
  if (args.length === 0) console.log(`qclaude: abrindo o claude em ${process.cwd()}`);
  const code = await runClaude(args);
  if (child) {
    try { child.kill(); } catch {}
  }
  process.exit(code);
}
