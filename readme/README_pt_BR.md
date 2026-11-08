# qoder-claude (Português)

Servidor local compatível com a **Anthropic Messages API** apoiado no seu plano Qoder.
Aponte o Claude Code para ele e os modelos do seu plano passam a responder, com tool calls
que mantêm a forma, streaming e uma statusline mostrando o modelo em uso.

**Site:** https://ryanabcraft.github.io/qoder-claude/

**Índice:** [Instalação](#instalação) · [Abrir](#abrir) · [Contas](#contas) ·
[Configuração](#configuração) · [Como funciona](#como-funciona) · [Limites](#limites)

Este é o espelho do [README principal](../README.md), em inglês.

## Recursos

- `/v1/messages` compatível com Anthropic, SSE real e blocos `tool_use`
- Transporte direto: assina e cifra cada requisição com o WASM embutido do Qoder, sem processo do CLI
- Pool de workers aquecidos no fallback CLI: ~2 s por request com o pool pronto
- Quantas contas você quiser, com failover automático quando uma bate a cota
- Modelo, orçamento de pensamento e janela de contexto selecionáveis por request
- Statusline `Qoder · <modelo>` gravada nas configurações do Claude Code
- Instalador de um comando no Windows: dependências, login, configuração, servidor e health check
- O token fica local: o bridge decifra o cofre do Qoder em memória para assinar a requisição e
  não o envia para nenhum outro host

## Instalação

### Windows — CMD

```cmd
curl -fsSL https://raw.githubusercontent.com/Ryanabcraft/qoder-claude/main/install.cmd -o install.cmd && install.cmd && del install.cmd
```

### Windows — PowerShell

```powershell
irm https://raw.githubusercontent.com/Ryanabcraft/qoder-claude/main/install.ps1 | iex
```

### Linux / macOS

```bash
curl -fsSL https://raw.githubusercontent.com/Ryanabcraft/qoder-claude/main/install.sh | bash
```

O instalador:

1. confere o Node.js 20+ — instala quando falta (winget no Windows; tarball oficial do LTS em
   `~/.local/node` no Linux e macOS, sem sudo, com checksum conferido)
2. instala o `@qoder-ai/qodercli` e o Claude Code se faltarem (o Claude pelo instalador
   oficial `claude.ai/install`, não pelo npm)
3. abre o login do Qoder se não houver sessão
4. instala o bridge em `%LOCALAPPDATA%\qoder-bridge` ou `~/.local/share/qoder-bridge`
5. grava o `~/.claude/settings.json` **global** (backup em `.bak`) com URL, token,
   `modelPicker` e statusline
6. imprime `Start with: qclaude`

O instalador não deixa servidor rodando. O `qclaude` sobe a bridge na hora, abre o Claude Code e
derruba a bridge quando o Claude sai. `qclaude --window` mantém o servidor numa janela própria;
`qclaude --serve` roda em primeiro plano.

Flags do `install.sh`: `--project-only` (configura só o diretório atual), `--dir <path>`,
`--skip-claude`, `--skip-login` e `--source <dir>` (instala de um checkout local).
Do `install.ps1`: `-ProjectOnly`, `-SkipDeps`, `-InstallDir <path>`. `update.cmd` / `update.sh`
atualizam no lugar e param qualquer servidor antigo.

O diretório de instalação mantém o nome histórico `qoder-bridge` para não quebrar instalações
existentes; só o repositório e o comando se chamam `qoder-claude`.

**Por que o Qoder CLI continua sendo instalado:** ele é dono do login (`qodercli login`), que
grava o cofre de credenciais usado pelo transporte direto para assinar; é a fonte da lista de
modelos; e é o transporte de fallback quando `vendor/` não está presente. No caminho padrão a
bridge não chama o CLI.

### Manual

```bash
git clone https://github.com/Ryanabcraft/qoder-claude.git
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
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "claude-haiku-4-5",
    "CLAUDE_CODE_AUTO_MODE_SERVER": "0"
  },
  "statusLine": {
    "type": "command",
    "command": "node \"C:\\\\caminho\\\\qoder-bridge\\\\scripts\\\\statusline.js\""
  }
}
```

`CLAUDE_CODE_AUTO_MODE_SERVER=0` impede o Claude Code de pedir as checagens de auto mode do
servidor. Um gateway local não consegue repassar o campo `safeguards`, então sem isso o Claude
Code mostra o aviso de "classifier requests" a cada sessão e faz essas checagens por conta.

### Abrir

```bash
qclaude                # sobe o servidor, abre o dashboard e abre o Claude Code
qclaude -p "..."       # qualquer argumento é repassado ao claude
qclaude --model X      # idem
qclaude --status       # servidor e lista de modelos
qclaude --serve        # só o servidor, em primeiro plano
qclaude --no-browser   # não abre a aba do dashboard
qclaude --stop         # derruba o servidor
```

Quando o `qclaude` sobe o servidor, fechar o Claude também o encerra. Um servidor iniciado
pelo `start.cmd` fica intocado.

## Rodando

Por padrão o servidor roda **junto da sessão**: o `qclaude` sobe, guarda o log em `bridge.log`
e derruba quando o Claude sai. O dashboard abre no navegador na mesma hora, uma vez por
abertura interativa.

```bash
qclaude --window       # servidor numa janela de terminal própria
qclaude --no-browser   # sem a aba do dashboard
```

`--window` usa um `cmd` novo no Windows, o Terminal no macOS e o primeiro emulador disponível
no Linux (`$TERMINAL`, `x-terminal-emulator`, `gnome-terminal`, `konsole`, `xfce4-terminal`,
`alacritty`, `kitty`, `xterm`).

No Windows o `start.cmd` continua existindo e abre um console visível com a porta, o caminho do
log e cada request conforme acontece. Fechar essa janela — ou Ctrl+C — encerra o servidor.

Linux/macOS: `./start.sh` roda do mesmo jeito, em primeiro plano; `./stop.sh` para de outro
terminal.

## Uso

```bash
claude                                   # usa Auto, com os limites do próprio modelo
claude --model Qwen3.8-Max               # qualquer modelo de GET /v1/models
```

Dentro da sessão, `/model Qwen3.8-Max` troca no próximo request.

Nada é limitado pela bridge: `max_tokens` e `context_window` vêm do request e, quando ele não
diz nada, valem os limites nativos do modelo. O único padrão é a janela de contexto em 1M,
porque todo modelo frontier atual do Qoder oferece isso.

Ferramentas nativas — `Read`, `Write`, `Edit`, `Glob`, `Grep`, `Bash`, `WebFetch`, `WebSearch` —
e servidores MCP rodam do lado do Claude Code; a bridge só carrega os blocos `tool_use`.
`WebSearch` e `WebFetch` são *deferred*: pedem uma aprovação e são carregadas pelo `ToolSearch`,
depois funcionam normalmente. O `WebSearch` nativo volta sem resultados atrás do gateway; quando
existe um servidor MCP Exa configurado, o turno instrui o modelo a usar
`mcp__exa__web_search_exa`, entrega o schema e reescreve qualquer chamada `WebSearch` para a
ferramenta do Exa — a busca devolve resultados reais em vez de lista vazia.

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
    {
      "model": "Auto",
      "label": "Qoder · Auto",
      "description": "Auto via Qoder CLI",
      "behavesAs": "claude-opus-4-8"
    }
  ]
}
```

`modelPicker` exige Claude Code v2.1.243+ e só vale em user settings, `--settings` ou
managed settings — settings de projeto ignoram a chave.

### Contexto de 1M

Um ID do Qoder é desconhecido para o Claude Code, que então assume 200K e compacta cedo. Duas
coisas resolvem, e o instalador grava as duas:

| ajuste | efeito |
|---|---|
| `"behavesAs": "claude-opus-4-8"` em cada linha do picker | o cliente aplica o perfil desse modelo (janela de 1M) e continua enviando o ID do Qoder |
| `CLAUDE_CODE_MAX_CONTEXT_TOKENS=1000000` | teto de reserva, quando a linha não é honrada |
| `CLAUDE_CODE_DISABLE_1M_CONTEXT=0` | mantém o caminho de 1M ligado |

No lado do Qoder, toda requisição leva `context_window: 1000000` por padrão — o CLI recebe
`--context-window 1000000` e o transporte direto põe o mesmo valor no payload. Ajuste com
`QODER_CONTEXT_WINDOW` (ex.: `200000`) ou por request com `context_window`.

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

## Contas

Uma **conta** aqui é um perfil isolado do Qoder. Cada uma tem o próprio `--config-dir`, então
login, sessão e cota de uma nunca encostam na outra.

`default` é o que você já tinha: a configuração global em `~/.qoder`.

### Conectar uma conta nova

```bash
qclaude account add trabalho
```

Cria `accounts/trabalho`, abre o login do Qoder no navegador e a deixa ativa quando o login
termina. Repita com outro nome para cada conta extra.

### Listar e trocar

```bash
qclaude account list

