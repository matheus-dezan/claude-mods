import { atom, read, update } from 'claude-code'
import type { AgentInfo, EngineInterface, Register } from 'claude-code'

import type { AgentRow } from '../types'

const PANE = 'agent-view'
const TITLE = 'Agentes'
const KEEP = 60

// Troque a etiqueta quando os campos de AgentRow mudarem: ela recusa o que
// uma versão anterior guardou, que sobrevive ao recarregamento.
const rows = atom({ plugin: 'agent-view', key: 'rows' } as const, [], {
  shape: 'rows-1',
})
const clockNow = atom({ plugin: 'agent-view', key: 'now' } as const, 0)
const autoOpened = atom(
  { plugin: 'agent-view', key: 'autoOpened' } as const,
  false,
)

const ACTIVE = new Set(['pending', 'running', 'waiting'])
const ENDED = new Set(['completed', 'failed', 'killed'])

const ICON: Record<string, { glyph: string; color: string }> = {
  pending: { glyph: '…', color: 'subtle' },
  running: { glyph: '●', color: 'claude' },
  waiting: { glyph: '◐', color: 'warning' },
  idle: { glyph: '○', color: 'suggestion' },
  completed: { glyph: '✓', color: 'success' },
  failed: { glyph: '✗', color: 'error' },
  killed: { glyph: '■', color: 'inactive' },
}

const STATUS_PT: Record<string, string> = {
  pending: 'na fila',
  running: 'rodando',
  waiting: 'aguardando',
  idle: 'ocioso',
  completed: 'concluído',
  failed: 'falhou',
  killed: 'parado',
}

function labelOf(a: AgentInfo): string {
  const desc = a.description?.trim()
  if (a.name && desc) return `${a.name}: ${desc}`
  return a.name || desc || a.type || a.id
}

