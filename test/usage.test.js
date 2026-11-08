import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeUsage, normalizeUsage } from '../src/usage.js';

test('normalizes Anthropic usage fields', () => {
  const usage = normalizeUsage({
    input_tokens: 12,
    output_tokens: 3,
    cache_read_input_tokens: 7,
    cache_creation_input_tokens: 2,
    credits: 0.5,
  });
  assert.equal(usage.input, 12);
  assert.equal(usage.output, 3);
  assert.equal(usage.cacheRead, 7);
  assert.equal(usage.cacheWrite, 2);
  assert.equal(usage.credits, 0.5);
  assert.equal(usage.source, 'upstream');
});

test('normalizes OpenAI-style Qoder usage fields', () => {
  const usage = normalizeUsage({
    prompt_tokens: 20,
    completion_tokens: 4,
    prompt_tokens_details: { cached_tokens: 9 },
    original_credits: 1.25,
    billable: true,
  });
  assert.equal(usage.input, 20);
  assert.equal(usage.output, 4);
  assert.equal(usage.cacheRead, 9);
  assert.equal(usage.credits, 1.25);
});

test('mergeUsage falls back per field', () => {
  const real = mergeUsage({ prompt_tokens: '8', completion_tokens: 2 }, 100, 50);
  assert.equal(real.anthropic.input_tokens, 8);
  assert.equal(real.anthropic.output_tokens, 2);
  assert.equal(real.anthropic.qoder_usage_source, 'upstream');
  assert.equal(real.metrics.source, 'upstream');

  const empty = mergeUsage({}, 100, 50);
  assert.equal(empty.anthropic.input_tokens, 100);
  assert.equal(empty.anthropic.output_tokens, 50);
  assert.equal(empty.anthropic.qoder_usage_source, 'estimated');
  assert.equal(empty.metrics.source, 'estimated');

  const partial = mergeUsage({ output_tokens: 5 }, 100, 50);
  assert.equal(partial.anthropic.input_tokens, 100);
  assert.equal(partial.anthropic.output_tokens, 5);
  assert.equal(partial.anthropic.qoder_usage_source, 'mixed');
});

test('mergeUsage keeps zero credits and cache fields', () => {
  const usage = mergeUsage({ input_tokens: 1, output_tokens: 1, credits: 0, cache_read_input_tokens: 0 }, 9, 9);
  assert.equal(usage.anthropic.credits, 0);
  assert.equal(usage.anthropic.cache_read_input_tokens, 0);
  assert.equal(usage.metrics.credits, 0);
});

test('unexpected values are ignored', () => {
  const usage = normalizeUsage({ input_tokens: 'abc', output_tokens: null, credits: '' });
  assert.equal(usage.input, null);
  assert.equal(usage.output, null);
  assert.equal(usage.credits, null);
  assert.equal(usage.source, 'none');
});
