const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
};
const t = (text, vars) => (window.t ? window.t(text, vars) : text);
const locale = () => window.i18n?.locale?.() || 'en-US';

const ICONS = {
  home: '<path d="M4 10l8-6 8 6v9a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z"/>',
  plug: '<path d="M9 3v5M15 3v5M7 8h10v3a5 5 0 0 1-5 5v5M12 21v-5"/>',
  users: '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 20c0-3.2 2.5-5 5.5-5s5.5 1.8 5.5 5"/><path d="M16 5.5a3 3 0 0 1 0 5.8M17.5 20c0-2.4-1-4.2-2.6-5.2"/>',
  route: '<circle cx="6" cy="6" r="2"/><circle cx="18" cy="18" r="2"/><path d="M8 6h5a3 3 0 0 1 0 6h-2a3 3 0 0 0 0 6h5"/>',
  chart: '<path d="M4 20V4M4 20h16"/><path d="M8 16v-4M12 16V8M16 16v-6M20 16V6"/>',
  list: '<path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>',
  heart: '<path d="M20 8.5c0 5-8 10.5-8 10.5S4 13.5 4 8.5A4.5 4.5 0 0 1 12 5a4.5 4.5 0 0 1 8 3.5z"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 12l9 5 9-5M3 16l9 5 9-5"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21h-4v-.2a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6V3h4v.2a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1z"/>',
  book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 1 4 17.5z"/><path d="M4 17.5A2.5 2.5 0 0 1 6.5 15H20"/>',
  github: '<path d="M9 19c-4 1.2-4-2.2-6-2.7M15 21v-3.4a3 3 0 0 0-.8-2.3c2.7-.3 5.5-1.3 5.5-6a4.7 4.7 0 0 0-1.3-3.2 4.4 4.4 0 0 0-.1-3.2s-1-.3-3.4 1.3a11.6 11.6 0 0 0-6.2 0C6.3 2.6 5.3 2.9 5.3 2.9a4.4 4.4 0 0 0-.1 3.2A4.7 4.7 0 0 0 4 9.3c0 4.6 2.8 5.6 5.5 6a3 3 0 0 0-.8 2.3V21"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.6 3.9 5.6 3.9 9s-1.3 6.4-3.9 9c-2.6-2.6-3.9-5.6-3.9-9S9.4 5.6 12 3z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/>',
  bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  key: '<circle cx="8" cy="15" r="3"/><path d="M10.5 12.5L20 3M16 7l3 3M13 10l3 3"/>',
  cpu: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v2M15 2v2M9 20v2M15 20v2M2 9h2M2 15h2M20 9h2M20 15h2"/>',
  activity: '<path d="M3 12h4l2.5-7 4 14 2.5-7H21"/>',
  check: '<path d="M5 13l4 4L19 7"/>',
  alert: '<path d="M12 3l9 17H3z"/><path d="M12 9v5M12 17v.5"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.9-3M4 5v4h4"/><path d="M4 13a8 8 0 0 0 14.9 3M20 19v-4h-4"/>',
  copy: '<rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"/>',
  play: '<path d="M8 5l11 7-11 7z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  up: '<path d="M6 14l6-6 6 6"/>',
  down: '<path d="M6 10l6 6 6-6"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
};

const KEY_STORE = 'bridge_api_key';
const THEME_STORE = 'qoder_theme';
const query = new URLSearchParams(location.search);
const hash = location.hash.startsWith('#') ? new URLSearchParams(location.hash.slice(1)) : new URLSearchParams();
const urlKey = query.get('key') || hash.get('key');
if (urlKey) sessionStorage.setItem(KEY_STORE, urlKey);
if (urlKey) {
  query.delete('key');
  hash.delete('key');
  const search = query.toString() ? `?${query}` : '';
  const fragment = hash.toString() ? `#${hash}` : '';
  history.replaceState(null, '', `${location.pathname}${search}${fragment}`);
}
const bridgeKey = () => sessionStorage.getItem(KEY_STORE) || '';
let askedKey = false;

const state = {
  page: 'home',
  status: null,
  accounts: null,
  models: [],
  modelsMeta: null,
  config: null,
  claude: null,
  health: null,
  metrics: null,
  heat: null,
  quota: null,
  rewards: null,
  logs: '',
  range: '30m',
  search: '',
  usage: { status: '', model: '', account: '', transport: '', source: '' },
};

const TITLES = {
  home: ['Home', 'Bridge overview and live traffic.'],
  endpoint: ['Endpoint', 'Point Claude Code at this bridge.'],
  accounts: ['Accounts', 'Qoder profiles and failover.'],
  routing: ['Routing', 'Failover policy, timeouts and account order.'],
  analytics: ['Analytics', 'Requests, latency and token estimates.'],
  usage: ['Usage & Logs', 'Request log and bridge output.'],
  health: ['Health', 'Process, memory and transport state.'],
  models: ['Models', 'Live list from the Qoder CLI cache.'],
  settings: ['Settings', 'Bridge runtime and Claude Code defaults.'],
};

