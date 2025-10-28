import * as vscode from 'vscode'
import * as path from 'path'
import { WorkspaceProvider } from '../context/providers/workspace-provider'
import { FileItem } from '../context/providers/workspace-provider'
import { dictionary } from '@shared/constants/dictionary'
import { PanelProvider } from '@/views/panel/backend/panel-provider'

export const reference_in_chat_command = (
  panel_provider: PanelProvider | undefined,
  workspace_provider: WorkspaceProvider | undefined
) => {
  return vscode.commands.registerCommand(
    'codeWebChat.referenceInChat',
    async (uri: FileItem) => {
      if (!panel_provider || !workspace_provider) {
        return
      }

      const file_path = uri.resourceUri.fsPath

      const workspace_root =
        workspace_provider.get_workspace_root_for_file(file_path)

      if (!workspace_root) {
        vscode.window.showWarningMessage(
          dictionary.warning_message.CANNOT_REFERENCE_FILE_OUTSIDE_WORKSPACE
        )
        return
      }

      const is_checked = workspace_provider
        .get_all_checked_paths()
        .includes(file_path)

      if (!is_checked) {
        await workspace_provider.update_check_state(
          uri,
          vscode.TreeItemCheckboxState.Checked
        )
      }

      const relative_path = path.relative(workspace_root, file_path)
      const reference_text = `\`${relative_path}\``

      panel_provider.add_text_at_cursor_position(reference_text)
    }
  )
}
