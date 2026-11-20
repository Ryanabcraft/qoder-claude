import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PORT = 8901;
const home = fs.mkdtempSync(path.join(os.tmpdir(), 'qclaude-audit-validate-'));

let child;

async function ready() {
  for (let i = 0; i < 60; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/health`);
      if (res.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('server did not start');
}

test.before(async () => {
  child = spawn(process.execPath, ['src/server.js'], {
    cwd: ROOT,
    env: {
      ...process.env,
      BRIDGE_PORT: String(PORT),
      QODER_BRIDGE_HOME: home,
      BRIDGE_LOG: '0',
      QODER_AUTH_FAKE: '1',
      QODER_MODEL_LIST_ENDPOINT: `http://127.0.0.1:${PORT}/nowhere`,
      QODER_QUOTA_ENDPOINT: `http://127.0.0.1:${PORT}/nowhere`,
    },
    stdio: 'ignore',
  });
  await ready();
});

test.after(() => {
  child?.kill();
});

test('an empty body is rejected before it costs an upstream call', async () => {
  const chat = await fetch(`http://127.0.0.1:${PORT}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}',
  });
  assert.equal(chat.status, 400);
  const chatJson = await chat.json();
  assert.equal(chatJson.error.type, 'invalid_request_error');

  const responses = await fetch(`http://127.0.0.1:${PORT}/v1/responses`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}',
  });
  assert.equal(responses.status, 400);

  const messages = await fetch(`http://127.0.0.1:${PORT}/v1/messages`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}',
  });
  assert.equal(messages.status, 400);
  const messagesJson = await messages.json();
  assert.equal(messagesJson.type, 'error');
});

test('an empty messages array is rejected too', async () => {
  const chat = await fetch(`http://127.0.0.1:${PORT}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ messages: [] }),
  });
  assert.equal(chat.status, 400);
});
