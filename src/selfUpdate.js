import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const RAW = 'https://raw.githubusercontent.com/Ryanabcraft/qoder-claude/main/package.json';
const TARBALL = 'https://codeload.github.com/Ryanabcraft/qoder-claude/tar.gz/refs/heads/main';
const KEEP = new Set(['accounts', 'accounts.json', 'tools', 'bridge.log', 'bridge.pid', '.git', '.update-skip']);

export function localVersion(root) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

function parts(version) {
  return String(version)
    .split('.')
    .map((n) => Number.parseInt(n, 10) || 0);
}

export function isNewer(remote, local) {
  const a = parts(remote);
  const b = parts(local);
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const x = a[i] || 0;
    const y = b[i] || 0;
    if (x !== y) return x > y;
  }
  return false;
}

export async function checkUpdate(root, timeout = 4000) {
  const local = localVersion(root);
  try {
    const res = await fetch(RAW, { signal: AbortSignal.timeout(timeout), cache: 'no-store' });
    if (!res.ok) return { local, remote: local, hasUpdate: false };
    const remote = JSON.parse(await res.text()).version || local;
    return { local, remote, hasUpdate: isNewer(remote, local) };
  } catch {
    return { local, remote: local, hasUpdate: false };
  }
}

export function skippedVersion(root) {
  try {
    return fs.readFileSync(path.join(root, '.update-skip'), 'utf8').trim();
  } catch {
    return '';
  }
}

export function skipVersion(root, version) {
  try {
    fs.writeFileSync(path.join(root, '.update-skip'), `${version}\n`);
  } catch {}
}

export async function applyUpdate(root) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'qclaude-update-'));
  try {
    const file = path.join(tmp, 'source.tgz');
    const res = await fetch(TARBALL, { signal: AbortSignal.timeout(120000) });
    if (!res.ok) throw new Error(`download failed (${res.status})`);
    fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));

    const untar = spawnSync('tar', ['-xzf', path.basename(file), '-C', '.'], { cwd: tmp, encoding: 'utf8' });
    if (untar.status !== 0) throw new Error((untar.stderr || 'extract failed').trim());

    const source = fs
      .readdirSync(tmp)
      .map((name) => path.join(tmp, name))
      .find((entry) => {
        try {
          return fs.statSync(entry).isDirectory();
        } catch {
          return false;
        }
      });
    if (!source) throw new Error('archive is empty');

    for (const name of fs.readdirSync(source)) {
      if (KEEP.has(name)) continue;
      fs.cpSync(path.join(source, name), path.join(root, name), { recursive: true, force: true });
    }
    return true;
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}
