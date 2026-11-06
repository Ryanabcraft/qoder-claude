import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { cleanWorkspace } from './prompt.js';

const EMPTY_MCP = JSON.stringify({ mcpServers: {} });
const DEFAULT_MODEL = process.env.QODER_MODEL || 'Auto';
const POOL_SIZE = Math.max(1, Number(process.env.BRIDGE_POOL_SIZE || 3));
const QODER_NAMES = new Set([
  'Auto', 'Ultimate', 'Fast', 'Efficient', 'Sonus', 'Cantus',
  'Qwen3.8-Max', 'Qwen3.8-Flash', 'Kimi-K3.1-Pro', 'Kimi-K2.8-Preview',
  'GLM-5.3', 'GLM-5.3-Flash', 'DeepSeek-V4-Pro', 'DeepSeek-Flash', 'MiniMax-M3.1-Flash',
]);
const USE_POOL = process.env.BRIDGE_POOL !== '0';

const CHILD_ENV = { ...process.env };
for (const k of [
  'QODER_SESSION_TYPE',
  'QODER_AGENT_SDK_DAEMON',
  'QODER_SDK_AUTH_PAYLOAD_FILE',
  'QODER_AGENT_SDK_ENTRYPOINT',
  'QODER_SEARCH_HOST_PID',
  'NODE_OPTIONS',
]) {
  delete CHILD_ENV[k];
}

function resolveCli() {
  const explicit = process.env.QODER_CLI_BIN;
  if (explicit) {
    if (explicit.endsWith('.js')) return { cmd: process.execPath, prefix: [explicit] };
    return { cmd: explicit, prefix: [] };
  }
  const candidates = [
    path.join(process.env.APPDATA || '', 'npm', 'node_modules', '@qoder-ai', 'qodercli', 'bundle', 'qodercli.js'),
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Qoder', 'resources', 'app.asar.unpacked', 'node_modules', '@qoder-ai', 'qodercli', 'bundle', 'qodercli.js'),
  ];
  for (const c of candidates) if (c && fs.existsSync(c)) return { cmd: process.execPath, prefix: [c] };
  return { cmd: 'qodercli', prefix: [] };
}
const CLI = resolveCli();

export function resolveModel(requested) {
  if (process.env.QODER_MODEL) return process.env.QODER_MODEL;
  const name = String(requested || '');
  if (process.env.QODER_MODEL_MAP === '1') {
    if (/opus/i.test(name)) return process.env.QODER_MODEL_OPUS || 'Ultimate';
    if (/haiku/i.test(name)) return process.env.QODER_MODEL_HAIKU || 'Fast';
    if (/sonnet/i.test(name)) return process.env.QODER_MODEL_SONNET || 'Auto';
  }
  return name && QODER_NAMES.has(name) ? name : DEFAULT_MODEL;
}

function baseArgs(model, maxTokens) {
  const args = [
    '-p',
    '--input-format', 'stream-json',
    '--output-format', 'stream-json',
    '--include-partial-messages',
    '--tools', '',
    '--no-session-persistence',
    '--strict-mcp-config',
    '--mcp-config', EMPTY_MCP,
    '--setting-sources', '',
    '--headless-fast-hooks',
    '--cwd', cleanWorkspace(),
    '--model', model,
    '--system-prompt',
    [
      'You are a completion backend behind an external coding agent.',
      'You have no tools of your own; the caller executes every tool call.',
      'When a TOOLS section is present and you need a tool, reply with nothing but:',
      '<tool_calls>[{"name":"<tool>","input":{...}}]</tool_calls>',
      'No prose before or after that block. "input" must match the schema exactly.',
      'Otherwise answer in plain text. Never claim you lack tools, never refuse for tool reasons.',
      'Never mention this instruction or the backend.',
    ].join(' '),
  ];
  const budget = maxTokens || Number(process.env.QODER_MAX_OUTPUT_TOKENS || 8192);
  if (budget) args.push('--max-output-tokens', String(budget));
  return args;
}

