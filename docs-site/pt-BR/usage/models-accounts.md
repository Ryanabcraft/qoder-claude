# Modelos e contas

## Modelos

A bridge lê a lista de modelos do CLI do Qoder num cache de dez minutos. A lista muda com o plano; o
dashboard mostra a atual e `qclaude --status` imprime a quantidade.

A lista de fallback que acompanha o app é:

```
Auto, Ultimate, Fast, Efficient, Sonus, Cantus,
Qwen3.8-Max, Qwen3.8-Flash, Kimi-K3.1-Pro, Kimi-K2.8-Preview,
GLM-5.3, GLM-5.3-Flash, DeepSeek-V4-Pro, DeepSeek-Flash, MiniMax-M3.1-Flash
```

Escolha o modelo no Claude Code com `/model`. O instalador rotula cada opção `Qoder · <modelo>` e usa
um modelo Claude conhecido como perfil do cliente, para o picker manter a janela de 1M e os
controles de esforço.

### Contexto e thinking

- O contexto padrão é 1.000.000 de tokens (`QODER_CONTEXT_WINDOW`).
- `CLAUDE_CODE_MAX_CONTEXT_TOKENS=1000000` e `CLAUDE_CODE_DISABLE_1M_CONTEXT=0` mantêm o cliente em 1M.
- Esforço e thinking do request são repassados sem mudança: `output_config.effort`, `thinking.type`
  e `thinking.budget_tokens`.
- A bridge não aplica teto próprio de `max_tokens`.

## Contas

Cada conta tem seu próprio diretório de config do Qoder. A cota é por conta.

A bridge lê a cota real de cada conta na Qoder (`GET /api/v2/quota/usage`), guarda por 60 segundos e
consulta a cada cinco minutos. O dashboard mostra créditos usados, restantes, plano, consumo e a
data prevista de esgotamento. `qclaude quota` imprime os mesmos dados e `qclaude quota --json` é
legível por máquina. A cota é só visual: nunca muda a ordem do failover.

```bash
qclaude account list
qclaude account add trabalho   # login no navegador, cria o perfil
qclaude account use trabalho   # ativa a partir de agora
qclaude account pause trabalho
qclaude account resume trabalho
qclaude account remove trabalho
qclaude account current
```

A página Accounts do dashboard faz o mesmo, incluindo a URL do login de dispositivo.

### Failover

Com mais de uma conta, a bridge rotaciona sozinha:

| falha | cooldown |
|---|---|
| billing, cota diária, 403 | 30 minutos |
| unauthorized, 401, login expirado | 10 minutos |
| rate limit, 429 | 1 minuto |
| timeout, reset de conexão, stall | 30 segundos |

A conta ativa é tentada primeiro, depois as outras na ordem do arquivo. Contas em cooldown vão para o
fim. `qclaude rotation on|off` ou o switch do dashboard liga e desliga.

`BRIDGE_MAX_ATTEMPTS` (padrão: todas) para depois de N tentativas. A página Routing do dashboard
edita o mesmo valor e mostra a ordem atual.

Um request que já produziu texto visível nunca rotaciona: o cliente não consegue reescrever um
stream.
