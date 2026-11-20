const ALIASES = {
  bash: 'Bash',
  shell: 'Bash',
  read: 'Read',
  write: 'Write',
  edit: 'Edit',
  multiedit: 'MultiEdit',
  glob: 'Glob',
  grep: 'Grep',
  ls: 'LS',
  task: 'Task',
  agent: 'Task',
  todowrite: 'TodoWrite',
  todo_write: 'TodoWrite',
  webfetch: 'WebFetch',
  web_fetch: 'WebFetch',
  websearch: 'WebSearch',
  web_search: 'WebSearch',
  notebookedit: 'NotebookEdit',
  notebook_read: 'NotebookRead',
};

import { createHash } from 'node:crypto';

const PORTABLE = /^[A-Za-z0-9_-]{1,64}$/;

function distance(a, b) {
  const s = String(a || '');
  const t = String(b || '');
  if (Math.abs(s.length - t.length) > 2) return 3;
  let prev = Array.from({ length: t.length + 1 }, (_, i) => i);
  for (let i = 1; i <= s.length; i += 1) {
    const next = [i];
    for (let j = 1; j <= t.length; j += 1) {
      next[j] = Math.min(prev[j] + 1, next[j - 1] + 1, prev[j - 1] + (s[i - 1] === t[j - 1] ? 0 : 1));
    }
    prev = next;
  }
  return prev[t.length];
}

// OpenAI-compatible upstreams only accept [A-Za-z0-9_-]{1,64}; anything else
// gets a deterministic alias that can be decoded on the way back.
export function aliasToolName(name) {
  const raw = String(name || '');
  if (!raw || PORTABLE.test(raw)) return raw;
  const base = raw.replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 46) || 'tool';
  const digest = createHash('sha1').update(raw).digest('hex').slice(0, 16);
  return `${base}-${digest}`;
}

export function toolAliases(tools = []) {
  const encodeMap = new Map();
  const decodeMap = new Map();
  for (const name of toolNames(tools)) {
    const alias = aliasToolName(name);
    if (alias === name) continue;
    encodeMap.set(name, alias);
    decodeMap.set(alias, name);
  }
  return {
    size: encodeMap.size,
    encode: (name) => encodeMap.get(String(name || '')) || String(name || ''),
    decode: (name) => decodeMap.get(String(name || '')) || String(name || ''),
  };
}

export function toolNames(tools = []) {
  if (!Array.isArray(tools)) return [];
  return tools
    .map((tool) => (tool && tool.type === 'function' ? tool.function?.name : tool?.name))
    .filter((name) => typeof name === 'string' && name);
}

const lower = (value) => String(value || '').toLowerCase();
const lastSegment = (value) => lower(value).split(/__|\.|\//).filter(Boolean).pop() || '';

export function resolveToolName(name, available = []) {
  const raw = String(name || '');
  if (!raw) return raw;
  const list = Array.isArray(available) ? available : [];

  if (list.includes(raw)) return raw;

  const exact = list.find((tool) => lower(tool) === lower(raw));
  if (exact) return exact;

  const tail = lastSegment(raw);
  const byTail = list.find((tool) => lastSegment(tool) === tail);
  if (byTail) return byTail;

  const alias = ALIASES[lower(raw)] || ALIASES[tail];
  if (alias) {
    const known = list.find((tool) => lower(tool) === lower(alias));
    return known || alias;
  }

  if (raw.length >= 3) {
    let best = '';
    let bestScore = 3;
    for (const tool of list) {
      const score = distance(tail || lower(raw), lower(tool));
      if (score < bestScore) { best = tool; bestScore = score; }
    }
    if (best && bestScore <= 2) return best;
  }

  return raw;
}
