// Web search executed by the bridge itself: DuckDuckGo Lite HTML, no key, no MCP.
// The shape follows Anthropic's server-side web_search tool, so a client that
// asks for it gets real results instead of a tool it cannot run.

const DDG_URL = process.env.QODER_SEARCH_URL || 'https://html.duckduckgo.com/html/';
const EXA_URL = process.env.QODER_EXA_URL || 'https://mcp.exa.ai/mcp';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const MAX_BYTES = 2 * 1024 * 1024;
export const MAX_RESULTS = 10;
const TIMEOUT_MS = Number(process.env.QODER_SEARCH_TIMEOUT_MS || 20000);
const CACHE_MS = 5 * 60 * 1000;
const cache = new Map();

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", apos: "'" };

export function decodeEntities(text) {
  return String(text || '').replace(/&(#\d+|[a-z]+);/gi, (whole, name) => {
    const key = name.toLowerCase();
    if (ENTITIES[key]) return ENTITIES[key];
    if (key.startsWith('#x')) return String.fromCodePoint(parseInt(key.slice(2), 16) || 63);
    if (key.startsWith('#')) return String.fromCodePoint(parseInt(key.slice(1), 10) || 63);
    return whole;
  });
}

function unwrapDdg(href) {
  const value = decodeEntities(String(href || ''));
  const match = /[?&]uddg=([^&]+)/.exec(value);
  if (!match) return value.startsWith('http') ? value : '';
  try { return decodeURIComponent(match[1]); } catch { return ''; }
}

function textOf(fragment) {
  return decodeEntities(String(fragment).replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

// DuckDuckGo Lite markup: <a rel="nofollow" class="result__a" href="…uddg=…">title</a>
export function parseResults(html, limit = MAX_RESULTS) {
  const out = [];
  const seen = new Set();
  const anchor = /<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = anchor.exec(String(html || ''))) !== null) {
    const url = unwrapDdg(match[1]);
    if (!url || !/^https?:\/\//i.test(url)) continue;
    if (/^https?:\/\/([a-z0-9-]+\.)*duckduckgo\.com/i.test(url)) continue;
    const title = textOf(match[2]);
    if (!title || seen.has(url)) continue;
    seen.add(url);
    out.push({ title, url });
    if (out.length >= limit) break;
  }
  return out;
}

export function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; }
}

export function applyDomainFilter(results, { allowed = [], blocked = [] } = {}) {
  const allow = allowed.map((d) => String(d).toLowerCase());
  const deny = blocked.map((d) => String(d).toLowerCase());
  return results.filter((item) => {
    const host = hostOf(item.url);
    if (!host) return false;
    if (deny.some((d) => host === d || host.endsWith(`.${d}`))) return false;
    if (allow.length && !allow.some((d) => host === d || host.endsWith(`.${d}`))) return false;
    return true;
  });
}

// Exa's MCP server answers without a key and returns one text block per result
// as "Title: … / URL: … / Published: …". That is the primary backend here.
export function parseExaText(text, limit = MAX_RESULTS) {
  const out = [];
  const seen = new Set();
  for (const block of String(text || '').split(/\n(?=Title:)/)) {
    const title = /^Title:\s*(.+)$/m.exec(block)?.[1]?.trim();
    const url = /^URL:\s*(\S+)$/m.exec(block)?.[1]?.trim();
    if (!title || !url || !/^https?:\/\//i.test(url) || seen.has(url)) continue;
    seen.add(url);
    out.push({ title, url });
    if (out.length >= limit) break;
  }
  return out;
}

async function exaSearch(query, { limit, allowed, blocked, fetchImpl, timeoutMs }) {
  const res = await fetchImpl(EXA_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: 'web_search_exa', arguments: { query, numResults: limit } },
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) return { results: [], error: `exa ${res.status}` };
  const body = await res.text();
  const chunks = [];
  for (const line of body.split(/\r?\n/)) {
    if (!line.startsWith('data:')) continue;
    try {
      const json = JSON.parse(line.slice(5).trim());
      for (const part of json?.result?.content || []) if (part?.type === 'text') chunks.push(part.text || '');
    } catch {}
  }
  const results = applyDomainFilter(parseExaText(chunks.join('\n'), limit * 2), { allowed, blocked }).slice(0, limit);
  return results.length ? { results, error: null } : { results: [], error: 'exa: no results' };
}

