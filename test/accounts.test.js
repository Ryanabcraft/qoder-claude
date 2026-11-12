import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const home = fs.mkdtempSync(path.join(os.tmpdir(), 'qclaude-accounts-'));
process.env.QODER_BRIDGE_HOME = home;
const m = await import('../src/accounts.js');

test('rotation order puts the active account first', () => {
  m.addAccount('alpha', path.join(home, 'alpha'));
  m.addAccount('beta', path.join(home, 'beta'));
  m.useAccount('beta');
  assert.deepEqual(m.candidateAccounts().map((a) => a.name), ['beta', 'default', 'alpha']);
});

test('a cooled account moves to the end', () => {
  m.markCooldown('beta', '403 Billing daily count exceeded');
  assert.deepEqual(m.candidateAccounts().map((a) => a.name), ['default', 'alpha', 'beta']);
  m.clearCooldown('beta');
});

test('rotation off only returns the active account', () => {
  m.setRotation(false);
  assert.deepEqual(m.candidateAccounts().map((a) => a.name), ['beta']);
  m.setRotation(true);
});

test('disabled accounts leave the pool', () => {
  m.setAccountEnabled('alpha', false);
  assert.ok(!m.candidateAccounts().some((a) => a.name === 'alpha'));
  m.setAccountEnabled('alpha', true);
});

test.after(() => fs.rmSync(home, { recursive: true, force: true }));

test('a 402 payment error is rotatable', async () => {
  const { isRotatable } = await import('../src/accounts.js');
  assert.equal(isRotatable('upstream 402: {"message":"payment required"}'), true);
  assert.equal(isRotatable('upstream 402: {"code":"QoderQuotaExhausted"}'), true);
  assert.equal(isRotatable('upstream 502: bad gateway'), false);
});

test('a cut stream is rotatable as a network failure', async () => {
  const { isRotatable } = await import('../src/accounts.js');
  assert.equal(isRotatable('fetch failed'), true);
  assert.equal(isRotatable('terminated'), true);
  assert.equal(isRotatable('premature close'), true);
});
