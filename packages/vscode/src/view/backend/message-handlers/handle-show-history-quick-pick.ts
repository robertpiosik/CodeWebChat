import * as vscode from 'vscode'
import {
  HISTORY_ASK_STATE_KEY,
  HISTORY_CODE_COMPLETIONS_STATE_KEY,
  HISTORY_EDIT_STATE_KEY,
  HISTORY_NO_CONTEXT_STATE_KEY,
  PINNED_HISTORY_ASK_STATE_KEY,
  PINNED_HISTORY_CODE_COMPLETIONS_STATE_KEY,
  PINNED_HISTORY_EDIT_STATE_KEY,
  PINNED_HISTORY_NO_CONTEXT_STATE_KEY
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

  let history_key: string | undefined, pinned_history_key: string | undefined
  switch (mode) {
    case 'ask':
      history_key = HISTORY_ASK_STATE_KEY
      pinned_history_key = PINNED_HISTORY_ASK_STATE_KEY
      break
    case 'edit':
      history_key = HISTORY_EDIT_STATE_KEY
      pinned_history_key = PINNED_HISTORY_EDIT_STATE_KEY
      break
    case 'code-completions':
      history_key = HISTORY_CODE_COMPLETIONS_STATE_KEY
      pinned_history_key = PINNED_HISTORY_CODE_COMPLETIONS_STATE_KEY
      break
    case 'no-context':
      history_key = HISTORY_NO_CONTEXT_STATE_KEY
      pinned_history_key = PINNED_HISTORY_NO_CONTEXT_STATE_KEY
      break
  }

  if (!history_key || !pinned_history_key) return

  let history =
    provider.context.workspaceState.get<string[]>(history_key, []) || []
  let pinned_history =
    provider.context.workspaceState.get<string[]>(pinned_history_key, []) || []

  if (!history.length && !pinned_history.length) {
    vscode.window.showInformationMessage(
      'No history to show for the current mode.'
    )
    return
  }

  const quick_pick = vscode.window.createQuickPick()
  quick_pick.placeholder = 'Search chat history'

  const to_quick_pick_item = (
    text: string,
    is_pinned: boolean,
    pinned_index?: number,
    total_pinned?: number
  ): vscode.QuickPickItem => ({
    label: text,
    buttons: [
      ...(is_pinned &&
      pinned_index !== undefined &&
      total_pinned !== undefined &&
      total_pinned > 1
        ? [
            ...(pinned_index > 0
              ? [
                  {
                    iconPath: new vscode.ThemeIcon('chevron-up'),
                    tooltip: 'Move up'
                  }
                ]
              : []),
            ...(pinned_index < total_pinned - 1
              ? [
                  {
                    iconPath: new vscode.ThemeIcon('chevron-down'),
                    tooltip: 'Move down'
                  }
                ]
              : [])
          ]
        : []),
      ...(!is_pinned
        ? [
            {
              iconPath: new vscode.ThemeIcon('pinned'),
              tooltip: 'Pin this entry'
            }
          ]
        : []),
      {
        iconPath: new vscode.ThemeIcon('trash'),
        tooltip: is_pinned ? 'Delete from pinned' : 'Delete from history'
      }
    ]
  })

  const items: vscode.QuickPickItem[] = []

  if (pinned_history.length > 0) {
    items.push({
      label: 'Pinned Entries',
      kind: vscode.QuickPickItemKind.Separator
    })
    items.push(
      ...pinned_history.map((item, index) =>
        to_quick_pick_item(item, true, index, pinned_history.length)
      )
    )
  }

  if (history.length > 0) {
    items.push({
      label: 'Recent History',
      kind: vscode.QuickPickItemKind.Separator
    })
    items.push(
      ...history.map((item) =>
        to_quick_pick_item(item, !!pinned_history.find((i) => i == item))
      )
    )
  }

  quick_pick.items = items

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
      const item_to_handle = e.item
      const button_index = e.item.buttons?.indexOf(e.button) ?? -1
      const is_currently_pinned = pinned_history.includes(item_to_handle.label)
      const pinned_index = pinned_history.indexOf(item_to_handle.label)

      // Handle up/down chevrons for pinned items
      if (is_currently_pinned && pinned_index >= 0) {
        const up_button_exists = pinned_index > 0
        const down_button_exists = pinned_index < pinned_history.length - 1

        if (button_index === 0 && up_button_exists) {
          // Move up
          const temp = pinned_history[pinned_index]
          pinned_history[pinned_index] = pinned_history[pinned_index - 1]
          pinned_history[pinned_index - 1] = temp
          await provider.context.workspaceState.update(
            pinned_history_key,
            pinned_history
          )
        } else if (
          (button_index === 1 && up_button_exists && down_button_exists) ||
          (button_index === 0 && !up_button_exists && down_button_exists)
        ) {
          // Move down
          const temp = pinned_history[pinned_index]
          pinned_history[pinned_index] = pinned_history[pinned_index + 1]
          pinned_history[pinned_index + 1] = temp
          await provider.context.workspaceState.update(
            pinned_history_key,
            pinned_history
          )
        } else {
          // Handle pin/delete buttons (adjusted for chevron buttons)
          const pin_button_index =
            up_button_exists && down_button_exists
              ? 2
              : up_button_exists || down_button_exists
              ? 1
              : 0
          const delete_button_index = pin_button_index + 1

          if (button_index === delete_button_index) {
            // Delete button clicked
            pinned_history = pinned_history.filter(
              (h) => h !== item_to_handle.label
            )
            await provider.context.workspaceState.update(
              pinned_history_key,
              pinned_history
            )
          }
        }
      } else if (button_index === 0 && !is_currently_pinned) {
        // Pin/Unpin button clicked
        const is_item_pinned = pinned_history.includes(item_to_handle.label)

        if (!is_item_pinned) {
          // Pin the item
          if (!pinned_history.includes(item_to_handle.label)) {
            pinned_history.unshift(item_to_handle.label)
          }
        } else {
          // Unpin the item
          pinned_history = pinned_history.filter(
            (h) => h !== item_to_handle.label
          )
          // Add back to regular history if not already there
          if (!history.includes(item_to_handle.label)) {
            history.unshift(item_to_handle.label)
          }
        }

        await provider.context.workspaceState.update(history_key, history)
        await provider.context.workspaceState.update(
          pinned_history_key,
          pinned_history
        )
      } else if (button_index === 1 && !is_currently_pinned) {
        // Delete button clicked
        history = history.filter((h) => h !== item_to_handle.label)
        pinned_history = pinned_history.filter(
          (h) => h !== item_to_handle.label
        )
        await provider.context.workspaceState.update(history_key, history)
        await provider.context.workspaceState.update(
          pinned_history_key,
          pinned_history
        )
      }

      const updated_items: vscode.QuickPickItem[] = []

      if (pinned_history.length > 0) {
        updated_items.push({
          label: 'Pinned Entries',
          kind: vscode.QuickPickItemKind.Separator
        })
        updated_items.push(
          ...pinned_history.map((item, index) =>
            to_quick_pick_item(item, true, index, pinned_history.length)
          )
        )
      }

      if (history.length > 0) {
        updated_items.push({
          label: 'Recent History',
          kind: vscode.QuickPickItemKind.Separator
        })
        updated_items.push(
          ...history.map((item) => to_quick_pick_item(item, false))
        )
      }

      quick_pick.items = updated_items
      handle_get_history(provider)
    }),
    quick_pick.onDidHide(() => {
      disposables.forEach((d) => d.dispose())
    })
  )

  quick_pick.show()
}
