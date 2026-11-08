import test from 'node:test';
import assert from 'node:assert/strict';
import { cachedModels, parseModels, QODER_MODELS } from '../src/models.js';

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

test('cachedModels returns the static list before any refresh', () => {
  assert.deepEqual(cachedModels(), QODER_MODELS);
});
