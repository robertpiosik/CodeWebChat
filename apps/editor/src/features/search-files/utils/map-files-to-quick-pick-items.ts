import * as vscode from 'vscode'
import * as path from 'path'
import { WorkspaceProvider } from '@/context/providers/workspace/workspace-provider'
import { display_token_count } from '@shared/utils/display-token-count'

export const map_files_to_quick_pick_items = async <
  T extends { path: string }
>(params: {
  files: T[]
  is_multi_root: boolean
  workspace_provider: WorkspaceProvider
  open_file_button: vscode.QuickInputButton
  add_parent_folder_button: vscode.QuickInputButton
}) => {
  return await Promise.all(
    params.files.map(async (file_obj) => {
      const file_path = file_obj.path
      const workspace_root =
        params.workspace_provider.get_workspace_root_for_file(file_path)
      const relative_path = workspace_root
        ? path.relative(workspace_root, file_path)
        : file_path

      const dir_name = path.dirname(relative_path)
      const has_parent_folder = dir_name != '.'
      const display_dir = dir_name == '.' ? '' : dir_name

      let workspace_name = ''
      let final_display_dir = display_dir
      if (workspace_root && params.is_multi_root) {
        workspace_name =
          params.workspace_provider.get_workspace_name(workspace_root)
        final_display_dir = final_display_dir
          ? `${workspace_name}/${final_display_dir}`
          : workspace_name
      }

      const token_count =
        await params.workspace_provider.calculate_file_tokens(file_path)
      const formatted_token_count = display_token_count(token_count.total)

      const buttons: vscode.QuickInputButton[] = []
      if (has_parent_folder) {
        buttons.push(params.add_parent_folder_button)
      }
      buttons.push(params.open_file_button)

      return {
        ...file_obj,
        label: path.basename(file_path),
        description: final_display_dir
          ? `${formatted_token_count} · ${final_display_dir}`
          : formatted_token_count,
        file_path,
        workspace_name,
        token_count: token_count.total,
        buttons
      }
    })
  )
}
