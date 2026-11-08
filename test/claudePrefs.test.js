import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readClaudePrefs, updateClaudePrefs } from '../src/claudePrefs.js';

const home = fs.mkdtempSync(path.join(os.tmpdir(), 'qclaude-prefs-'));
const claudeDir = path.join(home, '.claude');
fs.mkdirSync(claudeDir, { recursive: true });
const file = path.join(claudeDir, 'settings.json');

test.before(() => {
  fs.writeFileSync(file, JSON.stringify({
    model: 'Auto',
    env: {
      ANTHROPIC_AUTH_TOKEN: 'do-not-leak',
      CLAUDE_CODE_MAX_CONTEXT_TOKENS: '1000000',
    },
    permissions: { allow: ['WebSearch'] },
  }));
});

test.after(() => fs.rmSync(home, { recursive: true, force: true }));

test('reads prefs without exposing the token', () => {
  const prefs = readClaudePrefs(home);
  assert.equal(prefs.model, 'Auto');
  assert.equal(prefs.oneMillion, true);
  assert.equal('token' in prefs, false);
  assert.equal(JSON.stringify(prefs).includes('do-not-leak'), false);
});

test('updates the model and the 1M context with a backup', () => {
  const result = updateClaudePrefs({ model: 'DeepSeek-Flash', oneMillion: true }, home);
  assert.equal(result.ok, true);
  assert.equal(result.prefs.model, 'DeepSeek-Flash');
  assert.equal(result.prefs.oneMillion, true);
  assert.ok(fs.readdirSync(claudeDir).some((name) => name.startsWith('settings.json.bak-dashboard-')));
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.equal(raw.env.ANTHROPIC_AUTH_TOKEN, 'do-not-leak');
});

test('an invalid model is rejected without writing', () => {
  const result = updateClaudePrefs({ model: '<script>' }, home);
  assert.equal(result.ok, false);
  assert.match(result.error, /invalid model/);
});
