import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT =
  process.env.QODER_BRIDGE_HOME || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const CONFIG_PATH = path.join(ROOT, 'bridge.config.json');

export const DEFAULTS = {
  port: 8787,
  host: '127.0.0.1',
  apiKey: '',
  transport: 'auto',
  pool: true,
  poolSize: 2,
  requestTimeoutMs: 300000,
  stallMs: 90000,
  contextWindow: 1000000,
  thinking: '',
  thinkingBudget: 0,
  effort: '',
  maxOutputTokens: 0,
  modelRetries: 0,
  maxAttempts: 0,
  log: true,
  quota: true,
  quotaPollMs: 300000,
};

const ENV = {
  port: 'BRIDGE_PORT',
  host: 'BRIDGE_HOST',
  apiKey: 'BRIDGE_API_KEY',
  transport: 'BRIDGE_TRANSPORT',
  pool: 'BRIDGE_POOL',
  poolSize: 'BRIDGE_POOL_SIZE',
  requestTimeoutMs: 'BRIDGE_REQUEST_TIMEOUT_MS',
  stallMs: 'BRIDGE_STALL_MS',
  contextWindow: 'QODER_CONTEXT_WINDOW',
  thinking: 'QODER_THINKING',
  thinkingBudget: 'QODER_THINKING_BUDGET',
  effort: 'QODER_REASONING_EFFORT',
  maxOutputTokens: 'QODER_MAX_OUTPUT_TOKENS',
  modelRetries: 'BRIDGE_MODEL_RETRIES',
  maxAttempts: 'BRIDGE_MAX_ATTEMPTS',
  log: 'BRIDGE_LOG',
  quota: 'BRIDGE_QUOTA',
  quotaPollMs: 'BRIDGE_QUOTA_POLL_MS',
};

export const RESTART_KEYS = ['port', 'host', 'apiKey', 'transport', 'pool', 'poolSize', 'log'];
const LIVE_KEYS = [
  'requestTimeoutMs',
  'stallMs',
  'contextWindow',
  'thinking',
  'thinkingBudget',
  'effort',
  'maxOutputTokens',
  'modelRetries',
  'maxAttempts',
  'quota',
  'quotaPollMs',
];

const ORIGINAL_ENV = { ...process.env };
const THINKING = ['', 'auto', 'adaptive', 'enabled', 'disabled'];
const EFFORT = ['', 'low', 'medium', 'high', 'xhigh'];

