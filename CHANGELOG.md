# Changelog (cópia matheus-dezan)

## extra-mods 0.8.0 — 2026-11-07

- O menu passa a se chamar **mods** (botão `◆ mods ▲`, comando novo `/mods`; `/tools` continua). O nome do plugin segue `extra-mods`, para não mudar a instalação, as preferências salvas nem a ferramenta `mcp__extra-mods__zen_progress`.
- Nova aba **Mods**, a primeira e a que abre por padrão: lista os mods do marketplace `dezan-mods` e os mods em desenvolvimento carregados na sessão, com estado, descrição e um botão para cada comando (que fecha o menu e roda o comando). Mod não instalado mostra a linha de instalação.

## agent-view 0.1.0 — 2026-11-07

- Novo mod `agent-view` (em `plugins/agent-view`): painel com a árvore de subagentes e teammates da sessão, com status, tempo, ferramentas chamadas e clique para abrir a transcrição de cada agente. Comando `/agent-view`. Instalação: `claude plugin install agent-view@dezan-mods`.

## 0.7.1 — 2026-11-07

- Temas: quando o "bright black" de um tema tem pouco contraste com o fundo (ex.: Tender Default, `#1d1d1d` sobre `#282828`), o cinza dos textos apagados (`inactive`) e o `brightBlack` do Windows Terminal passam a ser um cinza intermediário entre fundo e texto; a seleção do Windows Terminal também. Antes, dicas, rótulos e itens do menu ficavam da cor do fundo.
- Marketplace renomeado para `dezan-mods`, instalado de `matheus-dezan/claude-mods`.

## 0.7.0

- Versão original de Jhonatan de Souza (commit `a2f833c` de Jhonatan-de-Souza/ClaudeMods).
