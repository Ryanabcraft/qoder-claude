# Configuration

The dashboard writes `bridge.config.json` next to `package.json`. The file is gitignored and
preserved by the updater; writes are atomic and keep a `.bak`.

Existing environment variables win over the file. Values set by the launcher (such as
`BRIDGE_PORT`) also count as overrides.

## bridge.config.json

| key | default | notes |
|---|---|---|
| `port` | `8787` | restart |
| `host` | `127.0.0.1` | restart |
| `apiKey` | empty | restart; never returned by the API |
| `transport` | `auto` | `auto`, `direct` or `cli`; restart |
| `pool` | `true` | CLI worker pool; restart |
| `poolSize` | `2` | restart |
| `requestTimeoutMs` | `300000` | live |
| `stallMs` | `90000` | live; aborts a silent upstream |
| `contextWindow` | `1000000` | live |
| `thinking` | empty | `auto`, `adaptive`, `enabled`, `disabled` |
| `thinkingBudget` | `0` | live |
| `effort` | empty | `low`, `medium`, `high`, `xhigh` |
| `maxOutputTokens` | `0` | live; no cap when zero |
| `modelRetries` | `0` | retries inside the CLI |
| `maxAttempts` | `0` | `0` tries every account |
| `log` | `true` | access log; restart |
| `quota` | `true` | read real Qoder quota per account |
| `quotaPollMs` | `300000` | quota poll interval (60s–1h) |
| `rewardAutoClaim` | `false` | redeem the daily 100-credit campaign automatically |

## Environment variables

| variable | default | purpose |
|---|---|---|
| `BRIDGE_PORT` | `8787` | listen port |
| `BRIDGE_HOST` | `127.0.0.1` | bind address |
| `BRIDGE_API_KEY` | empty | require `x-api-key` or `Bearer` |
| `BRIDGE_TRANSPORT` | auto | force `direct` or `cli` |
| `BRIDGE_POOL` | on | `0` disables the pool |
| `BRIDGE_POOL_SIZE` | `2` | max pooled workers |
| `BRIDGE_REQUEST_TIMEOUT_MS` | `300000` | hard request cutoff |
| `BRIDGE_STALL_MS` | `90000` | silence watchdog |
| `BRIDGE_MAX_ATTEMPTS` | all | failover attempt limit |
| `BRIDGE_MODEL_RETRIES` | `0` | CLI retries |
| `BRIDGE_QUOTA` | on | `0` disables quota polling |
| `BRIDGE_QUOTA_POLL_MS` | `300000` | quota poll interval |
| `QODER_QUOTA_ENDPOINT` | `https://openapi.qoder.sh` | quota host override |
| `QODER_REWARD_ENDPOINT` | same as quota | reward host override |
| `QODER_QUOTA_TOKEN` | from account | explicit bearer token (testing/CI) |
| `BRIDGE_REWARD_AUTO` | off | `1` enables automatic daily reward claims |
| `QODER_CONTEXT_WINDOW` | `1000000` | context window |
| `QODER_THINKING` | from request | thinking mode |
| `QODER_THINKING_BUDGET` | from request | thinking tokens |
| `QODER_REASONING_EFFORT` | from request | effort |
| `QODER_MAX_OUTPUT_TOKENS` | from request | output fallback |
| `QODER_MODEL` | `Auto` | fixed model |
| `QODER_CLI_BIN` | auto | path to `qodercli.js` |
| `QODER_CLI_VERSION` | detected | client version sent to Qoder |
| `QODER_VISION_CLI` | bundled 1.1.80 | image engine path |
| `BRIDGE_LOG` | on | `0` silences the access log |
| `BRIDGE_DUMP` | empty | dump the last request body |
| `BRIDGE_IMAGE_MAX_BYTES` | `10485760` | per-image cap |
| `BRIDGE_IMAGE_MAX_COUNT` | `50` | images per request |

The Claude settings tab writes `~/.claude/settings.json` (model and 1M context) with a timestamped
backup. The web-tools action reuses the same Exa and allowlist setup as the installer.

Deep implementation notes remain in `docs/internals.md`.
