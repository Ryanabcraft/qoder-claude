import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  backupAccounts,
  filterPathEntries,
  installRoots,
  isOurInstall,
  stripBridgeSettings,
} from '../src/uninstall.js';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qclaude-uninstall-'));

test.after(() => fs.rmSync(dir, { recursive: true, force: true }));

function makeInstall(name, packageName) {
  const root = path.join(dir, name);
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ name: packageName }));
  return root;
}

const fullSettings = {
  env: {
    ANTHROPIC_BASE_URL: 'http://127.0.0.1:8787',
    ANTHROPIC_AUTH_TOKEN: 'dummy',
    ANTHROPIC_DEFAULT_OPUS_MODEL: 'Ultimate',
    ANTHROPIC_DEFAULT_SONNET_MODEL: 'Auto',
    ANTHROPIC_DEFAULT_HAIKU_MODEL: 'Fast',
    ANTHROPIC_DEFAULT_OPUS_MODEL_SUPPORTED_CAPABILITIES: 'effort,thinking',
    CLAUDE_CODE_AUTO_MODE_SERVER: '0',
    CLAUDE_CODE_MAX_CONTEXT_TOKENS: '1000000',
    CLAUDE_CODE_DISABLE_1M_CONTEXT: '0',
    DISABLE_COMPACT: '0',
    KEEP_ME: 'yes',
  },
  model: 'DeepSeek-Flash',
  modelPicker: {
    replaceBuiltInOptions: true,
    options: [{ model: 'Auto', label: 'Qoder · Auto', behavesAs: 'claude-opus-4-8' }],
  },
  statusLine: { type: 'command', command: 'node "C:\\qoder-claude\\scripts\\statusline.js"' },
  permissions: { allow: ['WebSearch', 'mcp__pencil'] },
  theme: 'dark',
};

test('bridge settings are removed and unrelated settings stay', () => {
  const { settings, removed } = stripBridgeSettings(fullSettings);
  assert.ok(removed.includes('env.ANTHROPIC_BASE_URL'));
  assert.ok(removed.includes('modelPicker'));
  assert.ok(removed.includes('model'));
  assert.ok(removed.includes('statusLine'));
  assert.equal(settings.env.KEEP_ME, 'yes');
  assert.equal(settings.env.ANTHROPIC_AUTH_TOKEN, undefined);
  assert.deepEqual(settings.permissions, { allow: ['WebSearch', 'mcp__pencil'] });
  assert.equal(settings.theme, 'dark');
  assert.equal(settings.modelPicker, undefined);
});

test('a custom auth token and a remote base URL are kept', () => {
  const { settings, removed } = stripBridgeSettings({
    env: { ANTHROPIC_BASE_URL: 'https://api.example.com', ANTHROPIC_AUTH_TOKEN: 'secret' },
  });
  assert.equal(settings.env.ANTHROPIC_BASE_URL, 'https://api.example.com');
  assert.equal(settings.env.ANTHROPIC_AUTH_TOKEN, 'secret');
  assert.deepEqual(removed, []);
});

test('a non-Qoder model picker is kept', () => {
  const { settings } = stripBridgeSettings({
    modelPicker: { options: [{ model: 'claude-opus-4-8', label: 'Opus' }] },
    model: 'claude-opus-4-8',
  });
  assert.ok(settings.modelPicker);
  assert.equal(settings.model, 'claude-opus-4-8');
});

test('a statusline from another tool is kept', () => {
  const { settings } = stripBridgeSettings({
    statusLine: { type: 'command', command: 'node "C:\\tools\\statusline.js"' },
  });
  assert.ok(settings.statusLine);
});

test('isOurInstall accepts our packages and rejects a checkout', () => {
  const good = makeInstall('good', 'qoder-claude');
  assert.equal(isOurInstall(good), true);
  const legacy = makeInstall('legacy', 'qoder-bridge');
  assert.equal(isOurInstall(legacy), true);
  const checkout = makeInstall('checkout', 'qoder-claude');
  fs.mkdirSync(path.join(checkout, '.git'));
  assert.equal(isOurInstall(checkout), false);
  assert.equal(isOurInstall(path.join(dir, 'missing')), false);
});

test('installRoots dedupes and includes the legacy folder', () => {
  const home = path.join(dir, 'home');
  const current = path.join(home, '.local', 'share', 'qoder-claude');
  const legacy = path.join(home, '.local', 'share', 'qoder-bridge');
  fs.mkdirSync(current, { recursive: true });
  fs.mkdirSync(legacy, { recursive: true });
  fs.writeFileSync(path.join(current, 'package.json'), JSON.stringify({ name: 'qoder-claude' }));
  fs.writeFileSync(path.join(legacy, 'package.json'), JSON.stringify({ name: 'qoder-bridge' }));
  const roots = installRoots({ root: current, platform: 'linux', home });
  assert.deepEqual(roots.sort(), [current, legacy].sort());
});

test('includeDefaults false keeps only the explicit root', () => {
  const home = path.join(dir, 'custom-home');
  const custom = path.join(dir, 'custom-install');
  fs.mkdirSync(custom, { recursive: true });
  fs.writeFileSync(path.join(custom, 'package.json'), JSON.stringify({ name: 'qoder-claude' }));
  const roots = installRoots({ root: custom, platform: 'linux', home, includeDefaults: false });
  assert.deepEqual(roots, [path.resolve(custom)]);
});

test('PATH filtering ignores case and trailing separators', () => {
  const entries = ['C:\\Tools', 'C:\\Users\\Ryan\\AppData\\Local\\qoder-claude\\bin\\', 'C:\\Other'];
  const kept = filterPathEntries(entries, ['c:\\users\\ryan\\appdata\\local\\qoder-claude\\bin']);
  assert.deepEqual(kept, ['C:\\Tools', 'C:\\Other']);
});

test('accounts are copied before deletion', () => {
  const root = makeInstall('with-accounts', 'qoder-claude');
  fs.mkdirSync(path.join(root, 'accounts', 'default'), { recursive: true });
  fs.writeFileSync(path.join(root, 'accounts', 'default', '.auth'), 'token');
  fs.writeFileSync(path.join(root, 'accounts.json'), JSON.stringify({ active: 'default' }));
  const dest = path.join(dir, 'backup');
  backupAccounts(root, dest);
  assert.equal(fs.readFileSync(path.join(dest, 'accounts', 'default', '.auth'), 'utf8'), 'token');
  assert.equal(JSON.parse(fs.readFileSync(path.join(dest, 'accounts.json'), 'utf8')).active, 'default');
});
