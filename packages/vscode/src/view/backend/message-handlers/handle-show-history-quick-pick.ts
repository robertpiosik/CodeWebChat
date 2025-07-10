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

  const history =
    provider.context.workspaceState.get<string[]>(history_key, []) || []
  const pinned_history =
    provider.context.workspaceState.get<string[]>(pinned_history_key, []) || []

  if (!history.length && !pinned_history.length) {
    vscode.window.showInformationMessage(
      'No history to show for the current mode.'
    )
    return
  }

  const quick_pick = vscode.window.createQuickPick()
  quick_pick.placeholder = 'Search prompt history'

  const to_quick_pick_item = (
    text: string,
    list: 'recents' | 'pinned',
    is_pinned: boolean,
    pinned_index?: number,
    total_pinned?: number,
    is_searching?: boolean
  ): vscode.QuickPickItem => ({
    label: text,
    buttons: [
      ...(list == 'pinned' &&
      pinned_index !== undefined &&
      total_pinned !== undefined &&
      total_pinned > 1
        ? is_searching
          ? []
          : [
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
              tooltip: 'Add to Pinned Prompts'
            }
          ]
        : []),
      {
        iconPath: new vscode.ThemeIcon('close'),
        tooltip:
          list == 'pinned'
            ? 'Remove from Pinned Prompts'
            : 'Remove from Recent Prompts'
      }
    ]
  })

  const items: vscode.QuickPickItem[] = []
  let current_search_value = ''

  if (pinned_history.length > 0) {
    items.push({
      label: 'pinned',
      kind: vscode.QuickPickItemKind.Separator
    })
    items.push(
      ...pinned_history.map((item, index) =>
        to_quick_pick_item(item, 'pinned', true, index, pinned_history.length)
      )
    )
  }

  if (history.length > 0) {
    items.push({
      label: 'recent',
      kind: vscode.QuickPickItemKind.Separator
    })
    items.push(
      ...history.map((item) =>
        to_quick_pick_item(
          item,
          'recents',
          !!pinned_history.find((i) => i == item)
        )
      )
    )
  }

  quick_pick.items = items

  if (history.length > 0) {
    const firstRecentItemIndex = items.findIndex((item, index) => {
      const recentSeparatorIndex = items.findIndex(
        (i) =>
          i.label === 'recent' && i.kind === vscode.QuickPickItemKind.Separator
      )
      return (
        recentSeparatorIndex != -1 &&
        index > recentSeparatorIndex &&
        item.kind !== vscode.QuickPickItemKind.Separator
      )
    })
    if (firstRecentItemIndex != -1) {
      quick_pick.activeItems = [items[firstRecentItemIndex]]
    }
  }

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
      const button_tooltip = e.button.tooltip
      const item_text = item_to_handle.label

      if (button_tooltip == 'Move up') {
        const current_index = pinned_history.indexOf(item_text)
        if (current_index > 0) {
          const temp = pinned_history[current_index - 1]
          pinned_history[current_index - 1] = pinned_history[current_index]
          pinned_history[current_index] = temp

          await provider.context.workspaceState.update(
            pinned_history_key,
            pinned_history
          )
        }
      } else if (button_tooltip == 'Move down') {
        const current_index = pinned_history.indexOf(item_text)
        if (current_index < pinned_history.length - 1) {
          const temp = pinned_history[current_index + 1]
          pinned_history[current_index + 1] = pinned_history[current_index]
          pinned_history[current_index] = temp

          await provider.context.workspaceState.update(
            pinned_history_key,
            pinned_history
          )
        }
      } else if (button_tooltip == 'Add to Pinned Prompts') {
        if (!pinned_history.includes(item_text)) {
          pinned_history.push(item_text)
          await provider.context.workspaceState.update(
            pinned_history_key,
            pinned_history
          )
        }
      } else if (button_tooltip == 'Remove from Pinned Prompts') {
        const index = pinned_history.indexOf(item_text)
        if (index != -1) {
          pinned_history.splice(index, 1)
          await provider.context.workspaceState.update(
            pinned_history_key,
            pinned_history
          )
        }
      } else if (button_tooltip == 'Remove from Recent Prompts') {
        const index = history.indexOf(item_text)
        if (index != -1) {
          history.splice(index, 1)
          await provider.context.workspaceState.update(history_key, history)
        }
      }

      if (history.length == 0 && pinned_history.length == 0) {
        quick_pick.hide()
        return
      }

      const updated_items: vscode.QuickPickItem[] = []

      if (pinned_history.length > 0) {
        updated_items.push({
          label: 'pinned',
          kind: vscode.QuickPickItemKind.Separator
        })
        updated_items.push(
          ...pinned_history.map((item, index) =>
            to_quick_pick_item(
              item,
              'pinned',
              true,
              index,
              pinned_history.length,
              !!current_search_value
            )
          )
        )
      }

      if (history.length > 0) {
        updated_items.push({
          label: 'recent',
          kind: vscode.QuickPickItemKind.Separator
        })
        updated_items.push(
          ...history.map((item) =>
            to_quick_pick_item(
              item,
              'recents',
              pinned_history.includes(item),
              undefined
            )
          )
        )
      }

      quick_pick.items = updated_items
      handle_get_history(provider)
    }),
    quick_pick.onDidChangeValue(() => {
      if (quick_pick.value == current_search_value) return
      current_search_value = quick_pick.value
      const is_searching = current_search_value.length > 0

      const new_items: vscode.QuickPickItem[] = []
      if (pinned_history.length > 0) {
        new_items.push({
          label: 'pinned',
          kind: vscode.QuickPickItemKind.Separator
        })
        new_items.push(
          ...pinned_history.map((item, index) =>
            to_quick_pick_item(
              item,
              'pinned',
              true,
              index,
              pinned_history.length,
              is_searching
            )
          )
        )
      }

      const recent_items = quick_pick.items.filter(
        (i) => (i as { list?: string }).list == 'recents'
      )
      quick_pick.items = [...new_items, ...recent_items]
    }),
    quick_pick.onDidHide(() => {
      disposables.forEach((d) => d.dispose())
    })
  )

  quick_pick.show()
}
