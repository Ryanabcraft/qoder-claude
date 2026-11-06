# qoder-bridge (Português)

Servidor local compatível com a **Anthropic Messages API** que usa o **Qoder CLI** como backend.
Aponte o Claude Code para ele e os modelos do seu plano Qoder passam a responder, com tool calls
nativas, streaming e uma statusline mostrando o modelo em uso.

Este é o espelho do [README principal](../README.md), em inglês.

## Recursos

- `/v1/messages` compatível com Anthropic, SSE real e blocos `tool_use`
- Pool de workers aquecidos: ~2 s por request com o pool pronto
- Modelo, orçamento de pensamento e janela de contexto selecionáveis por request
- Statusline `Qoder · <modelo>` gravada nas configurações do Claude Code
- Instalador de um comando no Windows: dependências, login, configuração, servidor e health check
- Nenhum manuseio de credencial: o bridge nunca lê, guarda ou repassa tokens do Qoder

## Instalação

### Windows (um comando)

Cole no **CMD**:

```cmd
gh repo clone Ryanabcraft/qoder-bridge "%LOCALAPPDATA%\qoder-bridge" -- --depth 1 2>nul || git -C "%LOCALAPPDATA%\qoder-bridge" pull --ff-only -q & powershell -NoProfile -ExecutionPolicy Bypass -File "%LOCALAPPDATA%\qoder-bridge\install.ps1"
```

Ou no **PowerShell**:

```powershell
$d = Join-Path $env:LOCALAPPDATA 'qoder-bridge'
if (Test-Path (Join-Path $d '.git')) { git -C $d pull --ff-only -q } else { gh repo clone Ryanabcraft/qoder-bridge $d -- --depth 1 }
& (Join-Path $d 'install.ps1')
```

O instalador:

1. instala o Node.js LTS se faltar (winget)
2. instala o `@qoder-ai/qodercli` se faltar
3. abre o login do Qoder se não houver sessão
4. copia o bridge para `%LOCALAPPDATA%\qoder-bridge`
5. grava o `~/.claude/settings.json` **global** (backup em `.bak`) com URL, token e statusline
6. sobe o servidor em background e espera o `/health`
7. lista os modelos para provar que a rota responde

Flags: `-ProjectOnly` (configura só o diretório atual), `-NoStart`, `-SkipDeps`,
`-InstallDir <path>`.

### Manual

```bash
git clone https://github.com/Ryanabcraft/qoder-bridge.git
cd qoder-bridge
npm install -g @qoder-ai/qodercli
qodercli login
node src/server.js
```

Depois adicione em `~/.claude/settings.json`:

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "http://127.0.0.1:8787",
    "ANTHROPIC_AUTH_TOKEN": "dummy",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "claude-opus-4-5",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "claude-sonnet-4-5",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "claude-haiku-4-5"
  },
  "statusLine": {
    "type": "command",
    "command": "node \"C:\\\\caminho\\\\qoder-bridge\\\\scripts\\\\statusline.js\""
  }
}
```

## Uso

```bash
claude                                   # usa Auto, com os limites do próprio modelo
claude --model Qwen3.8-Max               # qualquer modelo de GET /v1/models
```

Dentro da sessão, `/model Qwen3.8-Max` troca no próximo request.

Nada é limitado por padrão: o bridge não envia `--max-output-tokens`, `--thinking` nem
`--context-window` a menos que você peça. O Qoder CLI usa os limites nativos do modelo.
Overrides opcionais, quando você realmente quiser:

```bash
# no servidor
QODER_MAX_OUTPUT_TOKENS=16000 node src/server.js
QODER_CONTEXT_WINDOW=200000 node src/server.js
QODER_THINKING=enabled QODER_THINKING_BUDGET=8000 node src/server.js

# no cliente (o Claude Code repassa como thinking.budget_tokens)
MAX_THINKING_TOKENS=8000 claude
```

### Modelos

`Auto, Ultimate, Fast, Efficient, Sonus, Cantus, Qwen3.8-Max, Qwen3.8-Flash,
Kimi-K3.1-Pro, Kimi-K2.8-Preview, GLM-5.3, GLM-5.3-Flash, DeepSeek-V4-Pro,
DeepSeek-Flash, MiniMax-M3.1-Flash`

`QODER_MODEL_MAP=1` mapeia as famílias do Claude: `opus` → Ultimate, `sonnet` → Auto,
`haiku` → Fast.

## Configuração

| variável | padrão | função |
|---|---|---|
| `BRIDGE_PORT` | `8787` | porta |
| `BRIDGE_HOST` | `127.0.0.1` | bind |
| `BRIDGE_API_KEY` | vazio | exige `x-api-key` ou `Bearer` |
| `BRIDGE_POOL_SIZE` | `3` | workers quentes |
| `BRIDGE_POOL` | ligado | `0` desliga o pool |
| `BRIDGE_REQUEST_TIMEOUT_MS` | `300000` | corte por request |
| `QODER_MODEL` | `Auto` | modelo fixo |
| `QODER_THINKING` | do request | `enabled`, `adaptive`, `disabled` |
| `QODER_THINKING_BUDGET` | do request | tokens de pensamento |
| `QODER_CONTEXT_WINDOW` | do request | janela de contexto |
| `QODER_MAX_OUTPUT_TOKENS` | vazio | teto opcional de saída; vazio = padrão do modelo |
| `QODER_CLI_BIN` | auto | caminho do `qodercli.js` |
| `BRIDGE_LOG` | ligado | `0` silencia o log |
| `BRIDGE_DUMP` | vazio | arquivo do último request |

## Como funciona

O endpoint de inferência do Qoder cifra e assina cada corpo de request
(`Authorization: COSY.*`, `Cosy-Key`, `Cosy-Date`) dentro de um módulo WASM nativo — replicar
não é prático.

O CLI oficial já emite eventos no formato Anthropic com
`--output-format stream-json --include-partial-messages`. O bridge monta o prompt, lê esses
eventos e repassa. Tool calls são negociadas em texto:

```
<tool_calls>[{"name":"Write","input":{"file_path":"a.txt","content":"x"}}]</tool_calls>
```

O bridge converte o bloco em `tool_use` real e o Claude Code executa.

## Limites

- Uma inferência por round-trip de ferramenta; ~2 s com worker quente e ~10 s no cold start.
- Os três primeiros requests após o start pagam o cold start.
- O histórico inteiro vai serializado no prompt a cada request: conversa longa custa caro e fica lenta.
- As ferramentas nativas do Qoder ficam desligadas (`--tools ""`); quem executa é o Claude Code.
- Recusas por política do provedor passam intactas.

## Contribuição

Veja [CONTRIBUTING.md](../CONTRIBUTING.md).

## Licença

[MIT](../LICENSE)
