import * as vscode from 'vscode'
import { ShowQuickPickMessage } from '@/views/main/types/messages'

export const handle_show_quick_pick = async (
  message: ShowQuickPickMessage
): Promise<void> => {
  const quick_pick_items = message.items.map((item) => ({
    label: item.label,
    description: item.description,
    detail: item.detail
  }))

  const selected_item = await vscode.window.showQuickPick(quick_pick_items, {
    placeHolder: message.title,
    matchOnDescription: true,
    matchOnDetail: true
  })

  if (selected_item) {
    const selected_command = message.items.find(
      (item) => item.label == selected_item.label
    )?.command

    if (selected_command) {
      vscode.commands.executeCommand(selected_command)
    }
  }
}
