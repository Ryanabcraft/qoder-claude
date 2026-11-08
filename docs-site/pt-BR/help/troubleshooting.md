# Solução de problemas

Comece por:

```bash
qclaude --status
```

Mostra versão, conta, failover, servidor, modelos e caminhos. O log fica ao lado da instalação
(`bridge.log`); a página Usage & Logs do dashboard mostra o final dele.

| sintoma | causa | correção |
|---|---|---|
| `claude` não é reconhecido | terminal aberto antes de atualizar o PATH | abra um terminal novo; o `qclaude` instala o Claude |
| `claude.exe is not compatible` | cópia npm quebrada | remova a cópia npm; o `qclaude` usa o build oficial |
| `Not logged in` | sessão Qoder expirou | `qodercli login` ou `qclaude account add <nome>` |
| conta errada respondendo | outro perfil ativo | `qclaude account current`, `qclaude account use <nome>`, reinicie a sessão |
| failover não dispara | rotação off ou só uma conta | `qclaude rotation` e `qclaude account list` |
| `WebSearch` não retorna nada | busca nativa atrás do gateway | veja Exa em Settings → Security; rode o instalador de novo |
| o modelo diz que não vê a imagem | motor de imagem faltando | `qclaude vision install` e reenvie a imagem |
| turno com imagem lento | o motor 1.1.80 não faz stream | normal uns 13 s; os textos seguintes são rápidos |
| porta em uso | outra bridge rodando | `qclaude --stop` ou mude `BRIDGE_PORT` |
| dashboard pede chave | `BRIDGE_API_KEY` definida | abra a URL pelo `qclaude`, que leva a chave no fragmento |
| update não detectado | cache da API/raw do GitHub | `qclaude update` força o tarball; espere um minuto |
| servidor não para no Ctrl+C | há uma janela separada do servidor | feche a janela ou rode `stop.cmd` / `stop.sh` |

## Logs

```bash
qclaude --status
```

O dashboard mostra as últimas 200 linhas com busca e download. O arquivo é `bridge.log` na pasta da
instalação.

## Reset

- Settings: edite ou apague `bridge.config.json`.
- Métricas: apague `metrics.jsonl`.
- Contas: `qclaude account remove <nome>`.
- Settings do Claude: `qclaude uninstall --dry-run` primeiro; o uninstaller faz backup das contas e
  remove só as chaves que escreveu.
