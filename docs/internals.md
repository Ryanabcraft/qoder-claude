# Internals

Everything below the surface: transports, sessions, configuration, accounts in detail and the
wire format. The [README](../README.md) covers install and daily use.

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

## How it works

The Qoder inference endpoint encrypts and signs each request body (`Authorization: COSY.*`,
`Cosy-Key`, `Cosy-Date`) inside a native WASM module, so replaying it is not practical.

The official CLI already emits Anthropic-shaped events with
`--output-format stream-json --include-partial-messages`. The bridge builds the prompt, reads
those events and forwards them. The agent's system prompt is passed through with two deliberate
edits: the `x-anthropic-billing-header` line is dropped, and when the superpowers `SessionStart`
block is present a short override is appended so the model answers instead of only announcing a
skill. The tool list travels in its own section of the turn, so the model keeps Claude Code's
rules and still knows which tools exist.

Tool calls are negotiated in text and the bridge accepts either shape the model produces:

```
<tool_calls>[{"name":"Write","input":{"file_path":"a.txt","content":"x"}}]</tool_calls>
[[tool_use Read {"file_path":"a.txt"}]]
```

The block becomes a real `tool_use` block and Claude Code executes it. The streaming gate holds
text as soon as either marker appears, so a partial block never reaches the client as chat.

Tools that arrive *deferred* (`WebSearch`, `WebFetch`, MCP servers) get a minimal schema in the
turn — in the CLI prompt and in the direct payload's `tools` array — so the model can call them
without a `ToolSearch` round trip. Search and fetch are routed to `mcp__exa__web_search_exa` /
`mcp__exa__web_fetch_exa` when that MCP is configured.

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

Tunables: `BRIDGE_SESSION_TTL_MS` (default `900000`) and `BRIDGE_SESSION_MAX` (default `4`). If
the agent rewrites its history without changing the `session_id`, the prefix check fails and the
bridge falls back to a fresh worker with the full history — never a delta over unknown state.

## Accounts in detail

An account is an isolated Qoder profile, each with its own `--config-dir`. `default` is the
global `~/.qoder` config.

| What | Where |
|---|---|
| active account name | `accounts.json` |
| each extra account | `accounts/<name>/` |
| the default account | `~/.qoder` |

`accounts/` and `accounts.json` are in `.gitignore` — credentials never reach the repo.

Automatic failover order: the active account first, then the rest in file order. Paused
accounts go to the end of the queue and come back when the timer expires; a successful reply
clears the pause.

| what happened | pause |
|---|---|
| billing / daily count / quota / `403` | 30 minutes |
| `401`, not logged in, expired token | 10 minutes |
| `429` rate limit | 1 minute |
| timeout, connection reset | 30 seconds |

Two limits: rotation only happens **before the first visible token** (a started stream cannot be
rewritten on another account), and it is **per request** (a Claude Code worker stays bound to one
account; the next turn starts a new worker).

Good to know:

- quota is per account; the model is not part of the account
- restart the open session after `account add` / `use`
- a logged-out account fails in about 3 s with `Not logged in · Please run /login`

## Models, effort and context

`Auto, Ultimate, Fast, Efficient, Sonus, Cantus, Qwen3.8-Max, Qwen3.8-Flash, Kimi-K3.1-Pro,
Kimi-K2.8-Preview, GLM-5.3, GLM-5.3-Flash, DeepSeek-V4-Pro, DeepSeek-Flash,
MiniMax-M3.1-Flash`

Set `QODER_MODEL_MAP=1` to map Claude families: `opus` → Ultimate, `sonnet` → Auto, `haiku` →
Fast. Controls are forwarded verbatim:

| Claude Code sends | bridge passes to `qodercli` |
|---|---|
| `output_config.effort` | `--reasoning-effort <low\|medium\|high\|xhigh\|max>` |
| `thinking.type` | `--thinking <auto\|adaptive\|enabled\|disabled>` |
| `thinking.budget_tokens` | `--thinking-budget <n>` |

The installer writes a `modelPicker` block into `~/.claude/settings.json`, so `/model` lists the
Qoder lineup directly:

```json
"modelPicker": {
  "replaceBuiltInOptions": true,
  "options": [
    {
      "model": "Auto",
      "label": "Qoder · Auto",
      "description": "Auto via Qoder CLI",
      "behavesAs": "claude-opus-4-8"
    }
  ]
}
```

`modelPicker` requires Claude Code v2.1.243+ and only takes effect in user settings,
`--settings`, or managed settings — project settings ignore it.

