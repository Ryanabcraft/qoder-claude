import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const home = fs.mkdtempSync(path.join(os.tmpdir(), 'qclaude-audit-accounts-'));
process.env.QODER_BRIDGE_HOME = home;
const m = await import('../../src/accounts.js');

const file = path.join(home, 'accounts.json');

test('a profile with a non-string dir does not take the bridge down', () => {
  fs.writeFileSync(file, JSON.stringify({ active: 'a', rotation: true, accounts: { a: { dir: 123 } } }));
  const data = m.loadAccounts();
  assert.equal(data.active, 'a');
  assert.equal(typeof data.accounts.a.label, 'string');
});

test('a file with accounts but no active name still yields a usable account', () => {
  fs.writeFileSync(file, JSON.stringify({ accounts: { b: { dir: null } } }));
  const data = m.loadAccounts();
  assert.equal(data.active, 'b');
  assert.deepEqual(m.candidateAccounts().map((a) => a.name), ['b']);
});
