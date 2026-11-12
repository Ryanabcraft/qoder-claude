import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createOpenAiAdapter, openAiUsage, toAnthropicRequest } from '../src/openai.js';

function fakeRes() {
  const emitter = new EventEmitter();
  const res = {
    status: 0,
    headers: {},
    chunks: [],
    body: '',
    writableEnded: false,
    writeHead(status, headers) {
      res.status = status;
      Object.assign(res.headers, headers || {});
    },
    write(payload) {
      res.chunks.push(String(payload));
      res.body += String(payload);
      return true;
    },
    end(payload) {
      if (payload) res.body += String(payload);
      res.writableEnded = true;
      emitter.emit('finish');
    },
    once: (event, fn) => emitter.once(event, fn),
    on: (event, fn) => emitter.on(event, fn),
  };
  return res;
}

const sse = (event, data) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

test('an OpenAI request becomes an Anthropic request', () => {
  const out = toAnthropicRequest({
    model: 'Auto',
    messages: [
      { role: 'system', content: 'be terse' },
      { role: 'user', content: 'hello' },
      { role: 'assistant', content: null, tool_calls: [{ id: 'call_1', type: 'function', function: { name: 'Read', arguments: '{"path":"a.txt"}' } }] },
      { role: 'tool', tool_call_id: 'call_1', content: 'file body' },
    ],
    tools: [{ type: 'function', function: { name: 'Read', description: 'read', parameters: { type: 'object', properties: { path: { type: 'string' } } } } }],
    max_tokens: 128,
  });
  assert.equal(out.system, 'be terse');
  assert.equal(out.messages[0].role, 'user');
  assert.equal(out.messages[1].content[0].type, 'tool_use');
  assert.deepEqual(out.messages[1].content[0].input, { path: 'a.txt' });
  assert.equal(out.messages[2].content[0].type, 'tool_result');
  assert.equal(out.messages[2].content[0].tool_use_id, 'call_1');
  assert.equal(out.tools[0].name, 'Read');
  assert.equal(out.tools[0].input_schema.type, 'object');
  assert.equal(out.max_tokens, 128);
});

test('usage maps to the OpenAI field names', () => {
  assert.deepEqual(openAiUsage({ input_tokens: 10, output_tokens: 4 }), { prompt_tokens: 10, completion_tokens: 4, total_tokens: 14 });
});

test('the adapter streams text as OpenAI chunks', () => {
  const real = fakeRes();
  const proxy = createOpenAiAdapter({ res: real, model: 'Auto', stream: true });

  proxy.write(sse('message_start', { type: 'message_start', message: { usage: { input_tokens: 7, output_tokens: 0 } } }));
  proxy.write(sse('content_block_start', { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } }));
  proxy.write(sse('content_block_delta', { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'hi ' } }));
  proxy.write(sse('content_block_delta', { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'there' } }));
  proxy.write(sse('message_delta', { type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 3 } }));
  proxy.write(sse('message_stop', { type: 'message_stop' }));
  proxy.end();

  assert.equal(real.status, 200);
  assert.match(real.headers['content-type'], /text\/event-stream/);
  const chunks = real.body.split('\n\n').filter((c) => c.startsWith('data: ')).map((c) => c.slice(6));
  assert.equal(chunks[chunks.length - 1], '[DONE]');
  const parsed = chunks.slice(0, -1).map((c) => JSON.parse(c));
  assert.equal(parsed[0].choices[0].delta.role, 'assistant');
  const text = parsed.map((c) => c.choices?.[0]?.delta?.content || '').join('');
  assert.equal(text, 'hi there');
  const last = parsed.filter((c) => c.choices && c.choices[0]).pop();
  assert.equal(last.choices[0].finish_reason, 'stop');
});

