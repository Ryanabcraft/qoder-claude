import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveModel } from '../src/cli.js';

const LIST = ['Auto', 'Ultimate', 'DeepSeek-Flash', 'GLM-5.3'];

test('an exact name wins', () => {
  assert.equal(resolveModel('DeepSeek-Flash', LIST), 'DeepSeek-Flash');
});

test('a name in another case resolves to the canonical spelling', () => {
  assert.equal(resolveModel('deepseek-flash', LIST), 'DeepSeek-Flash');
  assert.equal(resolveModel('  glm-5.3  ', LIST), 'GLM-5.3');
});

test('an unknown name is forwarded instead of being swapped for Auto', () => {
  assert.equal(resolveModel('DeepSeek-V4-Flash', LIST), 'DeepSeek-V4-Flash');
  assert.equal(resolveModel('some-future-model', LIST), 'some-future-model');
});

test('an empty model falls back to the default', () => {
  assert.equal(resolveModel('', LIST), 'Auto');
  assert.equal(resolveModel(undefined, LIST), 'Auto');
});

test('QODER_MODEL is the explicit override', () => {
  process.env.QODER_MODEL = 'Ultimate';
  assert.equal(resolveModel('DeepSeek-Flash', LIST), 'Ultimate');
  delete process.env.QODER_MODEL;
  assert.equal(resolveModel('DeepSeek-Flash', LIST), 'DeepSeek-Flash');
});

test('QODER_MODEL_MAP maps the Claude aliases when asked', () => {
  process.env.QODER_MODEL_MAP = '1';
  assert.equal(resolveModel('claude-opus-4', LIST), 'Ultimate');
  assert.equal(resolveModel('claude-haiku-4', LIST), 'Fast');
  assert.equal(resolveModel('claude-sonnet-4', LIST), 'Auto');
  delete process.env.QODER_MODEL_MAP;
  assert.equal(resolveModel('claude-opus-4', LIST), 'claude-opus-4');
});
