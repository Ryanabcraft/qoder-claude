# Configuração

O dashboard escreve `bridge.config.json` ao lado do `package.json`. O arquivo é gitignored e
preservado pelo updater; as escritas são atômicas e guardam um `.bak`.

Variáveis de ambiente existentes vencem o arquivo. Valores definidos pelo launcher (como
`BRIDGE_PORT`) também contam como override.

## bridge.config.json

| chave | padrão | observação |
|---|---|---|
| `port` | `8787` | restart |
| `host` | `127.0.0.1` | restart |
| `apiKey` | vazio | restart; nunca retornada pela API |
| `transport` | `auto` | `auto`, `direct` ou `cli`; restart |
| `pool` | `true` | pool do CLI; restart |
| `poolSize` | `2` | restart |
| `requestTimeoutMs` | `300000` | live |
| `stallMs` | `90000` | live; aborta upstream mudo |
| `contextWindow` | `1000000` | live |
| `thinking` | vazio | `auto`, `adaptive`, `enabled`, `disabled` |
| `thinkingBudget` | `0` | live |
| `effort` | vazio | `low`, `medium`, `high`, `xhigh` |
| `maxOutputTokens` | `0` | live; sem teto quando zero |
| `modelRetries` | `0` | retries dentro do CLI |
| `maxAttempts` | `0` | `0` tenta todas as contas |
| `quota` | `true` | lê a cota real da Qoder por conta |
| `quotaPollMs` | `300000` | intervalo da consulta de cota (60s–1h) |
| `rewardAutoClaim` | `false` | resgata a campanha diária de 100 créditos sozinho |
| `log` | `true` | access log; restart |

## Variáveis de ambiente

| variável | padrão | função |
|---|---|---|
| `BRIDGE_PORT` | `8787` | porta |
| `BRIDGE_HOST` | `127.0.0.1` | endereço |
| `BRIDGE_API_KEY` | vazio | exige `x-api-key` ou `Bearer` |
| `BRIDGE_TRANSPORT` | auto | força `direct` ou `cli` |
| `BRIDGE_POOL` | on | `0` desliga o pool |
| `BRIDGE_POOL_SIZE` | `2` | workers no pool |
| `BRIDGE_REQUEST_TIMEOUT_MS` | `300000` | corte do request |
| `BRIDGE_STALL_MS` | `90000` | watchdog de silêncio |
| `BRIDGE_MAX_ATTEMPTS` | todas | limite de failover |
| `BRIDGE_MODEL_RETRIES` | `0` | retries do CLI |
| `BRIDGE_QUOTA` | on | `0` desliga a consulta de cota |
| `BRIDGE_QUOTA_POLL_MS` | `300000` | intervalo da consulta |
| `QODER_QUOTA_ENDPOINT` | `https://openapi.qoder.sh` | host da cota |
| `QODER_REWARD_ENDPOINT` | igual à cota | host das recompensas |
| `QODER_QUOTA_TOKEN` | da conta | token bearer explícito (teste/CI) |
| `BRIDGE_REWARD_AUTO` | off | `1` ativa o resgate automático |
| `QODER_CONTEXT_WINDOW` | `1000000` | contexto |
| `QODER_THINKING` | do request | modo de thinking |
| `QODER_THINKING_BUDGET` | do request | tokens de thinking |
| `QODER_REASONING_EFFORT` | do request | effort |
| `QODER_MAX_OUTPUT_TOKENS` | do request | fallback de saída |
| `QODER_MODEL` | `Auto` | modelo fixo |
| `QODER_CLI_BIN` | auto | caminho do `qodercli.js` |
| `QODER_CLI_VERSION` | detectada | versão do cliente no request |
| `QODER_VISION_CLI` | 1.1.80 embutido | motor de imagem |
| `BRIDGE_LOG` | on | `0` silencia o access log |
| `BRIDGE_DUMP` | vazio | grava o último request |
| `BRIDGE_IMAGE_MAX_BYTES` | `10485760` | tamanho por imagem |
| `BRIDGE_IMAGE_MAX_COUNT` | `50` | imagens por request |

A aba AI grava `~/.claude/settings.json` (modelo e 1M) com backup. O botão de web tools reaplica Exa
e allowlist como o instalador.

Detalhes de implementação continuam em `docs/internals.md`.
