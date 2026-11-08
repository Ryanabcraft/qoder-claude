# Update and uninstall

## Update

`qclaude` checks for a new version when it starts and asks before updating. A declined version is
not asked again.

```bash
qclaude update          # checks and installs the latest version now
qclaude notes           # changelog for the installed version
qclaude notes 1.11.1    # changelog for a specific version
```

After an update, the new version prints its notes, capped at ten lines. The check reads the GitHub
API first and falls back to the raw package file. `qclaude update` downloads the branch tarball
directly and does not depend on that cache.

`QODER_NO_UPDATE=1` or `qclaude --no-update` skips the check for one run.

The updater preserves `accounts/`, `accounts.json`, `tools/`, `bridge.config.json`, `metrics.jsonl`
and the logs.

## Uninstall

```bash
qclaude uninstall --dry-run    # list what would be removed
qclaude uninstall              # ask for confirmation
qclaude uninstall --yes        # no prompt
```

It removes the app directory, the launcher, the user PATH entry on Windows and only the Claude
settings the installer wrote. Accounts are backed up to `~/.qoder-claude-accounts-<time>` before
deletion.

Flags:

| flag | effect |
|---|---|
| `--project <dir>` | also cleans `<dir>/.claude/settings.json` |
| `--no-backup` | skips the accounts backup |
| `--remove-exa` | removes the Exa MCP only when its URL is the qoder-claude one |

Kept by default: `~/.claude.json` MCP servers, `permissions.allow`, Claude Code, the Qoder CLI and
its login. A source checkout is refused.

The same command is documented in the [CLI reference](/reference/cli).