function icon(name) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ICONS.activity}</svg>`;
}
function hydrate(root = document) {
  for (const node of $$('[data-icon]', root)) node.innerHTML = icon(node.dataset.icon);
}

async function api(path, opts = {}) {
  const call = () => fetch('/ui/api/' + path, {
    ...opts,
    headers: {
      'content-type': 'application/json',
      ...(bridgeKey() ? { 'x-api-key': bridgeKey() } : {}),
      ...(opts.headers || {}),
    },
  });
  let res = await call();
  if (res.status === 401 && !askedKey) {
    askedKey = true;
    const key = window.prompt(t('API key (BRIDGE_API_KEY) to open the dashboard:')) || '';
    if (key) {
      sessionStorage.setItem(KEY_STORE, key);
      res = await call();
    }
  }
  const text = await res.text();
  let body = {};
  try { body = JSON.parse(text); } catch { body = { error: text }; }
  if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
  return body;
}

function fmtInt(n) {
  return Number(n || 0).toLocaleString(locale());
}
function fmtMs(n) {
  const v = Number(n || 0);
  return v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 1 : 2)} s` : `${Math.round(v)} ms`;
}
function fmtBytes(n) {
  const v = Number(n || 0);
  if (v >= 1073741824) return `${(v / 1073741824).toFixed(1)} GB`;
  if (v >= 1048576) return `${(v / 1048576).toFixed(1)} MB`;
  if (v >= 1024) return `${(v / 1024).toFixed(0)} KB`;
  return `${v} B`;
}
function fmtDuration(seconds) {
  const s = Number(seconds || 0);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
  return `${Math.floor(s / 86400)}d ${Math.floor((s % 86400) / 3600)}h`;
}
function timeOf(value) {
  return new Date(value).toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit', hour12: false });
}
function pct(n) { return `${Math.round(Number(n) || 0)}%`; }
function fmtCredits(n) {
  const value = Number(n) || 0;
  return value.toLocaleString(locale(), { maximumFractionDigits: value >= 100 ? 0 : 1 });
}
function quotaState(record) {
  if (!record) return { cls: '', label: '—' };
  if (record.status === 'exceeded' || record.exceeded) return { cls: 'err', label: t('Quota exceeded') };
  if (record.status === 'no-auth') return { cls: 'warn', label: t('No account signed in') };
  if (record.status !== 'ok') return { cls: 'warn', label: t('Unavailable') };
  if (record.percent >= 95) return { cls: 'err', label: t('Critical') };
  if (record.percent >= 80) return { cls: 'warn', label: t('Low quota') };
  return { cls: 'ok', label: t('Ready') };
}
function quotaCell(record) {
  if (!record) return '—';
  if (record.status === 'exceeded') return t('Quota exceeded');
  if (record.status !== 'ok') return record.status === 'no-auth' ? t('No account signed in') : t('Unavailable');
  return `${pct(record.percent)} · ${fmtCredits(record.used)}/${fmtCredits(record.total)}`;
}
function forecastDate(value) {
  return value ? new Date(value).toLocaleDateString(locale()) : '—';
}
function unitLabel(unit) {
  return unit === 'credits' ? t('credits') : unit;
}
function sourceLabel(value) {
  return t(value === 'upstream' ? 'Real' : value === 'mixed' ? 'Mixed' : 'Estimated');
}
function ago(value) {
  const seconds = Math.max(0, Math.round((Date.now() - Number(value || 0)) / 1000));
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

function toast(message, kind = '') {
  const node = el('div', `toast ${kind}`, message);
  $('#toasts').append(node);
  setTimeout(() => node.remove(), 4500);
}

function copyText(text) {
  if (!text) return;
  navigator.clipboard?.writeText(text).then(() => toast('Copied', 'ok')).catch(() => toast('Copy failed', 'err'));
}

function statusBadge(status) {
  const ok = status >= 200 && status < 300;
  return `<span class="badge-status ${ok ? 'ok' : 'err'}">${status}</span>`;
}

/* theme */
function storedTheme() {
  return localStorage.getItem(THEME_STORE) || 'dark';
}
function resolvedTheme() {
  const choice = storedTheme();
  if (choice !== 'system') return choice;
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}
function applyTheme() {
  document.documentElement.dataset.theme = resolvedTheme();
  const btn = $('#theme-btn');
  if (btn) btn.innerHTML = icon(resolvedTheme() === 'dark' ? 'sun' : 'moon');
  $$('#theme-seg [data-theme-choice]').forEach((b) => b.classList.toggle('active', b.dataset.themeChoice === storedTheme()));
}
function setTheme(choice) {
  localStorage.setItem(THEME_STORE, choice);
  applyTheme();
}
function cycleTheme() {
  const order = ['dark', 'light', 'system'];
  setTheme(order[(order.indexOf(storedTheme()) + 1) % order.length]);
}

/* navigation */
function showPage(page) {
  if (!TITLES[page]) page = 'home';
  state.page = page;
  $$('.nav-item[data-page]').forEach((b) => b.classList.toggle('active', b.dataset.page === page));
  $$('.page').forEach((p) => p.classList.toggle('active', p.id === `page-${page}`));
  const [title, sub] = TITLES[page];
  state.search = '';
  const search = $('#search');
  if (search) search.value = '';
  $('#crumb-page').textContent = title;
  $('#page-' + page).querySelector('.page-head h1').textContent = title;
  $('#page-' + page).querySelector('.page-head p').textContent = sub;
  history.replaceState(null, '', `#/${page}`);
  document.querySelector('.app').classList.remove('nav-open');
  const loaders = {
    home: loadHome,
    endpoint: loadEndpoint,
    accounts: loadAccounts,
    routing: loadRouting,
    analytics: loadAnalytics,
    usage: loadUsage,
    health: loadHealth,
    models: loadModels,
    settings: loadSettings,
  };
  loaders[page]?.().catch((e) => toast(e.message, 'err'));
}

/* status */
async function refreshStatus() {
  try {
    const status = await api('status');
    state.status = status;
    $('#side-status').textContent = `${status.transport} · ${status.port}`;
    $('#side-dot').className = 'dot ok';
    $('#live-dot').className = 'dot ok';
    $('#live-label').textContent = 'live';
    $('#brand-version').textContent = `v${status.version}`;
    if (status.account) $('#nav-accounts').textContent = status.rotation?.count || '1';
    renderHomeStatus();
  } catch {
    $('#side-status').textContent = 'offline';
    $('#side-dot').className = 'dot bad';
    $('#live-dot').className = 'dot bad';
    $('#live-label').textContent = 'offline';
    renderHomeStatus();
  }
}

function renderHomeStatus() {
  const box = $('#home-status');
  if (!box) return;
  if (!state.status) {
    box.className = 'status-banner bad';
    box.innerHTML = '<span class="dot bad"></span><span>Bridge unreachable</span>';
    return;
  }
  box.className = 'status-banner';
  box.innerHTML = '<span class="dot ok"></span><span>All systems operational</span>';
  const right = el('span', 'muted small');
  right.style.marginLeft = 'auto';
  right.textContent = `${state.status.transport} · ${state.status.host}:${state.status.port}`;
  box.append(right);
}

/* charts */
function lineChart(box, series, { latency = false } = {}) {
  box.textContent = '';
  const data = Array.isArray(series) ? series : [];
  if (!data.length) {
    box.append(el('div', 'chart-empty', 'no data yet'));
    return;
  }
  const w = 620, h = 220, l = 34, r = 10, t = 12, b = 24;
  const maxCount = Math.max(1, ...data.map((p) => p.count || 0));
  const maxLat = Math.max(1, ...data.map((p) => p.avg || 0));
  const n = data.length;
  const x = (i) => l + (i * (w - l - r)) / Math.max(1, n - 1);
  const yCount = (v) => h - b - (v / maxCount) * (h - t - b);
  const yLat = (v) => h - b - (v / maxLat) * (h - t - b);
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  const add = (tag, attrs) => {
    const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    svg.append(node);
    return node;
  };
  for (let i = 0; i <= 3; i += 1) {
    const y = t + ((h - t - b) * i) / 3;
    add('line', { x1: l, y1: y, x2: w - r, y2: y, class: 'gridline' });
    if (i === 0 || i === 3) {
      const label = add('text', { x: 2, y: y + 3, class: 'axis' });
      label.textContent = i === 0 ? fmtInt(maxCount) : '0';
    }
  }
  const step = Math.max(1, Math.ceil(n / 6));
  data.forEach((point, i) => {
    if (i % step !== 0 && i !== n - 1) return;
    const label = add('text', { x: x(i), y: h - 6, class: 'axis', 'text-anchor': 'middle' });
    label.textContent = point.label || '';
  });
  const countPath = data.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${yCount(p.count || 0).toFixed(1)}`).join(' ');
  const areaPath = `${countPath} L${x(n - 1).toFixed(1)},${h - b} L${x(0).toFixed(1)},${h - b} Z`;
  add('path', { d: areaPath, fill: 'var(--accent-soft)', stroke: 'none' });
  add('path', { d: countPath, class: 'line' });
  if (latency) {
    const latPath = data.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${yLat(p.avg || 0).toFixed(1)}`).join(' ');
    add('path', { d: latPath, class: 'line-2' });
  }
  data.forEach((p, i) => {
    add('circle', { cx: x(i), cy: yCount(p.count || 0), r: 1.5, fill: 'var(--accent)' });
  });
  box.append(svg);
}

function tokenChart(box, series) {
  box.textContent = '';
  const data = Array.isArray(series) ? series : [];
  if (!data.length) {
    box.append(el('div', 'chart-empty', 'no data yet'));
    return;
  }
  const w = 620, h = 220, l = 34, r = 10, t = 12, b = 24;
  const max = Math.max(1, ...data.map((p) => (p.in || 0) + (p.out || 0)));
  const n = data.length;
  const gap = (w - l - r) / Math.max(1, n);
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  const add = (tag, attrs) => {
    const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    svg.append(node);
  };
  for (let i = 0; i <= 3; i += 1) {
    const y = t + ((h - t - b) * i) / 3;
    add('line', { x1: l, y1: y, x2: w - r, y2: y, class: 'gridline' });
    if (i === 0 || i === 3) {
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', 2); label.setAttribute('y', y + 3); label.setAttribute('class', 'axis');
      label.textContent = i === 0 ? fmtInt(max) : '0';
      svg.append(label);
    }
  }
  data.forEach((p, i) => {
    const x = l + i * gap;
    const totalH = ((p.in || 0) / max) * (h - t - b);
    const outH = ((p.out || 0) / max) * (h - t - b);
    add('rect', { x: x + gap * 0.18, y: h - b - totalH, width: Math.max(1, gap * 0.28), height: totalH, class: 'bar' });
    add('rect', { x: x + gap * 0.52, y: h - b - outH, width: Math.max(1, gap * 0.28), height: outH, class: 'bar-2' });
  });
  box.append(svg);
}

function creditChart(box, series) {
  box.textContent = '';
  const data = Array.isArray(series) ? series : [];
  if (!data.length) {
    box.append(el('div', 'chart-empty', 'no data yet'));
    return;
  }
  const w = 620, h = 220, l = 34, r = 10, t = 12, b = 24;
  const max = Math.max(1, ...data.map((p) => Number(p.credits) || 0));
  const n = data.length;
  const gap = (w - l - r) / Math.max(1, n);
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  const add = (tag, attrs) => {
    const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    svg.append(node);
  };
  for (let i = 0; i <= 3; i += 1) {
    const y = t + ((h - t - b) * i) / 3;
    add('line', { x1: l, y1: y, x2: w - r, y2: y, class: 'gridline' });
    if (i === 0 || i === 3) {
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', 2); label.setAttribute('y', y + 3); label.setAttribute('class', 'axis');
      label.textContent = i === 0 ? fmtCredits(max) : '0';
      svg.append(label);
    }
  }
  data.forEach((p, i) => {
    const height = ((Number(p.credits) || 0) / max) * (h - t - b);
    add('rect', { x: l + i * gap + gap * 0.2, y: h - b - height, width: Math.max(1, gap * 0.6), height, class: 'bar' });
  });
  box.append(svg);
}

