import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qclaude-rewards-'));
process.env.QODER_BRIDGE_HOME = dir;
process.env.QODER_QUOTA_TOKEN = 'unit-token';
process.env.QODER_REWARD_ENDPOINT = 'https://reward.test';

const { claimReward, claimVerdict, fetchCampaigns, isDailyCampaign, normalizeCampaign } =
  await import('../src/rewards.js');

const daily = {
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

test.after(() => fs.rmSync(dir, { recursive: true, force: true }));

test('detects the daily 100-credit campaign only', () => {
  assert.equal(isDailyCampaign(daily), true);
  assert.equal(isDailyCampaign({ ...daily, actionType: 'VIEW_DETAILS' }), false);
  assert.equal(isDailyCampaign({
    ...daily,
    placements: [{ type: 'USAGE', content: { en: { title: 'Limited-Time Offer' } } }],
    benefit: { ...daily.benefit, amount: 1000 },
  }), false);
  assert.equal(isDailyCampaign({
    ...daily,
    placements: [{ type: 'USAGE', content: { en: { title: 'Double Credits on subscription' } } }],
    benefit: { ...daily.benefit, amount: 500 },
  }), false);
});

test('normalizes campaign fields and seconds to milliseconds', () => {
  const row = normalizeCampaign(daily);
  assert.equal(row.id, 'campaign-1');
  assert.equal(row.amount, 100);
  assert.equal(row.status, 'claimable');
  assert.equal(row.startAt, 1794103200000);
  assert.equal(row.endAt, 1794189540000);
  assert.equal(row.validityDays, 30);
});

test('claim verdict distinguishes claimed, replayed, blocked and unknown', () => {
  assert.deepEqual(
    claimVerdict(200, { status: 'CLAIMED', benefit: { amount: 100 } }).status,
    'claimed',
  );
  assert.equal(claimVerdict(200, { status: 'CLAIMED', replayed: true }).status, 'already');
  assert.equal(claimVerdict(409, { failureCode: 'SAME_PERSON_ALREADY_CLAIMED' }).status, 'failed');
  assert.equal(claimVerdict(409, { failureCode: 'SAME_PERSON_ALREADY_CLAIMED' }).reason, 'SAME_PERSON_ALREADY_CLAIMED');
  assert.equal(claimVerdict(200, { status: 'BLOCKED', failureCode: 'RISK_BLOCKED' }).status, 'failed');
  assert.equal(claimVerdict(200, {}).reason, 'unconfirmed');
});

test('fetchCampaigns picks the claimable daily row', async () => {
  const record = await fetchCampaigns('', {
    fetchImpl: async (url, init) => {
      assert.equal(url, 'https://reward.test/sash/api/v1/me/campaigns');
      assert.equal(init.headers.authorization, 'Bearer unit-token');
      return new Response(JSON.stringify({
        campaigns: [{ ...daily, campaignId: 'pro', actionType: 'VIEW_DETAILS' }, daily],
      }), { status: 200 });
    },
  });
  assert.equal(record.status, 'claimable');
  assert.equal(record.campaign.id, 'campaign-1');
  assert.equal(record.campaign.amount, 100);
});

test('claimReward parses the claim and confirms the reward', async () => {
  const calls = [];
  const result = await claimReward('', 'campaign-1', {
    fetchImpl: async (url, init) => {
      calls.push(`${init.method} ${url}`);
      if (init.method === 'POST') {
        return new Response(JSON.stringify({ status: 'CLAIMED', benefit: { amount: 100 } }), { status: 200 });
      }
      return new Response(JSON.stringify({
        status: 'CLAIMED',
        claimedAt: '2026-11-08T04:00:47Z',
        expiresAt: '2026-12-08T04:00:47Z',
      }), { status: 200 });
    },
  });
  assert.equal(result.status, 'claimed');
  assert.equal(result.amount, 100);
  assert.ok(result.expiresAt > result.claimedAt);
  assert.equal(calls[0], 'POST https://reward.test/sash/api/v1/me/campaigns/campaign-1/claim');
  assert.equal(calls[1], 'GET https://reward.test/sash/api/v1/me/campaigns/campaign-1/reward');
});

test('missing auth degrades to no-auth', async () => {
  const token = process.env.QODER_QUOTA_TOKEN;
  delete process.env.QODER_QUOTA_TOKEN;
  const record = await fetchCampaigns(path.join(dir, 'missing-account'));
  assert.equal(record.status, 'no-auth');
  process.env.QODER_QUOTA_TOKEN = token;
});
