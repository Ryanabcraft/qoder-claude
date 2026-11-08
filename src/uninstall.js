import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { QODER_MODELS } from './models.js';

const LOCAL_URL = /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/?$/i;
const CAP_KEYS = [
  'ANTHROPIC_DEFAULT_OPUS_MODEL_SUPPORTED_CAPABILITIES',
  'ANTHROPIC_DEFAULT_SONNET_MODEL_SUPPORTED_CAPABILITIES',
  'ANTHROPIC_DEFAULT_HAIKU_MODEL_SUPPORTED_CAPABILITIES',
];
const MODEL_KEYS = [
  'ANTHROPIC_DEFAULT_OPUS_MODEL',
  'ANTHROPIC_DEFAULT_SONNET_MODEL',
  'ANTHROPIC_DEFAULT_HAIKU_MODEL',
];
const INSTALLER_ENV = {
  CLAUDE_CODE_AUTO_MODE_SERVER: '0',
  CLAUDE_CODE_MAX_CONTEXT_TOKENS: '1000000',
  CLAUDE_CODE_DISABLE_1M_CONTEXT: '0',
  DISABLE_COMPACT: '0',
};

export function stripBridgeSettings(settings, { env = process.env } = {}) {
  const out = settings && typeof settings === 'object' ? JSON.parse(JSON.stringify(settings)) : {};
  const removed = [];
  const vars = out.env;
  if (vars && typeof vars === 'object') {
    const base = vars.ANTHROPIC_BASE_URL;
    if (typeof base === 'string' && LOCAL_URL.test(base.trim())) {
      delete vars.ANTHROPIC_BASE_URL;
      removed.push('env.ANTHROPIC_BASE_URL');
    }
    const token = vars.ANTHROPIC_AUTH_TOKEN;
    if (typeof token === 'string' && (token === 'dummy' || (env.BRIDGE_API_KEY && token === env.BRIDGE_API_KEY))) {
      delete vars.ANTHROPIC_AUTH_TOKEN;
      removed.push('env.ANTHROPIC_AUTH_TOKEN');
    }
    for (const key of MODEL_KEYS) {
      if (!(key in vars) || !QODER_MODELS.includes(vars[key])) continue;
      delete vars[key];
      removed.push(`env.${key}`);
    }
    for (const key of CAP_KEYS) {
      if (!(key in vars)) continue;
      delete vars[key];
      removed.push(`env.${key}`);
    }
    for (const [key, value] of Object.entries(INSTALLER_ENV)) {
      if (vars[key] !== value) continue;
      delete vars[key];
      removed.push(`env.${key}`);
    }
    if (!Object.keys(vars).length) delete out.env;
  }

  const picker = out.modelPicker;
  const ours = picker && Array.isArray(picker.options) && picker.options.length > 0
    && picker.options.every((o) => /^Qoder · /.test(String(o?.label || '')) || QODER_MODELS.includes(o?.model));
  if (ours) {
    delete out.modelPicker;
    removed.push('modelPicker');
    if (QODER_MODELS.includes(out.model)) {
      delete out.model;
      removed.push('model');
    }
  }

  const status = out.statusLine;
  if (status && typeof status.command === 'string' && /qoder-(claude|bridge).*statusline\.js/i.test(status.command)) {
    delete out.statusLine;
    removed.push('statusLine');
  }

  return { settings: out, removed };
}

export function isOurInstall(dir) {
  try {
    if (!dir || !fs.existsSync(dir)) return false;
    if (fs.existsSync(path.join(dir, '.git'))) return false;
    const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
    return pkg?.name === 'qoder-claude' || pkg?.name === 'qoder-bridge';
  } catch {
    return false;
  }
}

export function installRoots({ root, platform = process.platform, home = os.homedir(), localAppData = process.env.LOCALAPPDATA, includeDefaults = true } = {}) {
  const win = platform === 'win32';
  const candidates = [root];
  if (includeDefaults) {
    candidates.push(
      win ? path.join(localAppData || '', 'qoder-claude') : path.join(home, '.local', 'share', 'qoder-claude'),
      win ? path.join(localAppData || '', 'qoder-bridge') : path.join(home, '.local', 'share', 'qoder-bridge'),
    );
  }
  const seen = new Set();
  const roots = [];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const key = path.resolve(candidate).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    if (isOurInstall(candidate)) roots.push(path.resolve(candidate));
  }
  return roots;
}

export function filterPathEntries(entries, binDirs) {
  const strip = (value) => String(value || '').replace(/[\\/]+$/, '').toLowerCase();
  const drop = new Set(binDirs.map(strip).filter(Boolean));
  return entries.filter((entry) => !drop.has(strip(entry)));
}

export function backupAccounts(root, dest) {
  const accounts = path.join(root, 'accounts');
  const file = path.join(root, 'accounts.json');
  if (!fs.existsSync(accounts) && !fs.existsSync(file)) return null;
  fs.mkdirSync(dest, { recursive: true });
  if (fs.existsSync(accounts)) fs.cpSync(accounts, path.join(dest, 'accounts'), { recursive: true });
  if (fs.existsSync(file)) fs.copyFileSync(file, path.join(dest, 'accounts.json'));
  return dest;
}
