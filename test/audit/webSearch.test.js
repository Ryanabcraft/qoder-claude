import test from 'node:test';
import assert from 'node:assert/strict';
import { applyDomainFilter, decodeEntities, parseResults, runSearch, serverSearchTools } from '../../src/webSearch.js';

const HTML = `<div class="result">
<a rel="nofollow" class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Fa&amp;rut=x">Example &amp; One</a>
<a rel="nofollow" class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fblog.example.org%2Fb">Blog Two</a>
<a href="https://duckduckgo.com/y.js?ad_provider=x">ad</a>
<a rel="nofollow" class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Fa">Dup</a>
</div>`;

test('the parser keeps real links, decodes and de-duplicates', () => {
  const results = parseResults(HTML);
  assert.equal(results.length, 2);
  assert.deepEqual(results[0], { title: 'Example & One', url: 'https://example.com/a' });
  assert.equal(results[1].url, 'https://blog.example.org/b');
});

test('entities are decoded without breaking plain text', () => {
  assert.equal(decodeEntities('a &amp; b &#39;c&#39;'), "a & b 'c'");
});

test('domain filters apply blocked and allowed', () => {
  const results = [
    { title: 'a', url: 'https://example.com/x' },
    { title: 'b', url: 'https://blog.example.org/y' },
    { title: 'c', url: 'https://other.net/z' },
  ];
  assert.deepEqual(applyDomainFilter(results, { blocked: ['other.net'] }).map((r) => r.title), ['a', 'b']);
  assert.deepEqual(applyDomainFilter(results, { allowed: ['example.org'] }).map((r) => r.title), ['b']);
  assert.deepEqual(applyDomainFilter(results, { allowed: ['example.com'] }).map((r) => r.title), ['a']);
});

test('a search failure is an error result, never a throw', async () => {
  const bad = await runSearch('x', { fetchImpl: async () => { throw new Error('boom'); } });
  assert.equal(bad.results.length, 0);
  assert.match(bad.error, /boom/);
  const http = await runSearch('x', { fetchImpl: async () => ({ ok: false, status: 503 }) });
  assert.equal(http.error, 'search 503');
  const empty = await runSearch('', { fetchImpl: async () => ({ ok: true, text: async () => '' }) });
  assert.equal(empty.error, 'query is required');
});

test('a successful search maps html into results', async () => {
  const out = await runSearch('q', { fetchImpl: async () => ({ ok: true, text: async () => HTML }) });
  assert.equal(out.error, null);
  assert.equal(out.results.length, 2);
});

test('only web_search_* tool types are treated as server search', () => {
  const tools = [
    { type: 'web_search_20250305', name: 'web_search', max_uses: 3, allowed_domains: ['a.com'] },
    { name: 'Read', input_schema: {} },
    { type: 'web_fetch_20250910', name: 'web_fetch' },
  ];
  const found = serverSearchTools(tools);
  assert.equal(found.length, 1);
  assert.equal(found[0].maxUses, 3);
  assert.deepEqual(found[0].allowed, ['a.com']);
});

test('the pre-search heuristic only fires on live-fact questions', () => {
  return import('../../src/webSearch.js').then(({ needsWeb }) => {
    assert.equal(needsWeb('Qual o preco do bitcoin hoje?'), true);
    assert.equal(needsWeb('What is the latest Node version?'), true);
    assert.equal(needsWeb('resuma https://example.com/a'), true);
    assert.equal(needsWeb('qual a versao de 2026?'), true);
    assert.equal(needsWeb('refatore esta funcao para usar map'), false);
    assert.equal(needsWeb(''), false);
  });
});
