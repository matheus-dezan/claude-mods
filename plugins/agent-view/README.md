# agent-view

Painel lateral do Claude Code com os subagentes e teammates da sessão, em árvore (cada agente abaixo de quem o criou).

Cada linha mostra:

- o status: `●` rodando, `◐` aguardando, `○` ocioso, `✓` concluído, `✗` falhou, `■` parado;
- a descrição ou o nome do agente, o tipo (Explore, general-purpose…), o tempo decorrido e quantas ferramentas ele chamou;
- enquanto o agente está ativo, a última ferramenta que ele usou.

## Uso

- `/agent-view` abre o painel. Ele também abre sozinho na primeira vez que um subagente surge na sessão (no terminal, a partir de cerca de 144 colunas).
- Clique num agente para abrir a transcrição dele na tela principal; **← voltar à conversa principal** retorna.
- **limpar encerrados** esconde os agentes que já terminaram.

A lista se atualiza a cada segundo enquanto há agente ativo e a cada 5 segundos fora disso. Se a contagem falhar, as chamadas de ferramenta dos agentes seguem normalmente.

## Instalação

No prompt de uma sessão do Claude Code no terminal:

```
/plugin install agent-view --marketplace matheus-dezan/claude-mods
```

Responda `y` para adicionar o marketplace e escolha o escopo (user, com Enter).

Pelo shell:

```
claude plugin install agent-view --marketplace matheus-dezan/claude-mods
```

No app desktop, onde `/plugin` não roda: clique em **+** ao lado da caixa do prompt, depois **Plugins**, **Add marketplace** com `matheus-dezan/claude-mods`, e **Add plugin**.

O repositório é privado: a instalação só funciona para quem tem acesso a ele no GitHub e já tem uma credencial do git para o github.com nesta máquina (uma chave SSH, ou `gh auth login` seguido de `gh auth setup-git`). A instalação não pede essa credencial.

Para atualizar: `claude plugin marketplace update dezan-mods && claude plugin update agent-view@dezan-mods`

## Desenvolver

```
claude plugin validate plugins/agent-view
claude plugin test plugins/agent-view
```