function donut(box, success, sub) {
  box.textContent = '';
  const value = Math.max(0, Math.min(100, Number(success) || 0));
  const r = 48;
  const c = 2 * Math.PI * r;
  const wrap = el('div', 'donut');
  wrap.innerHTML = `<svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="${r}" class="donut-bg"/><circle cx="60" cy="60" r="${r}" class="donut-fg"/></svg><div class="donut-center"><strong>${value}%</strong><span>success</span></div>`;
  const ring = wrap.querySelector('.donut-fg');
  ring.style.strokeDasharray = `${(c * value) / 100} ${c}`;
  ring.style.stroke = value >= 95 ? 'var(--ok)' : value >= 80 ? 'var(--warn)' : 'var(--err)';
  box.append(wrap);
  const label = $('#home-donut-sub');
  if (label) label.textContent = sub || '';
}

function heatmap(box, series) {
  box.textContent = '';
  const data = Array.isArray(series) ? series.slice(-168) : [];
  if (!data.length) {
    box.append(el('div', 'chart-empty', 'no activity yet'));
    return;
  }
  const max = Math.max(1, ...data.map((p) => p.count || 0));
  const grid = el('div', 'heat-grid');
  data.forEach((point) => {
    const count = point.count || 0;
    const ratio = count / max;
    const level = count === 0 ? '' : ratio > 0.75 ? 'l4' : ratio > 0.5 ? 'l3' : ratio > 0.25 ? 'l2' : 'l1';
    const cell = el('span', `hm-cell ${level}`);
    cell.title = t(count === 1 ? '{label}: {count} request' : '{label}: {count} requests', { label: point.label, count });
    grid.append(cell);
  });
  box.append(grid);
  const labels = el('div', 'heat-labels');
  labels.innerHTML = '<span>00</span><span>06</span><span>12</span><span>18</span><span>23</span>';
  box.append(labels);
}

/* render helpers */
function kpis(box, items) {
  box.textContent = '';
  for (const item of items) {
    const card = el('div', 'kpi');
    const top = el('div', 'k-top');
    top.append(el('span', '', item.label));
    const ico = el('span', 'k-ico');
    ico.innerHTML = icon(item.icon || 'activity');
    top.append(ico);
    card.append(top, el('div', 'k-value', item.value));
    const sub = el('div', 'k-sub');
    if (item.subHtml) sub.innerHTML = item.subHtml;
    else sub.textContent = item.sub || '';
    card.append(sub);
    box.append(card);
  }
}

function emptyTable(table, cols, text = 'no data yet') {
  table.textContent = '';
  const thead = el('thead');
  const tr = el('tr');
  for (const col of cols) tr.append(el('th', col.right ? 'right' : '', col.label));
  thead.append(tr);
  const tbody = el('tbody');
  const row = el('tr', 'empty');
  const td = el('td', '', text);
  td.colSpan = cols.length;
  row.append(td);
  tbody.append(row);
  table.append(thead, tbody);
}

function renderRecent(table, rows) {
  const cols = [
    { label: t('Time') }, { label: t('Model') }, { label: t('Account') }, { label: t('Status') },
    { label: t('Tokens'), right: true }, { label: 'TTFT', right: true }, { label: t('Latency'), right: true },
  ];
  const filtered = (rows || []).filter((row) => {
    const needle = state.search.trim().toLowerCase();
    return !needle || `${row.model} ${row.account} ${row.transport}`.toLowerCase().includes(needle);
  });
  if (!filtered.length) return emptyTable(table, cols, 'no requests yet');
  table.textContent = '';
  const thead = el('thead');
  const tr = el('tr');
  for (const col of cols) tr.append(el('th', col.right ? 'right' : '', col.label));
  thead.append(tr);
  const tbody = el('tbody');
  for (const row of filtered.slice(0, 12)) {
    const line = el('tr');
    line.append(
      el('td', 'mono', timeOf(row.t)),
      el('td', 'strong', row.model),
      el('td', 'mono', row.account),
      el('td', '', ''),
      el('td', 'right mono', `${row.in || 0} / ${row.out || 0}`),
      el('td', 'right mono', row.ttft ? fmtMs(row.ttft) : '—'),
      el('td', 'right mono', fmtMs(row.ms)),
    );
    line.children[3].innerHTML = statusBadge(row.status);
    tbody.append(line);
  }
  table.append(thead, tbody);
}

function renderUsage() {
  const table = $('#usage-table');
  const rows = (state.metrics?.recent || []).filter((row) => {
    const needle = state.search.trim().toLowerCase();
    if (needle && !`${row.model} ${row.account} ${row.transport} ${row.credits} ${row.usageSource}`.toLowerCase().includes(needle)) return false;
    if (state.usage.status === 'ok' && !(row.status >= 200 && row.status < 300)) return false;
    if (state.usage.status === 'err' && row.status >= 200 && row.status < 300) return false;
    if (state.usage.model && row.model !== state.usage.model) return false;
    if (state.usage.account && row.account !== state.usage.account) return false;
    if (state.usage.transport && row.transport !== state.usage.transport) return false;
    if (state.usage.source && (row.usageSource || 'estimated') !== state.usage.source) return false;
    return true;
  });
  const cols = [
    { label: t('Time') }, { label: t('Model') }, { label: t('Account') }, { label: t('Transport') },
    { label: t('Status') }, { label: t('In'), right: true }, { label: t('Out'), right: true },
    { label: t('Credits'), right: true }, { label: t('Source') }, { label: 'TTFT', right: true }, { label: t('Latency'), right: true },
  ];
  $('#usage-count').textContent = t('{count} shown', { count: rows.length });
  if (!rows.length) return emptyTable(table, cols, 'no requests match');
  table.textContent = '';
  const thead = el('thead');
  const tr = el('tr');
  for (const col of cols) tr.append(el('th', col.right ? 'right' : '', col.label));
  thead.append(tr);
  const tbody = el('tbody');
  for (const row of rows) {
    const line = el('tr');
    line.append(
      el('td', 'mono', timeOf(row.t)),
      el('td', 'strong', row.model),
      el('td', 'mono', row.account),
      el('td', 'mono', row.transport),
      el('td', '', ''),
      el('td', 'right mono', fmtInt(row.in)),
      el('td', 'right mono', fmtInt(row.out)),
      el('td', 'right mono', fmtCredits(row.credits)),
      el('td', 'mono', sourceLabel(row.usageSource)),
      el('td', 'right mono', row.ttft ? fmtMs(row.ttft) : '—'),
      el('td', 'right mono', fmtMs(row.ms)),
    );
    line.children[4].innerHTML = statusBadge(row.status);
    tbody.append(line);
  }
  table.append(thead, tbody);
}

function renderTop(table, rows, nameLabel) {
  const cols = [
    { label: nameLabel }, { label: t('Requests'), right: true }, { label: t('Errors'), right: true },
    { label: t('Avg'), right: true }, { label: t('Tokens'), right: true },
  ];
  if (!rows?.length) return emptyTable(table, cols, 'no data yet');
  table.textContent = '';
  const thead = el('thead');
  const tr = el('tr');
  for (const col of cols) tr.append(el('th', col.right ? 'right' : '', col.label));
  thead.append(tr);
  const tbody = el('tbody');
  for (const row of rows) {
    const line = el('tr');
    line.append(
      el('td', 'strong', row.name),
      el('td', 'right mono', fmtInt(row.count)),
      el('td', 'right mono', fmtInt(row.err)),
      el('td', 'right mono', fmtMs(row.avgMs)),
      el('td', 'right mono', fmtInt((row.in || 0) + (row.out || 0))),
    );
    tbody.append(line);
  }
  table.append(thead, tbody);
}