# contas (failover ligado):
#   * default          ativa        (config global)
#     trabalho         pronta       C:\...\qoder-bridge\accounts\trabalho

qclaude account use trabalho   # ativa a partir de agora
qclaude account current        # qual está ativa
qclaude --status               # conta + servidor + modelos
```

### Uma sessão só, com uma conta específica

```bash
qclaude --account trabalho
```

Troca a conta ativa e abre o Claude Code com ela. O resto continua igual.

### Remover

```bash
qclaude account remove trabalho
```

Apaga o perfil e o diretório de credenciais. A `default` não pode ser removida.

### Onde fica cada coisa

| O quê | Onde |
|---|---|
| nome da conta ativa | `accounts.json` |
| cada conta extra | `accounts/<nome>/` |
| a conta padrão | `~/.qoder` |

`accounts/` e `accounts.json` estão no `.gitignore` — credencial não vai para o repositório.

### Failover automático

Com mais de uma conta, a bridge reveza sozinha. Quando a conta ativa bate a cota diária, leva
rate limit ou perde a sessão, ela é **pausada** e a mesma requisição roda na próxima — sem
reiniciar nada, sem trocar na mão.

```
account 1/3: trabalho
account trabalho paused 1800s: upstream 403: Billing daily count exceeded
account 2/3: pessoal
done session=miss total=2311ms
```

| o que aconteceu | pausa |
|---|---|
| billing / cota diária / `403` | 30 minutos |
| `401`, sem login, token expirado | 10 minutos |
| rate limit `429` | 1 minuto |
| timeout, conexão resetada | 30 segundos |

Ordem: a conta ativa primeiro, depois as outras na ordem do arquivo. Conta pausada vai para o
fim da fila e volta sozinha quando o tempo acaba. Resposta com sucesso limpa a pausa da conta.

```bash
qclaude rotation            # o pool e o estado de cada conta
qclaude rotation on|off     # liga ou desliga o failover
qclaude account pause trabalho  # tira a conta do pool
qclaude account resume trabalho # devolve a conta ao pool
```

O painel tem o mesmo interruptor na aba **Accounts**, com botão Enable/Disable por conta e
contagem regressiva para as pausadas. `BRIDGE_COOLDOWN_MS` define uma pausa padrão para erros
que não caem em nenhuma das classes acima.

Dois limites que valem saber:

- **Só antes do primeiro token visível.** Se a resposta já começou a sair, a bridge não
  reescreve em outra conta; devolve o erro.
- **A rotação é por requisição.** O worker de uma sessão do Claude Code fica preso a uma conta;
  quando a conta muda, o turno seguinte abre um worker novo com o histórico inteiro.

### Vale saber

- **A cota é por conta.** Trocar de conta troca o limite diário.
- **O modelo não faz parte da conta.** O Claude Code mantém a escolha; a conta só muda quem responde.
- **Reinicie a sessão aberta depois de trocar.** `account add` e `use` valem para o próximo worker.
- **Conta sem login falha rápido:** cerca de 3 segundos, com `Not logged in · Please run /login`.

### Se der problema

| Sintoma | Correção |
|---|---|
| `account "x" does not exist` | `qclaude account list` para ver os nomes exatos |
| `Not logged in` | `qclaude account add <nome>` de novo e reinicie a sessão |
| Conta errada respondendo | `qclaude account current` e reinicie a sessão |
| `claude.exe is not compatible with the version of Windows` | cópia antiga do npm quebrada. O `qclaude` agora ignora e usa a build oficial; remova a velha com `npm uninstall -g @anthropic-ai/claude-code` |
| Login abriu mas nada mudou | o login precisa terminar para a conta ficar ativa |
| O failover não dispara | `qclaude rotation` — veja se está `on` e se as outras contas não estão desativadas |
| Tudo pausado | o pool esvaziou por enquanto; espere o timer ou `qclaude account resume <nome>` |

## Sessões

Uma conversa do Claude Code mantém um processo `qodercli`. A bridge lembra as mensagens que já
enviou e, no turno seguinte, repassa só as novas:

| evento | comportamento |
|---|---|
| mesmo `session_id`, mesma conta/modelo/system | worker reaproveitado (`session=hit`), só o delta vai |
| `/clear` ou conversa nova | worker novo (`session=miss`) |
| modelo, conta ou system prompt mudou | worker novo |
| 15 minutos ocioso | worker reciclado |
| mais de 4 sessões vivas | a mais antiga é reciclada |

Ajustes: `BRIDGE_SESSION_TTL_MS` (padrão `900000`) e `BRIDGE_SESSION_MAX` (padrão `4`).

Se o agente reescrever o histórico sem trocar o `session_id`, a checagem de prefixo falha e a
bridge cai para um worker novo com o histórico inteiro — nunca envia delta sobre estado
desconhecido.

## Erros e retentativas

- Recusa do Qoder (cota diária, `403`, `not logged in`) → **400 `invalid_request_error`** com a
  mensagem real. O Claude Code não retenta um 400, então o banner "retry in 4m 10s" desaparece.
- Antes de devolver esse erro, a bridge tenta a próxima conta do pool (veja
  [Failover automático](#failover-automático)). O 400 só chega ao Claude Code quando nenhuma
  conta consegue responder.
- Limite de taxa (`429`) → 429 `rate_limit_error`.
- Timeout e reset de conexão → 503 `overloaded_error`.
- O CLI roda com `--max-model-request-retries 0`; ajuste com `BRIDGE_MODEL_RETRIES`.
- Respostas em stream também levam um `: ping` de keepalive a cada 12 s.

## Painel

Com o servidor no ar, abra **http://127.0.0.1:8787/ui**.

| aba | o que faz |
|---|---|
| Overview | transporte, porta, conta, quantidade de modelos, uptime; atualizar e parar |
| Accounts | interruptor do failover, estado do pool, adiciona (login no navegador), troca, pausa e remove |
| Models | a lista viva de modelos |
| Test | envia um prompt curto e mostra status, latência e resposta |
| Logs | últimas 200 linhas do `bridge.log` |

Tudo em loopback e com a mesma `BRIDGE_API_KEY` da API, quando definida.

## Transportes

| transporte | como funciona |
|---|---|
| `direct` (padrão quando `vendor/` existe) | assina e cifra a requisição com o WASM embutido do Qoder e chama `api1.qoder.sh` por HTTPS. Sem processo do CLI. |
| `cli` | sobe o `qodercli` por request (fallback, e o único modo quando `vendor/` está ausente) |

`BRIDGE_TRANSPORT=direct|cli` força um deles.

Como o caminho direto funciona:

1. lê `~/.qoder/.auth/user` (AES; chave = primeiros 16 caracteres de `.auth/machine_id`)
2. deriva os campos de auth com `generate_runtime_auth_fields`
3. monta um `QoderContext` e chama `prepareInferRequest`
4. faz o POST do corpo assinado e cifrado e lê os envelopes SSE

`vendor/qoder-auth.cjs` é o glue wasm-bindgen extraído do bundle oficial;
`vendor/qoder_auth_wasm_bg.wasm` é o módulo. `probe/` guarda os scripts de extração.

Quando o access token expira, rode uma vez com `BRIDGE_TRANSPORT=cli` (ou `qodercli login`)
para o CLI renovar o cofre, depois volte.

## Configuração

| variável | padrão | função |
|---|---|---|
| `BRIDGE_PORT` | `8787` | porta |
| `BRIDGE_HOST` | `127.0.0.1` | bind |
| `BRIDGE_API_KEY` | vazio | exige `x-api-key` ou `Bearer` |
| `BRIDGE_POOL_SIZE` | `2` | workers quentes |
| `BRIDGE_SESSION_TTL_MS` | `900000` | vida de uma sessão ociosa |
| `BRIDGE_SESSION_MAX` | `4` | sessões simultâneas mantidas |
| `BRIDGE_MODEL_RETRIES` | `0` | retentativas dentro do CLI |
| `BRIDGE_POOL` | ligado | `0` desliga o pool |
| `BRIDGE_REQUEST_TIMEOUT_MS` | `300000` | corte por request |
| `QODER_MODEL` | `Auto` | modelo fixo |
| `QODER_THINKING` | do request | `enabled`, `adaptive`, `disabled` |
| `QODER_THINKING_BUDGET` | do request | tokens de pensamento |
| `QODER_CONTEXT_WINDOW` | do request | janela de contexto |
| `QODER_MAX_OUTPUT_TOKENS` | do request | fallback usado só quando o request não manda `max_tokens` |
| `QODER_CLI_BIN` | auto | caminho do `qodercli.js` |
| `BRIDGE_LOG` | ligado | `0` silencia o log |
| `BRIDGE_DUMP` | vazio | arquivo do último request |

O `max_tokens` do request vai para o backend como veio. A bridge não aplica teto próprio: o
limite é o que o modelo aceita. Isso importa no `/compact`, que pede um orçamento alto de
resumo, e em `Write` de arquivos grandes.

## Como funciona

O endpoint de inferência do Qoder cifra e assina cada corpo de request
(`Authorization: COSY.*`, `Cosy-Key`, `Cosy-Date`) dentro de um módulo WASM nativo — replicar
não é prático.

O CLI oficial já emite eventos no formato Anthropic com
`--output-format stream-json --include-partial-messages`. O bridge monta o prompt, lê esses
eventos e repassa. O system prompt do agente vai **intacto** para o modelo — nada é anexado a
ele. A lista de ferramentas viaja numa seção própria do turno, então o modelo mantém as regras
do Claude Code e continua sabendo quais ferramentas existem.

As tool calls são negociadas em texto e o bridge aceita os dois formatos que o modelo produz:

```
<tool_calls>[{"name":"Write","input":{"file_path":"a.txt","content":"x"}}]</tool_calls>
[[tool_use Read {"file_path":"a.txt"}]]
```

O bloco vira um `tool_use` real e o Claude Code executa. O gate do stream segura o texto assim
que qualquer um dos marcadores aparece, então bloco pela metade nunca chega ao cliente.

## Limites

- Uma inferência por round-trip de ferramenta. Dentro da sessão o worker é reaproveitado (~2 s); só o primeiro turno de uma conversa paga o cold start (~10 s).
- Os três primeiros requests após o start pagam o cold start.
- O histórico inteiro vai serializado no prompt a cada request: conversa longa custa caro e fica lenta.
- As ferramentas nativas do Qoder ficam desligadas (`--tools ""`); quem executa é o Claude Code.
- Recusas por política do provedor passam intactas.

## Contribuição

Veja [CONTRIBUTING.md](../CONTRIBUTING.md).

## Licença

[MIT](../LICENSE)
