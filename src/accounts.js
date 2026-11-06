import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT =
  process.env.QODER_BRIDGE_HOME || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const ACCOUNTS_ROOT = path.join(ROOT, 'accounts');
const FILE = path.join(ROOT, 'accounts.json');

const FALLBACK = {
  active: 'default',
  accounts: {
    default: { dir: null, label: 'Default (global config)' },
  },
};

export function loadAccounts() {
  try {
    const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    if (data && data.accounts && data.active) return data;
  } catch {
    /* first run */
  }
  return JSON.parse(JSON.stringify(FALLBACK));
}

export function saveAccounts(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2) + '\n');
}

export function activeAccount() {
  const data = loadAccounts();
  const entry = data.accounts[data.active] || FALLBACK.accounts.default;
  return { name: data.active, dir: entry.dir || '', label: entry.label || data.active };
}

export function useAccount(name) {
  const data = loadAccounts();
  if (!data.accounts[name]) throw new Error(`conta "${name}" nao existe`);
  data.active = name;
  saveAccounts(data);
}

export function addAccount(name, dir) {
  const data = loadAccounts();
  data.accounts[name] = { dir, label: name };
  data.active = name;
  saveAccounts(data);
}

export function removeAccount(name) {
  if (name === 'default') throw new Error('a conta default nao pode ser removida');
  const data = loadAccounts();
  delete data.accounts[name];
  if (data.active === name) data.active = 'default';
  saveAccounts(data);
}
