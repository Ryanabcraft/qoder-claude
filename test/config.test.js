import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qclaude-config-'));
process.env.QODER_BRIDGE_HOME = dir;

const config = await import('../src/config.js');

test.after(() => fs.rmSync(dir, { recursive: true, force: true }));

test('defaults are normalized', () => {
  const cfg = config.normalize({});
  assert.equal(cfg.port, 8787);
  assert.equal(cfg.transport, 'auto');
  assert.equal(cfg.contextWindow, 1000000);
  assert.equal(cfg.thinking, '');
});

test('invalid values are clamped or reset', () => {
  const cfg = config.normalize({ port: 99999, poolSize: 0, contextWindow: 1, thinking: 'nope', effort: 'max', transport: 'x' });
  assert.equal(cfg.port, 65535);
  assert.equal(cfg.poolSize, 1);
  assert.equal(cfg.contextWindow, 100000);
  assert.equal(cfg.thinking, '');
  assert.equal(cfg.effort, '');
  assert.equal(cfg.transport, 'auto');
});

test('saveConfig writes the file, masks the key and updates live env', () => {
  const result = config.saveConfig({ apiKey: 'super-secret', stallMs: 120000, maxAttempts: 2 });
  assert.equal(result.ok, true);
  assert.equal(result.config.apiKeySet, true);
  assert.equal('apiKey' in result.config, false);
  assert.equal(result.config.stallMs, 120000);
  assert.equal(process.env.BRIDGE_STALL_MS, '120000');
  assert.equal(process.env.BRIDGE_MAX_ATTEMPTS, '2');
  const raw = JSON.parse(fs.readFileSync(config.CONFIG_PATH, 'utf8'));
  assert.equal(raw.apiKey, 'super-secret');
});

test('a second save keeps the previous config as backup', () => {
  const result = config.saveConfig({ stallMs: 130000 });
  assert.equal(result.ok, true);
  assert.ok(fs.existsSync(config.CONFIG_PATH + '.bak'));
});

test('publicConfig never exposes the API key', () => {
  const cfg = config.publicConfig();
  assert.equal(cfg.apiKeySet, true);
  assert.equal('apiKey' in cfg, false);
});

test('startup keys are reported as requiring a restart', () => {
  const result = config.saveConfig({ apiKey: 'another-key' });
  assert.equal(result.ok, true);
  assert.ok(result.restartRequired.includes('apiKey'));
});
