import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { deferredTools, renderMessageContent, systemToText } from './prompt.js';
import { openAIContent } from './images.js';
import { createStallTimer, stallMs } from './stall.js';
import { cliVersion } from './cliPath.js';

const require = createRequire(import.meta.url);
const auth = require('../vendor/qoder-auth.cjs');

const CONFIG_DIR =
  process.env.QODER_CONFIG_DIR || path.join(process.env.USERPROFILE || process.env.HOME || '', '.qoder');
const ENDPOINT = process.env.QODER_INFER_ENDPOINT || 'https://api1.qoder.sh';
const AGENT_ID = process.env.QODER_AGENT_ID || 'agent_common';
const VERSION = cliVersion();

const cache = new Map();

function configDirFor(dir) {
  return dir || CONFIG_DIR;
}

function context(dir, force = false) {
  const root = configDirFor(dir);
  const cached = cache.get(root);
  if (cached && !force) return cached;
  const userFile = path.join(root, '.auth', 'user');
  const midFile = path.join(root, '.auth', 'machine_id');
  const user = fs.readFileSync(userFile, 'utf8').trim();
  const mid = fs.readFileSync(midFile, 'utf8').trim();

  auth.init();
  const creds = JSON.parse(auth.credentialDecrypt(user, mid.slice(0, 16)));
  const fields = JSON.parse(
    auth.generateRuntimeAuthFields(
      JSON.stringify({
        uid: creds.uid,
        security_oauth_token: creds.security_oauth_token,
        data_policy_agreed: true,
      }),
    ),
  );
  const info = JSON.stringify({
    uid: creds.uid,
    encrypt_user_info: fields.encrypt_user_info,
    key: fields.key,
    data_policy_agreed: true,
  });
  const client = JSON.stringify({
    client_type: '5',
    business_product: 'cli',
    business_type: 'agent',
    scene: 'assistant',
  });
  const ctx = new auth.QoderContext(mid, VERSION, info, client);
  const built = { ctx, uid: creds.uid };
  cache.set(root, built);
  return built;
}

export function forgetContext(dir) {
  cache.delete(configDirFor(dir));
}

export function buildPayload(body, model, contextWindow, opts = {}) {
  const messages = [];
  const system = systemToText(body.system);
  if (system) messages.push({ role: 'system', content: system });

  let counter = 1;
  let renderedText = '';
  for (const m of Array.isArray(body.messages) ? body.messages : []) {
    const role = m.role === 'assistant' ? 'assistant' : 'user';
    const rendered = renderMessageContent(m.content, {
      start: counter,
      allowImages: role === 'user',
      log: process.env.BRIDGE_LOG === '0' ? undefined : (line) => console.log(line),
    });
    counter = rendered.next;
    renderedText += rendered.text + '\n';
    if (!rendered.text && !rendered.images.length) continue;
    const content = rendered.images.length ? openAIContent(rendered.text, rendered.images) : rendered.text;
    messages.push({ role, content });
  }

  const payload = { messages, model: String(model).toLowerCase(), agent_id: AGENT_ID };
  const maxTokens = Number(body.max_tokens);
  if (maxTokens > 0) payload.max_tokens = maxTokens;
  if (contextWindow > 0) payload.context_window = contextWindow;
  if (opts.thinking) {
    payload.thinking = { type: opts.thinking };
    if (opts.thinkingBudget) payload.thinking.budget_tokens = opts.thinkingBudget;
  }
  if (opts.effort) payload.reasoning_effort = opts.effort;

  const baseTools = Array.isArray(body.tools) ? body.tools : [];
  const tools = baseTools.length ? [...baseTools, ...deferredTools(baseTools, `${system}\n${renderedText}`)] : [];
  if (tools.length) {
    payload.tools = tools.map((t) => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description || '',
        parameters: t.input_schema || { type: 'object', properties: {} },
      },
    }));
  }
  return payload;
}

function parseEnvelope(line) {
  const env = JSON.parse(line);
  if (env.statusCodeValue && env.statusCodeValue !== 200) {
    throw new Error(`upstream ${env.statusCodeValue}: ${String(env.body).slice(0, 300)}`);
  }
  return JSON.parse(env.body);
}

