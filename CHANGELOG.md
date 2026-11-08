# Changelog

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
