import fs from 'fs'
import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { MODE } from '@/views/panel/types/main-view-mode'
import * as vscode from 'vscode'
import * as path from 'path'
import { WorkspaceProvider } from '@/context/providers/workspace-provider'
import { natural_sort } from '@/utils/natural-sort'
import { dictionary } from '@shared/constants/dictionary'

type QuickPickItem = {
  label: string
  description: string
  fullPath: string
}

const at_sign_quick_pick = async (params: {
  workspace_provider: WorkspaceProvider
}): Promise<string | undefined> => {
  const checked_paths = params.workspace_provider.get_all_checked_paths()
  if (checked_paths.length == 0) {
    vscode.window.showWarningMessage(
      dictionary.warning_message.NOTHING_SELECTED_IN_CONTEXT
    )
    return
  }

  const workspace_roots = params.workspace_provider.getWorkspaceRoots()

  const all_quick_pick_items: QuickPickItem[] = checked_paths
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

  const quick_pick_items_to_show = all_quick_pick_items
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
  panel_provider: PanelProvider
): Promise<void> => {
  const replacement = await at_sign_quick_pick({
    workspace_provider: panel_provider.workspace_provider
  })

  if (!replacement) {
    panel_provider.send_message({
      command: 'FOCUS_PROMPT_FIELD'
    })
    return
  }

  let current_text = ''

  const mode =
    panel_provider.mode == MODE.WEB
      ? panel_provider.web_prompt_type
      : panel_provider.api_prompt_type
  if (mode == 'ask') {
    current_text = panel_provider.ask_instructions
  } else if (mode == 'edit-context') {
    current_text = panel_provider.edit_instructions
  } else if (mode == 'no-context') {
    current_text = panel_provider.no_context_instructions
  } else if (mode == 'code-completions') {
    current_text = panel_provider.code_completion_instructions
  }

  const is_after_at_sign = current_text
    .slice(0, panel_provider.caret_position)
    .endsWith('@')
  if (is_after_at_sign) {
    panel_provider.add_text_at_cursor_position(replacement, 1)
  } else {
    panel_provider.add_text_at_cursor_position(replacement)
  }
}
