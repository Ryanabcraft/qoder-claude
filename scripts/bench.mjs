const URL = process.env.BRIDGE_URL || 'http://127.0.0.1:8787';
const turns = Number(process.env.BENCH_TURNS || 3);

const base = {
  model: process.env.BENCH_MODEL || 'Auto',
  stream: true,
  max_tokens: 64,
  metadata: { user_id: JSON.stringify({ session_id: `bench-${Date.now()}` }) },
  messages: [{ role: 'user', content: 'Diga apenas: ok' }],
};

for (let i = 1; i <= turns; i++) {
  const t = Date.now();
  let status = 0;
  let text = '';
  try {
    const res = await fetch(`${URL}/v1/messages`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(base),
    });
    status = res.status;
    text = await res.text();
  } catch (e) {
    text = String(e?.message || e);
  }
  const ms = Date.now() - t;
  const kind = text.startsWith('{') ? JSON.parse(text).type : 'sse';
  console.log(`turn ${i}: ${ms}ms  status=${status}  ${kind}`);
  if (status !== 200) break;
  base.messages.push({ role: 'assistant', content: [{ type: 'text', text: 'ok' }] });
  base.messages.push({ role: 'user', content: `turno ${i + 1}` });
}
