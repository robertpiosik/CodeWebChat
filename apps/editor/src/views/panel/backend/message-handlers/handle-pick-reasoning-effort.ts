import * as vscode from 'vscode'
import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { PickReasoningEffortMessage } from '@/views/panel/types/messages'

export const handle_pick_reasoning_effort = async (
  panel_provider: PanelProvider,
  message: PickReasoningEffortMessage
): Promise<void> => {
  const items: (vscode.QuickPickItem & { effort?: string })[] = [
    { label: 'Unset', effort: undefined },
    ...message.supported_efforts.map((effort) => ({
      label: effort.charAt(0).toUpperCase() + effort.slice(1),
      effort
    }))
  ]

  const quick_pick = vscode.window.createQuickPick()
  quick_pick.items = items
  quick_pick.title = 'Reasoning Efforts'
  quick_pick.placeholder = 'Choose a reasoning effort'

  if (message.current_effort) {
    const active_item = items.find((i) => i.effort === message.current_effort)
    if (active_item) quick_pick.activeItems = [active_item]
  } else {
    quick_pick.activeItems = [items[0]]
  }

  quick_pick.buttons = [
    {
      iconPath: new vscode.ThemeIcon('close'),
      tooltip: 'Close'
    }
  ]

  quick_pick.onDidTriggerButton((button) => {
    if (button.tooltip == 'Close') {
      quick_pick.hide()
    }
  })

  return new Promise<void>((resolve) => {
    quick_pick.onDidAccept(() => {
      const selected = quick_pick.selectedItems[0] as any
      if (selected) {
        panel_provider.send_message({
          command: 'NEWLY_PICKED_REASONING_EFFORT',
          effort: selected.effort
        })
      }
      quick_pick.hide()
    })

    quick_pick.onDidHide(() => {
      quick_pick.dispose()
      resolve()
    })

    quick_pick.show()
  })
}
