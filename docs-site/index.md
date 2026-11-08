---
layout: home
hero:
  name: qoder-claude
  text: Claude Code on Qoder models
  tagline: A local Anthropic-compatible bridge that keeps Claude Code and routes the model traffic through your Qoder plan.
  image:
    src: /logo.png
    alt: qoder-claude
  actions:
    - theme: brand
      text: Get started
      link: /guide/start
    - theme: alt
      text: Open the dashboard guide
      link: /usage/dashboard
features:
  - title: Claude Code unchanged
    details: Tools, prompts, permissions, statusline and effort controls stay exactly where they are.
  - title: Accounts with failover
    details: Add several Qoder profiles; quota, 403, 429 and lost sessions rotate to the next one.
  - title: Direct transport
    details: The embedded WASM signs requests locally and calls api1.qoder.sh; the CLI stays as fallback.
  - title: Nine-page console
    details: Accounts, routing, analytics, health, usage, models and settings at 127.0.0.1:8787/ui.
---

## Install

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

Then run:

```bash
qclaude
```

That starts the bridge, opens the dashboard and opens Claude Code. Closing Claude stops the bridge.

## What is covered

- [Start and install](/guide/start) — requirements and first run.
- [Models and accounts](/usage/models-accounts) — model picker, 1M context, failover.
- [Dashboard](/usage/dashboard) — the console, settings and metrics.
- [CLI](/reference/cli) and [configuration](/reference/config) — every command and knob.
- [Troubleshooting](/help/troubleshooting) — the failures people actually hit.

Source: [github.com/Ryanabcraft/qoder-claude](https://github.com/Ryanabcraft/qoder-claude) · MIT
