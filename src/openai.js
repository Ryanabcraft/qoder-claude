import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';

function textOf(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content
    .map((part) => {
      if (typeof part === 'string') return part;
      if (part?.type === 'text' || part?.type === 'input_text') return part.text || '';
      return '';
    })
    .join('\n')
    .trim();
}

function parseArgs(raw) {
  if (raw && typeof raw === 'object') return raw;
  try {
    const parsed = JSON.parse(String(raw || '{}'));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function imageBlock(part) {
  const url = part?.image_url?.url || part?.image_url || '';
  const match = /^data:([^;]+);base64,(.+)$/.exec(String(url));
  if (!match) return null;
  return { type: 'image', source: { type: 'base64', media_type: match[1], data: match[2] } };
}

function toBlocks(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return textOf(content);
  const blocks = [];
  for (const part of content) {
    if (part?.type === 'text' || part?.type === 'input_text') {
      if (part.text) blocks.push({ type: 'text', text: part.text });
      continue;
    }
    if (part?.type === 'image_url') {
      const image = imageBlock(part);
      if (image) blocks.push(image);
      continue;
    }
    if (typeof part === 'string') blocks.push({ type: 'text', text: part });
  }
  return blocks.length ? blocks : '';
}

export function toAnthropicRequest(body = {}) {
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const system = [];
  const out = [];
  for (const message of messages) {
    const role = message?.role;
    if (role === 'system' || role === 'developer') {
      const text = textOf(message.content);
      if (text) system.push(text);
      continue;
    }
    if (role === 'assistant') {
      const blocks = [];
      const text = textOf(message.content);
      if (text) blocks.push({ type: 'text', text });
      for (const call of message.tool_calls || []) {
        const name = call?.function?.name;
        if (!name) continue;
        blocks.push({
          type: 'tool_use',
          id: call.id || `call_${randomUUID().replace(/-/g, '').slice(0, 20)}`,
          name,
          input: parseArgs(call.function?.arguments),
        });
      }
      out.push({ role: 'assistant', content: blocks.length ? blocks : (text || '') });
      continue;
    }
    if (role === 'tool' || role === 'function') {
      const result = textOf(message.content) || String(message.content ?? '');
      out.push({
        role: 'user',
        content: [{ type: 'tool_result', tool_use_id: message.tool_call_id || message.name || 'tool', content: result }],
      });
      continue;
    }
    out.push({ role: 'user', content: toBlocks(message.content) });
  }

  const request = { model: body.model, messages: out, stream: true };
  if (system.length) request.system = system.join('\n\n');
  if (Array.isArray(body.tools) && body.tools.length) {
    request.tools = body.tools
      .map((tool) => {
        const fn = tool?.type === 'function' ? tool.function : tool;
        if (!fn?.name) return null;
        return {
          name: fn.name,
          description: fn.description || '',
          input_schema: fn.parameters || { type: 'object', properties: {} },
        };
      })
      .filter(Boolean);
  }
  const maxTokens = body.max_completion_tokens ?? body.max_tokens;
  if (Number.isFinite(Number(maxTokens)) && Number(maxTokens) > 0) request.max_tokens = Number(maxTokens);
  if (body.temperature !== undefined) request.temperature = body.temperature;
  if (body.top_p !== undefined) request.top_p = body.top_p;
  if (body.stop !== undefined) request.stop_sequences = Array.isArray(body.stop) ? body.stop : [body.stop];
  return request;
}

const STOP_REASON = {
  end_turn: 'stop',
  stop_sequence: 'stop',
  max_tokens: 'length',
  tool_use: 'tool_calls',
};

export function openAiUsage(usage) {
  const input = Number(usage?.input_tokens) || 0;
  const output = Number(usage?.output_tokens) || 0;
  return { prompt_tokens: input, completion_tokens: output, total_tokens: input + output };
}

// Runs the Anthropic handler and re-emits its stream as OpenAI chunks. One code
// path serves both stream:true and stream:false, so the agent loop never forks.
export function createOpenAiAdapter({ res, model, stream = true, includeUsage = false }) {
  const emitter = new EventEmitter();
  const state = {
    status: 200,
    headers: {},
    started: false,
    finished: false,
    buffer: '',
    id: `chatcmpl-${randomUUID().replace(/-/g, '').slice(0, 24)}`,
    created: Math.floor(Date.now() / 1000),
    text: '',
    toolIndex: -1,
    tools: new Map(),
    stop: 'stop',
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    raw: '',
  };

  const chunk = (delta, finish = null) => {
    if (!stream) return;
    const payload = {
      id: state.id,
      object: 'chat.completion.chunk',
      created: state.created,
      model,
      choices: [{ index: 0, delta, finish_reason: finish, logprobs: null }],
    };
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  const begin = () => {
    if (state.started || state.status !== 200) return;
    state.started = true;
    if (!stream) return;
    res.writeHead(200, {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
      'x-accel-buffering': 'no',
    });
    chunk({ role: 'assistant', content: '' });
  };

  const handle = (event, data) => {
    if (event === 'message_start') {
      const usage = data?.message?.usage;
      if (usage) state.usage = openAiUsage(usage);
      return;
    }
    if (event === 'content_block_start') {
      const block = data?.content_block;
      if (block?.type === 'tool_use') {
        state.toolIndex += 1;
        state.tools.set(data.index, { index: state.toolIndex, id: block.id, name: block.name, args: '' });
        chunk({
          tool_calls: [{
            index: state.toolIndex,
            id: block.id,
            type: 'function',
            function: { name: block.name, arguments: '' },
          }],
        });
      }
      return;
    }
    if (event === 'content_block_delta') {
      const delta = data?.delta;
      if (delta?.type === 'text_delta' && delta.text) {
        state.text += delta.text;
        chunk({ content: delta.text });
        return;
      }
      if (delta?.type === 'input_json_delta') {
        const tool = state.tools.get(data.index);
        if (!tool) return;
        tool.args += delta.partial_json || '';
        chunk({ tool_calls: [{ index: tool.index, function: { arguments: delta.partial_json || '' } }] });
      }
      return;
    }
    if (event === 'message_delta') {
      const reason = data?.delta?.stop_reason;
      if (reason) state.stop = STOP_REASON[reason] || 'stop';
      if (data?.usage) {
        const next = openAiUsage(data.usage);
        state.usage = {
          prompt_tokens: state.usage.prompt_tokens || next.prompt_tokens,
          completion_tokens: next.completion_tokens || state.usage.completion_tokens,
          total_tokens: (state.usage.prompt_tokens || next.prompt_tokens) + (next.completion_tokens || state.usage.completion_tokens),
        };
      }
      return;
    }
    if (event === 'error') {
      state.error = data?.error?.message || 'upstream error';
    }
  };

  const parseBlock = (block) => {
    let event = 'message';
    const dataLines = [];
    for (const line of block.split(/\r?\n/)) {
      if (line.startsWith('event:')) event = line.slice(6).trim();
      else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
    }
    if (!dataLines.length) return;
    try {
      handle(event, JSON.parse(dataLines.join('\n')));
    } catch {}
  };

  const flush = () => {
    let index = state.buffer.indexOf('\n\n');
    while (index !== -1) {
      const block = state.buffer.slice(0, index);
      state.buffer = state.buffer.slice(index + 2);
      parseBlock(block);
      index = state.buffer.indexOf('\n\n');
    }
  };

  const finish = () => {
    if (state.finished) return;
    state.finished = true;
    if (state.status !== 200) return;
    begin();
    if (stream) {
      chunk({}, state.stop);
      if (includeUsage) {
        res.write(`data: ${JSON.stringify({
          id: state.id,
          object: 'chat.completion.chunk',
          created: state.created,
          model,
          choices: [],
          usage: state.usage,
        })}\n\n`);
      }
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }
    const toolCalls = [...state.tools.values()].map((tool) => ({
      id: tool.id,
      type: 'function',
      function: { name: tool.name, arguments: tool.args || '{}' },
    }));
    const message = { role: 'assistant', content: state.text || (toolCalls.length ? null : '') };
    if (toolCalls.length) message.tool_calls = toolCalls;
    const body = {
      id: state.id,
      object: 'chat.completion',
      created: state.created,
      model,
      choices: [{ index: 0, message, finish_reason: state.stop, logprobs: null }],
      usage: state.usage,
    };
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(body));
  };

  try { res.on('close', () => emitter.emit('close')); } catch {}

  const proxy = {
    statusCode: 200,
    event(name, data) {
      if (state.status !== 200) return;
      begin();
      handle(name, data);
      if (name === 'message_delta' || name === 'message_stop') {
        state.buffer = '';
      }
    },
    get started() {
      return state.started;
    },
    writableEnded: false,
    headersSent: false,
    setHeader(name, value) {
      state.headers[name] = value;
    },
    getHeader(name) {
      return state.headers[name];
    },
    writeHead(status, headers) {
      state.status = status;
      proxy.statusCode = status;
      proxy.headersSent = true;
      if (headers && typeof headers === 'object') Object.assign(state.headers, headers);
      if (status !== 200) res.writeHead(status, state.headers);
    },
    write(payload) {
      if (state.status !== 200) {
        res.write(payload);
        return true;
      }
      state.raw += String(payload);
      begin();
      state.buffer += String(payload);
      flush();
      return true;
    },
    end(payload) {
      if (state.status !== 200) {
        res.end(payload);
        proxy.writableEnded = true;
        emitter.emit('finish');
        return;
      }
      if (payload) proxy.write(payload);
      flush();
      finish();
      proxy.writableEnded = true;
      emitter.emit('finish');
    },
    once(event, fn) {
      emitter.once(event, fn);
      return proxy;
    },
    on(event, fn) {
      emitter.on(event, fn);
      return proxy;
    },
    emit(event, ...args) {
      return emitter.emit(event, ...args);
    },
  };
  return proxy;
}
