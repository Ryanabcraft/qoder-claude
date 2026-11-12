import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qclaude-quota-'));
process.env.QODER_BRIDGE_HOME = dir;
process.env.QODER_QUOTA_TOKEN = 'unit-token';
process.env.QODER_QUOTA_ENDPOINT = 'https://quota.test';

const { fetchQuota, getQuota, normalizeQuota } = await import('../src/quota.js');

const payload = {
  userId: 'secret-user',
  userType: 'personal_standard',
  usageType: 'credits',
  totalUsagePercentage: 0.675,
  isQuotaExceeded: false,
  expiresAt: 253402214400000,
  upgradeUrl: 'https://qoder.com/pricing?client=qoder',
  userQuota: { total: 0, used: 0, remaining: 0, percentage: 0, unit: 'credits' },
  addOnQuota: { total: 200, used: 135, remaining: 65, percentage: 0.675, unit: 'credits' },
};

test.after(() => fs.rmSync(dir, { recursive: true, force: true }));

test('normalizes the verified quota payload', () => {
  const quota = normalizeQuota(payload, 1_700_000_000_000);
  assert.equal(quota.status, 'ok');
  assert.equal(quota.plan, 'personal_standard');
  assert.equal(quota.total, 200);
  assert.equal(quota.used, 135);
  assert.equal(quota.remaining, 65);
  assert.equal(quota.percent, 67.5);
  assert.equal(quota.exceeded, false);
  assert.equal(quota.expiresAt, null);
  assert.equal(quota.unit, 'credits');
  assert.equal(quota.userId, undefined);
});

test('plan-only quotas use used/total', () => {
  const quota = normalizeQuota({
    userType: 'pro',
    userQuota: { total: 50, used: 25, remaining: 25, percentage: 0.5, unit: 'credits' },
  }, 1);
  assert.equal(quota.percent, 50);
  assert.equal(quota.remaining, 25);
});

test('marks exceeded quotas and rejects foreign links', () => {
  const quota = normalizeQuota({
    isQuotaExceeded: true,
    upgradeUrl: 'https://evil.example/x',
    addOnQuota: { total: 10, used: 10, remaining: 0, unit: 'credits' },
  }, 1);
  assert.equal(quota.exceeded, true);
  assert.equal(quota.percent, 100);
  assert.equal(quota.upgradeUrl, null);
});

test('zero-total quotas report exhausted or unavailable, never 0/0', () => {
  const exhausted = normalizeQuota({
    isQuotaExceeded: true,
    userQuota: { total: 0, used: 0, remaining: 0, unit: 'credits' },
  }, 1);
  assert.equal(exhausted.status, 'exceeded');
  assert.equal(exhausted.reason, 'no-credits');
  assert.equal(exhausted.percent, 100);
  const empty = normalizeQuota({ userQuota: { total: 0, used: 0, unit: 'credits' } }, 1);
  assert.equal(empty.status, 'unavailable');
  assert.equal(empty.reason, 'no-quota');
});

test('malformed payloads degrade to unavailable', () => {
  assert.equal(normalizeQuota({}, 1).status, 'unavailable');
  assert.equal(normalizeQuota(null, 1).status, 'unavailable');
});

test('fetchQuota sends the bearer token and parses a response', async () => {
  let seen;
  const quota = await fetchQuota('', {
    fetchImpl: async (url, init) => {
      seen = { url, auth: init.headers.authorization };
      return new Response(JSON.stringify(payload), { status: 200 });
    },
  });
  assert.equal(seen.url, 'https://quota.test/api/v2/quota/usage');
  assert.equal(seen.auth, 'Bearer unit-token');
  assert.equal(quota.status, 'ok');
  assert.equal(quota.used, 135);
  assert.equal(JSON.stringify(quota).includes('unit-token'), false);
});

test('fetchQuota maps auth and upstream failures', async () => {
  const denied = await fetchQuota('', { fetchImpl: async () => new Response('no', { status: 401 }) });
  assert.equal(denied.status, 'no-auth');
  const down = await fetchQuota('', { fetchImpl: async () => new Response('no', { status: 500 }) });
  assert.equal(down.status, 'unavailable');
  assert.equal(down.reason, 'http_500');
  const timeout = await fetchQuota('', {
    fetchImpl: async () => { const e = new Error('timeout'); e.name = 'TimeoutError'; throw e; },
  });
  assert.equal(timeout.reason, 'timeout');
});

test('getQuota caches and single-flights identical calls', async () => {
  process.env.QODER_QUOTA_TOKEN = 'unit-token';
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    await new Promise((r) => setTimeout(r, 20));
    return new Response(JSON.stringify(payload), { status: 200 });
  };
  const root = path.join(dir, 'account-a');
  const [a, b] = await Promise.all([
    getQuota(root, { fetchImpl, refresh: true }),
    getQuota(root, { fetchImpl }),
  ]);
  assert.equal(a.used, 135);
  assert.equal(b.used, 135);
  assert.equal(calls, 1);
  const cached = await getQuota(root, { fetchImpl });
  assert.equal(cached.total, 200);
  assert.equal(calls, 1);
});

test('a plan without a fixed quota reports the add-on separately', () => {
  const raw = {
    userType: 'personal_standard',
    usageType: 'credits',
    totalUsagePercentage: 1,
    isQuotaExceeded: true,
    userQuota: { total: 0, used: 0, remaining: 0, percentage: 0, unit: 'credits' },
    addOnQuota: { total: 200, used: 200, remaining: 0, percentage: 1, unit: 'credits' },
  };
  const record = normalizeQuota(raw);
  assert.equal(record.status, 'ok');
  assert.equal(record.scope, 'addon');
  assert.equal(record.planUnmetered, true);
  assert.equal(record.exceeded, true);
  assert.equal(record.reason, 'addon-exhausted');
  assert.equal(record.total, 200);
});

test('a real plan quota keeps the plan scope', () => {
  const record = normalizeQuota({
    userType: 'personal_pro',
    userQuota: { total: 1000, used: 100, remaining: 900, unit: 'credits' },
    addOnQuota: { total: 0, used: 0, remaining: 0, unit: 'credits' },
  });
  assert.equal(record.scope, 'plan');
  assert.equal(record.planUnmetered, false);
  assert.equal(record.reason, '');
});
