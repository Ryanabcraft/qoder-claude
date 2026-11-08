import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';

const MARK = '<tool_calls>';
const TAG_MARK = '[[tool_use';

export function findToolBlock(text) {
  let hit = null;
  for (const mark of [MARK, TAG_MARK]) {
    const at = text.indexOf(mark);
    if (at !== -1 && (!hit || at < hit.index)) hit = { index: at, mark };
  }
  return hit;
}

export function toolMarkers() {
  return [MARK, TAG_MARK];
}

export function blocksToText(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content
    .filter((b) => b && typeof b === 'object')
    .map((b) => {
      if (b.type === 'text') return b.text || '';
      if (b.type === 'thinking') return '';
      if (b.type === 'tool_use') return `[[tool_use ${b.name} ${JSON.stringify(b.input ?? {})}]]`;
      if (b.type === 'tool_result') {
        const body = blocksToText(b.content);
        return `[[tool_result${b.tool_use_id ? ' ' + b.tool_use_id : ''}]] ${body}`;
      }
      if (b.type === 'image') return '[[image omitted]]';
      return '';
    })
    .join('\n')
    .trim();
}

export function systemToText(system) {
  return blocksToText(system);
}

function shortDesc(d, max = 240) {
  const s = String(d || '').replace(/\s+/g, ' ').trim();
  return s.length > max ? s.slice(0, max) + '...' : s;
}

function toolsToText(tools) {
  const lines = [
    'TOOLS (real, executed by the caller):',
    `Use a tool by replying with ${MARK}[{"name":"<tool>","input":{...}}]</tool_calls> and no prose around it.`,
    'Input must match the schema. If no tool is needed, answer normally.',
    '',
  ];
  for (const t of tools) {
    lines.push(`- ${t.name}: ${shortDesc(t.description)}`.trim());
    if (t.input_schema) lines.push(`  schema: ${JSON.stringify(t.input_schema)}`);
  }
  return lines.join('\n');
}

export function normalizeSystem(system) {
  return systemToText(system)
    .split('\n')
    .filter((line) => !/^\s*x-anthropic-billing-header:/i.test(line))
    .join('\n')
    .trim();
}

const DEFERRED_SCHEMAS = [
  {
    name: 'WebSearch',
    detect: /\bWebSearch\b/,
    description: 'Search the web. Input: {"query":"..."}.',
    schema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
  },
  {
    name: 'WebFetch',
    detect: /\bWebFetch\b/,
    description: 'Fetch a URL and answer a question about it. Input: {"url":"...","prompt":"..."}.',
    schema: {
      type: 'object',
      properties: { url: { type: 'string' }, prompt: { type: 'string' } },
      required: ['url', 'prompt'],
    },
  },
  {
    name: 'mcp__exa__web_search_exa',
    detect: /mcp__exa__web_search_exa/,
    description: 'Search the web through Exa. Input: {"query":"..."}.',
    schema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
  },
  {
    name: 'mcp__exa__web_fetch_exa',
    detect: /mcp__exa__web_fetch_exa/,
    description: 'Fetch a URL through Exa. Input: {"url":"..."}.',
    schema: { type: 'object', properties: { url: { type: 'string' } }, required: ['url'] },
  },
];

// Deferred tools have no schema in the request; give the model one so the call
// carries those call names and arguments instead of an empty input.
function withDeferred(tools, context) {
  const names = new Set(tools.map((t) => t.name));
  const extra = DEFERRED_SCHEMAS.filter((d) => !names.has(d.name) && d.detect.test(context)).map((d) => ({
    name: d.name,
    description: d.description,
    input_schema: d.schema,
  }));
  return extra.length ? [...tools, ...extra] : tools;
}

