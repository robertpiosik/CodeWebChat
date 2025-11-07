import * as vscode from 'vscode'
import * as path from 'path'
import { WorkspaceProvider } from '../../../context/providers/workspace-provider'
import { LAST_CONTEXT_MERGE_REPLACE_OPTION_STATE_KEY } from '../../../constants/state-keys'
import { SavedContext } from '@/types/context'
import { Logger } from '@shared/utils/logger'
import { dictionary } from '@shared/constants/dictionary'
import { resolve_glob_patterns } from './resolve-glob-patterns'

export async function apply_saved_context(
  context: SavedContext,
  workspace_root: string,
  workspace_provider: WorkspaceProvider,
  extension_context: vscode.ExtensionContext
): Promise<void> {
  const workspace_folders = vscode.workspace.workspaceFolders || []
  const workspace_map = new Map<string, string>()

  for (const folder of workspace_folders) {
    workspace_map.set(folder.name, folder.uri.fsPath)
  }

  const absolute_paths = context.paths.map((prefixed_path) => {
    const is_exclude = prefixed_path.startsWith('!')
    const path_part = is_exclude ? prefixed_path.substring(1) : prefixed_path

    let resolved_path_part: string

    if (path_part.includes(':')) {
      const [prefix, relative_path] = path_part.split(':', 2)

      const root = workspace_map.get(prefix)

      if (root) {
        resolved_path_part = path.join(root, relative_path)
      } else {
        Logger.warn({
          function_name: 'apply_saved_context',
          message: `Unknown workspace prefix "${prefix}" in path "${path_part}". Treating as relative to current workspace root.`
        })
        resolved_path_part = path.join(workspace_root, relative_path)
      }
    } else {
      resolved_path_part = path.isAbsolute(path_part)
        ? path_part
        : path.join(workspace_root, path_part)
    }

    return is_exclude ? `!${resolved_path_part}` : resolved_path_part
  })

  const resolved_paths = await resolve_glob_patterns(
    absolute_paths,
    workspace_provider
  )

  const existing_paths = resolved_paths

  if (existing_paths.length == 0) {
    vscode.window.showWarningMessage(
      dictionary.warning_message.NO_VALID_PATHS_IN_CONTEXT(context.name)
    )
    return
  }

  let paths_to_apply = existing_paths
  let message = `Applied context "${context.name}".`

  const currently_checked_files = workspace_provider.get_checked_files()
  if (currently_checked_files.length > 0) {
    const existing_paths_set = new Set(existing_paths)
    const all_current_files_in_new_context = currently_checked_files.every(
      (file) => existing_paths_set.has(file)
    )

    if (!all_current_files_in_new_context) {
      const quick_pick_options = [
        {
          label: 'Replace',
          description: 'Replace the current context with the selected one'
        },
        {
          label: 'Merge',
          description: 'Merge the selected context with the current one'
        }
      ]

      const last_choice_label = extension_context.workspaceState.get<string>(
        LAST_CONTEXT_MERGE_REPLACE_OPTION_STATE_KEY
      )

      const quick_pick = vscode.window.createQuickPick()
      quick_pick.items = quick_pick_options
      quick_pick.placeholder = `How would you like to apply "${context.name}"?`
      if (last_choice_label) {
        const active_item = quick_pick_options.find(
          (opt) => opt.label === last_choice_label
        )
        if (active_item) {
          quick_pick.activeItems = [active_item]
        }
      }

      const choice = await new Promise<vscode.QuickPickItem | undefined>(
        (resolve) => {
          let is_accepted = false
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

      if (!choice) {
        return
      }

      await extension_context.workspaceState.update(
        LAST_CONTEXT_MERGE_REPLACE_OPTION_STATE_KEY,
        choice.label
      )
      if (choice.label == 'Merge') {
        paths_to_apply = [
          ...new Set([...currently_checked_files, ...existing_paths])
        ]
        message = `Merged context "${context.name}".`
      }
    }
  }

  await workspace_provider.set_checked_files(paths_to_apply)
  vscode.window.showInformationMessage(message)
}
