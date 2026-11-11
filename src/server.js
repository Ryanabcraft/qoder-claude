import './config.js';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { buildPrompt, extractToolCalls, findToolBlock, toolMarkers } from './prompt.js';
import { mergeUsage } from './usage.js';
import { runCompletion, workerConfig } from './cli.js';
let directCompletion = null;
try { ({ directCompletion } = await import('./direct.js')); } catch {}
import { cachedModels, onModelsChanged, refreshRemote, startModelRefresh } from './models.js';
import { applyModelPicker } from './claudePicker.js';
import { startQuotaPolling } from './quota.js';
import { startRewardPolling } from './rewards.js';
import { handleUi } from './uiApi.js';
import { record } from './metrics.js';
import { estimateImageTokens, redactForLog } from './images.js';
import { runVision, visionCliPath } from './vision.js';
import {
  candidateAccounts,
  clearCooldown,
  isRotatable,
  markCooldown,
} from './accounts.js';

const PORT = Number(process.env.BRIDGE_PORT || 8787);
const HOST = process.env.BRIDGE_HOST || '127.0.0.1';
const KEY = process.env.BRIDGE_API_KEY || '';
const TRANSPORT = process.env.BRIDGE_TRANSPORT || (directCompletion ? 'direct' : 'cli');
const run = TRANSPORT === 'direct' && directCompletion ? directCompletion : runCompletion;
const LOG_FILE = process.env.BRIDGE_LOG_FILE || '';
const LOG_ON = process.env.BRIDGE_LOG !== '0';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LOG_PATH = LOG_FILE || path.join(ROOT, 'bridge.log');
const PID_PATH = path.join(ROOT, 'bridge.pid');

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

const SENSITIVE = /(key|token|secret|password|auth)/i;

