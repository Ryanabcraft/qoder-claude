import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {
  ACCOUNTS_ROOT,
  activeAccount,
  addAccount,
  loadAccounts,
  removeAccount,
  reorderAccounts,
  rotationSnapshot,
  setAccountEnabled,
  setAccountLabel,
  setRotation,
  useAccount,
} from './accounts.js';
import { cachedModels, modelsStatus, refreshModels, refreshRemote } from './models.js';
import { applyModelPicker } from './claudePicker.js';
import { resolveCli } from './cliPath.js';
import { shutdownPool } from './cli.js';
import { snapshot } from './metrics.js';
import { publicConfig, saveConfig } from './config.js';
import { applyWebTools, readClaudePrefs, updateClaudePrefs } from './claudePrefs.js';
import { healthSnapshot } from './health.js';
import { quotaSnapshot } from './quota.js';
import { derive, history } from './quotaStore.js';
import { claimReward, rewardsSnapshot } from './rewards.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const UI_DIR = path.join(HERE, 'ui');

const loginJobs = new Map();

function sendJson(res, status, body) {
  const text = JSON.stringify(body);
  res.writeHead(status, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(text) });
  res.end(text);
}

function sendFile(res, file, type) {
  fs.readFile(file, (err, buf) => {
    if (err) return sendJson(res, 404, { error: 'not found' });
    res.writeHead(200, { 'content-type': type, 'content-length': buf.length, 'cache-control': 'no-store' });
    res.end(buf);
  });
}

const MAX_BODY = 1024 * 1024;

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        chunks.length = 0;
        req.destroy();
        resolve({});
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); } catch { resolve({}); }
    });
    req.on('error', () => resolve({}));
  });
}

