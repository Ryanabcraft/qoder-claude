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
| `qclaude quota [name]` | credits, remaining, burn rate and forecast |
| `qclaude quota --json` | machine-readable quota snapshot |
| `qclaude models` | model list with its source and age |
| `qclaude models --refresh` | asks the Qoder CLI for the current list |
| `qclaude models --json` | machine-readable model status |
| `qclaude models --apply` | writes the current list into the Claude Code picker |
| `qclaude rewards [name]` | daily 100-credit campaign state |
| `qclaude rewards --claim` | claim the daily reward manually |
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

## Quota

```bash
qclaude quota                 # all accounts
qclaude quota work            # one account
qclaude quota --refresh       # bypass the 60s cache
qclaude quota --json          # full snapshot
```

Percentages are computed from `used / total`; Qoder reports fractions (`0.68` = 68%). The token is
decrypted locally and only sent in the Authorization header to `openapi.qoder.sh`.

## Rewards

```bash
qclaude rewards               # all accounts
qclaude rewards Ryan0         # one account
qclaude rewards --claim       # redeem claimable campaigns
qclaude rewards --json        # full snapshot
```

The daily campaign pays 100 credits once per window (10:00–09:59 Singapore time), valid for 30
days. Claims are idempotent; a repeated claim returns `already`. Qoder restricts claims by device
identity, so one account per machine is usually eligible. Auto-claim is off by default and lives in
Settings → Advanced.

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
