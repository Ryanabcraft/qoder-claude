# Search and images

## Web search, executed by the bridge

Clients that declare Anthropic's server tools (`web_search_20250305`) get real results: the bridge
runs the search itself and streams the standard `server_tool_use` + `web_search_tool_result`
blocks, then answers with the results in context. No API key and no MCP are required.

- **Backend order**: the Exa MCP endpoint (`https://mcp.exa.ai/mcp`, works without a key), then
  DuckDuckGo HTML. `QODER_SEARCH=exa|ddg` pins one.
- Results are cached for five minutes; `allowed_domains` / `blocked_domains` from the tool are
  applied before anything is returned.
- A failed search becomes a `web_search_tool_result_error`, never a broken stream.

OpenCode does not know server tools, so its generated provider sends `search: true`. When the
question depends on current facts (prices, "today", latest versions, news, a URL), the bridge
searches **before** calling the model and injects the results with URLs — models here tend to
narrate tool calls instead of emitting them. A model that does call the declared `web_search`
function gets the results plus a second turn, entirely inside the bridge.

The Exa MCP is still added to Claude Code by the installer when missing; it is optional now, not the
only path. `QODER_NO_EXA=1` skips that setup.

## Web fetch

Anthropic's `web_fetch_20250910` also runs in the bridge: the page is fetched, scripts and styles
are stripped, and the title plus visible text are streamed back (24k chars, 2 MB of bytes, 5
redirects, 20 s timeout).

Private targets are refused before any connection: `file://`, `localhost`, `127/8`, `10/8`,
`172.16/12`, `192.168/16`, `169.254/16`, `::1`, `fc00::/7`, and public hostnames that resolve to a
private address. Without that, a page could ask the model to read the dashboard on `127.0.0.1:8787`
or another machine on your network. To read a local server, use the terminal tool (`curl`) — the
rule only applies to the fetch executed by the bridge.

## Images

Claude Code sends pasted images as base64 blocks. The direct Qoder endpoint drops inline images, so
the bridge uses the bundled Qoder CLI 1.1.80 engine:

```bash
qclaude vision install
qclaude vision
```

- Accepted: PNG, JPEG, GIF and WebP, up to 10 MiB each and 50 per request.
- The image turn runs through the 1.1.80 CLI with `--attachment`, takes around 13 seconds and is not
  streamed.
- Only images from the current turn are attached. Images from earlier turns become text
  placeholders, so a text follow-up stays on the fast direct path.
- The 1.1.80 engine is pinned on purpose: 1.1.85 removed `--attachment`.

When the engine is not installed, the bridge still accepts the request but the image is not read by
the model.
