# CLI reference

`qclaude` starts the bridge, opens the dashboard and launches Claude Code. Extra arguments are
forwarded to `claude`.

## Commands

| command | action |
|---|---|
| `qclaude` | start the bridge, dashboard and Claude Code |
| `qclaude -p "..."` | forward everything to `claude` |
| `qclaude --model X` | forward to `claude` |
| `qclaude --account <name>` | open with a specific account |
| `qclaude --status` | version, account, failover, server, models, paths |
| `qclaude --serve` | server only, foreground |
| `qclaude --window` | server in its own terminal window |
| `qclaude --no-browser` | do not open the dashboard |
| `qclaude --no-update` | skip the update check |
| `qclaude --stop` | stop the server |
| `qclaude update` | check and install the latest version |
| `qclaude notes [version]` | print the changelog |
| `qclaude uninstall [flags]` | remove the app, launcher and installer settings |
| `qclaude account ...` | manage Qoder profiles |
| `qclaude rotation [on\|off]` | show or change failover |
| `qclaude vision [install]` | image engine status or install |

`qclaude --help` prints the same list.

## Accounts

```bash
qclaude account list
qclaude account add work
qclaude account use work
qclaude account pause work
qclaude account resume work
qclaude account remove work
qclaude account current
```

## Uninstall flags

```bash
qclaude uninstall --dry-run
qclaude uninstall --yes
qclaude uninstall --project <dir>
qclaude uninstall --no-backup
qclaude uninstall --remove-exa
```

Accounts are backed up before deletion. MCP servers and `permissions.allow` are kept. A source
checkout is refused.

## Environment shortcuts

| variable | effect |
|---|---|
| `QODER_NO_UPDATE=1` | skip the update check |
| `QODER_NO_EXA=1` | skip the Exa MCP setup |
| `BRIDGE_PORT` | listen port; also used by the launcher |
| `BRIDGE_API_KEY` | require a key for the API and dashboard |
