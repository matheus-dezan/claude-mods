import { expect, test } from 'claude-code/testing'

const PANE = {
  plugin: 'agent-view',
  component: 'Pane',
  requestId: 'agent-view',
  props: {
    title: 'Agentes',
    isFocused: false,
    bodyColumns: 60,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 30 },
    view: {},
  },
} as const

const AGENTS = [
  {
    id: 'a1',
    description: 'Pesquisar precedentes',
    type: 'Explore',
    status: 'running',
  },
  {
    id: 'a2',
    description: 'Ler acórdão',
    type: 'general-purpose',
    status: 'completed',
    parentId: 'a1',
  },
]

test('o painel mostra a árvore de agentes em toda superfície', async ($, on) => {
  on('command.register', () => ({ value: { command: 'agent-view' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('agent.list', () => ({ value: AGENTS }))
  on('clock.now', () => ({ value: 1_000_000 }))
  on('clock.every', () => ({ value: { cancel: () => undefined } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('command.run', () => ({ text: '' }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.command.run({ command: 'agent-view', args: '' })

  for (const surface of ['terminal', 'desktop', 'vscode', 'mobile'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect(
      (await ui.find({ type: 'Text', text: /Pesquisar precedentes/ }))?.text,
    ).toBe('Pesquisar precedentes')
    expect(
      (await ui.find({ type: 'Text', text: /Ler acórdão/ }))?.text,
    ).toBe('Ler acórdão')
    expect(await ui.find({ type: 'Button', key: 'agent-a1' })).toBeTruthy()
    expect(await ui.find({ type: 'Button', key: 'clear' })).toBeTruthy()
    await ui.unmount()
  }
})

test('sem agentes, o painel diz que não há nenhum', async ($, on) => {
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /Nenhum/ }))?.text).toBe(
    'Nenhum subagente nesta sessão ainda.',
  )
  await ui.unmount()
})
