# qoder-claude (Português)

Rode o **Claude Code** nos modelos do **Qoder**. Uma API local compatível com a Anthropic que
mantém suas ferramentas, prompts e atalhos, e manda o tráfego do modelo para o seu plano Qoder.

**Site:** https://ryanabcraft.github.io/qoder-claude/

**Made by:** [Ryanabcraft](https://github.com/Ryanabcraft)

```
Claude Code  →  qoder-bridge  →  api1.qoder.sh
```

## Instalação

Um comando, qualquer SO (precisa de Node 20+):

```bash
npx -y github:Ryanabcraft/qoder-claude
```

Sem Node, use o instalador da sua plataforma:

```cmd
curl -fsSL https://raw.githubusercontent.com/Ryanabcraft/qoder-claude/main/install.cmd -o install.cmd && install.cmd && del install.cmd
```

```powershell
irm https://raw.githubusercontent.com/Ryanabcraft/qoder-claude/main/install.ps1 | iex
```

```bash
curl -fsSL https://raw.githubusercontent.com/Ryanabcraft/qoder-claude/main/install.sh | bash
```

Ele instala o Node quando falta, o Qoder CLI, o Claude Code, o motor de visão, o
`~/.claude/settings.json` global, o comando `qclaude` e faz o health check. Nenhum servidor fica
rodando.

## Abrir

```bash
qclaude
```

Sobe a bridge, abre o dashboard em <http://127.0.0.1:8787/ui> e abre o Claude Code. Fechar o
Claude — `/exit`, Ctrl+C ou fechar o terminal — encerra a bridge.

| comando | o que faz |
|---|---|
| `qclaude` | bridge + dashboard + Claude Code |
| `qclaude -p "..."` | repassa tudo ao `claude` |
| `qclaude --status` | servidor, conta e modelos |
| `qclaude --no-browser` | sem a aba do dashboard |
| `qclaude --serve` | só o servidor, em primeiro plano |
| `qclaude --stop` | derruba o servidor |

## O que funciona

- `Read`, `Write`, `Edit`, `Glob`, `Grep`, `Bash`, `Agent` e servidores MCP — executados pelo
  Claude Code, sem mudança.
- `WebSearch` / `WebFetch` — tools deferred ganham schema; a busca vai pelo Exa quando esse MCP
  está configurado.
- Prints — cole uma imagem e o modelo lê (`qclaude vision install`).
- `/model`, slider de esforço, orçamento de pensamento, contexto de 1M — o instalador cuida.
- Statusline `Qoder · <modelo>`.

## Contas

```bash
qclaude account add trabalho   # login no navegador, perfil isolado
qclaude account list           # estado de cada perfil
qclaude account use trabalho   # ativa a partir de agora
qclaude rotation               # pool de failover
```

A cota é por conta. Com mais de uma, a bridge faz failover sozinha: cota, `403`, `429` ou sessão
perdida pausam aquela conta e a mesma requisição roda na próxima.

## Limites

- **1–2 s por turno** no caminho direto; ~2 s no primeiro request após o start.
- Chamada de ferramenta custa um round-trip extra (3–5 s). Busca web leva 4–15 s.
- Turnos com imagem rodam no motor 1.1.80 embutido, levam ~13 s e não são streamados. Turnos de
  texto não mudam.
- O histórico inteiro vai em cada request. 1M de contexto torna isso viável, não gratuito.
- Recusas do provedor passam intactas.

## Se der problema

| Sintoma | Correção |
|---|---|
| `claude` não encontrado | abra um terminal novo; o `qclaude` instala |
| `Not logged in` | `qclaude account add <nome>` |
| Conta errada respondendo | `qclaude account current` e reinicie a sessão |
| Failover não dispara | `qclaude rotation` — veja `on` e as outras contas |
| `claude.exe is not compatible...` | cópia npm quebrada; o `qclaude` ignora e usa a oficial |

## Docs

- Atualizar: `update.cmd` (Windows) ou `update.sh` (macOS/Linux) — atualiza no lugar
- [SETUP_pt_BR.md](SETUP_pt_BR.md) — instalação do zero, passos manuais
- [docs/internals.md](../docs/internals.md) — transportes, sessões, configuração, endpoints (em inglês)
- [README EN](../README.md) · [Contribuindo](../CONTRIBUTING.md) · [MIT](../LICENSE)
