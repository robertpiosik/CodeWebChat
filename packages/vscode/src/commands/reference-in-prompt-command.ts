import * as vscode from 'vscode'
import * as path from 'path'
import { WorkspaceProvider } from '../context/providers/workspace-provider'
import { FileItem } from '../context/providers/workspace-provider'
import { dictionary } from '@shared/constants/dictionary'
import { PanelProvider } from '@/views/panel/backend/panel-provider'

export const reference_in_prompt_command = (params: {
  panel_provider: PanelProvider | undefined
  workspace_provider: WorkspaceProvider | undefined
}) => {
  return vscode.commands.registerCommand(
    'codeWebChat.referenceInPrompt',
    async (uri: FileItem) => {
      if (!params.panel_provider || !params.workspace_provider) {
        return
      }

      const file_path = uri.resourceUri.fsPath

      const workspace_root =
        params.workspace_provider.get_workspace_root_for_file(file_path)

      if (!workspace_root) {
        vscode.window.showWarningMessage(
          dictionary.warning_message.CANNOT_REFERENCE_FILE_OUTSIDE_WORKSPACE
        )
        return
      }

      const is_checked = params.workspace_provider
        .get_all_checked_paths()
        .includes(file_path)

      const is_partially_checked =
        uri.isDirectory &&
        params.workspace_provider.is_partially_checked(file_path)

      if (!is_checked && !is_partially_checked) {
        await params.workspace_provider.update_check_state(
          uri,
          vscode.TreeItemCheckboxState.Checked
        )
      }

      const relative_path = path.relative(workspace_root, file_path)
      const reference_text = `\`${relative_path}\``

      params.panel_provider.add_text_at_cursor_position(reference_text)
    }
  )
}
