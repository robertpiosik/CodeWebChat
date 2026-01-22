import * as vscode from 'vscode'
import * as path from 'path'
import { OpenFileAndSelectMessage } from '@/views/panel/types/messages'
import { Logger } from '@shared/utils/logger'
import { dictionary } from '@shared/constants/dictionary'

export const handle_open_file_and_select = async (
  message: OpenFileAndSelectMessage
): Promise<void> => {
  const { file_path, start, end } = message
  const workspace_folders = vscode.workspace.workspaceFolders
  if (!workspace_folders) {
    Logger.warn({
      function_name: 'handle_open_file_and_select',
      message: 'No workspace folders open'
    })
    return
  }

  let file_uri: vscode.Uri | undefined

  if (path.isAbsolute(file_path)) {
    file_uri = vscode.Uri.file(file_path)
  } else if (workspace_folders.length > 1) {
    for (const folder of workspace_folders) {
      if (file_path.startsWith(`${folder.name}/`)) {
        file_uri = vscode.Uri.joinPath(
          folder.uri,
          file_path.substring(folder.name.length + 1)
        )
        break
      }
    }
  }

  if (!file_uri) {
    if (workspace_folders.length == 1) {
      file_uri = vscode.Uri.joinPath(workspace_folders[0].uri, file_path)
    } else {
      for (const folder of workspace_folders) {
        const potential_uri = vscode.Uri.joinPath(folder.uri, file_path)
        try {
          await vscode.workspace.fs.stat(potential_uri)
          file_uri = potential_uri
          break
        } catch {
          // file not in this workspace folder
        }
      }
    }
  }

  if (!file_uri) {
    Logger.error({
      function_name: 'handle_open_file_and_select',
      message: `Workspace not found for file: ${file_path}`,
      data: { file_path }
    })
    vscode.window.showErrorMessage(
      dictionary.error_message.WORKSPACE_NOT_FOUND_FOR_FILE(file_path)
    )
    return
  }

  try {
    const document = await vscode.workspace.openTextDocument(file_uri)
    const editor = await vscode.window.showTextDocument(document, {
      preview: false
    })

    if (start) {
      const [start_line_str, start_col_str] = start.split(':')
      const start_line = parseInt(start_line_str, 10)
      const start_col = parseInt(start_col_str, 10)

      if (!isNaN(start_line) && !isNaN(start_col)) {
        const start_pos = new vscode.Position(start_line - 1, start_col - 1)
        let end_pos = start_pos

        if (end) {
          const [end_line_str, end_col_str] = end.split(':')
          const end_line = parseInt(end_line_str, 10)
          const end_col = parseInt(end_col_str, 10)

          if (!isNaN(end_line) && !isNaN(end_col)) {
            end_pos = new vscode.Position(end_line - 1, end_col - 1)
          }
        }

        const selection = new vscode.Selection(start_pos, end_pos)
        editor.selection = selection
        editor.revealRange(
          selection,
          vscode.TextEditorRevealType.InCenterIfOutsideViewport
        )
      }
    }
  } catch (error) {
    Logger.error({
      function_name: 'handle_open_file_and_select',
      message: `Could not open file: ${file_path}`,
      data: { error, file_uri: file_uri.toString() }
    })
    vscode.window.showErrorMessage(
      dictionary.error_message.COULD_NOT_OPEN_FILE(file_path)
    )
  }
}
