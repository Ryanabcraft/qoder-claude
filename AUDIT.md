# Audit — 2026-11-20

Method: six territories, adversarial tests under `test/audit/`. Subagents were disabled by
configuration, so the six territories ran here, one at a time, with a reproduction required
before a finding counted. Baseline was 208 tests; after the audit, 215.

| # | territory | finding | severity | status |
| --- | --- | --- | --- | --- |
| 1 | HTTP contracts | `POST /v1/chat/completions`, `/v1/responses` and `/v1/messages` accepted an empty body and spent an upstream call on it (all answered 200, `/v1/messages` answered 502 from the upstream) | wrong answer, costs credits | fixed, `test/audit/validate.test.js` |
| 2 | HTTP contracts | `errorStatus` detected 402 with a literal `D` instead of a word boundary, so a bare `upstream 402:` fell through to 502 and clients never saw `insufficient_quota` | wrong answer | fixed |
| 3 | HTTP contracts | `/v1/responses` repeated earlier text inside a later message item: `state.text` was never reset when a new text item started after a tool call, so `output_text.done` came out as `primeirasegunda` | wrong answer | fixed, `test/audit/contracts.test.js` |
| 4 | Accounts and quota | a profile with a non-string `dir` in `accounts.json` threw `TypeError [ERR_INVALID_ARG_TYPE]` inside `normalize`, taking down every request until the file was fixed | crash | fixed, `test/audit/accounts.test.js` |
| 5 | Streaming | a `<tool_calls>` block that never closes leaves the gate in `tool` state and swallows the rest of the answer | silent | open — see below |

## Open

- **Unterminated `<tool_calls>`** (`src/server.js` `feed`/`findToolBlock`): if the model emits the
  marker and the stream ends without `</tool_calls>`, everything after it is held and lost. Fixing it
  means deciding what an unterminated block means — treat the held text as prose, or parse the tail as
  a call. That changes behaviour on malformed output, so it stays open with a decision needed rather
  than guessing.

## Checked and clean

- Atomic writes in `accounts.json` and the Claude picker, including `.bak` recovery.
- Rotation cooldowns: expiry, ordering, disabled profiles, rotation off.
- Quota normalization: negative, NaN, over 100%, missing totals, expired dates.
- Compression: skipped when small, skipped on a slow proxy, system prompt and last user message kept.
- `[DONE]` sentinel and empty envelopes in both transports.
- Body size cap (64 MB) and JSON parse errors on all routes.
