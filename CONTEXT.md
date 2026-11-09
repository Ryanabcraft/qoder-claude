# Project context — read this first

Handoff sheet for any AI agent continuing **qoder-claude** in a fresh chat. Facts below were
verified against the live repo/server; re-verify anything that smells stale before acting on it.

## What this is

`qoder-claude` is a local, MIT-licensed bridge that lets **Claude Code run on Qoder models**:
it speaks the Anthropic Messages API (`/v1/messages`, SSE) and signs requests to Qoder with the
embedded Qoder WASM. Tools, prompts, permissions, `/model`, effort and 1M context stay client-side.
Public repo: <https://github.com/Ryanabcraft/qoder-claude> (owner: Ryanabcraft).

## Where things live

| thing | path / url |
|---|---|
| repo checkout (git, branch `main`) | `D:\SISTEMAS\Projetos\Qoder-Claude\qoder-bridge` |
| version source of truth | `package.json` (currently 1.15.1) + `CHANGELOG.md` |
| landing site (Vite + React + Tailwind) | `site/` → <https://ryanabcraft.github.io/qoder-claude/> |
| docs (VitePress, EN + pt-BR) | `docs-site/` → <https://ryanabcraft.github.io/qoder-claude/docs/> |
| dashboard (plain HTML/CSS/JS, 5 locales) | `src/ui/` served by the bridge at `/ui` |
| Discord bot (separate project, on the Windows server) | `D:\Sistemas\Qoder-Claude-Discord-Bot` |
| MCP that administers that server | `D:\SISTEMAS\Projetos\Qoder-Claude\discord-bot-mcp` |
| Windows server (LAN only) | `192.155.5.14`, SSH user `Administrador`, hostname `SERVIDOR` |
| Discord server | guild `1569084284856311820`, invite <https://discord.gg/EkdRx5axbF> |
| bot web panel (LAN, no auth) | `http://192.155.5.14:9999` |

## Toolchain on the dev PC

- `git`, `gh` (authenticated as Ryanabcraft), Node 24, npm. Use `gh` for GitHub ops.
- **ffmpeg trap:** the `ffmpeg` on PATH is a 2013 build without `loudnorm`/`tmix`. The modern one is
  `%LOCALAPPDATA%\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.2-full_build\bin\ffmpeg.exe`.
- SSH: `ssh`/`scp` exist, **no sshpass/plink**. Password auth works via `SSH_ASKPASS` +
  `SSH_ASKPASS_REQUIRE=force`; key auth is rejected by that server. Prefer the discord-bot-mcp tools.
- Playwright is available as an MCP for browser checks.

## Architecture map (repo `src/`)

- `server.js` — HTTP/SSE bridge, rotation, streaming, metrics recording.
- `direct.js` + `qoderAuth.js` + `vendor/qoder-auth.cjs` — WASM-signed direct transport to `api1.qoder.sh`.
- `cli.js`, `sessions.js`, `stall.js` — CLI fallback worker pool, session reuse, stall watchdog.
- `accounts.js` — profiles, failover order, cooldowns (quota/403 30m, auth 10m, 429 60s, net 30s).
- `quota.js`, `quotaStore.js`, `rewards.js` — real Qoder quota/credits, burn/forecast, daily 100-credit campaign claim.
- `usage.js`, `metrics.js` — real upstream usage normalization; `metrics.jsonl` minute buckets, 7 days.
- `config.js`, `claudePrefs.js`, `claudeSettings.js`, `exaSetup.js` — config layer + `~/.claude/settings.json` writes with backups.
- `uiApi.js` + `ui/` — dashboard API and console (i18n: en, pt-BR, es, fr, de).
- `selfUpdate.js`, `releaseNotes.js`, `uninstall.js`, `bin/qclaude.js` — update/notes/uninstall/launcher.
- `scripts/discord-release.mjs` — posts changelog to Discord `#releases` via webhook.

## Commands you will actually run

```bash
npm test                 # node:test, ~107 tests
npm run coverage         # thresholds: lines 55 / branches 60 / functions 45; src/ui excluded
npm start                # bridge on 127.0.0.1:8787
cd site && npm run build         # tsc + vite
cd docs-site && npm run docs:build
qclaude update           # self-update from main + prints notes
qclaude quota / rewards  # real quota / daily campaign
```

