import * as vscode from 'vscode'
import * as path from 'path'
import { MainViewProvider } from '../views/main/backend/view-provider'
import { WorkspaceProvider } from '../context/providers/workspace-provider'
import { FileItem } from '../context/providers/workspace-provider'
import { SharedFileState } from '../context/shared-file-state'

export function reference_in_chat_command(
  view_provider: MainViewProvider | undefined,
  workspace_provider: WorkspaceProvider | undefined
) {
  return vscode.commands.registerCommand(
    'codeWebChat.referenceInChat',
    async (uri: FileItem) => {
      if (!view_provider || !workspace_provider) {
        return
      }

      const file_path = uri.resourceUri.fsPath

      const workspace_root =
        workspace_provider.get_workspace_root_for_file(file_path)

      if (!workspace_root) {
        vscode.window.showWarningMessage(
          'Cannot reference file outside of the workspace.'
        )
        return
      }

      // Check if file is not already checked
      const shared_state = SharedFileState.get_instance()
      const is_checked = shared_state.get_checked_files().includes(file_path)

      if (!is_checked) {
        // Create a temporary FileItem to update the check state
        const temp_item = new FileItem(
          path.basename(file_path),
          uri.resourceUri,
          vscode.TreeItemCollapsibleState.None,
          false,
          vscode.TreeItemCheckboxState.Checked,
          false,
          false,
          false
        )

        await workspace_provider.update_check_state(
          temp_item,
          vscode.TreeItemCheckboxState.Checked
        )
      }

      const relative_path = path.relative(workspace_root, file_path)
      const reference_text = `\`${relative_path}\``

      view_provider.add_text_at_cursor_position(reference_text)
    }
  )
}
