# Dashboard

O `qclaude` abre o console em `http://127.0.0.1:8787/ui`. Com `BRIDGE_API_KEY`, o launcher passa a
chave no fragmento da URL; a página guarda em `sessionStorage` e limpa a barra de endereço.

## Páginas

| página | conteúdo |
|---|---|
| Home | status, KPIs, gráfico de requests, sucesso, recentes, rota ativa |
| Endpoint | URL base, snippet do Claude, rotas, teste |
| Accounts | failover, cards de conta, adicionar/login, ativar, remover, ordem |
| Routing | tentativas, retries, timeouts, transporte, pool, cooldowns, ordem |
| Analytics | 30m/24h/7d, requests, latência, tokens, heatmap, top modelos/contas |
| Usage & Logs | filtros e tabela de requests, log com busca e download |
| Health | uptime, memória, PID, Node, sessões, pool, caminhos, último erro |
| Models | grid de modelos, modelo padrão, copiar ids e a origem da lista — CLI do Qoder, última lista boa salva em disco ou a embutida — com **Refresh** pedindo uma nova ao CLI |
| Settings | General, AI, Security, Routing, Resilience, Advanced |

Temas dark, light e system. O layout vira rail de ícones abaixo de 1100 px e drawer abaixo de 760 px.

A barra superior tem um seletor de idioma (também em Settings → General) com inglês, português (BR),
espanhol, francês e alemão. A escolha fica em `localStorage`, sobrevive a recarregamentos e o
dashboard é traduzido no lugar, sem recarregar a página.

Accounts mostra uma barra de cota real por perfil (créditos usados/total, restante, plano e
estado), a Home tem um KPI de Créditos e o Analytics ganhou créditos por intervalo, taxa de consumo
e data prevista de esgotamento. Usage & Logs mostra os créditos e se a linha usou usage real ou
estimativa; o CSV inclui os dois. A página Accounts também lista a recompensa diária de 100
créditos por perfil, com botão de resgate quando disponível e a validade quando já resgatada.

## Settings

Os settings escrevem dois arquivos, ambos com backup:

- `bridge.config.json` — runtime da bridge (porta, host, API key, transporte, pool, timeouts,
  contexto, thinking, effort, teto de saída, retries, tentativas).
- `~/.claude/settings.json` — modelo e chaves de 1M do Claude Code; o botão de web tools reaplica
  Exa/allowlist.

Porta, host, API key, transporte, pool e access log precisam de restart; o banner manda fechar e abrir
o qclaude. Timeouts, contexto, thinking, effort, teto de saída, retries e tentativas valem no próximo
request.

Variáveis de ambiente existentes vencem o arquivo; esses campos ficam desabilitados no formulário. A
API nunca devolve a chave — só se ela existe.

## Métricas

`metrics.jsonl` guarda uma linha por minuto e mantém sete dias. Contém modelo, conta, status,
latência, TTFB, estimativas de tokens e contagem de erros — nunca o texto do prompt. Analytics lê 30
minutos, 24 horas ou 7 dias e mostra p50/p95, TTFB, tokens e top modelos/contas.

Os arquivos são locais, gitignored e preservados pelo updater. Remover a instalação remove os dois.
