import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';

function textOf(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return content == null ? '' : String(content);
  return content
    .map((part) => {
      if (typeof part === 'string') return part;
      if (part?.type === 'input_text' || part?.type === 'output_text' || part?.type === 'text') return part.text || '';
      return '';
    })
    .join('\n')
    .trim();
}

// Responses API request → the chat request the bridge already knows.
export function toChatRequest(body = {}) {
  const messages = [];
  if (body.instructions) messages.push({ role: 'system', content: textOf(body.instructions) });

  const input = body.input;
  if (typeof input === 'string') {
    messages.push({ role: 'user', content: input });
  } else if (Array.isArray(input)) {
    for (const item of input) {
      if (typeof item === 'string') {
        messages.push({ role: 'user', content: item });
        continue;
      }
      if (item?.type === 'function_call_output') {
        messages.push({ role: 'tool', tool_call_id: item.call_id || item.id || 'tool', content: textOf(item.output) });
        continue;
      }
      if (item?.type === 'function_call') {
        messages.push({
          role: 'assistant',
          content: '',
          tool_calls: [{ id: item.call_id || item.id || 'call', type: 'function', function: { name: item.name || '', arguments: item.arguments || '{}' } }],
        });
        continue;
      }
      const role = item?.role === 'assistant' ? 'assistant' : item?.role === 'system' ? 'system' : 'user';
      messages.push({ role, content: textOf(item?.content) });
    }
  }

  const tools = Array.isArray(body.tools)
    ? body.tools
        .filter((tool) => tool?.type === 'function' && tool.name)
        .map((tool) => ({
          type: 'function',
          function: { name: tool.name, description: tool.description || '', parameters: tool.parameters || { type: 'object', properties: {} } },
        }))
    : [];

  return { model: body.model, messages, tools, stream: body.stream === true };
}

const usageOf = (usage) => {
  const input = Number(usage?.input_tokens ?? usage?.prompt_tokens) || 0;
  const output = Number(usage?.output_tokens ?? usage?.completion_tokens) || 0;
  return { input_tokens: input, output_tokens: output, total_tokens: input + output };
};

export function createResponsesAdapter({ res, model, stream = true }) {
  const emitter = new EventEmitter();
  const state = {
    id: `resp_${randomUUID().replace(/-/g, '').slice(0, 24)}`,
    createdAt: Math.floor(Date.now() / 1000),
    started: false,
    finished: false,
    status: 200,
    seq: 0,
    text: '',
    parts: [],
    output: [],
    usage: { input_tokens: 0, output_tokens: 0, total_tokens: 0 },
    itemIndex: 0,
    textItem: null,
    toolIndex: -1,
    tools: new Map(),
    buffer: '',
  };

  const send = (type, payload) => {
    if (!stream) return;
    state.seq += 1;
    res.write(`event: ${type}\ndata: ${JSON.stringify({ type, sequence_number: state.seq, ...payload })}\n\n`);
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
    send('response.created', {
      response: {
        id: state.id,
        object: 'response',
        created_at: state.createdAt,
        status: 'in_progress',
        model,
        output: [],
      },
    });
  };

  const startTextItem = () => {
    if (state.textItem) return;
    state.textItem = { id: `msg_${randomUUID().replace(/-/g, '').slice(0, 20)}`, index: state.itemIndex++ };
    send('response.output_item.added', {
      output_index: state.textItem.index,
      item: { id: state.textItem.id, type: 'message', status: 'in_progress', role: 'assistant', content: [] },
    });
    send('response.content_part.added', {
      item_id: state.textItem.id,
      output_index: state.textItem.index,
      content_index: 0,
      part: { type: 'output_text', text: '', annotations: [] },
    });
  };

  const closeTextItem = () => {
    if (!state.textItem) return;
    const { id, index } = state.textItem;
    send('response.output_text.done', { item_id: id, output_index: index, content_index: 0, text: state.text });
    send('response.content_part.done', { item_id: id, output_index: index, content_index: 0, part: { type: 'output_text', text: state.text, annotations: [] } });
    const item = { id, type: 'message', status: 'completed', role: 'assistant', content: [{ type: 'output_text', text: state.text, annotations: [] }] };
    send('response.output_item.done', { output_index: index, item });
    state.output.push(item);
    state.textItem = null;
    state.text = '';
  };

  const handle = (event, data) => {
    if (event === 'content_block_start') {
      const block = data?.content_block;
      if (block?.type === 'tool_use') {
        closeTextItem();
        state.toolIndex += 1;
        const entry = { index: state.itemIndex++, id: block.id, name: block.name, args: '' };
        state.tools.set(data.index, entry);
        send('response.output_item.added', {
          output_index: entry.index,
          item: { id: `fc_${entry.id}`, type: 'function_call', status: 'in_progress', call_id: entry.id, name: entry.name, arguments: '' },
        });
      }
      return;
    }
    if (event === 'content_block_delta') {
      const delta = data?.delta;
      if (delta?.type === 'text_delta' && delta.text) {
        startTextItem();
        state.text += delta.text;
        send('response.output_text.delta', {
          item_id: state.textItem.id,
          output_index: state.textItem.index,
          content_index: 0,
          delta: delta.text,
        });
        return;
      }
      if (delta?.type === 'input_json_delta') {
        const tool = state.tools.get(data.index);
        if (!tool) return;
        tool.args += delta.partial_json || '';
        send('response.function_call_arguments.delta', {
          item_id: `fc_${tool.id}`,
          output_index: tool.index,
          delta: delta.partial_json || '',
        });
      }
      return;
    }
    if (event === 'content_block_stop') {
      const tool = state.tools.get(data?.index);
      if (!tool) return;
      send('response.function_call_arguments.done', { item_id: `fc_${tool.id}`, output_index: tool.index, arguments: tool.args || '{}' });
      const item = {
        id: `fc_${tool.id}`,
        type: 'function_call',
        status: 'completed',
        call_id: tool.id,
        name: tool.name,
        arguments: tool.args || '{}',
      };
      send('response.output_item.done', { output_index: tool.index, item });
      state.output.push(item);
      return;
    }
    if (event === 'message_delta' && data?.usage) {
      state.usage = usageOf(data.usage);
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
    closeTextItem();
    if (stream) {
      send('response.completed', {
        response: {
          id: state.id,
          object: 'response',
          created_at: state.createdAt,
          status: 'completed',
          model,
          output: state.output,
          usage: state.usage,
        },
      });
      res.end();
      return;
    }
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({
      id: state.id,
      object: 'response',
      created_at: state.createdAt,
      status: 'completed',
      model,
      output: state.output,
      usage: state.usage,
    }));
  };

  const proxy = {
    statusCode: 200,
    writableEnded: false,
    headersSent: false,
    get started() { return state.started; },
    setHeader() {},
    getHeader() { return undefined; },
    writeHead(status) {
      state.status = status;
      proxy.statusCode = status;
      proxy.headersSent = true;
      if (status !== 200) res.writeHead(status, { 'content-type': 'application/json' });
    },
    write(payload) {
      if (state.status !== 200) {
        res.write(payload);
        return true;
      }
      state.buffer += String(payload);
      begin();
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
    event(name, data) {
      begin();
      handle(name, data);
    },
    once: (event, fn) => { emitter.once(event, fn); return proxy; },
    on: (event, fn) => { emitter.on(event, fn); return proxy; },
  };

  try { res.on('close', () => emitter.emit('close')); } catch {}
  return proxy;
}
