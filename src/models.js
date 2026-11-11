import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolveCli } from './cliPath.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.QODER_BRIDGE_HOME || path.resolve(HERE, '..');
const BUILTIN_PATH = path.join(HERE, 'models.json');
const CACHE_PATH = path.join(ROOT, 'models.cache.json');

const TTL_MS = Number(process.env.QODER_MODELS_TTL_MS || 10 * 60 * 1000);
const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const BACKOFF_MS = [60_000, 120_000, 300_000, 600_000, 1_800_000];
const CLI_TIMEOUT_MS = 60_000;

function readBuiltin() {
  try {
    const raw = JSON.parse(fs.readFileSync(BUILTIN_PATH, 'utf8'));
    const models = Array.isArray(raw?.models) ? raw.models.filter((m) => typeof m === 'string' && m) : [];
    if (models.length) return { models, updated: String(raw.updated || '') };
  } catch {}
  return { models: [], updated: '' };
}

const BUILTIN = readBuiltin();
export const QODER_MODELS = BUILTIN.models;
export const MODELS_BUILTIN_UPDATED = BUILTIN.updated;

const state = {
  list: [],
  source: 'builtin',
  fetchedAt: 0,
  lastAttempt: 0,
  lastError: '',
  failures: 0,
  nextAttempt: 0,
};

let refreshing = null;
let timer = null;

export function parseModels(out) {
  const list = [];
  for (const raw of String(out).split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (/^(MODEL|Skipped invalid MCP|Error|Usage:|Warning:)/i.test(line)) continue;
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(line)) continue;
    if (!list.includes(line)) list.push(line);
  }
  return list;
}

function readCache() {
  const raw = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
  const models = Array.isArray(raw?.models) ? raw.models.filter((m) => typeof m === 'string' && m) : [];
  const at = Number(raw?.at) || 0;
  if (!models.length || !at || Date.now() - at > CACHE_MAX_AGE_MS) return null;
  return { models, at };
}

function writeCache(models, at) {
  const body = JSON.stringify({ models, at, source: 'cli' });
  try {
    const tmp = `${CACHE_PATH}.tmp`;
    fs.writeFileSync(tmp, body);
    fs.renameSync(tmp, CACHE_PATH);
  } catch {}
}

function restoreCache() {
  try {
    const cached = readCache();
    if (!cached) return;
    state.list = cached.models;
    state.source = 'cache';
    state.fetchedAt = cached.at;
  } catch {}
}

restoreCache();

function cleanError(text) {
  const lines = String(text || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const hit = [...lines].reverse().find((line) => /model|login|sign in|auth|error|failed/i.test(line));
  return (hit || lines[0] || '').replace(/\s+/g, ' ').slice(0, 300);
}

function backoffMs(failures) {
  return BACKOFF_MS[Math.min(Math.max(failures - 1, 0), BACKOFF_MS.length - 1)];
}

function applySuccess(models) {
  const now = Date.now();
  state.list = models;
  state.source = 'cli';
  state.fetchedAt = now;
  state.lastAttempt = now;
  state.lastError = '';
  state.failures = 0;
  state.nextAttempt = 0;
  writeCache(models, now);
}

function applyFailure(message) {
  const now = Date.now();
  state.lastAttempt = now;
  state.lastError = message;
  state.failures += 1;
  state.nextAttempt = now + backoffMs(state.failures);
  if (!state.list.length) state.source = 'builtin';
}

export function cachedModels() {
  return state.list.length ? state.list : QODER_MODELS;
}

export function modelsStatus() {
  const list = cachedModels();
  return {
    models: list,
    source: state.source,
    fetchedAt: state.fetchedAt || null,
    lastAttempt: state.lastAttempt || null,
    lastError: state.lastError || '',
    failures: state.failures,
    builtinUpdated: BUILTIN.updated || null,
    refreshing: Boolean(refreshing),
  };
}

function fetchModels() {
  return new Promise((resolve) => {
    let cli;
    try {
      cli = resolveCli();
    } catch (e) {
      applyFailure(String(e?.message || e));
      resolve(cachedModels());
      return;
    }
    let out = '';
    let err = '';
    let cap = null;
    let settled = false;
    const finish = (list, error) => {
      if (settled) return;
      settled = true;
      clearTimeout(cap);
      if (list && list.length) applySuccess(list);
      else applyFailure(cleanError(error || err) || 'the Qoder CLI reported no models');
      resolve(cachedModels());
    };
    let child;
    try {
      child = spawn(cli.cmd, [...cli.prefix, '--list-models'], {
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: process.env,
      });
    } catch (e) {
      finish(null, String(e?.message || e));
      return;
    }
    cap = setTimeout(() => { try { child.kill(); } catch {} finish(null, 'the Qoder CLI timed out'); }, CLI_TIMEOUT_MS);
    cap.unref?.();
    child.stdout?.setEncoding('utf8');
    child.stderr?.setEncoding('utf8');
    child.stdout?.on('data', (d) => { out += d; });
    child.stderr?.on('data', (d) => { err += d; });
    child.on('error', (e) => finish(null, String(e?.message || e)));
    child.on('close', () => finish(parseModels(out)));
  });
}

export function refreshModels({ force = false } = {}) {
  if (refreshing) return refreshing;
  if (force) {
    state.failures = 0;
    state.nextAttempt = 0;
  }
  if (!force && Date.now() < state.nextAttempt) return Promise.resolve(cachedModels());
  refreshing = fetchModels().finally(() => { refreshing = null; });
  return refreshing;
}

function due() {
  const now = Date.now();
  if (now < state.nextAttempt) return false;
  return !state.list.length || now - state.fetchedAt >= TTL_MS;
}

export function startModelRefresh() {
  if (process.env.BRIDGE_MODELS_REFRESH === '0' || timer) return;
  refreshModels();
  timer = setInterval(() => { if (due()) refreshModels(); }, Math.min(TTL_MS, 60_000));
  timer.unref?.();
}

export function detectModels({ force = false } = {}) {
  if (!force && Date.now() < state.nextAttempt) return cachedModels();
  if (!force && state.list.length && Date.now() - state.fetchedAt < TTL_MS) return state.list;
  let found = [];
  let err = '';
  try {
    const cli = resolveCli();
    const r = spawnSync(cli.cmd, [...cli.prefix, '--list-models'], {
      encoding: 'utf8',
      windowsHide: true,
      timeout: CLI_TIMEOUT_MS,
      env: process.env,
    });
    found = parseModels(r.stdout || '');
    err = String(r.stderr || '').trim();
  } catch (e) {
    err = String(e?.message || e);
  }
  if (found.length) applySuccess(found);
  else applyFailure(cleanError(err) || 'the Qoder CLI reported no models');
  return cachedModels();
}