A Qoder model ID is unknown to Claude Code, which then assumes 200K and compacts early. The
installer fixes that with `"behavesAs": "claude-opus-4-8"` on every row, plus
`CLAUDE_CODE_MAX_CONTEXT_TOKENS=1000000` and `CLAUDE_CODE_DISABLE_1M_CONTEXT=0` as fallback. On
the Qoder side every request carries `context_window: 1000000`; override with
`QODER_CONTEXT_WINDOW` or per request with `context_window`.

## Errors and retries

- Qoder refusal (daily quota, `403`, `not logged in`) → **400 `invalid_request_error`** with the
  real message. Claude Code does not retry a 400, so the "retry in 4m 10s" banner disappears.
- Before returning that error, the bridge tries the next account in the pool.
- Rate limit (`429`) → 429 `rate_limit_error`.
- Timeouts and connection resets → 503 `overloaded_error`.
- If the upstream sends no data for `BRIDGE_STALL_MS` (default 90 s), the attempt is aborted and
  treated as a timeout, so rotation happens immediately instead of waiting the full cutoff.
- The CLI runs with `--max-model-request-retries 0`; override with `BRIDGE_MODEL_RETRIES`.
- Stream responses carry a `: ping` keepalive every 12 s.
- Every completed request logs `transport`, `ttft` (time to first token) and `total`.

## Configuration

| variable | default | purpose |
|---|---|---|
| `BRIDGE_PORT` | `8787` | listen port |
| `BRIDGE_HOST` | `127.0.0.1` | bind address |
| `BRIDGE_API_KEY` | empty | require `x-api-key` or `Bearer` |
| `BRIDGE_POOL_SIZE` | `2` | max pooled CLI workers, one kept warm |
| `BRIDGE_SESSION_TTL_MS` | `900000` | idle session lifetime |
| `BRIDGE_SESSION_MAX` | `4` | concurrent sessions kept warm |
| `BRIDGE_MODEL_RETRIES` | `0` | retries inside the CLI |
| `BRIDGE_POOL` | on | `0` disables the pool |
| `BRIDGE_REQUEST_TIMEOUT_MS` | `300000` | per-request cutoff |
| `BRIDGE_STALL_MS` | `90000` | abort an attempt after this much upstream silence |
| `QODER_MODELS_TTL_MS` | `600000` | model list cache lifetime |
| `BRIDGE_MODELS_REFRESH` | on | `0` disables the background model-list refresh |
| `QODER_MODEL` | `Auto` | fixed model |
| `QODER_THINKING` | from request | `enabled`, `adaptive`, `disabled` |
| `QODER_THINKING_BUDGET` | from request | thinking tokens |
| `QODER_CONTEXT_WINDOW` | from request | context window |
| `QODER_MAX_OUTPUT_TOKENS` | from request | fallback cap used only when the request sends no `max_tokens` |
| `QODER_CLI_BIN` | auto-detected | path to `qodercli.js` |
| `BRIDGE_IMAGE_MAX_BYTES` | `10485760` | decoded size cap per image |
| `BRIDGE_IMAGE_MAX_COUNT` | `50` | images kept per request |
| `QODER_VISION_CLI` | bundled 1.1.80 | path to an image-capable CLI |
| `QODER_VISION_VERSION` | `1.1.80` | version fetched by `qclaude vision install` |
| `BRIDGE_LOG` | on | `0` silences access log |
| `BRIDGE_DUMP` | empty | file path for the last request |

`max_tokens` is forwarded as-is; the bridge applies no cap of its own.

## Endpoints

| method | route | purpose |
|---|---|---|
| GET | `/health` | liveness |
| GET | `/v1/models` | model list |
| POST | `/v1/messages` | Anthropic Messages |
| POST | `/v1/messages/count_tokens` | token estimate |

## Dashboard auth

With `BRIDGE_API_KEY` set, `qclaude` opens `/ui#key=…` (fragment, never sent to the server). The
page stores it in `sessionStorage` and strips it from the URL with `history.replaceState`. API
calls send `x-api-key`; a 401 asks for the key once. Request logs redact any parameter whose name
matches `key`, `token`, `secret`, `password` or `auth`.

## Manual setup

Without the installer, after `qodercli login` and `node src/server.js`, add to
`~/.claude/settings.json`:

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
    "command": "node \"C:\\\\path\\\\to\\\\qoder-claude\\\\scripts\\\\statusline.js\""
  }
}
```

`CLAUDE_CODE_AUTO_MODE_SERVER=0` stops Claude Code from asking for server-side auto-mode checks.
A local gateway cannot forward the `safeguards` field, so without it Claude Code shows the
"auto mode classifier requests" notice on every session.
