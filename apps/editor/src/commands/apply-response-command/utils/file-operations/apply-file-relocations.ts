import * as vscode from 'vscode'
import { OriginalFileState } from '@/commands/apply-response-command/types/original-file-state'
import { create_safe_path } from '@/utils/path-sanitizer'
import { uri_exists } from './uri-exists'
import { relocate_file } from './relocate-file'

export const apply_file_relocations = async (
  original_states: OriginalFileState[]
): Promise<void> => {
  if (
    !vscode.workspace.workspaceFolders ||
    vscode.workspace.workspaceFolders.length == 0
  ) {
    return
  }

  const workspace_map = new Map<string, string>()
  vscode.workspace.workspaceFolders.forEach((folder) => {
    workspace_map.set(folder.name, folder.uri.fsPath)
  })

  const default_workspace = vscode.workspace.workspaceFolders[0].uri.fsPath

  for (const state of original_states) {
    if (
      state.new_file_path &&
      (state.new_file_path !== state.file_path ||
        state.new_workspace_name !== state.workspace_name)
    ) {
      let workspace_root = default_workspace
      if (state.workspace_name && workspace_map.has(state.workspace_name)) {
        workspace_root = workspace_map.get(state.workspace_name)!
      }

      let new_workspace_root = workspace_root
      if (
        state.new_workspace_name &&
        workspace_map.has(state.new_workspace_name)
      ) {
        new_workspace_root = workspace_map.get(state.new_workspace_name)!
      }

      const old_safe_path = create_safe_path(workspace_root, state.file_path)
      const new_safe_path = create_safe_path(
        new_workspace_root,
        state.new_file_path
      )

      if (!old_safe_path || !new_safe_path) continue

      const old_exists = await uri_exists(vscode.Uri.file(old_safe_path))
      const new_exists = await uri_exists(vscode.Uri.file(new_safe_path))

      let success = false
      if (old_exists) {
        success = await relocate_file({
          old_path: state.file_path,
          new_path: state.new_file_path,
          old_workspace_root: workspace_root,
          new_workspace_root: new_workspace_root
        })
      } else if (new_exists) {
        success = true
      }

      if (success) {
        state.file_path_to_restore = state.file_path
        state.restore_workspace_name = state.workspace_name
        state.file_path = state.new_file_path
        if (state.new_workspace_name) {
          state.workspace_name = state.new_workspace_name
        }
        state.new_file_path = undefined
        state.new_workspace_name = undefined
      }
    }
  }
}
