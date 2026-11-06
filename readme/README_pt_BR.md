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

### Windows — CMD

```cmd
curl -fsSL https://raw.githubusercontent.com/Ryanabcraft/qoder-bridge/main/install.cmd -o install.cmd && install.cmd && del install.cmd
```

### Windows — PowerShell

```powershell
irm https://raw.githubusercontent.com/Ryanabcraft/qoder-bridge/main/install.ps1 | iex
```

### Linux / macOS

```bash
curl -fsSL https://raw.githubusercontent.com/Ryanabcraft/qoder-bridge/main/install.sh | bash
```

O instalador:

1. confere o Node.js 20+ (instala o LTS via winget no Windows; no resto, diz o que instalar)
2. instala o `@qoder-ai/qodercli` se faltar
3. abre o login do Qoder se não houver sessão
4. instala o bridge em `%LOCALAPPDATA%\qoder-bridge` ou `~/.local/share/qoder-bridge`
5. grava o `~/.claude/settings.json` **global** (backup em `.bak`) com URL, token,
   `modelPicker` e statusline
6. sobe o servidor em background e espera o `/health`
7. lista os modelos para provar que a rota responde

Flags: `-ProjectOnly` / `--project-only` (configura só o diretório atual),
`-NoStart` / `--no-start`, `-SkipDeps`, `-InstallDir <path>` / `--dir <path>`.

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

## Rodando

Windows: o `start.cmd` abre uma janela visível com a porta, o caminho do log e cada request
conforme acontece. Fechar essa janela — ou Ctrl+C — encerra o servidor. Nada roda escondido.

Linux/macOS: `./start.sh` roda do mesmo jeito, em primeiro plano; `./stop.sh` para de outro
terminal.

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

### Esforço de raciocínio e pensamento

O bridge repassa os controles que o Claude Code já envia, sem tradução:

| Claude Code envia | bridge passa para o `qodercli` |
|---|---|
| `output_config.effort` | `--reasoning-effort <low\|medium\|high\|xhigh\|max>` |
| `thinking.type` | `--thinking <auto\|adaptive\|enabled\|disabled>` |
| `thinking.budget_tokens` | `--thinking-budget <n>` |

O instalador define `*_SUPPORTED_CAPABILITIES` para o seletor de esforço aparecer no `/model`:

```json
"ANTHROPIC_DEFAULT_OPUS_MODEL_SUPPORTED_CAPABILITIES": "effort,xhigh_effort,thinking,adaptive_thinking,interleaved_thinking"
```

`/effort status`, o seletor com as setas e `CLAUDE_CODE_EFFORT_LEVEL` funcionam como funcionam
contra a Anthropic, porque o valor chega ao modelo intacto.

### Seletor de modelos

O instalador grava um bloco `modelPicker` no `~/.claude/settings.json`, então o `/model`
lista a linha Qoder direto, sem Opus/Sonnet/Haiku:

```json
"modelPicker": {
  "replaceBuiltInOptions": true,
  "options": [
    { "model": "Auto", "label": "Qoder · Auto", "description": "Auto via Qoder CLI" },
    { "model": "Qwen3.8-Max", "label": "Qoder · Qwen3.8-Max", "description": "Qwen3.8-Max via Qoder CLI" }
  ]
}
```

`modelPicker` exige Claude Code v2.1.243+ e só vale em user settings, `--settings` ou
managed settings — settings de projeto ignoram a chave.

## Atualização

Nada se atualiza sozinho em silêncio. A lista de modelos é a única parte que se mantém
atual por conta própria, porque o bridge pergunta ao CLI:

| peça | como atualiza |
|---|---|
| lista de modelos (`/v1/models`, picker do `/model`) | lida de `qodercli --list-models`, cache de 10 min |
| `qodercli` | `qodercli update` ou `npm i -g @qoder-ai/qodercli` |
| código do bridge | `git pull` na pasta instalada e reiniciar |
| Claude Code | atualizador próprio, independente deste projeto |

O `update.cmd` faz tudo de uma vez:

```cmd
"%LOCALAPPDATA%\qoder-bridge\update.cmd"
```

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
