# Contributing

Thanks for looking. The project is a small, dependency-free Node bridge; keeping the runtime free of
dependencies is part of the design. The landing site and docs have their own build tooling.

## Requirements

- Node.js 20+
- `@qoder-ai/qodercli` installed and logged in for real requests
- Windows 10/11 only if you touch the PowerShell installer

## Development

```bash
git clone https://github.com/Ryanabcraft/qoder-claude.git
cd qoder-claude
node src/server.js
```

Smoke test without Claude Code:

```bash
curl -sN http://127.0.0.1:8787/v1/messages \
  -H "content-type: application/json" \
  -d '{"model":"Auto","max_tokens":64,"stream":true,
       "messages":[{"role":"user","content":"say ok"}]}'
```

Useful switches:

| variable | effect |
|---|---|
| `BRIDGE_POOL=0` | one CLI process per request; easier to debug |
| `BRIDGE_DUMP=/tmp/last.json` | capture the last request body |
| `BRIDGE_DEBUG_STDERR=1` | mirror worker stderr |
| `BRIDGE_LOG=0` | silence the access log |

## Tests

```bash
npm test
npm run coverage
```

The suite covers prompt rendering, sessions, accounts, config, metrics, uninstall, update checks,
dashboard routes and the server. Coverage thresholds are enforced in CI.

## Docs and site

```bash
cd docs-site && npm install && npm run docs:build
cd site && npm install && npm run build
```

## Guidelines

- No runtime dependencies. The bridge must run with a bare `node`.
- Keep the Anthropic surface honest: unsupported blocks are dropped explicitly, not guessed.
- Never log or persist Qoder credentials; the bridge talks to the CLI over stdio.
- Comments only where the reason is not obvious.
- Commit messages in English, imperative mood.

Pull requests should describe the problem, the command used to verify the change, and any measured
effect on the pool, sessions or prompt format.
