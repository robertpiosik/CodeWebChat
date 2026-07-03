import * as vscode from 'vscode'
import { PanelProvider } from '../panel-provider'
import { PickTasksWorkspaceMessage } from '../../types/messages'

export const handle_pick_tasks_workspace = async (
  panel_provider: PanelProvider,
  message: PickTasksWorkspaceMessage
) => {
  const items: vscode.QuickPickItem[] = message.roots.map((root) => ({
    label: root.split(/[\\/]/).pop() || root,
    description: root
  }))

  const quick_pick = vscode.window.createQuickPick()
  quick_pick.items = items
  quick_pick.placeholder = 'Select workspace folder for tasks'
  quick_pick.matchOnDescription = true
  quick_pick.title = 'Workspace Folders'
  quick_pick.buttons = [
    { iconPath: new vscode.ThemeIcon('close'), tooltip: 'Close' }
  ]

  if (message.active_root) {
    const active_item = items.find(
      (item) => item.description === message.active_root
    )
    if (active_item) {
      quick_pick.activeItems = [active_item]
    }
  }

  const selected = await new Promise<vscode.QuickPickItem | undefined>(
    (resolve) => {
      let is_accepted = false
      quick_pick.onDidTriggerButton(() => {
        quick_pick.hide()
      })
      quick_pick.onDidAccept(() => {
        is_accepted = true
        resolve(quick_pick.selectedItems[0])
        quick_pick.hide()
      })
      quick_pick.onDidHide(() => {
        if (!is_accepted) {
          resolve(undefined)
        }
        quick_pick.dispose()
      })
      quick_pick.show()
    }
  )

  if (selected && selected.description) {
    panel_provider.send_message({
      command: 'TASKS_WORKSPACE_PICKED',
      root: selected.description
    })
  }
}
