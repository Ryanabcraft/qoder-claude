# Contributing

Thanks for looking. This is a small, dependency-free Node project — keeping it that way is part
of the design.

## Requirements

- Node.js 20+
- `@qoder-ai/qodercli` installed and logged in (`qodercli login`) for real requests
- Windows 10/11 only if you touch the PowerShell installer; the server is portable

## Development

```bash
git clone https://github.com/Ryanabcraft/qoder-claude.git
cd qoder-claude
node src/server.js
```

Smoke test, without Claude Code:

```bash
curl -sN http://127.0.0.1:8787/v1/messages \
  -H "content-type: application/json" \
  -d '{"model":"Auto","max_tokens":64,"stream":true,
       "messages":[{"role":"user","content":"say ok"}]}'
```

`BRIDGE_POOL=0` spawns one CLI process per request (slower, easier to debug).
`BRIDGE_DUMP=/tmp/last.json` captures the last incoming request.
`BRIDGE_DEBUG_STDERR=1` mirrors the worker's stderr.

## Layout

| file | responsibility |
|---|---|
| `src/server.js` | HTTP routes, SSE, tool-call gate |
| `src/cli.js` | CLI discovery, worker pool, warm-up |
| `src/direct.js` | WASM-signed transport, no CLI process |
| `src/prompt.js` | Anthropic → prompt translation, tool-call parsing |
| `src/images.js` | image blocks, size limits, log redaction |
| `src/vision.js` | bundled image engine for image turns |
| `src/accounts.js` | profiles and failover rotation |
| `src/sessions.js` | session reuse and delta |
| `src/uiApi.js` + `src/ui/` | dashboard |
| `scripts/` | statusline and settings writer |
| `install.*` | installers |

## Rules

- No runtime dependencies. The project must run with a bare `node`.
- The agent's system prompt goes to the model verbatim.
- Credentials never leave the machine: the direct transport decrypts the local store in memory
  to sign a request, and nothing is logged or committed.
- If a block type is not supported, drop it explicitly with a log line instead of guessing.
- Comments only where the reason is not obvious.
- Commit messages in English, imperative mood.

## Verify

```bash
npm test                        # unit and route tests
node --check src/<changed>.js
bash -n install.sh update.sh start.sh stop.sh
node scripts/bench.mjs          # latency, needs a running server
```

CI runs the installer on Ubuntu and macOS (`unix install`) on every push that touches `src/`,
`bin/`, `scripts/` or the installers. The Pages workflow builds the site.

## Pull requests

1. Describe the problem being solved, not just the change.
2. Include the command you used to verify it.
3. If you touch the transport, prompt format or pool, say what you measured.