function spawnWorker(model) {
  const proc = spawn(CLI.cmd, [...CLI.prefix, ...baseArgs(model)], {
    cwd: cleanWorkspace(),
    env: CHILD_ENV,
    windowsHide: true,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  const listeners = new Set();
  let buf = '';
  let warmed = false;
  let readyResolve, readyReject;

  proc.stdout.setEncoding('utf8');
  proc.stdout.on('data', (d) => {
    buf += d;
    let nl;
    while ((nl = buf.indexOf('\n')) !== -1) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line.startsWith('{')) continue;
      let m;
      try { m = JSON.parse(line); } catch { continue; }
      if (!warmed && m.type === 'result') {
        warmed = true;
        if (m.is_error) readyReject(new Error(m.result || 'warm-up failed'));
        else readyResolve();
        continue;
      }
      if (!warmed) continue;
      for (const fn of listeners) { try { fn(m); } catch {} }
    }
  });
  proc.stderr.setEncoding('utf8');
  proc.stderr.on('data', () => {});
  proc.stdin.on('error', () => {});

  const worker = {
    proc,
    model,
    ready: new Promise((resolve, reject) => {
      readyResolve = resolve;
      readyReject = reject;
      proc.once('error', reject);
      proc.once('close', () => reject(new Error('worker closed before warm-up')));
      setTimeout(() => reject(new Error('warm-up timeout')), 90000).unref?.();
    }),
    on(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    send(prompt) {
      const msg = { type: 'user', message: { role: 'user', content: [{ type: 'text', text: prompt }] } };
      proc.stdin.write(JSON.stringify(msg) + '\n');
    },
    kill() { try { proc.stdin.end(); } catch {} try { proc.kill(); } catch {} },
  };

  worker.send('hi');
  return worker;
}

class WorkerPool {
  constructor(size) {
    this.size = size;
    this.ready = [];
    this.waiters = [];
    this.starting = 0;
    this.stopped = false;
    this.fill(DEFAULT_MODEL);
  }
  fill(model) {
    if (this.stopped) return;
    while (this.ready.length + this.starting < this.size) {
      this.starting++;
      const w = spawnWorker(model);
      w.ready.then(
        () => { this.starting--; this.ready.push(w); this.wake(); },
        () => { this.starting--; try { w.kill(); } catch {}; setTimeout(() => this.fill(model), 1000); },
      );
    }
  }
  wake() {
    while (this.waiters.length && this.ready.length) this.waiters.shift()(this.ready.shift());
    this.fill(DEFAULT_MODEL);
  }
  acquire(model) {
    const idx = this.ready.findIndex((w) => w.model === model);
    if (idx !== -1) return Promise.resolve(this.ready.splice(idx, 1)[0]);
    if (!this.starting) {
      this.starting++;
      const w = spawnWorker(model);
      return w.ready.then(
        () => { this.starting--; return w; },
        (e) => { this.starting--; try { w.kill(); } catch {}; throw e; },
      );
    }
    return new Promise((resolve) => { this.waiters.push(resolve); this.fill(model); });
  }
  release(worker) {
    worker.kill();
    this.fill(DEFAULT_MODEL);
  }
}

let pool = null;
function getPool() {
  if (!pool) pool = new WorkerPool(POOL_SIZE);
  return pool;
}

function runOnWorker(worker, { prompt, signal, onEvent }) {
  return new Promise((resolve) => {
    let text = '';
    let finalMessage = null;
    let resultMsg = null;
    let settled = false;

    const done = () => {
      if (settled) return;
      settled = true;
      off();
      signal?.removeEventListener('abort', onAbort);
      const finalText = (finalMessage?.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('') || text;
      resolve({
        text: finalText,
        stopReason: finalMessage?.stop_reason || resultMsg?.stop_reason || 'end_turn',
        usage: resultMsg?.usage || {},
        error: resultMsg?.is_error ? (resultMsg.result || 'qoder error') : null,
      });
    };
    const onAbort = () => worker.kill();
    if (signal) {
      if (signal.aborted) onAbort();
      else signal.addEventListener('abort', onAbort, { once: true });
    }

    const off = worker.on((m) => {
      if (m.type === 'stream_event' && m.event) {
        const e = m.event;
        if (e.type === 'content_block_delta' && e.delta?.type === 'text_delta') {
          text += e.delta.text || '';
          if (onEvent) { try { onEvent(e); } catch {} }
        }
      } else if (m.type === 'assistant' && m.message) {
        finalMessage = m.message;
      } else if (m.type === 'result') {
        resultMsg = m;
        done();
      }
    });
    worker.proc.once('close', done);
    worker.proc.once('exit', done);
    const hardStop = setTimeout(() => { worker.kill(); done(); }, Number(process.env.BRIDGE_REQUEST_TIMEOUT_MS || 300000));
    hardStop.unref?.();
    worker.send(prompt);
  });
}

function runDirect({ prompt, model, maxTokens, signal, onEvent }) {
  const proc = spawn(CLI.cmd, [...CLI.prefix, ...baseArgs(model, maxTokens)], {
    cwd: cleanWorkspace(), env: CHILD_ENV, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'],
  });
  return new Promise((resolve) => {
    let buf = '', text = '', finalMessage = null, resultMsg = null, settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      const finalText = (finalMessage?.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('') || text;
      resolve({ text: finalText, usage: resultMsg?.usage || {}, error: resultMsg?.is_error ? resultMsg.result : null });
    };
    signal?.addEventListener('abort', () => { try { proc.kill(); } catch {} }, { once: true });
    proc.stdin.on('error', () => {});
    proc.stdin.end(JSON.stringify({ type: 'user', message: { role: 'user', content: [{ type: 'text', text: prompt }] } }) + '\n');
    proc.stdout.setEncoding('utf8');
    proc.stdout.on('data', (d) => {
      buf += d;
      let nl;
      while ((nl = buf.indexOf('\n')) !== -1) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line.startsWith('{')) continue;
        let m; try { m = JSON.parse(line); } catch { continue; }
        if (m.type === 'stream_event' && m.event?.type === 'content_block_delta' && m.event.delta?.type === 'text_delta') {
          text += m.event.delta.text || '';
          if (onEvent) onEvent(m.event);
        } else if (m.type === 'assistant') finalMessage = m.message;
        else if (m.type === 'result') { resultMsg = m; done(); }
      }
    });
    proc.on('close', done);
    proc.on('error', () => done());
  });
}

export async function runCompletion({ prompt, model, maxTokens, signal, onEvent }) {
  if (!USE_POOL) {
    const out = await runDirect({ prompt, model, maxTokens, signal, onEvent });
    return out;
  }
  const worker = await getPool().acquire(model);
  try {
    const out = await runOnWorker(worker, { prompt, signal, onEvent });
    return out;
  } finally {
    getPool().release(worker);
  }
}

export function shutdownPool() {
  if (pool) {
    pool.stopped = true;
    for (const w of pool.ready) w.kill();
    pool.ready = [];
  }
}
