# Contribuir

Obrigado. O projeto é uma bridge Node pequena e sem dependências de runtime; manter isso faz parte do
design. O site e o docs têm tooling próprio.

## Requisitos

- Node.js 20+
- `@qoder-ai/qodercli` instalado e logado para requests reais
- Windows 10/11 só se você mexer no instalador PowerShell

## Desenvolvimento

```bash
git clone https://github.com/Ryanabcraft/qoder-claude.git
cd qoder-claude
node src/server.js
```

Smoke test sem Claude Code:

```bash
curl -sN http://127.0.0.1:8787/v1/messages \
  -H "content-type: application/json" \
  -d '{"model":"Auto","max_tokens":64,"stream":true,
       "messages":[{"role":"user","content":"say ok"}]}'
```

Atalhos úteis:

| variável | efeito |
|---|---|
| `BRIDGE_POOL=0` | um processo CLI por request; mais fácil de depurar |
| `BRIDGE_DUMP=/tmp/last.json` | grava o último request |
| `BRIDGE_DEBUG_STDERR=1` | espelha o stderr do worker |
| `BRIDGE_LOG=0` | silencia o access log |

## Testes

```bash
npm test
npm run coverage
```

A suíte cobre prompt, sessões, contas, config, métricas, uninstall, update, rotas do dashboard e o
servidor. Os limites de cobertura rodam no CI.

## Docs e site

```bash
cd docs-site && npm install && npm run docs:build
cd site && npm install && npm run build
```

## Regras

- Sem dependências de runtime. A bridge roda com um `node` puro.
- Superfície Anthropic honesta: bloco sem suporte é descartado explicitamente, não adivinhado.
- Nunca logar ou persistir credenciais do Qoder; a bridge fala com o CLI por stdio.
- Comentários só quando o motivo não é óbvio.
- Mensagens de commit em inglês, imperativo.

O PR deve descrever o problema, o comando usado para verificar e o efeito medido no pool, sessões ou
formato do prompt.
