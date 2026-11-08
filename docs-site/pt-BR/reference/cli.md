# Referência da CLI

O `qclaude` sobe a bridge, abre o dashboard e abre o Claude Code. Argumentos extras vão para o
`claude`.

## Comandos

| comando | ação |
|---|---|
| `qclaude` | bridge, dashboard e Claude Code |
| `qclaude -p "..."` | repassa tudo ao `claude` |
| `qclaude --model X` | repassa ao `claude` |
| `qclaude --account <nome>` | abre com uma conta específica |
| `qclaude --status` | versão, conta, failover, servidor, modelos, caminhos |
| `qclaude --serve` | só o servidor, em primeiro plano |
| `qclaude --window` | servidor numa janela própria |
| `qclaude --no-browser` | não abre o dashboard |
| `qclaude --no-update` | pula a checagem de update |
| `qclaude --stop` | para o servidor |
| `qclaude update` | instala a versão mais nova |
| `qclaude notes [versão]` | imprime o changelog |
| `qclaude quota [nome]` | créditos, restante, consumo e previsão |
| `qclaude quota --json` | snapshot de cota legível por máquina |
| `qclaude uninstall [flags]` | remove app, launcher e settings do instalador |
| `qclaude account ...` | gerencia perfis Qoder |
| `qclaude rotation [on\|off]` | mostra ou muda o failover |
| `qclaude vision [install]` | status ou instalação do motor de imagem |

`qclaude --help` imprime a mesma lista.

## Contas

```bash
qclaude account list
qclaude account add trabalho
qclaude account use trabalho
qclaude account pause trabalho
qclaude account resume trabalho
qclaude account remove trabalho
qclaude account current
```

## Quota

```bash
qclaude quota                 # todas as contas
qclaude quota trabalho        # uma conta
qclaude quota --refresh       # ignora o cache de 60s
qclaude quota --json          # snapshot completo
```

As porcentagens vêm de `used / total`; a Qoder manda frações (`0.68` = 68%). O token é decifrado
localmente e só vai no header Authorization para `openapi.qoder.sh`.

## Flags do uninstall

```bash
qclaude uninstall --dry-run
qclaude uninstall --yes
qclaude uninstall --project <dir>
qclaude uninstall --no-backup
qclaude uninstall --remove-exa
```

As contas são copiadas antes de apagar. MCPs e `permissions.allow` ficam. Checkout do código é
recusado.

## Atalhos de ambiente

| variável | efeito |
|---|---|
| `QODER_NO_UPDATE=1` | pula a checagem de update |
| `QODER_NO_EXA=1` | pula a configuração do Exa |
| `BRIDGE_PORT` | porta; o launcher também usa |
| `BRIDGE_API_KEY` | exige chave na API e no dashboard |
