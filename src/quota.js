import { effectiveConfig } from './config.js';
import { rotationSnapshot } from './accounts.js';
import { authDir, credentials } from './qoderAuth.js';
import { appendSample, derive } from './quotaStore.js';
import { snapshot as metricsSnapshot } from './metrics.js';

const DEFAULT_ENDPOINT = 'https://openapi.qoder.sh';
const CACHE_TTL = 60 * 1000;
const AUTH_TTL = 10 * 60 * 1000;
const MAX_EXPIRY = 10 * 365 * 24 * 60 * 60 * 1000;

const cache = new Map();
let pollTimer = null;

function endpoint() {
  return String(process.env.QODER_QUOTA_ENDPOINT || DEFAULT_ENDPOINT).replace(/\/+$/, '');
}

function safeUrl(value) {
  try {
    const url = new URL(String(value));
    return url.protocol === 'https:' && /(^|\.)qoder\.com$/.test(url.hostname) ? url.toString() : null;
  } catch {
    return null;
  }
}

function block(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const total = Number(raw.total);
  const used = Number(raw.used);
  const remaining = Number(raw.remaining);
  const percentage = Number(raw.percentage);
  return {
    total: Number.isFinite(total) ? total : 0,
    used: Number.isFinite(used) ? used : 0,
    remaining: Number.isFinite(remaining) ? remaining : null,
    percentage: Number.isFinite(percentage) ? percentage : null,
    unit: typeof raw.unit === 'string' ? raw.unit : '',
    detailUrl: typeof raw.detailUrl === 'string' ? raw.detailUrl : '',
  };
}

export function normalizeQuota(raw, now = Date.now()) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const plan = block(source.userQuota);
  const addOn = block(source.addOnQuota);
  const active = [addOn, plan].find((item) => item && item.total > 0) || addOn || plan;
  if (!active) {
    return {
      status: 'unavailable', plan: String(source.userType || ''), unit: 'credits',
      total: 0, used: 0, remaining: 0, percent: 0, exceeded: false,
      expiresAt: null, fetchedAt: now, stale: false, reason: 'empty', breakdown: { plan, addOn },
    };
  }

  const total = active.total;
  const used = Math.max(0, active.used);
  const upgradeUrl = safeUrl(source.upgradeUrl);
  const detailUrl = safeUrl(addOn && addOn.detailUrl) || safeUrl(plan && plan.detailUrl);
  if (total <= 0) {
    const blocked = Boolean(source.isQuotaExceeded);
    return {
      status: blocked ? 'exceeded' : 'unavailable',
      plan: String(source.userType || ''),
      unit: active.unit || String(source.usageType || 'credits'),
      total: 0, used, remaining: 0,
      percent: blocked ? 100 : 0,
      exceeded: blocked,
      expiresAt: null,
      fetchedAt: now,
      stale: false,
      reason: blocked ? 'no-credits' : 'no-quota',
      upgradeUrl,
      detailUrl,
      breakdown: { plan, addOn },
    };
  }
  let percent = total > 0 ? (used / total) * 100 : active.percentage;
  if (!Number.isFinite(percent) && Number.isFinite(Number(source.totalUsagePercentage))) {
    percent = Number(source.totalUsagePercentage) * 100;
  }
  percent = Math.min(100, Math.max(0, Number(percent) || 0));
  const remaining = active.remaining !== null ? Math.max(0, active.remaining) : Math.max(0, total - used);
  const expiresAt = Number(source.expiresAt);
  const safeExpiry = Number.isFinite(expiresAt) && expiresAt > now && expiresAt <= now + MAX_EXPIRY ? expiresAt : null;

  return {
    status: 'ok',
    plan: String(source.userType || ''),
    unit: active.unit || String(source.usageType || 'credits'),
    total,
    used,
    remaining,
    percent,
    exceeded: Boolean(source.isQuotaExceeded) || percent >= 100,
    expiresAt: safeExpiry,
    fetchedAt: now,
    stale: false,
    reason: '',
    upgradeUrl,
    detailUrl,
    breakdown: { plan, addOn },
  };
}

function failure(status, reason, plan = '') {
  return {
    status, plan, unit: 'credits', total: 0, used: 0, remaining: 0, percent: 0,
    exceeded: false, expiresAt: null, fetchedAt: Date.now(), stale: false, reason,
  };
}

