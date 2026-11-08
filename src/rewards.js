import { effectiveConfig } from './config.js';
import { rotationSnapshot } from './accounts.js';
import { authDir, credentials } from './qoderAuth.js';

const DEFAULT_ENDPOINT = 'https://openapi.qoder.sh';
const CAMPAIGNS = '/sash/api/v1/me/campaigns';
const CACHE_TTL = 60 * 1000;
const POLL_MS = 15 * 60 * 1000;

const cache = new Map();
let pollTimer = null;

function base() {
  return String(
    process.env.QODER_REWARD_ENDPOINT || process.env.QODER_QUOTA_ENDPOINT || DEFAULT_ENDPOINT,
  ).replace(/\/+$/, '');
}

function headers(token) {
  return {
    authorization: `Bearer ${token}`,
    'cosy-clienttype': '10',
    accept: 'application/json',
    'accept-language': 'en',
    'user-agent': 'Qoder',
  };
}

function claimHeaders(token) {
  return {
    authorization: `Bearer ${token}`,
    'cosy-clienttype': '10',
    'user-agent': 'Qoder',
    'content-type': 'application/json',
  };
}

function tokenFor(dir) {
  if (process.env.QODER_QUOTA_TOKEN) return process.env.QODER_QUOTA_TOKEN;
  return credentials(dir).token;
}

