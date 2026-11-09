# r/LocalLLaMA

## Title

```
A local Anthropic-compatible bridge: Claude Code in front, Qoder behind, failover across accounts
```

## Body

```
Not a model release — architecture, in case it is useful to someone building the
same thing.

The setup: Claude Code speaks the Anthropic Messages API. I wanted it to talk to
Qoder's models without changing the client. So there is a Node server on
127.0.0.1:8787 implementing POST /v1/messages, streaming SSE with the same event
sequence Anthropic emits (message_start, content_block_delta, message_delta,
message_stop), plus the tool_use block shapes. Claude Code cannot tell the
difference, which is the whole trick.

Three details that cost me the most time:

1. Transport. Qoder accepts calls through a bundled WASM client that carries its
   own auth and context extraction. I drive that directly for latency, and keep a
   CLI subprocess as a fallback when the WASM path cannot start. The auth
   extraction is isolated in one module so it is one place to fix when it changes.

2. Usage. The streaming response has to report real tokens and credits, not
   estimates, or the dashboard is theatre. Usage arrives in the upstream stream
   and gets normalized (Anthropic fields, OpenAI-style fields, cache hits) and
   merged with a per-field fallback before it reaches the client and the metrics
   file.

3. Failover. Accounts are a pool. A quota exhaustion, 403, 429 or invalidated
   session marks that account paused and re-runs the same request on the next
   one, without restarting the server or losing the stream.

Also in there: deferred tool schema injection (tools Claude Code sends lazily
have to be present before the model sees them), a stall watchdog, TTFB
instrumentation, and session pooling for repeated prompts.

The dashboard is plain HTML/CSS/JS served by the same process: real credits per
account from the quota endpoint, burn rate, forecast of the empty date, and the
daily 100-credit campaign with manual claim.

Constraints worth repeating: you need your own Qoder plan, this is not
affiliated with either vendor, and it is a bridge for your own accounts.

Code, MIT, Node 20+:
https://github.com/Ryanabcraft/qoder-claude

Questions about the transport or the failover logic are the ones I would most
like to answer.
```

## Notes for the submitter

- This audience will read the code before the README. Make sure the transport and failover modules are easy to find (`src/direct.js`, `src/accounts.js`, `src/server.js`).
- Expect at least one "just use an OpenAI-compatible proxy" reply. The honest answer: they do not speak Anthropic's tool_use stream, so Claude Code's agent loop breaks.
- Do not claim benchmarks you did not run.
