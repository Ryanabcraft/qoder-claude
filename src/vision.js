import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { ROOT } from './accounts.js';

const VERSION = process.env.QODER_VISION_VERSION || '1.1.80';
const TOOLS_DIR = path.join(ROOT, 'tools');
const TARGET = path.join(TOOLS_DIR, `qodercli-${VERSION}.js`);
const EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp' };

export function visionCliPath() {
  const explicit = process.env.QODER_VISION_CLI;
  if (explicit && fs.existsSync(explicit)) return explicit;
  if (fs.existsSync(TARGET)) return TARGET;
  return null;
}

export function visionVersion() {
  return VERSION;
}

export function installVision(log = console.log) {
  fs.mkdirSync(TOOLS_DIR, { recursive: true });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'qoder-vision-'));
  try {
    const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const pack = spawnSync(npm, ['pack', `@qoder-ai/qodercli@${VERSION}`, '--pack-destination', tmp], {
      encoding: 'utf8',
      shell: process.platform === 'win32',
    });
    if (pack.status !== 0) throw new Error((pack.stderr || pack.stdout || 'npm pack failed').trim());
    const tgz = fs.readdirSync(tmp).find((f) => f.endsWith('.tgz'));
    if (!tgz) throw new Error('package archive not found');
    const untar = spawnSync('tar', ['-xzf', tgz, '-C', '.'], { cwd: tmp, encoding: 'utf8' });
    if (untar.status !== 0) throw new Error((untar.stderr || 'extract failed').trim());
    const bundle = path.join(tmp, 'package', 'bundle', 'qodercli.js');
    if (!fs.existsSync(bundle)) throw new Error('bundle not found in package');
    fs.copyFileSync(bundle, TARGET);
    log(`vision engine ready: ${TARGET}`);
    return TARGET;
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

function childEnv() {
  const env = { ...process.env };
  for (const key of [
    'QODER_SESSION_TYPE',
    'QODER_AGENT_SDK_DAEMON',
    'QODER_SDK_AUTH_PAYLOAD_FILE',
    'QODER_AGENT_SDK_ENTRYPOINT',
    'QODER_SEARCH_HOST_PID',
    'NODE_OPTIONS',
  ]) {
    delete env[key];
  }
  return env;
}

function writeImages(images, dir) {
  return images.map((image, i) => {
    const file = path.join(dir, `image-${i + 1}.${EXT[image.mediaType] || 'png'}`);
    fs.writeFileSync(file, Buffer.from(image.data, 'base64'));
    return file;
  });
}

// The 1.1.80 CLI is the last build that carries attachments: it reads the prompt
// from stdin and uploads each --attachment before the inference call.
export function runVision({ built, cfg, signal, log }) {
  const cli = visionCliPath();
  if (!cli || !built.images.length) return null;

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qoder-vision-run-'));
  let files;
  try {
    files = writeImages(built.images, dir);
  } catch (e) {
    fs.rmSync(dir, { recursive: true, force: true });
    return { text: '', usage: {}, error: `vision: ${e.message}` };
  }

  const args = ['-p', '--model', cfg.model];
  for (const file of files) args.push('--attachment', file);
  if (cfg.system) args.push('--system-prompt', cfg.system);
  if (cfg.configDir) args.push('--config-dir', cfg.configDir);
  args.push('--tools', '', '--setting-sources', '');

  return new Promise((resolve) => {
    let out = '';
    let err = '';
    let settled = false;
    const done = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fs.rmSync(dir, { recursive: true, force: true });
      resolve(result);
    };

    const proc = spawn(process.execPath, [cli, ...args], {
      env: childEnv(),
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const timer = setTimeout(() => {
      try { proc.kill(); } catch {}
      done({ text: out.trim(), usage: {}, error: err.trim() || 'vision timeout' });
    }, Number(process.env.BRIDGE_REQUEST_TIMEOUT_MS || 300000));
    timer.unref?.();

    proc.stdout.setEncoding('utf8');
    proc.stderr.setEncoding('utf8');
    proc.stdout.on('data', (d) => { out += d; });
    proc.stderr.on('data', (d) => { err = (err + d).slice(-2000); });
    proc.on('error', (e) => done({ text: '', usage: {}, error: e.message }));
    proc.on('close', (code) => {
      if (code === 0) done({ text: out.trim(), usage: {}, error: null });
      else done({ text: out.trim(), usage: {}, error: err.trim() || `vision cli exited ${code}` });
    });
    signal?.addEventListener('abort', () => {
      try { proc.kill(); } catch {}
    }, { once: true });
    proc.stdin.on('error', () => {});
    if (log) log(`  vision engine: ${files.length} image${files.length === 1 ? '' : 's'} via ${VERSION}`);
    proc.stdin.end(built.prompt);
  });
}
