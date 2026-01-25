import * as vscode from 'vscode'
import * as path from 'path'
import { ShowDiffMessage } from '@/views/panel/types/messages'
import { Logger } from '@shared/utils/logger'
import { dictionary } from '@shared/constants/dictionary'

export const handle_show_diff = async (
  message: ShowDiffMessage
): Promise<void> => {
  const { file_path } = message
  const workspace_folders = vscode.workspace.workspaceFolders
  if (!workspace_folders) {
    Logger.warn({
      function_name: 'handle_show_diff',
      message: 'No workspace folders open'
    })
    vscode.window.showWarningMessage(
      dictionary.error_message.NO_WORKSPACE_FOLDERS_FOUND
    )
    return
  }

  let target_workspace: vscode.WorkspaceFolder | undefined

  if (workspace_folders.length == 1) {
    target_workspace = workspace_folders[0]
  } else {
    for (const folder of workspace_folders) {
      const potential_uri = vscode.Uri.joinPath(folder.uri, file_path)
      try {
        await vscode.workspace.fs.stat(potential_uri)
        target_workspace = folder
        break
      } catch {}
    }
  }

  if (!target_workspace) {
    const error_message =
      dictionary.error_message.WORKSPACE_NOT_FOUND_FOR_FILE(file_path)
    Logger.error({
      function_name: 'handle_show_diff',
      message: error_message,
      data: { file_path }
    })
    vscode.window.showErrorMessage(error_message)
    return
  }

  const rightUri = vscode.Uri.joinPath(target_workspace.uri, file_path)

  try {
    const leftUri = rightUri.with({
      scheme: 'git',
      query: JSON.stringify({ path: rightUri.fsPath, ref: 'HEAD' })
    })
    const file_name = path.basename(file_path)
    const title = `${file_name} (HEAD ↔ Working Tree)`

    await vscode.commands.executeCommand(
      'vscode.diff',
      leftUri,
      rightUri,
      title
    )
  } catch (error) {
    const error_message = `Could not show diff for file: ${file_path}`
    Logger.error({
      function_name: 'handle_show_diff',
      message: error_message,
      data: { error, file_path }
    })
    vscode.window.showErrorMessage(`${error_message}. See logs for details.`)
  }
}