function safeSearch(url) {
  const params = new URLSearchParams(url.search);
  let changed = false;
  for (const name of [...params.keys()]) {
    if (SENSITIVE.test(name)) {
      params.set(name, '***');
      changed = true;
    }
  }
  const query = params.toString();
  return query ? `?${query}` : changed ? '' : url.search;
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

function errorStatus(message) {
  if (/billing|daily count|quota|403|not logged in|unauthori[sz]ed/i.test(message)) return 400;
  if (/rate.?limit|429/i.test(message)) return 429;
  if (/timeout|stall|ETIMEDOUT|ECONNRESET|ECONNREFUSED|ENOTFOUND/i.test(message)) return 503;
  return 502;
}

function errorType(status) {
  if (status === 400) return 'invalid_request_error';
  if (status === 429) return 'rate_limit_error';
  if (status === 503) return 'overloaded_error';
  return 'api_error';
}

function errorBody(message, status) {
  return { type: 'error', error: { type: errorType(status), message } };
}

function stripToolBlocks(text) {
  if (!text) return text;
  let out = text.replace(/<tool_calls>[\s\S]*?<\/tool_calls>/g, '');
  const hit = findToolBlock(out);
  if (hit) out = out.slice(0, hit.index);
  return out.replace(/\s+$/, '');
}

const TOOL_ALIASES = { web_search: 'WebSearch', web_fetch: 'WebFetch' };

// Deferred tools (WebSearch, WebFetch, MCP) are not in the request's tool list, so
// filtering by that list would swallow a real call. Only the alias needs fixing.
function alignToolCalls(tc, { preferExa = false } = {}) {
  if (!tc) return null;
  return {
    ...tc,
    calls: tc.calls.map((c) => {
      const name = TOOL_ALIASES[c.name.toLowerCase()] || c.name;
      if (preferExa && name === 'WebSearch') {
        const query = c.input?.query || c.input?.q || '';
        return { name: 'mcp__exa__web_search_exa', input: query ? { query } : c.input || {} };
      }
      if (preferExa && name === 'WebFetch') {
        const url = c.input?.url || '';
        return { name: 'mcp__exa__web_fetch_exa', input: url ? { url } : c.input || {} };
      }
      return { ...c, name };
    }),
  };
}

function stopReason(value, hasToolCalls) {
  if (hasToolCalls) return 'tool_use';
  const reason = String(value || '').toLowerCase();
  if (reason === 'max_tokens' || reason === 'length') return 'max_tokens';
  if (reason === 'tool_use' || reason === 'tool_calls') return 'tool_use';
  if (reason === 'stop_sequence') return 'stop_sequence';
  return 'end_turn';
}

function cfgForAccount(cfg, account) {
  const rest = cfg.key.split('|').slice(1).join('|');
  return { ...cfg, account: account.name, configDir: account.dir, key: `${account.name}|${rest}` };
}

/**
 * Tries the accounts in order. A quota/billing/auth failure on one profile cools
 * it down and the next attempt runs on the following account. Requests that
 * already produced visible text never rotate: the caller cannot rewrite a stream.
 */
async function runWithRotation({ body, cfg, signal, onEvent, canRotate = () => true }, runner = run) {
  const accounts = candidateAccounts();
  const maxAttempts = Math.max(0, Number(process.env.BRIDGE_MAX_ATTEMPTS || 0));
  let last = { text: '', usage: {}, error: 'no account available', account: cfg.account };

  for (let i = 0; i < accounts.length; i++) {
    if (maxAttempts && i >= maxAttempts) break;
    const account = accounts[i];
    const attempt = cfgForAccount(cfg, account);
    if (accounts.length > 1 && process.env.BRIDGE_LOG !== '0') {
      log(`  account ${i + 1}/${accounts.length}: ${account.name}`);
    }

    let out;
    try {
      out = await runner({ body, cfg: attempt, signal, onEvent });
    } catch (e) {
      out = { text: '', usage: {}, error: e.message || String(e) };
    }

    if (!out.error) {
      clearCooldown(account.name);
      return { ...out, account: account.name };
    }

    last = { ...out, account: account.name };

    if (!isRotatable(out.error)) break;
    const ms = markCooldown(account.name, out.error);
    log(`  account ${account.name} paused ${Math.round(ms / 1000)}s: ${String(out.error).slice(0, 160)}`);
    if (!canRotate()) break;
  }

  return last;
}

async function handleMessages(req, res, body) {
  const t0 = Date.now();
  const stream = body.stream !== false;
  const wantsTools = Array.isArray(body.tools) && body.tools.length > 0;
  const built = buildPrompt(body, 0, log);
  const preferExa = /mcp__exa__web_search_exa/.test(built.prompt) || /mcp__exa__web_search_exa/.test(built.system);
  const cfg = workerConfig(body, built.system);
  const model = cfg.model;
  let inTokens = estimate(built.prompt + built.system) + estimateImageTokens(built.images);
  if (built.images.length || built.historyImages) {
    const history = built.historyImages ? ` (+${built.historyImages} from history)` : '';
    log(`  images ${built.images.length}${history}${visionCliPath() ? '' : ' (vision engine not installed)'}`);
  }
  const runner = built.images.length && visionCliPath()
    ? (args) => runVision({ ...args, built, log }) || run(args)
    : run;
  const msgId = `msg_${randomUUID().replace(/-/g, '').slice(0, 24)}`;
  const started = Date.now();
  let firstByteAt = 0;
  let outTokens = 0;
  let credits = 0;
  let cacheRead = 0;
  let cacheWrite = 0;
  let usageSource = 'estimated';
  let realUsage = null;
  let usedAccount = cfg.account;
  res.once('finish', () => record({
    model: cfg.model,
    status: res.statusCode,
    ms: Date.now() - started,
    ttft: firstByteAt ? firstByteAt - t0 : 0,
    transport: TRANSPORT,
    account: usedAccount,
    inTokens,
    outTokens,
    credits,
    cacheRead,
    cacheWrite,
    usageSource,
  }));

  const trackUsage = (raw, text) => {
    const real = mergeUsage(raw, inTokens, estimate(text || ''));
    inTokens = real.anthropic.input_tokens;
    outTokens = real.anthropic.output_tokens;
    credits = real.metrics.credits;
    cacheRead = real.metrics.cacheRead;
    cacheWrite = real.metrics.cacheWrite;
    usageSource = real.metrics.source;
    realUsage = real.anthropic;
    return real;
  };

  const ac = new AbortController();
  res.on('close', () => {
    if (!res.writableEnded) ac.abort();
  });

  if (!stream) {
    let out;
    try {
      out = await runWithRotation({ body, cfg, signal: ac.signal }, runner);
    } catch (e) {
      const status = errorStatus(e.message || '');
      return send(res, status, errorBody(e.message || 'request failed', status));
    }
    usedAccount = out.account || usedAccount;
    if (out.error) {
      const status = errorStatus(out.error);
      return send(res, status, errorBody(out.error, status));
    }
    const rawCalls = wantsTools ? extractToolCalls(out.text) : null;
    const tc = rawCalls ? alignToolCalls(rawCalls, { preferExa }) : null;
    const content = [];
    if (tc) {
      if (tc.before) content.push({ type: 'text', text: tc.before });
      for (const c of tc.calls) {
        content.push({ type: 'tool_use', id: `toolu_${randomUUID().replace(/-/g, '').slice(0, 20)}`, name: c.name, input: c.input });
      }
    } else {
      content.push({ type: 'text', text: stripToolBlocks(out.text) });
    }
    trackUsage(out.usage, out.text || '');
    log(`  done transport=${TRANSPORT} ttft=- total=${Date.now() - t0}ms`);
    return send(res, 200, {
      id: msgId,
      type: 'message',
      role: 'assistant',
      model,
      content,
      stop_reason: stopReason(out.stopReason, Boolean(tc)),
      stop_sequence: null,
      usage: realUsage,
    });
  }

  let headersSent = false;
  let keepalive = null;
  let write = null;

  const startStream = () => {
    if (headersSent) return;
    headersSent = true;
    res.writeHead(200, {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
      'x-accel-buffering': 'no',
    });
    write = sseWriter(res);
    write('message_start', {
      type: 'message_start',
      message: {
        id: msgId, type: 'message', role: 'assistant', model,
        content: [], stop_reason: null, stop_sequence: null,
        usage: { input_tokens: inTokens, output_tokens: 0 },
      },
    });
    keepalive = setInterval(() => {
      try { res.write(': ping\n\n'); } catch {}
    }, 12000);
    keepalive.unref?.();
  };

  let nextIndex = 0;
  let textIndex = -1;
  let emitted = '';
  let gateState = 'text';
  let pending = '';
  const MARKS = toolMarkers();

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

  const holdTail = (s) => {
    let hold = 0;
    for (const mark of MARKS) {
      for (let k = Math.min(mark.length - 1, s.length); k > 0; k--) {
        if (mark.startsWith(s.slice(-k))) { if (k > hold) hold = k; break; }
      }
    }
    return hold;
  };

  const feed = (t) => {
    if (!t) return;
    if (gateState === 'tool') { pending += t; return; }
    pending += t;
    const hit = findToolBlock(pending);
    if (hit) {
      emitText(pending.slice(0, hit.index));
      pending = pending.slice(hit.index);
      gateState = 'tool';
      return;
    }
    const hold = holdTail(pending);
    const safe = pending.slice(0, pending.length - hold);
    pending = pending.slice(pending.length - hold);
    emitText(safe);
  };

  let out;
  try {
    out = await runWithRotation({
      body, cfg, signal: ac.signal,
      canRotate: () => emitted.length === 0 && !headersSent,
      onEvent: (ev) => {
        if (ev?.type === 'content_block_delta' && ev.delta?.type === 'text_delta') {
          if (!firstByteAt) firstByteAt = Date.now();
          startStream();
          feed(ev.delta.text || '');
        }
      },
    }, runner);
    usedAccount = out.account || usedAccount;
  } catch (e) {
    clearInterval(keepalive);
    if (!headersSent) {
      const status = errorStatus(e.message || '');
      return send(res, status, errorBody(e.message || 'request failed', status));
    }
    out = { text: '', error: e.message || String(e), usage: {} };
  }
  clearInterval(keepalive);
  if (!out.error) trackUsage(out.usage, out.text || '');

  log(`  done transport=${TRANSPORT} ttft=${firstByteAt ? firstByteAt - t0 : '-'}ms total=${Date.now() - t0}ms`);

  if (out.error && !out.text && !emitted) {
    if (!headersSent) {
      const status = errorStatus(out.error);
      return send(res, status, errorBody(out.error, status));
    }
    stopText();
    write('content_block_delta', { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: `qoder-claude: ${out.error}` } });
    write('content_block_stop', { type: 'content_block_stop', index: 0 });
    write('message_delta', { type: 'message_delta', delta: { stop_reason: 'end_turn', stop_sequence: null }, usage: { output_tokens: 6 } });
    write('message_stop', { type: 'message_stop' });
    return res.end();
  }

  if (!headersSent) startStream();

  const full = out.text || '';
  const parsed = wantsTools ? extractToolCalls(full) : null;
  if (parsed) log('  model tool calls: ' + parsed.calls.map((c) => c.name).join(', '));
  const tc = alignToolCalls(parsed, { preferExa });

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
      usage: realUsage || { output_tokens: estimate(full) },
    });
  } else {
    const visible = stripToolBlocks(full);
    if (visible.length > emitted.length) emitText(visible.slice(emitted.length));
    stopText();
    write('message_delta', {
      type: 'message_delta',
      delta: { stop_reason: stopReason(out.stopReason, false), stop_sequence: null },
      usage: realUsage || { output_tokens: estimate(full) },
    });
  }

  write('message_stop', { type: 'message_stop' });
  res.end();
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || HOST}`);
  const path = url.pathname.replace(/\/+$/, '');
  log(`${new Date().toISOString()} ${req.method} ${url.pathname}${safeSearch(url)}`);

  if (url.pathname === '/ui' || url.pathname.startsWith('/ui/') || url.pathname === '/favicon.svg') {
    if (await handleUi(req, res, url, { authorized, logFile: LOG_PATH })) return;
  }

  if (req.method === 'GET' && (path === '/health' || path === '/')) {
    return send(res, 200, { ok: true, service: 'qoder-claude', port: PORT });
  }

  if (!authorized(req)) {
    return send(res, 401, { type: 'error', error: { type: 'authentication_error', message: 'invalid api key' } });
  }

  if (req.method === 'GET' && (path === '/v1/models' || path === '/models')) {
    return send(res, 200, {
      data: cachedModels().map((m) => ({ type: 'model', id: m, display_name: m, created_at: new Date(0).toISOString() })),
      has_more: false,
    });
  }

  if (req.method === 'POST' && (path === '/v1/messages/count_tokens' || path === '/messages/count_tokens')) {
    try {
      const raw = await readBody(req);
      const body = JSON.parse(raw || '{}');
      const built = buildPrompt(body);
      return send(res, 200, { input_tokens: estimate(built.prompt) + estimateImageTokens(built.images) });
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
            if (b?.type === 'tool_result') log('  tool_result ' + b.tool_use_id + ' ' + (b.is_error ? 'ERROR' : 'ok') + ' ' + JSON.stringify(redactForLog(b.content)).slice(0, 200));
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

function removePidFile() {
  try { fs.rmSync(PID_PATH, { force: true }); } catch {}
}

try { fs.writeFileSync(PID_PATH, String(process.pid)); } catch {}
process.on('exit', removePidFile);
for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(sig, () => { removePidFile(); process.exit(0); });
}

const PARENT_PID = Number(process.env.BRIDGE_PARENT_PID || 0);
if (PARENT_PID > 0) {
  const watchdog = setInterval(() => {
    try {
      process.kill(PARENT_PID, 0);
    } catch {
      removePidFile();
      process.exit(0);
    }
  }, 3000);
  watchdog.unref?.();
}

server.requestTimeout = 0;
server.headersTimeout = 0;
server.on('connection', (socket) => socket.setNoDelay(true));
server.listen(PORT, HOST, () => {
  log(`qoder-claude on http://${HOST}:${PORT}`);
  log(`claude:  ANTHROPIC_BASE_URL=http://${HOST}:${PORT}`);
  log(`dashboard: http://${HOST}:${PORT}/ui`);
  log(LOG_FILE ? `log:     ${LOG_FILE}` : 'log:     console');
  log('close this window or press Ctrl+C to stop.');
  log(`models: ${cachedModels().slice(0, 5).join(', ')}, ...`);
  if (process.env.CLAUDE_PICKER_SYNC !== '0') {
    onModelsChanged(() => {
      const result = applyModelPicker();
      if (result.changed) log(`claude picker: ${result.count} models`);
    });
    refreshRemote()
      .catch(() => {})
      .finally(() => {
        const first = applyModelPicker();
        if (first.changed) log(`claude picker: ${first.count} models`);
      });
  }
  startModelRefresh();
  startQuotaPolling();
  startRewardPolling();
});
