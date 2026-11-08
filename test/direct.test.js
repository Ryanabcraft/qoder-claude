import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPayload } from '../src/direct.js';

const toolSearch = { name: 'ToolSearch', description: '', input_schema: { type: 'object', properties: {} } };

test('the direct payload carries deferred web tool schemas', () => {
  const body = {
    system: 'Deferred tools: WebSearch, WebFetch, mcp__exa__web_search_exa, mcp__exa__web_fetch_exa',
    tools: [toolSearch],
    messages: [{ role: 'user', content: 'pesquise na internet' }],
  };
  const payload = buildPayload(body, 'auto', 1000000, {});
  const names = payload.tools.map((t) => t.function.name);
  assert.deepEqual(names, [
    'ToolSearch',
    'WebSearch',
    'WebFetch',
    'mcp__exa__web_search_exa',
    'mcp__exa__web_fetch_exa',
  ]);
  const exa = payload.tools.find((t) => t.function.name === 'mcp__exa__web_search_exa');
  assert.deepEqual(exa.function.parameters.required, ['query']);
});

test('tools without deferred names are forwarded unchanged', () => {
  const body = {
    system: 'You are a coding assistant.',
    tools: [toolSearch],
    messages: [{ role: 'user', content: 'hello' }],
  };
  const payload = buildPayload(body, 'auto', 1000000, {});
  assert.deepEqual(payload.tools.map((t) => t.function.name), ['ToolSearch']);
});
