import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.env.QODER_BRIDGE_HOME || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const QUOTA_PATH = path.join(ROOT, 'quota.jsonl');
const RETENTION = 30 * 24 * 60 * 60 * 1000;
const HEARTBEAT = 15 * 60 * 1000;
const MAX_FORECAST = 3650 * 24 * 60 * 60 * 1000;

const samples = [];
let loaded = false;

function parse(line) {
  try {
    const row = JSON.parse(line);
    if (!row || typeof row.t !== 'number' || typeof row.account !== 'string') return null;
    if (!Number.isFinite(Number(row.used))) return null;
    return {
      t: row.t,
      account: row.account,
      used: Number(row.used),
      total: Number(row.total) || 0,
      remaining: Number(row.remaining) || 0,
      percent: Number(row.percent) || 0,
      exceeded: Boolean(row.exceeded),
    };
  } catch {
    return null;
  }
}

function compact(now = Date.now()) {
  const cutoff = now - RETENTION;
  const rows = samples.filter((row) => row.t >= cutoff);
  samples.length = 0;
  samples.push(...rows);
  const tmp = `${QUOTA_PATH}.tmp`;
  try {
    fs.writeFileSync(tmp, rows.map((row) => JSON.stringify(row)).join('\n') + (rows.length ? '\n' : ''));
    fs.renameSync(tmp, QUOTA_PATH);
  } catch {}
}

function load() {
  if (loaded) return;
  loaded = true;
  let text = '';
  try { text = fs.readFileSync(QUOTA_PATH, 'utf8'); } catch { return; }
  const cutoff = Date.now() - RETENTION;
  let changed = false;
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) { changed = true; continue; }
    const row = parse(line);
    if (!row || row.t < cutoff) { changed = true; continue; }
    samples.push(row);
  }
  samples.sort((a, b) => a.t - b.t);
  if (changed) compact();
}

export function appendSample(account, record, now = Date.now()) {
  if (!account || !record || !Number.isFinite(Number(record.used))) return false;
  load();
  const last = [...samples].reverse().find((row) => row.account === account);
  const used = Number(record.used);
  if (last && last.used === used && now - last.t < HEARTBEAT) return false;
  const row = {
    t: now,
    account,
    used,
    total: Number(record.total) || 0,
    remaining: Number(record.remaining) || 0,
    percent: Number(record.percent) || 0,
    exceeded: Boolean(record.exceeded),
  };
  samples.push(row);
  try { fs.appendFileSync(QUOTA_PATH, JSON.stringify(row) + '\n'); } catch {}
  return true;
}

export function history(account, ms = 24 * 60 * 60 * 1000, now = Date.now()) {
  load();
  const cutoff = now - ms;
  return samples.filter((row) => (!account || row.account === account) && row.t >= cutoff);
}

function spendSince(rows, now, ms) {
  const cutoff = now - ms;
  const window = rows.filter((row) => row.t >= cutoff);
  if (window.length < 2) return null;
  const delta = window[window.length - 1].used - window[0].used;
  return delta >= 0 ? delta : null;
}

export function derive(account, { now = Date.now(), fallbackBurnPerDay = null } = {}) {
  const rows = history(account, RETENTION, now);
  if (rows.length < 2) {
    return {
      burnPerDay: fallbackBurnPerDay,
      forecastAt: null,
      spent24h: null,
      spent7d: null,
      confidence: fallbackBurnPerDay ? 'low' : 'none',
    };
  }
  const latest = rows[rows.length - 1];
  const oldest = rows[0];
  const spanDays = (latest.t - oldest.t) / (24 * 60 * 60 * 1000);
  const delta = latest.used - oldest.used;
  let burnPerDay = null;
  let confidence = 'none';
  if (spanDays >= 0.25 && delta >= 0) {
    burnPerDay = delta / spanDays;
    confidence = spanDays >= 1 ? 'high' : 'medium';
  } else if (fallbackBurnPerDay) {
    burnPerDay = fallbackBurnPerDay;
    confidence = 'low';
  }
  let forecastAt = null;
  if (latest.remaining > 0 && burnPerDay > 0) {
    forecastAt = now + Math.min(MAX_FORECAST, (latest.remaining / burnPerDay) * 24 * 60 * 60 * 1000);
  }
  return {
    burnPerDay,
    forecastAt,
    spent24h: spendSince(rows, now, 24 * 60 * 60 * 1000),
    spent7d: spendSince(rows, now, 7 * 24 * 60 * 60 * 1000),
    confidence,
  };
}
