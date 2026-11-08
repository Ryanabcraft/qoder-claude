---
layout: home
hero:
  name: qoder-claude
  text: Claude Code nos modelos do Qoder
  tagline: Uma bridge local compatível com a Anthropic que mantém o Claude Code e manda o tráfego do modelo para o seu plano Qoder.
  image:
    src: /logo.png
    alt: qoder-claude
  actions:
    - theme: brand
      text: Começar
      link: /pt-BR/guide/start
    - theme: alt
      text: Guia do dashboard
      link: /pt-BR/usage/dashboard
features:
  - title: Claude Code intacto
    details: Ferramentas, prompts, permissões, statusline e controles de esforço continuam onde estão.
  - title: Contas com failover
    details: Várias contas Qoder; cota, 403, 429 e sessão perdida rotacionam para a próxima.
  - title: Transporte direto
    details: O WASM embutido assina localmente e chama api1.qoder.sh; o CLI fica como fallback.
  - title: Console de nove páginas
    details: Contas, routing, analytics, health, usage, modelos e settings em 127.0.0.1:8787/ui.
---

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

Depois rode:

```bash
qclaude
```

Isso sobe a bridge, abre o dashboard e abre o Claude Code. Fechar o Claude encerra a bridge.

## O que tem aqui

- [Começar e instalar](/pt-BR/guide/start) — requisitos e primeira execução.
- [Modelos e contas](/pt-BR/usage/models-accounts) — picker, 1M e failover.
- [Dashboard](/pt-BR/usage/dashboard) — console, settings e métricas.
- [CLI](/pt-BR/reference/cli) e [configuração](/pt-BR/reference/config).
- [Solução de problemas](/pt-BR/help/troubleshooting).

Código: [github.com/Ryanabcraft/qoder-claude](https://github.com/Ryanabcraft/qoder-claude) · MIT
