import test from 'node:test';
import assert from 'node:assert/strict';
import { aliasToolName, resolveToolName, toolAliases } from '../../src/toolNames.js';
import { checkToolCall, repairJson, validateInput } from '../../src/toolValidate.js';

const SCHEMA = {
  type: 'object',
  required: ['path'],
  properties: { path: { type: 'string' }, mode: { type: 'string', enum: ['r', 'w'] } },
  additionalProperties: false,
};

test('broken json is repaired before it becomes an empty input', () => {
  assert.deepEqual(repairJson('```json\n{"a":1,}\n```'), { a: 1 });
  assert.deepEqual(repairJson('{a:1}'), { a: 1 });
  assert.equal(repairJson('not json at all'), null);
  assert.equal(repairJson(''), null);
});

test('validation names the exact problem', () => {
  assert.equal(validateInput(SCHEMA, { path: 'x', mode: 'r' }), null);
  assert.match(validateInput(SCHEMA, {}), /missing required property: path/);
  assert.match(validateInput(SCHEMA, { path: 3 }), /path must be string/);
  assert.match(validateInput(SCHEMA, { path: 'x', mode: 'z' }), /mode must be one of/);
  assert.match(validateInput(SCHEMA, { path: 'x', extra: 1 }), /unexpected property: extra/);
  assert.equal(validateInput(null, {}), null);
});

test('a schema is found for either tool shape', () => {
  const openai = [{ type: 'function', function: { name: 'Read', parameters: SCHEMA } }];
  const anthropic = [{ name: 'Read', input_schema: SCHEMA }];
  assert.equal(checkToolCall(openai, 'Read', {}), 'missing required property: path');
  assert.equal(checkToolCall(anthropic, 'Read', {}), 'missing required property: path');
  assert.equal(checkToolCall(openai, 'Unknown', {}), null);
});

test('non-portable names get a reversible alias', () => {
  const alias = aliasToolName('openbot.send_message');
  assert.match(alias, /^[A-Za-z0-9_-]{1,64}$/);
  assert.equal(alias, aliasToolName('openbot.send_message'), 'deterministic');
  assert.equal(aliasToolName('mcp__exa__web_search_exa'), 'mcp__exa__web_search_exa');

  const codec = toolAliases([{ name: 'openbot.send_message' }, { name: 'Read' }]);
  assert.equal(codec.size, 1);
  assert.equal(codec.decode(codec.encode('openbot.send_message')), 'openbot.send_message');
  assert.equal(codec.encode('Read'), 'Read');
});

test('a one-letter typo resolves to the real tool, a stranger does not', () => {
  assert.equal(resolveToolName('reed', ['Read', 'Write']), 'Read');
  assert.equal(resolveToolName('Edti', ['Read', 'Edit']), 'Edit');
  assert.equal(resolveToolName('quantum-browser', ['Read', 'Write']), 'quantum-browser');
});
