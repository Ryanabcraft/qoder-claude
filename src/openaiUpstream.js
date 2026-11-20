import { createStallTimer, stallMs } from './stall.js';
import { context } from './qoderAuth.js';
import { combineSignals } from './abort.js';
import { resolveToolName, toolAliases, toolNames } from './toolNames.js';
import { loopGuardEnabled, loopWarning, repeatedCall } from './loopGuard.js';
import { compactMessages } from './compress.js';
import { needsWeb, runSearch } from './webSearch.js';
import { repairJson } from './toolValidate.js';

const ENDPOINT = process.env.QODER_INFER_ENDPOINT || 'https://api1.qoder.sh';
const AGENT_ID = process.env.QODER_AGENT_ID || 'agent_common';
const MAX_TOOL_ARG = Number(process.env.QODER_TOOL_ARG_MAX || 1024 * 1024);
const MAX_TOOL_TOTAL = Number(process.env.QODER_TOOL_TOTAL_MAX || 16 * 1024 * 1024);

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

export function upstreamPayload(body = {}, { act = false } = {}) {
  const messages = toUpstreamMessages(body.messages);
  const repeat = loopGuardEnabled() ? repeatedCall(body.messages) : null;
  if (repeat) messages.unshift({ role: 'system', content: loopWarning(repeat) });
  if (act && process.env.QODER_ACT_PROMPT !== '0') {
    const notice = 'Act, do not narrate: when a tool can do the job, call it in this same turn. '
      + 'Do not list the plan or print the code before applying it.';
    const at = messages.findIndex((m) => m.role === 'system');
    if (at >= 0) messages[at] = { role: 'system', content: `${messages[at].content}

${notice}` };
    else messages.unshift({ role: 'system', content: notice });
  }
  const payload = {
    messages,
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
  const body = String(env.body ?? '').trim();
  if (!body || body === '[DONE]') return null;
  return JSON.parse(body);
}

// Streams the upstream answer as Anthropic-shaped events, which is what the
// adapter already knows how to turn into OpenAI chunks.
export async function streamChat({ body, signal, onEvent, dir = '', act = false }) {
  const startedAt = Date.now();
  let firstTokenAt = 0;
  let firstTextAt = 0;
  let lastDeltaAt = 0;
  let chunks = 0;
  let maxGap = 0;
  let reasoningChars = 0;
  let textChars = 0;
  let toolBytes = 0;
  let toolOverflow = 0;
  let ctx;
  try {
    ({ ctx } = context(dir));
  } catch (e) {
    return { text: '', usage: {}, error: `not logged in: ${e.message}` };
  }
  const compacted = await compactMessages(body.messages, { model: body.model, signal });
  const searchMode = body.search === true;
  const payload = upstreamPayload({ ...body, messages: compacted.messages }, { act });
  if (searchMode && Array.isArray(payload.tools)) {
    payload.tools.push({
      type: 'function',
      function: {
        name: 'web_search',
        description: 'Search the live web. Use it whenever the answer depends on current facts, prices, news or anything after your training date.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
            queries: { type: 'array', items: { type: 'string' }, description: 'One or two search queries' },
          },
        },
      },
    });
  }
  if (searchMode) {
    const lastUser = [...payload.messages].reverse().find((message) => message.role === 'user');
    const question = typeof lastUser?.content === 'string' ? lastUser.content : '';
    if (needsWeb(question)) {
      const found = await runSearch(question);
      payload.messages.unshift({
        role: 'system',
        content: found.error
          ? `Web search for the user's question failed (${found.error}). Say the search failed instead of guessing a number.`
          : `Live web results for the user's question, fetched now:\n${found.results.map((item, i) => `${i + 1}. ${item.title} — ${item.url}`).join('\n')}\nAnswer from these results and cite the URLs.`,
      });
    }
    payload.messages.unshift({
      role: 'system',
      content: 'The web_search tool is available. Call it before answering anything that depends on current facts, prices, news, versions or dates. Never state a number you cannot source from the search results.',
    });
  }
  const aliases = toolAliases(body.tools);
  if (aliases.size && Array.isArray(payload.tools)) {
    for (const tool of payload.tools) {
      const original = tool.function?.name;
      if (original) tool.function.name = aliases.encode(original);
    }
  }
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
  let thinkingIndex = -1;
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
    if (delta.content || delta.reasoning_content || delta.reasoning || (Array.isArray(delta.tool_calls) && delta.tool_calls.length)) {
      const at = Date.now();
      if (lastDeltaAt) maxGap = Math.max(maxGap, at - lastDeltaAt);
      lastDeltaAt = at;
      chunks += 1;
    }

    const reasoning = typeof delta.reasoning_content === 'string' ? delta.reasoning_content : (typeof delta.reasoning === 'string' ? delta.reasoning : '');
    if (reasoning) {
      if (!firstTokenAt) firstTokenAt = Date.now();
      reasoningChars += reasoning.length;
      if (thinkingIndex === -1) {
        closeText();
        thinkingIndex = nextIndex++;
        onEvent?.({ type: 'content_block_start', index: thinkingIndex, content_block: { type: 'thinking', thinking: '' } });
      }
      onEvent?.({ type: 'content_block_delta', index: thinkingIndex, delta: { type: 'thinking_delta', thinking: reasoning } });
    }
    if (!firstTokenAt && ((typeof delta.content === 'string' && delta.content) || (Array.isArray(delta.tool_calls) && delta.tool_calls.length))) firstTokenAt = Date.now();
    if (delta.content && thinkingIndex !== -1) {
      onEvent?.({ type: 'content_block_stop', index: thinkingIndex });
      thinkingIndex = -1;
    }
    if (typeof delta.content === 'string' && delta.content) {
      if (!firstTextAt) firstTextAt = Date.now();
      textChars += delta.content.length;
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
          entry = { id: '', name: '', arguments: '', index: nextIndex++, raw: i, emitted: false };
          calls.set(i, entry);
        }
        if (call.id) entry.id = call.id;
        if (call.function?.name && !entry.name) {
          entry.name = resolveToolName(aliases.decode(call.function.name), availableTools);
          if (!searchMode) {
            entry.emitted = true;
            onEvent?.({
              type: 'content_block_start',
              index: entry.index,
              content_block: { type: 'tool_use', id: entry.id || `toolu_${i}`, name: entry.name, input: {} },
            });
          }
        }
        if (call.function?.arguments) {
          const add = call.function.arguments.length;
          if (entry.overflow || entry.arguments.length + add > MAX_TOOL_ARG || toolBytes + add > MAX_TOOL_TOTAL) {
            if (!entry.overflow) toolOverflow += 1;
            entry.overflow = true;
          } else {
            toolBytes += add;
            entry.arguments += call.function.arguments;
            if (!searchMode) {
              onEvent?.({
                type: 'content_block_delta',
                index: entry.index,
                delta: { type: 'input_json_delta', partial_json: call.function.arguments },
              });
            }
          }
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

  if (thinkingIndex !== -1) {
    onEvent?.({ type: 'content_block_stop', index: thinkingIndex });
    thinkingIndex = -1;
  }
  closeText();

  if (searchMode && calls.size) {
    const entries = [...calls.values()].filter((entry) => entry.name);
    const wanted = entries.filter((entry) => entry.name === 'web_search');
    const rest = entries.filter((entry) => entry.name !== 'web_search');
    if (wanted.length && !rest.length && !text) {
      const queries = wanted
        .map((entry) => {
          const args = repairJson(entry.arguments || '{}') || {};
          if (typeof args.query === 'string' && args.query.trim()) return args.query.trim();
          if (Array.isArray(args.queries)) return args.queries.filter((q) => typeof q === 'string').join(' ').trim();
          return '';
        })
        .filter(Boolean)
        .slice(0, 2);
      const blocks = [];
      for (const query of queries.length ? queries : ['']) {
        const found = query ? await runSearch(query) : { results: [], error: 'query is required' };
        blocks.push(found.error
          ? `Web search "${query}" failed: ${found.error}. Say the search failed instead of guessing.`
          : `Web search "${query}" returned:\n${found.results.map((item, i) => `${i + 1}. ${item.title} — ${item.url}`).join('\n')}\nUse these URLs and cite them.`);
      }
      const extended = [
        ...payload.messages,
        {
          role: 'assistant',
          content: '',
          tool_calls: wanted.map((entry, i) => ({
            id: entry.id || `call_search_${i}`,
            type: 'function',
            function: { name: 'web_search', arguments: entry.arguments || '{}' },
          })),
        },
        ...wanted.map((entry, i) => ({ role: 'tool', tool_call_id: entry.id || `call_search_${i}`, content: blocks.join('\n\n') })),
      ];
      return await streamChat({ body: { ...body, messages: extended, search: false }, signal, onEvent, dir, act });
    }
    for (const entry of rest) {
      entry.emitted = true;
      onEvent?.({ type: 'content_block_start', index: entry.index, content_block: { type: 'tool_use', id: entry.id || `toolu_${entry.raw}`, name: entry.name, input: {} } });
      if (entry.arguments) onEvent?.({ type: 'content_block_delta', index: entry.index, delta: { type: 'input_json_delta', partial_json: entry.arguments } });
    }
  }

  for (const entry of calls.values()) {
    if (!entry.name) continue;
    if (searchMode && !entry.emitted) continue;
    onEvent?.({ type: 'content_block_stop', index: entry.index });
  }
  const stop = calls.size ? 'tool_use' : (stopReason === 'length' ? 'max_tokens' : 'end_turn');
  onEvent?.({
    type: 'message_delta',
    delta: { stop_reason: stop, stop_sequence: null },
    usage: { input_tokens: Number(usage.prompt_tokens) || 0, output_tokens: Number(usage.completion_tokens) || 0 },
  });
  return {
    text,
    usage,
    error: upstreamError,
    stopReason: stop,
    compact: compacted.ratio,
    compactMs: compacted.ms || 0,
    compactReason: compacted.reason || '',
    ttft: firstTokenAt ? firstTokenAt - startedAt : 0,
    ttftText: firstTextAt ? firstTextAt - startedAt : 0,
    chunks,
    maxGapMs: maxGap,
    reasoningChars,
    textChars,
    toolOverflow,
    ms: Date.now() - startedAt,
  };
}
