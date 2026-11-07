const $ = (sel) => document.querySelector(sel);
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
};

async function api(path, opts = {}) {
  const headers = { 'content-type': 'application/json', ...(opts.headers || {}) };
  const res = await fetch('/ui/api/' + path, { ...opts, headers });
  const text = await res.text();
  let body = {};
  try { body = JSON.parse(text); } catch { body = { error: text }; }
  if (!res.ok) throw new Error(body.error || res.statusText);
  return body;
}

/* tabs */
document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t === tab));
    document.querySelectorAll('.panel').forEach((p) => p.classList.toggle('active', p.id === 'tab-' + tab.dataset.tab));
    if (tab.dataset.tab === 'logs') loadLogs();
  });
});

/* status */
async function loadStatus() {
  const pill = $('#pill-status');
  try {
    const s = await api('status');
    pill.textContent = `${s.transport} · 127.0.0.1:${s.port}`;
    pill.className = 'pill ok';
    const cards = [
      ['Transport', s.transport],
      ['Port', String(s.port)],
      ['Account', s.account.label || s.account.name],
      ['Models', String(s.models)],
      ['Uptime', `${Math.floor(s.uptime / 60)}m`],
      ['Version', s.version],
    ];
    const grid = $('#status-grid');
    grid.textContent = '';
    for (const [k, v] of cards) {
      const c = el('div', 'card');
      c.append(el('div', 'k', k), el('div', 'v' + (k === 'Uptime' || k === 'Version' ? '' : ' mono'), v));
      grid.append(c);
    }
    $('#foot-account').textContent = 'account: ' + (s.account.label || s.account.name);
  } catch (e) {
    pill.textContent = 'offline';
    pill.className = 'pill bad';
  }
}

/* accounts */
async function loadAccounts() {
  const data = await api('accounts');
  const list = $('#account-list');
  list.textContent = '';
  for (const [name, item] of Object.entries(data.accounts)) {
    const li = el('li');
    const active = name === data.active;
    li.append(el('span', 'name', name));
    if (active) li.append(el('span', 'badge on', 'active'));
    li.append(el('span', 'path', item.dir || 'global ~/.qoder'));

    const actions = el('div', 'actions');
    if (!active) {
      const use = el('button', 'btn small', 'Use');
      use.onclick = async () => {
        await api('accounts/use', { method: 'POST', body: JSON.stringify({ name }) });
        await Promise.all([loadAccounts(), loadStatus()]);
      };
      actions.append(use);
    }
    if (name !== 'default') {
      const del = el('button', 'btn small danger', 'Remove');
      del.onclick = async () => {
        if (!confirm(`Remove account "${name}" and its credentials?`)) return;
        await api('accounts/' + encodeURIComponent(name), { method: 'DELETE' });
        await Promise.all([loadAccounts(), loadStatus()]);
      };
      actions.append(del);
    }
    li.append(actions);
    list.append(li);
  }
}

let loginTimer = null;

async function startLogin(name) {
  const box = $('#login-box');
  const link = $('#login-url');
  const state = $('#login-state');
  box.classList.remove('hidden');
  link.textContent = 'waiting for the login URL…';
  link.removeAttribute('href');
  state.textContent = '';

  const { id } = await api('accounts', { method: 'POST', body: JSON.stringify({ name }) });

  const poll = async () => {
    try {
      const j = await api('login/' + id);
      if (j.url) {
        link.textContent = j.url;
        link.href = j.url;
        state.textContent = 'open the link, approve, and wait.';
        if (!link.dataset.opened) {
          link.dataset.opened = '1';
          window.open(j.url, '_blank', 'noreferrer');
        }
      }
      if (j.done) {
        clearInterval(loginTimer);
        loginTimer = null;
        if (j.ok) {
          state.textContent = 'connected.';
          await Promise.all([loadAccounts(), loadStatus()]);
          setTimeout(() => box.classList.add('hidden'), 1500);
        } else {
          state.textContent = 'login failed: ' + (j.log || 'unknown error');
        }
        return;
      }
      setTimeout(poll, 1500);
    } catch (e) {
      state.textContent = e.message;
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
async function loadModels() {
  const { models } = await api('models');
  const list = $('#model-list');
  list.textContent = '';
  for (const m of models) list.append(el('li', '', m));
  $('#models-count').textContent = `${models.length} available`;
}

/* test */
$('#btn-test').addEventListener('click', async () => {
  const out = $('#test-out');
  out.textContent = 'sending…';
  try {
    const r = await api('test', { method: 'POST', body: JSON.stringify({ prompt: $('#test-prompt').value }) });
    out.textContent = JSON.stringify(r, null, 2);
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

/* actions */
$('#btn-refresh').addEventListener('click', () => Promise.all([loadStatus(), loadAccounts()]));
$('#btn-stop').addEventListener('click', async () => {
  if (!confirm('Stop the bridge server?')) return;
  try {
    await fetch('/ui/api/stop', { method: 'POST' });
  } catch {}
  setTimeout(() => loadStatus(), 800);
});

/* boot */
Promise.all([loadStatus(), loadAccounts(), loadModels()]).catch(() => {});
setInterval(loadStatus, 15000);
