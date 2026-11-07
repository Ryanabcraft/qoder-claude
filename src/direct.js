import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { blocksToText, systemToText } from './prompt.js';

const require = createRequire(import.meta.url);
const auth = require('../vendor/qoder-auth.cjs');

const CONFIG_DIR =
  process.env.QODER_CONFIG_DIR || path.join(process.env.USERPROFILE || process.env.HOME || '', '.qoder');
const ENDPOINT = process.env.QODER_INFER_ENDPOINT || 'https://api1.qoder.sh';
const AGENT_ID = process.env.QODER_AGENT_ID || 'agent_common';
const VERSION = process.env.QODER_CLI_VERSION || '1.1.84';

const cache = new Map();

function configDirFor(dir) {
  return dir || CONFIG_DIR;
}

function context(dir, force = false) {
  const root = configDirFor(dir);
  const cached = cache.get(root);
  if (cached && !force) return cached;
  const userFile = path.join(root, '.auth', 'user');
  const midFile = path.join(root, '.auth', 'machine_id');
  const user = fs.readFileSync(userFile, 'utf8').trim();
  const mid = fs.readFileSync(midFile, 'utf8').trim();

  auth.init();
  const creds = JSON.parse(auth.credentialDecrypt(user, mid.slice(0, 16)));
  const fields = JSON.parse(
    auth.generateRuntimeAuthFields(
      JSON.stringify({
        uid: creds.uid,
        security_oauth_token: creds.security_oauth_token,
        data_policy_agreed: true,
      }),
    ),
  );
  const info = JSON.stringify({
    uid: creds.uid,
    encrypt_user_info: fields.encrypt_user_info,
    key: fields.key,
    data_policy_agreed: true,
  });
  const client = JSON.stringify({
    client_type: '5',
    business_product: 'cli',
    business_type: 'agent',
    scene: 'assistant',
  });
  const ctx = new auth.QoderContext(mid, VERSION, info, client);
  const built = { ctx, uid: creds.uid };
  cache.set(root, built);
  return built;
}

export function forgetContext(dir) {
  cache.delete(configDirFor(dir));
}

function buildPayload(body, model) {
  const messages = [];
  const system = systemToText(body.system);
  if (system) messages.push({ role: 'system', content: system });

  for (const m of Array.isArray(body.messages) ? body.messages : []) {
    const role = m.role === 'assistant' ? 'assistant' : 'user';
    const content = blocksToText(m.content);
    if (content) messages.push({ role, content });
  }

  const payload = { messages, model: String(model).toLowerCase(), agent_id: AGENT_ID };

  if (Array.isArray(body.tools) && body.tools.length) {
    payload.tools = body.tools.map((t) => ({
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
  return JSON.parse(env.body);
}

export async function directCompletion({ body, cfg, signal, onEvent }) {
  let ctx;
  try {
    ({ ctx } = context(cfg.configDir));
  } catch (e) {
    return { text: '', usage: {}, error: `not logged in: ${e.message}` };
  }
  const payload = buildPayload(body, cfg.model);
  const req = ctx.prepareInferRequest(ENDPOINT, JSON.stringify(payload), cfg.model, '');
  const headers = Object.fromEntries(req.headers);

  let res;
  try {
    res = await fetch(req.url, { method: 'POST', headers, body: req.body, signal });
  } catch (e) {
    if (e.name === 'AbortError') return { text: '', usage: {}, error: null };
    return { text: '', usage: {}, error: String(e.message || e) };
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return { text: '', usage: {}, error: `upstream ${res.status}: ${text.slice(0, 300)}` };
  }

  let text = '';
  let usage = {};
  const calls = new Map();
  const decoder = new TextDecoder();
  let buf = '';

  const handleLine = (raw) => {
    const line = raw.trim();
    if (!line.startsWith('data:')) return;
    const data = line.slice(5).trim();
    if (!data || data === '[DONE]') return;
    let chunk;
    try { chunk = parseEnvelope(data); } catch (e) { return; }

    if (chunk.usage) usage = chunk.usage;
    const choice = chunk.choices && chunk.choices[0];
    if (!choice) return;
    const delta = choice.delta || {};

    if (typeof delta.content === 'string' && delta.content) {
      text += delta.content;
      if (onEvent) onEvent({ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: delta.content } });
    }
    if (Array.isArray(delta.tool_calls)) {
      for (const tc of delta.tool_calls) {
        const i = tc.index ?? 0;
        const cur = calls.get(i) || { id: '', name: '', arguments: '' };
        if (tc.id) cur.id = tc.id;
        if (tc.function?.name) cur.name = tc.function.name;
        if (tc.function?.arguments) cur.arguments += tc.function.arguments;
        calls.set(i, cur);
      }
    }
  };

  const reader = res.body.getReader();
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nl;
    while ((nl = buf.indexOf('\n')) !== -1) {
      const line = buf.slice(0, nl);
      buf = buf.slice(nl + 1);
      handleLine(line);
    }
  }
  if (buf.trim()) handleLine(buf);

  if (calls.size) {
    const list = [...calls.values()]
      .filter((c) => c.name)
      .map((c) => {
        let input = {};
        try { input = JSON.parse(c.arguments || '{}'); } catch {}
        return { name: c.name, input };
      });
    if (list.length) {
      const block = `\n<tool_calls>${JSON.stringify(list)}</tool_calls>`;
      text += block;
      if (onEvent) onEvent({ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: block } });
    }
  }

  return { text, usage, error: null };
}
