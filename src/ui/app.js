const $ = (s) => document.querySelector(s);
const NS = 'http://www.w3.org/2000/svg';

const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
};
const svgEl = (tag, attrs = {}) => {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  return n;
};

let state = { status: null, accounts: null, models: [], metrics: null, filter: '' };

async function api(path, opts = {}) {
  const res = await fetch('/ui/api/' + path, {
    ...opts,
    headers: { 'content-type': 'application/json', ...(opts.headers || {}) },
  });
  const text = await res.text();
  let body = {};
  try { body = JSON.parse(text); } catch { body = { error: text }; }
  if (!res.ok) throw new Error(body.error || res.statusText);
  return body;
}

/* navigation */
const TITLES = {
  overview: ['Dashboard', 'local control panel'],
  accounts: ['Accounts', 'switch, add or remove a Qoder profile'],
  models: ['Models', 'live list from the CLI cache'],
  test: ['Test', 'round-trip through the active transport'],
  logs: ['Logs', 'last lines of bridge.log'],
};

function showPane(name) {
  document.querySelectorAll('.side-item').forEach((b) => b.classList.toggle('active', b.dataset.pane === name));
  document.querySelectorAll('.pane').forEach((p) => p.classList.toggle('active', p.id === 'pane-' + name));
  const [title, sub] = TITLES[name] || TITLES.overview;
  $('#pane-title').textContent = title;
  $('#pane-sub').textContent = sub;
  if (name === 'logs') loadLogs();
}
document.querySelectorAll('.side-item').forEach((b) => b.addEventListener('click', () => showPane(b.dataset.pane)));

/* search */
$('#search').addEventListener('input', (e) => {
  state.filter = e.target.value.toLowerCase();
  renderRecent();
  renderAccounts();
  renderModels();
});

/* status + kpis */
async function loadStatus() {
  try {
    const s = await api('status');
    state.status = s;
    $('#side-status').textContent = `${s.transport} · ${s.port}`;
    $('#side-dot').className = 'status-dot ok';
    $('#avatar').textContent = (s.account.name || 'q').charAt(0).toUpperCase();
    $('#foot-account').textContent = `${s.account.label || s.account.name} · 127.0.0.1:${s.port}`;
  } catch {
    $('#side-status').textContent = 'offline';
    $('#side-dot').className = 'status-dot bad';
  }
}

function renderKpis() {
  const s = state.status;
  const m = state.metrics || {};
  const rot = s?.rotation || {};
  const rotSub = rot.on ? `failover on · ${rot.count || 0} in pool` : 'failover off';
  const kpis = [
    { label: 'Requests', value: String(m.total || 0), sub: `${m.ok || 0} ok · ${m.err || 0} errors`, icon: 'bolt' },
    { label: 'Accounts', value: String(Object.keys(state.accounts?.accounts || {}).length), sub: rotSub, icon: 'users' },
    { label: 'Models', value: String((state.models || []).length), sub: `transport: ${s?.transport || '-'}`, icon: 'layers' },
  ];
  const box = $('#kpis');
  box.textContent = '';
  for (const k of kpis) {
    const card = el('div', 'card kpi');
    const top = el('div', 'top');
    top.append(el('span', 'label', k.label), icon(k.icon));
    card.append(top, el('div', 'value', k.value), el('div', 'sub', k.sub));
    box.append(card);
  }
}

function icon(name) {
  const wrap = el('span', 'icon');
  const svg = svgEl('svg', { viewBox: '0 0 24 24' });
  const paths = {
    bolt: ['M13 2 4 14h7l-1 8 9-12h-7z'],
    users: ['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', 'M9 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8', 'M22 21v-2a4 4 0 0 0-3-3.9'],
    layers: ['M12 2 2 7l10 5 10-5-10-5', 'M2 12l10 5 10-5', 'M2 17l10 5 10-5'],
  };
  for (const d of paths[name] || []) svg.append(svgEl('path', { d }));
  wrap.append(svg);
  return wrap;
}

