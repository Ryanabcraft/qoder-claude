import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveToolName, toolNames } from '../src/toolNames.js';

const catalog = ['Bash', 'Read', 'Write', 'mcp__openbot__send_message', 'mcp__exa__web_search_exa'];

test('an exact name is kept', () => {
  assert.equal(resolveToolName('Bash', catalog), 'Bash');
});

test('case and separator drift is repaired', () => {
  assert.equal(resolveToolName('bash', catalog), 'Bash');
  assert.equal(resolveToolName('READ', catalog), 'Read');
  assert.equal(resolveToolName('openbot.send_message', catalog), 'mcp__openbot__send_message');
  assert.equal(resolveToolName('send_message', catalog), 'mcp__openbot__send_message');
});

test('an alias is used when the catalog has the canonical name', () => {
  assert.equal(resolveToolName('web_search', catalog), 'WebSearch');
  assert.equal(resolveToolName('shell', catalog), 'Bash');
});

test('an unknown name is passed through untouched', () => {
  assert.equal(resolveToolName('totally_new_tool', catalog), 'totally_new_tool');
});

test('tool names read both request shapes', () => {
  assert.deepEqual(
    toolNames([{ name: 'Read' }, { type: 'function', function: { name: 'Bash' } }]),
    ['Read', 'Bash'],
  );
});
