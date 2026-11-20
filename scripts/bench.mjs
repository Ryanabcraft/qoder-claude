// Throughput bench for the bridge. Measures what the user actually feels:
// time to first text, tokens per second of text, and the gaps between chunks.
//
//   node scripts/bench.mjs --api chat --models Auto,Fast --turns 3
//   node scripts/bench.mjs --api messages --models Auto --turns 3
//   BENCH_COMPRESS=0 node scripts/bench.mjs --api chat --models Auto

import { pathToFileURL } from 'node:url';

const BASE = process.env.BRIDGE_URL || 'http://127.0.0.1:8787';

function parseArgs(argv) {
  const out = { api: 'chat', models: 'Auto', turns: 3, maxTokens: 512, delay: 0, prompt: '', effort: '' };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => argv[++i];
    if (arg === '--api') out.api = next();
    else if (arg === '--models') out.models = next();
    else if (arg === '--turns') out.turns = Number(next());
    else if (arg === '--max-tokens') out.maxTokens = Number(next());
    else if (arg === '--delay') out.delay = Number(next());
    else if (arg === '--prompt') out.prompt = next();
    else if (arg === '--effort') out.effort = next();
  }
  return out;
}

const PROMPT =
  'Escreva exatamente 250 palavras explicando, em portugues, como um compilador transforma ' +
  'codigo-fonte em binario. Sem listas, sem titulo, so paragrafos corridos.';

export function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index];
}

export function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function bodyFor(api, model, maxTokens, prompt, effort) {
  const extra = effort ? { reasoning_effort: effort } : {};
  if (api === 'messages') {
    return {
      model,
      stream: true,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
      ...extra,
    };
  }
  return {
    model,
    stream: true,
    max_tokens: maxTokens,
    stream_options: { include_usage: true },
    messages: [{ role: 'user', content: prompt }],
    ...extra,
  };
}

// Returns the text and reasoning carried by one SSE block, for either API.
export function readEvent(api, block) {
  let event = '';
  const dataLines = [];
  for (const line of block.split(/\r?\n/)) {
    if (line.startsWith('event:')) event = line.slice(6).trim();
    else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
  }
  const data = dataLines.join('\n');
  if (!data || data === '[DONE]') return null;
  let json;
  try { json = JSON.parse(data); } catch { return null; }

  if (api === 'messages') {
    if (event === 'content_block_delta' && json.delta?.type === 'text_delta') return { text: json.delta.text || '', kind: 'text' };
    if (event === 'content_block_delta' && json.delta?.type === 'thinking_delta') return { text: json.delta.thinking || '', kind: 'reasoning' };
    if (event === 'message_delta' && json.usage) return { usage: { output: json.usage.output_tokens, input: json.usage.input_tokens } };
    if (event === 'message_stop') return { done: true };
    return null;
  }

  const choice = json.choices?.[0];
  const delta = choice?.delta || {};
  if (typeof delta.content === 'string' && delta.content) return { text: delta.content, kind: 'text' };
  if (typeof delta.reasoning_content === 'string' && delta.reasoning_content) return { text: delta.reasoning_content, kind: 'reasoning' };
  if (json.usage && json.usage.completion_tokens !== undefined) return { usage: { output: json.usage.completion_tokens, input: json.usage.prompt_tokens } };
  return null;
}

