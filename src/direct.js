import { deferredTools, renderMessageContent, systemToText } from './prompt.js';
import { openAIContent } from './images.js';
import { createStallTimer, stallMs } from './stall.js';
import { context, forgetContext } from './qoderAuth.js';
import { combineSignals } from './abort.js';
import { loopGuardEnabled, loopWarning, repeatedCall, repeatedTarget, targetWarning } from './loopGuard.js';
import { compactMessages } from './compress.js';
import { repairJson } from './toolValidate.js';

export { forgetContext };

const ENDPOINT = process.env.QODER_INFER_ENDPOINT || 'https://api1.qoder.sh';
const AGENT_ID = process.env.QODER_AGENT_ID || 'agent_common';
const MAX_TOOL_ARG = Number(process.env.QODER_TOOL_ARG_MAX || 1024 * 1024);
const MAX_TOOL_TOTAL = Number(process.env.QODER_TOOL_TOTAL_MAX || 16 * 1024 * 1024);

export function buildPayload(body, model, contextWindow, opts = {}) {
  const messages = [];
  const repeat = loopGuardEnabled() ? repeatedCall(body.messages) : null;
  if (repeat) messages.push({ role: 'system', content: loopWarning(repeat) });
  else {
    const sameTarget = loopGuardEnabled() ? repeatedTarget(body.messages) : null;
    if (sameTarget) messages.push({ role: 'system', content: targetWarning(sameTarget) });
  }
  const system = systemToText(body.system);
  if (system) messages.push({ role: 'system', content: system });

  const all = Array.isArray(body.messages) ? body.messages : [];
  const lastAssistant = all.reduce((index, m, i) => (m.role === 'assistant' ? i : index), -1);
  let counter = 1;
  let renderedText = '';
  all.forEach((m, index) => {
    const role = m.role === 'assistant' ? 'assistant' : 'user';
    const rendered = renderMessageContent(m.content, {
      start: counter,
      allowImages: role === 'user' && index > lastAssistant,
      log: process.env.BRIDGE_LOG === '0' ? undefined : (line) => console.log(line),
    });
    counter = rendered.next;
    renderedText += rendered.text + '\n';
    if (!rendered.text && !rendered.images.length) return;
    const content = rendered.images.length ? openAIContent(rendered.text, rendered.images) : rendered.text;
    messages.push({ role, content });
  });

  const payload = {
    messages,
    model: String(model).toLowerCase(),
    agent_id: AGENT_ID,
    stream: true,
    stream_options: { include_usage: true },
  };
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
  const body = String(env.body ?? '').trim();
  if (!body || body === '[DONE]') return null;
  return JSON.parse(body);
}

export async function directCompletion({ body, cfg, signal, onEvent }) {
  let ctx;
  try {
    ({ ctx } = context(cfg.configDir));
  } catch (e) {
    return { text: '', usage: {}, error: `not logged in: ${e.message}` };
  }
  const compacted = await compactMessages(body.messages, { model: cfg.model, signal });
  const payload = buildPayload({ ...body, messages: compacted.messages }, cfg.model, cfg.contextWindow, cfg);
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
      signal: combineSignals([AbortSignal.timeout(timeout), ctrl.signal]),
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
  let upstreamError = null;
  const startedAt = Date.now();
  let firstTextAt = 0;
  let lastAt = 0;
  let maxGap = 0;
  let chunks = 0;
  let toolBytes = 0;
  let toolOverflow = 0;
  const calls = new Map();
  const decoder = new TextDecoder();
  let buf = '';

  const handleLine = (raw) => {
    const line = raw.trim();
    if (!line.startsWith('data:')) return;
    const data = line.slice(5).trim();
    if (!data || data === '[DONE]') return;
    let chunk;
    try {
      chunk = parseEnvelope(data);
      if (!chunk) return;
    } catch (e) {
      if (!upstreamError) upstreamError = e.message || String(e);
      return;
    }

    if (chunk.usage) usage = chunk.usage;
    const choice = chunk.choices && chunk.choices[0];
    if (!choice) return;
    if (choice.finish_reason) stopReason = choice.finish_reason;
    const delta = choice.delta || {};

    if (typeof delta.content === 'string' && delta.content) {
      const at = Date.now();
      if (!firstTextAt) firstTextAt = at;
      if (lastAt) maxGap = Math.max(maxGap, at - lastAt);
      lastAt = at;
      chunks += 1;
      text += delta.content;
      if (onEvent) onEvent({ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: delta.content } });
    }
    if (Array.isArray(delta.tool_calls)) {
      for (const tc of delta.tool_calls) {
        const i = tc.index ?? 0;
        const cur = calls.get(i) || { id: '', name: '', arguments: '' };
        if (tc.id) cur.id = tc.id;
        if (tc.function?.name) cur.name = tc.function.name;
        if (tc.function?.arguments) {
          const add = tc.function.arguments.length;
          if (cur.arguments.length + add > MAX_TOOL_ARG || toolBytes + add > MAX_TOOL_TOTAL) {
            if (!cur.overflow) { cur.overflow = true; toolOverflow += 1; }
          } else {
            toolBytes += add;
            cur.arguments += tc.function.arguments;
          }
        }
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
        const parsed = repairJson(c.arguments || '{}');
        const input = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
        if (parsed === null && c.arguments) upstreamError = upstreamError || `tool arguments were not valid JSON for ${c.name}`;
        return { name: c.name, input };
      });
    if (list.length) {
      const block = `\n<tool_calls>${JSON.stringify(list)}</tool_calls>`;
      text += block;
      if (onEvent) onEvent({ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: block } });
    }
  }

  return {
    text,
    usage,
    error: upstreamError,
    stopReason,
    compact: compacted.ratio,
    compactMs: compacted.ms || 0,
    compactReason: compacted.reason || '',
    ttft: firstTextAt ? firstTextAt - startedAt : 0,
    ttftText: firstTextAt ? firstTextAt - startedAt : 0,
    chunks,
    maxGapMs: maxGap,
    reasoningChars: 0,
    textChars: text.length,
    toolOverflow,
    ms: Date.now() - startedAt,
  };
}
