# Search and images

## Web search

Claude Code sends `WebSearch`, `WebFetch` and MCP tools by name only (deferred). The bridge injects
minimal schemas into the request so the model can call them without a `ToolSearch` round trip.

Behind the local gateway the built-in `WebSearch` returns no results, so search is routed through
Exa:

- The installer and `qclaude` add `mcp__exa__web_search_exa` when it is missing.
- `WebSearch` and `mcp__exa__web_search_exa` are allowlisted, so auto mode does not block them with
  a safety classifier.
- `WebFetch` is routed to `mcp__exa__web_fetch_exa`.
- The model is told to attempt the web tool before answering that search is unavailable.

`QODER_NO_EXA=1` skips the MCP setup. The dashboard Settings → Security page can re-apply the Exa
MCP and the allowlist.

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
