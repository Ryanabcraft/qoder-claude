# SETUP — from zero to a GitHub repository

Complete procedure: install the tools, authenticate, version the project, create the remote
repository and publish. Every command here was executed on this machine
(Windows 11, Git 2.54, gh 2.95, winget 1.29).

## 1. Required tools

| tool | purpose | winget package | check |
|---|---|---|---|
| Git | local versioning and push | `Git.Git` | `git --version` |
| GitHub CLI (`gh`) | authentication and repo creation | `GitHub.cli` | `gh --version` |
| Node.js 20+ | `qoder-bridge` runtime | `OpenJS.NodeJS.LTS` | `node --version` |

### Install

```powershell
winget install --id Git.Git -e --source winget
winget install --id GitHub.cli -e --source winget
winget install --id OpenJS.NodeJS.LTS -e --source winget
```

Alternatives:

```powershell
# Chocolatey
choco install git gh nodejs-lts -y

# Scoop
scoop install git gh nodejs-lts
```

Close and reopen the terminal after installing — `PATH` is only reloaded in a new process.
Verify:

```powershell
git --version
gh --version
node --version
```

On this machine:

```
git version 2.54.0.windows.1
gh version 2.95.0 (2026-06-17)
node v24.18.0
```

## 2. Authenticate to GitHub

```powershell
gh auth login
```

Pick, in this order:

1. `GitHub.com`
2. `HTTPS`
3. `Login with a web browser` (or paste a Personal Access Token)

Verify the active account and scopes:

```powershell
gh auth status
```

Expected output (minimum to create a repository):

```
✓ Logged in to github.com account <user> (keyring)
- Active account: true
- Git operations protocol: https
- Token scopes: 'repo', 'workflow', ...
```

`repo` is mandatory. If missing:

```powershell
gh auth refresh -h github.com -s repo,workflow
```

## 3. Commit identity

Without this the commit fails or lands without an author:

```powershell
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
git config --global init.defaultBranch main
```

Check:

```powershell
git config --global user.name
git config --global user.email
```

## 4. Version the project

Inside the project folder:

```powershell
cd D:\SISTEMAS\Projetos\Qoder-Claude\qoder-bridge
git init -b main
```

The `.gitignore` already covers `node_modules/`, `*.log`, `.env*`, `*.bak` and
`.claude/settings.json`. Before the first commit, check what would be staged:

```powershell
git status --short
```

If `node_modules` or any `.env` shows up, the `.gitignore` is wrong — fix it before
committing. Initial commit:

```powershell
git add .
git commit -m "feat: anthropic-compatible bridge backed by the Qoder CLI"
```

Check the result:

```powershell
git log --oneline -1
git ls-files | Measure-Object -Line
```

## 5. Create the remote repository

One command does everything — creates on GitHub, sets `origin` and pushes:

```powershell
gh repo create qoder-bridge --private --source . --remote origin --push `
  --description "Anthropic-compatible local bridge backed by the Qoder CLI"
```

Variations:

| goal | flag |
|---|---|
| public repository | `--public` |
| private repository | `--private` |
| connect an existing repo | `--remote origin --source .` |
| without the initial push | omit `--push` |
| organization | `gh repo create org/qoder-bridge ...` |

Without `gh`, the pure `git` path is:

```powershell
git remote add origin https://github.com/<user>/qoder-bridge.git
git push -u origin main
```

The repository must exist first, created through the web UI. `gh` skips that step and
resolves `origin` for you.

## 6. Verify

```powershell
gh repo view --web            # opens in the browser
gh repo view --json name,visibility,defaultBranchRef,url
git remote -v
git log --oneline --decorate -3
```

Expected `gh repo view --json` output:

```json
{"defaultBranchRef":{"name":"main"},"name":"qoder-bridge","url":"https://github.com/<user>/qoder-bridge","visibility":"PRIVATE"}
```

## 7. Normal cycle afterwards

```powershell
git status
git add src/server.js
git commit -m "fix: <what changed>"
git push
```

## 8. Troubleshooting

| symptom | cause | fix |
|---|---|---|
| `fatal: not a git repository` | ran outside the project folder | `cd` into the project root |
| `gh: command not found` | terminal opened before install | reopen the terminal |
| `HTTP 404` on `gh repo create` | token without `repo` scope | `gh auth refresh -s repo` |
| `remote origin already exists` | repo already initialized | `git remote set-url origin <url>` |
| `failed to push some refs` | remote already has commits | `git pull --rebase origin main` |
| `Author identity unknown` | missing `user.name`/`user.email` | step 3 |
| commit contains `.env` | file already tracked | `git rm --cached .env` and commit |
| `LF will be replaced by CRLF` | Windows autocrlf | harmless; silence with `git config --global core.autocrlf input` |

## 9. Quick reference

```powershell
# state
gh auth status
git status

# create
git init -b main
git add .
git commit -m "message"
gh repo create <name> --private --source . --remote origin --push

# verify
gh repo view --json name,visibility,url
git remote -v
```

## 10. Result of this run

```
repository  : https://github.com/Ryanabcraft/qoder-claude
visibility  : PUBLIC
branch      : main (tracking origin/main)
commits     : 8dcae1c feat: anthropic-compatible bridge backed by the Qoder CLI
              d8845de docs: record repository creation
              5e7074a feat: installer with statusline and automatic Claude Code setup
tools       : git 2.54.0.windows.1 · gh 2.95.0 · node v24.18.0 · winget 1.29.380
```

`.claude/settings.json` is intentionally kept out of the repository: it carries a local port
and token per machine and is listed in `.gitignore`.
