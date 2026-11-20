import { combineSignals } from './abort.js';
import { effectiveConfig } from './config.js';

const TIMEOUT_MS = Number(process.env.QODER_COMPRESS_TIMEOUT_MS || 3000);

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

// The current request and the system prompt are never rewritten; everything
// else may be shortened by the local Headroom proxy.
export async function compactMessages(messages, { model = '', signal } = {}) {
  const list = Array.isArray(messages) ? messages : [];
  const proxy = compressProxy();
  const off = !proxy || process.env.QODER_COMPRESS === '0';
  if (off || list.length < 3) return { messages: list, ratio: 0, skipped: true };

  const before = JSON.stringify(list).length;
  const min = Number(process.env.QODER_COMPRESS_MIN_CHARS || 20000);
  if (before < min) return { messages: list, ratio: 0, skipped: true };
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
    if (!res.ok) return { messages: list, ratio: 0, skipped: true };
    const json = await res.json();
    const out = Array.isArray(json?.messages) ? json.messages : Array.isArray(json?.result?.messages) ? json.result.messages : null;
    if (!out || out.length !== list.length) return { messages: list, ratio: 0, skipped: true };

    for (const index of protectedIndexes(list)) out[index] = list[index];
    const after = JSON.stringify(out).length;
    return { messages: out, ratio: before ? Math.max(0, 1 - after / before) : 0, skipped: false };
  } catch {
    return { messages: list, ratio: 0, skipped: true };
  } finally {
    clearTimeout(timer);
  }
}
