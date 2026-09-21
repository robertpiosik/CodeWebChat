import * as vscode from 'vscode'
import { OriginalFileState } from '@/commands/apply-response-command/types/original-file-state'
import { create_safe_path } from '@/utils/path-sanitizer'
import { uri_exists } from './uri-exists'
import { relocate_file } from './relocate-file'
import {
  get_workspace_map_and_default,
  resolve_workspace_root
} from '../workspace'

export const apply_file_relocations = async (
  original_states: OriginalFileState[]
): Promise<void> => {
  if (
    !vscode.workspace.workspaceFolders ||
    vscode.workspace.workspaceFolders.length == 0
  ) {
    return
  }

  const { workspace_map, default_workspace } = get_workspace_map_and_default()

  for (const state of original_states) {
    if (
      state.new_file_path &&
      (state.new_file_path !== state.file_path ||
        state.new_workspace_name !== state.workspace_name)
    ) {
      const workspace_root = resolve_workspace_root({
        workspace_name: state.workspace_name,
        workspace_map,
        default_workspace
      })

      const new_workspace_root = state.new_workspace_name
        ? resolve_workspace_root({
            workspace_name: state.new_workspace_name,
            workspace_map,
            default_workspace
          })
        : workspace_root

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
