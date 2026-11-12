import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ensureWebTools, withWebTools } from '../src/claudeSettings.js';

function sandbox(contents) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qc-claude-settings-'));
  const file = path.join(dir, 'settings.json');
  if (contents !== undefined) fs.writeFileSync(file, contents);
  return { dir, file };
}

test('a corrupt settings file is never overwritten', () => {
  const raw = '{"env": {"A": "1"},}';
  const { file } = sandbox(raw);
  const result = ensureWebTools(file);
  assert.equal(result.ok, false);
  assert.match(result.error, /not valid JSON/);
  assert.equal(fs.readFileSync(file, 'utf8'), raw, 'the file stays byte for byte');
});

test('valid settings gain the web tools and keep everything else', () => {
  const { file } = sandbox(JSON.stringify({ model: 'Auto', env: { A: '1' }, permissions: { allow: ['Read'] } }, null, 2));
  const result = ensureWebTools(file);
  assert.equal(result.ok, true);
  assert.equal(result.changed, true);
  const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.equal(saved.model, 'Auto');
  assert.deepEqual(saved.env, { A: '1' });
  assert.ok(saved.permissions.allow.includes('Read'));
  assert.ok(saved.permissions.allow.includes('WebSearch'));
  assert.equal(fs.existsSync(`${file}.tmp`), false);
});

test('a second pass changes nothing', () => {
  const { file } = sandbox('{}');
  assert.equal(ensureWebTools(file).changed, true);
  assert.equal(ensureWebTools(file).changed, false);
});

test('a missing file is created', () => {
  const { file } = sandbox();
  const result = ensureWebTools(file);
  assert.equal(result.ok, true);
  assert.ok(fs.existsSync(file));
});

test('withWebTools is pure', () => {
  const input = { permissions: { allow: ['Read'] } };
  const { settings, changed } = withWebTools(input);
  assert.equal(changed, true);
  assert.deepEqual(input.permissions.allow, ['Read'], 'the input is untouched');
  assert.ok(settings.permissions.allow.includes('WebSearch'));
});
