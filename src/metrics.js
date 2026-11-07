const MAX_SAMPLES = 400;
const startedAt = Date.now();

const state = {
  total: 0,
  ok: 0,
  err: 0,
  samples: [],
};

export function record({ model, status, ms, transport }) {
  state.total += 1;
  const ok = status >= 200 && status < 300;
  if (ok) state.ok += 1;
  else state.err += 1;
  state.samples.push({ t: Date.now(), model: model || '-', status, ms, transport: transport || 'cli' });
  if (state.samples.length > MAX_SAMPLES) state.samples.shift();
}

export function snapshot() {
  const now = Date.now();
  const buckets = [];
  for (let i = 29; i >= 0; i -= 1) {
    const start = now - (i + 1) * 60_000;
    const end = now - i * 60_000;
    const inRange = state.samples.filter((s) => s.t >= start && s.t < end);
    const avg = inRange.length ? Math.round(inRange.reduce((a, b) => a + b.ms, 0) / inRange.length) : 0;
    buckets.push({
      label: new Date(start).toISOString().slice(11, 16),
      count: inRange.length,
      avg,
    });
  }

  const success = state.total ? Math.round((state.ok / state.total) * 100) : 100;
  const recent = state.samples.slice(-7).reverse();

  return {
    total: state.total,
    ok: state.ok,
    err: state.err,
    success,
    uptime: Math.round((now - startedAt) / 1000),
    buckets,
    recent,
  };
}