function elapsed(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000))
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m${String(s % 60).padStart(2, '0')}s`
  return `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}m`
}

function clip(text: string, width: number): string {
  if (width <= 1) return ''
  return text.length > width ? text.slice(0, width - 1) + '…' : text
}

/** Junta o retrato de `$.agent.list()` às linhas guardadas. */
function merge(prev: AgentRow[], list: AgentInfo[], now: number): AgentRow[] {
  const byId = new Map(prev.map(r => [r.id, r]))
  const seen = new Set<string>()
  const out: AgentRow[] = []

  for (const a of list) {
    seen.add(a.id)
    const old = byId.get(a.id)
    const isEnded = ENDED.has(a.status)
    out.push({
      id: a.id,
      label: labelOf(a),
      type: a.type,
      status: a.status,
      parentId: a.parentId,
      firstSeen: old?.firstSeen ?? now,
      endedAt: isEnded ? (old?.endedAt ?? now) : undefined,
      tools: old?.tools ?? 0,
      lastTool: old?.lastTool,
      isHidden: old?.isHidden,
    })
  }

  // O motor descarta agentes encerrados algum tempo depois; mantemos o último
  // estado conhecido para o histórico da sessão.
  for (const r of prev) {
    if (seen.has(r.id)) continue
    out.push(
      ENDED.has(r.status)
        ? r
        : { ...r, status: 'completed', endedAt: r.endedAt ?? now },
    )
  }

  out.sort((a, b) => a.firstSeen - b.firstSeen)
  return out.slice(-KEEP)
}

async function refresh($: EngineInterface): Promise<void> {
  const [list, now] = await Promise.all([$.agent.list(), $.clock.now()])
  await update($, rows, prev => {
    const next = merge(prev ?? [], list, now)
    return JSON.stringify(next) === JSON.stringify(prev) ? prev : next
  })
  if (list.some(a => ACTIVE.has(a.status))) {
    await update($, clockNow, () => now)
  }
}

/** Ordena em árvore: cada agente logo abaixo de quem o criou. */
function asTree(list: AgentRow[]): { row: AgentRow; depth: number }[] {
  const ids = new Set(list.map(r => r.id))
  const kids = new Map<string, AgentRow[]>()
  const roots: AgentRow[] = []
  for (const r of list) {
    if (r.parentId && ids.has(r.parentId)) {
      kids.set(r.parentId, [...(kids.get(r.parentId) ?? []), r])
    } else {
      roots.push(r)
    }
  }
  const out: { row: AgentRow; depth: number }[] = []
  const walk = (r: AgentRow, depth: number) => {
    out.push({ row: r, depth })
    for (const k of kids.get(r.id) ?? []) walk(k, depth + 1)
  }
  for (const r of roots) walk(r, 0)
  return out
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'agent-view',
      description: 'Abre o painel com os subagentes e teammates da sessão',
    })

    // Atualiza a cada segundo enquanto houver agente ativo; senão, a cada 5 s.
    let tick = 0
    $.clock.every(1000, () => {
      tick += 1
      void (async () => {
        const list = await read($, rows)
        const isBusy = list.some(r => ACTIVE.has(r.status))
        if (isBusy || tick % 5 === 0) await refresh($)
      })().catch(() => undefined)
    })

    void refresh($).catch(() => undefined)
    return next(e)
  })

  on('command.run', { command: 'agent-view' }, async $ => {
    await refresh($)
    await $.ui.open({ id: PANE, title: TITLE })
    return { text: 'Painel de agentes aberto.' }
  })

  // Um agente novo: atualiza e abre o painel na primeira vez da sessão.
  on('agent.spawn', async ($, e, next) => {
    const result = await next(e)
    await refresh($)
    if (!(await read($, autoOpened))) {
      await update($, autoOpened, () => true)
      void $.ui.open({ id: PANE, title: TITLE })
    }
    return result
  }).catch(($, e, next) => next(e)) // falha de exibição nunca barra o agente

  // Conta as ferramentas que cada subagente chama.
  on('tool.call', async ($, e, next) => {
    const agentId = e.agentId
    if (agentId) {
      try {
        const list = await read($, rows)
        if (!list.some(r => r.id === agentId)) await refresh($)
        await update($, rows, prev =>
          (prev ?? []).map(r =>
            r.id === agentId
              ? { ...r, tools: r.tools + 1, lastTool: e.tool }
              : r,
          ),
        )
      } catch {
        // A contagem é só exibição: nunca segura a chamada da ferramenta.
      }
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    if (e.agentId) void refresh($).catch(() => undefined)
    return result
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Button, Text } = $.ui.resolve(e)
    const list = (await read($, rows)).filter(r => !r.isHidden)
    const now = Math.max(await read($, clockNow), ...list.map(r => r.firstSeen))
    const width = Math.max(20, e.props.bodyColumns)
    const viewing = e.props.view.agentId

    const active = list.filter(r => ACTIVE.has(r.status)).length
    const idle = list.filter(r => r.status === 'idle').length
    const done = list.filter(r => ENDED.has(r.status)).length

    const goTo = async (agentId?: string) => {
      const res = await $.ui.view(agentId ? { agentId } : {})
      if (res && 'deny' in res && res.deny) {
        $.ui.toast(`Não foi possível abrir: ${res.deny}`)
      }
    }

    const tree = asTree(list)
    const room = Math.max(1, e.props.scroll.bodyRows - 4)

    return (
      <Box flexDirection="column">
        <Box>
          <Text>
            <Text color="claude" bold>
              {active}
            </Text>
            <Text dimColor> ativos · </Text>
            <Text color="suggestion">{idle}</Text>
            <Text dimColor> ociosos · </Text>
            <Text color="success">{done}</Text>
            <Text dimColor> encerrados</Text>
          </Text>
        </Box>

        {viewing && (
          <Button key="main" plain onPress={() => goTo()}>
            <Text color="suggestion">← voltar à conversa principal</Text>
          </Button>
        )}

        {list.length === 0 && (
          <Text dimColor>Nenhum subagente nesta sessão ainda.</Text>
        )}

        {tree.slice(-room).map(({ row, depth }) => {
          const icon = ICON[row.status] ?? { glyph: '?', color: 'subtle' }
          const indent = '  '.repeat(Math.min(depth, 6))
          const isViewed = row.id === viewing
          const time = elapsed((row.endedAt ?? now) - row.firstSeen)
          const meta = [
            row.type,
            STATUS_PT[row.status] ?? row.status,
            time,
            `${row.tools} ferr.`,
            row.lastTool && ACTIVE.has(row.status) ? row.lastTool : undefined,
          ]
            .filter(Boolean)
            .join(' · ')
          const head = clip(row.label, width - indent.length - 3)
          const tail = clip(meta, width - indent.length - 3)

          return (
            <Button
              key={`agent-${row.id}`}
              plain
              onPress={() => goTo(row.id)}
            >
              {indent}
              <Text color={icon.color}>{icon.glyph}</Text>{' '}
              <Text bold={isViewed} inverse={isViewed}>
                {head}
              </Text>
              {'\n'}
              {indent}
              {'  '}
              <Text dimColor>{tail}</Text>
            </Button>
          )
        })}

        {done > 0 && (
          <Button
            key="clear"
            plain
            onPress={() =>
              update($, rows, prev =>
                (prev ?? []).map(r =>
                  ENDED.has(r.status) ? { ...r, isHidden: true } : r,
                ),
              )
            }
          >
            <Text dimColor>limpar encerrados</Text>
          </Button>
        )}
      </Box>
    )
  })
}
