import * as vscode from 'vscode'
import {
  HISTORY_ASK_STATE_KEY,
  HISTORY_CODE_COMPLETIONS_STATE_KEY,
  HISTORY_EDIT_STATE_KEY,
  HISTORY_NO_CONTEXT_STATE_KEY
} from '@/constants/state-keys'
import { ViewProvider } from '@/view/backend/view-provider'
import { HOME_VIEW_TYPES } from '@/view/types/home-view-type'
import { InstructionsMessage } from '@/view/types/messages'
import { ApiMode, WebMode } from '@shared/types/modes'
import { handle_get_history } from './handle-get-history'

export const handle_show_history_quick_pick = async (
  provider: ViewProvider
): Promise<void> => {
  const mode: WebMode | ApiMode | undefined =
    provider.home_view_type == HOME_VIEW_TYPES.WEB
      ? provider.web_mode
      : provider.api_mode

  if (!mode) {
    return
  }

  let history_key: string | undefined
  switch (mode) {
    case 'ask':
      history_key = HISTORY_ASK_STATE_KEY
      break
    case 'edit':
      history_key = HISTORY_EDIT_STATE_KEY
      break
    case 'code-completions':
      history_key = HISTORY_CODE_COMPLETIONS_STATE_KEY
      break
    case 'no-context':
      history_key = HISTORY_NO_CONTEXT_STATE_KEY
      break
  }

  if (!history_key) return

  let history =
    provider.context.workspaceState.get<string[]>(history_key, []) || []

  if (!history.length) {
    vscode.window.showInformationMessage(
      'No history to show for the current mode.'
    )
    return
  }

  const quick_pick = vscode.window.createQuickPick()
  quick_pick.placeholder = 'Search chat history'

  const to_quick_pick_item = (text: string): vscode.QuickPickItem => ({
    label: text,
    buttons: [
      {
        iconPath: new vscode.ThemeIcon('trash'),
        tooltip: 'Delete from history'
      }
    ]
  })

  quick_pick.items = history.map(to_quick_pick_item)

  const disposables: vscode.Disposable[] = []

  disposables.push(
    quick_pick.onDidAccept(async () => {
      const [selected_item] = quick_pick.selectedItems
      if (selected_item) {
        let instruction_key: string
        switch (mode) {
          case 'ask':
            provider.ask_instructions = selected_item.label
            instruction_key = 'ask-instructions'
            break
          case 'edit':
            provider.edit_instructions = selected_item.label
            instruction_key = 'edit-instructions'
            break
          case 'no-context':
            provider.no_context_instructions = selected_item.label
            instruction_key = 'no-context-instructions'
            break
          case 'code-completions':
            provider.code_completions_instructions = selected_item.label
            instruction_key = 'code-completions-instructions'
            break
          default:
            quick_pick.hide()
            return
        }

        await provider.context.workspaceState.update(
          instruction_key,
          selected_item.label
        )
        provider.send_message<InstructionsMessage>({
          command: 'INSTRUCTIONS',
          ask: provider.ask_instructions,
          edit: provider.edit_instructions,
          no_context: provider.no_context_instructions,
          code_completions: provider.code_completions_instructions
        })
      }
      quick_pick.hide()
    }),
    quick_pick.onDidTriggerItemButton(async (e) => {
      const item_to_delete = e.item
      history = history.filter((h) => h != item_to_delete.label)
      await provider.context.workspaceState.update(history_key, history)
      quick_pick.items = history.map(to_quick_pick_item)
      handle_get_history(provider)
    }),
    quick_pick.onDidHide(() => {
      disposables.forEach((d) => d.dispose())
    })
  )

  quick_pick.show()
}
