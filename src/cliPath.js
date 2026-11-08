import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_CLI_VERSION = '1.1.84';

export function cliVersion(cli = resolveCli()) {
  if (process.env.QODER_CLI_VERSION) return process.env.QODER_CLI_VERSION;
  const entry = cli.prefix[0];
  if (!entry) return DEFAULT_CLI_VERSION;
  let dir = path.dirname(entry);
  for (let i = 0; i < 4; i++) {
    const pkg = path.join(dir, 'package.json');
    if (fs.existsSync(pkg)) {
      try {
        const version = String(JSON.parse(fs.readFileSync(pkg, 'utf8')).version || '');
        if (/^\d+\.\d+\.\d+/.test(version)) return version;
      } catch {}
      break;
    }
    dir = path.dirname(dir);
  }
  return DEFAULT_CLI_VERSION;
}

export function resolveCli() {
  const explicit = process.env.QODER_CLI_BIN;
  if (explicit) {
    if (/\.(js|mjs|cjs)$/i.test(explicit)) return { cmd: process.execPath, prefix: [explicit] };
    return { cmd: explicit, prefix: [] };
  }
  const candidates = [
    path.join(process.env.APPDATA || '', 'npm', 'node_modules', '@qoder-ai', 'qodercli', 'bundle', 'qodercli.js'),
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Qoder', 'resources', 'app.asar.unpacked', 'node_modules', '@qoder-ai', 'qodercli', 'bundle', 'qodercli.js'),
  ];
  for (const c of candidates) if (c && fs.existsSync(c)) return { cmd: process.execPath, prefix: [c] };
  return { cmd: 'qodercli', prefix: [] };
}
