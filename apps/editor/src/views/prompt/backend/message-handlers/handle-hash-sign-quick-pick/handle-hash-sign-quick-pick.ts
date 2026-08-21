import * as vscode from 'vscode'
import { t } from '@/i18n'
import { PromptViewProvider } from '@/views/prompt/backend/prompt-view-provider'
import { LAST_SELECTED_SYMBOL_STATE_KEY } from '@/constants/state-keys'
import {
  handle_selection_item,
  handle_changes_item,
  handle_commit_item,
  handle_saved_context_item,
  handle_skill_item,
  handle_clipboard_paths_item
} from './symbols'

const selection_label = `$(list-flat) ${t('views.prompt.handlers.hash-sign.quick-pick.selection.label')}`
const changes_label = `$(git-pull-request-draft) ${t('views.prompt.handlers.hash-sign.quick-pick.changes.label')}`
const commit_label = `$(git-commit) ${t('views.prompt.handlers.hash-sign.quick-pick.commit.label')}`
const saved_context_label = `$(checklist) ${t('views.prompt.handlers.hash-sign.quick-pick.saved-context.label')}`
const skill_label = `$(thinking) ${t('views.prompt.handlers.hash-sign.quick-pick.skill.label')}`
const clipboard_paths_label = `$(clippy) ${t('views.prompt.handlers.hash-sign.quick-pick.clipboard-paths.label')}`

const hash_sign_quick_pick = async (params: {
  extension_context: vscode.ExtensionContext
}): Promise<string | undefined> => {
  const items: vscode.QuickPickItem[] = [
    {
      label: selection_label,
      description: t(
        'views.prompt.handlers.hash-sign.quick-pick.selection.description'
      )
    },
    {
      label: changes_label,
      description: t(
        'views.prompt.handlers.hash-sign.quick-pick.changes.description'
      )
    },
    {
      label: commit_label,
      description: t(
        'views.prompt.handlers.hash-sign.quick-pick.commit.description'
      )
    },
    {
      label: saved_context_label,
      description: t(
        'views.prompt.handlers.hash-sign.quick-pick.saved-context.description'
      )
    },
    {
      label: skill_label,
      description: t(
        'views.prompt.handlers.hash-sign.quick-pick.skill.description'
      ),
      buttons: [
        {
          iconPath: new vscode.ThemeIcon('globe'),
          tooltip: t('views.prompt.handlers.hash-sign.quick-pick.skill.tooltip')
        }
      ]
    },
    {
      label: clipboard_paths_label,
      description: t(
        'views.prompt.handlers.hash-sign.quick-pick.clipboard-paths.description'
      )
    }
  ]

  const last_selected_symbol =
    params.extension_context.workspaceState.get<string>(
      LAST_SELECTED_SYMBOL_STATE_KEY
    )
  let last_selected_item: vscode.QuickPickItem | undefined = items.find(
    (item) => item.label == last_selected_symbol
  )

  while (true) {
    const quick_pick = vscode.window.createQuickPick()
    quick_pick.items = items
    quick_pick.placeholder = t(
      'views.prompt.handlers.hash-sign.quick-pick.placeholder'
    )
    quick_pick.matchOnDescription = true
    quick_pick.title = t('views.prompt.handlers.hash-sign.quick-pick.title')
    quick_pick.buttons = [
      {
        iconPath: new vscode.ThemeIcon('close'),
        tooltip: t('views.prompt.handlers.hash-sign.quick-pick.close')
      }
    ]

    if (last_selected_item) {
      quick_pick.activeItems = [last_selected_item]
    }

    const selected = await new Promise<vscode.QuickPickItem | undefined>(
      (resolve) => {
        let is_accepted = false
        quick_pick.onDidTriggerButton(() => {
          quick_pick.hide()
        })
        quick_pick.onDidTriggerItemButton(async (e) => {
          if (e.item.label === skill_label) {
            await vscode.env.openExternal(
              vscode.Uri.parse('https://skills.sh/')
            )
          }
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

    if (!selected) {
      return
    }

    last_selected_item = selected
    await params.extension_context.workspaceState.update(
      LAST_SELECTED_SYMBOL_STATE_KEY,
      selected.label
    )

    let result: string | 'continue' | undefined

    switch (selected.label) {
      case selection_label:
        result = await handle_selection_item()
        break
      case changes_label:
        result = await handle_changes_item()
        break
      case commit_label:
        result = await handle_commit_item(params.extension_context)
        break
      case saved_context_label:
        result = await handle_saved_context_item(params.extension_context)
        break
      case skill_label:
        result = await handle_skill_item()
        break
      case clipboard_paths_label:
        result = await handle_clipboard_paths_item()
        break
      default:
        continue
    }

    if (result == 'continue') {
      continue
    }

    return result
  }
}

export const handle_hash_sign_quick_pick = async (
  prompt_view_provider: PromptViewProvider,
  extension_context: vscode.ExtensionContext
): Promise<void> => {
  const replacement = await hash_sign_quick_pick({
    extension_context
  })

  if (!replacement) {
    prompt_view_provider.send_message({
      command: 'FOCUS_PROMPT_FIELD'
    })
    return
  }

  const current_text = prompt_view_provider.current_instruction

  const is_after_hash_sign = current_text
    .slice(0, prompt_view_provider.caret_position)
    .endsWith('#')
  if (is_after_hash_sign) {
    prompt_view_provider.add_text_at_cursor_position(replacement, 1)
  } else {
    prompt_view_provider.add_text_at_cursor_position(replacement)
  }

  prompt_view_provider.send_message({
    command: 'FOCUS_PROMPT_FIELD'
  })
}
