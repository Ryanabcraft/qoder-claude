import { combineSignals } from './abort.js';
import { effectiveConfig } from './config.js';

const TIMEOUT_MS = Number(process.env.QODER_COMPRESS_TIMEOUT_MS || 800);
const CIRCUIT_MS = Number(process.env.QODER_COMPRESS_COOLDOWN_MS || 10 * 60 * 1000);
let consecutiveTimeouts = 0;
let circuitUntil = 0;

export function compressCircuit() {
  return { consecutiveTimeouts, circuitUntil };
}

export function resetCompressCircuit() {
  consecutiveTimeouts = 0;
  circuitUntil = 0;
}

export function compressProxy() {
  let value = process.env.QODER_COMPRESS_PROXY || '';
  if (!value) {
    try { value = effectiveConfig().compressProxy || ''; } catch {}
  }
  return String(value).replace(/\/+$/, '');
}

function protectedIndexes(messages) {
  const keep = new Set();
  messages.forEach((message, index) => {
    if (message?.role === 'system') keep.add(index);
  });
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i]?.role === 'user') {
      keep.add(i);
      break;
    }
  }
  return keep;
}

// Compression only pays for itself on one huge block (a log or a JSON dump).
// Prose spread across many small messages compresses to nothing, so asking the
// proxy costs 100-600 ms per turn for a 0-1% gain.
function largestBlock(messages, keep) {
  let largest = 0;
  messages.forEach((message, index) => {
    if (keep.has(index)) return;
    const content = message?.content;
    const size = typeof content === 'string' ? content.length : JSON.stringify(content || '').length;
    if (size > largest) largest = size;
  });
  return largest;
}

// The current request and the system prompt are never rewritten; everything
// else may be shortened by the local Headroom proxy.
export async function compactMessages(messages, { model = '', signal } = {}) {
  const list = Array.isArray(messages) ? messages : [];
  const startedAt = Date.now();
  const proxy = compressProxy();
  const off = !proxy || process.env.QODER_COMPRESS === '0';
  if (off || list.length < 3) return { messages: list, ratio: 0, skipped: true, ms: 0, reason: off ? 'disabled' : 'few' };

  const before = JSON.stringify(list).length;
  const min = Number(process.env.QODER_COMPRESS_MIN_CHARS || 20000);
  if (before < min) return { messages: list, ratio: 0, skipped: true, ms: 0, reason: 'small' };
  if (Date.now() < circuitUntil) return { messages: list, ratio: 0, skipped: true, ms: 0, reason: 'circuit' };
  const keep = protectedIndexes(list);
  const block = Number(process.env.QODER_COMPRESS_MIN_BLOCK || 8000);
  if (largestBlock(list, keep) < block) return { messages: list, ratio: 0, skipped: true, ms: 0, reason: 'no-block' };
  const ctrl = new AbortController();
  const timer = setTimeout(() => {
    try { ctrl.abort(); } catch {}
  }, TIMEOUT_MS);
  timer.unref?.();

  try {
    const res = await fetch(`${proxy}/v1/compress`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ messages: list, model }),
      signal: combineSignals([ctrl.signal, signal]),
    });
    const ms = Date.now() - startedAt;
    if (!res.ok) return { messages: list, ratio: 0, skipped: true, ms, reason: `http-${res.status}` };
    const json = await res.json();
    const out = Array.isArray(json?.messages) ? json.messages : Array.isArray(json?.result?.messages) ? json.result.messages : null;
    if (!out || out.length !== list.length) return { messages: list, ratio: 0, skipped: true, ms, reason: 'shape' };

    for (const index of protectedIndexes(list)) out[index] = list[index];
    const after = JSON.stringify(out).length;
    consecutiveTimeouts = 0;
    return { messages: out, ratio: before ? Math.max(0, 1 - after / before) : 0, skipped: false, ms: Date.now() - startedAt, reason: 'ok' };
  } catch (e) {
    const ms = Date.now() - startedAt;
    const reason = ctrl.signal.aborted ? 'timeout' : signal?.aborted ? 'aborted' : 'error';
    if (reason === 'timeout') {
      consecutiveTimeouts += 1;
      if (consecutiveTimeouts >= 2) {
        circuitUntil = Date.now() + CIRCUIT_MS;
        consecutiveTimeouts = 0;
      }
    }
    return { messages: list, ratio: 0, skipped: true, ms, reason };
  } finally {
    clearTimeout(timer);
  }
}
