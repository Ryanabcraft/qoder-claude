# Start and install

`qoder-claude` is a local Anthropic Messages API bridge. Claude Code keeps its interface and tools;
the model traffic goes to your Qoder plan through a direct signed request or the Qoder CLI.

## Requirements

- Windows 10/11, Linux, macOS or WSL.
- A Qoder account with an active plan (`qodercli login`).
- Node.js 20+ — the installer installs a local Node when none is present.
- Claude Code — the installer installs the official build when needed.

The bridge itself has no runtime dependencies.

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

The installer writes `~/.claude/settings.json`, adds the `qclaude` command to the PATH, installs
the image engine, adds the Exa MCP and allowlists the web tools. It keeps a backup of the previous
settings file.

## First run

```bash
qclaude
```

- Opens the bridge at `http://127.0.0.1:8787`.
- Opens the dashboard at `/ui`.
- Opens Claude Code in the current folder.

Close Claude (`/exit`, Ctrl+C or closing the window) and the bridge stops with it.

Inside Claude Code:

- `/model` shows the Qoder model picker.
- The effort slider and thinking controls are forwarded as the request sends them.
- The statusline shows `Qoder · <model>`.
- `/compact` keeps working; the bridge does not replace the context window.

## Verify

```bash
qclaude --status
```

It prints the version, account, failover state, server state, model count and the installed path.
If a server is running, it also prints the dashboard URL.

## Next

- [Update and uninstall](/guide/maintenance)
- [Models and accounts](/usage/models-accounts)
- [Troubleshooting](/help/troubleshooting)
