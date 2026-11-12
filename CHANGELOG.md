# Changelog

## 1.19.3

- Installing now wires OpenCode too: `scripts/enable-here.js` writes the provider with the 1M window and tool capabilities when OpenCode is detected, instead of leaving it for a manual `qclaude integrations opencode`.
- The running bridge keeps that block current: whenever the model list changes, the OpenCode provider is rewritten with the same limits, so a new model shows up with 1M already declared.

## 1.19.2

- The OpenCode provider now declares what the client needs to size the window: `limit: { context: 1000000, output: 128000 }` on every model, plus `tool_call`, `reasoning`, `attachment`, `temperature` and text+image input. Without those numbers OpenCode treats a custom model as small and compacts far too early — the 1M context never showed up.
- `qclaude integrations opencode` writes the metadata on every run, so re-running it after a model-list change keeps the limits.

## 1.19.1

- Opening `qclaude` could erase the Claude Code settings. `ensureWebTools` treated an unparseable `~/.claude/settings.json` as `{}` and wrote over it, taking hooks, env, model and plugins with it. It now refuses to write an unreadable file, and uses a timestamped backup plus `tmp` + `rename`.
- Workers and sessions are actually shut down on stop: `SIGINT`/`SIGTERM`/`SIGHUP`, `POST /ui/api/stop` and `qclaude --stop` (which now asks the server to stop before killing the port) all call `shutdownPool()`, so no `qodercli` child is left behind on Windows.
- The dashboard "Send test" uses the port the request arrived on (not `BRIDGE_PORT || 8787`) and times out after 60 s instead of hanging.
- A model name that is not in the list is reported in the log when it falls back to `Auto`.
- A bridge bound outside the loopback without `BRIDGE_API_KEY` warns in the log and on the Health page.

## 1.19.0

- `accounts.json` is written atomically (`tmp` + `fsync` + `rename`), keeps one `.bak`, and recovers from it when the file arrives truncated. A corrupt file is preserved as `.corrupt-<time>` instead of being replaced by the fallback — that fallback used to erase every account after a single bad write.
- Upstream failures that happen after the first token now arrive as a real Anthropic `error` event instead of being written into the answer as text.
- The dashboard refuses request bodies above 1 MB.
- `qclaude update` verifies the files it wrote (version and required files) and restores the previous copies if the install came out mixed.
- Timestamped backups are pruned to the three newest.
- `AbortSignal.any` is wrapped, so Node 20.0–20.2 no longer breaks the transport.
- Tests now run against a fake upstream: the real transports in-process (`direct.js` 89% lines, `openaiUpstream.js` 80%) and the whole server end to end — 402 rotation, cut stream, lowercase tool name, on both endpoints. 168 tests.

## 1.18.6

- Claude Code requests no longer receive the whole tool catalog twice. The prompt used to repeat every schema as text *and* register the same tools natively, with two different calling instructions competing. With native tools enabled, the text now carries names and short descriptions only, and the `<tool_calls>` form is described as a fallback.
- On a 20-tool catalog that is 27% fewer prompt characters, and the conflicting instruction is gone — the usual cause of a model inventing a tool or going quiet.

## 1.18.5

- The real cause of the dead failover: the stream parser caught the upstream's non-200 envelope and threw it away, so a 402/403 arrived at the client as an empty `200` and no account was ever paused. Upstream status errors now surface and rotate the account.
- Tool names are matched against the catalog the client actually sent, on both endpoints: `bash` resolves to `Bash`, `openbot.send_message` to `mcp__openbot__send_message`, case and separators ignored. A model calling a lowercase tool no longer ends with "No such tool available".
- A stream that dies mid-flight (`fetch failed`, `terminated`, `premature close`) is treated as a network failure and rotates instead of ending the turn with nothing.

## 1.18.4

- Failover now recognises HTTP `402` / `payment required` as a spent account. Before, an exhausted plan that answered 402 without the word "quota" in the body paused nothing and the request failed on the same account.
- The OpenAI-compatible endpoint rotates too. `/v1/chat/completions` called the transport directly, so OpenBot never moved to the next account; it now walks the same pool as Claude Code, pausing a dead account and retrying on the next one, and only commits once the stream has started.