/* loaders */
async function loadHome() {
  await refreshStatus();
  state.metrics = await api('metrics?range=30m');
  if (!state.accounts) state.accounts = await api('accounts');
  state.quota = await api('quota').catch(() => state.quota);
  const m = state.metrics;
  const status = state.status;
  const quota = state.quota?.summary;
  kpis($('#home-kpis'), [
    { label: t('Requests'), value: fmtInt(m.total), sub: t('{ok} ok · {err} errors', { ok: m.ok, err: m.err }), icon: 'bolt' },
    { label: t('Success'), value: pct(m.success), sub: t('{total} completed', { total: fmtInt(m.total) }), icon: 'check' },
    { label: t('Avg latency'), value: fmtMs(m.avgMs), sub: t('p95 {ms}', { ms: fmtMs(m.p95) }), icon: 'clock' },
    { label: t('Tokens'), value: fmtInt(m.tokensIn + m.tokensOut), sub: t('{in} in · {out} out', { in: fmtInt(m.tokensIn), out: fmtInt(m.tokensOut) }), icon: 'chart' },
    { label: t('Credits'), value: quota?.status === 'ok' ? pct(quota.percent) : '—', sub: quota?.status === 'ok' ? t('{used}/{total} credits · {remaining} left', { used: fmtCredits(quota.used), total: fmtCredits(quota.total), remaining: fmtCredits(quota.remaining) }) : t(quota?.status === 'no-auth' ? 'No account signed in' : quota?.status === 'exceeded' ? 'Quota exceeded' : 'Unavailable'), icon: 'key' },
    { label: t('Accounts'), value: fmtInt(state.accounts?.rotation?.accounts?.length || 0), sub: status?.rotation?.on ? t('failover on · {count} in pool', { count: status.rotation.count }) : t('failover off'), icon: 'users' },
    { label: t('Models'), value: fmtInt(status?.models || state.models.length), sub: t('transport {transport}', { transport: status?.transport || '—' }), icon: 'layers' },
    { label: t('Sessions'), value: fmtInt(status?.sessions || 0), sub: status?.pool?.enabled ? t('pool {ready}/{size}', { ready: status.pool.ready, size: status.pool.size }) : t('direct transport'), icon: 'activity' },
    { label: t('Uptime'), value: fmtDuration(status?.uptime || 0), sub: t('pid {pid}', { pid: status?.pid || '—' }), icon: 'heart' },
  ]);
  lineChart($('#home-chart'), m.series);
  donut($('#home-donut'), m.success, t(m.total === 1 ? '{total} request' : '{total} requests', { total: fmtInt(m.total) }));
  renderRecent($('#home-recent'), m.recent);
  const route = $('#home-route');
  route.textContent = '';
  const lines = [
    ['Account', status?.account?.label || status?.account?.name || '—'],
    ['Transport', status?.transport || '—'],
    ['Endpoint', status ? `${status.host}:${status.port}` : '—'],
    ['Version', status?.version ? `v${status.version}` : '—'],
    ['Credits', quotaCell(quota)],
    ['Last error', m.lastError ? `${m.lastError.status} · ${new Date(m.lastError.t).toLocaleTimeString(locale())}` : 'none'],
  ];
  for (const [key, value] of lines) {
    const row = el('div', 'route-line');
    row.append(el('span', '', key), el('span', '', value));
    route.append(row);
  }
  renderHomeStatus();
}

async function loadEndpoint() {
  await refreshStatus();
  if (!state.claude) state.claude = await api('claude');
  const status = state.status || {};
  const host = !status.host || status.host === '0.0.0.0' ? '127.0.0.1' : status.host;
  const url = `http://${host}:${status.port || 8787}`;
  $('#endpoint-url').textContent = url;
  $('#endpoint-host').textContent = `${status.host || '127.0.0.1'} · ${t('local server')}`;
  $('#endpoint-key-state').textContent = status.apiKeySet ? 'key required' : 'no key';
  $('#endpoint-key-state').className = `pill ${status.apiKeySet ? 'warn' : 'ok'}`;
  const snippet = {
    env: {
      ANTHROPIC_BASE_URL: url,
      ANTHROPIC_AUTH_TOKEN: status.apiKeySet ? '<your BRIDGE_API_KEY>' : 'dummy',
    },
  };
  $('#claude-snippet').textContent = JSON.stringify(snippet, null, 2);
  const table = $('#endpoint-table');
  table.textContent = '';
  const thead = el('thead');
  const tr = el('tr');
  for (const label of ['Method', 'Path', 'Purpose']) tr.append(el('th', '', label));
  thead.append(tr);
  const tbody = el('tbody');
  for (const [method, path, purpose] of [
    ['POST', '/v1/messages', 'Anthropic Messages API (stream and non-stream)'],
    ['GET', '/v1/models', 'Model list'],
    ['POST', '/v1/messages/count_tokens', 'Token estimate'],
    ['GET', '/health', 'Bridge health'],
    ['GET', '/ui', 'This dashboard'],
  ]) {
    const line = el('tr');
    line.append(el('td', 'mono strong', method), el('td', 'mono', path), el('td', '', purpose));
    tbody.append(line);
  }
  table.append(thead, tbody);
}

async function loadAccounts() {
  const [accounts, quota, rewards] = await Promise.all([
    api('accounts'),
    api('quota').catch(() => null),
    api('rewards').catch(() => null),
  ]);
  state.accounts = accounts;
  if (quota) state.quota = quota;
  if (rewards) state.rewards = rewards;
  renderAccounts();
}

function renderRewards() {
  const box = $('#reward-rows');
  if (!box) return;
  box.textContent = '';
  const rows = Object.values(state.rewards?.accounts || {});
  const claimable = rows.filter((row) => row.status === 'claimable').length;
  const claimed = rows.filter((row) => row.status === 'claimed').length;
  const pill = $('#reward-state');
  if (pill) {
    pill.textContent = claimable
      ? t('{count} rewards available', { count: claimable })
      : claimed ? t('Claimed') : t('No reward available');
    pill.className = `pill ${claimable ? 'accent' : claimed ? 'ok' : ''}`;
  }
  if (!rows.length) {
    box.append(el('div', 'muted small', t('No reward available')));
    return;
  }
  for (const row of rows) {
    const line = el('div', 'reward-row');
    const grow = el('div', 'grow');
    grow.append(el('strong', '', `${row.label || row.name}${row.active ? ` · ${t('current')}` : ''}`));
    let detail = t('No reward available');
    if (row.status === 'claimable') {
      detail = `${row.campaign.amount} ${t('credits')} · ${t('Ends {date}', { date: forecastDate(row.campaign.endAt) })}`;
    } else if (row.status === 'claimed') {
      const expires = row.campaign.expiresAt ? t('Expires {date}', { date: forecastDate(row.campaign.expiresAt) }) : t('Already claimed today');
      detail = `${row.campaign.amount} ${t('credits')} · ${expires}`;
    } else if (row.status === 'no-auth') {
      detail = t('No account signed in');
    } else if (row.status !== 'none') {
      detail = t('Unavailable');
    }
    grow.append(el('span', '', detail));
    line.append(grow);
    if (row.status === 'claimable') {
      const button = el('button', 'btn primary small', t('Claim 100 credits'));
      button.addEventListener('click', async () => {
        button.disabled = true;
        try {
          const result = await api('rewards/claim', { method: 'POST', body: JSON.stringify({ account: row.name }) });
          toast(result.status === 'claimed' ? t('Reward claimed') : t('Already claimed today'), 'ok');
          await loadAccounts();
        } catch (e) {
          toast(e.message, 'err');
          button.disabled = false;
        }
      });
      line.append(button);
    } else if (row.status === 'claimed') {
      line.append(el('span', 'pill ok', t('Claimed')));
    } else {
      line.append(el('span', 'pill', t('Not available')));
    }
    box.append(line);
  }
}

