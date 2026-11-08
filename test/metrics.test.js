import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qclaude-metrics-'));
process.env.QODER_BRIDGE_HOME = dir;

const now = Date.now();
const previous = {
  t: Math.floor((now - 60 * 60000) / 60000) * 60000,
  count: 2, ok: 2, err: 0, msSum: 200, ttftSum: 100, in: 20, out: 10,
  models: { Auto: { count: 2, ok: 2, err: 0, msSum: 200, in: 20, out: 10 } },
  accounts: { default: { count: 2, ok: 2, err: 0, msSum: 200, in: 20, out: 10 } },
};
fs.writeFileSync(path.join(dir, 'metrics.jsonl'), JSON.stringify(previous) + '\n');

const metrics = await import('../src/metrics.js');

test.after(() => fs.rmSync(dir, { recursive: true, force: true }));

test('metrics load from disk and survive a restart', () => {
  const snap = metrics.snapshot('7d');
  assert.ok(snap.total >= 2);
  assert.ok(snap.tokensIn >= 20);
  assert.ok(snap.topModels.some((row) => row.name === 'Auto'));
});

test('record aggregates totals, tokens and percentiles', () => {
  metrics.record({ model: 'Auto', status: 200, ms: 100, ttft: 50, transport: 'direct', account: 'default', inTokens: 10, outTokens: 4 });
  metrics.record({ model: 'Auto', status: 500, ms: 300, ttft: 0, transport: 'direct', account: 'default', inTokens: 5, outTokens: 0 });
  const snap = metrics.snapshot('30m');
  assert.equal(snap.total, 2);
  assert.equal(snap.ok, 1);
  assert.equal(snap.err, 1);
  assert.equal(snap.tokensIn, 15);
  assert.equal(snap.tokensOut, 4);
  assert.ok(snap.p50 > 0);
  assert.ok(snap.p95 >= snap.p50);
  assert.equal(snap.topAccounts[0].name, 'default');
  assert.equal(snap.lastError.status, 500);
});

test('ranges expose the expected number of points', () => {
  assert.equal(metrics.snapshot('30m').series.length, 30);
  assert.equal(metrics.snapshot('24h').series.length, 288);
  assert.equal(metrics.snapshot('7d').series.length, 168);
});
