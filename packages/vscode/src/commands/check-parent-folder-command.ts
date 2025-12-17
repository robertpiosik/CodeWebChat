import * as vscode from 'vscode'
import * as path from 'path'
import {
  WorkspaceProvider,
  FileItem
} from '../context/providers/workspace-provider'

export const check_parent_folder_command = (
  workspace_provider: WorkspaceProvider
) => {
  return vscode.commands.registerCommand(
    'codeWebChat.checkParentFolder',
    async (item: FileItem) => {
      if (!item) return

      const file_path = item.resourceUri.fsPath
      const workspace_root =
        workspace_provider.get_workspace_root_for_file(file_path)

      if (!workspace_root) return

      const folders: { label: string; full_path: string }[] = []
      let current_dir = path.dirname(file_path)

      while (
        current_dir.startsWith(workspace_root) &&
        current_dir !== workspace_root
      ) {
        const label = path
          .relative(workspace_root, current_dir)
          .replace(/\\/g, '/')

        folders.push({
          label: label,
          full_path: current_dir
        })

        current_dir = path.dirname(current_dir)
      }

      if (folders.length === 0) {
        vscode.window.showInformationMessage('No parent folders found.')
        return
      }

      const selected = await vscode.window.showQuickPick(folders, {
        placeHolder: 'Select a parent folder to check',
        title: 'Parent Folders'
      })

      if (selected) {
        const is_workspace_root = selected.full_path === workspace_root
        const folder_item = new FileItem(
          path.basename(selected.full_path),
          vscode.Uri.file(selected.full_path),
          vscode.TreeItemCollapsibleState.Collapsed,
          true,
          vscode.TreeItemCheckboxState.Checked,
          false,
          false,
          undefined,
          undefined,
          undefined,
          is_workspace_root,
          undefined
        )

        await workspace_provider.update_check_state(
          folder_item,
          vscode.TreeItemCheckboxState.Checked
        )
      }
    }
  )
}
