import test from 'node:test';
import assert from 'node:assert/strict';
import { messageHash, prefixMatches, sessionKeyFor } from '../src/sessions.js';

const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

test('hash changes when an image is added', () => {
  const text = messageHash({ role: 'user', content: 'hello' });
  const withImage = messageHash({
    role: 'user',
    content: [{ type: 'text', text: 'hello' }, { type: 'image', source: { type: 'base64', media_type: 'image/png', data: PNG } }],
  });
  assert.notEqual(text, withImage);
});

test('prefixMatches rejects a rewritten history', () => {
  assert.equal(prefixMatches(['a', 'b'], ['a', 'b', 'c']), true);
  assert.equal(prefixMatches(['a', 'b'], ['a', 'x']), false);
  assert.equal(prefixMatches(['a', 'b', 'c'], ['a']), false);
});

test('session key comes from metadata.user_id', () => {
  const key = sessionKeyFor({ metadata: { user_id: JSON.stringify({ session_id: 'abc' }) } });
  assert.equal(key, 'sid:abc');
});