## 1.18.3

- Quota no longer calls an exhausted add-on a dead plan. When `userQuota.total` is 0 and only the add-on has a balance, the account reads **Add-on credits used up** with `200/200 add-on` and **plan without a fixed quota**, instead of a red "quota exceeded" that contradicted a working session.
- `qclaude update` stops the running server before replacing files and starts it again afterwards, so an update no longer leaves the dashboard showing **offline** with an empty account list.
- When the dashboard cannot reach the server, the Accounts page says so (`Server offline - start it with qclaude to see the accounts`) instead of rendering an empty grid.

## 1.18.2

- The console window says which mode it is serving: `qoder-claude - OpenCode Mode` or `qoder-claude - OpenBot Mode`, instead of the generic title for both.

## 1.18.1

- `qclaude openbot` and `qclaude opencode` left the bridge watching the launcher's process id, so the server shut down three seconds after the command returned. Both now start it in a console window that stays open, independent of the launcher.
- Both commands open the dashboard in the browser after the bridge is up.
- Verified end to end: `qclaude openbot` returns, `/health` still answers 200, and `POST /v1/chat/completions` with `model: "DeepSeek-V4-Flash"` answers normally.

## 1.18.0

- `qclaude integrations` detects Claude Code, OpenCode and OpenBot, tells you where each one lives, and offers to wire the bridge into the ones it can write to safely.
- OpenCode gets a real provider block: `qoder-claude` with `@ai-sdk/openai-compatible`, base URL `http://127.0.0.1:8787/v1` and every model the bridge lists. Verified with `opencode models`, which now shows `qoder-claude/Auto` and the rest.
- `qclaude opencode [args]` starts the bridge and then opens OpenCode, so the models are live when the editor comes up; `qclaude openbot` does the same and launches the OpenBot app.
- OpenBot is detected but not edited from here: it keeps its provider list inside its own database, so the command prints the four fields to paste instead of writing into an app that may be running.

## 1.17.0

- The bridge is now an OpenAI-compatible API: `POST /v1/chat/completions` with streaming (`stream: true`), native `tool_calls`, and `GET /v1/models` in the OpenAI shape. OpenBot's custom OpenAI-compatible provider can point at `http://127.0.0.1:8787/v1`.
- This path does not go through Claude Code. The client's system prompt and tools are sent to Qoder exactly as written — no agent prompt, no `<tool_calls>` markers — so a different orchestration layer keeps its own behaviour.
- Both endpoints share the same Qoder transport, so accounts, failover, quota and the dashboard apply unchanged.

## 1.16.0

- The Claude Code `/model` picker now follows the live list. The bridge rewrites `modelPicker` in `~/.claude/settings.json` on boot and every time the model list changes, keeping a timestamped backup and leaving the rest of the settings alone.
- The installer used to build the picker from `spawnSync --list-models`, which returns nothing on some accounts, so a fresh install could land with the built-in list. It now asks Qoder first — CLI, then the model API — before writing.
- `qclaude models --apply` and an **Apply to Claude** button on the Models page push the current list into the picker on demand.

## 1.15.9

- The model list now comes from the same endpoint Qoder's own app uses: `GET /api/v2/model/list` on the inference host, signed by the same WASM context the bridge already uses for chat. It returns the real catalog with keys, display names, enable flags and context tiers per scene.
- Source order is the Qoder CLI, then the Qoder API, then the desktop catalog, then the public docs, then the last good list and the built-in list, merged so a model is never dropped.
- The API answer carries scenes the desktop app uses (`assistant`, `chat`, `app`, `qwake`, `quest`, `inline`); other products' tiers such as `Premium` and `Standard` are left out of the Claude Code picker.

## 1.15.8

- The public docs list is a curated subset — it names 14 models where the desktop catalog has 22 — so the docs source is now merged with the built-in floor instead of replacing it. A machine with no CLI and no desktop app shows 27 models, and a model is never dropped because the docs stopped mentioning it.
- The merged order is stable: tiers first (Auto, Ultimate, Fast, Efficient, Lite, Performance), then alphabetical.

