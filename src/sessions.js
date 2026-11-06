import { createHash } from 'node:crypto';

const TTL = Number(process.env.BRIDGE_SESSION_TTL_MS || 15 * 60 * 1000);
const MAX = Number(process.env.BRIDGE_SESSION_MAX || 4);

const sessions = new Map();

export function messageHash(m) {
  const role = m && m.role ? m.role : 'user';
  return createHash('sha1').update(role + ':' + JSON.stringify(m?.content ?? '')).digest('hex').slice(0, 16);
}

export function sessionKeyFor(body) {
  try {
    const raw = body?.metadata?.user_id;
    if (typeof raw === 'string') {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.session_id === 'string') return 'sid:' + parsed.session_id;
    }
  } catch {
    /* not JSON */
  }
  const first = body?.messages?.[0];
  return 'hash:' + messageHash(first || { role: 'user', content: '' });
}

export function prefixMatches(previous, current) {
  if (!previous || previous.length > current.length) return false;
  for (let i = 0; i < previous.length; i++) if (previous[i] !== current[i]) return false;
  return true;
}

export function getSession(key) {
  const s = sessions.get(key);
  if (!s) return null;
  if (Date.now() - s.lastUsed > TTL) {
    try { s.worker.kill(); } catch {}
    sessions.delete(key);
    return null;
  }
  return s;
}

export function putSession(key, worker, cfgKey, hashes) {
  const existing = sessions.get(key);
  if (existing && existing.worker !== worker) {
    try { existing.worker.kill(); } catch {}
  }
  sessions.set(key, { worker, cfgKey, hashes, lastUsed: Date.now() });
  evict();
}

export function touchSession(key) {
  const s = sessions.get(key);
  if (s) s.lastUsed = Date.now();
}

export function dropSession(key) {
  const s = sessions.get(key);
  if (!s) return;
  try { s.worker.kill(); } catch {}
  sessions.delete(key);
}

function evict() {
  while (sessions.size > MAX) {
    let oldestKey = null;
    let oldest = Infinity;
    for (const [k, v] of sessions) {
      if (v.lastUsed < oldest) { oldest = v.lastUsed; oldestKey = k; }
    }
    if (!oldestKey) return;
    dropSession(oldestKey);
  }
}

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of sessions) {
    if (now - v.lastUsed > TTL) dropSession(k);
  }
}, 60_000).unref?.();

export function shutdownSessions() {
  for (const k of [...sessions.keys()]) dropSession(k);
}
