# Começar e instalar

`qoder-claude` é uma bridge local da Anthropic Messages API. O Claude Code mantém a interface e as
ferramentas; o tráfego do modelo vai para o seu plano Qoder por uma requisição assinada direta ou
pelo CLI do Qoder.

## Requisitos

- Windows 10/11, Linux, macOS ou WSL.
- Uma conta Qoder com plano ativo (`qodercli login`).
- Node.js 20+ — o instalador instala um Node local quando não existe.
- Claude Code — o instalador instala o build oficial quando precisa.

A bridge não tem dependências de runtime.

## Instalar

::: code-group

```cmd [Windows CMD]
curl -fsSL https://raw.githubusercontent.com/Ryanabcraft/qoder-claude/main/install.cmd -o install.cmd && install.cmd && del install.cmd
```

```powershell [PowerShell]
irm https://raw.githubusercontent.com/Ryanabcraft/qoder-claude/main/install.ps1 | iex
```

```bash [Linux, macOS, WSL]
curl -fsSL https://raw.githubusercontent.com/Ryanabcraft/qoder-claude/main/install.sh | bash
```

:::

O instalador escreve `~/.claude/settings.json`, adiciona o comando `qclaude` ao PATH, instala o
motor de imagem, adiciona o MCP Exa e libera as web tools. Ele guarda um backup do settings anterior.

## Primeira execução

```bash
qclaude
```

- Abre a bridge em `http://127.0.0.1:8787`.
- Abre o dashboard em `/ui`.
- Abre o Claude Code na pasta atual.

Fechar o Claude (`/exit`, Ctrl+C ou fechar a janela) encerra a bridge.

Dentro do Claude Code:

- `/model` mostra o picker dos modelos Qoder.
- O slider de esforço e o thinking são repassados como o request manda.
- A statusline mostra `Qoder · <modelo>`.
- `/compact` continua funcionando.

## Verificar

```bash
qclaude --status
```

Mostra versão, conta, failover, servidor, quantidade de modelos e caminhos. Se houver servidor
rodando, mostra também a URL do dashboard.

## Próximo

- [Atualizar e desinstalar](/pt-BR/guide/maintenance)
- [Modelos e contas](/pt-BR/usage/models-accounts)
- [Solução de problemas](/pt-BR/help/troubleshooting)
