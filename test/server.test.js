import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8799;
const KEY = 'test-key';
const home = fs.mkdtempSync(path.join(os.tmpdir(), 'qclaude-server-'));
const quotaPayload = {
  userType: 'personal_standard',
  usageType: 'credits',
  totalUsagePercentage: 0.675,
  isQuotaExceeded: false,
  expiresAt: 253402214400000,
  upgradeUrl: 'https://qoder.com/pricing',
  userQuota: { total: 0, used: 0, remaining: 0, percentage: 0, unit: 'credits' },
  addOnQuota: { total: 200, used: 135, remaining: 65, percentage: 0.675, unit: 'credits' },
};
const dailyCampaign = {
  campaignId: 'campaign-1',
  actionType: 'CLAIM_BENEFIT',
  claimStatus: 'CLAIMABLE',
  startAt: 1794103200,
  endAt: 1794189540,
  benefit: {
    kind: 'CREDITS',
    amount: 100,
    modelScope: { modelSeries: { key: 'ALL_MODELS' } },
    validity: { mode: 'RELATIVE_DAYS', days: 30 },
  },
  placements: [{ type: 'USAGE', content: { en: { title: 'Claim 100 Credits Daily' } } }],
};
let quotaMode = 'ok';
let claimCalls = 0;
let mock;
let proc;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

test.before(async () => {
  mock = http.createServer((req, res) => {
    if (quotaMode !== 'ok') {
      res.writeHead(500, { 'content-type': 'application/json' });
      return res.end('{"error":"down"}');
    }
    const url = new URL(req.url, 'http://mock');
    if (url.pathname.startsWith('/sash/api/v1/me/campaigns')) {
      res.writeHead(200, { 'content-type': 'application/json' });
      if (req.method === 'POST' && url.pathname.endsWith('/claim')) {
        claimCalls += 1;
        return res.end(JSON.stringify({ status: 'CLAIMED', benefit: { amount: 100 } }));
      }
      if (url.pathname.endsWith('/reward')) {
        return res.end(JSON.stringify({
          status: 'CLAIMED',
          claimedAt: '2026-11-08T04:00:47Z',
          expiresAt: '2026-12-08T04:00:47Z',
        }));
      }
      return res.end(JSON.stringify({ campaigns: [dailyCampaign] }));
    }
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(quotaPayload));
  });
  await new Promise((resolve) => mock.listen(0, '127.0.0.1', resolve));
  const quotaPort = mock.address().port;
  proc = spawn(process.execPath, [path.join(ROOT, 'src', 'server.js')], {
    cwd: ROOT,
    env: {
      ...process.env,
      QODER_BRIDGE_HOME: home,
      BRIDGE_PORT: String(PORT),
      BRIDGE_API_KEY: KEY,
      BRIDGE_LOG: '0',
      BRIDGE_MODELS_REFRESH: '0',
      BRIDGE_QUOTA: '0',
      QODER_QUOTA_ENDPOINT: `http://127.0.0.1:${quotaPort}`,
      QODER_REWARD_ENDPOINT: `http://127.0.0.1:${quotaPort}`,
      QODER_QUOTA_TOKEN: 'test-token',
    },
    stdio: 'ignore',
  });
  for (let i = 0; i < 40; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/health`);
      if (res.ok) return;
    } catch {}
    await wait(250);
  }
  throw new Error('server did not start');
});

test.after(() => {
  try { proc?.kill(); } catch {}
  try { mock?.close(); } catch {}
  fs.rmSync(home, { recursive: true, force: true });
});

test('health answers without a key', async () => {
  const res = await fetch(`http://127.0.0.1:${PORT}/health`);
  assert.equal(res.status, 200);
  assert.equal((await res.json()).service, 'qoder-claude');
});

test('api routes require the key', async () => {
  const res = await fetch(`http://127.0.0.1:${PORT}/ui/api/status`);
  assert.equal(res.status, 401);
});

test('api routes accept the key', async () => {
  const res = await fetch(`http://127.0.0.1:${PORT}/ui/api/status`, { headers: { 'x-api-key': KEY } });
  assert.equal(res.status, 200);
});

test('config is returned without the API key', async () => {
  const res = await fetch(`http://127.0.0.1:${PORT}/ui/api/config`, { headers: { 'x-api-key': KEY } });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.apiKeySet, true);
  assert.equal('apiKey' in body, false);
  assert.ok(body.port > 0);
});

test('health reports process data', async () => {
  const res = await fetch(`http://127.0.0.1:${PORT}/ui/api/health`, { headers: { 'x-api-key': KEY } });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.ok(body.pid > 0);
  assert.ok(body.memory.rss > 0);
});

test('metrics expose the three ranges', async () => {
  const res = await fetch(`http://127.0.0.1:${PORT}/ui/api/metrics?range=7d`, { headers: { 'x-api-key': KEY } });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.range, '7d');
  assert.equal(body.series.length, 168);
});

test('config updates persist live values', async () => {
  const res = await fetch(`http://127.0.0.1:${PORT}/ui/api/config`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', 'x-api-key': KEY },
    body: JSON.stringify({ stallMs: 120000 }),
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.config.stallMs, 120000);
});

test('quota route normalizes credits and never echoes the token', async () => {
  const res = await fetch(`http://127.0.0.1:${PORT}/ui/api/quota?refresh=1`, { headers: { 'x-api-key': KEY } });
  assert.equal(res.status, 200);
  const text = await res.text();
  assert.equal(text.includes('test-token'), false);
  const body = JSON.parse(text);
  assert.equal(body.summary.status, 'ok');
  assert.equal(body.summary.total, 200);
  assert.equal(body.summary.used, 135);
  assert.equal(body.summary.remaining, 65);
  assert.equal(body.summary.percent, 67.5);
  assert.equal(body.summary.exceeded, false);
  assert.equal(body.summary.expiresAt, null);
});

test('quota route serves the last good sample when the upstream fails', async () => {
  quotaMode = 'down';
  const res = await fetch(`http://127.0.0.1:${PORT}/ui/api/quota?refresh=1`, { headers: { 'x-api-key': KEY } });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.summary.status, 'ok');
  assert.equal(body.summary.stale, true);
  assert.equal(body.summary.reason, 'http_500');
  quotaMode = 'ok';
});

test('rewards route exposes the daily campaign without the token', async () => {
  const res = await fetch(`http://127.0.0.1:${PORT}/ui/api/rewards`, { headers: { 'x-api-key': KEY } });
  assert.equal(res.status, 200);
  const text = await res.text();
  assert.equal(text.includes('test-token'), false);
  const body = JSON.parse(text);
  assert.equal(body.summary.status, 'claimable');
  assert.equal(body.summary.campaign.amount, 100);
  assert.equal(body.summary.campaign.id, 'campaign-1');
  assert.equal(body.autoClaim, false);
});

test('rewards claim is an explicit POST and confirms the result', async () => {
  const res = await fetch(`http://127.0.0.1:${PORT}/ui/api/rewards/claim`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': KEY },
    body: JSON.stringify({ account: 'default' }),
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.status, 'claimed');
  assert.equal(claimCalls, 1);
  assert.ok(body.expiresAt > body.claimedAt);
});

test('count_tokens answers without a backend', async () => {
  const res = await fetch(`http://127.0.0.1:${PORT}/v1/messages/count_tokens`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': KEY },
    body: JSON.stringify({ messages: [{ role: 'user', content: 'hello there' }] }),
  });
  assert.equal(res.status, 200);
  assert.ok((await res.json()).input_tokens > 0);
});
