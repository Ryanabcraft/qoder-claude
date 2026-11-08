# Changelog

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
