import { spawnSync } from 'node:child_process';
import { resolveCli } from './cliPath.js';

export const QODER_MODELS = [
  'Auto', 'Ultimate', 'Fast', 'Efficient', 'Sonus', 'Cantus',
  'Qwen3.8-Max', 'Qwen3.8-Flash', 'Kimi-K3.1-Pro', 'Kimi-K2.8-Preview',
  'GLM-5.3', 'GLM-5.3-Flash', 'DeepSeek-V4-Pro', 'DeepSeek-Flash', 'MiniMax-M3.1-Flash',
];

const TTL_MS = Number(process.env.QODER_MODELS_TTL_MS || 10 * 60 * 1000);
let cache = null;
let cacheAt = 0;

function parseModels(out) {
  const list = [];
  for (const raw of String(out).split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (/^(MODEL|Skipped invalid MCP|Error|Usage:)/i.test(line)) continue;
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(line)) continue;
    if (!list.includes(line)) list.push(line);
  }
  return list;
}

export function detectModels({ force = false } = {}) {
  if (!force && cache && Date.now() - cacheAt < TTL_MS) return cache;
  const cli = resolveCli();
  let found = [];
  try {
    const r = spawnSync(cli.cmd, [...cli.prefix, '--list-models'], {
      encoding: 'utf8',
      windowsHide: true,
      timeout: 60000,
      env: process.env,
    });
    found = parseModels(r.stdout || '');
  } catch {}
  cache = found.length ? found : QODER_MODELS;
  cacheAt = Date.now();
  return cache;
}
