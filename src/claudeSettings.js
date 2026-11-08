import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

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
  let current = {};
  try {
    current = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    current = {};
  }
  const { settings, changed } = withWebTools(current);
  if (!changed) return false;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(settings, null, 2) + '\n');
  return true;
}
