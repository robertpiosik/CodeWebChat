import { OpenEditorsProvider } from '@/context/providers/open-editors/open-editors-provider'
import * as vscode from 'vscode'

export const open_file_from_workspace_command = (
  open_editors_provider?: OpenEditorsProvider
) => {
  return vscode.commands.registerCommand(
    'codeWebChat.openFileFromWorkspace',
    async (uri: vscode.Uri) => {
      if (open_editors_provider) {
        open_editors_provider.mark_opened_from_workspace_view(uri.fsPath)
      }

      await vscode.commands.executeCommand('vscode.open', uri)
    }
  )
}
