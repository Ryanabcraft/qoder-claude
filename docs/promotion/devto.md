# dev.to / Medium long-form

## Front matter

```yaml
---
title: Keeping Claude Code and moving the model call somewhere else
tags: claude, node, api, tooling
---
```

## Body

```markdown
Claude Code is the part of my workflow I would least like to give up. The agent
loop, the file tools, the way a prompt turns into a sequence of edits I can read
before I accept them — none of that is easy to replace.

The part I *would* like to replace is the metering. On the days it bites, the
limit does not arrive as a number on a dashboard; it arrives as a decision not to
start a refactor at 5pm.

At the same time I had a Qoder plan that was mostly idle. Two subscriptions, one
of them barely used, and a client I liked talking to only one of them.

So the question was narrow: can Claude Code keep being Claude Code while the
model calls go somewhere else?

## The shape of the answer

Claude Code is a client of the Anthropic Messages API. It posts to `/v1/messages`
and reads a stream of SSE events: `message_start`, `content_block_delta`,
`message_delta`, `message_stop`. Tool calls arrive as `tool_use` blocks inside
that same stream.

That means the cheapest possible integration is not a fork, not a patch, and not
a reimplementation. It is a local server that answers that contract correctly and
forwards the work upstream. Claude Code points at `127.0.0.1:8787`; the rest of
its life is unchanged.

Getting the event sequence right is the whole game. A stream that is "close
enough" produces a client that hangs, or drops tool calls, or shows an empty
message. There is no partial credit here.

## Three things that cost the most time

**Transport.** Qoder ships a WASM client that carries its own auth and context
extraction. Driving it directly is the shortest path and keeps latency low. When
that path cannot start, the bridge falls back to a CLI subprocess. The auth
extraction lives in one module so that when it changes — and it changes — there
is exactly one place to fix.

**Usage.** A dashboard that shows estimated tokens is theatre. The stream has to
carry real usage: input, output, cache reads, and credits. Upstream fields come in
two dialects (Anthropic-style and OpenAI-style), so they get normalized and merged
with a per-field fallback before anything is written to metrics or shown to the
user.

**Failover.** Accounts are a pool, not a setting. A quota exhaustion, a 403, a 429
or an invalidated session marks that account paused and re-runs the *same*
request on the next one. The server does not restart and the stream does not
break.

Smaller things that turned out to matter: injecting deferred tool schemas before
the model sees the request, a watchdog for streams that stall silently, TTFB
instrumentation, and pooling sessions for repeated prompts.

## What the dashboard is for

Not decoration. I wanted to answer three questions without opening a terminal:
how much of this account is left, how fast am I burning it, and when does it run
out. The local dashboard reads the quota endpoint per account, keeps thirty days
of history, and draws a forecast. It also surfaces the daily 100-credit campaign
so it can be claimed by hand — never automatically, because an automatic claim
across accounts is how you get flagged.

## What this is not

It is not a free tier. You need a Qoder account with a plan, and the traffic is
metered there instead of here.

It is not affiliated with Anthropic or Qoder.

It is not a shared proxy network. Your accounts, your quota, your call on whether
the terms of either vendor allow it. I say that in the README too, because a tool
that hides that detail is a tool that gets someone's work laptop into trouble.

## Where it is

Node 20+, one command to install, MIT:

- https://github.com/Ryanabcraft/qoder-claude
- https://ryanabcraft.github.io/qoder-claude/

If you are building something similar, the interesting files are the transport
(`src/direct.js`), the account pool (`src/accounts.js`) and the streaming path in
`src/server.js`. The dashboard is the part people compliment; the stream is the
part that had to be exactly right.
```

## Notes for the submitter

- Publish this one last — it is the evergreen link you can share for months.
- Set a canonical URL to the repo if the platform allows it.
- The cover image can be `site/public/og.png`.
