import * as vscode from 'vscode'
import { ViewProvider } from '@/view/backend/view-provider'
import { GoToFileInReviewMessage } from '@/view/types/messages'
import { Logger } from '@shared/utils/logger'

export const handle_go_to_file_in_review = async (
  provider: ViewProvider,
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
    const error_message = `Workspace not found for file: ${file_path}`
    Logger.error({
      function_name: 'handle_go_to_file_in_review',
      message: error_message,
      data: { file_path, workspace_name }
    })
    vscode.window.showErrorMessage(error_message)
    return
  }

  const file_uri = vscode.Uri.joinPath(target_workspace.uri, file_path)

  try {
    const document = await vscode.workspace.openTextDocument(file_uri)
    await vscode.window.showTextDocument(document, { preview: false })
  } catch (error) {
    const error_message = `Could not open file: ${file_path}`
    Logger.error({
      function_name: 'handle_go_to_file_in_review',
      message: error_message,
      data: { error, file_uri: file_uri.toString() }
    })
    vscode.window.showErrorMessage(error_message)
  }
}