function readFile() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function clamp(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

export function normalize(raw = {}) {
  const out = { ...DEFAULTS };
  for (const key of Object.keys(DEFAULTS)) {
    if (raw[key] === undefined) continue;
    const def = DEFAULTS[key];
    if (typeof def === 'boolean') out[key] = Boolean(raw[key]);
    else if (typeof def === 'number') out[key] = Number(raw[key]);
    else out[key] = String(raw[key]);
  }
  out.port = clamp(out.port, 1, 65535, DEFAULTS.port);
  out.poolSize = clamp(out.poolSize, 1, 16, DEFAULTS.poolSize);
  out.requestTimeoutMs = clamp(out.requestTimeoutMs, 5000, 3600000, DEFAULTS.requestTimeoutMs);
  out.stallMs = clamp(out.stallMs, 5000, 3600000, DEFAULTS.stallMs);
  out.contextWindow = clamp(out.contextWindow, 100000, 2000000, DEFAULTS.contextWindow);
  out.thinkingBudget = clamp(out.thinkingBudget, 0, 200000, 0);
  out.maxOutputTokens = clamp(out.maxOutputTokens, 0, 200000, 0);
  out.modelRetries = clamp(out.modelRetries, 0, 10, 0);
  out.maxAttempts = clamp(out.maxAttempts, 0, 20, 0);
  out.quotaPollMs = clamp(out.quotaPollMs, 60000, 3600000, DEFAULTS.quotaPollMs);
  if (!['auto', 'direct', 'cli'].includes(out.transport)) out.transport = 'auto';
  if (!THINKING.includes(out.thinking)) out.thinking = '';
  if (!EFFORT.includes(out.effort)) out.effort = '';
  out.host = String(out.host || DEFAULTS.host).slice(0, 64);
  out.apiKey = String(out.apiKey || '');
  return out;
}

export function readConfig() {
  return normalize({ ...DEFAULTS, ...readFile() });
}

export function envLocked() {
  return Object.fromEntries(
    Object.entries(ENV)
      .filter(([, name]) => ORIGINAL_ENV[name] !== undefined)
      .map(([key]) => [key, true]),
  );
}

function envNumber(name, fallback) {
  const n = Number(process.env[name]);
  return Number.isFinite(n) ? n : fallback;
}

export function effectiveConfig() {
  const cfg = readConfig();
  return {
    ...cfg,
    port: envNumber('BRIDGE_PORT', cfg.port),
    host: process.env.BRIDGE_HOST || cfg.host,
    apiKey: process.env.BRIDGE_API_KEY !== undefined ? process.env.BRIDGE_API_KEY : cfg.apiKey,
    transport: process.env.BRIDGE_TRANSPORT || cfg.transport,
    pool: process.env.BRIDGE_POOL !== undefined ? process.env.BRIDGE_POOL !== '0' : cfg.pool,
    poolSize: envNumber('BRIDGE_POOL_SIZE', cfg.poolSize),
    requestTimeoutMs: envNumber('BRIDGE_REQUEST_TIMEOUT_MS', cfg.requestTimeoutMs),
    stallMs: envNumber('BRIDGE_STALL_MS', cfg.stallMs),
    contextWindow: envNumber('QODER_CONTEXT_WINDOW', cfg.contextWindow),
    thinking: process.env.QODER_THINKING ?? cfg.thinking,
    thinkingBudget: envNumber('QODER_THINKING_BUDGET', cfg.thinkingBudget),
    effort: process.env.QODER_REASONING_EFFORT ?? cfg.effort,
    maxOutputTokens: envNumber('QODER_MAX_OUTPUT_TOKENS', cfg.maxOutputTokens),
    modelRetries: envNumber('BRIDGE_MODEL_RETRIES', cfg.modelRetries),
    maxAttempts: envNumber('BRIDGE_MAX_ATTEMPTS', cfg.maxAttempts),
    log: process.env.BRIDGE_LOG !== undefined ? process.env.BRIDGE_LOG !== '0' : cfg.log,
    quota: process.env.BRIDGE_QUOTA !== undefined ? process.env.BRIDGE_QUOTA !== '0' : cfg.quota,
    quotaPollMs: envNumber('BRIDGE_QUOTA_POLL_MS', cfg.quotaPollMs),
  };
}

export function publicConfig() {
  const cfg = effectiveConfig();
  const { apiKey } = cfg;
  const out = {
    ...cfg,
    apiKeySet: Boolean(apiKey),
    envLocked: envLocked(),
    quotaEndpoint: process.env.QODER_QUOTA_ENDPOINT || 'https://openapi.qoder.sh',
  };
  delete out.apiKey;
  return out;
}

function envValue(key, value) {
  if (key === 'transport') return value === 'auto' ? undefined : value;
  if (key === 'pool' || key === 'log' || key === 'quota') return value ? '1' : '0';
  if (['thinking', 'effort'].includes(key)) return value || undefined;
  if (['thinkingBudget', 'maxOutputTokens', 'maxAttempts', 'modelRetries'].includes(key)) {
    return Number(value) > 0 ? String(value) : undefined;
  }
  return value === undefined || value === null || value === '' ? undefined : String(value);
}

export function applyConfig() {
  const cfg = readConfig();
  for (const [key, name] of Object.entries(ENV)) {
    if (ORIGINAL_ENV[name] !== undefined) continue;
    const value = envValue(key, cfg[key]);
    if (value !== undefined) process.env[name] = value;
  }
}

export function saveConfig(patch = {}) {
  const before = effectiveConfig();
  const raw = readFile();
  for (const key of Object.keys(DEFAULTS)) {
    if (patch[key] !== undefined) raw[key] = patch[key];
  }
  const next = normalize(raw);
  const locked = envLocked();
  const changedRestart = RESTART_KEYS.filter(
    (key) => !locked[key] && before[key] !== next[key],
  );

  try {
    if (fs.existsSync(CONFIG_PATH)) fs.copyFileSync(CONFIG_PATH, `${CONFIG_PATH}.bak`);
    const tmp = `${CONFIG_PATH}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(next, null, 2) + '\n');
    fs.renameSync(tmp, CONFIG_PATH);
  } catch (e) {
    return { ok: false, error: `config write failed: ${e.message}` };
  }

  for (const key of [...LIVE_KEYS, 'port', 'host', 'transport', 'pool', 'poolSize', 'log']) {
    if (key === 'apiKey' || locked[key]) continue;
    const name = ENV[key];
    const value = envValue(key, next[key]);
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }

  return { ok: true, config: publicConfig(), restartRequired: changedRestart };
}

applyConfig();
