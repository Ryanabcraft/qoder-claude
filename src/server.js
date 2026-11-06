import http from 'node:http';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { buildPrompt, extractToolCalls } from './prompt.js';
import { runCompletion, workerConfig } from './cli.js';
import { detectModels } from './models.js';

const PORT = Number(process.env.BRIDGE_PORT || 8787);
const HOST = process.env.BRIDGE_HOST || '127.0.0.1';
const KEY = process.env.BRIDGE_API_KEY || '';
const LOG_FILE = process.env.BRIDGE_LOG_FILE || '';
const LOG_ON = process.env.BRIDGE_LOG !== '0';

function log(msg) {
  if (!LOG_ON) return;
  console.log(msg);
  if (!LOG_FILE) return;
  try { fs.appendFileSync(LOG_FILE, msg + '\n'); } catch {}
}

const estimate = (s) => Math.max(1, Math.ceil(String(s).length / 4));

function send(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'content-type': 'application/json',
    'content-length': Buffer.byteLength(body),
  });
  res.end(body);
}

function authorized(req) {
  if (!KEY) return true;
  const h = req.headers['authorization'] || '';
  const k = req.headers['x-api-key'] || '';
  return h === `Bearer ${KEY}` || k === KEY;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > 64 * 1024 * 1024) { reject(new Error('body too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function sseWriter(res) {
  const write = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };
  return write;
}

async function handleMessages(req, res, body) {
  const stream = body.stream !== false;
  const wantsTools = Array.isArray(body.tools) && body.tools.length > 0;
  const built = buildPrompt(body);
  const cfg = workerConfig(body, built.system);
  const model = cfg.model;
  const prompt = built.prompt;
  const inTokens = estimate(prompt + built.system);
  const msgId = `msg_${randomUUID().replace(/-/g, '').slice(0, 24)}`;
  const ac = new AbortController();
  req.on('close', () => ac.abort());

  if (!stream) {
    const out = await runCompletion({ prompt, cfg, signal: ac.signal });
    if (out.error) return send(res, 502, { type: 'error', error: { type: 'api_error', message: out.error } });
    const tc = wantsTools ? extractToolCalls(out.text) : null;
    const content = [];
    if (tc) {
      if (tc.before) content.push({ type: 'text', text: tc.before });
      for (const c of tc.calls) {
        content.push({ type: 'tool_use', id: `toolu_${randomUUID().replace(/-/g, '').slice(0, 20)}`, name: c.name, input: c.input });
      }
    } else {
      content.push({ type: 'text', text: out.text });
    }
    return send(res, 200, {
      id: msgId,
      type: 'message',
      role: 'assistant',
      model,
      content,
      stop_reason: tc ? 'tool_use' : 'end_turn',
      stop_sequence: null,
      usage: { input_tokens: inTokens, output_tokens: estimate(out.text) },
    });
  }

  res.writeHead(200, {
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-cache, no-transform',
    connection: 'keep-alive',
    'x-accel-buffering': 'no',
  });
  const write = sseWriter(res);

  write('message_start', {
    type: 'message_start',
    message: {
      id: msgId, type: 'message', role: 'assistant', model,
      content: [], stop_reason: null, stop_sequence: null,
      usage: { input_tokens: inTokens, output_tokens: 0 },
    },
  });

  let nextIndex = 0;
  let textIndex = -1;
  let emitted = '';
  let gateState = wantsTools ? 'head' : 'text';
  let head = '';
  const MARK = '<tool_calls>';

  const startText = () => {
    if (textIndex !== -1) return;
    textIndex = nextIndex++;
    write('content_block_start', { type: 'content_block_start', index: textIndex, content_block: { type: 'text', text: '' } });
  };
  const emitText = (t) => {
    if (!t) return;
    startText();
    emitted += t;
    write('content_block_delta', { type: 'content_block_delta', index: textIndex, delta: { type: 'text_delta', text: t } });
  };
  const stopText = () => {
    if (textIndex === -1) return;
    write('content_block_stop', { type: 'content_block_stop', index: textIndex });
    textIndex = -1;
  };

  const feed = (t) => {
    if (!t) return;
    if (gateState === 'text') return emitText(t);
    if (gateState === 'tool') return void (head += t);
    head += t;
    const s = head.trimStart();
    if (MARK.startsWith(s) && s.length < MARK.length) return;
    if (s.startsWith(MARK)) { gateState = 'tool'; return; }
    gateState = 'text';
    const out = head;
    head = '';
    emitText(out);
  };

  let out;
  try {
    out = await runCompletion({
      prompt, cfg, signal: ac.signal,
      onEvent: (ev) => {
        if (ev?.type === 'content_block_delta' && ev.delta?.type === 'text_delta') feed(ev.delta.text || '');
      },
    });
  } catch (e) {
    out = { text: '', error: e.message || String(e), usage: {} };
  }

  if (out.error && !out.text && !emitted) {
    stopText();
    write('content_block_delta', { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: `qoder-bridge: ${out.error}` } });
    write('content_block_stop', { type: 'content_block_stop', index: 0 });
    write('message_delta', { type: 'message_delta', delta: { stop_reason: 'end_turn', stop_sequence: null }, usage: { output_tokens: 6 } });
    write('message_stop', { type: 'message_stop' });
    return res.end();
  }

  const full = out.text || '';
  let tc = wantsTools ? extractToolCalls(full) : null;
  if (tc) {
    const valid = new Set(body.tools.map((t) => t.name));
    tc = { ...tc, calls: tc.calls.filter((c) => valid.has(c.name)) };
    if (!tc.calls.length) tc = null;
  }

  if (tc) {
    if (tc.before && !emitted) emitText(tc.before);
    stopText();
    for (const c of tc.calls) {
      const idx = nextIndex++;
      const id = `toolu_${randomUUID().replace(/-/g, '').slice(0, 20)}`;
      log('  tool_use ' + c.name + ' ' + JSON.stringify(c.input).slice(0, 300));
      write('content_block_start', { type: 'content_block_start', index: idx, content_block: { type: 'tool_use', id, name: c.name, input: {} } });
      write('content_block_delta', { type: 'content_block_delta', index: idx, delta: { type: 'input_json_delta', partial_json: JSON.stringify(c.input) } });
      write('content_block_stop', { type: 'content_block_stop', index: idx });
    }
    write('message_delta', {
      type: 'message_delta',
      delta: { stop_reason: 'tool_use', stop_sequence: null },
      usage: { output_tokens: estimate(full) },
    });
  } else {
    if (full.length > emitted.length) emitText(full.slice(emitted.length));
    stopText();
    write('message_delta', {
      type: 'message_delta',
      delta: { stop_reason: 'end_turn', stop_sequence: null },
      usage: { output_tokens: estimate(full) },
    });
  }

  write('message_stop', { type: 'message_stop' });
  res.end();
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || HOST}`);
  const path = url.pathname.replace(/\/+$/, '');
  log(`${new Date().toISOString()} ${req.method} ${url.pathname}${url.search}`);

  if (req.method === 'GET' && (path === '/health' || path === '/')) {
    return send(res, 200, { ok: true, service: 'qoder-bridge', port: PORT });
  }

  if (!authorized(req)) {
    return send(res, 401, { type: 'error', error: { type: 'authentication_error', message: 'invalid api key' } });
  }

  if (req.method === 'GET' && (path === '/v1/models' || path === '/models')) {
    return send(res, 200, {
      data: detectModels().map((m) => ({ type: 'model', id: m, display_name: m, created_at: new Date(0).toISOString() })),
      has_more: false,
    });
  }

  if (req.method === 'POST' && (path === '/v1/messages/count_tokens' || path === '/messages/count_tokens')) {
    try {
      const raw = await readBody(req);
      const body = JSON.parse(raw || '{}');
      return send(res, 200, { input_tokens: estimate(buildPrompt(body).prompt) });
    } catch (e) {
      return send(res, 400, { type: 'error', error: { type: 'invalid_request_error', message: e.message } });
    }
  }

  if (req.method === 'POST' && (path === '/v1/messages' || path === '/messages')) {
    let body;
    try {
      body = JSON.parse((await readBody(req)) || '{}');
    } catch (e) {
      return send(res, 400, { type: 'error', error: { type: 'invalid_request_error', message: e.message } });
    }
    try {
      if (process.env.BRIDGE_LOG !== '0') {
        const last = body.messages?.[body.messages.length - 1];
        if (last && Array.isArray(last.content)) {
          for (const b of last.content) {
            if (b?.type === 'tool_result') log('  tool_result ' + b.tool_use_id + ' ' + (b.is_error ? 'ERROR' : 'ok') + ' ' + JSON.stringify(b.content).slice(0, 200));
          }
        }
      }
      if (process.env.BRIDGE_DUMP) {
        const fs = await import('node:fs');
        fs.writeFileSync(process.env.BRIDGE_DUMP, JSON.stringify({ ...body, tools: body.tools }, null, 2));
      }
      return await handleMessages(req, res, body);
    } catch (e) {
      if (res.headersSent) return res.end();
      return send(res, 500, { type: 'error', error: { type: 'api_error', message: e.message } });
    }
  }

  return send(res, 404, { type: 'error', error: { type: 'not_found_error', message: `no route ${req.method} ${path}` } });
});

server.requestTimeout = 0;
server.headersTimeout = 0;
server.listen(PORT, HOST, () => {
  log(`qoder-bridge on http://${HOST}:${PORT}`);
  log(`claude:  ANTHROPIC_BASE_URL=http://${HOST}:${PORT}`);
  log(LOG_FILE ? `log:     ${LOG_FILE}` : 'log:     console');
  log('close this window or press Ctrl+C to stop.');
  log(`models: ${detectModels().slice(0, 5).join(', ')}, ...`);
});
