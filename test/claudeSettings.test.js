import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ensureWebTools, WEB_TOOLS, withWebTools } from '../src/claudeSettings.js';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qclaude-settings-'));

test.after(() => fs.rmSync(dir, { recursive: true, force: true }));

test('web tools are merged into permissions.allow', () => {
  const { settings, changed } = withWebTools({ permissions: { allow: ['mcp__pencil'] } });
  assert.equal(changed, true);
  assert.deepEqual(settings.permissions.allow, ['mcp__pencil', ...WEB_TOOLS]);
});

test('merging twice changes nothing', () => {
  const first = withWebTools({ permissions: { allow: [] } });
  const second = withWebTools(first.settings);
  assert.equal(second.changed, false);
  assert.deepEqual(second.settings, first.settings);
});

test('a settings object without permissions gets one', () => {
  const { settings } = withWebTools({ model: 'Auto' });
  assert.equal(settings.model, 'Auto');
  assert.deepEqual(settings.permissions.allow, WEB_TOOLS);
});

test('ensureWebTools writes once and then reports no change', () => {
  const file = path.join(dir, 'settings.json');
  fs.writeFileSync(file, JSON.stringify({ permissions: { allow: ['WebSearch'] } }));
  assert.equal(ensureWebTools(file), true);
  const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const tool of WEB_TOOLS) assert.ok(saved.permissions.allow.includes(tool));
  assert.equal(saved.permissions.allow.filter((t) => t === 'WebSearch').length, 1);
  assert.equal(ensureWebTools(file), false);
});

test('ensureWebTools creates a missing file', () => {
  const file = path.join(dir, 'new', 'settings.json');
  assert.equal(ensureWebTools(file), true);
  const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.deepEqual(saved.permissions.allow, WEB_TOOLS);
});
