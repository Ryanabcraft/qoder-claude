import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { checkUpdate, isNewer, versionFromApiPayload } from '../src/selfUpdate.js';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qclaude-update-'));
fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ version: '1.0.0' }));

test.after(() => fs.rmSync(dir, { recursive: true, force: true }));

const apiPayload = (version) => ({
  encoding: 'base64',
  content: Buffer.from(JSON.stringify({ version }), 'utf8').toString('base64'),
});

test('compares versions numerically', () => {
  assert.equal(isNewer('1.10.0', '1.9.9'), true);
  assert.equal(isNewer('1.9.0', '1.9.0'), false);
  assert.equal(isNewer('2.0.0', '1.99.99'), true);
});

test('the API payload yields its version', () => {
  assert.equal(versionFromApiPayload(apiPayload('9.9.9')), '9.9.9');
  assert.equal(versionFromApiPayload({ encoding: 'utf8', content: '{}' }), null);
  assert.equal(versionFromApiPayload(null), null);
});

test('checkUpdate prefers the GitHub API', async () => {
  const calls = [];
  const fake = async (url) => {
    calls.push(url);
    return { ok: true, json: async () => apiPayload('9.9.9'), text: async () => '' };
  };
  const result = await checkUpdate(dir, 1000, fake);
  assert.equal(result.remote, '9.9.9');
  assert.equal(result.hasUpdate, true);
  assert.match(calls[0], /api\.github\.com/);
});

test('checkUpdate falls back to the raw file', async () => {
  const calls = [];
  const fake = async (url) => {
    calls.push(url);
    if (url.includes('api.github.com')) return { ok: false, json: async () => ({}), text: async () => '' };
    return { ok: true, json: async () => ({}), text: async () => JSON.stringify({ version: '8.8.8' }) };
  };
  const result = await checkUpdate(dir, 1000, fake);
  assert.equal(result.remote, '8.8.8');
  assert.match(calls[1], /raw\.githubusercontent\.com/);
});

test('a failed check keeps the local version', async () => {
  const fake = async () => {
    throw new Error('offline');
  };
  const result = await checkUpdate(dir, 1000, fake);
  assert.deepEqual(result, { local: '1.0.0', remote: '1.0.0', hasUpdate: false });
});
