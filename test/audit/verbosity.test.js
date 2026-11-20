import test from 'node:test';
import assert from 'node:assert/strict';
import { upstreamPayload, BRIEF_NOTICE } from '../../src/openaiUpstream.js';

const body = { model: 'DeepSeek-Flash', messages: [{ role: 'user', content: 'faca algo' }] };

test('brief rides on the action notice and lands as a system rule', () => {
  delete process.env.QODER_VERBOSITY;
  const payload = upstreamPayload(body, { act: true });
  assert.ok(payload.messages.some((m) => m.role === 'system' && m.content.includes('at most three short sentences')));
  assert.ok(payload.messages.some((m) => m.content.includes(BRIEF_NOTICE)));
});

test('QODER_VERBOSITY=normal leaves the prompt alone', () => {
  process.env.QODER_VERBOSITY = 'normal';
  const payload = upstreamPayload(body, { act: true });
  assert.equal(payload.messages.some((m) => m.content.includes(BRIEF_NOTICE)), false);
  delete process.env.QODER_VERBOSITY;
});
