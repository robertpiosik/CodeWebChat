import * as vscode from 'vscode'
import { WorkspaceProvider } from '../context/providers/workspace/workspace-provider'
import { show_parent_folder_quick_pick } from '../utils/show-parent-folder-quick-pick'

export const select_parent_folder_command = (
  workspace_provider: WorkspaceProvider
) => {
  return vscode.commands.registerCommand(
    'codeWebChat.selectParentFolder',
    async (item?: any) => {
      let target_uri: vscode.Uri | undefined

      if (item?.resourceUri) {
        target_uri = item.resourceUri
      } else if (
        item instanceof vscode.Uri ||
        (item && item.fsPath && item.scheme)
      ) {
        target_uri = item as vscode.Uri
      } else {
        const editor = vscode.window.activeTextEditor
        if (editor) {
          target_uri = editor.document.uri
        }
      }

      if (!target_uri) {
        return
      }

      await show_parent_folder_quick_pick({
        file_path: target_uri.fsPath,
        workspace_provider,
        show_close_button: true
      })
    }
  )
}
