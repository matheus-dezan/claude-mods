export type AgentRow = {
  id: string
  label: string
  type: string
  status: string
  parentId?: string
  firstSeen: number
  endedAt?: number
  tools: number
  lastTool?: string
  isHidden?: boolean
}

declare module 'claude-code' {
  interface PluginState {
    'agent-view': {
      rows: Shaped<AgentRow[]>
      now: number
      autoOpened: boolean
    }
  }
}