## 1.15.7

- The model list no longer depends on another app's cache. When the CLI has nothing to list and Qoder Desktop is not installed, the bridge reads Qoder's public model documentation over HTTP and builds the list from it — a fresh machine shows the current roster with nothing local to seed it.
- Source order is now: Qoder CLI, desktop catalog, public docs, last good list on disk, built-in list. The Models page names the one in use and its age.
- A desktop catalog older than 14 days is replaced by the public docs, so a machine with an abandoned Qoder install does not keep an old list forever.
- The built-in list grew to the 27 names across both sources and keeps its review date.

## 1.15.6

- The model list now reads the catalog Qoder Desktop keeps at `~/.qoder/.auth/dynamic-texts.json`, refreshed from Qoder's server. It is read from disk, so the list follows Qoder without spawning the CLI — which matters when the CLI reports no models for an account the bridge is already using for inference.
- Source precedence is: a fresh CLI answer, then the desktop catalog, then the last good list on disk, then the built-in list. The Models page names the one in use and its age.
- A failed CLI listing no longer wins over a newer catalog: the fresher source is what shows.
- The built-in list was refreshed to the 22 models Qoder ships today, including GLM-5.2, Qwen3.5-Plus, Qwen3.7-Plus, Qwen3.8-Max-Preview, Qwen4-Max-Preview, Lite and Performance.

## 1.15.5

- The model list now carries its provenance. The Models page and `qclaude models` say whether the list came from the Qoder CLI, from the last good list saved on disk, or from the built-in fallback, and how old it is.
- When the CLI reports no models for the account, that reason is shown instead of a silent fallback, and repeated failures back off instead of spawning the CLI every minute.
- The last good list is persisted to `models.cache.json` and survives a restart; a successful refresh replaces it and becomes the source.
- The Models **Refresh** button now really asks the CLI (`/ui/api/models?refresh=1`); before it only re-read the server cache.
- `qclaude models`, `qclaude models --refresh` and `qclaude models --json`.
- The built-in list moved to `src/models.json` with the date it was last reviewed, so updating it is a data change.

## 1.15.4

- Links to the site now expand into a proper card in Discord, X, Slack, Reddit and WhatsApp: `og:image`, `og:url` and `twitter:card` are declared and a 1200×630 banner is served from the Pages root.
- The README dashboard shot is retaken from a current build, so it shows credits, quota and the reward card instead of the 1.11.1 layout.
- First tagged release (`v1.15.4`), giving the project a stable page to link at instead of a bare commit.
- Repository topics expanded, so the project is findable as a Claude Code bridge rather than only by name.

## 1.15.3

- The English and Portuguese READMEs open with a wide qoder-claude banner, served from `docs/assets/` so the dashboard bundle keeps only its compact logo.
- The repository has a stable community entry point at `/qoder-claude/discord/`, redirecting to the Discord invite so the link never dies; landing nav, footer, docs icon and README badges all point to it.

## 1.15.2

- Bugs Fixed

## 1.15.1

- GitHub Actions announces new versions to the community Discord `#releases` channel through a webhook, using the changelog entry for the released version.

## 1.15.0

- Daily 100-credit reward: reads Qoder's campaign per account, shows Claimable/Claimed/Not available with window and expiry.
- Manual claim from the dashboard Accounts card or `qclaude rewards [name] --claim`; idempotent, confirms `already` and the real expiry.
- Optional auto-claim toggle in Settings → Advanced, off by default; device-scoped limits mean one account per machine is usually eligible.
- `qclaude rewards [--json]` and `/ui/api/rewards` expose the same data; tokens never reach the browser or logs.

## 1.14.1

- Zero-total Qoder plans now report "quota exceeded" (or unavailable) instead of a misleading `0/0 credits · EXCEEDED` meter.

## 1.14.0

