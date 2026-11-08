import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ensureExa, hasExa, EXA_URL } from '../src/exaSetup.js';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qclaude-exa-'));
const write = (name, data) => {
  const file = path.join(dir, name);
  fs.writeFileSync(file, data);
  return file;
};

test.after(() => fs.rmSync(dir, { recursive: true, force: true }));

test('hasExa finds an existing server', () => {
  const file = write('present.json', JSON.stringify({ mcpServers: { exa: { type: 'http', url: EXA_URL } } }));
  assert.equal(hasExa(file), true);
});

test('hasExa tolerates a missing or malformed file', () => {
  assert.equal(hasExa(path.join(dir, 'missing.json')), false);
  const file = write('broken.json', '{not json');
  assert.equal(hasExa(file), false);
});

test('ensureExa skips when exa is already configured', () => {
  const file = write('already.json', JSON.stringify({ mcpServers: { exa: { url: EXA_URL } } }));
  const result = ensureExa({
    configPath: file,
    env: {},
    run: () => { throw new Error('must not spawn'); },
  });
  assert.deepEqual(result, { ok: true, skipped: 'already' });
});

test('ensureExa adds exa in the user scope', () => {
  const file = write('clean.json', JSON.stringify({ mcpServers: { pencil: {} } }));
  let call = null;
  const result = ensureExa({
    configPath: file,
    env: {},
    bin: 'claude',
    run: (cmd, args, opts) => { call = { cmd, args, opts }; return { status: 0 }; },
  });
  assert.deepEqual(result, { ok: true, added: true });
  assert.equal(call.cmd, 'claude');
  assert.deepEqual(call.args, ['mcp', 'add', '--transport', 'http', 'exa', EXA_URL, '-s', 'user']);
  assert.equal(call.opts.windowsHide, true);
});

test('CLAUDE_BIN is used when no explicit bin is passed', () => {
  const file = write('envbin.json', JSON.stringify({ mcpServers: {} }));
  let cmd = null;
  ensureExa({
    configPath: file,
    env: { CLAUDE_BIN: '/opt/claude' },
    run: (name) => { cmd = name; return { status: 0 }; },
  });
  assert.equal(cmd, '/opt/claude');
});

test('QODER_NO_EXA disables the setup', () => {
  const file = write('disabled.json', JSON.stringify({ mcpServers: {} }));
  const result = ensureExa({ configPath: file, env: { QODER_NO_EXA: '1' }, run: () => { throw new Error('must not spawn'); } });
  assert.deepEqual(result, { ok: true, skipped: 'disabled' });
});

test('a failed claude call is reported, not thrown', () => {
  const file = write('failed.json', JSON.stringify({ mcpServers: {} }));
  const result = ensureExa({
    configPath: file,
    env: {},
    run: () => ({ status: 1, stderr: 'boom', stdout: '' }),
  });
  assert.equal(result.ok, false);
  assert.match(result.error, /boom/);
});
