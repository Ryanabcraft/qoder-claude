import test from 'node:test';
import assert from 'node:assert/strict';
import { bodyFor, median, percentile, readEvent } from '../scripts/bench.mjs';

test('readEvent pulls text and reasoning from the chat API', () => {
  assert.deepEqual(
    readEvent('chat', 'data: {"choices":[{"delta":{"content":"oi"}}]}'),
    { text: 'oi', kind: 'text' },
  );
  assert.deepEqual(
    readEvent('chat', 'data: {"choices":[{"delta":{"reasoning_content":"pensa"}}]}'),
    { text: 'pensa', kind: 'reasoning' },
  );
  assert.deepEqual(
    readEvent('chat', 'data: [DONE]'),
    null,
  );
});

test('readEvent reports usage and nothing else for an empty delta', () => {
  const usage = readEvent('chat', 'data: {"choices":[],"usage":{"prompt_tokens":10,"completion_tokens":7}}');
  assert.deepEqual(usage, { usage: { output: 7, input: 10 } });
  assert.equal(readEvent('chat', 'data: {"choices":[{"delta":{}}]}'), null);
});

test('readEvent understands the messages API events', () => {
  assert.deepEqual(
    readEvent('messages', 'event: content_block_delta\ndata: {"delta":{"type":"text_delta","text":"ok"}}'),
    { text: 'ok', kind: 'text' },
  );
  assert.deepEqual(
    readEvent('messages', 'event: content_block_delta\ndata: {"delta":{"type":"thinking_delta","thinking":"hmm"}}'),
    { text: 'hmm', kind: 'reasoning' },
  );
  assert.deepEqual(
    readEvent('messages', 'event: message_delta\ndata: {"usage":{"input_tokens":5,"output_tokens":9}}'),
    { usage: { output: 9, input: 5 } },
  );
  assert.deepEqual(readEvent('messages', 'event: message_stop\ndata: {}'), { done: true });
});

test('bodyFor keeps the API shape and forwards effort only when asked', () => {
  const chat = bodyFor('chat', 'DeepSeek-Flash', 300, 'oi', '');
  assert.equal(chat.stream, true);
  assert.equal(chat.stream_options.include_usage, true);
  assert.equal(chat.reasoning_effort, undefined);

  const messages = bodyFor('messages', 'Auto', 128, 'oi', 'low');
  assert.equal(messages.reasoning_effort, 'low');
  assert.equal(messages.stream_options, undefined);
  assert.equal(messages.max_tokens, 128);
});

test('median and percentile handle the sample sizes the bench produces', () => {
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([4, 1, 3, 2]), 2.5);
  assert.equal(median([]), 0);
  assert.equal(percentile([5, 1, 3, 2, 4], 50), 3);
  assert.equal(percentile([5, 1, 3, 2, 4], 95), 5);
  assert.equal(percentile([], 95), 0);
});