- Real Qoder usage: prompt/completion/cache tokens and credits from the upstream now replace local estimates in responses and `metrics.jsonl`.
- Real quota per account from Qoder, cached and polled every 5 minutes; `qclaude quota [name] [--json]` prints credits, remaining, burn rate and forecast.
- Dashboard: quota meters on Accounts, Credits KPI on Home, credits/burn/forecast in Analytics, credits and usage source in Usage & Logs, quota tracking in Advanced settings.
- Quota history in `quota.jsonl` (30 days) for burn rate and the projected empty date. Display-only: failover order is unchanged.

## 1.13.1

- Fixed the language dropdown opening as a light native menu with pale text in dark mode; selects now follow the active color scheme.

## 1.13.0

- Dashboard language picker in the top bar and Settings → General, with English, Portuguese (BR), Spanish, French and German.
- Translations apply in place, including dynamic tables, charts and toasts; the choice persists in `localStorage`.
- Numbers and timestamps follow the selected locale.

## 1.12.1

- Landing site restyled to match the docs: light/dark theme, two-column hero with the logo, action buttons, feature cards and a theme toggle.

## 1.12.0

- Added a VitePress documentation site at /qoder-claude/docs/ with English and pt-BR tracks, local search, sidebar and the mint theme.
- Landing site, dashboard Help and README now point to the docs instead of the landing page.
- The Pages workflow builds the landing site and the docs into one artifact.

## 1.11.1

- Added the qoder-claude logo to the dashboard, site, README and favicon.
- The dashboard accent now matches the mint mark from the logo.

## 1.11.0

- Dashboard rebuilt as a console: grouped navigation, Home, Endpoint, Accounts, Routing, Analytics, Usage & Logs, Health, Models and Settings.
- Settings write `bridge.config.json` and the Claude user settings with backups; startup-only fields show a restart banner.
- Analytics keep 7 days in `metrics.jsonl`, with 30m/24h/7d ranges, percentiles and token estimates.
- Dark/light/system themes and a responsive layout down to mobile.

## 1.10.21

- Dashboard GIF re-encoded with a generated 256-color palette, removing the fixed-palette dithering.

## 1.10.20

- The README dashboard preview is a 3-frame GIF (overview, accounts, models) instead of a static PNG.

## 1.10.19

- Coverage thresholds adjusted for the file set Node 22 measures in CI (55 lines / 60 branches / 45 functions).

## 1.10.18

- README badges for CI, version and license, plus a dashboard screenshot.
- Issue forms for bug reports and feature requests, and a Contributor Covenant code of conduct.
- CI now enforces line/branch/function coverage thresholds and prints the coverage table.

## 1.10.17

- Fixed image turns when Claude Code sends the image and the text in separate user messages: every image after the last assistant message belongs to the current turn.

## 1.10.16

- Only the newest user image goes to the vision engine; images from earlier turns become text placeholders, so follow-up text turns stay fast instead of re-uploading the image history.

## 1.10.15

- Update checks use the GitHub API first, with the raw package file as fallback, so a new release is seen without the 5-minute raw cache.

## 1.10.14

- Added `qclaude notes` to print the changelog for the installed version, or for a version you pass.
- Post-update notes are printed by updaters from 1.10.13 onward; 1.10.12 and older cannot show them.

## 1.10.13

- `qclaude` prints the release notes after an update, capped at 10 lines and ending with `...` when longer.
- `CHANGELOG.md` now ships with the app so updates can read it offline.

## 1.10.12

- Added `qclaude uninstall` with `--dry-run`, `--yes`, `--project`, `--no-backup` and `--remove-exa`.
- Accounts are backed up before removal; MCP servers and `permissions.allow` are kept.

## 1.10.11

- The site footer reads the package version at build time; Pages redeploys on version bumps.
- The direct transport detects the installed qodercli version instead of pinning 1.1.84.
- Removed stale version and ToolSearch claims from the site and docs.

## 1.10.10

- Web tools (WebSearch, WebFetch and both Exa tools) are allowlisted so auto mode does not block them.
- The installer and `qclaude` startup apply the allowlist.

## 1.10.9

- Installers pass the resolved `claude` binary to the Exa setup, so a fresh shell can configure it.

## 1.10.8

- The Exa MCP server is added automatically when missing; `QODER_NO_EXA=1` opts out.
