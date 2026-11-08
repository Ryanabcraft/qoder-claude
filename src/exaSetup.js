import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

export const EXA_URL = 'https://mcp.exa.ai/mcp';

export function claudeConfigPath() {
  return path.join(os.homedir(), '.claude.json');
}

export function hasExa(configPath = claudeConfigPath()) {
  try {
    const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return Boolean(data && data.mcpServers && data.mcpServers.exa);
  } catch {
    return false;
  }
}

export function ensureExa({ bin, configPath = claudeConfigPath(), run = spawnSync, env = process.env } = {}) {
  if (env.QODER_NO_EXA === '1') return { ok: true, skipped: 'disabled' };
  if (hasExa(configPath)) return { ok: true, skipped: 'already' };

  const cmd = bin || env.CLAUDE_BIN || (process.platform === 'win32' ? 'claude.cmd' : 'claude');
  const args = ['mcp', 'add', '--transport', 'http', 'exa', EXA_URL, '-s', 'user'];
  const result = run(cmd, args, {
    encoding: 'utf8',
    windowsHide: true,
    shell: process.platform === 'win32' && /\.(cmd|bat)$/i.test(cmd),
    env,
  });
  if (result.error || result.status !== 0) {
    const reason = result.error?.message || String(result.stderr || result.stdout || '').trim() || `exit ${result.status}`;
    return { ok: false, error: reason };
  }
  return { ok: true, added: true };
}