async function once({ api, model, maxTokens, prompt, effort }) {
  const startedAt = Date.now();
  const res = await fetch(`${BASE}/v1/${api === 'messages' ? 'messages' : 'chat/completions'}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'anthropic-version': '2023-06-01' },
    body: JSON.stringify(bodyFor(api, model, maxTokens, prompt, effort)),
  });
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '');
    return { status: res.status, error: text.slice(0, 200) };
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  let firstByteAt = 0;
  let firstTextAt = 0;
  let firstAnyAt = 0;
  let lastTextAt = 0;
  let text = '';
  let reasoning = '';
  let usage = null;
  let stamps = [];

  const consume = (block) => {
    const event = readEvent(api, block);
    if (!event) return;
    if (event.usage) { usage = event.usage; return; }
    if (!event.text) return;
    const at = Date.now() - startedAt;
    if (!firstAnyAt) firstAnyAt = at;
    if (event.kind === 'text') {
      if (!firstTextAt) firstTextAt = at;
      lastTextAt = at;
      text += event.text;
      stamps.push(at);
    } else {
      reasoning += event.text;
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (!firstByteAt) firstByteAt = Date.now() - startedAt;
    buf += decoder.decode(value, { stream: true });
    let nl;
    while ((nl = buf.indexOf('\n\n')) !== -1) {
      const block = buf.slice(0, nl);
      buf = buf.slice(nl + 2);
      consume(block);
    }
  }
  if (buf.trim()) consume(buf);

  const total = Date.now() - startedAt;
  const genMs = firstTextAt ? Math.max(1, lastTextAt - firstTextAt) : 0;
  const textTokens = Math.round(text.length / 4);
  const thinkTokens = Math.round(reasoning.length / 4);
  const outTokens = usage?.output ?? textTokens + thinkTokens;
  const gaps = [];
  for (let i = 1; i < stamps.length; i += 1) gaps.push(stamps[i] - stamps[i - 1]);

  return {
    status: res.status,
    ttft: firstByteAt,
    ttftText: firstTextAt,
    ttftAny: firstAnyAt,
    total,
    genMs,
    outTokens,
    textTokens,
    thinkTokens,
    tps: genMs ? textTokens / (genMs / 1000) : 0,
    tpsWall: total ? textTokens / (total / 1000) : 0,
    gapP50: percentile(gaps, 50),
    gapP95: percentile(gaps, 95),
    deltas: stamps.length,
    reasoningChars: reasoning.length,
    textChars: text.length,
  };
}

export async function run(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const models = args.models.split(',').map((m) => m.trim()).filter(Boolean);
  const prompt = args.prompt || PROMPT;

  console.log(`bench api=${args.api} turns=${args.turns} max_tokens=${args.maxTokens} compress=${process.env.QODER_COMPRESS ?? 'default'}`);

  const rows = [];
  for (const model of models) {
    const runs = [];
    for (let i = 1; i <= args.turns; i += 1) {
      const r = await once({ api: args.api, model, maxTokens: args.maxTokens, prompt, effort: args.effort });
      if (r.error) {
        console.log(`${model} run ${i}: ERROR ${r.status} ${r.error}`);
        continue;
      }
      runs.push(r);
      console.log(
        `${model} run ${i}: ttft=${r.ttft}ms text=${r.ttftText}ms total=${r.total}ms ` +
        `textTok=${r.textTokens} thinkTok=${r.thinkTokens} tok/s=${r.tps.toFixed(1)} ` +
        `gap50=${r.gapP50}ms gap95=${r.gapP95}ms deltas=${r.deltas}`,
      );
      if (args.delay) await new Promise((resolve) => setTimeout(resolve, args.delay));
    }
    if (!runs.length) { rows.push({ model, failed: true }); continue; }
    rows.push({
      model,
      ttft: median(runs.map((r) => r.ttft)),
      ttftText: median(runs.map((r) => r.ttftText)),
      total: median(runs.map((r) => r.total)),
      textTokens: median(runs.map((r) => r.textTokens)),
      thinkTokens: median(runs.map((r) => r.thinkTokens)),
      tps: median(runs.map((r) => r.tps)),
      gapP50: median(runs.map((r) => r.gapP50)),
      gapP95: median(runs.map((r) => r.gapP95)),
    });
  }

  console.log('\n| model | ttft | first text | total | text tok | think tok | tok/s | gap p50 | gap p95 |');
  console.log('| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const row of rows) {
    if (row.failed) { console.log(`| ${row.model} | ERROR | | | | | | | |`); continue; }
    console.log(`| ${row.model} | ${row.ttft}ms | ${row.ttftText}ms | ${row.total}ms | ${row.textTokens} | ${row.thinkTokens} | ${row.tps.toFixed(1)} | ${row.gapP50}ms | ${row.gapP95}ms |`);
  }
  return rows;
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) await run();