/* chart */
function renderChart() {
  const box = $('#chart');
  box.textContent = '';
  const data = state.metrics?.buckets || [];
  const W = 600, H = 210, P = { l: 34, r: 10, t: 10, b: 22 };
  const innerW = W - P.l - P.r;
  const innerH = H - P.t - P.b;
  const maxCount = Math.max(4, ...data.map((d) => d.count));
  const maxAvg = Math.max(100, ...data.map((d) => d.avg));

  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'none' });
  for (let i = 0; i <= 3; i++) {
    const y = P.t + (innerH / 3) * i;
    svg.append(svgEl('line', { x1: P.l, x2: W - P.r, y1: y, y2: y, class: 'grid-line' }));
    const t = svgEl('text', { x: 0, y: y + 3, class: 'axis' });
    t.textContent = String(Math.round(maxCount - (maxCount / 3) * i));
    svg.append(t);
  }

  const xAt = (i) => P.l + (innerW * i) / Math.max(1, data.length - 1);
  const yCount = (v) => P.t + innerH - (v / maxCount) * innerH;
  const yAvg = (v) => P.t + innerH - (v / maxAvg) * innerH;

  if (data.length) {
    const area = svgEl('path', {
      d: `M${xAt(0)},${P.t + innerH} ` + data.map((d, i) => `L${xAt(i)},${yCount(d.count)}`).join(' ') + ` L${xAt(data.length - 1)},${P.t + innerH} Z`,
      fill: 'rgba(59,130,246,0.18)',
    });
    svg.append(area);
    svg.append(svgEl('polyline', {
      points: data.map((d, i) => `${xAt(i)},${yCount(d.count)}`).join(' '),
      class: 'line-a',
    }));
    svg.append(svgEl('polyline', {
      points: data.map((d, i) => `${xAt(i)},${yAvg(d.avg)}`).join(' '),
      class: 'line-b',
    }));
    for (let i = 0; i < data.length; i += 6) {
      const t = svgEl('text', { x: xAt(i), y: H - 4, class: 'axis' });
      t.textContent = data[i].label;
      svg.append(t);
    }
  }
  box.append(svg);
}

function renderDonut() {
  const pct = state.metrics?.success ?? 100;
  const ring = $('#donut-ring');
  const circumference = 2 * Math.PI * 48;
  ring.setAttribute('stroke-dasharray', `${(circumference * pct) / 100} ${circumference}`);
  $('#donut-value').textContent = `${pct}%`;
  const total = state.metrics?.total || 0;
  $('#donut-sub').textContent = total ? `${total} request${total === 1 ? '' : 's'}` : 'no requests yet';
}

/* recent */
function renderRecent() {
  const list = state.metrics?.recent || [];
  const body = $('#recent');
  body.textContent = '';
  const rows = list.filter((r) => !state.filter || r.model.toLowerCase().includes(state.filter));
  if (!rows.length) {
    const tr = el('tr');
    const td = el('td', 'muted', 'no requests yet');
    td.colSpan = 5;
    tr.append(td);
    body.append(tr);
    return;
  }
  for (const r of rows) {
    const tr = el('tr');
    const time = new Date(r.t).toLocaleTimeString();
    tr.append(
      el('td', 'mono', time),
      el('td', '', r.model),
      el('td', 'mono', r.account || '-'),
      el('td'),
      el('td', 'right mono', `${r.ms} ms`),
    );
    const badge = el('span', 'badge ' + (r.status >= 200 && r.status < 300 ? 'ok' : 'err'), String(r.status));
    tr.children[3].append(badge);
    body.append(tr);
  }
}

/* accounts */
function waitLabel(seconds) {
  if (seconds <= 0) return '';
  if (seconds < 90) return `${seconds}s`;
  return `${Math.ceil(seconds / 60)}m`;
}

