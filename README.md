# qoder-bridge

Servidor local que fala **Anthropic Messages API** e usa o **Qoder CLI** como backend.
O Claude Code aponta para ele e passa a rodar nos modelos do plano Qoder.

```
Claude Code  --/v1/messages-->  qoder-bridge  --stdin/stream-json-->  qodercli  --> api1.qoder.sh
```

## Por que assim

O endpoint de inferência do Qoder (`POST /algo/api/v2/service/pro/sse/agent_chat_generation`) tem o
corpo cifrado por um WASM nativo e assinado por request (`Authorization: COSY.<payload>.<sig>`,
`Cosy-Key`, `Cosy-Date`). Replicar esse HTTP exige o binário do Qoder.

O CLI oficial, por outro lado, expõe `--output-format stream-json --include-partial-messages`,
que emite eventos **no mesmo formato Anthropic** (`message_start`, `content_block_delta`,
`content_block_stop`). O bridge só precisa: montar o prompt, ler esses eventos e traduzir
tool calls. Nenhum token é tocado, nenhum header assinado.

## Requisitos

- Node 20+
- `@qoder-ai/qodercli` instalado e logado:

```powershell
npm install -g @qoder-ai/qodercli
qodercli login
qodercli --list-models
```

## Rodar

```powershell
.\start.cmd
# ou
node src\server.js
```

Escuta em `http://127.0.0.1:8787`.

## Ligar o Claude Code

Dentro do projeto, crie `.claude/settings.json` (ou rode `.\enable-here.cmd`):

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "http://127.0.0.1:8787",
    "ANTHROPIC_AUTH_TOKEN": "dummy",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "claude-opus-4-5",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "claude-sonnet-4-5",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "claude-haiku-4-5"
  }
}
```

O `ANTHROPIC_BASE_URL` global em `~/.claude/settings.json` continua valendo para os outros
projetos; o settings de projeto tem precedência.

## Modelos

O padrão é `Auto`. Para fixar outro, defina `QODER_MODEL` no ambiente do servidor com um nome de
`GET /v1/models`:

```
Auto, Ultimate, Fast, Efficient, Sonus, Cantus, Qwen3.8-Max, Qwen3.8-Flash,
Kimi-K3.1-Pro, Kimi-K2.8-Preview, GLM-5.3, GLM-5.3-Flash, DeepSeek-V4-Pro,
DeepSeek-Flash, MiniMax-M3.1-Flash
```

`QODER_MODEL_MAP=1` ativa o mapeamento por família (`opus`→Ultimate, `sonnet`→Auto, `haiku`→Fast).

## Variáveis

| variável | default | função |
|---|---|---|
| `BRIDGE_PORT` | `8787` | porta |
| `BRIDGE_HOST` | `127.0.0.1` | bind (loopback por padrão) |
| `BRIDGE_API_KEY` | vazio | se definido, exige `x-api-key` ou `Bearer` |
| `BRIDGE_POOL_SIZE` | `3` | workers quentes |
| `BRIDGE_POOL` | ligado | `0` desliga o pool (spawn por request) |
| `BRIDGE_REQUEST_TIMEOUT_MS` | `300000` | corte por requisição |
| `QODER_MODEL` | `Auto` | modelo fixo |
| `QODER_MAX_OUTPUT_TOKENS` | `8192` | teto de saída |
| `QODER_CLI_BIN` | auto | caminho do `qodercli.js` |
| `BRIDGE_LOG` | ligado | `0` silencia |
| `BRIDGE_DUMP` | vazio | caminho de arquivo para o último request |

## Endpoints

| método | rota | função |
|---|---|---|
| GET | `/health` | status |
| GET | `/v1/models` | modelos |
| POST | `/v1/messages` | Anthropic Messages (stream e não-stream) |
| POST | `/v1/messages/count_tokens` | estimativa |

## Como as tool calls funcionam

O Claude Code manda `tools[]` no request. O bridge injeta a lista no prompt com um formato único:

```
<tool_calls>[{"name":"Write","input":{"file_path":"a.txt","content":"x"}}]</tool_calls>
```

O modelo responde só com esse bloco, o bridge converte em `tool_use` real e o Claude Code executa.
O streaming de texto é preservado: o bridge segura apenas o prefixo que pode virar bloco de tool call.

`mcp_call` (a ferramenta de MCP do próprio Qoder) é normalizada para a tool real que ela nomeia.

## Limites conhecidos

- Cada turno custa uma chamada de inferência por round-trip de tool. A latência por chamada fica
  em ~2s com worker quente e ~10s quando o pool precisa repor.
- O pool aquece um worker por vez; os três primeiros requests após o start pagam o cold start.
- Contexto: o prompt leva o histórico inteiro em texto, então conversas longas custam caro.
- Ferramentas do Qoder ficam desligadas (`--tools ""`); quem executa é o Claude Code.
- O Qoder pode recusar pedidos por política do próprio provedor. Isso passa direto.
