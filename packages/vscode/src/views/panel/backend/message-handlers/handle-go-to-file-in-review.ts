import * as vscode from 'vscode'
import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { GoToFileInReviewMessage } from '@/views/panel/types/messages'
import { Logger } from '@shared/utils/logger'
import { dictionary } from '@shared/constants/dictionary'

export const handle_go_to_file_in_review = async (
  provider: PanelProvider,
  message: GoToFileInReviewMessage
): Promise<void> => {
  const { file_path, workspace_name } = message
  const workspace_folders = vscode.workspace.workspaceFolders
  if (!workspace_folders) {
    Logger.warn({
      function_name: 'handle_go_to_file_in_review',
      message: 'No workspace folders open'
    })
    return
  }

  let target_workspace: vscode.WorkspaceFolder | undefined

  if (workspace_name) {
    target_workspace = workspace_folders.find(
      (folder) => folder.name === workspace_name
    )
  } else if (workspace_folders.length === 1) {
    target_workspace = workspace_folders[0]
  } else {
    for (const folder of workspace_folders) {
      const potential_uri = vscode.Uri.joinPath(folder.uri, file_path)
      try {
        await vscode.workspace.fs.stat(potential_uri)
        target_workspace = folder
        break
      } catch {
        // file not in this workspace folder
      }
    }
  }

  if (!target_workspace) {
    Logger.error({
      function_name: 'handle_go_to_file_in_review',
      message: `Workspace not found for file: ${file_path}`,
      data: { file_path, workspace_name }
    })
    vscode.window.showErrorMessage(
      dictionary.error_message.WORKSPACE_NOT_FOUND_FOR_FILE(file_path)
    )
    return
  }

  const file_uri = vscode.Uri.joinPath(target_workspace.uri, file_path)

  try {
    const document = await vscode.workspace.openTextDocument(file_uri)
    await vscode.window.showTextDocument(document, { preview: false })
  } catch (error) {
    Logger.error({
      function_name: 'handle_go_to_file_in_review',
      message: `Could not open file: ${file_path}`,
      data: { error, file_uri: file_uri.toString() }
    })
    vscode.window.showErrorMessage(
      dictionary.error_message.COULD_NOT_OPEN_FILE(file_path)
    )
  }
}
