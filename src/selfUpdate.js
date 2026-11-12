import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const API = 'https://api.github.com/repos/Ryanabcraft/qoder-claude/contents/package.json?ref=main';
const RAW = 'https://raw.githubusercontent.com/Ryanabcraft/qoder-claude/main/package.json';
const TARBALL = 'https://codeload.github.com/Ryanabcraft/qoder-claude/tar.gz/refs/heads/main';
const KEEP = new Set(['accounts', 'accounts.json', 'tools', 'bridge.log', 'bridge.pid', 'bridge.config.json', 'metrics.jsonl', 'quota.jsonl', '.git', '.update-skip']);

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

export function versionFromApiPayload(payload) {
  if (!payload || payload.encoding !== 'base64' || typeof payload.content !== 'string') return null;
  try {
    const data = JSON.parse(Buffer.from(payload.content, 'base64').toString('utf8'));
    return typeof data.version === 'string' ? data.version : null;
  } catch {
    return null;
  }
}

async function remoteVersion(timeout, fetchImpl) {
  try {
    const res = await fetchImpl(API, {
      signal: AbortSignal.timeout(timeout),
      cache: 'no-store',
      headers: { accept: 'application/vnd.github+json' },
    });
    if (res.ok) {
      const version = versionFromApiPayload(await res.json());
      if (version) return version;
    }
  } catch {}

  try {
    const res = await fetchImpl(`${RAW}?t=${Date.now()}`, { signal: AbortSignal.timeout(timeout), cache: 'no-store' });
    if (!res.ok) return null;
    return JSON.parse(await res.text()).version || null;
  } catch {
    return null;
  }
}

export async function checkUpdate(root, timeout = 4000, fetchImpl = fetch) {
  const local = localVersion(root);
  const remote = (await remoteVersion(timeout, fetchImpl)) || local;
  return { local, remote, hasUpdate: isNewer(remote, local) };
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

    const names = fs.readdirSync(source).filter((name) => !KEEP.has(name));
    const previous = path.join(tmp, 'previous');
    fs.mkdirSync(previous, { recursive: true });
    for (const name of names) {
      const target = path.join(root, name);
      if (fs.existsSync(target)) fs.cpSync(target, path.join(previous, name), { recursive: true });
    }

    for (const name of names) {
      fs.cpSync(path.join(source, name), path.join(root, name), { recursive: true, force: true });
    }

    const expected = JSON.parse(fs.readFileSync(path.join(source, 'package.json'), 'utf8')).version;
    const installed = (() => {
      try { return JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version; } catch { return null; }
    })();
    const required = ['src/server.js', 'src/models.js', 'bin/qclaude.js'];
    const missing = required.filter((name) => {
      try { return fs.statSync(path.join(root, name)).size === 0; } catch { return true; }
    });
    if (installed !== expected || missing.length) {
      for (const name of names) {
        const saved = path.join(previous, name);
        if (fs.existsSync(saved)) fs.cpSync(saved, path.join(root, name), { recursive: true, force: true });
      }
      throw new Error(`update incomplete (version ${installed || '?'}, expected ${expected}${missing.length ? `, missing: ${missing.join(', ')}` : ''}); the previous files were restored`);
    }
    return true;
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}
