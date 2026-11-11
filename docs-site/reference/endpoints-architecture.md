# Endpoints and architecture

## API routes

| method | route | purpose |
|---|---|---|
| POST | `/v1/messages` | Anthropic Messages API; streams by default |
| POST | `/v1/chat/completions` | OpenAI Chat Completions, for any OpenAI client; streams when `stream` is true. The client's own system prompt and tools are passed through unchanged — this is an API, not the Claude Code agent. |
| GET | `/v1/models` | model list, in both the Anthropic and the OpenAI shape |
| POST | `/v1/messages/count_tokens` | token estimate |
| GET | `/health` | liveness |
| GET | `/ui` | dashboard |

Set `ANTHROPIC_BASE_URL` to `http://127.0.0.1:8787`. When `BRIDGE_API_KEY` is set, send it as
`x-api-key` or `Authorization: Bearer`.

Streaming emits `message_start`, `content_block_*`, `message_delta` and `message_stop`. A `: ping`
comment goes out every 12 seconds after the stream opens. Tool calls arrive as real `tool_use`
blocks; the bridge converts the model text shape before it reaches Claude Code.

## Dashboard API

`/ui/api/` exposes status, accounts, rotation, models, metrics, logs, config, Claude settings,
health, test, stop, account order/label, quota and quota history. The config response never
includes the API key or the Qoder token.

## Transport

1. Claude Code posts an Anthropic request.
2. The bridge builds the prompt, injects schemas for deferred tools and estimates tokens.
3. `direct` sends the payload to `api1.qoder.sh` with a local WASM signature (`Authorization:
   COSY.*`, `Cosy-Key`, `Cosy-Date`) and `stream_options.include_usage`. SSE chunks are parsed and
   re-emitted; real `prompt_tokens`/`completion_tokens`, cache and credits replace the estimates.
4. `cli` is the fallback: a warmed Qoder CLI process receives the prompt over stdio and emits
   Anthropic-shaped events. Sessions are reused by `session_id` plus message hashes; a new turn
   sends only the delta.
5. Images use the pinned 1.1.80 bundle with `--attachment`.

## Failover and timeouts

Accounts are tried in order, active first. Quota, auth, rate-limit and timeout errors cool the
account down and the next one is tried. `BRIDGE_STALL_MS` aborts an attempt with no upstream data,
so rotation happens before the 300-second hard cutoff.

## Code layout

| file | responsibility |
|---|---|
| `src/server.js` | routes, SSE, tool gate, rotation |
| `src/direct.js` | signed direct transport and SSE parsing |
| `src/cli.js` | worker pool, sessions, CLI transport |
| `src/prompt.js` | Anthropic to prompt translation, deferred schemas |
| `src/vision.js` | image engine |
| `src/accounts.js` | profiles, cooldowns, order |
| `src/config.js` | bridge config and environment precedence |
| `src/metrics.js` | recent ring and seven-day minute log |
| `src/ui/` | dashboard |
