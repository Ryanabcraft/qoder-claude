import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export function resolveCli() {
  const explicit = process.env.QODER_CLI_BIN;
  if (explicit) {
    if (explicit.endsWith('.js')) return { cmd: process.execPath, prefix: [explicit] };
    return { cmd: explicit, prefix: [] };
  }
  const candidates = [
    path.join(process.env.APPDATA || '', 'npm', 'node_modules', '@qoder-ai', 'qodercli', 'bundle', 'qodercli.js'),
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Qoder', 'resources', 'app.asar.unpacked', 'node_modules', '@qoder-ai', 'qodercli', 'bundle', 'qodercli.js'),
  ];
  for (const c of candidates) if (c && fs.existsSync(c)) return { cmd: process.execPath, prefix: [c] };
  return { cmd: 'qodercli', prefix: [] };
}
