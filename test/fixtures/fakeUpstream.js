import http from 'node:http';

const NL = String.fromCharCode(10);
const envelope = (body, status = 200) =>
  `data: ${JSON.stringify({ statusCodeValue: status, body: typeof body === 'string' ? body : JSON.stringify(body) })}${NL}${NL}`;
const chunk = (delta, finish = null) => ({
  id: 'chatcmpl-fake',
  object: 'chat.completion.chunk',
  model: 'auto',
  choices: [{ index: 0, delta, finish_reason: finish }],
});

// The model name selects the scenario, so one fake covers every case.
// The bridge normalises unknown model names, so the scenario rides in the text.
function modeOf(raw) {
  const text = String(raw || '');
  if (text.includes('scenario:quota')) return 'quota';
  if (text.includes('scenario:cut')) return 'cut';
  if (text.includes('scenario:lower')) return 'lower';
  return 'tools';
}

export async function startFakeUpstream() {
  const server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => { raw += c; });
    req.on('end', () => {
      let body = {};
      try { body = JSON.parse(raw || '{}'); } catch {}
      const mode = modeOf(raw);
      res.writeHead(200, { 'content-type': 'text/event-stream' });
      if (mode === 'quota') {
        res.write(envelope({ code: '402', message: 'quota exceeded for this account' }, 402));
        res.end();
        return;
      }
      if (mode === 'cut') {
        res.write(envelope(chunk({ role: 'assistant', content: 'parcial' })));
        res.destroy();
        return;
      }
      const toolName = mode === 'lower' ? 'bash' : 'Bash';
      res.write(envelope(chunk({ role: 'assistant', content: '' })));
      res.write(envelope(chunk({ tool_calls: [{ index: 0, id: 'call_fake', type: 'function', function: { name: toolName, arguments: '' } }] })));
      res.write(envelope(chunk({ tool_calls: [{ index: 0, function: { arguments: '{"command":"echo hi"}' } }] })));
      res.write(envelope(chunk({}, 'tool_calls')));
      res.write(envelope({ choices: [], usage: { prompt_tokens: 10, completion_tokens: 5 } }));
      res.end();
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return { server, port: server.address().port };
}
