import test from 'node:test';
import assert from 'node:assert/strict';
import { loopWarning, repeatedCall } from '../src/loopGuard.js';

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
