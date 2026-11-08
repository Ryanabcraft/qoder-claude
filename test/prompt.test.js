import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPrompt, extractToolCalls, renderMessageContent, systemToText } from '../src/prompt.js';

const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const image = (media = 'image/png') => ({ type: 'image', source: { type: 'base64', media_type: media, data: PNG } });

test('the superpowers block gets a direct-answer override', () => {
  const system = [{ type: 'text', text: 'SessionStart hook additional context: You have superpowers.' }];
  const out = systemToText(system);
  assert.match(out, /You have superpowers\./);
  assert.match(out, /OVERRIDE: .*Do not announce skill usage/);
});

test('a system prompt without the superpowers block is untouched', () => {
  assert.equal(systemToText('You are a coding assistant.'), 'You are a coding assistant.');
});

test('parses the tool_calls tag', () => {
  const out = extractToolCalls('Reading.\n<tool_calls>[{"name":"Read","input":{"file_path":"a.txt"}}]</tool_calls>');
  assert.equal(out.calls.length, 1);
  assert.equal(out.calls[0].name, 'Read');
  assert.equal(out.calls[0].input.file_path, 'a.txt');
  assert.equal(out.before, 'Reading.');
});

test('parses the [[tool_use]] form', () => {
  const out = extractToolCalls('[[tool_use Write {"file_path":"x.txt","content":"hi"}]]');
  assert.deepEqual(out.calls, [{ name: 'Write', input: { file_path: 'x.txt', content: 'hi' } }]);
});

test('normalizes mcp_call', () => {
  const out = extractToolCalls('[[tool_use mcp_call {"toolName":"mcp__exa__web_search_exa","arguments":{"query":"x"}}]]');
  assert.deepEqual(out.calls, [{ name: 'mcp__exa__web_search_exa', input: { query: 'x' } }]);
});

test('returns null without a tool block', () => {
  assert.equal(extractToolCalls('just text'), null);
});

test('renders an image marker and blocks', () => {
  const out = renderMessageContent([{ type: 'text', text: 'look' }, image()]);
  assert.equal(out.images.length, 1);
  assert.match(out.text, /\[\[image 1: image\/png\]\]/);
  assert.equal(out.next, 2);
});

test('drops an unsupported media type', () => {
  const out = renderMessageContent([image('image/avif')]);
  assert.equal(out.images.length, 0);
  assert.match(out.text, /\[\[image omitted\]\]/);
});

test('marks tool_result images with their id', () => {
  const out = renderMessageContent([{ type: 'tool_result', tool_use_id: 'toolu_x', content: [image()] }]);
  assert.match(out.text, /\[\[image 1: image\/png \(tool_result toolu_x\)\]\]/);
});

test('buildPrompt stays text-only without images', () => {
  const built = buildPrompt({ messages: [{ role: 'user', content: 'hello' }] });
  assert.equal(built.images.length, 0);
  assert.equal(built.blocks, null);
  assert.equal(typeof built.prompt, 'string');
});

test('buildPrompt produces anthropic blocks with an image', () => {
  const built = buildPrompt({ messages: [{ role: 'user', content: [image()] }] });
  assert.equal(built.images.length, 1);
  const imageBlock = built.blocks.find((block) => block.type === 'image');
  assert.ok(imageBlock);
  assert.equal(imageBlock.source.media_type, 'image/png');
});
