# Models and accounts

## Models

The bridge reads the model list from the Qoder CLI on a ten-minute cache. The list changes with the
Qoder plan; the dashboard shows the current one, and `qclaude --status` prints the count.

The shipped fallback list is:

```
Auto, Ultimate, Fast, Efficient, Sonus, Cantus,
Qwen3.8-Max, Qwen3.8-Flash, Kimi-K3.1-Pro, Kimi-K2.8-Preview,
GLM-5.3, GLM-5.3-Flash, DeepSeek-V4-Pro, DeepSeek-Flash, MiniMax-M3.1-Flash
```

Choose a model inside Claude Code with `/model`. The installer labels every option
`Qoder · <model>` and uses a known Claude model as the client-side profile so the picker keeps the
1M window and the effort controls.

### Context and thinking

- The default context window is 1,000,000 tokens (`QODER_CONTEXT_WINDOW`).
- `CLAUDE_CODE_MAX_CONTEXT_TOKENS=1000000` and `CLAUDE_CODE_DISABLE_1M_CONTEXT=0` keep the client at
  1M.
- Effort and thinking values from the request are forwarded unchanged:
  `output_config.effort`, `thinking.type` and `thinking.budget_tokens`.
- The bridge applies no `max_tokens` cap of its own.

## Accounts

Each account has its own Qoder config directory. Quota is per account.

The bridge reads each account's real quota from Qoder (`GET /api/v2/quota/usage`), caches it for
60 seconds and polls every five minutes. The dashboard shows credits used, remaining, plan, burn
rate and the projected empty date. `qclaude quota` prints the same data, and `qclaude quota --json`
is machine-readable. Quota is display-only: it never changes failover order.

Qoder's daily campaign gives 100 credits per account, once per window (10:00–09:59 Singapore time),
valid for 30 days. `qclaude rewards` lists it per account and `qclaude rewards --claim` redeems it.
The dashboard shows a Claim button and a Settings toggle for auto-claim, which is **off by default**.
Claims are device-scoped, so one account per machine is usually eligible.

```bash
qclaude account list
qclaude account add work       # browser login, creates a profile
qclaude account use work       # active from now on
qclaude account pause work
qclaude account resume work
qclaude account remove work
qclaude account current
```

The dashboard Accounts page does the same, including the device login URL.

### Failover

With more than one account, the bridge rotates automatically:

| failure | cooldown |
|---|---|
| billing, daily quota, 403 | 30 minutes |
| unauthorized, 401, expired login | 10 minutes |
| rate limit, 429 | 1 minute |
| timeout, connection reset, stall | 30 seconds |

The active account is tried first, then the others in file order. Cooling accounts go to the end of
the list. `qclaude rotation on|off` or the Accounts switch enables and disables this behavior.

`BRIDGE_MAX_ATTEMPTS` (default: all accounts) stops after N attempts. The dashboard Routing page
edits the same value and shows the current order.

A request that already produced visible text never rotates: the client cannot rewrite a stream.
