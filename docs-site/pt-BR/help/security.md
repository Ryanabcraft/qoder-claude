# Segurança e privacidade

## O que fica local

- Credenciais do Qoder ficam na config do Qoder e em cada pasta de conta. A bridge lê localmente para
  assinar os requests.
- Os requests vão só para o Qoder (`api1.qoder.sh`) ou para o CLI local. Nada é encaminhado para
  outro host.
- `bridge.config.json` e `metrics.jsonl` são arquivos locais e gitignored.
- Claude Code, CLI do Qoder e arquivos de conta não são enviados pela bridge.

## API key

Quando `BRIDGE_API_KEY` ou a chave do config está definida:

- o launcher abre `/ui#key=...`; o fragmento não vai ao servidor;
- a página guarda em `sessionStorage` e limpa a barra de endereço;
- as chamadas mandam `x-api-key`;
- o endpoint de config diz apenas se existe chave, nunca o valor.

A chave fica em texto puro no arquivo local, como o resto da config. Proteja a pasta com as permissões
normais da conta de usuário.

## Logs

O access log redige qualquer parâmetro cujo nome case com `key`, `token`, `secret`, `password` ou
`auth`. Modelos, contas, caminhos, status e tempos continuam.

`BRIDGE_DUMP` grava o corpo inteiro do último request quando definido; pode conter prompts. Use só
para depurar e apague depois.

## Métricas

`metrics.jsonl` guarda modelo, conta, status, latência, TTFB, estimativas de tokens e erros. Não
guarda prompt nem resposta. Mantém sete dias.

## Terceiros

- Exa: queries de busca/fetch vão ao endpoint MCP do Exa. `QODER_NO_EXA=1` pula a configuração.
- Outros MCPs configurados no Claude Code são entre você e esses servidores.
- O dashboard é local; não exponha a porta 8787 na internet sem autenticação e TLS na frente.
