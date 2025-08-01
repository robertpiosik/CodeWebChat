import * as vscode from 'vscode'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import {
  HISTORY_ASK_STATE_KEY,
  HISTORY_CODE_COMPLETIONS_STATE_KEY,
  HISTORY_EDIT_STATE_KEY,
  HISTORY_NO_CONTEXT_STATE_KEY,
  PINNED_HISTORY_ASK_STATE_KEY,
  PINNED_HISTORY_CODE_COMPLETIONS_STATE_KEY,
  PINNED_HISTORY_EDIT_STATE_KEY,
  PINNED_HISTORY_NO_CONTEXT_STATE_KEY,
  HistoryEntry
} from '@/constants/state-keys'
import { ViewProvider } from '@/view/backend/view-provider'
import { HOME_VIEW_TYPES } from '@/view/types/home-view-type'
import { ApiMode, WebMode } from '@shared/types/modes'
import { handle_get_history } from './handle-get-history'

dayjs.extend(relativeTime)

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
    case 'edit-context':
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
    provider.context.workspaceState.get<HistoryEntry[]>(history_key, []) || []
  const pinned_history =
    provider.context.workspaceState.get<HistoryEntry[]>(
      pinned_history_key,
      []
    ) || []

  if (!history.length && !pinned_history.length) {
    vscode.window.showInformationMessage(
      'No history to show for the current mode.'
    )
    return
  }

  const quick_pick = vscode.window.createQuickPick()
  quick_pick.placeholder = 'Search prompt history'
  quick_pick.matchOnDetail = true

  const to_quick_pick_item = (
    entry: HistoryEntry,
    list: 'recents' | 'pinned',
    is_pinned: boolean,
    pinned_index?: number,
    total_pinned?: number,
    is_searching?: boolean
  ): vscode.QuickPickItem => ({
    label: dayjs(entry.createdAt).fromNow(),
    detail: entry.text,
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
              tooltip: 'Add to pinned'
            }
          ]
        : []),
      {
        iconPath: new vscode.ThemeIcon('close'),
        tooltip: list == 'pinned' ? 'Remove from pinned' : 'Remove from recent'
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
        to_quick_pick_item(
          item,
          'pinned',
          true,
          index,
          pinned_history.length,
          !!quick_pick.value
        )
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
          !!pinned_history.find((p) => p.text == item.text)
        )
      )
    )
  }

  quick_pick.items = items

  if (history.length > 0) {
    const firstRecentItemIndex = items.findIndex((item, index) => {
      const recentSeparatorIndex = items.findIndex(
        (i) =>
          i.label === 'recent' && i.kind == vscode.QuickPickItemKind.Separator
      )
      return (
        recentSeparatorIndex != -1 &&
        index > recentSeparatorIndex &&
        item.kind != vscode.QuickPickItemKind.Separator
      )
    })
    if (firstRecentItemIndex != -1) {
      quick_pick.activeItems = [items[firstRecentItemIndex]]
    }
  } else if (pinned_history.length > 0) {
    const firstPinnedItemIndex = items.findIndex(
      (item) => item.kind !== vscode.QuickPickItemKind.Separator
    )
    if (firstPinnedItemIndex !== -1) {
      quick_pick.activeItems = [items[firstPinnedItemIndex]]
    }
  }

  const set_instructions = async (text: string) => {
    switch (mode) {
      case 'ask':
        provider.ask_instructions = text
        break
      case 'edit-context':
        provider.edit_instructions = text
        break
      case 'no-context':
        provider.no_context_instructions = text
        break
      case 'code-completions':
        provider.code_completion_instructions = text
        break
      default:
        return
    }

    provider.send_message({
      command: 'INSTRUCTIONS',
      ask: provider.ask_instructions,
      edit_context: provider.edit_instructions,
      no_context: provider.no_context_instructions,
      code_completions: provider.code_completion_instructions
    })
  }

  const disposables: vscode.Disposable[] = []

  disposables.push(
    quick_pick.onDidAccept(async () => {
      const [selected_item] = quick_pick.selectedItems
      if (selected_item && selected_item.detail) {
        await set_instructions(selected_item.detail)
      }
      quick_pick.hide()
    }),
    quick_pick.onDidTriggerItemButton(async (e) => {
      const item_to_handle = e.item
      const button_tooltip = e.button.tooltip
      const item_text = item_to_handle.detail

      if (!item_text) return

      const get_sorted_pinned_history = () =>
        provider.context.workspaceState.get<HistoryEntry[]>(
          pinned_history_key,
          []
        ) || []

      const current_pinned_history = get_sorted_pinned_history()
      if (button_tooltip == 'Move up') {
        const current_index = current_pinned_history.findIndex(
          (p) => p.text === item_text
        )
        if (current_index > 0) {
          ;[
            current_pinned_history[current_index - 1],
            current_pinned_history[current_index]
          ] = [
            current_pinned_history[current_index],
            current_pinned_history[current_index - 1]
          ]
          await provider.context.workspaceState.update(
            pinned_history_key,
            current_pinned_history
          )
        }
      } else if (button_tooltip == 'Move down') {
        const current_index = current_pinned_history.findIndex(
          (p) => p.text === item_text
        )
        if (current_index < current_pinned_history.length - 1) {
          ;[
            current_pinned_history[current_index + 1],
            current_pinned_history[current_index]
          ] = [
            current_pinned_history[current_index],
            current_pinned_history[current_index + 1]
          ]
          await provider.context.workspaceState.update(
            pinned_history_key,
            current_pinned_history
          )
        }
      } else if (button_tooltip == 'Add to Pinned Prompts') {
        if (!current_pinned_history.some((p) => p.text === item_text)) {
          const entry_to_pin = history.find((h) => h.text === item_text)
          if (entry_to_pin) {
            current_pinned_history.push(entry_to_pin)
            await provider.context.workspaceState.update(
              pinned_history_key,
              current_pinned_history
            )
          }
        }
      } else if (button_tooltip == 'Remove from Pinned Prompts') {
        const index = current_pinned_history.findIndex(
          (p) => p.text === item_text
        )
        if (index != -1) {
          current_pinned_history.splice(index, 1)
          await provider.context.workspaceState.update(
            pinned_history_key,
            current_pinned_history
          )
        }
      } else if (button_tooltip == 'Remove from Recent Prompts') {
        const index = history.findIndex((h) => h.text === item_text)
        if (index != -1) {
          history.splice(index, 1)
          await provider.context.workspaceState.update(history_key, history)
        }
      }

      const updated_pinned_history =
        provider.context.workspaceState.get<HistoryEntry[]>(
          pinned_history_key,
          []
        ) || []
      const updated_history =
        provider.context.workspaceState.get<HistoryEntry[]>(history_key, []) ||
        []

      if (updated_history.length == 0 && updated_pinned_history.length == 0) {
        quick_pick.hide()
        vscode.window.showInformationMessage(
          'No history to show for the current mode.'
        )
        return
      }

      const updated_items: vscode.QuickPickItem[] = []

      if (updated_pinned_history.length > 0) {
        updated_items.push({
          label: 'pinned',
          kind: vscode.QuickPickItemKind.Separator
        })
        updated_items.push(
          ...updated_pinned_history.map((item, index) =>
            to_quick_pick_item(
              item,
              'pinned',
              true,
              index,
              updated_pinned_history.length,
              !!current_search_value
            )
          )
        )
      }

      if (updated_history.length > 0) {
        updated_items.push({
          label: 'recent',
          kind: vscode.QuickPickItemKind.Separator
        })
        updated_items.push(
          ...updated_history.map((item) =>
            to_quick_pick_item(
              item,
              'recents',
              updated_pinned_history.some((p) => p.text === item.text),
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

      const updated_items: vscode.QuickPickItem[] = []

      if (pinned_history.length > 0) {
        // No need to re-fetch, just use in-memory
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
              is_searching
            )
          )
        )
      }

      if (history.length > 0) {
        // No need to re-fetch, just use in-memory
        updated_items.push({
          label: 'recent',
          kind: vscode.QuickPickItemKind.Separator
        })
        updated_items.push(
          ...history.map(
            (
              item // No need to re-fetch, just use in-memory
            ) =>
              to_quick_pick_item(item, 'recents', pinned_history.includes(item))
          )
        )
      }
      quick_pick.items = updated_items
    }),
    quick_pick.onDidHide(() => {
      disposables.forEach((d) => d.dispose())
    })
  )

  quick_pick.show()
}
