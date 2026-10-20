import * as vscode from 'vscode'
import { t } from '@/i18n'
import { AGENTS } from '@/constants/agents'

export const pick_example_flags = async (params: {
  agent: string
}): Promise<string | undefined> => {
  const agent_config = AGENTS[params.agent as keyof typeof AGENTS]
  if (!agent_config?.example_flags.length) {
    return undefined
  }

  const items: vscode.QuickPickItem[] = agent_config.example_flags.map(
    (flag: string) => ({
      label: flag
    })
  )

  const quick_pick = vscode.window.createQuickPick()
  quick_pick.items = items
  quick_pick.title = t('views.shared.actions.agent.pick-example-flags.title')
  quick_pick.placeholder = t(
    'views.shared.actions.agent.pick-example-flags.title'
  )
  quick_pick.buttons = [
    {
      iconPath: new vscode.ThemeIcon('close'),
      tooltip: t('common.close')
    }
  ]

  quick_pick.onDidTriggerButton((button) => {
    if (button.tooltip === t('common.close')) {
      quick_pick.hide()
    }
  })

  return new Promise<string | undefined>((resolve) => {
    let accepted = false
    quick_pick.onDidAccept(() => {
      accepted = true
      const selected = quick_pick.selectedItems[0]?.label
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
