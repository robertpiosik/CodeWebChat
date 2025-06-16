import * as vscode from 'vscode'
import { MainViewProvider } from '../view-provider'
import { LAST_CHOSEN_COMMAND_BY_VIEW_TYPE_STATE_KEY } from '../../../../constants/state-keys'

export const handle_show_quick_actions = async (
  provider: MainViewProvider
): Promise<void> => {
  const commands = [
    ...(provider.home_view_type == 'Web'
      ? [
          {
            label: 'Apply chat response',
            detail:
              'Integrate with the codebase an overall chat response or just a single code block',
            command: 'codeWebChat.applyChatResponse'
          }
        ]
      : []),
    {
      label: 'Revert Last Changes',
      detail: 'Restore saved state of the codebase',
      command: 'codeWebChat.revert'
    },
    {
      label: 'Commit Changes',
      detail: 'Generate commit message and create a commit',
      command: 'codeWebChat.commitChanges'
    }
  ]

  const last_chosen_commands = provider.context.workspaceState.get<
    Record<string, string>
  >(LAST_CHOSEN_COMMAND_BY_VIEW_TYPE_STATE_KEY, {})

  const last_chosen_command_of_view_type =
    last_chosen_commands[provider.home_view_type]

  const quick_pick = vscode.window.createQuickPick()
  const quick_pick_items = commands.map((item) => ({
    label: item.label,
    detail: item.detail,
    command: item.command
  }))

  quick_pick.items = quick_pick_items
  quick_pick.placeholder = 'Select quick action'
  quick_pick.matchOnDescription = true
  quick_pick.matchOnDetail = true

  if (last_chosen_command_of_view_type) {
    const last_item = quick_pick_items.find(
      (item) => item.command === last_chosen_command_of_view_type
    )
    if (last_item) {
      quick_pick.activeItems = [last_item]
    }
  }

  if (!quick_pick.activeItems.length && quick_pick_items.length > 0) {
    quick_pick.activeItems = [quick_pick_items[0]]
  }

  return new Promise<void>((resolve) => {
    quick_pick.onDidAccept(async () => {
      const selected = quick_pick.selectedItems[0] as any
      quick_pick.hide()

      if (selected) {
        const updated_last_chosen_commands = {
          ...last_chosen_commands,
          [provider.home_view_type]: selected.command
        }

        await provider.context.workspaceState.update(
          LAST_CHOSEN_COMMAND_BY_VIEW_TYPE_STATE_KEY,
          updated_last_chosen_commands
        )

        vscode.commands.executeCommand(selected.command)
      }
      resolve()
    })

    quick_pick.onDidHide(() => {
      quick_pick.dispose()
      resolve()
    })

    quick_pick.show()
  })
}
