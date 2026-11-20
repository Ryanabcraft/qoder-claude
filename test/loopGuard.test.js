import test from 'node:test';
import assert from 'node:assert/strict';
import {loopWarning, repeatedCall, repeatedTarget } from '../src/loopGuard.js';

const call = (name, args, id = 'c1') => ({
  role: 'assistant',
  content: '',
  tool_calls: [{ id, type: 'function', function: { name, arguments: args } }],
});
const result = (id = 'c1') => ({ role: 'tool', tool_call_id: id, content: 'No changes to apply' });

test('the same call three times is detected', () => {
  const hit = repeatedCall([call('Edit', '{"a":1}'), result(), call('Edit', '{"a":1}'), result(), call('Edit', '{"a":1}')]);
  assert.deepEqual(hit, { name: 'Edit', arguments: '{"a":1}', count: 3 });
});

test('two identical calls are not enough by default', () => {
  assert.equal(repeatedCall([call('Edit', '{"a":1}'), result(), call('Edit', '{"a":1}')]), null);
});

test('a changed argument resets the count', () => {
  const hit = repeatedCall([
    call('Edit', '{"a":1}'), result(),
    call('Edit', '{"a":1}'), result(),
    call('Edit', '{"a":2}'),
  ]);
  assert.equal(hit, null);
});

test('Anthropic tool_use blocks are understood, and key order does not matter', () => {
  const assistant = (input) => ({ role: 'assistant', content: [{ type: 'tool_use', name: 'Edit', input }] });
  const hit = repeatedCall([
    assistant({ a: 1, b: 2 }),
    assistant({ b: 2, a: 1 }),
    assistant({ a: 1, b: 2 }),
  ]);
  assert.equal(hit.count, 3);
});

test('a history without tool calls yields nothing', () => {
  assert.equal(repeatedCall([{ role: 'user', content: 'hi' }]), null);
});

test('the warning names the tool and the count', () => {
  const text = loopWarning({ name: 'Edit', arguments: '{}', count: 3 });
  assert.match(text, /Edit/);
  assert.match(text, /3 times/);
});

test('reading the same file with different offsets counts as repetition', () => {
  const messages = [1, 2, 3, 4].map((n) => ({
    role: 'assistant',
    tool_calls: [{ function: { name: 'Read', arguments: JSON.stringify({ file_path: 'a.html', offset: n * 200 }) } }],
  }));
  messages.push({ role: 'user', content: 'continue' });
  const hit = repeatedTarget(messages);
  assert.ok(hit, 'expected a hit');
  assert.equal(hit.name, 'Read');
  assert.equal(hit.target, 'a.html');
  assert.equal(hit.count, 4);
});

test('three reads, or the same offset once per file, stay silent', () => {
  const three = [1, 2, 3].map((n) => ({
    role: 'assistant',
    tool_calls: [{ function: { name: 'Read', arguments: JSON.stringify({ file_path: 'a.html', offset: n }) } }],
  }));
  assert.equal(repeatedTarget(three), null);
  const mixed = [
    { role: 'assistant', tool_calls: [{ function: { name: 'Read', arguments: JSON.stringify({ file_path: 'a.html' }) } }] },
    { role: 'assistant', tool_calls: [{ function: { name: 'Read', arguments: JSON.stringify({ file_path: 'b.html' }) } }] },
    { role: 'assistant', tool_calls: [{ function: { name: 'Read', arguments: JSON.stringify({ file_path: 'c.html' }) } }] },
    { role: 'assistant', tool_calls: [{ function: { name: 'Read', arguments: JSON.stringify({ file_path: 'd.html' }) } }] },
  ];
  assert.equal(repeatedTarget(mixed), null);
});
