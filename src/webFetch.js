// web_fetch executed by the bridge: read a page and hand the model clean text.
// Every hop is checked before it is fetched, so a server tool cannot be turned
// into a probe of the local network.
import { lookup } from 'node:dns/promises';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const MAX_BYTES = 2 * 1024 * 1024;
export const MAX_CHARS = Number(process.env.QODER_FETCH_MAX_CHARS || 24000);
const MAX_REDIRECTS = 5;
const TIMEOUT_MS = Number(process.env.QODER_FETCH_TIMEOUT_MS || 20000);

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", apos: "'", nbsp: ' ' };

export function decodeEntities(text) {
  return String(text || '').replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (whole, name) => {
    const key = name.toLowerCase();
    if (ENTITIES[key]) return ENTITIES[key];
    if (key.startsWith('#x')) return String.fromCodePoint(parseInt(key.slice(2), 16) || 63);
    if (key.startsWith('#')) return String.fromCodePoint(parseInt(key.slice(1), 10) || 63);
    return whole;
  });
}

function octets(host) {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  return match ? match.slice(1).map(Number) : null;
}

export function privateAddress(address) {
  const host = String(address || '').toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost')) return true;
  if (host === '::1' || host === '::' || host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80')) return true;
  const parts = octets(host);
  if (!parts) return false;
  if (parts.some((n) => n > 255)) return true;
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return false;
}

// Returns a reason string when the URL must not be fetched.
export async function blockedReason(raw, { resolve = lookup } = {}) {
  let url;
  try { url = new URL(String(raw)); } catch { return 'invalid url'; }
  if (!/^https?:$/.test(url.protocol)) return 'only http and https';
  if (privateAddress(url.hostname)) return 'private address';
  try {
    const rows = await resolve(url.hostname, { all: true });
    for (const row of rows) {
      if (privateAddress(row.address) || privateAddress(row.address?.replace(/^::ffff:/, ''))) return 'private address';
    }
  } catch {
    return 'host not found';
  }
  return null;
}

export function extractText(html, maxChars = MAX_CHARS) {
  const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  const title = titleMatch ? decodeEntities(titleMatch[1]).replace(/\s+/g, ' ').trim() : '';
  const body = String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<\/?(p|div|br|li|tr|h[1-6]|section|article|header|footer|pre|blockquote|table|ul|ol)\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '');
  const text = decodeEntities(body)
    .split('\n')
    .map((line) => line.replace(/[ \t\r\f\v]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
  return { title, text: text.length > maxChars ? `${text.slice(0, maxChars)}\n[truncated]` : text };
}

async function readCapped(res, maxBytes = MAX_BYTES) {
  if (!res.body?.getReader) return String(await res.text() || '').slice(0, maxBytes);
  const reader = res.body.getReader();
  const chunks = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size >= maxBytes) {
      const over = size - maxBytes;
      chunks.push(value.slice(0, value.length - over));
      try { await reader.cancel(); } catch {}
      break;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks.map((c) => Buffer.from(c))).toString('utf8');
}

// Returns { page } or { error } — never throws.
export async function fetchPage(raw, { fetchImpl = fetch, resolve = lookup, maxChars = MAX_CHARS } = {}) {
  let url = String(raw || '').trim();
  if (!url) return { error: 'url is required' };
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const blocked = await blockedReason(url, { resolve });
    if (blocked) return { error: `blocked: ${blocked}`, url };
    let res;
    try {
      res = await fetchImpl(url, {
        headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml,application/json;q=0.9,text/plain;q=0.8,*/*;q=0.5' },
        redirect: 'manual',
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (e) {
      const timedOut = e?.name === 'TimeoutError' || e?.name === 'AbortError';
      return { error: timedOut ? 'fetch timeout' : String(e?.message || e), url };
    }
    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const next = res.headers.get('location');
      if (!next) return { error: `redirect ${res.status} without location`, url };
      url = new URL(next, url).toString();
      continue;
    }
    if (!res.ok) return { error: `http ${res.status}`, url };
    const type = String(res.headers.get('content-type') || '');
    const body = await readCapped(res);
    if (/html|xml/i.test(type) || /^\s*</.test(body)) {
      const { title, text } = extractText(body, maxChars);
      return { page: { url, title, text, mediaType: type || 'text/html' } };
    }
    const text = body.length > maxChars ? `${body.slice(0, maxChars)}\n[truncated]` : body;
    return { page: { url, title: '', text, mediaType: type || 'text/plain' } };
  }
  return { error: 'too many redirects', url };
}

export function serverFetchTools(tools = []) {
  return (Array.isArray(tools) ? tools : [])
    .filter((tool) => typeof tool?.type === 'string' && /^web_fetch_/.test(tool.type))
    .map((tool) => ({ name: tool.name || 'web_fetch', maxUses: Number(tool.max_uses) > 0 ? Number(tool.max_uses) : 1 }));
}

export function firstUrl(text) {
  const match = /https?:\/\/[^\s<>"')]+/i.exec(String(text || ''));
  return match ? match[0].replace(/[.,;:]+$/, '') : '';
}
