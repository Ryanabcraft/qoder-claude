import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8799;
const KEY = 'test-key';
const home = fs.mkdtempSync(path.join(os.tmpdir(), 'qclaude-server-'));
let proc;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

test.before(async () => {
  proc = spawn(process.execPath, [path.join(ROOT, 'src', 'server.js')], {
    cwd: ROOT,
    env: {
      ...process.env,
      QODER_BRIDGE_HOME: home,
      BRIDGE_PORT: String(PORT),
      BRIDGE_API_KEY: KEY,
      BRIDGE_LOG: '0',
      BRIDGE_MODELS_REFRESH: '0',
    },
    stdio: 'ignore',
  });
  for (let i = 0; i < 40; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/health`);
      if (res.ok) return;
    } catch {}
    await wait(250);
  }
  throw new Error('server did not start');
});

test.after(() => {
  try { proc?.kill(); } catch {}
  fs.rmSync(home, { recursive: true, force: true });
});

test('health answers without a key', async () => {
  const res = await fetch(`http://127.0.0.1:${PORT}/health`);
  assert.equal(res.status, 200);
  assert.equal((await res.json()).service, 'qoder-claude');
});

test('api routes require the key', async () => {
  const res = await fetch(`http://127.0.0.1:${PORT}/ui/api/status`);
  assert.equal(res.status, 401);
});

test('api routes accept the key', async () => {
  const res = await fetch(`http://127.0.0.1:${PORT}/ui/api/status`, { headers: { 'x-api-key': KEY } });
  assert.equal(res.status, 200);
});

test('config is returned without the API key', async () => {
  const res = await fetch(`http://127.0.0.1:${PORT}/ui/api/config`, { headers: { 'x-api-key': KEY } });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.apiKeySet, true);
  assert.equal('apiKey' in body, false);
  assert.ok(body.port > 0);
});

test('health reports process data', async () => {
  const res = await fetch(`http://127.0.0.1:${PORT}/ui/api/health`, { headers: { 'x-api-key': KEY } });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.ok(body.pid > 0);
  assert.ok(body.memory.rss > 0);
});

test('metrics expose the three ranges', async () => {
  const res = await fetch(`http://127.0.0.1:${PORT}/ui/api/metrics?range=7d`, { headers: { 'x-api-key': KEY } });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.range, '7d');
  assert.equal(body.series.length, 168);
});

test('config updates persist live values', async () => {
  const res = await fetch(`http://127.0.0.1:${PORT}/ui/api/config`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', 'x-api-key': KEY },
    body: JSON.stringify({ stallMs: 120000 }),
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.config.stallMs, 120000);
});

test('count_tokens answers without a backend', async () => {
  const res = await fetch(`http://127.0.0.1:${PORT}/v1/messages/count_tokens`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': KEY },
    body: JSON.stringify({ messages: [{ role: 'user', content: 'hello there' }] }),
  });
  assert.equal(res.status, 200);
  assert.ok((await res.json()).input_tokens > 0);
});
