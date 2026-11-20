import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createResponsesAdapter } from '../../src/responses.js';
import { createOpenAiAdapter } from '../../src/openai.js';

function fakeRes() {
  const writes = [];
  const res = new EventEmitter();
  res.writeHead = () => {};
  res.write = (chunk) => { writes.push(String(chunk)); return true; };
  res.end = (chunk) => { if (chunk) writes.push(String(chunk)); res.ended = true; };
  res.writes = writes;
  return res;
}

function events(res, name) {
  const block = res.writes.join('');
  const out = [];
  for (const part of block.split('\n\n')) {
    if (!part.trim()) continue;
    let type = '';
    const data = [];
    for (const line of part.split('\n')) {
      if (line.startsWith('event:')) type = line.slice(6).trim();
      else if (line.startsWith('data:')) data.push(line.slice(5).trim());
    }
    if (!data.length) continue;
    const json = JSON.parse(data.join('\n'));
    if (!name || type === name) out.push({ type, json });
  }
  return out;
}

test('text after a tool call does not repeat the earlier text', () => {
  const res = fakeRes();
  const adapter = createResponsesAdapter({ res, model: 'DeepSeek-Flash', stream: true });
  adapter.event('content_block_start', { index: 0, content_block: { type: 'text', text: '' } });
  adapter.event('content_block_delta', { index: 0, delta: { type: 'text_delta', text: 'primeira' } });
  adapter.event('content_block_start', { index: 1, content_block: { type: 'tool_use', id: 'tu_1', name: 'Read', input: {} } });
  adapter.event('content_block_delta', { index: 1, delta: { type: 'input_json_delta', partial_json: '{"path":"a"}' } });
  adapter.event('content_block_stop', { index: 1 });
  adapter.event('content_block_delta', { index: 2, delta: { type: 'text_delta', text: 'segunda' } });
  adapter.end();

  const dones = events(res, 'response.output_text.done').map((e) => e.json.text);
  assert.deepEqual(dones, ['primeira', 'segunda']);
});

test('a tool call with no argument deltas still closes with {}', () => {
  const res = fakeRes();
  const adapter = createResponsesAdapter({ res, model: 'Auto', stream: true });
  adapter.event('content_block_start', { index: 0, content_block: { type: 'tool_use', id: 'tu_2', name: 'Glob', input: {} } });
  adapter.event('content_block_stop', { index: 0 });
  adapter.end();
  const done = events(res, 'response.function_call_arguments.done')[0];
  assert.equal(done.json.arguments, '{}');
});

test('non-stream chat with only a tool call uses null content', () => {
  const res = fakeRes();
  const adapter = createOpenAiAdapter({ res, model: 'Auto', stream: false });
  adapter.event('content_block_start', { index: 0, content_block: { type: 'tool_use', id: 'tu_3', name: 'Read', input: {} } });
  adapter.event('content_block_delta', { index: 0, delta: { type: 'input_json_delta', partial_json: '{"path":"x"}' } });
  adapter.event('message_delta', { delta: { stop_reason: 'tool_use' }, usage: { input_tokens: 4, output_tokens: 2 } });
  adapter.end();
  const body = JSON.parse(res.writes.filter((w) => w.trim().startsWith('{')).pop());
  assert.equal(body.choices[0].message.content, null);
  assert.equal(body.choices[0].message.tool_calls[0].function.name, 'Read');
  assert.equal(body.usage.prompt_tokens, 4);
});
