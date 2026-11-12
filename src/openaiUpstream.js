import { createStallTimer, stallMs } from './stall.js';
import { context } from './qoderAuth.js';
import { combineSignals } from './abort.js';
import { resolveToolName, toolNames } from './toolNames.js';

const ENDPOINT = process.env.QODER_INFER_ENDPOINT || 'https://api1.qoder.sh';
const AGENT_ID = process.env.QODER_AGENT_ID || 'agent_common';

function textOf(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return content == null ? '' : String(content);
  return content
    .map((part) => {
      if (typeof part === 'string') return part;
      if (part?.type === 'text' || part?.type === 'input_text') return part.text || '';
      return '';
    })
    .join('\n')
    .trim();
}

function imageParts(content) {
  if (!Array.isArray(content)) return null;
  const images = [];
  for (const part of content) {
    if (part?.type !== 'image_url') continue;
    const url = String(part.image_url?.url || part.image_url || '');
    const match = /^data:([^;]+);base64,(.+)$/.exec(url);
    if (match) images.push({ mediaType: match[1], data: match[2] });
  }
  return images.length ? images : null;
}

// The client's own prompt is sent as-is: this path is an API, not an agent.
export function toUpstreamMessages(messages = []) {
  const out = [];
  for (const message of messages) {
    const role = message?.role;
    const text = textOf(message.content);
    if (role === 'system' || role === 'developer') {
      if (text) out.push({ role: 'system', content: text });
      continue;
    }
    if (role === 'tool' || role === 'function') {
      out.push({ role: 'tool', tool_call_id: message.tool_call_id || message.name || 'tool', content: text });
      continue;
    }
    if (role === 'assistant') {
      const entry = { role: 'assistant', content: text };
      if (Array.isArray(message.tool_calls) && message.tool_calls.length) {
        entry.tool_calls = message.tool_calls.map((call, i) => ({
          id: call.id || `call_${i}`,
          type: 'function',
          function: { name: call.function?.name || '', arguments: call.function?.arguments || '{}' },
        }));
      }
      if (entry.content || entry.tool_calls) out.push(entry);
      continue;
    }
    const images = imageParts(message.content);
    if (images) {
      out.push({
        role: 'user',
        content: [
          { type: 'text', text },
          ...images.map((image) => ({ type: 'image_url', image_url: { url: `data:${image.mediaType};base64,${image.data}` } })),
        ],
      });
    } else {
      out.push({ role: 'user', content: text });
    }
  }
  return out;
}

