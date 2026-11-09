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
