import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.env.QODER_BRIDGE_HOME || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const METRICS_PATH = path.join(ROOT, 'metrics.jsonl');
const MAX_SAMPLES = 2000;
const RETENTION = 7 * 24 * 60 * 60 * 1000;
const startedAt = Date.now();

const state = {
  samples: [],
  minutes: new Map(),
  lastError: null,
};

const bucket = () => ({ count: 0, ok: 0, err: 0, msSum: 0, ttftSum: 0, in: 0, out: 0, models: {}, accounts: {} });

function minuteOf(t) {
  return Math.floor(t / 60000) * 60000;
}

function entryFor(t) {
  const at = minuteOf(t);
  let entry = state.minutes.get(at);
  if (!entry) {
    entry = { t: at, ...bucket() };
    state.minutes.set(at, entry);
  }
  return entry;
}

function bump(map, key, item, ok) {
  const name = key || '-';
  const row = map[name] || { count: 0, ok: 0, err: 0, msSum: 0, in: 0, out: 0 };
  row.count += 1;
  if (ok) row.ok += 1; else row.err += 1;
  row.msSum += item.ms;
  row.in += item.in;
  row.out += item.out;
  map[name] = row;
}

function add(entry, item, ok) {
  entry.count += 1;
  if (ok) entry.ok += 1; else entry.err += 1;
  entry.msSum += item.ms;
  entry.ttftSum += item.ttft;
  entry.in += item.in;
  entry.out += item.out;
  bump(entry.models, item.model, item, ok);
  bump(entry.accounts, item.account, item, ok);
}

function append(entry) {
  try {
    fs.appendFile(METRICS_PATH, JSON.stringify(entry) + '\n', () => {});
  } catch {}
}

function load() {
  let text = '';
  try { text = fs.readFileSync(METRICS_PATH, 'utf8'); } catch { return; }
  const cutoff = Date.now() - RETENTION;
  let changed = false;
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) { changed = true; continue; }
    let entry;
    try { entry = JSON.parse(line); } catch { changed = true; continue; }
    if (!entry || typeof entry.t !== 'number') { changed = true; continue; }
    if (entry.t < cutoff) { changed = true; continue; }
    state.minutes.set(entry.t, { ...bucket(), ...entry });
  }
  if (changed) compact();
}

function compact() {
  const rows = [...state.minutes.values()].sort((a, b) => a.t - b.t);
  const tmp = `${METRICS_PATH}.tmp`;
  try {
    fs.writeFileSync(tmp, rows.map((row) => JSON.stringify(row)).join('\n') + (rows.length ? '\n' : ''));
    fs.renameSync(tmp, METRICS_PATH);
  } catch {}
}

let currentMinute = null;
let flushTimer = null;

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    if (currentMinute) append(currentMinute);
  }, 30000);
  flushTimer.unref?.();
}

export function record({ model, status, ms, ttft, transport, account, inTokens, outTokens }) {
  const t = Date.now();
  const ok = status >= 200 && status < 300;
  const item = {
    t,
    model: model || '-',
    status,
    ms: Number(ms) || 0,
    ttft: Number(ttft) || 0,
    transport: transport || 'cli',
    account: account || '-',
    in: Number(inTokens) || 0,
    out: Number(outTokens) || 0,
  };
  state.samples.push(item);
  if (state.samples.length > MAX_SAMPLES) state.samples.shift();
  if (!ok) state.lastError = { t, status, model: item.model, account: item.account };

  const entry = entryFor(t);
  add(entry, item, ok);
  currentMinute = entry;
  scheduleFlush();
}

function aggregate(entries, select) {
  const out = {};
  for (const entry of entries) {
    for (const [name, row] of Object.entries(entry[select] || {})) {
      const target = out[name] || { name, count: 0, ok: 0, err: 0, msSum: 0, in: 0, out: 0 };
      target.count += row.count;
      target.ok += row.ok;
      target.err += row.err;
      target.msSum += row.msSum;
      target.in += row.in;
      target.out += row.out;
      out[name] = target;
    }
  }
  return Object.values(out)
    .map(({ msSum, ...row }) => ({ ...row, avgMs: row.count ? Math.round(msSum / row.count) : 0 }))
    .sort((a, b) => b.count - a.count);
}

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return Math.round(sorted[index]);
}

const RANGES = {
  '30m': { ms: 30 * 60 * 1000, step: 60 * 1000, count: 30 },
  '24h': { ms: 24 * 60 * 60 * 1000, step: 5 * 60 * 1000, count: 288 },
  '7d': { ms: 7 * 24 * 60 * 60 * 1000, step: 60 * 60 * 1000, count: 168 },
};

function series(entries, range, now) {
  const spec = RANGES[range] || RANGES['30m'];
  const start = Math.floor((now - spec.ms) / spec.step) * spec.step;
  const points = [];
  for (let i = 0; i < spec.count; i += 1) {
    points.push({ t: start + i * spec.step, count: 0, ok: 0, err: 0, msSum: 0, in: 0, out: 0 });
  }
  for (const entry of entries) {
    const index = Math.floor((entry.t - start) / spec.step);
    if (index < 0 || index >= points.length) continue;
    const point = points[index];
    point.count += entry.count;
    point.ok += entry.ok;
    point.err += entry.err;
    point.msSum += entry.msSum;
    point.in += entry.in;
    point.out += entry.out;
  }
  return points.map(({ msSum, ...point }) => ({
    ...point,
    label: range === '7d'
      ? new Date(point.t).toLocaleDateString('en-US', { weekday: 'short' })
      : new Date(point.t).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
    avg: point.count ? Math.round(msSum / point.count) : 0,
  }));
}

export function snapshot(range = '30m') {
  const label = RANGES[range] ? range : '30m';
  const now = Date.now();
  const spec = RANGES[label];
  const entries = [...state.minutes.values()].filter((entry) => entry.t > now - spec.ms).sort((a, b) => a.t - b.t);
  const totals = entries.reduce((sum, entry) => {
    sum.count += entry.count;
    sum.ok += entry.ok;
    sum.err += entry.err;
    sum.msSum += entry.msSum;
    sum.ttftSum += entry.ttftSum;
    sum.in += entry.in;
    sum.out += entry.out;
    return sum;
  }, { count: 0, ok: 0, err: 0, msSum: 0, ttftSum: 0, in: 0, out: 0 });

  const samples = state.samples.filter((sample) => sample.t > now - spec.ms);
  return {
    range: label,
    total: totals.count,
    ok: totals.ok,
    err: totals.err,
    success: totals.count ? Math.round((totals.ok / totals.count) * 100) : 100,
    avgMs: totals.count ? Math.round(totals.msSum / totals.count) : 0,
    avgTtft: totals.count ? Math.round(totals.ttftSum / totals.count) : 0,
    p50: percentile(samples.map((sample) => sample.ms), 50),
    p95: percentile(samples.map((sample) => sample.ms), 95),
    ttftP50: percentile(samples.filter((sample) => sample.ttft > 0).map((sample) => sample.ttft), 50),
    tokensIn: totals.in,
    tokensOut: totals.out,
    series: series(entries, label, now),
    topModels: aggregate(entries, 'models').slice(0, 8),
    topAccounts: aggregate(entries, 'accounts').slice(0, 8),
    recent: state.samples.slice(-100).reverse(),
    uptime: Math.round((now - startedAt) / 1000),
    lastError: state.lastError,
  };
}

export function lastError() {
  return state.lastError;
}

load();
