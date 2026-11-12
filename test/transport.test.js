import test from 'node:test';
import assert from 'node:assert/strict';
import { startFakeUpstream } from './fixtures/fakeUpstream.js';

const fake = await startFakeUpstream();
process.env.QODER_AUTH_FAKE = '1';
process.env.QODER_INFER_ENDPOINT = `http://127.0.0.1:${fake.port}`;
process.env.BRIDGE_STALL_MS = '5000';

const direct = await import('../src/direct.js');
const openai = await import('../src/openaiUpstream.js');

test.after(() => fake.server.close());

const body = (extra = {}) => ({
  model: 'Auto',
  max_tokens: 16,
  messages: [{ role: 'user', content: 'run' }],
  tools: [{ name: 'Bash', description: 'run', input_schema: { type: 'object', properties: { command: { type: 'string' } } } }],
  ...extra,
});

test('the direct transport returns native tool calls', async () => {
  const events = [];
  const out = await direct.directCompletion({ body: body(), cfg: { model: 'Auto', contextWindow: 0 }, onEvent: (e) => events.push(e) });
  assert.equal(out.error, null);
  assert.ok(out.text.includes('<tool_calls>'), 'the textual fallback still carries the call');
  assert.ok(events.some((e) => e.delta?.type === 'text_delta'));
});

test('a 402 surfaces as an error, not an empty answer', async () => {
  const out = await direct.directCompletion({ body: body({ system: 'scenario:quota' }), cfg: { model: 'Auto', contextWindow: 0 } });
  assert.match(String(out.error), /upstream 402/);
});

test('a cut stream surfaces as an error', async () => {
  const out = await direct.directCompletion({ body: body({ system: 'scenario:cut' }), cfg: { model: 'Auto', contextWindow: 0 } });
  assert.ok(out.error, 'the failure is reported');
});

test('the OpenAI transport emits Anthropic-shaped tool events', async () => {
  const events = [];
  const out = await openai.streamChat({ body: body(), onEvent: (e) => events.push(e) });
  assert.equal(out.error, null);
  assert.ok(events.some((e) => e.type === 'content_block_start' && e.content_block?.type === 'tool_use'));
  assert.ok(events.some((e) => e.type === 'content_block_delta' && e.delta?.type === 'input_json_delta'));
  assert.equal(out.stopReason, 'tool_use');
});

test('the OpenAI transport reports a 402 too', async () => {
  const out = await openai.streamChat({ body: body({ messages: [{ role: 'system', content: 'scenario:quota' }, { role: 'user', content: 'hi' }] }) });
  assert.match(String(out.error), /upstream 402/);
});

test('the upstream reasoning survives as a thinking event', async () => {
  const events = [];
  const out = await openai.streamChat({
    body: body({ messages: [{ role: 'system', content: 'scenario:think' }, { role: 'user', content: 'hi' }] }),
    onEvent: (e) => events.push(e),
  });
  assert.equal(out.error, null);
  assert.ok(events.some((e) => e.delta?.type === 'thinking_delta'));
  assert.ok(events.some((e) => e.delta?.type === 'text_delta'));
});
