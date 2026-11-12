# Project context — read this first

Handoff sheet for any AI agent continuing **qoder-claude** in a fresh chat.
Scope of this sheet: the repository, the sites, the docs, and the git/gh tooling. Nothing else.

## Repository

- Public repo: <https://github.com/Ryanabcraft/qoder-claude> (owner `Ryanabcraft`, MIT).
- Local checkout: `D:\SISTEMAS\Projetos\Qoder-Claude\qoder-bridge`, branch `main`.
- What it is: a local bridge that lets Claude Code run on Qoder models (Anthropic Messages API
  in, Qoder-signed requests out). Version lives in `package.json`; history in `CHANGELOG.md`.

## git / gh tooling (already installed)

- `git` and `gh` are installed; `gh` is authenticated as `Ryanabcraft` (`gh auth status`).
- Use `gh` for GitHub work: `gh run list/watch`, `gh workflow run`, `gh secret list`, `gh repo view`,
  `gh pr/issue/release` as needed. Remote `origin` = the public repo above.
- Workflow: every change ends with **commit + push to main**. User-visible changes bump
  `package.json` + add a `CHANGELOG.md` entry first.
- CI on push: `.github/workflows/unix-install.yml` (ubuntu + macos, `npm run coverage`,
  clean-machine installer test) and `.github/workflows/pages.yml` (site + docs deploy).
- GitHub camo caches README images by URL: replacing an image/GIF requires a **new filename**.

## Sites

| site | source | live url |
|---|---|---|
| landing | `site/` (Vite + React + Tailwind, 5 locales) | <https://ryanabcraft.github.io/qoder-claude/> |
| docs | `docs-site/` (VitePress, EN + pt-BR) | <https://ryanabcraft.github.io/qoder-claude/docs/> |

- Deploy: `.github/workflows/pages.yml` builds `site/` then `docs-site/` into `site/dist` and
  publishes GitHub Pages on pushes touching `site/**`, `docs-site/**`, `package.json` or the workflow.
- Build locally: `cd site && npm run build` (tsc + vite); `cd docs-site && npm run docs:build`.
- Landing copy lives in `site/src/i18n/dictionaries.ts` (en, pt-BR, es, fr, de); keep all locales in sync.
- Docs pages exist in EN and `docs-site/pt-BR/` mirrors — update both together.
- READMEs: `README.md` (EN) and `readme/README_pt_BR.md` (pt-BR); keep claims truthful and in sync.

## Language convention

- Site, CLI and installers speak English. Chat and the pt-BR mirrors are Portuguese.

## Verify before claiming done

- `npm test` and `npm run coverage` (thresholds 55/60/45; `src/ui` excluded).
- `site` and `docs-site` builds pass; check the live URLs after a Pages deploy.
- Re-verify anything in this sheet that smells stale before acting on it.

## Invariants (learned the hard way — do not break these)

- **An unreadable file is never replaced.** If `~/.claude/settings.json` or `accounts.json` exists
  but does not parse, the writer returns an error and leaves the file byte-for-byte intact. `{}`
  plus defaults is not a recovery — it is data loss.
- **Writes are atomic.** Every file the user cares about goes through `tmp` + `fsync` + `rename`
  (`accounts.json`, `bridge.config.json`, `~/.claude/settings.json`, `opencode.json`,
  `models.cache.json`, `metrics.jsonl`, `quota.jsonl`). `accounts.json` also keeps one `.bak`, and
  a corrupt file is renamed to `.corrupt-<ts>` instead of being overwritten by the fallback.
- **Upstream errors must surface.** A non-200 envelope from Qoder is an error, never an empty
  `200`. The stream parsers keep it in `upstreamError` and return it; a swallowed status is what
  made failover silently do nothing for three releases.
- **Rotation happens before the first token only.** After `startStream()` the response belongs to
  one account; `canRotate()` guards it on both endpoints (`/v1/messages` and
  `/v1/chat/completions`).
- **One tool catalog.** When tools go native, the text prompt carries names and short
  descriptions, never the full schemas again. Two catalogs with two calling instructions is what
  made models invent tools and stall.
- **The chosen model travels in `X-Model-Key`**, signed by the WASM; the JSON `model` field is ignored by
  the gateway (the reply always says `"model":"auto"`). Never debug model selection from the reply body.
- **`role:"tool"` is understood upstream** (verified with a tool round trip). A repeating agent is a
  model behaviour, not a dropped result — the loop guard in `src/loopGuard.js` exists for that.
- **Tool names are matched, not trusted.** `resolveToolName` maps what the model said onto what the
  client declared (`bash` → `Bash`, `openbot.send_message` → `mcp__openbot__send_message`).
- **Tests run against a fake upstream.** `test/fixtures/fakeUpstream.js` plus `QODER_AUTH_FAKE=1`
  exercise the real transport in-process; `test/e2e.test.js` runs the whole server. Do not add a
  transport behaviour without a case there.