function renderRotation() {
  const rot = state.accounts?.rotation;
  if (!rot) return;
  const toggle = $('#rot-toggle');
  toggle.checked = rot.on;
  $('#rot-label').textContent = rot.on ? 'on' : 'off';

  const strip = $('#rot-strip');
  strip.textContent = '';
  const ordered = [...rot.accounts].sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1;
    if (a.coolingLeft !== b.coolingLeft) return a.coolingLeft ? 1 : -1;
    return a.name.localeCompare(b.name);
  });
  for (const a of ordered) {
    const cls = !a.enabled ? 'off' : a.coolingLeft ? 'paused' : 'live';
    const pill = el('span', 'rot-pill ' + cls);
    pill.append(el('i'));
    pill.append(el('b', '', a.name));
    const note = !a.enabled
      ? 'disabled'
      : a.coolingLeft
        ? `paused ${waitLabel(a.coolingLeft)}`
        : a.active
          ? 'active'
          : 'ready';
    pill.append(el('span', '', note));
    strip.append(pill);
  }
  if (!ordered.length) strip.append(el('span', 'muted small', 'no accounts'));
}

function renderAccounts() {
  const data = state.accounts;
  const body = $('#account-list');
  if (!data) return;
  body.textContent = '';
  const rot = data.rotation;
  const byName = new Map((rot?.accounts || []).map((a) => [a.name, a]));

  for (const [name, item] of Object.entries(data.accounts)) {
    if (state.filter && !name.toLowerCase().includes(state.filter)) continue;
    const info = byName.get(name) || {};
    const tr = el('tr');
    tr.append(el('td', '', name));
    tr.append(el('td', 'mono', item.dir || '~/.qoder'));

    const st = el('td');
    if (info.coolingLeft) {
      st.append(el('span', 'badge paused', `paused ${waitLabel(info.coolingLeft)}`));
      if (info.reason) st.append(el('div', 'muted small', info.reason.slice(0, 60)));
    } else if (info.enabled === false) {
      st.append(el('span', 'badge off', 'disabled'));
    } else {
      st.append(el('span', 'badge ' + (name === data.active ? 'on' : ''), name === data.active ? 'active' : 'ready'));
    }
    tr.append(st);

    const actions = el('td', 'right');
    if (name !== data.active) {
      const use = el('button', 'btn small', 'Use');
      use.onclick = async () => {
        await api('accounts/use', { method: 'POST', body: JSON.stringify({ name }) });
        await refreshAll();
      };
      actions.append(use);
    }
    if (info.enabled === false) {
      const on = el('button', 'btn small', 'Enable');
      on.style.marginLeft = '6px';
      on.onclick = async () => {
        await api(`accounts/${encodeURIComponent(name)}/enabled`, { method: 'POST', body: JSON.stringify({ enabled: true }) });
        await refreshAll();
      };
      actions.append(on);
    } else if (rot?.on) {
      const off = el('button', 'btn small', 'Disable');
      off.style.marginLeft = '6px';
      off.onclick = async () => {
        await api(`accounts/${encodeURIComponent(name)}/enabled`, { method: 'POST', body: JSON.stringify({ enabled: false }) });
        await refreshAll();
      };
      actions.append(off);
    }
    if (name !== 'default') {
      const del = el('button', 'btn small danger', 'Remove');
      del.style.marginLeft = '6px';
      del.onclick = async () => {
        if (!confirm(`Remove "${name}" and its credentials?`)) return;
        await api('accounts/' + encodeURIComponent(name), { method: 'DELETE' });
        await refreshAll();
      };
      actions.append(del);
    }
    tr.append(actions);
    body.append(tr);
  }
}

$('#rot-toggle').addEventListener('change', async (e) => {
  const on = e.target.checked;
  $('#rot-label').textContent = on ? 'on' : 'off';
  try {
    await api('rotation', { method: 'POST', body: JSON.stringify({ on }) });
  } catch {}
  await refreshAll();
});

