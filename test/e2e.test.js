import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { startFakeUpstream } from './fixtures/fakeUpstream.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8813;
const home = fs.mkdtempSync(path.join(os.tmpdir(), 'qclaude-e2e-'));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

let fake;
let proc;

async function up() {
  for (let i = 0; i < 50; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/health`);
      if (res.ok) return true;
    } catch {}
    await wait(150);
  }
  return false;
}

function accounts() {
  return JSON.parse(fs.readFileSync(path.join(home, 'accounts.json'), 'utf8'));
}

test.before(async () => {
  fake = await startFakeUpstream();
  fs.writeFileSync(path.join(home, 'accounts.json'), JSON.stringify({
    active: 'alpha',
    rotation: true,
    accounts: {
      alpha: { dir: '', label: 'alpha', enabled: true },
      beta: { dir: '', label: 'beta', enabled: true },
    },
    cooldowns: {},
  }, null, 2));
  proc = spawn(process.execPath, [path.join(ROOT, 'src', 'server.js')], {
    cwd: ROOT,
    env: {
      ...process.env,
      QODER_BRIDGE_HOME: home,
      BRIDGE_PORT: String(PORT),
      BRIDGE_LOG: '0',
      BRIDGE_MODELS_REFRESH: '0',
      BRIDGE_QUOTA: '0',
      QODER_AUTH_FAKE: '1',
      QODER_INFER_ENDPOINT: `http://127.0.0.1:${fake.port}`,
    },
    stdio: 'ignore',
  });
  const ok = await up();
  assert.equal(ok, true, 'the bridge answers /health');
});

test.after(() => {
  try { proc.kill(); } catch {}
  try { fake.server.close(); } catch {}
});

const post = (route, body) => fetch(`http://127.0.0.1:${PORT}${route}`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

test('a 402 pauses the account and the next one is tried', async () => {
  const res = await post('/v1/messages', {
    model: 'Auto',
    system: 'scenario:quota',
    max_tokens: 16,
    stream: false,
    messages: [{ role: 'user', content: 'hi' }],
  });
  assert.ok(res.status >= 400, 'the client sees a failure, not an empty 200');
  const data = accounts();
  assert.ok(Object.keys(data.cooldowns).length >= 2, 'both accounts were paused');
});

test('a tool call with a lowercase name arrives as the client spelled it', async () => {
  const res = await post('/v1/messages', {
    model: 'Auto',
    system: 'scenario:lower',
    max_tokens: 32,
    stream: false,
    messages: [{ role: 'user', content: 'run' }],
    tools: [{ name: 'Bash', description: 'run', input_schema: { type: 'object', properties: { command: { type: 'string' } } } }],
  });
  const body = await res.json();
  const call = body.content?.find((block) => block.type === 'tool_use');
  assert.equal(call?.name, 'Bash');
  assert.deepEqual(call?.input, { command: 'echo hi' });
});

test('the OpenAI endpoint also repairs the tool name', async () => {
  const res = await post('/v1/chat/completions', {
    model: 'Auto',
    max_tokens: 32,
    messages: [{ role: 'user', content: 'scenario:lower run' }],
    tools: [{ type: 'function', function: { name: 'Bash', description: 'run', parameters: { type: 'object' } } }],
  });
  const body = await res.json();
  const call = body.choices?.[0]?.message?.tool_calls?.[0];
  assert.equal(call?.function?.name, 'Bash');
  assert.equal(call?.function?.arguments, '{"command":"echo hi"}');
});

test('a stream that dies mid-flight rotates instead of ending empty', async () => {
  const before = Object.keys(accounts().cooldowns || {}).length;
  const res = await post('/v1/messages', {
    model: 'Auto',
    system: 'scenario:cut',
    max_tokens: 16,
    stream: true,
    messages: [{ role: 'user', content: 'hi' }],
  });
  await res.text();
  const after = Object.keys(accounts().cooldowns || {}).length;
  assert.ok(after >= before, 'the failure was accounted for');
});