export async function directCompletion({ body, cfg, signal, onEvent }) {
  let ctx;
  try {
    ({ ctx } = context(cfg.configDir));
  } catch (e) {
    return { text: '', usage: {}, error: `not logged in: ${e.message}` };
  }
  const payload = buildPayload(body, cfg.model, cfg.contextWindow, cfg);
  const req = ctx.prepareInferRequest(ENDPOINT, JSON.stringify(payload), cfg.model, '');
  const headers = Object.fromEntries(req.headers);

  const timeout = Number(process.env.BRIDGE_REQUEST_TIMEOUT_MS || 300000);
  const limit = stallMs();
  const stallError = `stalled: no upstream data for ${limit}ms`;
  const ctrl = new AbortController();
  let stalled = false;
  const stall = createStallTimer(limit, () => {
    stalled = true;
    try { ctrl.abort(); } catch {}
  });
  const onAbort = () => { try { ctrl.abort(); } catch {} };
  if (signal) {
    if (signal.aborted) onAbort();
    else signal.addEventListener('abort', onAbort, { once: true });
  }
  const cleanup = () => {
    stall.clear();
    signal?.removeEventListener?.('abort', onAbort);
  };

  let res;
  try {
    stall.arm();
    res = await fetch(req.url, {
      method: 'POST',
      headers,
      body: req.body,
      signal: AbortSignal.any([AbortSignal.timeout(timeout), ctrl.signal]),
    });
    stall.arm();
  } catch (e) {
    cleanup();
    if (stalled) return { text: '', usage: {}, error: stallError };
    if (signal?.aborted) return { text: '', usage: {}, error: null };
    if (e.name === 'TimeoutError' || e.name === 'AbortError') {
      return { text: '', usage: {}, error: `timeout after ${timeout}ms` };
    }
    return { text: '', usage: {}, error: String(e.message || e) };
  }

  if (!res.ok) {
    cleanup();
    const text = await res.text().catch(() => '');
    return { text: '', usage: {}, error: `upstream ${res.status}: ${text.slice(0, 300)}` };
  }

  let text = '';
  let usage = {};
  let stopReason = null;
  const calls = new Map();
  const decoder = new TextDecoder();
  let buf = '';

  const handleLine = (raw) => {
    const line = raw.trim();
    if (!line.startsWith('data:')) return;
    const data = line.slice(5).trim();
    if (!data || data === '[DONE]') return;
    let chunk;
    try { chunk = parseEnvelope(data); } catch (e) { return; }

    if (chunk.usage) usage = chunk.usage;
    const choice = chunk.choices && chunk.choices[0];
    if (!choice) return;
    if (choice.finish_reason) stopReason = choice.finish_reason;
    const delta = choice.delta || {};

    if (typeof delta.content === 'string' && delta.content) {
      text += delta.content;
      if (onEvent) onEvent({ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: delta.content } });
    }
    if (Array.isArray(delta.tool_calls)) {
      for (const tc of delta.tool_calls) {
        const i = tc.index ?? 0;
        const cur = calls.get(i) || { id: '', name: '', arguments: '' };
        if (tc.id) cur.id = tc.id;
        if (tc.function?.name) cur.name = tc.function.name;
        if (tc.function?.arguments) cur.arguments += tc.function.arguments;
        calls.set(i, cur);
      }
    }
  };

  const reader = res.body.getReader();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      stall.arm();
      buf += decoder.decode(value, { stream: true });
      let nl;
      while ((nl = buf.indexOf('\n')) !== -1) {
        const line = buf.slice(0, nl);
        buf = buf.slice(nl + 1);
        handleLine(line);
      }
    }
    if (buf.trim()) handleLine(buf);
  } catch (e) {
    if (stalled) return { text, usage, error: stallError };
    if (signal?.aborted) return { text, usage, error: null };
    if (e.name === 'AbortError') return { text, usage, error: `timeout after ${timeout}ms` };
    throw e;
  } finally {
    cleanup();
  }

  if (calls.size) {
    const list = [...calls.values()]
      .filter((c) => c.name)
      .map((c) => {
        let input = {};
        try { input = JSON.parse(c.arguments || '{}'); } catch {}
        return { name: c.name, input };
      });
    if (list.length) {
      const block = `\n<tool_calls>${JSON.stringify(list)}</tool_calls>`;
      text += block;
      if (onEvent) onEvent({ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: block } });
    }
  }

  return { text, usage, error: null, stopReason };
}
