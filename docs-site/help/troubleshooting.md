# Troubleshooting

Start with:

```bash
qclaude --status
```

It prints the version, account, failover state, server state, models and paths. The bridge log is
next to the install (`bridge.log`); the dashboard Usage & Logs page tails it.

| symptom | cause | fix |
|---|---|---|
| `claude` is not recognized | terminal opened before the PATH update | open a new terminal; `qclaude` can install Claude |
| `claude.exe is not compatible` | broken npm copy | remove the npm copy; `qclaude` uses the official build |
| `Not logged in` | Qoder session expired | `qodercli login` or `qclaude account add <name>` |
| wrong account answering | another profile is active | `qclaude account current`, `qclaude account use <name>`, restart the session |
| failover never fires | rotation off or only one account | `qclaude rotation` and `qclaude account list` |
| `WebSearch` returns nothing | native search behind the gateway | check Exa in Settings → Security; run the installer again |
| the model says it cannot see the image | vision engine missing | `qclaude vision install`, then resend the image |
| image turn is slow | the 1.1.80 engine is not streamed | expected around 13 s; text turns after it are fast |
| port already in use | another bridge is running | `qclaude --stop`, or change `BRIDGE_PORT` |
| dashboard asks for a key | `BRIDGE_API_KEY` is set | open the URL from `qclaude`, which carries the key in the fragment |
| update not detected | GitHub API/raw cache | `qclaude update` forces the tarball; wait a minute and retry |
| server does not stop with Ctrl+C | a separate server window is open | close that window, or run `stop.cmd` / `stop.sh` |

## Logs

```bash
qclaude --status
```

The dashboard shows the last 200 lines with search and download. The same file is on disk as
`bridge.log` in the install directory.

## Reset

- Settings: edit or delete `bridge.config.json` in the install directory.
- Metrics: delete `metrics.jsonl`.
- Accounts: `qclaude account remove <name>`.
- Claude settings: `qclaude uninstall --dry-run` first; the uninstaller backs up accounts and only
  removes the keys it wrote.
