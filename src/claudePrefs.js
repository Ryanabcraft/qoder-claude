import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { WEB_TOOLS, ensureWebTools, settingsPath } from './claudeSettings.js';
import { ensureExa, hasExa } from './exaSetup.js';
import { cachedModels } from './models.js';

export function claudeSettingsPath(home = os.homedir()) {
  return settingsPath(home);
}

function readRaw(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function readClaudePrefs(home = os.homedir()) {
  const file = claudeSettingsPath(home);
  let data = {};
  try {
    data = readRaw(file);
  } catch {
    data = {};
  }
  const env = data.env && typeof data.env === 'object' ? data.env : {};
  const allow = Array.isArray(data.permissions?.allow) ? data.permissions.allow : [];
  return {
    path: file,
    exists: fs.existsSync(file),
    model: typeof data.model === 'string' ? data.model : '',
    models: cachedModels(),
    oneMillion: env.CLAUDE_CODE_MAX_CONTEXT_TOKENS === '1000000',
    autoMode: env.CLAUDE_CODE_AUTO_MODE_SERVER !== '0',
    allowWebTools: WEB_TOOLS.every((tool) => allow.includes(tool)),
    exa: hasExa(),
    statusLine: /qoder-(claude|bridge).*statusline\.js/i.test(String(data.statusLine?.command || '')),
  };
}

export function updateClaudePrefs(patch = {}, home = os.homedir()) {
  const file = claudeSettingsPath(home);
  let data;
  try {
    data = readRaw(file);
  } catch {
    return { ok: false, error: 'settings.json is missing or invalid' };
  }

  if (patch.model !== undefined) {
    const model = String(patch.model || '').trim();
    if (model && !/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(model)) {
      return { ok: false, error: 'invalid model id' };
    }
    if (model) data.model = model;
    else delete data.model;
  }

  if (patch.oneMillion !== undefined) {
    data.env = data.env && typeof data.env === 'object' ? data.env : {};
    if (patch.oneMillion) {
      data.env.CLAUDE_CODE_MAX_CONTEXT_TOKENS = '1000000';
      data.env.CLAUDE_CODE_DISABLE_1M_CONTEXT = '0';
    } else {
      delete data.env.CLAUDE_CODE_MAX_CONTEXT_TOKENS;
      delete data.env.CLAUDE_CODE_DISABLE_1M_CONTEXT;
    }
  }

  try {
    if (fs.existsSync(file)) {
      fs.copyFileSync(file, `${file}.bak-dashboard-${new Date().toISOString().replace(/[:.]/g, '-')}`);
    }
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n');
    fs.renameSync(tmp, file);
  } catch (e) {
    return { ok: false, error: `settings write failed: ${e.message}` };
  }
  return { ok: true, prefs: readClaudePrefs(home) };
}

export function applyWebTools() {
  const exa = ensureExa();
  let allow = false;
  try {
    allow = ensureWebTools();
  } catch (e) {
    return { ok: false, error: e.message };
  }
  return { ok: true, exa, allowUpdated: allow, prefs: readClaudePrefs() };
}