// Returns { results, error } — never throws, so a search failure becomes a tool
// result error instead of a broken stream. Exa first (no key, reliable), then
// DuckDuckGo HTML, which rate-limits quickly from one machine.
export async function runSearch(query, { limit = MAX_RESULTS, allowed = [], blocked = [], fetchImpl = fetch } = {}) {
  const q = String(query || '').trim();
  if (!q) return { results: [], error: 'query is required' };
  const mode = (process.env.QODER_SEARCH || 'auto').toLowerCase();
  const cacheKey = `${q}|${limit}|${allowed.join(',')}|${blocked.join(',')}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_MS && hit.ok) return { results: hit.results, error: null };

  let lastError = '';
  if (mode !== 'ddg') {
    try {
      const exa = await exaSearch(q, { limit, allowed, blocked, fetchImpl, timeoutMs: TIMEOUT_MS });
      if (!exa.error) { cache.set(cacheKey, { at: Date.now(), ok: true, results: exa.results }); return exa; }
      lastError = exa.error;
    } catch (e) {
      lastError = e?.name === 'TimeoutError' || e?.name === 'AbortError' ? 'exa timeout' : String(e?.message || e);
    }
  }
  if (mode === 'exa') return { results: [], error: lastError || 'exa: no results' };

  try {
    const res = await fetchImpl(DDG_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'user-agent': UA,
        accept: 'text/html,application/xhtml+xml',
      },
      body: new URLSearchParams({ q, kl: 'wt-wt' }).toString(),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return { results: [], error: `search ${res.status}` };
    const html = await res.text();
    const trimmed = html.length > MAX_BYTES ? html.slice(0, MAX_BYTES) : html;
    const results = applyDomainFilter(parseResults(trimmed, limit * 2), { allowed, blocked }).slice(0, limit);
    if (!results.length) return { results: [], error: lastError || 'no results' };
    cache.set(cacheKey, { at: Date.now(), ok: true, results });
    return { results, error: null };
  } catch (e) {
    const timedOut = e?.name === 'TimeoutError' || e?.name === 'AbortError';
    return { results: [], error: timedOut ? 'search timeout' : String(e?.message || e) };
  }
}

// Any tool whose type is a server-side web search variant.
export function serverSearchTools(tools = []) {
  return (Array.isArray(tools) ? tools : [])
    .filter((tool) => typeof tool?.type === 'string' && /^web_search_/.test(tool.type))
    .map((tool) => ({
      name: tool.name || 'web_search',
      maxUses: Number(tool.max_uses) > 0 ? Number(tool.max_uses) : 1,
      allowed: Array.isArray(tool.allowed_domains) ? tool.allowed_domains : [],
      blocked: Array.isArray(tool.blocked_domains) ? tool.blocked_domains : [],
    }));
}

export function hasSearchTool(tools = []) {
  return serverSearchTools(tools).length > 0;
}

// Models here often narrate a tool call instead of emitting one. When the
// question clearly depends on current facts, the bridge searches first and
// hands the model the results, so the answer never comes from memory.
const LIVE = /\b(hoje|agora|atualmente|atual|pre[cç]o|cota[cç][aã]o|not[ií]cia|noticias|notícias|lan[cç]amento|vers[aã]o|recente|recentes|[uú]ltim[oa]s?|cotacao|weather|clima|temperatura|latest|current|today|now|price|news|release|version|weather)\b/i;
const YEAR = /\b20(2[4-9]|3\d)\b/;

export function needsWeb(text) {
  const value = String(text || '');
  if (!value.trim()) return false;
  if (/https?:\/\/\S+/i.test(value)) return true;
  if (LIVE.test(value)) return true;
  return YEAR.test(value) && /\?/.test(value);
}
