import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pruneBackups } from './backups.js';

export const WEB_TOOLS = [
  'WebSearch',
  'WebFetch',
  'mcp__exa__web_search_exa',
  'mcp__exa__web_fetch_exa',
];

export function settingsPath(home = os.homedir()) {
  return path.join(home, '.claude', 'settings.json');
}

export function withWebTools(settings) {
  const current = settings && typeof settings === 'object' ? settings : {};
  const permissions = current.permissions && typeof current.permissions === 'object' ? current.permissions : {};
  const allow = Array.isArray(permissions.allow) ? [...permissions.allow] : [];
  let changed = false;
  for (const tool of WEB_TOOLS) {
    if (allow.includes(tool)) continue;
    allow.push(tool);
    changed = true;
  }
  return { settings: { ...current, permissions: { ...permissions, allow } }, changed };
}

export function ensureWebTools(file = settingsPath()) {
  const exists = fs.existsSync(file);
  let current = {};
  if (exists) {
    try {
      current = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      // An unreadable settings file is never replaced: {} would erase hooks,
      // env, model and plugins the user configured.
      return { ok: false, changed: false, error: `${file} is not valid JSON; left untouched` };
    }
  }
  const { settings, changed } = withWebTools(current);
  if (!changed) return { ok: true, changed: false };
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    if (exists) fs.copyFileSync(file, `${file}.bak-qclaude-${new Date().toISOString().replace(/[:.]/g, '-')}`);
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(settings, null, 2) + '\n');
    fs.renameSync(tmp, file);
    pruneBackups(file, '.bak-qclaude-');
  } catch (e) {
    return { ok: false, changed: false, error: e.message };
  }
  return { ok: true, changed: true };
}
