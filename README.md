# qoder-claude

A local **Anthropic Messages API** server backed by [Qoder](https://qoder.com).
Point Claude Code at it and every request runs on your Qoder plan's models, with tool calls
that keep their shape, streaming and a statusline that shows which model answered.

**Site:** https://ryanabcraft.github.io/qoder-claude/

**Contents:** [Installation](#installation) · [Open it](#open-it) · [Accounts](#accounts) ·
[Configuration](#configuration) · [How it works](#how-it-works) · [Limitations](#limitations)

```
Claude Code --/v1/messages--> qoder-bridge --WASM-signed--> api1.qoder.sh
                                 `-- fallback: qodercli -----^
```

## Features

- Anthropic-compatible `/v1/messages` with real SSE streaming and `tool_use` blocks
- Direct transport: signs and encrypts each request with the embedded Qoder WASM, no CLI process
- Warm worker pool on the CLI fallback: ~2 s per request once the pool is up
- Any number of accounts, with automatic failover when one hits its quota
- Model, thinking budget and context window selectable per request
- `Qoder · <model>` statusline written into Claude Code settings
- One-command installer for Windows: dependencies, login, config, server, health check
- The token stays local: the bridge decrypts the Qoder store in memory to sign a request and
  never sends it to any other host

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

1. checks Node.js 20+ — installs it when missing (winget on Windows; the official LTS tarball
   into `~/.local/node` on Linux and macOS, no sudo, checksum verified)
2. installs `@qoder-ai/qodercli` and Claude Code if missing (Claude through the official
   `claude.ai/install` script, not npm)
3. opens the Qoder login flow if there is no session
4. installs the bridge to `%LOCALAPPDATA%\qoder-bridge` or `~/.local/share/qoder-bridge`
5. writes the **global** `~/.claude/settings.json` (backup kept as `.bak`) with URL, token,
   `modelPicker` and statusline
6. prints `Start with: qclaude`

The installer does not leave a server running. `qclaude` starts the bridge on demand, opens
Claude Code, and stops the bridge when Claude exits. `qclaude --window` keeps the server in its
own terminal window; `qclaude --serve` runs it in the foreground.

Flags for `install.sh`: `--project-only` (configure only the current directory), `--dir <path>`,
`--skip-claude`, `--skip-login` and `--source <dir>` (install from a local checkout).
For `install.ps1`: `-ProjectOnly`, `-SkipDeps`, `-InstallDir <path>`. `update.cmd` / `update.sh`
upgrade in place and stop any old server.

The install directory keeps the historical name `qoder-bridge` so existing installs keep
working; only the repository and the command are named `qoder-claude`.

**Why the Qoder CLI is still installed:** it owns the login (`qodercli login`), which writes
the credential store the direct transport signs with; it is the source of the model list; and
it is the fallback transport when `vendor/` is missing. The bridge itself does not shell out to
it on the default path.

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
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "claude-haiku-4-5",
    "CLAUDE_CODE_AUTO_MODE_SERVER": "0"
  },
  "statusLine": {
    "type": "command",
    "command": "node \"C:\\\\path\\\\to\\\\qoder-bridge\\\\scripts\\\\statusline.js\""
  }
}
```

`CLAUDE_CODE_AUTO_MODE_SERVER=0` stops Claude Code from asking for server-side auto-mode
checks. A local gateway cannot forward the `safeguards` field, so without it Claude Code shows
the "auto mode classifier requests" notice on every session and runs those checks itself.

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

By default `qclaude` opens the server in **its own terminal window** — a new `cmd` on Windows,
Terminal on macOS, and the first available emulator on Linux (`$TERMINAL`,
`x-terminal-emulator`, `gnome-terminal`, `konsole`, `xfce4-terminal`, `alacritty`, `kitty`,
`xterm`). The current window stays with Claude Code.

```bash
qclaude --window      # only the server window
qclaude --no-window   # server attached to this terminal
```

Windows also keeps `start.cmd`, which opens a visible console with the port, the log path and
every request as it happens. Closing that window — or Ctrl+C — stops the server.

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

# accounts (failover on):
#   * default          active       (global config)
#     work             ready        C:\...\qoder-bridge\accounts\work

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

### Automatic failover

With more than one account, the bridge rotates them by itself. When the active profile hits
its daily quota, gets rate-limited or loses its session, that account is **paused** and the
same request is retried on the next one — no restart, no manual switch.

```
account 1/3: work
account work paused 1800s: upstream 403: Billing daily count exceeded
account 2/3: personal
done session=miss total=2311ms
```

| what happened | pause |
|---|---|
| billing / daily count / quota / `403` | 30 minutes |
| `401`, not logged in, expired token | 10 minutes |
| `429` rate limit | 1 minute |
| timeout, connection reset | 30 seconds |

Order: the active account first, then the rest in file order. Paused accounts go to the end of
the queue and come back on their own when the timer expires. A successful reply from an account
clears its pause.

```bash
qclaude rotation            # pool, state of each account
qclaude rotation on|off     # turn automatic failover on or off
qclaude account pause work  # keep an account out of the pool
qclaude account resume work # put it back
```

The dashboard has the same switch on the **Accounts** tab, plus a per-account Enable/Disable
button and a live countdown for paused profiles. `BRIDGE_COOLDOWN_MS` sets a fallback pause
for errors that match none of the classes above.

Two limits worth knowing:

- **Only before the first visible token.** If the reply already started streaming, the bridge
  cannot rewrite it on another account; the error is returned instead.
- **Rotation is per request.** The worker of a Claude Code session is bound to one account;
  when the account changes, the next turn starts a new worker with the full history.

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
| `account "x" does not exist` | `qclaude account list` to see the exact names |
| `Not logged in` | `qclaude account add <name>` again, then restart the session |
| Wrong account answering | `qclaude account current`, then restart the session |
| `claude.exe is not compatible with the version of Windows` | an old npm copy is broken. `qclaude` now ignores it and uses the official build; remove the stale one with `npm uninstall -g @anthropic-ai/claude-code` |
| Login opened but nothing changed | the login must finish before the account becomes active |
| Failover never fires | `qclaude rotation` — check `on` and that the other accounts are not disabled |
| Everything is paused | the pool is empty for now; wait for the timer or `qclaude account resume <name>` |

## Sessions

One Claude Code conversation keeps one `qodercli` process. The bridge remembers the messages it
already sent and forwards only the new ones on the next turn:

| event | behaviour |
|---|---|
| same `session_id`, same account/model/system | worker reused (`session=hit`), only the delta is sent |
| `/clear` or a new conversation | new worker (`session=miss`) |
| model, account or system prompt changed | new worker |
| idle for 15 minutes | worker recycled |
| more than 4 live sessions | oldest worker recycled |

Tunables: `BRIDGE_SESSION_TTL_MS` (default `900000`) and `BRIDGE_SESSION_MAX` (default `4`).

If the agent rewrites its history without changing the `session_id`, the prefix check fails and
the bridge falls back to a fresh worker with the full history — never a delta over unknown state.

## Errors and retries

- Qoder refusal (daily quota, `403`, `not logged in`) → **400 `invalid_request_error`** with the
  real message. Claude Code does not retry a 400, so the "retry in 4m 10s" banner disappears.
- Before returning that error, the bridge tries the next account in the pool (see
  [Automatic failover](#automatic-failover)). The 400 only reaches Claude Code when no account
  can answer.
- Rate limit (`429`) → 429 `rate_limit_error`.
- Timeouts and connection resets → 503 `overloaded_error`.
- The CLI runs with `--max-model-request-retries 0`; override with `BRIDGE_MODEL_RETRIES`.
- Stream responses also carry a `: ping` keepalive every 12 s.

## Dashboard

With the server running, open **http://127.0.0.1:8787/ui**.

| tab | what it does |
|---|---|
| Overview | transport, port, account, model count, uptime; refresh and stop |
| Accounts | failover switch, pool state, add (browser login), switch, pause, remove |
| Models | the live model list |
| Test | send a short prompt and see status, latency and the answer |
| Logs | last 200 lines of `bridge.log` |

Everything is loopback-only and uses the same `BRIDGE_API_KEY` as the API when one is set.

## Transports

| transport | how it works |
|---|---|
| `direct` (default when `vendor/` exists) | signs and encrypts the request with the embedded Qoder WASM and calls `api1.qoder.sh` over HTTPS. No CLI process. |
| `cli` | spawns `qodercli` per request (fallback, and the only mode when `vendor/` is missing) |

`BRIDGE_TRANSPORT=direct|cli` forces one.

How the direct path works:

1. reads `~/.qoder/.auth/user` (AES; key = first 16 chars of `.auth/machine_id`)
2. derives fresh auth fields with `generate_runtime_auth_fields`
3. builds a `QoderContext` and calls `prepareInferRequest`
4. POSTs the signed, encrypted body and parses the SSE envelopes

`vendor/qoder-auth.cjs` is the wasm-bindgen glue extracted from the official CLI bundle;
`vendor/qoder_auth_wasm_bg.wasm` is the module itself. `probe/` holds the extraction scripts.

When the access token expires, run once with `BRIDGE_TRANSPORT=cli` (or `qodercli login`) so
the CLI refreshes the store, then switch back.

## Configuration

| variable | default | purpose |
|---|---|---|
| `BRIDGE_PORT` | `8787` | listen port |
| `BRIDGE_HOST` | `127.0.0.1` | bind address |
| `BRIDGE_API_KEY` | empty | require `x-api-key` or `Bearer` |
| `BRIDGE_POOL_SIZE` | `2` | warm workers |
| `BRIDGE_SESSION_TTL_MS` | `900000` | idle session lifetime |
| `BRIDGE_SESSION_MAX` | `4` | concurrent sessions kept warm |
| `BRIDGE_MODEL_RETRIES` | `0` | retries inside the CLI |
| `BRIDGE_POOL` | on | `0` disables the pool |
| `BRIDGE_REQUEST_TIMEOUT_MS` | `300000` | per-request cutoff |
| `QODER_MODEL` | `Auto` | fixed model |
| `QODER_THINKING` | from request | `enabled`, `adaptive`, `disabled` |
| `QODER_THINKING_BUDGET` | from request | thinking tokens |
| `QODER_CONTEXT_WINDOW` | from request | context window |
| `QODER_MAX_OUTPUT_TOKENS` | from request | fallback cap used only when the request sends no `max_tokens` |
| `QODER_CLI_BIN` | auto-detected | path to `qodercli.js` |
| `BRIDGE_LOG` | on | `0` silences access log |
| `BRIDGE_DUMP` | empty | file path for the last request |

`max_tokens` from the request is forwarded to the backend as-is. The bridge applies no cap of
its own: the ceiling is whatever the model accepts. That matters for `/compact`, which asks for
a large summary budget, and for long `Write` payloads.

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
reads those events and forwards them. The agent's system prompt is passed to the model
**verbatim** — nothing is appended to it. The tool list travels in its own section of the
turn, so the model keeps Claude Code's rules and still knows which tools exist.

Tool calls are negotiated in text and the bridge accepts either shape the model produces:

```
<tool_calls>[{"name":"Write","input":{"file_path":"a.txt","content":"x"}}]</tool_calls>
[[tool_use Read {"file_path":"a.txt"}]]
```

The block is converted into a real `tool_use` block and Claude Code executes it. The
streaming gate holds the text as soon as either marker appears, so a partial block never
reaches the client as chat.

## Limitations

- One inference call per tool round-trip. Inside a session the worker is reused (~2 s); only the first turn of a conversation pays the cold start (~10 s).
- The first three requests after start pay the cold start.
- Full history is serialized into the prompt on every request, so long conversations are
  expensive and slower.
- Qoder's own built-in tools stay disabled (`--tools ""`); the Claude Code side executes.
- Provider-side policy refusals pass through unchanged.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