export async function fetchQuota(dir, { fetchImpl = fetch, now = Date.now(), timeoutMs = 8000, account = '' } = {}) {
  let token = process.env.QODER_QUOTA_TOKEN || '';
  if (!token) {
    try {
      ({ token } = credentials(dir));
    } catch {
      return { ...failure('no-auth', 'auth-file'), account };
    }
  }
  if (!token) return { ...failure('no-auth', 'no-token'), account };

  let res;
  try {
    const signal = AbortSignal.timeout ? AbortSignal.timeout(timeoutMs) : undefined;
    res = await fetchImpl(`${endpoint()}/api/v2/quota/usage`, {
      method: 'GET',
      headers: { accept: 'application/json', authorization: `Bearer ${token}` },
      signal,
    });
  } catch (e) {
    const reason = e?.name === 'TimeoutError' ? 'timeout' : 'network';
    return { ...failure('unavailable', reason), account };
  }

  if (res.status === 401 || res.status === 403) return { ...failure('no-auth', `http_${res.status}`), account };
  if (!res.ok) return { ...failure('unavailable', `http_${res.status}`), account };

  let raw;
  try {
    raw = await res.json();
  } catch {
    return { ...failure('unavailable', 'parse'), account };
  }
  return { ...normalizeQuota(raw, now), account };
}

export async function getQuota(dir, { refresh = false, fetchImpl, now = Date.now(), account = '' } = {}) {
  const root = authDir(dir);
  const cached = cache.get(root);
  if (cached && !refresh) {
    if (cached.promise) return cached.promise;
    if (cached.record && now < cached.until) return cached.record;
  }
  const promise = fetchQuota(dir, { fetchImpl, now, account })
    .then((record) => {
      const previous = cache.get(root);
      const ttl = record.status === 'no-auth' ? AUTH_TTL : CACHE_TTL;
      if (record.status !== 'ok' && previous?.record?.status === 'ok') {
        const stale = { ...previous.record, stale: true, reason: record.reason };
        cache.set(root, { record: stale, until: Date.now() + CACHE_TTL });
        return stale;
      }
      cache.set(root, { record, until: Date.now() + ttl });
      return record;
    })
    .catch(() => {
      const previous = cache.get(root);
      if (previous?.record) {
        const stale = { ...previous.record, stale: true, reason: 'error' };
        cache.set(root, { record: stale, until: Date.now() + CACHE_TTL });
        return stale;
      }
      return { ...failure('unavailable', 'error'), account };
    })
    .finally(() => {
      const entry = cache.get(root);
      if (entry) entry.promise = null;
    });
  cache.set(root, { ...(cached || {}), promise });
  return promise;
}

function metricsFallback() {
  try {
    const week = metricsSnapshot('7d');
    return week.credits > 0 ? week.credits / 7 : null;
  } catch {
    return null;
  }
}

export async function quotaSnapshot({ refresh = false } = {}) {
  const rotation = rotationSnapshot();
  const fallbackBurnPerDay = metricsFallback();
  const rows = await Promise.all(rotation.accounts.map(async (account) => {
    const record = await getQuota(account.dir, { refresh, account: account.name });
    const stats = derive(account.name, { fallbackBurnPerDay });
    return {
      ...record,
      name: account.name,
      label: account.label,
      enabled: account.enabled,
      active: account.active,
      burnPerDay: stats.burnPerDay,
      forecastAt: stats.forecastAt,
      spent24h: stats.spent24h,
      spent7d: stats.spent7d,
      confidence: stats.confidence,
    };
  }));

  const byName = Object.fromEntries(rows.map((row) => [row.name, row]));
  const active = rows.find((row) => row.active) || rows[0] || null;
  return {
    summary: active,
    active: rotation.active,
    accounts: byName,
    updatedAt: rows.reduce((max, row) => Math.max(max, row.fetchedAt || 0), 0),
  };
}

async function poll() {
  const cfg = effectiveConfig();
  if (cfg.quota) {
    const rotation = rotationSnapshot();
    for (const account of rotation.accounts) {
      if (!account.enabled) continue;
      try {
        const record = await getQuota(account.dir, { refresh: true, account: account.name });
        if (record.status === 'ok') appendSample(account.name, record);
      } catch {}
    }
  }
  const next = effectiveConfig();
  pollTimer = setTimeout(poll, next.quota ? next.quotaPollMs : 60000);
  pollTimer.unref?.();
}

export function startQuotaPolling() {
  if (pollTimer) return;
  poll();
}

export function stopQuotaPolling() {
  if (pollTimer) clearTimeout(pollTimer);
  pollTimer = null;
}
