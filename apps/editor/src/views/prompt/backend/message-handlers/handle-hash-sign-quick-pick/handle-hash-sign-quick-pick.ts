import * as vscode from 'vscode'
import { PromptViewProvider } from '@/views/prompt/backend/prompt-view-provider'
import { MODE } from '@/views/prompt/types/main-view-mode'
import { LAST_SELECTED_SYMBOL_STATE_KEY } from '@/constants/state-keys'
import {
  handle_selection_item,
  handle_changes_item,
  handle_commit_item,
  handle_saved_context_item,
  handle_skill_item
} from './symbols'

const selection_label = '$(list-flat) Selection'
const changes_label = '$(git-pull-request-draft) Changes'
const commit_label = '$(git-commit) Commit'
const saved_context_label = '$(checklist) Saved context'
const skill_label = '$(thinking) Skill'

const hash_sign_quick_pick = async (params: {
  extension_context: vscode.ExtensionContext
  is_for_code_at_cursor: boolean
  is_find_relevant_files: boolean
}): Promise<string | undefined> => {
  let items: vscode.QuickPickItem[] = [
    {
      label: selection_label,
      description: 'Text selection from the active editor'
    },
    {
      label: changes_label,
      description: 'Diff with the selected branch'
    },
    {
      label: commit_label,
      description: 'Diff from a specific commit'
    },
    {
      label: saved_context_label,
      description: 'Files from the workspace'
    },
    {
      label: skill_label,
      description: 'Reference an installed skill',
      buttons: [
        {
          iconPath: new vscode.ThemeIcon('globe'),
          tooltip: 'Discover skills at skills.sh'
        }
      ]
    }
  ]

  if (params.is_find_relevant_files) {
    items = items.filter((item) => item.label !== saved_context_label)
  }

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
    quick_pick.placeholder = 'Select symbol to insert'
    quick_pick.matchOnDescription = true
    quick_pick.title = 'Symbols'
    quick_pick.buttons = [
      { iconPath: new vscode.ThemeIcon('close'), tooltip: 'Close' }
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
        result = await handle_commit_item(params.extension_context, 'Commit')
        break
      case saved_context_label:
        result = await handle_saved_context_item(params.extension_context)
        break
      case skill_label:
        result = await handle_skill_item()
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
  extension_context: vscode.ExtensionContext,
  is_for_code_at_cursor: boolean
): Promise<void> => {
  const is_find_relevant_files =
    (prompt_view_provider.mode == MODE.WEB &&
      prompt_view_provider.web_prompt_type == 'find-relevant-files') ||
    (prompt_view_provider.mode == MODE.API &&
      prompt_view_provider.api_prompt_type == 'find-relevant-files')

  const replacement = await hash_sign_quick_pick({
    extension_context,
    is_for_code_at_cursor,
    is_find_relevant_files
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