function renderAccounts() {
  const data = state.accounts;
  if (!data) return;
  renderRewards();
  const rot = data.rotation;
  $('#rot-toggle').checked = Boolean(rot.on);
  $('#rot-label').textContent = rot.on ? 'on' : 'off';
  $('#nav-accounts').textContent = rot.accounts.filter((a) => a.enabled).length;
  const strip = $('#rot-strip');
  strip.textContent = '';
  for (const account of rot.accounts) {
    const pill = el('span', `who ${account.active ? 'active' : ''} ${account.coolingLeft ? 'cooling' : ''}`);
    pill.append(el('span', 'dot ' + (account.coolingLeft ? '' : 'ok')));
    pill.append(document.createTextNode(account.label || account.name));
    strip.append(pill);
  }
  const grid = $('#account-cards');
  grid.textContent = '';
  for (const account of rot.accounts) {
    const card = el('div', `account-card ${account.active ? 'active' : ''}`);
    const head = el('div', 'a-head');
    const name = el('div', 'a-name');
    const avatar = el('span', 'a-avatar', (account.label || account.name).charAt(0).toUpperCase());
    const title = el('div', 'a-title');
    title.append(el('strong', '', account.label || account.name), el('span', '', account.dir || '~/.qoder'));
    name.append(avatar, title);
    head.append(name, el('span', `pill ${account.active ? 'accent' : account.coolingLeft ? 'warn' : 'ok'}`, account.active ? 'active' : account.coolingLeft ? t('paused {time}', { time: fmtDuration(account.coolingLeft) }) : 'ready'));
    card.append(head);
    const meta = el('div', 'a-meta');
    meta.append(el('span', 'pill', account.enabled ? 'enabled' : 'disabled'));
    if (account.active) meta.append(el('span', 'pill accent', 'current'));
    card.append(meta);
    if (account.reason) card.append(el('p', 'muted small', account.reason));
    const quota = state.quota?.accounts?.[account.name];
    if (quota) {
      const info = quotaState(quota);
      const box = el('div', 'quota-box');
      const top = el('div', 'quota-top');
      top.append(el('span', 'muted small', t('Quota')), el('span', `pill ${info.cls}`, info.label));
      box.append(top);
      const bar = el('div', 'meter');
      const fill = el('span', `meter-fill ${info.cls}`);
      fill.style.width = `${quota.status === 'ok' ? Math.min(100, quota.percent) : 0}%`;
      bar.append(fill);
      box.append(bar);
      box.append(el('div', 'muted small', quota.status === 'exceeded' ? `0 ${t('credits')}` : quotaCell(quota)));
      if (quota.status === 'ok') {
        const detail = [`${quota.plan || '—'}`, `${t('Updated {when} ago', { when: ago(quota.fetchedAt) })}`];
        if (quota.burnPerDay) detail.push(t('{rate} credits/day', { rate: fmtCredits(quota.burnPerDay) }));
        box.append(el('div', 'muted small', detail.join(' · ')));
        if (quota.forecastAt) box.append(el('div', 'muted small', t('Forecast: {date}', { date: forecastDate(quota.forecastAt) })));
      }
      card.append(box);
    }
    const actions = el('div', 'a-actions');
    if (!account.active) {
      const use = el('button', 'btn small', 'Use');
      use.addEventListener('click', async () => {
        try { await api('accounts/use', { method: 'POST', body: JSON.stringify({ name: account.name }) }); toast('Account switched', 'ok'); await loadAccounts(); await refreshStatus(); } catch (e) { toast(e.message, 'err'); }
      });
      actions.append(use);
    }
    const toggle = el('button', 'btn small ghost', account.enabled ? 'Disable' : 'Enable');
    toggle.addEventListener('click', async () => {
      try { await api(`accounts/${encodeURIComponent(account.name)}/enabled`, { method: 'POST', body: JSON.stringify({ enabled: !account.enabled }) }); await loadAccounts(); } catch (e) { toast(e.message, 'err'); }
    });
    actions.append(toggle);
    if (account.name !== 'default') {
      const remove = el('button', 'btn small danger', 'Remove');
      remove.addEventListener('click', () => confirmModal('Remove account', t('Remove {name} and its config directory?', { name: account.label || account.name }), async () => {
        try { await api(`accounts/${encodeURIComponent(account.name)}`, { method: 'DELETE' }); closeModal(); toast('Account removed', 'ok'); await loadAccounts(); } catch (e) { toast(e.message, 'err'); }
      }, 'Remove'));
      actions.append(remove);
    }
    card.append(actions);
    grid.append(card);
  }
}

async function loadRouting() {
  state.config = await api('config');
  state.accounts = await api('accounts');
  fillRouting();
}

function fillRouting() {
  const cfg = state.config || {};
  const locked = cfg.envLocked || {};
  const set = (id, value, key) => {
    const node = $(id);
    if (!node) return;
    if (node.type === 'checkbox') node.checked = Boolean(value);
    else node.value = value ?? '';
    if (key && locked[key]) { node.disabled = true; node.title = 'Overridden by an environment variable'; }
  };
  set('#routing-max-attempts', cfg.maxAttempts, 'maxAttempts');
  set('#routing-retries', cfg.modelRetries, 'modelRetries');
  set('#routing-request-timeout', cfg.requestTimeoutMs, 'requestTimeoutMs');
  set('#routing-stall', cfg.stallMs, 'stallMs');
  set('#routing-transport', cfg.transport, 'transport');
  set('#routing-pool-size', cfg.poolSize, 'poolSize');
  const order = $('#route-order');
  order.textContent = '';
  const accounts = state.accounts?.rotation?.accounts || [];
  accounts.forEach((account, index) => {
    const li = el('li');
    li.append(el('span', 'idx', String(index + 1)), el('span', 'grow', account.label || account.name), el('span', `pill ${account.active ? 'accent' : ''}`, account.active ? 'active' : account.enabled ? 'ready' : 'off'));
    const up = el('button', 'icon-btn small', '');
    up.innerHTML = icon('up');
    up.addEventListener('click', () => moveAccount(index, -1));
    const down = el('button', 'icon-btn small', '');
    down.innerHTML = icon('down');
    down.addEventListener('click', () => moveAccount(index, 1));
    li.append(up, down);
    order.append(li);
  });
  const table = $('#cooldown-table');
  table.textContent = '';
  const thead = el('thead');
  const tr = el('tr');
  for (const label of ['Failure', 'Cooldown']) tr.append(el('th', '', label));
  thead.append(tr);
  const tbody = el('tbody');
  for (const [label, value] of [
    ['Billing, quota, 403', '30 min'],
    ['Auth, 401, expired login', '10 min'],
    ['Rate limit, 429', '1 min'],
    ['Timeout, connection reset, stall', '30 s'],
  ]) {
    const line = el('tr');
    line.append(el('td', '', label), el('td', 'mono', value));
    tbody.append(line);
  }
  table.append(thead, tbody);
}

async function moveAccount(index, delta) {
  const accounts = state.accounts?.rotation?.accounts || [];
  const names = accounts.map((a) => a.name);
  const next = index + delta;
  if (next < 0 || next >= names.length) return;
  [names[index], names[next]] = [names[next], names[index]];
  try {
    await api('accounts/order', { method: 'POST', body: JSON.stringify({ order: names }) });
    await loadRouting();
    toast('Route order saved', 'ok');
  } catch (e) { toast(e.message, 'err'); }
}

async function loadAnalytics() {
  const [metrics, heat, quota] = await Promise.all([
    api(`metrics?range=${state.range}`),
    api('metrics?range=7d'),
    api('quota').catch(() => null),
  ]);
  state.metrics = metrics;
  state.heat = heat;
  if (quota) state.quota = quota;
  renderAnalytics();
}

function renderAnalytics() {
  const m = state.metrics || {};
  const quota = state.quota?.summary;
  const tokenSource = m.usageReal && !m.usageEstimated ? t('real usage') : m.usageReal ? t('Mixed') : t('estimated');
  const topModel = m.topModels?.[0]?.name || '—';
  kpis($('#analytics-kpis'), [
    { label: t('Requests'), value: fmtInt(m.total), sub: t('{ok} ok · {err} err', { ok: m.ok, err: m.err }), icon: 'bolt' },
    { label: t('Success'), value: pct(m.success), sub: t('completed'), icon: 'check' },
    { label: t('P50'), value: fmtMs(m.p50), sub: t('latency'), icon: 'clock' },
    { label: t('P95'), value: fmtMs(m.p95), sub: t('latency'), icon: 'activity' },
    { label: t('TTFT p50'), value: m.ttftP50 ? fmtMs(m.ttftP50) : '—', sub: t('first token'), icon: 'play' },
    { label: t('Tokens in'), value: fmtInt(m.tokensIn), sub: tokenSource, icon: 'chart' },
    { label: t('Tokens out'), value: fmtInt(m.tokensOut), sub: tokenSource, icon: 'chart' },
    { label: t('Credits'), value: fmtCredits(m.credits), sub: t('in this range'), icon: 'key' },
    { label: t('Burn rate'), value: quota?.burnPerDay ? t('{rate}/day', { rate: fmtCredits(quota.burnPerDay) }) : '—', sub: t('credits'), icon: 'bolt' },
    { label: t('Forecast'), value: quota?.forecastAt ? forecastDate(quota.forecastAt) : '—', sub: t('quota empty date'), icon: 'clock' },
    { label: t('Top model'), value: topModel, sub: t('by requests'), icon: 'layers' },
  ]);
  $('#analytics-chart-sub').textContent = state.range === '7d' ? 'last 7 days' : state.range === '24h' ? 'last 24 hours' : 'last 30 minutes';
  $$('#analytics-range button').forEach((b) => b.classList.toggle('active', b.dataset.range === state.range));
  lineChart($('#analytics-chart'), m.series, { latency: true });
  tokenChart($('#token-chart'), m.series);
  creditChart($('#credit-chart'), m.series);
  const quotaBox = $('#analytics-quota');
  quotaBox.textContent = '';
  if (!quota) {
    quotaBox.append(el('div', 'muted small', t('Unavailable')));
  } else if (quota.status !== 'ok') {
    quotaBox.append(el('div', 'muted small', t(quota.status === 'no-auth' ? 'No account signed in' : quota.status === 'exceeded' ? 'Quota exceeded' : 'Unavailable')));
  } else {
    addKv(quotaBox, t('Quota'), quotaCell(quota));
    addKv(quotaBox, t('Remaining'), `${fmtCredits(quota.remaining)} ${unitLabel(quota.unit)}`);
    addKv(quotaBox, t('Burn rate'), quota.burnPerDay ? t('{rate} credits/day', { rate: fmtCredits(quota.burnPerDay) }) : '—');
    addKv(quotaBox, t('Forecast'), forecastDate(quota.forecastAt));
    addKv(quotaBox, t('Plan'), quota.plan || '—');
    addKv(quotaBox, t('Expires'), quota.expiresAt ? forecastDate(quota.expiresAt) : t('no expiry'));
  }
  heatmap($('#heatmap'), state.heat?.series);
  renderTop($('#top-models'), m.topModels, 'Model');
  renderTop($('#top-accounts'), m.topAccounts, 'Account');
}