function first(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function amount(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function millis(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value < 100_000_000_000 ? value * 1000 : value;
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n)) return n < 100_000_000_000 ? n * 1000 : n;
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function titleOf(row) {
  const placements = Array.isArray(row?.placements) ? row.placements : [];
  for (const type of ['POPUP', 'USAGE']) {
    for (const item of placements) {
      if (item?.type !== type) continue;
      for (const locale of ['en', 'zh']) {
        const title = item?.content?.[locale]?.title;
        if (typeof title === 'string' && title.trim()) return title.trim();
      }
    }
  }
  return first(row?.title, row?.name, row?.campaignName);
}

export function isDailyCampaign(row) {
  if (!row || typeof row !== 'object') return false;
  if (row.actionType !== 'CLAIM_BENEFIT') return false;
  const benefit = row.benefit;
  if (!benefit || benefit.kind !== 'CREDITS' || amount(benefit.amount) <= 0) return false;
  const series = benefit.modelScope?.modelSeries;
  if (series && series.key !== 'ALL_MODELS') return false;
  const title = titleOf(row).toLowerCase();
  if (/daily|every day|每日|每天/.test(title)) return true;
  const start = millis(row.startAt);
  const end = millis(row.endAt);
  return amount(benefit.amount) === 100 && start !== null && end !== null && end > start && end - start <= 27 * 60 * 60 * 1000;
}

export function normalizeCampaign(row) {
  const benefit = row?.benefit || {};
  const status = first(row?.claimStatus).toUpperCase();
  const startAt = millis(row?.startAt);
  const endAt = millis(row?.endAt);
  return {
    id: first(row?.campaignId, row?.id),
    title: titleOf(row),
    amount: amount(benefit.amount),
    unit: benefit.kind === 'CREDITS' ? 'credits' : String(benefit.kind || '').toLowerCase(),
    status: status === 'CLAIMABLE' ? 'claimable' : status === 'CLAIMED' ? 'claimed' : 'unavailable',
    startAt,
    endAt,
    validityDays: amount(benefit.validity?.days) || null,
    claimedAt: null,
    expiresAt: null,
  };
}

function pickDaily(rows) {
  const daily = (Array.isArray(rows) ? rows : []).filter(isDailyCampaign).map(normalizeCampaign).filter((row) => row.id);
  return daily.find((row) => row.status === 'claimable') || daily.find((row) => row.status === 'claimed') || null;
}

export function claimVerdict(httpStatus, payload) {
  const envelope = payload && typeof payload === 'object' ? payload : {};
  const body = envelope.data && typeof envelope.data === 'object' ? envelope.data : envelope;
  const status = first(body.status, envelope.status).toUpperCase();
  const failure = first(body.failureCode, envelope.failureCode, body.errorCode, envelope.errorCode).toUpperCase();
  const result = first(body.result, envelope.result).toUpperCase();
  const replayed = body.replayed === true || envelope.replayed === true;
  const message = first(body.message, body.msg, envelope.message, envelope.msg);
  if (failure.includes('SAME_PERSON')) {
    return { status: 'failed', amount: 0, reason: failure, message: message || failure };
  }
  if (replayed || /ALREADY|REPLAYED/.test(`${result} ${failure}`)) {
    return { status: 'already', amount: 0, reason: 'already', message: message || 'already claimed' };
  }
  if (httpStatus === 409) {
    return { status: 'failed', amount: 0, reason: failure || 'conflict', message: message || 'conflict' };
  }
  if (['CLAIMED', 'GRANTED', 'SUCCESS'].includes(status)) {
    return { status: 'claimed', amount: amount(body.benefit?.amount), reason: '', message: message || 'claimed' };
  }
  if (failure) return { status: 'failed', amount: 0, reason: failure, message: message || failure };
  if (httpStatus >= 200 && httpStatus < 300) return { status: 'failed', amount: 0, reason: 'unconfirmed', message: message || 'unconfirmed' };
  return { status: 'failed', amount: 0, reason: `http_${httpStatus}`, message: message || `HTTP ${httpStatus}` };
}

export async function fetchCampaigns(dir, { fetchImpl = fetch, timeoutMs = 8000, account = '' } = {}) {
  let token;
  try {
    token = tokenFor(dir);
  } catch {
    return { status: 'no-auth', account, campaign: null, reason: 'auth-file' };
  }
  if (!token) return { status: 'no-auth', account, campaign: null, reason: 'no-token' };

  let res;
  try {
    res = await fetchImpl(`${base()}${CAMPAIGNS}`, {
      method: 'GET',
      headers: headers(token),
      signal: AbortSignal.timeout ? AbortSignal.timeout(timeoutMs) : undefined,
    });
  } catch (e) {
    return { status: 'unavailable', account, campaign: null, reason: e?.name === 'TimeoutError' ? 'timeout' : 'network' };
  }
  if (res.status === 401 || res.status === 403) return { status: 'no-auth', account, campaign: null, reason: `http_${res.status}` };
  if (!res.ok) return { status: 'unavailable', account, campaign: null, reason: `http_${res.status}` };
  let payload;
  try {
    payload = await res.json();
  } catch {
    return { status: 'unavailable', account, campaign: null, reason: 'parse' };
  }
  const rows = Array.isArray(payload.campaigns) ? payload.campaigns : payload.data?.campaigns;
  const campaign = pickDaily(rows);
  if (!campaign) return { status: 'none', account, campaign: null, reason: '' };
  if (campaign.status === 'claimed') {
    const reward = await fetchReward(dir, campaign.id, { fetchImpl, timeoutMs, account });
    if (reward.claimedAt || reward.expiresAt) {
      campaign.claimedAt = reward.claimedAt;
      campaign.expiresAt = reward.expiresAt;
    }
  }
  return { status: campaign.status, account, campaign, reason: '' };
}

export async function fetchReward(dir, campaignId, { fetchImpl = fetch, timeoutMs = 8000 } = {}) {
  let token;
  try {
    token = tokenFor(dir);
  } catch {
    return {};
  }
  const res = await fetchImpl(`${base()}${CAMPAIGNS}/${encodeURIComponent(campaignId)}/reward`, {
    method: 'GET',
    headers: headers(token),
    signal: AbortSignal.timeout ? AbortSignal.timeout(timeoutMs) : undefined,
  });
  if (!res.ok) return {};
  try {
    const payload = await res.json();
    const body = payload.data && typeof payload.data === 'object' ? payload.data : payload;
    return {
      status: first(body.status).toUpperCase(),
      claimedAt: millis(body.claimedAt),
      expiresAt: millis(body.expiresAt),
      grantedAt: millis(body.grantedAt),
      replayed: body.replayed === true,
    };
  } catch {
    return {};
  }
}

export async function claimReward(dir, campaignId, { fetchImpl = fetch, timeoutMs = 8000, account = '' } = {}) {
  let token;
  try {
    token = tokenFor(dir);
  } catch {
    return { status: 'failed', account, reason: 'auth-file', message: 'not logged in' };
  }
  let res;
  try {
    res = await fetchImpl(`${base()}${CAMPAIGNS}/${encodeURIComponent(campaignId)}/claim`, {
      method: 'POST',
      headers: claimHeaders(token),
      signal: AbortSignal.timeout ? AbortSignal.timeout(timeoutMs) : undefined,
    });
  } catch (e) {
    return { status: 'failed', account, reason: e?.name === 'TimeoutError' ? 'timeout' : 'network', message: String(e.message || e) };
  }
  let payload = {};
  try {
    payload = await res.json();
  } catch {}
  const verdict = claimVerdict(res.status, payload);
  const reward = verdict.status === 'claimed' || verdict.status === 'already'
    ? await fetchReward(dir, campaignId, { fetchImpl, timeoutMs })
    : {};
  cache.delete(authDir(dir));
  return { ...verdict, account, campaignId, claimedAt: reward.claimedAt || null, expiresAt: reward.expiresAt || null };
}

export async function getReward(dir, { refresh = false, fetchImpl, account = '' } = {}) {
  const root = authDir(dir);
  const cached = cache.get(root);
  if (cached && !refresh && Date.now() < cached.until) return cached.record;
  const record = await fetchCampaigns(dir, { fetchImpl, account });
  const ttl = record.status === 'no-auth' ? 10 * 60 * 1000 : CACHE_TTL;
  cache.set(root, { record, until: Date.now() + ttl });
  return record;
}

export async function rewardsSnapshot({ refresh = false, fetchImpl } = {}) {
  const rotation = rotationSnapshot();
  const rows = await Promise.all(rotation.accounts.map(async (account) => {
    const record = await getReward(account.dir, { refresh, fetchImpl, account: account.name });
    return { ...record, name: account.name, label: account.label, enabled: account.enabled, active: account.active };
  }));
  const byName = Object.fromEntries(rows.map((row) => [row.name, row]));
  const active = rows.find((row) => row.active) || rows[0] || null;
  return {
    summary: active,
    active: rotation.active,
    accounts: byName,
    autoClaim: effectiveConfig().rewardAutoClaim,
    updatedAt: Date.now(),
  };
}

async function tick() {
  if (effectiveConfig().rewardAutoClaim) {
    const rotation = rotationSnapshot();
    for (const account of rotation.accounts) {
      if (!account.enabled) continue;
      try {
        const record = await getReward(account.dir, { refresh: true, account: account.name });
        if (record.status === 'claimable' && record.campaign?.id) {
          await claimReward(account.dir, record.campaign.id, { account: account.name });
        }
      } catch {}
    }
  }
  pollTimer = setTimeout(tick, POLL_MS);
  pollTimer.unref?.();
}

export function startRewardPolling() {
  if (pollTimer) return;
  tick();
}

export function stopRewardPolling() {
  if (pollTimer) clearTimeout(pollTimer);
  pollTimer = null;
}
