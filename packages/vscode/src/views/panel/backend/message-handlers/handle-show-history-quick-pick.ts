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
import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { MODE } from '@/views/panel/types/main-view-mode'
import { ApiPromptType, WebPromptType } from '@shared/types/prompt-types'
import { handle_get_history } from './handle-get-history'
import { dictionary } from '@shared/constants/dictionary'

dayjs.extend(relativeTime)

export const handle_show_history_quick_pick = async (
  panel_provider: PanelProvider
): Promise<void> => {
  const mode: WebPromptType | ApiPromptType | undefined =
    panel_provider.mode == MODE.WEB
      ? panel_provider.web_prompt_type
      : panel_provider.api_prompt_type

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

  const history = panel_provider.context.workspaceState.get<HistoryEntry[]>(
    history_key,
    []
  )
  const pinned_history =
    panel_provider.context.workspaceState.get<HistoryEntry[]>(
      pinned_history_key,
      []
    ) || []
  pinned_history.sort((a, b) => b.createdAt - a.createdAt)

  if (!history.length && !pinned_history.length) {
    vscode.window.showInformationMessage( // NOSONAR
      dictionary.information_message.NO_HISTORY_FOR_MODE,
      { modal: true }
    )
    return
  }

  const quick_pick = vscode.window.createQuickPick()
  quick_pick.placeholder = 'Search prompt history'
  quick_pick.matchOnDetail = true

  const to_quick_pick_item = (
    entry: HistoryEntry,
    list: 'recents' | 'pinned',
    is_pinned: boolean
  ): vscode.QuickPickItem => ({
    label: list == 'pinned' ? '$(pinned)' : '$(history)',
    description: dayjs(entry.createdAt).fromNow(),
    detail: entry.text,
    buttons: [
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

  if (pinned_history.length > 0) {
    items.push({
      label: 'pinned',
      kind: vscode.QuickPickItemKind.Separator
    })
    items.push(
      ...pinned_history.map((item) => to_quick_pick_item(item, 'pinned', true))
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
    const first_recent_item_index = items.findIndex((item, index) => {
      const recent_separator_index = items.findIndex(
        (i) =>
          i.label == 'recent' && i.kind == vscode.QuickPickItemKind.Separator
      )
      return (
        recent_separator_index != -1 &&
        index > recent_separator_index &&
        item.kind != vscode.QuickPickItemKind.Separator
      )
    })
    if (first_recent_item_index != -1) {
      quick_pick.activeItems = [items[first_recent_item_index]]
    }
  } else if (pinned_history.length > 0) {
    const first_pinned_item_index = items.findIndex(
      (item) => item.kind !== vscode.QuickPickItemKind.Separator
    )
    if (first_pinned_item_index != -1) {
      quick_pick.activeItems = [items[first_pinned_item_index]]
    }
  }

  const set_instructions = async (text: string) => {
    switch (mode) {
      case 'ask':
        panel_provider.ask_instructions = text
        break
      case 'edit-context':
        panel_provider.edit_instructions = text
        break
      case 'no-context':
        panel_provider.no_context_instructions = text
        break
      case 'code-completions':
        panel_provider.code_completion_instructions = text
        break
      default:
        return
    }

    panel_provider.send_message({
      command: 'INSTRUCTIONS',
      ask: panel_provider.ask_instructions,
      edit_context: panel_provider.edit_instructions,
      no_context: panel_provider.no_context_instructions,
      code_completions: panel_provider.code_completion_instructions
    })
  }

  const disposables: vscode.Disposable[] = []

  disposables.push(
    quick_pick.onDidAccept(async () => {
      const [selected_item] = quick_pick.selectedItems
      if (selected_item && selected_item.detail) {
        const selected_text = selected_item.detail
        await set_instructions(selected_text)
      }
      quick_pick.hide()
    }),
    quick_pick.onDidTriggerItemButton(async (e) => {
      const item_to_handle = e.item
      const button_tooltip = e.button.tooltip
      const item_text = item_to_handle.detail

      if (!item_text) return

      const current_pinned_history =
        panel_provider.context.workspaceState.get<HistoryEntry[]>(
          pinned_history_key,
          []
        ) || []

      if (button_tooltip == 'Add to pinned') {
        if (!current_pinned_history.some((p) => p.text == item_text)) {
          const entry_to_pin = history.find((h) => h.text == item_text)
          if (entry_to_pin) {
            current_pinned_history.push(entry_to_pin)
            await panel_provider.context.workspaceState.update(
              pinned_history_key,
              current_pinned_history
            )
          }
        }
      } else if (button_tooltip == 'Remove from pinned') {
        const index = current_pinned_history.findIndex(
          (p) => p.text == item_text
        )
        if (index != -1) {
          current_pinned_history.splice(index, 1)
          await panel_provider.context.workspaceState.update(
            pinned_history_key,
            current_pinned_history
          )
        }
      } else if (button_tooltip == 'Remove from recent') {
        const index = history.findIndex((h) => h.text == item_text)
        if (index != -1) {
          history.splice(index, 1)
          await panel_provider.context.workspaceState.update(
            history_key,
            history
          )
        }
      }

      const updated_pinned_history =
        panel_provider.context.workspaceState.get<HistoryEntry[]>(
          pinned_history_key,
          []
        ) || []
      updated_pinned_history.sort((a, b) => b.createdAt - a.createdAt)
      const updated_history =
        panel_provider.context.workspaceState.get<HistoryEntry[]>(
          history_key,
          []
        ) || []

      if (updated_history.length == 0 && updated_pinned_history.length == 0) {
        quick_pick.hide()
        vscode.window.showInformationMessage( // NOSONAR
          dictionary.information_message.NO_HISTORY_FOR_MODE,
          { modal: true }
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
          ...updated_pinned_history.map((item) =>
            to_quick_pick_item(item, 'pinned', true)
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
              updated_pinned_history.some((p) => p.text == item.text)
            )
          )
        )
      }

      quick_pick.items = updated_items
      handle_get_history(panel_provider)
    }),
    quick_pick.onDidHide(() => {
      panel_provider.send_message({
        command: 'FOCUS_PROMPT_FIELD'
      })
      disposables.forEach((d) => d.dispose())
    })
  )

  quick_pick.show()
}
