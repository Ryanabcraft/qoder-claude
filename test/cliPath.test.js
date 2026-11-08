import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { cliVersion } from '../src/cliPath.js';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qclaude-cli-'));

test.after(() => fs.rmSync(dir, { recursive: true, force: true }));

test('the CLI version is read from the installed bundle', () => {
  const pkgDir = path.join(dir, 'node_modules', '@qoder-ai', 'qodercli');
  fs.mkdirSync(path.join(pkgDir, 'bundle'), { recursive: true });
  fs.writeFileSync(path.join(pkgDir, 'package.json'), JSON.stringify({ version: '9.9.9' }));
  const cli = { cmd: 'node', prefix: [path.join(pkgDir, 'bundle', 'qodercli.js')] };
  assert.equal(cliVersion(cli), '9.9.9');
});

test('QODER_CLI_VERSION overrides the detected version', () => {
  const previous = process.env.QODER_CLI_VERSION;
  process.env.QODER_CLI_VERSION = '7.7.7';
  try {
    assert.equal(cliVersion({ cmd: 'qodercli', prefix: [] }), '7.7.7');
  } finally {
    if (previous === undefined) delete process.env.QODER_CLI_VERSION;
    else process.env.QODER_CLI_VERSION = previous;
  }
});

test('a bare CLI falls back to the default version', () => {
  const previous = process.env.QODER_CLI_VERSION;
  delete process.env.QODER_CLI_VERSION;
  try {
    assert.equal(cliVersion({ cmd: 'qodercli', prefix: [] }), '1.1.84');
  } finally {
    if (previous !== undefined) process.env.QODER_CLI_VERSION = previous;
  }
});
