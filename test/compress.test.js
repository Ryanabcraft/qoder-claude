import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

process.env.QODER_COMPRESS_TIMEOUT_MS = '300';
const { compactMessages } = await import('../src/compress.js');

const long = 'x'.repeat(4000);
const messages = () => ([
  { role: 'system', content: 'system prompt ' + long },
  { role: 'user', content: 'first ask' },
  { role: 'assistant', content: '', tool_calls: [{ id: 'c1', type: 'function', function: { name: 'Bash', arguments: '{}' } }] },
  { role: 'tool', tool_call_id: 'c1', content: long },
  { role: 'user', content: 'current ask ' + long },
]);

async function proxy(handler) {
  const server = http.createServer(handler);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return { server, url: `http://127.0.0.1:${server.address().port}` };
}

test('without a proxy nothing is touched and no request is made', async () => {
  delete process.env.QODER_COMPRESS_PROXY;
  const input = messages();
  const out = await compactMessages(input, { model: 'Auto' });
  assert.equal(out.skipped, true);
  assert.equal(out.messages, input);
});

test('the proxy shortens the history but never the system or the current ask', async () => {
  let seen = null;
  const { server, url } = await proxy((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      seen = JSON.parse(body);
      const shorter = seen.messages.map((m, i) => (i === 3 ? { ...m, content: 'short' } : m));
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ messages: shorter }));
    });
  });
  process.env.QODER_COMPRESS_PROXY = url;
  const input = messages();
  const out = await compactMessages(input, { model: 'Auto' });
  server.close();

  assert.equal(out.skipped, false);
  assert.ok(out.ratio > 0.2);
  assert.equal(out.messages[0], input[0], 'the system prompt is the same object');
  assert.equal(out.messages[4], input[4], 'the current ask is the same object');
  assert.equal(out.messages[3].content, 'short');
  assert.equal(seen.model, 'Auto');
});

test('a failing proxy leaves the messages alone', async () => {
  const { server, url } = await proxy((req, res) => {
    res.writeHead(500);
    res.end('no');
  });
  process.env.QODER_COMPRESS_PROXY = url;
  const input = messages();
  const out = await compactMessages(input, { model: 'Auto' });
  server.close();
  assert.equal(out.skipped, true);
  assert.equal(out.messages, input);
});

test('a slow proxy times out and leaves the messages alone', async () => {
  const { server, url } = await proxy(() => {});
  process.env.QODER_COMPRESS_PROXY = url;
  const input = messages();
  const out = await compactMessages(input, { model: 'Auto' });
  server.close();
  assert.equal(out.skipped, true);
  assert.equal(out.messages, input);
});

test('a reply with a different shape is ignored', async () => {
  const { server, url } = await proxy((req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ messages: [{ role: 'user', content: 'only one' }] }));
  });
  process.env.QODER_COMPRESS_PROXY = url;
  const input = messages();
  const out = await compactMessages(input, { model: 'Auto' });
  server.close();
  assert.equal(out.skipped, true);
});

test('QODER_COMPRESS=0 disables it even with a proxy set', async () => {
  process.env.QODER_COMPRESS_PROXY = 'http://127.0.0.1:1';
  process.env.QODER_COMPRESS = '0';
  const input = messages();
  const out = await compactMessages(input, { model: 'Auto' });
  delete process.env.QODER_COMPRESS;
  assert.equal(out.skipped, true);
  assert.equal(out.messages, input);
});
