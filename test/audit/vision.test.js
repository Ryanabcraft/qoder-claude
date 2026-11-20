import test from 'node:test';
import assert from 'node:assert/strict';
import { looksQuotaExhausted } from '../../src/accounts.js';
import { collectImages } from '../../src/openaiUpstream.js';

const dataUrl = (payload) => `data:image/png;base64,${Buffer.from(payload).toString('base64')}`;

test('quota answered as ordinary text is detected, a discussion about quotas is not', () => {
  assert.equal(looksQuotaExhausted('Your personal Credits have been exhausted. Please check your plan.'), true);
  assert.equal(looksQuotaExhausted('You\'ve reached your credit usage limit. Please upgrade your subscription plan.'), true);
  assert.equal(looksQuotaExhausted('Quota exceeded for this account.'), true);
  assert.equal(looksQuotaExhausted('Here is how to handle a quota error in your client: catch the 429...'), false);
  assert.equal(looksQuotaExhausted(''), false);
});

test('only the current turn images are collected, and only from the last user message', () => {
  const messages = [
    { role: 'user', content: [{ type: 'text', text: 'old' }, { type: 'image_url', image_url: { url: dataUrl('old') } }] },
    { role: 'assistant', content: 'ok' },
    { role: 'user', content: [{ type: 'text', text: 'new' }, { type: 'image_url', image_url: { url: dataUrl('new') } }, { type: 'image_url', image_url: { url: dataUrl('two') } }] },
  ];
  const images = collectImages(messages);
  assert.equal(images.length, 2);
  assert.equal(images[0].mediaType, 'image/png');
  assert.equal(Buffer.from(images[0].data, 'base64').toString(), 'new');
});

test('a text-only turn collects nothing', () => {
  assert.deepEqual(collectImages([{ role: 'user', content: 'texto' }]), []);
});
