import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import { create_safe_path } from '../utils/path-sanitizer'
import { dictionary } from '@shared/constants/dictionary'

export function new_file_command() {
  return vscode.commands.registerCommand(
    'codeWebChat.newFile',
    async (item?: vscode.TreeItem | vscode.Uri) => {
      let parent_path: string | undefined

      if (!item) {
        if (
          vscode.workspace.workspaceFolders &&
          vscode.workspace.workspaceFolders.length > 0
        ) {
          parent_path = vscode.workspace.workspaceFolders[0].uri.fsPath
        } else {
          vscode.window.showErrorMessage(
            dictionary.error_message.NO_WORKSPACE_FOLDER_OPEN
          )
          return
        }
      } else if (item instanceof vscode.Uri) {
        parent_path = item.fsPath
      } else if (item.resourceUri) {
        parent_path = item.resourceUri.fsPath
      }

      if (!parent_path) {
        vscode.window.showErrorMessage(
          dictionary.error_message.COULD_NOT_DETERMINE_LOCATION_TO_CREATE_FILE
        )
        return
      }

      try {
        const stats = fs.statSync(parent_path)
        if (!stats.isDirectory()) {
          parent_path = path.dirname(parent_path)
        }
      } catch {}

      const file_name = await vscode.window.showInputBox({
        prompt: 'Enter file name',
        placeHolder: ''
      })

      if (!file_name) {
        return
      }

      try {
        const file_path = create_safe_path(parent_path, file_name)

        if (!file_path) {
          vscode.window.showErrorMessage(
            dictionary.error_message.INVALID_FILE_NAME(file_name)
          )
          return
        }

        const fileUri = vscode.Uri.file(file_path)

        try {
          await vscode.workspace.fs.stat(fileUri)
          vscode.window.showErrorMessage(
            dictionary.error_message.FILE_ALREADY_EXISTS(
              path.basename(file_path)
            )
          )
          return
        } catch {}

        // Ensure parent directory exists (this does not trigger onDidCreateFiles)
        const directory = path.dirname(file_path)
        await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory))

        // Create the file via WorkspaceEdit to trigger onDidCreateFiles
        const edit = new vscode.WorkspaceEdit()
        edit.createFile(fileUri, {
          overwrite: false,
          contents: new Uint8Array()
        })
        const applied = await vscode.workspace.applyEdit(edit)
        if (!applied) {
          throw new Error('Failed to apply create file edit')
        }

        const document = await vscode.workspace.openTextDocument(fileUri)
        await vscode.window.showTextDocument(document, { preview: false })
      } catch (error: any) {
        vscode.window.showErrorMessage(
          dictionary.error_message.FAILED_TO_CREATE_FILE(error.message)
        )
      }
    }
  )
}