async function loadUsage() {
  state.metrics = await api('metrics?range=24h');
  fillUsageFilters();
  renderUsage();
  await loadLogs();
}

function fillUsageFilters() {
  const rows = state.metrics?.recent || [];
  const models = [...new Set(rows.map((r) => r.model))];
  const accounts = [...new Set(rows.map((r) => r.account))];
  const fill = (sel, values, current) => {
    sel.innerHTML = '<option value="">all ' + (sel.id === 'usage-model' ? 'models' : sel.id === 'usage-account' ? 'accounts' : 'transports') + '</option>';
    for (const value of values) {
      const opt = el('option', '', value);
      opt.value = value;
      if (value === current) opt.selected = true;
      sel.append(opt);
    }
  };
  fill($('#usage-model'), models, state.usage.model);
  fill($('#usage-account'), accounts, state.usage.account);
}

async function loadLogs() {
  try {
    const data = await api('logs?n=200');
    state.logs = data.text || '';
    renderLogs();
  } catch (e) { toast(e.message, 'err'); }
}

function renderLogs() {
  const filter = $('#log-filter')?.value?.toLowerCase() || '';
  const lines = state.logs.split('\n').filter((line) => !filter || line.toLowerCase().includes(filter));
  $('#log-out').textContent = lines.length ? lines.join('\n') : '(empty)';
}

async function loadHealth() {
  state.health = await api('health');
  renderHealth();
}

function renderHealth() {
  const h = state.health;
  if (!h) return;
  const banner = $('#health-status');
  banner.className = 'status-banner';
  banner.innerHTML = '<span class="dot ok"></span><span>All systems operational</span>';
  const right = el('span', 'muted small');
  right.style.marginLeft = 'auto';
  right.textContent = `${h.transport} · ${h.host}:${h.port}`;
  banner.append(right);
  kpis($('#health-kpis'), [
    { label: t('Uptime'), value: fmtDuration(h.uptime), sub: t('pid {pid}', { pid: h.pid }), icon: 'clock' },
    { label: 'RSS', value: fmtBytes(h.memory.rss), sub: t('heap {value}', { value: fmtBytes(h.memory.heapUsed) }), icon: 'cpu' },
    { label: t('Sessions'), value: fmtInt(h.sessions), sub: h.pool.enabled ? t('pool {ready}/{size}', { ready: h.pool.ready, size: h.pool.size }) : t('direct transport'), icon: 'activity' },
    { label: t('Version'), value: `v${h.version}`, sub: h.node, icon: 'layers' },
  ]);
  const process = $('#health-process');
  process.textContent = '';
  for (const [key, value] of [
    ['Node', h.node], ['PID', h.pid], ['Transport', h.transport],
    ['Endpoint', `${h.host}:${h.port}`], ['Account', h.account?.label || h.account?.name || '—'],
    ['Pool', h.pool.enabled ? t('{ready} ready / {size}', { ready: h.pool.ready, size: h.pool.size }) : 'disabled'],
  ]) addKv(process, key, value);
  const paths = $('#health-paths');
  paths.textContent = '';
  for (const [key, value] of [['Config', h.paths.config], ['Metrics', h.paths.metrics], ['Log', h.paths.log]]) addKv(paths, key, value);
  const last = $('#health-last-error');
  if (h.lastError) {
    last.textContent = `${new Date(h.lastError.t).toLocaleString(locale())} · ${h.lastError.status} · ${h.lastError.model} · ${h.lastError.account}`;
    last.className = '';
  } else {
    last.textContent = 'none';
    last.className = 'muted';
  }
}

function addKv(box, key, value) {
  const row = el('div', 'kv-row');
  row.append(el('span', '', key), el('span', '', String(value ?? '—')));
  box.append(row);
}

async function loadModels(force = false) {
  const [models, claude] = await Promise.all([api(force ? 'models?refresh=1' : 'models'), api('claude')]);
  state.models = models.models || [];
  state.modelsMeta = models;
  state.claude = claude;
  renderModels();
}

function agoLabel(span) {
  if (!span || span < 0) return t('never refreshed');
  const minutes = Math.round(span / 60000);
  if (minutes < 1) return t('just now');
  if (minutes < 60) return t('{n} min ago', { n: minutes });
  const hours = Math.round(minutes / 60);
  if (hours < 48) return t('{n} h ago', { n: hours });
  return t('{n} d ago', { n: Math.round(hours / 24) });
}

function renderModelsSource() {
  const meta = state.modelsMeta || {};
  const source = meta.source === 'cli' ? t('Qoder CLI')
    : meta.source === 'api' ? t('Qoder API')
      : meta.source === 'catalog' ? t('Qoder catalog')
      : meta.source === 'remote' ? t('Qoder docs')
        : meta.source === 'cache' ? t('last good list') : t('built-in list');
  const at = meta.fetchedAt || (meta.source === 'builtin' ? null : meta.lastAttempt);
  const line = $('#models-source');
  if (line) line.textContent = `${source} · ${agoLabel(at ? Date.now() - at : 0)}`;
  const box = $('#models-error');
  const text = $('#models-error-text');
  if (!box || !text) return;
  const failed = meta.lastError && (meta.source === 'builtin' || meta.source === 'cache');
  box.classList.toggle('hidden', !failed);
  if (failed) text.textContent = `${t('Update failed')}: ${meta.lastError}`;
}

function renderModels() {
  renderModelsSource();
  const grid = $('#models-grid');
  grid.textContent = '';
  const needle = state.search.trim().toLowerCase();
  const list = state.models.filter((model) => !needle || model.toLowerCase().includes(needle));
  $('#models-count').textContent = t('{count} available', { count: state.models.length });
  for (const model of list) {
    const card = el('div', `model-card ${state.claude?.model === model ? 'current' : ''}`);
    card.append(el('span', '', model));
    const copy = el('button', '', '');
    copy.innerHTML = icon('copy');
    copy.title = 'Copy model id';
    copy.addEventListener('click', () => copyText(model));
    card.append(copy);
    grid.append(card);
  }
  if (!list.length) grid.append(el('div', 'muted small', 'no models match'));
  const box = $('#models-default');
  box.textContent = '';
  if (!state.claude) {
    box.append(el('div', 'muted small', 'Claude settings not readable'));
    return;
  }
  addKv(box, 'Model', state.claude.model || '—');
  addKv(box, '1M context', state.claude.oneMillion ? 'on' : 'off');
  addKv(box, 'Web tools allowlist', state.claude.allowWebTools ? 'yes' : 'no');
  addKv(box, 'Exa MCP', state.claude.exa ? 'configured' : 'missing');
  addKv(box, 'Statusline', state.claude.statusLine ? 'qoder-claude' : 'not set');
}

async function loadSettings() {
  const [config, claude, models] = await Promise.all([api('config'), api('claude'), api('models')]);
  state.config = config;
  state.claude = claude;
  state.models = models.models || [];
  fillSettings();
  if (state.health) fillAdvancedPaths();
  else api('health').then((h) => { state.health = h; fillAdvancedPaths(); }).catch(() => {});
}

function setField(id, value, locked) {
  const node = $(id);
  if (!node) return;
  if (node.type === 'checkbox') node.checked = Boolean(value);
  else node.value = value ?? '';
  node.disabled = Boolean(locked);
  if (locked) node.title = 'Overridden by an environment variable';
}
function val(id) {
  const node = $(id);
  if (!node) return undefined;
  if (node.type === 'checkbox') return node.checked;
  if (node.type === 'number') return Number(node.value) || 0;
  return node.value;
}

