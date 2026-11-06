# SETUP — do zero ao repositório no GitHub

Procedimento completo: instalar as ferramentas, autenticar, versionar o projeto,
criar o repositório remoto e publicar. Todos os comandos foram executados nesta
máquina (Windows 11, Git 2.54, gh 2.95, winget 1.29).

## 1. Ferramentas necessárias

| ferramenta | função | pacote winget | verificação |
|---|---|---|---|
| Git | versionamento local e push | `Git.Git` | `git --version` |
| GitHub CLI (`gh`) | autenticação e criação do repo | `GitHub.cli` | `gh --version` |
| Node.js 20+ | runtime do `qoder-bridge` | `OpenJS.NodeJS.LTS` | `node --version` |

### Instalação

```powershell
winget install --id Git.Git -e --source winget
winget install --id GitHub.cli -e --source winget
winget install --id OpenJS.NodeJS.LTS -e --source winget
```

Alternativas:

```powershell
# Chocolatey
choco install git gh nodejs-lts -y

# Scoop
scoop install git gh nodejs-lts
```

Feche e reabra o terminal depois de instalar — o `PATH` só é recarregado em um
processo novo. Confira:

```powershell
git --version
gh --version
node --version
```

Nesta máquina:

```
git version 2.54.0.windows.1
gh version 2.95.0 (2026-06-17)
node v24.18.0
```

## 2. Autenticar no GitHub

```powershell
gh auth login
```

Escolha nesta ordem:

1. `GitHub.com`
2. `HTTPS`
3. `Login with a web browser` (ou cola um Personal Access Token)

Verifique conta ativa e escopos:

```powershell
gh auth status
```

Saída esperada (mínimo para criar repositório):

```
✓ Logged in to github.com account <usuario> (keyring)
- Active account: true
- Git operations protocol: https
- Token scopes: 'repo', 'workflow', ...
```

`repo` é obrigatório. Se faltar:

```powershell
gh auth refresh -h github.com -s repo,workflow
```

## 3. Identidade do commit

Sem isso o commit falha ou sai sem autor:

```powershell
git config --global user.name "Seu Nome"
git config --global user.email "voce@exemplo.com"
git config --global init.defaultBranch main
```

Conferir:

```powershell
git config --global user.name
git config --global user.email
```

## 4. Versionar o projeto

Dentro da pasta do projeto:

```powershell
cd D:\SISTEMAS\Projetos\Qoder-Claude\qoder-bridge
git init -b main
```

O `.gitignore` já existe e cobre `node_modules/`, `*.log`, `.env*` e backups.
Antes do primeiro commit, confira o que entraria:

```powershell
git status --short
```

Se `node_modules` ou algum `.env` aparecer, o `.gitignore` está errado — corrija
antes de commitar. Commit inicial:

```powershell
git add .
git commit -m "feat: anthropic-compatible bridge backed by the Qoder CLI"
```

Confira o resultado:

```powershell
git log --oneline -1
git ls-files | Measure-Object -Line
```

## 5. Criar o repositório remoto

Um comando faz tudo — cria no GitHub, configura `origin` e já faz push:

```powershell
gh repo create qoder-bridge --private --source . --remote origin --push `
  --description "Anthropic-compatible local bridge backed by the Qoder CLI"
```

Variações:

| objetivo | flag |
|---|---|
| repositório público | `--public` |
| repositório privado | `--private` |
| já existe e quer só conectar | `--remote origin --source .` |
| sem push inicial | omitir `--push` |
| organização | `gh repo create org/qoder-bridge ...` |

Sem o `gh`, o caminho puramente `git` é:

```powershell
git remote add origin https://github.com/<usuario>/qoder-bridge.git
git push -u origin main
```

O repositório precisa existir antes, criado pela interface web. O `gh` evita esse
passo e já resolve o `origin`.

## 6. Verificar

```powershell
gh repo view --web            # abre no navegador
gh repo view --json name,visibility,defaultBranchRef,url
git remote -v
git log --oneline --decorate -3
```

Saída esperada do `gh repo view --json`:

```json
{"defaultBranchRef":{"name":"main"},"name":"qoder-bridge","url":"https://github.com/<usuario>/qoder-bridge","visibility":"PRIVATE"}
```

## 7. Ciclo normal depois disso

```powershell
git status
git add src/server.js
git commit -m "fix: <o que mudou>"
git push
```

## 8. Troubleshooting

| sintoma | causa | correção |
|---|---|---|
| `fatal: not a git repository` | rodou fora da pasta do projeto | `cd` na raiz do projeto |
| `gh: command not found` | terminal antigo após instalar | reabrir o terminal |
| `HTTP 404` no `gh repo create` | token sem escopo `repo` | `gh auth refresh -s repo` |
| `remote origin already exists` | repositório já inicializado | `git remote set-url origin <url>` |
| `failed to push some refs` | remoto já tem commits | `git pull --rebase origin main` |
| `Author identity unknown` | falta `user.name`/`user.email` | passo 3 |
| commit com `.env` dentro | arquivo já rastreado | `git rm --cached .env` e commit |
| `LF will be replaced by CRLF` | autocrlf do Windows | aviso inofensivo; silencie com `git config --global core.autocrlf input` |

## 9. Referência rápida

```powershell
# estado
gh auth status
git status

# criar
git init -b main
git add .
git commit -m "mensagem"
gh repo create <nome> --private --source . --remote origin --push

# conferir
gh repo view --json name,visibility,url
git remote -v
```
