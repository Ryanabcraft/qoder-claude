# SETUP — publique a sua cópia

Para **usar** o qoder-claude, instale com o comando da sua plataforma (veja o
[README](../README.md#instalação)). Este guia é para quem vai manter um fork e publicar.

## 1. Ferramentas

| ferramenta | função | pacote winget | verificação |
|---|---|---|---|
| Git | versionamento e push | `Git.Git` | `git --version` |
| GitHub CLI (`gh`) | autenticação e criação do repo | `GitHub.cli` | `gh --version` |
| Node.js 20+ | runtime | `OpenJS.NodeJS.LTS` | `node --version` |

```powershell
winget install --id Git.Git -e --source winget
winget install --id GitHub.cli -e --source winget
winget install --id OpenJS.NodeJS.LTS -e --source winget
```

Alternativas: `choco install git gh nodejs-lts -y` ou `scoop install git gh nodejs-lts`.
Reabra o terminal depois — o `PATH` só recarrega em um processo novo.

## 2. Autenticação no GitHub

```powershell
gh auth login
```

Escolha `GitHub.com` → `HTTPS` → `Login with a web browser`. Confira:

```powershell
gh auth status
```

`repo` e `workflow` são necessários (o workflow publica o site). Se faltar:

```powershell
gh auth refresh -h github.com -s repo,workflow
```

## 3. Identidade do commit

```powershell
git config --global user.name "Seu Nome"
git config --global user.email "voce@exemplo.com"
git config --global init.defaultBranch main
```

## 4. Versionar o projeto

```powershell
cd qoder-claude
git init -b main
git status --short
git add .
git commit -m "feat: run Claude Code on Qoder models"
```

O `.gitignore` cobre `node_modules/`, `*.log`, `.env*`, `accounts/`, `accounts.json`, `tools/`
e `.claude/settings.json`. Esses guardam credencial ou estado local e nunca vão para o repo.

## 5. Criar o remoto

```powershell
gh repo create qoder-claude --public --source . --remote origin --push `
  --description "Run Claude Code on Qoder models - local Anthropic bridge, 1M context, failover"
```

| objetivo | flag |
|---|---|
| repositório público | `--public` |
| repositório privado | `--private` |
| conectar um repo existente | `--remote origin --source .` |
| organização | `gh repo create org/qoder-claude ...` |

Sem o `gh`, crie o repositório na interface web e depois:

```powershell
git remote add origin https://github.com/<usuario>/qoder-claude.git
git push -u origin main
```

## 6. Verificar

```powershell
gh repo view --json name,visibility,defaultBranchRef,url
git remote -v
git log --oneline --decorate -3
```

Descrição e homepage do repositório:

```powershell
gh repo edit --description "..." --homepage "https://ryanabcraft.github.io/qoder-claude/"
```

## 7. Ciclo normal

```powershell
git status
git add <arquivos>
git commit -m "fix: <o que mudou>"
git push
```

Push na `main` roda dois workflows: `unix install` (Ubuntu + macOS) e `Deploy site`.

## 8. Se der problema

| sintoma | causa | correção |
|---|---|---|
| `fatal: not a git repository` | rodou fora da pasta | `cd` na raiz |
| `gh: command not found` | terminal aberto antes de instalar | reabra |
| `HTTP 404` no `gh repo create` | token sem `repo` | `gh auth refresh -s repo` |
| `remote origin already exists` | repo já inicializado | `git remote set-url origin <url>` |
| `failed to push some refs` | remoto já tem commits | `git pull --rebase origin main` |
| `Author identity unknown` | falta `user.name`/`user.email` | passo 3 |
| commit com `.env`/`accounts.json` | arquivo já rastreado | `git rm --cached <arquivo>` e commit |
| `LF will be replaced by CRLF` | autocrlf do Windows | inofensivo; `git config --global core.autocrlf input` |

## 9. Referência rápida

```powershell
gh auth status
git status
git init -b main && git add . && git commit -m "mensagem"
gh repo create qoder-claude --public --source . --remote origin --push
git push
```
