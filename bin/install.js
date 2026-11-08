#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const BASE = process.env.QODER_INSTALL_BASE || 'https://raw.githubusercontent.com/Ryanabcraft/qoder-claude/main';
const WIN = process.platform === 'win32';
const FILE = WIN ? 'install.ps1' : 'install.sh';

const FLAGS = {
  '--project-only': '-ProjectOnly',
  '--skip-deps': '-SkipDeps',
  '--skip-vision': '-SkipVision',
  '--skip-claude': '-SkipClaude',
  '--skip-login': '-SkipLogin',
  '--no-start': '-NoStart',
  '--dir': '-InstallDir',
};

function args() {
  const input = process.argv.slice(2);
  if (!WIN) return input;
  return input.map((arg) => FLAGS[arg] || arg);
}

async function main() {
  const argv0 = process.argv.slice(2);
  if (argv0.includes('--version') || argv0.includes('-v')) {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const pkg = JSON.parse(fs.readFileSync(path.join(here, '..', 'package.json'), 'utf8'));
    console.log(pkg.version);
    return;
  }
  if (argv0.includes('--help') || argv0.includes('-h')) {
    console.log('usage: npx -y github:Ryanabcraft/qoder-claude [installer flags]');
    console.log('  detects Windows, macOS or Linux and runs the right installer');
    console.log('  flags: --project-only, --skip-vision, --skip-claude, --skip-login, --dir <path>');
    return;
  }

  console.log(`qoder-claude installer — ${process.platform} ${process.arch}`);
  {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'qoder-install-'));
    const target = path.join(tmp, FILE);
    try {
      const res = await fetch(`${BASE}/${FILE}`);
      if (!res.ok) throw new Error(`download failed (${res.status})`);
      fs.writeFileSync(target, Buffer.from(await res.arrayBuffer()));
    } catch (e) {
      console.error(`qoder-claude: could not download the installer (${e.message})`);
      console.error('qoder-claude: check the connection and try again.');
      process.exit(1);
    }

    const argv = WIN
      ? ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', target, ...args()]
      : [target, ...args()];
    const cmd = WIN ? 'powershell.exe' : 'bash';
    const result = spawnSync(cmd, argv, { stdio: 'inherit' });
    fs.rmSync(tmp, { recursive: true, force: true });
    if (result.error) {
      console.error(`qoder-claude: could not start ${cmd} (${result.error.message})`);
      process.exit(1);
    }
    process.exit(result.status ?? 1);
  }
}

main();
