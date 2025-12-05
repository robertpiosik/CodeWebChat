import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import { create_safe_path } from '../utils/path-sanitizer'
import { dictionary } from '@shared/constants/dictionary'

export function new_folder_command() {
  return vscode.commands.registerCommand(
    'codeWebChat.newFolder',
    async (item?: vscode.TreeItem | vscode.Uri) => {
      let parent_path: string | undefined

      // Handle case when invoked from view/title (no item parameter)
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
      }
      // Handle case when invoked with URI (from view/title)
      else if (item instanceof vscode.Uri) {
        parent_path = item.fsPath
      }
      // Handle case when invoked with TreeItem (from context menu)
      else if (item.resourceUri) {
        parent_path = item.resourceUri.fsPath
      }

      if (!parent_path) {
        vscode.window.showErrorMessage(
          dictionary.error_message.COULD_NOT_DETERMINE_LOCATION_TO_CREATE_FOLDER
        )
        return
      }

      try {
        const stats = fs.statSync(parent_path)
        if (!stats.isDirectory()) {
          // If it's a file, use its parent directory
          parent_path = path.dirname(parent_path)
        }
      } catch (error) {
        // If the path doesn't exist, we'll create it later
      }

      const folder_name = await vscode.window.showInputBox({
        prompt: 'Enter folder name',
        placeHolder: ''
      })

      if (!folder_name) {
        return
      }

      const is_file_like =
        folder_name.startsWith('.') || path.basename(folder_name).includes('.')

      try {
        const target_path = create_safe_path(parent_path, folder_name)

        if (!target_path) {
          vscode.window.showErrorMessage(
            is_file_like
              ? dictionary.error_message.INVALID_FILE_NAME(folder_name)
              : dictionary.error_message.INVALID_FOLDER_NAME(folder_name)
          )
          return
        }

        if (is_file_like) {
          const fileUri = vscode.Uri.file(target_path)

          try {
            await vscode.workspace.fs.stat(fileUri)
            vscode.window.showErrorMessage(
              dictionary.error_message.FILE_ALREADY_EXISTS(
                path.basename(target_path)
              )
            )
            return
          } catch {}

          const directory = path.dirname(target_path)
          await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory))

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
          return
        }

        try {
          await vscode.workspace.fs.stat(vscode.Uri.file(target_path))
          vscode.window.showErrorMessage(
            dictionary.error_message.FOLDER_ALREADY_EXISTS(
              path.basename(target_path)
            )
          )
          return
        } catch {
          // Folder doesn't exist, which is what we want
        }

        await vscode.workspace.fs.createDirectory(vscode.Uri.file(target_path))
      } catch (error: any) {
        if (is_file_like) {
          vscode.window.showErrorMessage(
            dictionary.error_message.FAILED_TO_CREATE_FILE(error.message)
          )
        } else {
          vscode.window.showErrorMessage(
            dictionary.error_message.FAILED_TO_CREATE_FOLDER(error.message)
          )
        }
      }
    }
  )
}
