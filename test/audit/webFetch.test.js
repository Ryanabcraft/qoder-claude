import test from 'node:test';
import assert from 'node:assert/strict';
import { blockedReason, extractText, fetchPage, firstUrl, privateAddress, serverFetchTools } from '../../src/webFetch.js';

const HTML = `<html><head><title>Teste &amp; Co</title><script>alert(1)</script><style>.x{color:red}</style></head>
<body><!-- x --><h1>Ola</h1><p>mundo <b>real</b></p><noscript>nope</noscript></body></html>`;

const publicResolve = async () => [{ address: '93.184.216.34', family: 4 }];
const answer = (body, type = 'text/html', status = 200, headers = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: (name) => ({ 'content-type': type, ...headers })[String(name).toLowerCase()] || null },
  text: async () => body,
  body: null,
});

test('html becomes clean text with the title, without script or style', () => {
  const { title, text } = extractText(HTML);
  assert.equal(title, 'Teste & Co');
  assert.match(text, /Ola/);
  assert.match(text, /mundo real/);
  assert.doesNotMatch(text, /alert|color:red|nope/);
});

test('text is capped', () => {
  const big = `<p>${'a'.repeat(50000)}</p>`;
  const { text } = extractText(big, 1000);
  assert.ok(text.length <= 1012);
  assert.match(text, /\[truncated\]/);
});

test('private and non-http targets are refused before any fetch', async () => {
  assert.equal(await blockedReason('http://127.0.0.1:8787/ui'), 'private address');
  assert.equal(await blockedReason('http://localhost/x'), 'private address');
  assert.equal(await blockedReason('http://10.0.0.5/'), 'private address');
  assert.equal(await blockedReason('http://169.254.1.1/'), 'private address');
  assert.equal(await blockedReason('file:///etc/passwd'), 'only http and https');
  assert.equal(privateAddress('::1'), true);
  assert.equal(privateAddress('93.184.216.34'), false);
});

test('a hostname that resolves to a private address is refused', async () => {
  const resolve = async () => [{ address: '192.168.0.10', family: 4 }];
  assert.equal(await blockedReason('https://looks-public.example/', { resolve }), 'private address');
});

test('a public page comes back as a page', async () => {
  const out = await fetchPage('https://example.com/', { fetchImpl: async () => answer(HTML), resolve: publicResolve });
  assert.equal(out.error, undefined);
  assert.equal(out.page.title, 'Teste & Co');
  assert.equal(out.page.url, 'https://example.com/');
});

test('a redirect is followed and revalidated', async () => {
  let calls = 0;
  const fetchImpl = async (url) => {
    calls += 1;
    if (url === 'https://example.com/') return answer('', 'text/html', 302, { location: 'https://example.com/next' });
    return answer('<title>N</title><p>ok</p>');
  };
  const out = await fetchPage('https://example.com/', { fetchImpl, resolve: publicResolve });
  assert.equal(calls, 2);
  assert.equal(out.page.url, 'https://example.com/next');
});

test('an http error is an error, not a crash', async () => {
  const out = await fetchPage('https://example.com/', { fetchImpl: async () => answer('no', 'text/plain', 500), resolve: publicResolve });
  assert.equal(out.error, 'http 500');
  const blocked = await fetchPage('http://127.0.0.1/');
  assert.match(blocked.error, /blocked/);
});

test('tool detection and url extraction', () => {
  assert.equal(serverFetchTools([{ type: 'web_fetch_20250910', name: 'web_fetch' }, { name: 'Read' }]).length, 1);
  assert.equal(firstUrl('veja https://example.com/a?b=1, ok'), 'https://example.com/a?b=1');
  assert.equal(firstUrl('sem link'), '');
});
