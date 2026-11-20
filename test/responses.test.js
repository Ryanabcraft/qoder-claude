import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createResponsesAdapter, toChatRequest } from '../src/responses.js';

function fakeRes() {
  const emitter = new EventEmitter();
  const res = {
    status: 0,
    body: '',
    writableEnded: false,
    writeHead(status) { res.status = status; },
    write(payload) { res.body += String(payload); return true; },
    end(payload) { if (payload) res.body += String(payload); res.writableEnded = true; emitter.emit('finish'); },
    once: (event, fn) => emitter.once(event, fn),
    on: (event, fn) => emitter.on(event, fn),
  };
  return res;
}
const sse = (event, data) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
const eventsOf = (body) => body.split('\n\n').filter((b) => b.startsWith('event: ')).map((b) => {
  const [eventLine, dataLine] = b.split('\n');
  return { event: eventLine.slice(7), data: JSON.parse(dataLine.slice(6)) };
});

test('a string input becomes a user message', () => {
  const chat = toChatRequest({ model: 'Auto', input: 'hello' });
  assert.deepEqual(chat.messages, [{ role: 'user', content: 'hello' }]);
  assert.equal(chat.stream, false);
});

test('instructions, items and tools are translated', () => {
  const chat = toChatRequest({
    model: 'Auto',
    instructions: 'be terse',
    input: [
      { role: 'user', content: [{ type: 'input_text', text: 'run it' }] },
      { type: 'function_call', call_id: 'c1', name: 'Bash', arguments: '{"command":"ls"}' },
      { type: 'function_call_output', call_id: 'c1', output: 'a.txt' },
    ],
    tools: [{ type: 'function', name: 'Bash', description: 'run', parameters: { type: 'object' } }],
  });
  assert.equal(chat.messages[0].role, 'system');
  assert.equal(chat.messages[1].content, 'run it');
  assert.equal(chat.messages[2].tool_calls[0].function.name, 'Bash');
  assert.equal(chat.messages[3].role, 'tool');
  assert.equal(chat.tools[0].function.name, 'Bash');
});

test('the stream emits the Responses sequence and completes', () => {
  const real = fakeRes();
  const proxy = createResponsesAdapter({ res: real, model: 'Auto', stream: true });
  proxy.event('content_block_start', { index: 0, content_block: { type: 'text', text: '' } });
  proxy.event('content_block_delta', { index: 0, delta: { type: 'text_delta', text: 'oi' } });
  proxy.event('message_delta', { delta: { stop_reason: 'end_turn' }, usage: { input_tokens: 10, output_tokens: 3 } });
  proxy.end();

  const events = eventsOf(real.body);
  const names = events.map((e) => e.event);
  assert.ok(names.includes('response.created'));
  assert.ok(names.includes('response.output_text.delta'));
  assert.ok(names.includes('response.output_text.done'));
  const last = events[events.length - 1];
  assert.equal(last.event, 'response.completed');
  assert.equal(last.data.response.output[0].content[0].text, 'oi');
  assert.equal(last.data.response.usage.output_tokens, 3);
});

test('a tool call becomes a function_call item', () => {
  const real = fakeRes();
  const proxy = createResponsesAdapter({ res: real, model: 'Auto', stream: true });
  proxy.event('content_block_start', { index: 1, content_block: { type: 'tool_use', id: 'toolu_1', name: 'Bash', input: {} } });
  proxy.event('content_block_delta', { index: 1, delta: { type: 'input_json_delta', partial_json: '{"command":"ls"}' } });
  proxy.event('content_block_stop', { index: 1 });
  proxy.end();

  const events = eventsOf(real.body);
  const added = events.find((e) => e.event === 'response.output_item.added');
  assert.equal(added.data.item.type, 'function_call');
  assert.equal(added.data.item.name, 'Bash');
  const done = events.find((e) => e.event === 'response.output_item.done');
  assert.equal(done.data.item.arguments, '{"command":"ls"}');
});

test('a non-streaming call returns one response object', () => {
  const real = fakeRes();
  const proxy = createResponsesAdapter({ res: real, model: 'Auto', stream: false });
  proxy.event('content_block_delta', { index: 0, delta: { type: 'text_delta', text: 'ok' } });
  proxy.event('message_delta', { delta: { stop_reason: 'end_turn' }, usage: { input_tokens: 1, output_tokens: 1 } });
  proxy.end();
  const body = JSON.parse(real.body);
  assert.equal(body.object, 'response');
  assert.equal(body.output[0].content[0].text, 'ok');
});

test('thinking arrives as a reasoning summary item', async () => {
  const { createResponsesAdapter } = await import('../src/responses.js');
  const writes = [];
  const res = { writeHead() {}, write: (c) => writes.push(String(c)), end() {} };
  const adapter = createResponsesAdapter({ res, model: 'auto', stream: true });
  adapter.event('content_block_delta', { delta: { type: 'thinking_delta', thinking: 'penso' } });
  adapter.event('content_block_delta', { delta: { type: 'text_delta', text: 'ok' } });
  adapter.end();
  const all = writes.join('');
  assert.match(all, /response\.reasoning_summary_text\.delta/);
  const done = JSON.parse(all.split('\n\n').find((b) => b.includes('response.completed')).replace(/^.*data: /s, ''));
  assert.ok(done.response.output.some((item) => item.type === 'reasoning' && item.summary[0].text === 'penso'));
});