function startLogin(name) {
  for (const [key, job] of loginJobs) {
    if (job.name === name && !job.done) {
      job.done = true;
      job.ok = false;
      try { job.proc.kill(); } catch {}
      loginJobs.delete(key);
    }
  }
  const cli = resolveCli();
  const dir = path.join(ACCOUNTS_ROOT, name);
  fs.mkdirSync(dir, { recursive: true });

  const proc = spawn(cli.cmd, [...cli.prefix, '--config-dir', dir, 'login'], {
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const id = randomUUID();
  const job = { id, name, url: '', done: false, ok: false, log: '', proc };
  loginJobs.set(id, job);

  let buf = '';
  const scan = (d) => {
    job.log += d;
    buf += d;
    const m = buf.match(/https:\/\/[^\s]+device\/selectAccounts[^\s]*/);
    if (m && !job.url) job.url = m[0].replace(/\u001b\[[0-9;]*m/g, '');
  };
  proc.stdout.setEncoding('utf8');
  proc.stderr.setEncoding('utf8');
  proc.stdout.on('data', scan);
  proc.stderr.on('data', scan);

  proc.on('close', (code) => {
    job.done = true;
    job.ok = code === 0;
    if (job.ok) {
      try { addAccount(name, dir); } catch (e) { job.log += '\n' + e.message; job.ok = false; }
    }
    setTimeout(() => loginJobs.delete(id), 5 * 60 * 1000).unref?.();
  });

  return job;
}

export async function handleUi(req, res, url, { authorized, logFile }) {
  const p = url.pathname;

  if (p === '/ui' || p === '/ui/') return sendFile(res, path.join(UI_DIR, 'index.html'), 'text/html; charset=utf-8'), true;
  if (p === '/ui/app.js') return sendFile(res, path.join(UI_DIR, 'app.js'), 'text/javascript; charset=utf-8'), true;
  if (p === '/ui/i18n.js') return sendFile(res, path.join(UI_DIR, 'i18n.js'), 'text/javascript; charset=utf-8'), true;
  if (p === '/favicon.svg') return sendFile(res, path.join(UI_DIR, 'favicon.svg'), 'image/svg+xml'), true;
  if (p === '/ui/logo.png') return sendFile(res, path.join(UI_DIR, 'logo.png'), 'image/png'), true;
  if (p === '/ui/style.css') return sendFile(res, path.join(UI_DIR, 'style.css'), 'text/css; charset=utf-8'), true;

  if (!p.startsWith('/ui/api/')) return false;

  if (!authorized(req)) return sendJson(res, 401, { error: 'invalid api key' }), true;

  const route = p.slice('/ui/api/'.length);

  if (req.method === 'GET' && route === 'status') {
    const acc = activeAccount();
    const rot = rotationSnapshot();
    const health = healthSnapshot();
    return sendJson(res, 200, {
      ok: true,
      port: Number(process.env.BRIDGE_PORT || 8787),
      host: process.env.BRIDGE_HOST || '127.0.0.1',
      transport: process.env.BRIDGE_TRANSPORT || 'auto',
      version: JSON.parse(fs.readFileSync(path.join(HERE, '..', 'package.json'), 'utf8')).version,
      account: { name: acc.name, dir: acc.dir, label: acc.label },
      rotation: {
        on: rot.on,
        count: rot.accounts.filter((a) => a.enabled).length,
        paused: rot.accounts.filter((a) => a.coolingLeft).length,
      },
      models: cachedModels().length,
      uptime: Math.round(process.uptime()),
      node: health.node,
      pid: health.pid,
      memory: health.memory,
      sessions: health.sessions,
      pool: health.pool,
      apiKeySet: Boolean(process.env.BRIDGE_API_KEY),
      exposed: !['127.0.0.1', 'localhost', '::1'].includes(String(process.env.BRIDGE_HOST || '127.0.0.1')) && !process.env.BRIDGE_API_KEY,
      configPath: health.paths.config,
      logPath: health.paths.log,
      envLocked: publicConfig().envLocked,
    }), true;
  }

  if (req.method === 'GET' && route === 'config') {
    return sendJson(res, 200, publicConfig()), true;
  }

  if ((req.method === 'PUT' || req.method === 'POST') && route === 'config') {
    const body = await readBody(req);
    const result = saveConfig(body);
    return sendJson(res, result.ok ? 200 : 400, result), true;
  }

  if (req.method === 'GET' && route === 'claude') {
    return sendJson(res, 200, readClaudePrefs()), true;
  }

  if ((req.method === 'PUT' || req.method === 'POST') && route === 'claude') {
    const body = await readBody(req);
    const result = updateClaudePrefs(body);
    return sendJson(res, result.ok ? 200 : 400, result), true;
  }

  if (req.method === 'POST' && route === 'web-tools') {
    return sendJson(res, 200, applyWebTools()), true;
  }

  if (req.method === 'GET' && route === 'health') {
    return sendJson(res, 200, healthSnapshot()), true;
  }

  if (req.method === 'GET' && route === 'accounts') {
    const data = loadAccounts();
    return sendJson(res, 200, { active: data.active, accounts: data.accounts, rotation: rotationSnapshot() }), true;
  }

  if (req.method === 'GET' && route === 'quota') {
    const snapshot = await quotaSnapshot({ refresh: url.searchParams.get('refresh') === '1' });
    return sendJson(res, 200, snapshot), true;
  }

  if (req.method === 'GET' && route === 'rewards') {
    const snapshot = await rewardsSnapshot({ refresh: url.searchParams.get('refresh') === '1' });
    return sendJson(res, 200, snapshot), true;
  }

  if (req.method === 'POST' && route === 'rewards/claim') {
    const body = await readBody(req);
    const name = String(body.account || '');
    const account = rotationSnapshot().accounts.find((row) => row.name === name);
    if (!account) return sendJson(res, 400, { error: 'unknown account' }), true;
    const record = await rewardsSnapshot({ refresh: true });
    const campaign = record.accounts[name]?.campaign;
    if (!campaign?.id) return sendJson(res, 409, { error: 'no campaign available' }), true;
    const result = await claimReward(account.dir, campaign.id, { account: name });
    return sendJson(res, result.status === 'failed' ? 400 : 200, result), true;
  }

  if (req.method === 'GET' && route === 'quota/history') {
    const name = url.searchParams.get('account') || '';
    const range = url.searchParams.get('range') || '24h';
    const span = range === '7d' ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    return sendJson(res, 200, {
      account: name,
      range,
      samples: history(name, span),
      stats: derive(name, { now: Date.now() }),
    }), true;
  }

  if (req.method === 'POST' && route === 'rotation') {
    const body = await readBody(req);
    const on = setRotation(body.on !== false && body.on !== 0);
    return sendJson(res, 200, { ok: true, on }), true;
  }

  if (req.method === 'POST' && route.startsWith('accounts/') && route.endsWith('/enabled')) {
    const name = decodeURIComponent(route.slice('accounts/'.length, -'/enabled'.length));
    const body = await readBody(req);
    try { setAccountEnabled(name, body.enabled !== false); } catch (e) { return sendJson(res, 400, { error: e.message }), true; }
    return sendJson(res, 200, { ok: true }), true;
  }

  if (req.method === 'POST' && route === 'accounts') {
    const body = await readBody(req);
    const name = String(body.name || '').trim();
    if (!/^[a-zA-Z0-9._-]{1,32}$/.test(name)) return sendJson(res, 400, { error: 'invalid name' }), true;
    const existing = loadAccounts().accounts[name];
    if (existing) return sendJson(res, 409, { error: 'account already exists' }), true;
    const job = startLogin(name);
    return sendJson(res, 200, { id: job.id, name }), true;
  }

  if (req.method === 'GET' && route.startsWith('login/')) {
    const id = route.slice('login/'.length);
    const job = loginJobs.get(id);
    if (!job) return sendJson(res, 404, { error: 'login job not found' }), true;
    return sendJson(res, 200, { url: job.url, done: job.done, ok: job.ok, log: job.log.slice(-400) }), true;
  }

  if (req.method === 'POST' && route === 'accounts/order') {
    const body = await readBody(req);
    try {
      const order = reorderAccounts(body.order);
      return sendJson(res, 200, { ok: true, order }), true;
    } catch (e) {
      return sendJson(res, 400, { error: e.message }), true;
    }
  }

  if (req.method === 'PATCH' && route.startsWith('accounts/')) {
    const name = decodeURIComponent(route.slice('accounts/'.length));
    const body = await readBody(req);
    try {
      const label = setAccountLabel(name, body.label);
      return sendJson(res, 200, { ok: true, label }), true;
    } catch (e) {
      return sendJson(res, 400, { error: e.message }), true;
    }
  }

  if (req.method === 'POST' && route === 'accounts/use') {
    const body = await readBody(req);
    try { useAccount(String(body.name || '')); } catch (e) { return sendJson(res, 400, { error: e.message }), true; }
    return sendJson(res, 200, { ok: true }), true;
  }

  if (req.method === 'DELETE' && route.startsWith('accounts/')) {
    const name = decodeURIComponent(route.slice('accounts/'.length));
    const data = loadAccounts();
    const dir = data.accounts[name]?.dir;
    try { removeAccount(name); } catch (e) { return sendJson(res, 400, { error: e.message }), true; }
    if (dir) { try { fs.rmSync(dir, { recursive: true, force: true }); } catch {} }
    return sendJson(res, 200, { ok: true }), true;
  }

  if (req.method === 'POST' && route === 'stop') {
    sendJson(res, 200, { ok: true });
    setTimeout(() => {
      try { shutdownPool(); } catch {}
      process.exit(0);
    }, 150);
    return true;
  }

  if (req.method === 'GET' && route === 'metrics') {
    return sendJson(res, 200, snapshot(url.searchParams.get('range') || '30m')), true;
  }

  if (req.method === 'POST' && route === 'models/apply') {
    const result = applyModelPicker();
    return sendJson(res, result.ok ? 200 : 500, result), true;
  }

  if (req.method === 'GET' && route === 'models') {
    if (url.searchParams.get('refresh') === '1') {
      await Promise.all([refreshModels({ force: true }), refreshRemote({ force: true })]);
    }
    return sendJson(res, 200, modelsStatus()), true;
  }

  if (req.method === 'GET' && route === 'logs') {
    const n = Math.min(500, Number(url.searchParams.get('n') || 120));
    let text = '';
    try {
      const raw = fs.readFileSync(logFile, 'utf8');
      text = raw.split('\n').slice(-n).join('\n');
    } catch {}
    return sendJson(res, 200, { text }), true;
  }

  if (req.method === 'POST' && route === 'test') {
    const body = await readBody(req);
    const prompt = String(body.prompt || 'say exactly: ok').slice(0, 500);
    const model = String(body.model || 'Auto').slice(0, 64);
    const started = Date.now();
    try {
      const port = req.socket?.localPort || Number(process.env.BRIDGE_PORT || 8787);
      const r = await fetch(`http://127.0.0.1:${port}/v1/messages`, {
        method: 'POST',
        signal: AbortSignal.timeout(60000),
        headers: {
          'content-type': 'application/json',
          ...(process.env.BRIDGE_API_KEY ? { 'x-api-key': process.env.BRIDGE_API_KEY } : {}),
        },
        body: JSON.stringify({ model, max_tokens: 64, stream: false, messages: [{ role: 'user', content: prompt }] }),
      });
      const j = await r.json();
      const text = (j.content || []).map((c) => c.text || '').join('');
      return sendJson(res, 200, { status: r.status, ms: Date.now() - started, text, error: j.error?.message }), true;
    } catch (e) {
      return sendJson(res, 200, { status: 0, ms: Date.now() - started, error: e.message }), true;
    }
  }

  return sendJson(res, 404, { error: 'unknown route' }), true;
}
