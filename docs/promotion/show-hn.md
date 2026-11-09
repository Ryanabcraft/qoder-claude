# Show HN

## Title

```
Show HN: Run Claude Code on Qoder models with a local API bridge
```

## Body

```
I hit the Claude Code usage limit often enough that it started shaping how I
work: batching a refactor I would otherwise do in three steps, stopping mid-file.
Meanwhile a Qoder plan sat mostly unused.

qoder-claude is a local server that speaks the Anthropic Messages API and
forwards the model traffic to Qoder. Claude Code keeps its own interface, tools,
prompts and shortcuts; it just points at 127.0.0.1:8787 instead of the Anthropic
endpoint. Install is one command, it writes the Claude user settings and gives
you a `qclaude` launcher.

What it does beyond forwarding:

  - direct WASM transport to Qoder, with the Qoder CLI as a fallback path
  - multi-account failover: a quota error, 403, 429 or a lost session pauses
    that account and the same request retries on the next one
  - 1M context on the models that offer it
  - Exa web search, because WebSearch is a server-side Anthropic tool and does
    not survive the switch
  - a local dashboard with real per-account credits, burn rate and a forecast

Limitations, up front: you need a Qoder plan of your own. It is not affiliated
with Anthropic or Qoder. It is a bridge for your own accounts, not a shared
proxy.

Node 20+. Windows, macOS and Linux. MIT.

https://github.com/Ryanabcraft/qoder-claude
```

## Author's first comment

Post this as a comment immediately after submitting, not in the body:

```
Two things I expect to be asked.

Why not just use the Qoder CLI? Because the tools are the point. Read/Edit/Bash,
the agent loop, MCP servers and the slash commands are what I wanted to keep.
The bridge only replaces the model call.

Does this break anything on Anthropic's side? Claude Code is talking to a
different API endpoint, the same way it would to a proxy or a gateway. I am not
shipping credentials or accounts. What I cannot promise is that any provider
likes it forever, so read the terms of both before you switch a work machine.

Honest state of the project: small, young, one maintainer, and the dashboard is
where most of the polish went. Issues with a reproduction get answered.
```

## Notes for the submitter

- Submit on a weekday, 07:00–09:00 US Eastern.
- Do not ask anyone for upvotes. HN detects voting rings and kills the post.
- Do not edit the title after submitting.
- If it does not get traction, the account can submit again later — but not the same URL in the same week.
