# Endpoints e arquitetura

## Rotas da API

| método | rota | função |
|---|---|---|
| POST | `/v1/messages` | Anthropic Messages; stream por padrão |
| POST | `/v1/chat/completions` | OpenAI Chat Completions, para qualquer cliente OpenAI; faz stream quando `stream` é true. O system prompt e as tools do cliente passam intactos — é API, não o agente do Claude Code. |
| GET | `/v1/models` | lista de modelos, nos formatos Anthropic e OpenAI |
| POST | `/v1/messages/count_tokens` | estimativa de tokens |
| GET | `/health` | liveness |
| GET | `/ui` | dashboard |

Use `ANTHROPIC_BASE_URL=http://127.0.0.1:8787`. Com `BRIDGE_API_KEY`, mande `x-api-key` ou
`Authorization: Bearer`.

O stream emite `message_start`, `content_block_*`, `message_delta` e `message_stop`. Um comentário
`: ping` sai a cada 12 segundos depois que o stream abre. Tool calls chegam como blocos `tool_use`
reais; a bridge converte o formato de texto do modelo antes do Claude Code.

## API do dashboard

`/ui/api/` expõe status, contas, rotação, modelos, métricas, logs, config, settings do Claude,
health, teste, stop, ordem/label de contas, quota, histórico de quota, recompensas e resgate. A
resposta de config nunca inclui a API key nem o token da Qoder.

## Transporte

1. O Claude Code posta um request Anthropic.
2. A bridge monta o prompt, injeta schemas das deferred tools e estima tokens.
3. `direct` chama `api1.qoder.sh` com assinatura WASM local (`Authorization: COSY.*`, `Cosy-Key`,
   `Cosy-Date`) e `stream_options.include_usage`. Os chunks SSE são lidos e reemitidos; tokens
   reais, cache e créditos substituem as estimativas.
4. `cli` é o fallback: um processo Qoder CLI aquecido recebe o prompt por stdio e emite eventos no
   formato Anthropic. Sessões são reaproveitadas por `session_id` e hash das mensagens; um turno novo
   manda só o delta.
5. Imagens usam o bundle fixo 1.1.80 com `--attachment`.

## Failover e timeouts

As contas são tentadas na ordem, ativa primeiro. Cota, auth, rate limit e timeout esfriam a conta e a
próxima é tentada. `BRIDGE_STALL_MS` aborta uma tentativa sem dados do upstream, então a rotação
acontece antes do corte duro de 300 segundos.

## Estrutura

| arquivo | responsabilidade |
|---|---|
| `src/server.js` | rotas, SSE, tool gate, rotação |
| `src/direct.js` | transporte direto assinado e SSE |
| `src/cli.js` | pool de workers, sessões, transporte CLI |
| `src/prompt.js` | tradução Anthropic para prompt, schemas |
| `src/vision.js` | motor de imagem |
| `src/accounts.js` | perfis, cooldowns, ordem |
| `src/config.js` | config da bridge e precedência de env |
| `src/metrics.js` | ring recente e log de minutos de 7 dias |
| `src/ui/` | dashboard |
