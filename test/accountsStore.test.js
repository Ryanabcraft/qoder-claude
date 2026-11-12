import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const home = fs.mkdtempSync(path.join(os.tmpdir(), 'qclaude-accounts-store-'));
process.env.QODER_BRIDGE_HOME = home;
const m = await import('../src/accounts.js');

const file = path.join(home, 'accounts.json');

test('a write is atomic and leaves no temp file behind', () => {
  m.addAccount('alpha', path.join(home, 'alpha'));
  m.addAccount('beta', path.join(home, 'beta'));
  assert.equal(fs.existsSync(`${file}.tmp`), false);
  const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.ok(saved.accounts.alpha);
  assert.ok(saved.accounts.beta);
});

test('a truncated file is recovered from the backup', () => {
  m.useAccount('beta');
  assert.equal(fs.existsSync(`${file}.bak`), true, 'the previous good copy is kept');

  fs.writeFileSync(file, '{"accounts": {"alpha": {"dir"');
  const data = m.loadAccounts();
  assert.ok(data.accounts.alpha, 'the accounts come back');
  assert.ok(data.accounts.beta);
  assert.match(String(m.accountRecovery()), /accounts\.json\.bak$/);
});

test('the fallback never overwrites a corrupt file silently', () => {
  fs.writeFileSync(file, 'not json at all');
  assert.equal(m.loadAccounts().accounts.default.enabled, true);
  m.saveAccounts(m.loadAccounts());
  const corrupt = fs.readdirSync(home).filter((name) => name.startsWith('accounts.json.corrupt-'));
  assert.equal(corrupt.length, 1, 'the damaged file is preserved for inspection');
});

test('a valid file is the source of truth', () => {
  m.saveAccounts({ active: 'default', rotation: true, accounts: { default: { enabled: true } }, cooldowns: {} });
  const data = m.loadAccounts();
  assert.deepEqual(Object.keys(data.accounts), ['default']);
  assert.equal(m.accountRecovery(), null);
});
