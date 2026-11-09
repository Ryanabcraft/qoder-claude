# X / Twitter thread

Five posts. Attach the dashboard screenshot to post 4. Link only in post 5, so the thread is not throttled.

## 1

```
Claude Code is the best coding tool I've used, and the usage limit is what decides
when I stop working. Meanwhile my Qoder plan sat idle.

So I built a bridge: same Claude Code, same tools, different model bill.
```

## 2

```
How it works: a local server on 127.0.0.1:8787 that speaks the Anthropic Messages
API and streams replies back in Anthropic's exact event format.

Claude Code points at it and cannot tell the difference. Tools, MCP servers, slash
commands — unchanged.
```

## 3

```
The part I use most: failover across accounts.

Quota error, 403, 429 or a dead session — that account pauses, and the same
request retries on the next one. No restart, no lost stream, no manual switch.
```

## 4

```
The dashboard is local and reads real numbers: credits per account, burn rate, and
a forecast of when the quota runs out. Plus the daily 100-credit campaign, claimed
by hand.
```

## 5

```
One command to install. Needs a Qoder plan of your own — this is not free quota,
and it is not affiliated with Anthropic or Qoder.

MIT, Node 20+, Windows/macOS/Linux:
https://github.com/Ryanabcraft/qoder-claude
```

## Notes for the submitter

- Post 1 with the image of the *site* card if you want, but the dashboard screenshot belongs in post 4.
- Pin the thread to your profile.
- Do not tag Qoder or Anthropic asking for a retweet. If they notice it, let them notice it.