export function upstreamPayload(body = {}) {
  const payload = {
    messages: toUpstreamMessages(body.messages),
    model: String(body.model || 'auto').toLowerCase(),
    agent_id: AGENT_ID,
    stream: true,
    stream_options: { include_usage: true },
  };
  const maxTokens = Number(body.max_completion_tokens ?? body.max_tokens);
  if (maxTokens > 0) payload.max_tokens = maxTokens;
  if (body.temperature !== undefined) payload.temperature = body.temperature;
  if (body.top_p !== undefined) payload.top_p = body.top_p;
  if (body.stop !== undefined) payload.stop = body.stop;
  if (Number.isFinite(Number(body.reasoning_effort || body.effort)) || typeof (body.reasoning_effort || body.effort) === 'string') {
    const effort = body.reasoning_effort || body.effort;
    if (effort) payload.reasoning_effort = effort;
  }
  if (Array.isArray(body.tools) && body.tools.length) {
    payload.tools = body.tools
      .map((tool) => {
        const fn = tool?.type === 'function' ? tool.function : tool;
        if (!fn?.name) return null;
        return {
          type: 'function',
          function: {
            name: fn.name,
            description: fn.description || '',
            parameters: fn.parameters || { type: 'object', properties: {} },
          },
        };
      })
      .filter(Boolean);
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

// Streams the upstream answer as Anthropic-shaped events, which is what the
// adapter already knows how to turn into OpenAI chunks.
export async function streamChat({ body, signal, onEvent, dir = '' }) {
  let ctx;
  try {
    ({ ctx } = context(dir));
  } catch (e) {
    return { text: '', usage: {}, error: `not logged in: ${e.message}` };
  }
  const payload = upstreamPayload(body);
  const availableTools = toolNames(body.tools);
  const req = ctx.prepareInferRequest(ENDPOINT, JSON.stringify(payload), payload.model, '');
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
    stall.clear();
    signal?.removeEventListener?.('abort', onAbort);
    if (stalled) return { text: '', usage: {}, error: stallError };
    if (signal?.aborted) return { text: '', usage: {}, error: null };
    if (e.name === 'TimeoutError' || e.name === 'AbortError') {
      return { text: '', usage: {}, error: `timeout after ${timeout}ms` };
    }
    return { text: '', usage: {}, error: String(e.message || e) };
  }

  if (!res.ok) {
    stall.clear();
    signal?.removeEventListener?.('abort', onAbort);
    const text = await res.text().catch(() => '');
    return { text: '', usage: {}, error: `upstream ${res.status}: ${text.slice(0, 300)}` };
  }

  let text = '';
  let usage = {};
  let stopReason = null;
  let upstreamError = null;
  let nextIndex = 0;
  let textIndex = -1;
  const calls = new Map();
  const decoder = new TextDecoder();
  let buf = '';

  const ensureText = () => {
    if (textIndex !== -1) return;
    textIndex = nextIndex++;
    onEvent?.({ type: 'content_block_start', index: textIndex, content_block: { type: 'text', text: '' } });
  };
  const closeText = () => {
    if (textIndex === -1) return;
    onEvent?.({ type: 'content_block_stop', index: textIndex });
    textIndex = -1;
  };

  const handleLine = (raw) => {
    const line = raw.trim();
    if (!line.startsWith('data:')) return;
    const data = line.slice(5).trim();
    if (!data || data === '[DONE]') return;
    let chunk;
    try {
      chunk = parseEnvelope(data);
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
      ensureText();
      text += delta.content;
      onEvent?.({ type: 'content_block_delta', index: textIndex, delta: { type: 'text_delta', text: delta.content } });
    }
    if (Array.isArray(delta.tool_calls)) {
      closeText();
      for (const call of delta.tool_calls) {
        const i = call.index ?? 0;
        let entry = calls.get(i);
        if (!entry) {
          entry = { id: '', name: '', arguments: '', index: nextIndex++ };
          calls.set(i, entry);
        }
        if (call.id) entry.id = call.id;
        if (call.function?.name && !entry.name) {
          entry.name = resolveToolName(call.function.name, availableTools);
          onEvent?.({
            type: 'content_block_start',
            index: entry.index,
            content_block: { type: 'tool_use', id: entry.id || `toolu_${i}`, name: entry.name, input: {} },
          });
        }
        if (call.function?.arguments) {
          entry.arguments += call.function.arguments;
          onEvent?.({
            type: 'content_block_delta',
            index: entry.index,
            delta: { type: 'input_json_delta', partial_json: call.function.arguments },
          });
        }
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
    stall.clear();
    signal?.removeEventListener?.('abort', onAbort);
  }

  closeText();
  for (const entry of calls.values()) {
    if (!entry.name) continue;
    onEvent?.({ type: 'content_block_stop', index: entry.index });
  }
  const stop = calls.size ? 'tool_use' : (stopReason === 'length' ? 'max_tokens' : 'end_turn');
  onEvent?.({
    type: 'message_delta',
    delta: { stop_reason: stop, stop_sequence: null },
    usage: { input_tokens: Number(usage.prompt_tokens) || 0, output_tokens: Number(usage.completion_tokens) || 0 },
  });
  return { text, usage, error: upstreamError, stopReason: stop };
}
