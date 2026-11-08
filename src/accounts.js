import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT =
  process.env.QODER_BRIDGE_HOME || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const ACCOUNTS_ROOT = path.join(ROOT, 'accounts');
const FILE = path.join(ROOT, 'accounts.json');

const FALLBACK = {
  active: 'default',
  rotation: true,
  accounts: {
    default: { dir: null, label: 'Default (global config)', enabled: true },
  },
  cooldowns: {},
};

function normalize(data) {
  const out = data && data.accounts ? data : JSON.parse(JSON.stringify(FALLBACK));
  if (typeof out.rotation !== 'boolean') out.rotation = true;
  if (!out.cooldowns || typeof out.cooldowns !== 'object') out.cooldowns = {};
  for (const item of Object.values(out.accounts)) {
    if (typeof item.enabled !== 'boolean') item.enabled = true;
    if (!item.label) item.label = item.dir ? path.basename(item.dir) : 'default';
  }
  if (!out.accounts[out.active]) out.active = Object.keys(out.accounts)[0] || 'default';
  return out;
}

export function loadAccounts() {
  try {
    return normalize(JSON.parse(fs.readFileSync(FILE, 'utf8')));
  } catch {
    return JSON.parse(JSON.stringify(FALLBACK));
  }
}

export function saveAccounts(data) {
  fs.writeFileSync(FILE, JSON.stringify(normalize(data), null, 2) + '\n');
}

export function activeAccount() {
  const data = loadAccounts();
  const entry = data.accounts[data.active] || FALLBACK.accounts.default;
  return { name: data.active, dir: entry.dir || '', label: entry.label || data.active };
}

export function useAccount(name) {
  const data = loadAccounts();
  if (!data.accounts[name]) throw new Error(`account "${name}" does not exist`);
  data.active = name;
  saveAccounts(data);
}

export function addAccount(name, dir) {
  const data = loadAccounts();
  data.accounts[name] = { dir, label: name, enabled: true };
  data.active = name;
  delete data.cooldowns[name];
  saveAccounts(data);
}

export function removeAccount(name) {
  if (name === 'default') throw new Error('the default account cannot be removed');
  const data = loadAccounts();
  delete data.accounts[name];
  delete data.cooldowns[name];
  if (data.active === name) data.active = Object.keys(data.accounts)[0] || 'default';
  saveAccounts(data);
}

/* rotation */

export function rotationOn() {
  return loadAccounts().rotation;
}

export function setRotation(on) {
  const data = loadAccounts();
  data.rotation = Boolean(on);
  saveAccounts(data);
  return data.rotation;
}

export function setAccountEnabled(name, on) {
  const data = loadAccounts();
  if (!data.accounts[name]) throw new Error(`account "${name}" does not exist`);
  data.accounts[name].enabled = Boolean(on);
  if (!on) delete data.cooldowns[name];
  saveAccounts(data);
}

const COOLDOWNS = [
  [/(billing|daily count|quota|exceeded|limit reached|insufficient|\b403\b)/i, 30 * 60 * 1000],
  [/(unauthori[sz]ed|401|not logged in|invalid token|expired)/i, 10 * 60 * 1000],
  [/(rate.?limit|429|too many)/i, 60 * 1000],
  [/(timeout|stall|ECONNRESET|ECONNREFUSED|ENOTFOUND|socket)/i, 30 * 1000],
];

export function cooldownFor(message) {
  const text = String(message || '');
  for (const [re, ms] of COOLDOWNS) if (re.test(text)) return ms;
  return Number(process.env.BRIDGE_COOLDOWN_MS || 0) || 0;
}

export function isRotatable(message) {
  return cooldownFor(message) > 0;
}

export function markCooldown(name, message) {
  const ms = cooldownFor(message);
  if (!ms) return 0;
  const data = loadAccounts();
  if (!data.accounts[name]) return 0;
  const until = Date.now() + ms;
  data.cooldowns[name] = { until, reason: String(message || '').slice(0, 240) };
  saveAccounts(data);
  return ms;
}

export function clearCooldown(name) {
  const data = loadAccounts();
  if (!data.cooldowns[name]) return;
  delete data.cooldowns[name];
  saveAccounts(data);
}

export function coolingFor(name) {
  const until = loadAccounts().cooldowns[name]?.until || 0;
  return until > Date.now() ? until : 0;
}

/**
 * Ordered list of accounts this request may use: the active one first, then the
 * rest in file order. Cooling accounts are pushed to the end unless nothing else
 * is left, so a dead quota never blocks a working profile.
 */
export function candidateAccounts() {
  const data = loadAccounts();
  const now = Date.now();
  const usable = [];
  const cooling = [];

  if (!data.rotation) {
    const item = data.accounts[data.active];
    if (item && item.enabled !== false) {
      return [{ name: data.active, dir: item.dir || '', label: item.label || data.active }];
    }
  }

  for (const [name, item] of Object.entries(data.accounts)) {
    if (item.enabled === false) continue;
    const entry = { name, dir: item.dir || '', label: item.label || name };
    const until = data.cooldowns[name]?.until || 0;
    if (until > now) cooling.push({ ...entry, coolingUntil: until });
    else usable.push(entry);
  }

  usable.sort((a, b) => (a.name === data.active ? -1 : b.name === data.active ? 1 : 0));
  if (!data.rotation) return usable.slice(0, 1);
  return [...usable, ...cooling];
}

export function rotationSnapshot() {
  const data = loadAccounts();
  const now = Date.now();
  return {
    on: data.rotation,
    active: data.active,
    accounts: Object.entries(data.accounts).map(([name, item]) => {
      const cd = data.cooldowns[name];
      const coolingUntil = cd && cd.until > now ? cd.until : 0;
      return {
        name,
        label: item.label || name,
        dir: item.dir || '',
        enabled: item.enabled !== false,
        active: name === data.active,
        coolingUntil,
        coolingLeft: coolingUntil ? Math.ceil((coolingUntil - now) / 1000) : 0,
        reason: coolingUntil ? cd.reason : '',
      };
    }),
  };
}
