import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const PROVIDER_ID = 'qoder-claude';

export function paths({ env = process.env, home = os.homedir() } = {}) {
  const xdg = env.XDG_CONFIG_HOME || path.join(home, '.config');
  return {
    claude: path.join(home, '.claude', 'settings.json'),
    opencode: path.join(xdg, 'opencode', 'opencode.json'),
    openbotExe: env.LOCALAPPDATA ? path.join(env.LOCALAPPDATA, 'Programs', 'OpenBot', 'OpenBot.exe') : '',
    openbotData: env.APPDATA ? path.join(env.APPDATA, 'OpenBot') : '',
  };
}

export function detect(opts = {}) {
  const p = paths(opts);
  const exists = (file) => Boolean(file) && fs.existsSync(file);
  return {
    claude: { installed: exists(p.claude), path: p.claude },
    opencode: { installed: exists(p.opencode), path: p.opencode },
    openbot: { installed: exists(p.openbotExe), path: p.openbotExe, data: p.openbotData },
  };
}

export function opencodeProvider({ baseURL = 'http://127.0.0.1:8787/v1', apiKey = 'dummy', models = ['Auto'] } = {}) {
  const list = models.length ? models : ['Auto'];
  const map = {};
  for (const model of list) map[model] = { name: model };
  return {
    npm: '@ai-sdk/openai-compatible',
    name: 'qoder-claude',
    options: { baseURL, apiKey },
    models: map,
  };
}

export function applyOpenCode({ file = null, models = [], baseURL, apiKey, setDefault = false } = {}) {
  const target = file || paths().opencode;
  let data;
  try {
    data = JSON.parse(fs.readFileSync(target, 'utf8'));
  } catch (e) {
    return { ok: false, error: `cannot read ${target}: ${e.message}`, path: target };
  }
  const provider = opencodeProvider({ baseURL: baseURL || 'http://127.0.0.1:8787/v1', apiKey, models });
  data.provider = data.provider && typeof data.provider === 'object' ? data.provider : {};
  const before = JSON.stringify(data.provider[PROVIDER_ID] || null);
  data.provider[PROVIDER_ID] = provider;
  const defaultChanged = setDefault && !data.model;
  if (defaultChanged) data.model = `${PROVIDER_ID}/Auto`;
  const changed = before !== JSON.stringify(provider) || defaultChanged;
  if (!changed) {
    return { ok: true, changed: false, path: target, models: Object.keys(provider.models) };
  }
  try {
    fs.copyFileSync(target, `${target}.bak-qclaude-${new Date().toISOString().replace(/[:.]/g, '-')}`);
    const tmp = `${target}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n');
    fs.renameSync(tmp, target);
  } catch (e) {
    return { ok: false, error: `write failed: ${e.message}`, path: target };
  }
  return { ok: true, changed, path: target, models: Object.keys(provider.models) };
}