test('tool calls come out as OpenAI tool_calls', () => {
  const real = fakeRes();
  const proxy = createOpenAiAdapter({ res: real, model: 'Auto', stream: true });

  proxy.write(sse('content_block_start', { type: 'content_block_start', index: 1, content_block: { type: 'tool_use', id: 'toolu_1', name: 'Bash', input: {} } }));
  proxy.write(sse('content_block_delta', { type: 'content_block_delta', index: 1, delta: { type: 'input_json_delta', partial_json: '{"command":' } }));
  proxy.write(sse('content_block_delta', { type: 'content_block_delta', index: 1, delta: { type: 'input_json_delta', partial_json: '"ls"}' } }));
  proxy.write(sse('message_delta', { type: 'message_delta', delta: { stop_reason: 'tool_use' } }));
  proxy.end();

  const parsed = real.body.split('\n\n').filter((c) => c.startsWith('data: ') && !c.includes('[DONE]')).map((c) => JSON.parse(c.slice(6)));
  const call = parsed.find((c) => c.choices?.[0]?.delta?.tool_calls);
  assert.equal(call.choices[0].delta.tool_calls[0].function.name, 'Bash');
  const args = parsed.map((c) => c.choices?.[0]?.delta?.tool_calls?.[0]?.function?.arguments || '').join('');
  assert.equal(args, '{"command":"ls"}');
  const last = parsed.filter((c) => c.choices && c.choices[0]).pop();
  assert.equal(last.choices[0].finish_reason, 'tool_calls');
});

test('a non-streaming call answers with one JSON body', () => {
  const real = fakeRes();
  const proxy = createOpenAiAdapter({ res: real, model: 'Auto', stream: false });

  proxy.write(sse('content_block_delta', { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'done' } }));
  proxy.write(sse('message_delta', { type: 'message_delta', delta: { stop_reason: 'end_turn' } }));
  proxy.end();

  const body = JSON.parse(real.body);
  assert.equal(body.object, 'chat.completion');
  assert.equal(body.choices[0].message.content, 'done');
  assert.equal(body.choices[0].finish_reason, 'stop');
});

test('the upstream payload keeps the client system prompt verbatim', async () => {
  const { upstreamPayload } = await import('../src/openaiUpstream.js');
  const payload = upstreamPayload({
    model: 'Auto',
    messages: [
      { role: 'system', content: 'You are OpenBot. Do not mention Claude.' },
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: null, tool_calls: [{ id: 'c1', type: 'function', function: { name: 'Read', arguments: '{"p":1}' } }] },
      { role: 'tool', tool_call_id: 'c1', content: 'ok' },
    ],
    tools: [{ type: 'function', function: { name: 'Read', description: 'r', parameters: { type: 'object' } } }],
    max_tokens: 64,
  });
  assert.equal(payload.messages[0].role, 'system');
  assert.equal(payload.messages[0].content, 'You are OpenBot. Do not mention Claude.');
  assert.equal(payload.messages[2].tool_calls[0].function.name, 'Read');
  assert.equal(payload.messages[3].role, 'tool');
  assert.equal(payload.tools[0].function.name, 'Read');
  assert.equal(payload.max_tokens, 64);
  assert.equal(payload.agent_id, 'agent_common');
  assert.ok(!JSON.stringify(payload).includes('[CONVERSATION]'), 'no agent prompt is injected');
});

test('reasoning is forwarded as a reasoning_content chunk', () => {
  const real = fakeRes();
  const proxy = createOpenAiAdapter({ res: real, model: 'Auto', stream: true });
  proxy.write(sse('content_block_start', { type: 'content_block_start', index: 0, content_block: { type: 'thinking', thinking: '' } }));
  proxy.write(sse('content_block_delta', { type: 'content_block_delta', index: 0, delta: { type: 'thinking_delta', thinking: 'penso ' } }));
  proxy.write(sse('content_block_delta', { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'ok' } }));
  proxy.write(sse('message_delta', { type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { input_tokens: 12, output_tokens: 4 } }));
  proxy.end();

  const parsed = real.body.split('\n\n').filter((c) => c.startsWith('data: ') && !c.includes('[DONE]')).map((c) => JSON.parse(c.slice(6)));
  const reasoning = parsed.map((c) => c.choices?.[0]?.delta?.reasoning_content || '').join('');
  const text = parsed.map((c) => c.choices?.[0]?.delta?.content || '').join('');
  const usage = parsed.filter((c) => c.usage).pop();
  assert.equal(reasoning, 'penso ');
  assert.equal(text, 'ok');
  assert.equal(usage.usage.completion_tokens, 4);
});
