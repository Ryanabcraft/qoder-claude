# Busca e imagens

## Busca na web, executada pela bridge

Cliente que declara a server tool do Anthropic (`web_search_20250305`) recebe resultado de verdade:
a bridge faz a busca e transmite os blocos padrão `server_tool_use` + `web_search_tool_result`,
depois responde com os resultados no contexto. Sem chave de API e sem MCP.

- **Ordem dos backends**: endpoint MCP do Exa (`https://mcp.exa.ai/mcp`, funciona sem chave), depois
  DuckDuckGo HTML. `QODER_SEARCH=exa|ddg` fixa um.
- Resultados ficam em cache por cinco minutos; `allowed_domains` / `blocked_domains` da tool são
  aplicados antes de devolver qualquer coisa.
- Busca que falha vira `web_search_tool_result_error`, nunca stream quebrado.

O OpenCode não conhece server tools, então o provider gerado manda `search: true`. Quando a pergunta
depende de fato vivo (preço, "hoje", versão recente, notícia, uma URL), a bridge busca **antes** de
chamar o modelo e injeta os resultados com URL — os modelos daqui tendem a narrar a chamada em vez
de emitir. Se o modelo chamar a função `web_search` declarada, recebe os resultados e um segundo
turno, tudo dentro da bridge.

O MCP do Exa continua sendo adicionado ao Claude Code pelo instalador quando falta; agora é opcional,
não o único caminho. `QODER_NO_EXA=1` pula essa configuração.

## Busca de página (web_fetch)

A `web_fetch_20250910` do Anthropic também roda na bridge: a página é baixada, script e style são
removidos, e o título e o texto visível voltam no stream (24k chars, 2 MB de bytes, 5 redirects,
timeout de 20 s).

Alvos privados são recusados antes de qualquer conexão: `file://`, `localhost`, `127/8`, `10/8`,
`172.16/12`, `192.168/16`, `169.254/16`, `::1`, `fc00::/7`, e hostname público que resolva para
endereço privado. Sem isso, uma página poderia pedir ao modelo para ler o dashboard em
`127.0.0.1:8787` ou outra máquina da sua rede. Para ler um servidor local, use a ferramenta de
terminal (`curl`) — a regra vale só para o fetch que a bridge executa.

## Imagens

O Claude Code manda imagens coladas como blocos base64, e clientes OpenAI mandam partes `image_url`. Os dois caminhos usam o motor abaixo; no caminho OpenAI a bridge rotaciona contas ate uma ter credito. O endpoint direto do Qoder descarta imagens
inline, então a bridge usa o motor do CLI 1.1.80:

```bash
qclaude vision install
qclaude vision
```

- Aceita PNG, JPEG, GIF e WebP, até 10 MiB cada e 50 por request.
- O turno com imagem roda pelo CLI 1.1.80 com `--attachment`, leva cerca de 13 segundos e não é
  streamado.
- Só imagens do turno atual são anexadas. Imagens de turnos anteriores viram texto, então o próximo
  turno de texto volta ao caminho direto rápido.
- O motor 1.1.80 é fixo de propósito: o 1.1.85 removeu `--attachment`.

Sem o motor instalado, a bridge aceita o request mas o modelo não lê a imagem.
