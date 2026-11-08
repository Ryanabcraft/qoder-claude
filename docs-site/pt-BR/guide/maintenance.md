# Atualizar e desinstalar

## Atualizar

O `qclaude` verifica uma versão nova ao abrir e pergunta antes de atualizar. Uma versão recusada não
é perguntada de novo.

```bash
qclaude update          # verifica e instala a versão mais nova
qclaude notes           # changelog da versão instalada
qclaude notes 1.11.1    # changelog de uma versão específica
```

Depois de atualizar, a versão nova imprime as notas, no máximo dez linhas. A checagem usa a API do
GitHub e cai para o arquivo raw. O `qclaude update` baixa o tarball da branch direto e não depende
desse cache.

`QODER_NO_UPDATE=1` ou `qclaude --no-update` pula a checagem naquela execução.

O updater preserva `accounts/`, `accounts.json`, `tools/`, `bridge.config.json`, `metrics.jsonl` e os
logs.

## Desinstalar

```bash
qclaude uninstall --dry-run    # lista o que sairia
qclaude uninstall              # pede confirmação
qclaude uninstall --yes        # sem prompt
```

Remove a pasta do app, o launcher, a entrada de PATH no Windows e só os settings do Claude que o
instalador escreveu. As contas vão para `~/.qoder-claude-accounts-<hora>` antes.

Flags:

| flag | efeito |
|---|---|
| `--project <dir>` | limpa também `<dir>/.claude/settings.json` |
| `--no-backup` | pula o backup das contas |
| `--remove-exa` | remove o MCP Exa só quando a URL é a do qoder-claude |

Ficam por padrão: MCPs do `~/.claude.json`, `permissions.allow`, Claude Code, o CLI do Qoder e o
login. Um checkout do código é recusado.

A mesma coisa está na [referência da CLI](/pt-BR/reference/cli).
