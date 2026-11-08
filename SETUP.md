# SETUP — publish your own copy

To **use** qoder-claude, install with the command for your platform (see the
[README](README.md#install)). This guide is for maintaining your own fork and publishing it.

## 1. Tools

| tool | purpose | winget package | check |
|---|---|---|---|
| Git | versioning and push | `Git.Git` | `git --version` |
| GitHub CLI (`gh`) | authentication and repo creation | `GitHub.cli` | `gh --version` |
| Node.js 20+ | runtime | `OpenJS.NodeJS.LTS` | `node --version` |

```powershell
winget install --id Git.Git -e --source winget
winget install --id GitHub.cli -e --source winget
winget install --id OpenJS.NodeJS.LTS -e --source winget
```

Alternatives: `choco install git gh nodejs-lts -y` or `scoop install git gh nodejs-lts`.
Reopen the terminal afterwards — `PATH` only reloads in a new process.

## 2. GitHub authentication

```powershell
gh auth login
```

Pick `GitHub.com` → `HTTPS` → `Login with a web browser`. Verify:

```powershell
gh auth status
```

`repo` and `workflow` are required (the workflow publishes the site). If missing:

```powershell
gh auth refresh -h github.com -s repo,workflow
```

## 3. Commit identity

```powershell
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
git config --global init.defaultBranch main
```

## 4. Version the project

```powershell
cd qoder-claude
git init -b main
git status --short
git add .
git commit -m "feat: run Claude Code on Qoder models"
```

`.gitignore` covers `node_modules/`, `*.log`, `.env*`, `accounts/`, `accounts.json`, `tools/`
and `.claude/settings.json`. Those hold credentials or local state and must never be committed.

## 5. Create the remote

```powershell
gh repo create qoder-claude --public --source . --remote origin --push `
  --description "Run Claude Code on Qoder models - local Anthropic bridge, 1M context, failover"
```

| goal | flag |
|---|---|
| public repository | `--public` |
| private repository | `--private` |
| connect an existing repo | `--remote origin --source .` |
| organization | `gh repo create org/qoder-claude ...` |

Without `gh`, create the repository in the web UI first, then:

```powershell
git remote add origin https://github.com/<user>/qoder-claude.git
git push -u origin main
```

## 6. Verify

```powershell
gh repo view --json name,visibility,defaultBranchRef,url
git remote -v
git log --oneline --decorate -3
```

The repository description and homepage are set with:

```powershell
gh repo edit --description "..." --homepage "https://ryanabcraft.github.io/qoder-claude/"
```

## 7. Normal cycle

```powershell
git status
git add <files>
git commit -m "fix: <what changed>"
git push
```

Pushing to `main` runs two workflows: `unix install` (Ubuntu + macOS) and `Deploy site`.

## 8. Troubleshooting

| symptom | cause | fix |
|---|---|---|
| `fatal: not a git repository` | ran outside the project | `cd` into the root |
| `gh: command not found` | terminal opened before install | reopen it |
| `HTTP 404` on `gh repo create` | token missing `repo` | `gh auth refresh -s repo` |
| `remote origin already exists` | repo already initialised | `git remote set-url origin <url>` |
| `failed to push some refs` | remote already has commits | `git pull --rebase origin main` |
| `Author identity unknown` | no `user.name`/`user.email` | step 3 |
| commit contains `.env`/`accounts.json` | file already tracked | `git rm --cached <file>` and commit |
| `LF will be replaced by CRLF` | Windows autocrlf | harmless; `git config --global core.autocrlf input` |

## 9. Quick reference

```powershell
gh auth status
git status
git init -b main && git add . && git commit -m "message"
gh repo create qoder-claude --public --source . --remote origin --push
git push
```
