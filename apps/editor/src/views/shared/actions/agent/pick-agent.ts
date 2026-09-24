import * as vscode from 'vscode'
import { AGENTS } from '@/constants/agents'
import { t } from '@/i18n'

export const pick_agent = async (params: {
  current_agent_id?: string
}): Promise<keyof typeof AGENTS | undefined> => {
  const agents = Object.entries(AGENTS)

  const items: vscode.QuickPickItem[] = agents.map(([agent]) => ({
    label: agent
  }))

  const quick_pick = vscode.window.createQuickPick()
  quick_pick.items = items
  quick_pick.title = t('common.title.agents')
  quick_pick.placeholder = t(
    'views.shared.actions.agent.pick-agent.placeholder'
  )
  quick_pick.buttons = [
    {
      iconPath: new vscode.ThemeIcon('close'),
      tooltip: t('common.close')
    }
  ]

  if (params.current_agent_id) {
    const active_item = items.find(
      (item) => item.label == params.current_agent_id
    )
    if (active_item) {
      quick_pick.activeItems = [active_item]
    }
  }

  quick_pick.onDidTriggerButton((button) => {
    if (button.tooltip === t('common.close')) {
      quick_pick.hide()
    }
  })

  return new Promise<keyof typeof AGENTS | undefined>((resolve) => {
    let accepted = false
    quick_pick.onDidAccept(() => {
      accepted = true
      const selected = quick_pick.selectedItems[0]?.label as
        | keyof typeof AGENTS
        | undefined
      quick_pick.hide()
      resolve(selected)
    })

    quick_pick.onDidHide(() => {
      if (!accepted) resolve(undefined)
      quick_pick.dispose()
    })

    quick_pick.show()
  })
}