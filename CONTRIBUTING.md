# Contributing

Thanks for looking. This is a small, dependency-free Node project; keeping it that way
is part of the design.

## Requirements

- Node.js 20+
- `@qoder-ai/qodercli` installed and logged in (`qodercli login`) to exercise real requests
- Windows 10/11 for the PowerShell installer; the server itself is portable

## Development

```bash
git clone https://github.com/Ryanabcraft/qoder-bridge.git
cd qoder-bridge
node src/server.js
```

Smoke test without Claude Code:

```bash
curl -sN http://127.0.0.1:8787/v1/messages \
  -H "content-type: application/json" \
  -d '{"model":"claude-sonnet-4-5","max_tokens":64,"stream":true,
       "messages":[{"role":"user","content":"say ok"}]}'
```

Set `BRIDGE_POOL=0` to spawn one CLI process per request — slower, but easier to debug.
Set `BRIDGE_DUMP=/tmp/last.json` to capture the last incoming request.

## Code layout

| file | responsibility |
|---|---|
| `src/server.js` | HTTP routes, SSE, tool-call gate |
| `src/cli.js` | CLI discovery, worker pool, warm-up |
| `src/prompt.js` | Anthropic → prompt translation, tool-call parsing |
| `scripts/statusline.js` | Claude Code statusline |
| `scripts/enable-here.js` | settings writer |
| `install.ps1` | Windows installer |

## Guidelines

- No runtime dependencies. The project must run with a bare `node`.
- Keep the Anthropic surface honest: if a block type is not supported, drop it explicitly
  instead of guessing.
- Never log or persist Qoder credentials. The bridge only talks to the CLI over stdio.
- Comments only where the reason is not obvious from the code.
- Commit messages in English, imperative mood.

## Pull requests

1. Describe the problem being solved, not just the change.
2. Include the command you used to verify the behaviour.
3. If you touch the worker pool or the prompt format, say what you measured.