let loginTimer = null;

async function startLogin(name) {
  const box = $('#login-box');
  const link = $('#login-url');
  const st = $('#login-state');
  box.classList.remove('hidden');
  link.textContent = 'waiting for the login URL…';
  link.removeAttribute('href');
  st.textContent = '';

  const { id } = await api('accounts', { method: 'POST', body: JSON.stringify({ name }) });

  const poll = async () => {
    try {
      const j = await api('login/' + id);
      if (j.url) {
        link.textContent = j.url;
        link.href = j.url;
        st.textContent = 'open the link, approve, and wait.';
        if (!link.dataset.opened) {
          link.dataset.opened = '1';
          window.open(j.url, '_blank', 'noreferrer');
        }
      }
      if (j.done) {
        clearInterval(loginTimer);
        loginTimer = null;
        if (j.ok) {
          st.textContent = 'connected.';
          await refreshAll();
          setTimeout(() => box.classList.add('hidden'), 1500);
        } else {
          st.textContent = 'login failed: ' + (j.log || 'unknown error');
        }
        return;
      }
      setTimeout(poll, 1500);
    } catch (e) {
      st.textContent = e.message;
    }
  };
  poll();
}

$('#form-add').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = $('#new-account').value.trim();
  if (!name) return;
  try {
    await startLogin(name);
    $('#new-account').value = '';
  } catch (err) {
    $('#login-box').classList.remove('hidden');
    $('#login-state').textContent = err.message;
  }
});

/* models */
function renderModels() {
  const list = $('#model-list');
  list.textContent = '';
  const items = (state.models || []).filter((m) => !state.filter || m.toLowerCase().includes(state.filter));
  for (const m of items) list.append(el('li', '', m));
  $('#models-count').textContent = `${state.models.length} available`;
}

/* test */
$('#btn-test').addEventListener('click', async () => {
  const out = $('#test-out');
  out.textContent = 'sending…';
  try {
    const r = await api('test', { method: 'POST', body: JSON.stringify({ prompt: $('#test-prompt').value }) });
    out.textContent = JSON.stringify(r, null, 2);
    await refreshMetrics();
  } catch (e) {
    out.textContent = 'error: ' + e.message;
  }
});

/* logs */
async function loadLogs() {
  const out = $('#log-out');
  out.textContent = 'loading…';
  try {
    const { text } = await api('logs?n=200');
    out.textContent = text || '(empty)';
    out.scrollTop = out.scrollHeight;
  } catch (e) {
    out.textContent = e.message;
  }
}
$('#btn-logs').addEventListener('click', loadLogs);

/* refresh */
async function refreshMetrics() {
  state.metrics = await api('metrics');
  renderKpis();
  renderChart();
  renderDonut();
  renderRecent();
}

async function refreshAll() {
  const [s, a, m] = await Promise.all([api('status'), api('accounts'), api('models')]);
  state.status = s;
  state.accounts = a;
  state.models = m.models;
  $('#side-status').textContent = `${s.transport} · ${s.port}`;
  $('#side-dot').className = 'status-dot ok';
  $('#avatar').textContent = (s.account.name || 'q').charAt(0).toUpperCase();
  $('#foot-account').textContent = `${s.account.label || s.account.name} · 127.0.0.1:${s.port}`;
  renderRotation();
  renderAccounts();
  renderModels();
  await refreshMetrics();
}

$('#btn-refresh').addEventListener('click', refreshAll);
$('#btn-stop').addEventListener('click', async () => {
  if (!confirm('Stop the bridge server?')) return;
  try { await fetch('/ui/api/stop', { method: 'POST' }); } catch {}
  setTimeout(loadStatus, 800);
});

refreshAll().catch(() => {});
setInterval(async () => {
  try { await refreshMetrics(); } catch {}
}, 10000);
setInterval(loadStatus, 20000);
