# r/ClaudeAI

## Title

```
I kept Claude Code and moved the model calls to my Qoder plan — one command, local bridge
```

## Body

```
Context: I use Claude Code every day and the usage limit is what actually decides
when I stop working. I also had a Qoder plan that was mostly idle. I did not want
to switch editors, relearn prompts, or lose my MCP servers — I wanted the same
Claude Code with a different model bill.

So I built qoder-claude: a small local server that speaks the Anthropic Messages
API and forwards the model traffic to Qoder. Claude Code points at
127.0.0.1:8787 and nothing else changes. Tools, slash commands, the agent loop,
MCP servers, the statusline — all still Claude Code.

What actually works (tested, not aspirational):

- Read / Write / Edit / Glob / Grep / Bash / Agent, executed by Claude Code itself
- MCP servers, unchanged
- /model, the effort slider, thinking budget, 1M context on the models that have it
- WebSearch and WebFetch — the installer adds Exa, because the search tool is
  server-side on Anthropic and does not survive the switch
- multi-account failover: when an account hits a quota, a 403, a 429 or a lost
  session, it pauses that account and retries the same request on the next one
- a local dashboard with real credits per account, burn rate and a forecast of
  when the quota runs out

Things I want to be clear about before anyone installs it:

- You need a Qoder account with a plan. This is not a free tier and it does not
  create quota out of nothing.
- It is not affiliated with Anthropic or Qoder.
- Whether this fits your terms of service is your call, same as any third-party
  provider behind Claude Code. I am not going to pretend otherwise.
- It is young. One maintainer. Bugs exist, and I fix the ones I can reproduce.

Install is one command, it is MIT, Node 20+, and it runs on Windows, macOS and Linux:

https://github.com/Ryanabcraft/qoder-claude

Happy to answer anything about the internals — the interesting part is the
transport, not the UI.
```

## Follow-ups to have ready

- **"Why not just use Qwen/Cursor/whatever?"** — Because the point was keeping the Claude Code workflow, not changing the model provider per se. The bridge is provider-agnostic in principle; Qoder is the one I have a plan on.
- **"Is my account going to get banned?"** — I cannot promise any provider's behaviour. It uses your own account through a local endpoint. If that is a risk you are not comfortable with, do not point a work machine at it.
- **"Does 1M context actually work?"** — On the models that list it in Qoder, yes; the installer sets the context window and the dashboard shows what the current route supports. On the others it falls back to the model's own limit.
- **"Windows?"** — Yes, native, plus PowerShell and cmd installers. It is the platform I develop on.

## Notes for the submitter

- Check the subreddit rules for self-promotion; most allow it if you are active in the comments.
- Answer every reply for the first two hours.
- Do not cross-post the identical text to r/LocalLLaMA — use `reddit-localllama.md`, which is written for that audience.
