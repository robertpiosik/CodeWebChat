import * as vscode from 'vscode'
import * as path from 'path'
import { WorkspaceProvider } from '../context/providers/workspace/workspace-provider'
import { dictionary } from '@shared/constants/dictionary'
import { PromptViewProvider } from '@/views/prompt/backend/prompt-view-provider'

export const reference_in_prompt_command = (params: {
  prompt_view_provider: PromptViewProvider | undefined
  workspace_provider: WorkspaceProvider | undefined
}) => {
  return vscode.commands.registerCommand(
    'codeWebChat.referenceInPrompt',
    async (uri?: any) => {
      if (!params.prompt_view_provider || !params.workspace_provider) {
        return
      }

      let active_uri: vscode.Uri | undefined

      if (uri && uri.resourceUri) {
        active_uri = uri.resourceUri
      } else if (uri && uri.fsPath) {
        active_uri = uri
      } else if (vscode.window.activeTextEditor) {
        active_uri = vscode.window.activeTextEditor.document.uri
      }

      if (!active_uri) return

      const file_path = active_uri.fsPath

      const workspace_root =
        params.workspace_provider.get_workspace_root_for_file(file_path)

      if (!workspace_root) {
        vscode.window.showWarningMessage(
          dictionary.warning_message.CANNOT_REFERENCE_FILE_OUTSIDE_WORKSPACE
        )
        return
      }

      let relative_path = path.relative(workspace_root, file_path)

      if (params.workspace_provider.get_workspace_roots().length > 1) {
        const workspace_name =
          params.workspace_provider.get_workspace_name(workspace_root)
        relative_path = path.join(workspace_name, relative_path)
      }

      const reference_text = `\`${relative_path}\``

      params.prompt_view_provider.add_text_at_cursor_position(reference_text)

      params.prompt_view_provider.send_message({
        command: 'FOCUS_PROMPT_FIELD'
      })
    }
  )
}
