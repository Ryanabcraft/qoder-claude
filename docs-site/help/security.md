# Security and privacy

## What stays local

- Qoder credentials live in the Qoder config directory and in each account directory under the
  install. The bridge reads them locally to sign requests.
- Requests go only to the Qoder endpoint (`api1.qoder.sh`), the quota endpoint
  (`openapi.qoder.sh`) or the local Qoder CLI. Nothing is forwarded to another host.
- The account token is sent only as an Authorization header to Qoder; the dashboard never receives
  it and the logs never contain it. Reward claims are explicit (a button or `--claim`); auto-claim
  is off unless you enable it.
- `bridge.config.json`, `metrics.jsonl` and `quota.jsonl` are local files and gitignored.
- Claude Code, the Qoder CLI and the account files are never uploaded by the bridge.

## API key

When `BRIDGE_API_KEY` or the config key is set:

- the launcher opens `/ui#key=...`; the fragment is never sent to the server;
- the page stores it in `sessionStorage` and removes it from the address bar;
- API calls send `x-api-key`;
- the config endpoint returns whether a key is set, never the key itself.

The key is stored in plain text in the local config file, like the rest of the bridge config.
Protect the install directory with the normal user account permissions.

## Logs

The access log redacts any query parameter whose name matches `key`, `token`, `secret`, `password`
or `auth`. Model names, account names, paths, status and timings remain.

`BRIDGE_DUMP` writes the full last request body to a file when set; it may contain prompts. Use it
only while debugging and delete the file afterwards.

## Metrics

`metrics.jsonl` stores model and account names, status, latency, TTFB, token estimates and error
counts. It does **not** store prompt or response text. It keeps seven days.

## Third parties

- Exa: search and fetch queries are sent to the Exa MCP endpoint. `QODER_NO_EXA=1` skips the setup.
- Other MCP servers configured in Claude Code are between you and those servers.
- The dashboard is local; do not expose port 8787 to the internet without putting authentication
  and TLS in front of it.
