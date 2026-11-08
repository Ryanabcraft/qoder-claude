# Busca e imagens

## Busca na web

O Claude Code manda `WebSearch`, `WebFetch` e ferramentas MCP só pelo nome (deferred). A bridge
injeta schemas mínimos no request para o modelo chamar sem um round-trip de `ToolSearch`.

Atrás do gateway local o `WebSearch` nativo não retorna resultados, então a busca vai pelo Exa:

- O instalador e o `qclaude` adicionam `mcp__exa__web_search_exa` quando falta.
- `WebSearch` e `mcp__exa__web_search_exa` ficam na allowlist, então o auto mode não bloqueia com o
  classificador de segurança.
- `WebFetch` é roteado para `mcp__exa__web_fetch_exa`.
- O modelo é instruído a tentar a ferramenta antes de responder que a busca está indisponível.

`QODER_NO_EXA=1` pula a configuração do MCP. Settings → Security no dashboard reaplica o Exa e a
allowlist.

## Imagens

O Claude Code manda imagens coladas como blocos base64. O endpoint direto do Qoder descarta imagens
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
