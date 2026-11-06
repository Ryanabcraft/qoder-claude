# qoder-claude

A local **Anthropic Messages API** server backed by the [Qoder CLI](https://qoder.com).
Point Claude Code at it and every request runs on your Qoder plan's models, with tool calls
that keep their shape, streaming and a statusline that shows which model answered.

**Site:** https://ryanabcraft.github.io/qoder-claude/

**Contents:** [Installation](#installation) · [Open it](#open-it) · [Accounts](#accounts) ·
[Configuration](#configuration) · [How it works](#how-it-works) · [Limitations](#limitations)

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

### Windows — CMD

```cmd
curl -fsSL https://raw.githubusercontent.com/Ryanabcraft/qoder-claude/main/install.cmd -o install.cmd && install.cmd && del install.cmd
```

### Windows — PowerShell

```powershell
irm https://raw.githubusercontent.com/Ryanabcraft/qoder-claude/main/install.ps1 | iex
```

### Linux / macOS

```bash
curl -fsSL https://raw.githubusercontent.com/Ryanabcraft/qoder-claude/main/install.sh | bash
```

The installer:

1. checks Node.js 20+ (installs LTS via winget on Windows; tells you what to install elsewhere)
2. installs `@qoder-ai/qodercli` if missing
3. opens the Qoder login flow if there is no session
4. installs the bridge to `%LOCALAPPDATA%\qoder-bridge` or `~/.local/share/qoder-bridge`
5. writes the **global** `~/.claude/settings.json` (backup kept as `.bak`) with URL, token,
   `modelPicker` and statusline
6. starts the server in the background and waits for `/health`
7. lists the models to prove the route answers

Flags: `-ProjectOnly` / `--project-only` (configure only the current directory),
`-NoStart` / `--no-start`, `-SkipDeps`, `-InstallDir <path>` / `--dir <path>`.

The install directory keeps the historical name `qoder-bridge` so existing installs keep
working; only the repository and the command are named `qoder-claude`.

### Manual

```bash
git clone https://github.com/Ryanabcraft/qoder-claude.git
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

### Open it

```bash
qclaude                # boots the bridge if needed, then opens Claude Code
qclaude -p "..."       # any argument is forwarded to claude
qclaude --model X      # same
qclaude --status       # server and model list
qclaude --serve        # only the server, foreground
qclaude --stop         # stop the server
```

When `qclaude` starts the server itself, closing Claude also stops it. A server started by
`start.cmd` is left alone.

## Running it

Windows: `start.cmd` opens a visible console with the port, the log path and every request
as it happens. Closing that window — or Ctrl+C — stops the server. Nothing runs hidden.

Linux/macOS: `./start.sh` runs the same way in the foreground; `./stop.sh` stops it from
another terminal.

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

### Reasoning effort and thinking

The bridge forwards the controls Claude Code already sends, verbatim:

| Claude Code sends | bridge passes to `qodercli` |
|---|---|
| `output_config.effort` | `--reasoning-effort <low\|medium\|high\|xhigh\|max>` |
| `thinking.type` | `--thinking <auto\|adaptive\|enabled\|disabled>` |
| `thinking.budget_tokens` | `--thinking-budget <n>` |

The installer sets `*_SUPPORTED_CAPABILITIES` so the effort slider appears in `/model`:

```json
"ANTHROPIC_DEFAULT_OPUS_MODEL_SUPPORTED_CAPABILITIES": "effort,xhigh_effort,thinking,adaptive_thinking,interleaved_thinking"
```

`/effort status`, the left/right slider and `CLAUDE_CODE_EFFORT_LEVEL` all work as they do
against Anthropic, because the value reaches the model untouched.

### Model picker

The installer writes a `modelPicker` block into `~/.claude/settings.json`, so `/model`
lists the Qoder lineup directly instead of Opus/Sonnet/Haiku:

```json
"modelPicker": {
  "replaceBuiltInOptions": true,
  "options": [
    { "model": "Auto", "label": "Qoder · Auto", "description": "Auto via Qoder CLI" },
    { "model": "Qwen3.8-Max", "label": "Qoder · Qwen3.8-Max", "description": "Qwen3.8-Max via Qoder CLI" }
  ]
}
```

`modelPicker` requires Claude Code v2.1.243+ and only takes effect in user settings,
`--settings`, or managed settings — project settings ignore it.

## Updating

Nothing updates itself silently. The model list is the only thing that stays current on its
own, because the bridge asks the CLI:

| piece | updates how |
|---|---|
| model list (`/v1/models`, `/model` picker) | read from `qodercli --list-models`, cached 10 min |
| `qodercli` | `qodercli update` or `npm i -g @qoder-ai/qodercli` |
| bridge code | `git pull` in the install dir, then restart |
| Claude Code | its own updater, unrelated to this project |

`update.cmd` does all of it in one shot:

```cmd
"%LOCALAPPDATA%\qoder-bridge\update.cmd"
```

## Accounts

An **account** here is an isolated Qoder profile. Each one gets its own `--config-dir`, so
the login, the session and the quota of one never touch another.

`default` is whatever you already had: the global `~/.qoder` config.

### Add an account

```bash
qclaude account add work
```

It creates `accounts/work`, opens the Qoder login in your browser, and makes it active when
the login finishes. Run the same command with another name for each extra account.

### List and switch

```bash
qclaude account list

# contas:
#   * default          (config global)
#     work             C:\...\qoder-bridge\accounts\work

qclaude account use work     # active from now on
qclaude account current      # which one is active
qclaude --status             # account + server + models
```

### One session on a specific account

```bash
qclaude --account work
```

Switches the active account and opens Claude Code with it. Everything else stays the same.

### Remove an account

```bash
qclaude account remove work
```

Deletes the profile and its credential directory. `default` cannot be removed.

### Where things live

| What | Where |
|---|---|
| active account name | `accounts.json` |
| each extra account | `accounts/<name>/` |
| the default account | `~/.qoder` |

`accounts/` and `accounts.json` are listed in `.gitignore` — credentials never reach the repo.

### Good to know

- **Quota is per account.** Switching accounts switches the daily limit.
- **The model is not part of the account.** Claude Code keeps the model choice; the account
  only changes who answers.
- **Restart the open session after switching.** `qclaude account add` and `use` change the
  next worker, not the one already running.
- **A logged-out account fails fast:** about 3 seconds, with
  `Not logged in · Please run /login`.

### Troubleshooting

| Symptom | Fix |
|---|---|
| `conta "x" nao existe` | `qclaude account list` to see the exact names |
| `Not logged in` | `qclaude account add <name>` again, then restart the session |
| Wrong account answering | `qclaude account current`, then restart the session |
| Login opened but nothing changed | the login must finish before the account becomes active |

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
reads those events and forwards them. The agent's own system prompt is passed to the CLI
intact, with only the tool-call contract appended — the model keeps the agent's rules, so it
calls tools instead of pasting file contents into the reply. Tool calls are negotiated in text:

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
