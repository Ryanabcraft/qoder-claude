import { spawn, spawnSync } from 'node:child_process';
import { resolveCli } from './cliPath.js';

export const QODER_MODELS = [
  'Auto', 'Ultimate', 'Fast', 'Efficient', 'Sonus', 'Cantus',
  'Qwen3.8-Max', 'Qwen3.8-Flash', 'Kimi-K3.1-Pro', 'Kimi-K2.8-Preview',
  'GLM-5.3', 'GLM-5.3-Flash', 'DeepSeek-V4-Pro', 'DeepSeek-Flash', 'MiniMax-M3.1-Flash',
];

const TTL_MS = Number(process.env.QODER_MODELS_TTL_MS || 10 * 60 * 1000);
let cache = null;
let cacheAt = 0;
let refreshing = null;
let timer = null;

export function parseModels(out) {
  const list = [];
  for (const raw of String(out).split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (/^(MODEL|Skipped invalid MCP|Error|Usage:)/i.test(line)) continue;
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(line)) continue;
    if (!list.includes(line)) list.push(line);
  }
  return list;
}

const stale = () => !cache || Date.now() - cacheAt >= TTL_MS;

export function cachedModels() {
  return cache || QODER_MODELS;
}

function fetchModels() {
  return new Promise((resolve) => {
    let cli;
    try {
      cli = resolveCli();
    } catch {
      resolve(cachedModels());
      return;
    }
    let out = '';
    let cap = null;
    let settled = false;
    const finish = (list) => {
      if (settled) return;
      settled = true;
      clearTimeout(cap);
      if (list && list.length) cache = list;
      cacheAt = Date.now();
      resolve(cachedModels());
    };
    let child;
    try {
      child = spawn(cli.cmd, [...cli.prefix, '--list-models'], {
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'ignore'],
        env: process.env,
      });
    } catch {
      finish();
      return;
    }
    cap = setTimeout(() => { try { child.kill(); } catch {} finish(); }, 60000);
    cap.unref?.();
    if (!child.stdout) {
      finish();
      return;
    }
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (d) => { out += d; });
    child.on('error', () => finish());
    child.on('close', () => finish(parseModels(out)));
  });
}

export function refreshModels() {
  if (!refreshing) refreshing = fetchModels().finally(() => { refreshing = null; });
  return refreshing;
}

export function startModelRefresh() {
  if (process.env.BRIDGE_MODELS_REFRESH === '0' || timer) return;
  refreshModels();
  timer = setInterval(() => { if (stale()) refreshModels(); }, Math.min(TTL_MS, 60_000));
  timer.unref?.();
}

export function detectModels({ force = false } = {}) {
  if (!force && cache && Date.now() - cacheAt < TTL_MS) return cache;
  const cli = resolveCli();
  let found = [];
  try {
    const r = spawnSync(cli.cmd, [...cli.prefix, '--list-models'], {
      encoding: 'utf8',
      windowsHide: true,
      timeout: 60000,
      env: process.env,
    });
    found = parseModels(r.stdout || '');
  } catch {}
  cache = found.length ? found : QODER_MODELS;
  cacheAt = Date.now();
  return cache;
}