Install one-liners (also on the landing page): CMD `curl -fsSL .../install.cmd -o install.cmd && install.cmd && del install.cmd`,
PowerShell `irm .../install.ps1 | iex`, sh `curl -fsSL .../install.sh | bash`.

## CI / deploy

- `.github/workflows/pages.yml` — builds `site/` + `docs-site/` into `site/dist`, deploys GitHub Pages.
- `.github/workflows/unix-install.yml` — ubuntu + macos, coverage, clean-machine `install.sh` under `env -i`.
- `.github/workflows/discord-release.yml` — on version change/release, posts to Discord `#releases`
  using repo secret `DISCORD_RELEASE_WEBHOOK`.
- Push to `main` = release. Bump `package.json` + `CHANGELOG.md` first; the Discord announcement follows.

## Discord community state

- Bot `QoderClaude#7976` runs as Windows service `QoderClaudeBot` (NSSM, auto-start, restart-on-fail,
  rotating logs in `logs/`). Code: gateway bot + slash commands (`help docs repo invite status purge
  slowmode ticket`), welcome + Member role, role buttons, ticket system (private channels, claim,
  close with transcript to `#ticket-logs`), web panel on port 9999.
- Roles (hoisted, ordered): Owner, CoOwner, Admins, Mod, Helpers, Maintainer, Contributor, Supporter,
  Developer, VIP, Bots, Member.
- The `discord-bot-mcp` MCP (stdio, registered in OpenCode global config) exposes full server access:
  `bot_list/read/write/delete`, `fs_*_base64`, `fs_mkdir`, `bot_status/restart/stop/start`, `bot_logs`,
  `server_exec`. Credentials only in its gitignored `config.json`.

## House rules (do not break these)

- CLI/installers/site speak **English**; chat and `readme/README_pt_BR.md` + `docs-site/pt-BR/` are Portuguese.
- Zero runtime dependencies in the bridge; Node >= 20.
- Never invent stats/claims. Numbers only if real (quota/usage come from Qoder).
- Secrets never in URLs, logs, commits or chat: key in URL fragment, query params redacted,
  tokens only in Authorization headers. No Discord **user** tokens (self-bot/ToS) — bot tokens/webhooks only.
- Every change ends with **commit + push**; bump version + CHANGELOG for user-visible changes.
- Replacing a README image/GIF needs a **new filename** (GitHub camo caches by URL).
- Verify by measuring (tests, real requests, HTTP codes), not by reassurance. Destructive tests must
  isolate env/paths and leave the real install/PATH/accounts intact.
- When the user says they are doing it themselves or their version is perfect: stop editing.

## Gotchas already paid for

- PowerShell over SSH: heredoc stdin is flaky; use `-EncodedCommand` (UTF-16LE base64) or scp a `.ps1`.
- Server Windows is pt-BR: `icacls` needs SIDs (`*S-1-5-32-544`, `*S-1-5-18`), not English group names.
- `.env` must end with a newline before appending, or the next key glues onto the token (crash-loop happened).
- Discord role positions only move via **pairwise bulk swaps**; single-role and full-list PATCHes are ignored.
- GitHub Pages + raw install URLs die while the repo is private; making it public again needs a Pages re-deploy.
- `src/ui` is excluded from coverage on purpose; keep UI changes verified in a browser instead.

## Rumo / next ideas (not started)

- Quota-aware failover ordering (currently display-only by decision).
- Ticket SLA: auto-close stale tickets, staff ping, ticket stats command.
- Optional panel auth again (currently open on LAN by user choice).
- Landing `models` copy block exists in dictionaries but is not rendered.
- Windows CI matrix and signed/self-verified updates.
- Per-model routing profiles / A/B playground (explored, deferred).

## Secrets locations (paths only, never paste values)

- Server bot token + panel config: `D:\Sistemas\Qoder-Claude-Discord-Bot\.env`
- SSH credentials: `D:\SISTEMAS\Projetos\Qoder-Claude\discord-bot-mcp\config.json` (gitignored)
- Discord release webhook: GitHub repo secret `DISCORD_RELEASE_WEBHOOK`
- Bridge API key (if set): `bridge.config.json` on the install, masked by the API
