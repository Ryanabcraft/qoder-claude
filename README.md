# qoder-bridge

A local **Anthropic Messages API** server backed by the [Qoder CLI](https://qoder.com).
Point Claude Code at it and every request runs on your Qoder plan's models, with native
tool calls, streaming and a statusline that shows which model answered.

```
Claude Code --/v1/messages--> qoder-bridge --stream-json--> qodercli --> api1.qoder.sh
```

## Features

- Anthropic-compatible `/v1/messages` with real SSE streaming and `tool_use` blocks
- Warm CLI worker pool: ~2 s per request once the pool is up
- Model, thinking budget and context window selectable per request
- `Qoder · <model>` statusline written into Claude Code settings
- One-command installer for Windows: dependencies, login, config, server, health check
- No credential handling: the bridge never reads, stores or replays Qoder tokens

## Installation

### Windows (one command)

Paste into **CMD**:

```cmd
gh repo clone Ryanabcraft/qoder-bridge "%LOCALAPPDATA%\qoder-bridge" -- --depth 1 2>nul || git -C "%LOCALAPPDATA%\qoder-bridge" pull --ff-only -q & powershell -NoProfile -ExecutionPolicy Bypass -File "%LOCALAPPDATA%\qoder-bridge\install.ps1"
```

Or in **PowerShell**:

```powershell
$d = Join-Path $env:LOCALAPPDATA 'qoder-bridge'
if (Test-Path (Join-Path $d '.git')) { git -C $d pull --ff-only -q } else { gh repo clone Ryanabcraft/qoder-bridge $d -- --depth 1 }
& (Join-Path $d 'install.ps1')
```

The installer:

1. installs Node.js LTS if missing (winget)
2. installs `@qoder-ai/qodercli` if missing
3. opens the Qoder login flow if there is no session
4. copies the bridge to `%LOCALAPPDATA%\qoder-bridge`
5. writes the **global** `~/.claude/settings.json` (backup kept as `.bak`) with URL, token and statusline
6. starts the server in the background and waits for `/health`
7. lists the models to prove the route answers

Flags: `-ProjectOnly` (configure only the current directory), `-NoStart`, `-SkipDeps`,
`-InstallDir <path>`.

### Manual

```bash
git clone https://github.com/Ryanabcraft/qoder-bridge.git
cd qoder-bridge
npm install -g @qoder-ai/qodercli
qodercli login
node src/server.js
```

Then add to `~/.claude/settings.json`:

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "http://127.0.0.1:8787",
    "ANTHROPIC_AUTH_TOKEN": "dummy",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "claude-opus-4-5",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "claude-sonnet-4-5",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "claude-haiku-4-5"
  },
  "statusLine": {
    "type": "command",
    "command": "node \"C:\\\\path\\\\to\\\\qoder-bridge\\\\scripts\\\\statusline.js\""
  }
}
```

## Usage

```bash
claude                                   # uses Auto, with the model's own limits
claude --model Qwen3.8-Max               # any model from GET /v1/models
```

Inside a session, `/model Qwen3.8-Max` switches at the next request.

Nothing is capped by default: the bridge does not send `--max-output-tokens`,
`--thinking` or `--context-window` unless you ask for it. The Qoder CLI uses the model's
native limits. Optional overrides, when you actually want them:

```bash
# server side
QODER_MAX_OUTPUT_TOKENS=16000 node src/server.js
QODER_CONTEXT_WINDOW=200000 node src/server.js
QODER_THINKING=enabled QODER_THINKING_BUDGET=8000 node src/server.js

# client side (Claude Code forwards it as thinking.budget_tokens)
MAX_THINKING_TOKENS=8000 claude
```

### Models

`Auto, Ultimate, Fast, Efficient, Sonus, Cantus, Qwen3.8-Max, Qwen3.8-Flash,
Kimi-K3.1-Pro, Kimi-K2.8-Preview, GLM-5.3, GLM-5.3-Flash, DeepSeek-V4-Pro,
DeepSeek-Flash, MiniMax-M3.1-Flash`

Set `QODER_MODEL_MAP=1` to map Claude families: `opus` → Ultimate, `sonnet` → Auto,
`haiku` → Fast.

## Configuration

| variable | default | purpose |
|---|---|---|
| `BRIDGE_PORT` | `8787` | listen port |
| `BRIDGE_HOST` | `127.0.0.1` | bind address |
| `BRIDGE_API_KEY` | empty | require `x-api-key` or `Bearer` |
| `BRIDGE_POOL_SIZE` | `3` | warm workers |
| `BRIDGE_POOL` | on | `0` disables the pool |
| `BRIDGE_REQUEST_TIMEOUT_MS` | `300000` | per-request cutoff |
| `QODER_MODEL` | `Auto` | fixed model |
| `QODER_THINKING` | from request | `enabled`, `adaptive`, `disabled` |
| `QODER_THINKING_BUDGET` | from request | thinking tokens |
| `QODER_CONTEXT_WINDOW` | from request | context window |
| `QODER_MAX_OUTPUT_TOKENS` | unset | optional output cap; unset = model default |
| `QODER_CLI_BIN` | auto-detected | path to `qodercli.js` |
| `BRIDGE_LOG` | on | `0` silences access log |
| `BRIDGE_DUMP` | empty | file path for the last request |

## Endpoints

| method | route | purpose |
|---|---|---|
| GET | `/health` | liveness |
| GET | `/v1/models` | model list |
| POST | `/v1/messages` | Anthropic Messages |
| POST | `/v1/messages/count_tokens` | token estimate |

## How it works

The Qoder inference endpoint encrypts and signs each request body (`Authorization: COSY.*`,
`Cosy-Key`, `Cosy-Date`) inside a native WASM module, so replaying it is not practical.

The official CLI already emits Anthropic-shaped events with
`--output-format stream-json --include-partial-messages`. The bridge builds the prompt,
reads those events and forwards them. Tool calls are negotiated in text:

```
<tool_calls>[{"name":"Write","input":{"file_path":"a.txt","content":"x"}}]</tool_calls>
```

The bridge converts the block into a real `tool_use` block and Claude Code executes it.

## Limitations

- One inference call per tool round-trip; latency is ~2 s warm and ~10 s on a cold worker.
- The first three requests after start pay the cold start.
- Full history is serialized into the prompt on every request, so long conversations are
  expensive and slower.
- Qoder's own built-in tools stay disabled (`--tools ""`); the Claude Code side executes.
- Provider-side policy refusals pass through unchanged.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
