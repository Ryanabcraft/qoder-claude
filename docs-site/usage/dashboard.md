# Dashboard

`qclaude` opens the console at `http://127.0.0.1:8787/ui`. With `BRIDGE_API_KEY` set, the launcher
passes the key in the URL fragment; the page stores it in `sessionStorage` and strips it from the
address bar.

## Pages

| page | contents |
|---|---|
| Home | status, KPIs, request chart, success rate, recent requests, active route |
| Endpoint | base URL, Claude settings snippet, endpoint list, test request |
| Accounts | failover switch, account cards, add/login, enable, use, remove, order |
| Routing | max attempts, retries, timeouts, transport, pool size, cooldowns, route order |
| Analytics | 30m/24h/7d, requests, latency, tokens, activity heatmap, top models/accounts |
| Usage & Logs | request filters and table, log tail with search and download |
| Health | uptime, memory, PID, Node, sessions, pool, paths, last error |
| Models | live model grid, default model, copy ids, and where the list came from — Qoder CLI, the desktop catalog, Qoder's public docs, the last good list saved on disk, or the built-in fallback — with **Refresh** asking for a new one |
| Settings | General, AI, Security, Routing, Resilience, Advanced |

Dark, light and system themes are available. The layout collapses the sidebar to an icon rail under
1100 px and to a drawer under 760 px.

The top bar has a language picker (also in Settings → General) covering English, Portuguese (BR),
Spanish, French and German. The choice is stored in `localStorage`, so it survives reloads; the
dashboard re-renders in place without a page reload.

Accounts show a real quota meter per profile (used/total credits, remaining, plan, state), Home
has a Credits KPI and Analytics adds credits per bucket, burn rate and a projected empty date.
Usage & Logs shows the credits and whether each row used real upstream usage or an estimate; CSV
export includes both. The Accounts page also lists the daily 100-credit reward per profile, with a
Claim button when the campaign is claimable and its expiry when already claimed.

## Settings

Settings write two files, both with backups:

- `bridge.config.json` — bridge runtime (port, host, API key, transport, pool, timeouts, context,
  thinking, effort, output cap, retries, max attempts).
- `~/.claude/settings.json` — Claude Code model and 1M context keys; the Exa/allowlist apply button.

Port, host, API key, transport, pool and the access log require a restart. The banner tells you to
close and reopen qclaude. Timeouts, context, thinking, effort, output cap, retries and max attempts
apply to the next request.

Existing environment variables win over the config file; those fields are disabled in the form. The
API key is never returned by the API — only whether one is set.

## Metrics

`metrics.jsonl` stores one line per minute and keeps seven days. It contains model and account
names, status, latency, TTFB, token estimates and error counts — never prompt text. The Analytics
page reads 30 minutes, 24 hours or 7 days and shows p50/p95 latency, TTFB, tokens and top
models/accounts.

Files are local, gitignored and preserved by the updater. Removing the install removes them.
