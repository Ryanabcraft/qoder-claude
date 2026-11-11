import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';

process.env.QODER_CONFIG_DIR = path.join(os.tmpdir(), `qc-models-no-config-${process.pid}`);
process.env.QODER_BRIDGE_HOME = path.join(os.tmpdir(), `qc-models-home-${process.pid}`);
process.env.BRIDGE_MODELS_REFRESH = '0';

const { cachedModels, parseModels, QODER_MODELS } = await import('../src/models.js');

test('parseModels drops headers, junk and duplicates', () => {
  const out = [
    'MODEL',
    'Auto',
    'Ultimate',
    'Skipped invalid MCP server',
    'Error: not logged in',
    'Auto',
    'not a model!',
    '',
    'DeepSeek-Flash',
  ].join('\n');
  assert.deepEqual(parseModels(out), ['Auto', 'Ultimate', 'DeepSeek-Flash']);
});

test('cachedModels returns the built-in list before any refresh', () => {
  assert.deepEqual(cachedModels(), QODER_MODELS);
});

test('the built-in list is data, not code, and carries a review date', async () => {
  const fs = await import('node:fs');
  const raw = JSON.parse(fs.readFileSync(new URL('../src/models.json', import.meta.url), 'utf8'));
  assert.ok(Array.isArray(raw.models) && raw.models.length > 0);
  assert.match(raw.updated, /^\d{4}-\d{2}-\d{2}$/);
  assert.deepEqual(raw.models, QODER_MODELS);
});
