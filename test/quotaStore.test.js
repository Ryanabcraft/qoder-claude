import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qclaude-quota-store-'));
process.env.QODER_BRIDGE_HOME = dir;

const { appendSample, derive, history, QUOTA_PATH } = await import('../src/quotaStore.js');

const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();
const record = (used, total = 200) => ({
  used, total, remaining: total - used, percent: (used / total) * 100, exceeded: used >= total,
});

test.after(() => fs.rmSync(dir, { recursive: true, force: true }));

test('appendSample stores rows and dedupes the same reading', () => {
  assert.equal(appendSample('default', record(10), now - 2 * DAY), true);
  assert.equal(appendSample('default', record(10), now - 2 * DAY + 1000), false);
  assert.equal(appendSample('default', record(12), now - DAY), true);
  assert.equal(fs.existsSync(QUOTA_PATH), true);
  assert.equal(history('default', 7 * DAY, now).length, 2);
});

test('derive computes spend, burn and forecast', () => {
  appendSample('default', record(22), now);
  const stats = derive('default', { now });
  assert.equal(stats.spent24h, 10);
  assert.equal(stats.spent7d, 12);
  assert.equal(stats.burnPerDay, 6);
  assert.equal(stats.confidence, 'high');
  assert.ok(stats.forecastAt > now);
});

test('derive falls back and handles empty history', () => {
  const unknown = derive('missing', { now });
  assert.equal(unknown.burnPerDay, null);
  assert.equal(unknown.forecastAt, null);
  const fallback = derive('missing', { now, fallbackBurnPerDay: 3 });
  assert.equal(fallback.burnPerDay, 3);
  assert.equal(fallback.confidence, 'low');
});