function fillSettings() {
  const cfg = state.config;
  if (cfg) {
    const locked = cfg.envLocked || {};
    setField('#cfg-port', cfg.port, locked.port);
    setField('#cfg-host', cfg.host, locked.host);
    setField('#cfg-log', cfg.log, locked.log);
    setField('#cfg-pool', cfg.pool, locked.pool);
    setField('#cfg-context', cfg.contextWindow, locked.contextWindow);
    setField('#cfg-thinking', cfg.thinking, locked.thinking);
    setField('#cfg-thinking-budget', cfg.thinkingBudget, locked.thinkingBudget);
    setField('#cfg-effort', cfg.effort, locked.effort);
    setField('#cfg-max-output', cfg.maxOutputTokens, locked.maxOutputTokens);
    setField('#cfg-transport', cfg.transport, locked.transport);
    setField('#cfg-pool-size', cfg.poolSize, locked.poolSize);
    setField('#cfg-max-attempts', cfg.maxAttempts, locked.maxAttempts);
    setField('#cfg-retries', cfg.modelRetries, locked.modelRetries);
    setField('#cfg-request-timeout', cfg.requestTimeoutMs, locked.requestTimeoutMs);
    setField('#cfg-stall', cfg.stallMs, locked.stallMs);
    setField('#cfg-quota', cfg.quota, locked.quota);
    setField('#cfg-quota-poll', cfg.quotaPollMs, locked.quotaPollMs);
    setField('#cfg-reward-auto', cfg.rewardAutoClaim, locked.rewardAutoClaim);
    if ($('#quota-endpoint')) $('#quota-endpoint').textContent = cfg.quotaEndpoint || '';
    $('#cfg-path').textContent = state.status?.configPath || state.health?.paths?.config || '';
    $('#key-state').textContent = cfg.apiKeySet ? 'set · restart to change' : 'not required';
    $('#advanced-info').textContent = '';
    addKv($('#advanced-info'), 'Version', state.status?.version || '—');
    addKv($('#advanced-info'), 'Config', state.health?.paths?.config || '—');
    addKv($('#advanced-info'), 'API key', cfg.apiKeySet ? 'set' : 'not set');
    addKv($('#advanced-info'), 'Env overrides', Object.keys(locked).join(', ') || 'none');
  }
  const claude = state.claude;
  if (claude) {
    const select = $('#claude-model');
    select.textContent = '';
    const models = [...new Set([...(claude.models || []), ...(state.models || [])])];
    if (claude.model && !models.includes(claude.model)) models.unshift(claude.model);
    for (const model of models) {
      const opt = el('option', '', model);
      opt.value = model;
      if (model === claude.model) opt.selected = true;
      select.append(opt);
    }
    $('#claude-1m').checked = Boolean(claude.oneMillion);
    $('#claude-path').textContent = claude.path || '';
    $('#web-tools-state').textContent = '';
    addKv($('#web-tools-state'), 'Exa MCP', claude.exa ? 'configured' : 'missing');
    addKv($('#web-tools-state'), 'Claude allowlist', claude.allowWebTools ? 'ready' : 'needs apply');
  }
  $$('#theme-seg [data-theme-choice]').forEach((b) => b.classList.toggle('active', b.dataset.themeChoice === storedTheme()));
  fillAdvancedPaths();
}

function fillAdvancedPaths() {
  const box = $('#advanced-paths');
  if (!box) return;
  box.textContent = '';
  const paths = state.health?.paths || {};
  addKv(box, 'Config', paths.config || '—');
  addKv(box, 'Metrics', paths.metrics || '—');
  addKv(box, 'Log', paths.log || '—');
}

/* actions */
async function saveConfigValues(patch, label = 'Settings') {
  try {
    const result = await api('config', { method: 'PUT', body: JSON.stringify(patch) });
    state.config = result.config;
    fillSettings();
    fillRouting();
    if (result.restartRequired?.length) showRestart(result.restartRequired);
    toast(t('{label} saved', { label: t(label) }), 'ok');
  } catch (e) { toast(e.message, 'err'); }
}

function showRestart(keys) {
  const banner = $('#restart-banner');
  banner.classList.remove('hidden');
  $('#restart-text').textContent = t('Restart required for: {keys}. Close qclaude and reopen it (or restart the bridge window).', { keys: keys.join(', ') });
}

function saveGeneral() {
  return saveConfigValues({
    port: val('#cfg-port'), host: val('#cfg-host'), log: val('#cfg-log'), pool: val('#cfg-pool'),
  }, 'Server settings');
}
function saveAi() {
  return saveConfigValues({
    contextWindow: val('#cfg-context'), thinking: val('#cfg-thinking'),
    thinkingBudget: val('#cfg-thinking-budget'), effort: val('#cfg-effort'),
    maxOutputTokens: val('#cfg-max-output'),
  }, 'AI defaults');
}
function saveRouting() {
  return saveConfigValues({
    transport: val('#cfg-transport'), poolSize: val('#cfg-pool-size'),
    maxAttempts: val('#cfg-max-attempts'), modelRetries: val('#cfg-retries'),
  }, 'Routing settings');
}
function saveResilience() {
  return saveConfigValues({
    requestTimeoutMs: val('#cfg-request-timeout'), stallMs: val('#cfg-stall'),
  }, 'Timeouts');
}
function saveAdvanced() {
  return saveConfigValues({
    quota: val('#cfg-quota'), quotaPollMs: val('#cfg-quota-poll'), rewardAutoClaim: val('#cfg-reward-auto'),
  }, 'Quota');
}
function saveRoutingPage() {
  return saveConfigValues({
    maxAttempts: val('#routing-max-attempts'), modelRetries: val('#routing-retries'),
    requestTimeoutMs: val('#routing-request-timeout'), stallMs: val('#routing-stall'),
    transport: val('#routing-transport'), poolSize: val('#routing-pool-size'),
  }, 'Routing settings');
}
async function saveClaude() {
  try {
    const result = await api('claude', {
      method: 'PUT',
      body: JSON.stringify({ model: val('#claude-model'), oneMillion: val('#claude-1m') }),
    });
    state.claude = result.prefs;
    fillSettings();
    toast('Claude settings saved', 'ok');
  } catch (e) { toast(e.message, 'err'); }
}
async function saveKey() {
  const key = $('#cfg-key').value.trim();
  if (!key) return toast('Type a key first', 'err');
  await saveConfigValues({ apiKey: key }, 'API key');
  $('#cfg-key').value = '';
}
async function clearKey() {
  confirmModal('Clear API key', 'The dashboard will stop requiring a key after the next restart.', async () => {
    await saveConfigValues({ apiKey: '' }, 'API key');
    closeModal();
  }, 'Clear');
}
async function applyWebTools() {
  const btn = $('#web-tools-apply');
  btn.disabled = true;
  try {
    const result = await api('web-tools', { method: 'POST' });
    if (!result.ok) throw new Error(result.error || 'failed');
    state.claude = result.prefs;
    fillSettings();
    toast('Web tools applied', 'ok');
  } catch (e) { toast(e.message, 'err'); }
  finally { btn.disabled = false; }
}

async function runTest(prompt, out) {
  const model = state.claude?.model || 'Auto';
  if (out) out.textContent = 'waiting…';
  try {
    const result = await api('test', { method: 'POST', body: JSON.stringify({ prompt, model }) });
    const text = `${t('status {status} · {ms} ms', { status: result.status, ms: result.ms })}\n\n${result.text || result.error || ''}`;
    if (out) out.textContent = text;
    else toast(result.error ? result.error : t('Test ok · {ms} ms', { ms: result.ms }), result.error ? 'err' : 'ok');
    return result;
  } catch (e) {
    if (out) out.textContent = e.message;
    toast(e.message, 'err');
  }
}

function testModal() {
  const body = el('div');
  const input = el('input');
  input.value = 'say exactly: ok';
  input.placeholder = 'prompt';
  body.append(input);
  openModal('Send test request', body, async () => {
    closeModal();
    await runTest(input.value || 'say exactly: ok');
  }, 'Send');
}

async function addAccount() {
  const body = el('div');
  const input = el('input');
  input.placeholder = 'account name (e.g. work)';
  input.autocomplete = 'off';
  const hint = el('span', 'muted small', 'Creates a profile and opens the Qoder device login.');
  body.append(input, hint);
  openModal('Add account', body, async () => {
    const name = input.value.trim();
    if (!name) return toast('Name required', 'err');
    try {
      const job = await api('accounts', { method: 'POST', body: JSON.stringify({ name }) });
      closeModal();
      $('#login-box').classList.remove('hidden');
      $('#login-state').textContent = 'Waiting for the browser…';
      $('#login-url').textContent = '';
      const poll = setInterval(async () => {
        try {
          const status = await api('login/' + job.id);
          if (status.url) {
            $('#login-url').textContent = status.url;
            $('#login-url').href = status.url;
          }
          $('#login-state').textContent = status.done ? (status.ok ? 'Signed in.' : t('Failed: {log}', { log: status.log || 'login failed' })) : 'Waiting for the browser…';
          if (status.done) {
            clearInterval(poll);
            if (status.ok) toast('Account added', 'ok');
            await loadAccounts();
            setTimeout(() => $('#login-box').classList.add('hidden'), 2500);
          }
        } catch (e) {
          clearInterval(poll);
          $('#login-state').textContent = e.message;
        }
      }, 2000);
    } catch (e) { toast(e.message, 'err'); }
  }, 'Create');
}

