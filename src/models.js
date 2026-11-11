import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolveCli } from './cliPath.js';
import { context } from './qoderAuth.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.QODER_BRIDGE_HOME || path.resolve(HERE, '..');
const BUILTIN_PATH = path.join(HERE, 'models.json');
const CACHE_PATH = path.join(ROOT, 'models.cache.json');
const CONFIG_DIR = process.env.QODER_CONFIG_DIR || path.join(process.env.USERPROFILE || process.env.HOME || '', '.qoder');
const TEXTS_PATH = path.join(CONFIG_DIR, '.auth', 'dynamic-texts.json');
const DOC_URL = process.env.QODER_MODELS_DOC_URL || 'https://docs.qoder.com/cli/model.md';
const API_HOST = process.env.QODER_MODEL_LIST_ENDPOINT || 'https://api1.qoder.sh';
const API_PATH = '/api/v2/model/list?Encode=1';
const REMOTE_TTL_MS = 6 * 60 * 60 * 1000;

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
  catalogAt: 0,
};

let refreshing = null;
let remotePromise = null;
let remoteAt = 0;
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

const TIER_ORDER = ['Auto', 'Ultimate', 'Fast', 'Efficient', 'Lite', 'Performance'];

function orderModels(list) {
  return [...list].sort((a, b) => {
    const ia = TIER_ORDER.indexOf(a);
    const ib = TIER_ORDER.indexOf(b);
    if (ia >= 0 || ib >= 0) return (ia < 0 ? TIER_ORDER.length : ia) - (ib < 0 ? TIER_ORDER.length : ib);
    return a.localeCompare(b);
  });
}

export function readCatalog(file = TEXTS_PATH) {
  let raw;
  let at;
  try {
    at = fs.statSync(file).mtimeMs;
    raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
  const locales = raw?.locales || {};
  const dict = locales.en || Object.values(locales)[0] || {};
  const models = [];
  for (const [key, value] of Object.entries(dict)) {
    if (!key.startsWith('modelSelector.item.') || /description/i.test(key)) continue;
    const name = String(value || '').trim();
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name) || /dogfood/i.test(name)) continue;
    if (!models.includes(name)) models.push(name);
  }
  if (!models.length) return null;
  return { models: orderModels(models), at };
}

function applyCatalog() {
  const catalog = readCatalog();
  if (!catalog) return false;
  if (catalog.at <= state.catalogAt) return false;
  state.catalogAt = catalog.at;
  if (!state.list.length || state.fetchedAt < catalog.at) {
    state.list = catalog.models;
    state.source = 'catalog';
    state.fetchedAt = catalog.at;
  }
  return true;
}

export function parseDocModels(markdown) {
  const text = String(markdown || '');
  const models = ['Auto', 'Ultimate', 'Performance', 'Efficient'];
  let table = text;
  const heading = text.match(/^#{2,4}[^\n]*Frontier Models[^\n]*$/im);
  if (heading) {
    const rest = text.slice(heading.index + heading[0].length);
    const next = rest.search(/^#{1,4}\s/m);
    table = next >= 0 ? rest.slice(0, next) : rest;
  }
  for (const line of table.split(/\r?\n/)) {
    const cell = line.split('|')[1];
    if (!cell) continue;
    const name = cell.trim();
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name)) continue;
    if (/^model name$/i.test(name)) continue;
    if (!models.includes(name)) models.push(name);
  }
  return models.length > 4 ? models : [];
}

export function normalizeApiCatalog(json) {
  const scenes = ['assistant', 'chat', 'app', 'qwake', 'quest', 'inline'];
  const pool = [];
  for (const scene of scenes) {
    const rows = Array.isArray(json?.[scene]) ? json[scene] : [];
    for (const row of rows) if (row && typeof row === 'object') pool.push(row);
  }
  if (!pool.length) return null;
  const enabled = pool.filter((row) => row.enable !== false);
  const usable = enabled.length ? enabled : pool;
  const names = [];
  for (const row of usable) {
    const name = String(row.display_name || row.key || '').trim();
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name) || /dogfood/i.test(name)) continue;
    if (!names.includes(name)) names.push(name);
  }
  return names.length ? orderModels(names) : null;
}

export async function fetchApiModels({ fetchImpl = fetch, timeoutMs = 12000, signer = null } = {}) {
  let req;
  if (signer) {
    req = signer(API_HOST, API_PATH);
    if (!req) return null;
  } else {
    let ctx;
    try {
      ({ ctx } = context());
    } catch {
      return null;
    }
    req = ctx.prepareRequest(API_HOST, API_PATH, 'GET', 'auth', undefined, undefined);
  }
  const signal = AbortSignal.timeout ? AbortSignal.timeout(timeoutMs) : undefined;
  const raw = req.headers || {};
  const headers = typeof raw[Symbol.iterator] === 'function' ? Object.fromEntries(raw) : raw;
  const res = await fetchImpl(req.url, { method: 'GET', headers, signal });
  if (!res.ok) return null;
  return normalizeApiCatalog(await res.json());
}

export async function refreshRemote({ force = false, fetchImpl = fetch, signer = null } = {}) {
  if (!force && Date.now() - remoteAt < REMOTE_TTL_MS) return false;
  if (remotePromise) return remotePromise;
  remotePromise = (async () => {
    const apply = (list, source) => {
      const merged = [...list];
      for (const model of [...state.list, ...QODER_MODELS]) if (!merged.includes(model)) merged.push(model);
      const catalogStale = state.source === 'catalog' && Date.now() - state.fetchedAt > 14 * 24 * 60 * 60 * 1000;
      if (state.source !== 'cli' || catalogStale) {
        state.list = orderModels(merged);
        state.source = source;
        state.fetchedAt = Date.now();
      }
    };
    try {
      const api = await fetchApiModels({ fetchImpl, signer }).catch(() => null);
      remoteAt = Date.now();
      if (api && api.length) {
        apply(api, 'api');
        return true;
      }
      const signal = AbortSignal.timeout ? AbortSignal.timeout(8000) : undefined;
      const res = await fetchImpl(DOC_URL, { headers: { accept: 'text/markdown, text/plain, */*' }, signal });
      if (!res.ok) return false;
      const parsed = parseDocModels(await res.text());
      if (!parsed.length) return false;
      apply(parsed, 'remote');
      return true;
    } catch {
      return false;
    } finally {
      remotePromise = null;
    }
  })();
  return remotePromise;
}

restoreCache();
applyCatalog();

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
  applyCatalog();
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
  refreshRemote();
  timer = setInterval(() => {
    applyCatalog();
    refreshRemote();
    if (due()) refreshModels();
  }, Math.min(TTL_MS, 60_000));
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