export function buildPrompt(body, from = 0) {
  const system = normalizeSystem(body.system);
  const all = Array.isArray(body.messages) ? body.messages : [];
  const msgs = from > 0 ? all.slice(from) : all;
  const rendered = msgs.map((m) => blocksToText(m.content));
  const context = `${system}\n${rendered.join('\n')}`;

  const parts = [];
  if (from === 0 && Array.isArray(body.tools) && body.tools.length) {
    parts.push(toolsToText(withDeferred(body.tools, context)), '');
  }

  parts.push('[CONVERSATION]');
  msgs.forEach((m, i) => {
    const role = (m.role || 'user').toUpperCase();
    parts.push(`${role}: ${rendered[i]}`);
  });
  parts.push('');
  parts.push('[INSTRUCTION]');
  parts.push('Follow the agent instructions exactly.');
  const deferred = from === 0 && Array.isArray(body.tools) && body.tools.some((t) => t.name === 'ToolSearch');
  if (deferred) {
    parts.push(
      'Deferred tools appear by name only. Before using one that has no schema in TOOLS, call ToolSearch with "select:<name>" and then call the tool.',
    );
    parts.push(
      'For web search prefer mcp__exa__web_search_exa when it is available; the built-in WebSearch returns no results behind this gateway.',
    );
  }
  return { system, prompt: parts.join('\n') };
}

export function toolCallMarker() {
  return MARK;
}

function normalizeCall(c) {
  if (!c || typeof c.name !== 'string') return null;
  let input = c.input ?? c.arguments ?? c.parameters ?? {};
  if (typeof input === 'string') {
    try { input = JSON.parse(input); } catch { input = {}; }
  }
  if (c.name === 'mcp_call' && input && typeof input.toolName === 'string') {
    return { name: input.toolName, input: input.arguments ?? {} };
  }
  return { name: c.name, input: input ?? {} };
}

function jsonSlice(raw) {
  const a = raw.indexOf('{');
  const b = raw.lastIndexOf('}');
  if (a !== -1 && b > a) return raw.slice(a, b + 1);
  return raw;
}

function parseTagCalls(raw) {
  const calls = [];
  const re = /\[\[\s*tool_use\s+([A-Za-z0-9_./:-]+)\s*([\s\S]*?)\]\]/g;
  let m;
  while ((m = re.exec(raw))) {
    let input = {};
    try { input = JSON.parse(jsonSlice(m[2].trim()) || '{}'); } catch {}
    const call = normalizeCall({ name: m[1], input });
    if (call) calls.push(call);
  }
  return calls;
}

export function extractToolCalls(text) {
  const trimmed = (text || '').trim();
  const hit = findToolBlock(trimmed);
  if (!hit) return null;
  const before = trimmed.slice(0, hit.index).trim();
  let calls = [];

  if (hit.mark === MARK) {
    const start = hit.index;
    const end = trimmed.indexOf('</tool_calls>', start);
    const raw = end === -1 ? trimmed.slice(start + MARK.length) : trimmed.slice(start + MARK.length, end);
    let parsed;
    try {
      parsed = JSON.parse(raw.trim());
    } catch {
      const a = raw.indexOf('[');
      const b = raw.lastIndexOf(']');
      if (a !== -1 && b > a) {
        try { parsed = JSON.parse(raw.slice(a, b + 1)); } catch {}
      }
    }
    if (parsed !== undefined) {
      const list = Array.isArray(parsed) ? parsed : [parsed];
      calls = list.map(normalizeCall).filter(Boolean);
    }
    if (!calls.length) calls = parseTagCalls(raw);
  } else {
    calls = parseTagCalls(trimmed.slice(hit.index));
    if (!calls.length) {
      const single = trimmed.slice(hit.index).match(/\[\[\s*tool_use\s+([A-Za-z0-9_./:-]+)\s*([\s\S]*)$/);
      if (single) {
        let input = {};
        try { input = JSON.parse(jsonSlice(single[2].replace(/\]\]\s*$/, '').trim()) || '{}'); } catch {}
        calls.push({ name: single[1], input });
      }
    }
  }

  if (!calls.length) return null;
  return { calls, before };
}

let cleanCwd = null;
export function cleanWorkspace() {
  if (cleanCwd && fs.existsSync(cleanCwd)) return cleanCwd;
  cleanCwd = fs.mkdtempSync(path.join(os.tmpdir(), 'qoder-bridge-'));
  return cleanCwd;
}