/* modal */
let modalAction = null;
function openModal(title, body, onConfirm, confirmLabel = 'Confirm') {
  $('#modal-title').textContent = title;
  $('#modal-body').replaceChildren(body);
  $('#modal-confirm').textContent = confirmLabel;
  modalAction = onConfirm;
  $('#modal').classList.remove('hidden');
}
function closeModal() {
  $('#modal').classList.add('hidden');
  modalAction = null;
}
function confirmModal(title, text, onConfirm, label = 'Confirm') {
  const body = el('p', '', text);
  openModal(title, body, onConfirm, label);
}

/* bind */
function bind() {
  $$('.nav-item[data-page]').forEach((button) => button.addEventListener('click', () => showPage(button.dataset.page)));
  $('#collapse-btn').addEventListener('click', () => {
    const app = document.querySelector('.app');
    app.classList.toggle('collapsed');
    localStorage.setItem('qoder_sidebar', app.classList.contains('collapsed') ? 'collapsed' : 'open');
  });
  $('#menu-btn').addEventListener('click', () => document.querySelector('.app').classList.toggle('nav-open'));
  $('#theme-btn').addEventListener('click', cycleTheme);
  $('#btn-stop').addEventListener('click', () => confirmModal('Stop bridge', 'Claude Code will lose the endpoint until qclaude starts it again.', async () => {
    try { await api('stop', { method: 'POST' }); closeModal(); toast('Server stopping…', 'ok'); setTimeout(() => location.reload(), 700); } catch (e) { toast(e.message, 'err'); }
  }, 'Stop'));
  $('#btn-restart-help').addEventListener('click', () => toast('Close the qclaude window and run qclaude again.', 'ok'));
  $('#search').addEventListener('input', (e) => { state.search = e.target.value; applySearch(); });
  $$('[data-copy]').forEach((button) => button.addEventListener('click', () => copyText($(button.dataset.copy)?.textContent)));
  $('#modal-close').addEventListener('click', closeModal);
  $('#modal-cancel').addEventListener('click', closeModal);
  $('#modal-confirm').addEventListener('click', async () => { if (modalAction) await modalAction(); });
  $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });

  $('#home-refresh').addEventListener('click', () => loadHome().catch((e) => toast(e.message, 'err')));
  $('#home-recent-refresh').addEventListener('click', () => loadHome().catch((e) => toast(e.message, 'err')));
  $('#home-test').addEventListener('click', testModal);
  $('#endpoint-test').addEventListener('click', () => runTest($('#endpoint-test-prompt').value, $('#endpoint-test-out')));
  $('#accounts-test').addEventListener('click', () => runTest('say exactly: ok'));
  $('#account-add').addEventListener('click', addAccount);
  $('#rot-toggle').addEventListener('change', async (e) => {
    try { await api('rotation', { method: 'POST', body: JSON.stringify({ on: e.target.checked }) }); await loadAccounts(); toast(t('Failover {state}', { state: t(e.target.checked ? 'on' : 'off') }), 'ok'); } catch (err) { toast(err.message, 'err'); }
  });
  $('#routing-save').addEventListener('click', saveRoutingPage);
  $('#usage-refresh').addEventListener('click', () => loadUsage().catch((e) => toast(e.message, 'err')));
  $('#usage-download').addEventListener('click', downloadUsage);
  $('#log-refresh').addEventListener('click', loadLogs);
  $('#log-filter').addEventListener('input', renderLogs);
  $('#log-download').addEventListener('click', () => downloadText('bridge.log', state.logs));
  $('#log-auto').addEventListener('change', () => toast($('#log-auto').checked ? 'Auto refresh on' : 'Auto refresh off'));
  $('#usage-status').addEventListener('change', (e) => { state.usage.status = e.target.value; renderUsage(); });
  $('#usage-model').addEventListener('change', (e) => { state.usage.model = e.target.value; renderUsage(); });
  $('#usage-account').addEventListener('change', (e) => { state.usage.account = e.target.value; renderUsage(); });
  $('#usage-transport').addEventListener('change', (e) => { state.usage.transport = e.target.value; renderUsage(); });
  $('#usage-source').addEventListener('change', (e) => { state.usage.source = e.target.value; renderUsage(); });
  $('#health-refresh').addEventListener('click', () => loadHealth().catch((e) => toast(e.message, 'err')));
  $('#models-apply').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    try {
      const result = await api('models/apply', { method: 'POST' });
      toast(result.changed ? t('Claude picker updated ({n})', { n: result.count }) : t('Claude picker already up to date'), 'ok');
    } catch (err) {
      toast(err.message, 'err');
    } finally {
      btn.disabled = false;
    }
  });

  $('#models-refresh').addEventListener('click', (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    loadModels(true).catch((err) => toast(err.message, 'err')).finally(() => { btn.disabled = false; });
  });
  $('#models-open-settings').addEventListener('click', () => { showPage('settings'); switchSettingsTab('ai'); });
  $('#theme-seg').addEventListener('click', (e) => { const b = e.target.closest('[data-theme-choice]'); if (b) setTheme(b.dataset.themeChoice); });
  $$('#settings-tabs button').forEach((button) => button.addEventListener('click', () => switchSettingsTab(button.dataset.tab)));
  $$('[data-save]').forEach((button) => button.addEventListener('click', () => {
    const kind = button.dataset.save;
    if (kind === 'general') saveGeneral();
    else if (kind === 'ai') saveAi();
    else if (kind === 'claude') saveClaude();
    else if (kind === 'security') saveKey();
    else if (kind === 'routing') saveRouting();
    else if (kind === 'resilience') saveResilience();
    else if (kind === 'advanced') saveAdvanced();
  }));
  $('#key-clear').addEventListener('click', clearKey);
  $('#web-tools-apply').addEventListener('click', applyWebTools);
  $('#cfg-download').addEventListener('click', () => downloadText('bridge.config.json', JSON.stringify(state.config, null, 2)));
  $('#analytics-range').addEventListener('click', (e) => {
    const button = e.target.closest('[data-range]');
    if (!button) return;
    state.range = button.dataset.range;
    loadAnalytics().catch((err) => toast(err.message, 'err'));
  });
}

function switchSettingsTab(name) {
  $$('#settings-tabs button').forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
  $$('.tab-panel').forEach((p) => p.classList.toggle('active', p.dataset.panel === name));
}

function applySearch() {
  if (state.page === 'home') renderRecent($('#home-recent'), state.metrics?.recent);
  else if (state.page === 'accounts') renderAccounts();
  else if (state.page === 'models') renderModels();
  else if (state.page === 'usage') renderUsage();
  else if (state.page === 'analytics') {
    renderTop($('#top-models'), state.metrics?.topModels, 'Model');
    renderTop($('#top-accounts'), state.metrics?.topAccounts, 'Account');
  }
}

function downloadText(name, text) {
  const blob = new Blob([text || ''], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = el('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function downloadUsage() {
  const rows = state.metrics?.recent || [];
  const header = 'time,model,account,transport,status,in,out,credits,source,ttft_ms,ms';
  const lines = rows.map((r) => [new Date(r.t).toISOString(), r.model, r.account, r.transport, r.status, r.in, r.out, r.credits || 0, r.usageSource || 'estimated', r.ttft, r.ms].join(','));
  downloadText('qoder-claude-usage.csv', [header, ...lines].join('\n'));
}

window.onI18nChange = () => showPage(state.page);

/* init */
async function init() {
  hydrate();
  applyTheme();
  bind();
  const sidebar = localStorage.getItem('qoder_sidebar');
  if (sidebar === 'collapsed') document.querySelector('.app').classList.add('collapsed');
  try {
    const [status, accounts, models, claude, config] = await Promise.all([
      api('status'), api('accounts'), api('models'), api('claude'), api('config'),
    ]);
    state.status = status;
    state.accounts = accounts;
    state.models = models.models || [];
    state.claude = claude;
    state.config = config;
    $('#brand-version').textContent = `v${status.version}`;
    $('#nav-accounts').textContent = status.rotation?.count || 1;
  } catch (e) {
    toast(e.message, 'err');
  }
  const page = (location.hash.replace(/^#\/?/, '') || 'home');
  showPage(TITLES[page] ? page : 'home');
  refreshStatus();
  setInterval(refreshStatus, 10000);
  setInterval(() => {
    if (state.page === 'home') loadHome().catch(() => {});
    if (state.page === 'health') loadHealth().catch(() => {});
  }, 5000);
  setInterval(() => {
    if (state.page === 'usage' && $('#log-auto').checked) loadLogs().catch(() => {});
  }, 5000);
  window.matchMedia?.('(prefers-color-scheme: light)').addEventListener?.('change', applyTheme);
}

init();
