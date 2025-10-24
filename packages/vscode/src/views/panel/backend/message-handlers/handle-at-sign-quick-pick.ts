import fs from 'fs'
import { ViewProvider } from '@/views/panel/backend/panel-provider'
import { HOME_VIEW_TYPES } from '@/views/panel/types/home-view-type'
import * as vscode from 'vscode'
import * as path from 'path'
import { WorkspaceProvider } from '@/context/providers/workspace-provider'
import { natural_sort } from '@/utils/natural-sort'
import { dictionary } from '@shared/constants/dictionary'

const at_sign_quick_pick = async (params: {
  workspace_provider: WorkspaceProvider
  search_value?: string
}): Promise<string | undefined> => {
  const checked_paths = params.workspace_provider.get_all_checked_paths()
  if (checked_paths.length == 0) {
    vscode.window.showWarningMessage(
      dictionary.warning_message.NOTHING_SELECTED_IN_CONTEXT
    )
    return
  }

  const workspace_roots = params.workspace_provider.getWorkspaceRoots()

  const all_quick_pick_items = checked_paths
    .filter((p) => {
      try {
        return fs.existsSync(p) && fs.statSync(p).isFile()
      } catch {
        return false
      }
    })
    .map((p) => {
      let relative_path = p
      const root = params.workspace_provider.get_workspace_root_for_file(p)
      if (root) {
        if (workspace_roots.length > 1) {
          const ws_name = params.workspace_provider.get_workspace_name(root)
          relative_path = path.join(ws_name, path.relative(root, p))
        } else {
          relative_path = path.relative(root, p)
        }
      }
      const normalized_path = relative_path.replace(/\\/g, '/')
      const filename = path.basename(normalized_path)
      const dir_path = path.dirname(normalized_path)

      return {
        label: filename,
        description: dir_path == '.' ? '' : dir_path,
        fullPath: normalized_path
      }
    })

  let quick_pick_items_to_show = all_quick_pick_items

  if (params.search_value) {
    const filtered_items = all_quick_pick_items.filter((item) => {
      const search_lower = params.search_value!.toLowerCase()
      const filename_lower = item.label.toLowerCase()
      return filename_lower.includes(search_lower)
    })

    if (filtered_items.length == 1) {
      return `\`${filtered_items[0].fullPath}\` `
    } else if (filtered_items.length > 1) {
      quick_pick_items_to_show = filtered_items
    } else {
      vscode.window.showWarningMessage(
        dictionary.warning_message.NO_RESULTS_FOR_SEARCH_SHOWING_ALL(
          params.search_value
        )
      )
    }
  }

  quick_pick_items_to_show.sort((a, b) => natural_sort(a.fullPath, b.fullPath))

  const selected_path_item = await vscode.window.showQuickPick(
    quick_pick_items_to_show,
    {
      placeHolder: 'Select a path to place in the input field',
      matchOnDescription: true
    }
  )

  if (selected_path_item) {
    return `\`${selected_path_item.fullPath}\` `
  }
  return
}

export const handle_at_sign_quick_pick = async (
  provider: ViewProvider,
  search_value?: string
): Promise<void> => {
  const replacement = await at_sign_quick_pick({
    workspace_provider: provider.workspace_provider,
    search_value: search_value
  })

  if (!replacement) {
    provider.send_message({
      command: 'FOCUS_CHAT_INPUT'
    })
    return
  }

  if (search_value) {
    provider.add_text_at_cursor_position(replacement, search_value.length)
    return
  }

  let current_text = ''

  const mode =
    provider.home_view_type == HOME_VIEW_TYPES.WEB
      ? provider.web_mode
      : provider.api_mode
  if (mode == 'ask') {
    current_text = provider.ask_instructions
  } else if (mode == 'edit-context') {
    current_text = provider.edit_instructions
  } else if (mode == 'no-context') {
    current_text = provider.no_context_instructions
  } else if (mode == 'code-completions') {
    current_text = provider.code_completion_instructions
  }

  const is_after_at_sign = current_text
    .slice(0, provider.caret_position)
    .endsWith('@')
  if (is_after_at_sign) {
    provider.add_text_at_cursor_position(replacement, 1)
  } else {
    provider.add_text_at_cursor_position(replacement)
  }
}
