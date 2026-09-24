import * as vscode from 'vscode'
import { PromptViewProvider } from '../prompt-view-provider'
import { AGENTS } from '@/constants/agents'
import { t } from '@/i18n'

export const handle_pick_agent = async (
  provider: PromptViewProvider,
  message: any
): Promise<void> => {
  const agents = Object.keys(AGENTS)
  const items: vscode.QuickPickItem[] = agents.map((agent) => ({
    label: agent
  }))

  const quick_pick = vscode.window.createQuickPick()
  quick_pick.items = items
  quick_pick.title = t('common.title.agents')
  quick_pick.placeholder = t(
    'views.shared.actions.agent.create.agents.placeholder'
  )
  quick_pick.buttons = [
    {
      iconPath: new vscode.ThemeIcon('close'),
      tooltip: t('common.close')
    }
  ]

  let accepted = false
  const disposables: vscode.Disposable[] = []

  disposables.push(
    quick_pick.onDidTriggerButton(() => {
      quick_pick.hide()
    }),
    quick_pick.onDidAccept(() => {
      accepted = true
      const agent = quick_pick.selectedItems[0]?.label
      quick_pick.hide()
      if (agent) {
        provider.send_message({
          command: 'NEWLY_PICKED_AGENT',
          agent_id: agent
        })
      }
    }),
    quick_pick.onDidHide(() => {
      disposables.forEach((d) => d.dispose())
      quick_pick.dispose()
    })
  )

  quick_pick.show()
}
