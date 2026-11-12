import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { applyOpenCode, detect, opencodeProvider } from '../src/integrations.js';

function sandbox(settings) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qc-integrations-'));
  const file = path.join(dir, 'opencode.json');
  if (settings !== undefined) fs.writeFileSync(file, JSON.stringify(settings, null, 2));
  return { dir, file };
}

test('the provider block is OpenAI-compatible', () => {
  const provider = opencodeProvider({ models: ['Auto', 'GLM-5.3'] });
  assert.equal(provider.npm, '@ai-sdk/openai-compatible');
  assert.equal(provider.options.baseURL, 'http://127.0.0.1:8787/v1');
  assert.deepEqual(Object.keys(provider.models), ['Auto', 'GLM-5.3']);
});

test('applying writes the provider and keeps the rest of the config', () => {
  const { file } = sandbox({ theme: 'dark', provider: { other: { npm: 'x' } } });
  const result = applyOpenCode({ file, models: ['Auto', 'Fast'] });
  assert.equal(result.ok, true);
  assert.equal(result.changed, true);

  const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.equal(saved.theme, 'dark');
  assert.ok(saved.provider.other);
  assert.equal(saved.provider['qoder-claude'].options.baseURL, 'http://127.0.0.1:8787/v1');
  assert.deepEqual(Object.keys(saved.provider['qoder-claude'].models), ['Auto', 'Fast']);
  assert.equal(saved.model, undefined, 'the default model is left alone');
});

test('a second apply is a no-op', () => {
  const { file } = sandbox({});
  applyOpenCode({ file, models: ['Auto'] });
  const again = applyOpenCode({ file, models: ['Auto'] });
  assert.equal(again.changed, false);
});

test('setDefault only fills an empty model field', () => {
  const { file } = sandbox({});
  applyOpenCode({ file, models: ['Auto'], setDefault: true });
  assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).model, 'qoder-claude/Auto');

  const second = sandbox({ model: 'anthropic/claude' });
  applyOpenCode({ file: second.file, models: ['Auto'], setDefault: true });
  assert.equal(JSON.parse(fs.readFileSync(second.file, 'utf8')).model, 'anthropic/claude');
});

test('a missing config is reported, not created', () => {
  const { file } = sandbox();
  const result = applyOpenCode({ file, models: ['Auto'] });
  assert.equal(result.ok, false);
  assert.match(result.error, /cannot read/);
  assert.equal(fs.existsSync(file), false);
});

test('detect reports what is installed', () => {
  const state = detect({ env: {}, home: os.tmpdir() });
  assert.equal(typeof state.claude.installed, 'boolean');
  assert.equal(typeof state.opencode.installed, 'boolean');
  assert.equal(typeof state.openbot.installed, 'boolean');
});

test('every model declares the 1M window and its capabilities', () => {
  const provider = opencodeProvider({ models: ['Auto', 'GLM-5.3'] });
  for (const model of ['Auto', 'GLM-5.3']) {
    const meta = provider.models[model];
    assert.equal(meta.limit.context, 1000000);
    assert.equal(meta.limit.output, 128000);
    assert.equal(meta.tool_call, true);
    assert.equal(meta.reasoning, true);
    assert.deepEqual(meta.modalities.input, ['text', 'image']);
  }
});
