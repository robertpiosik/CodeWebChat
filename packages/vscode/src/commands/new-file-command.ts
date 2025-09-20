import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import { create_safe_path } from '../utils/path-sanitizer'
import { DICTIONARY } from '@/constants/dictionary'

export function new_file_command() {
  return vscode.commands.registerCommand(
    'codeWebChat.newFile',
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
          vscode.window.showErrorMessage(DICTIONARY.NO_WORKSPACE_FOLDER_OPEN)
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
          DICTIONARY.COULD_NOT_DETERMINE_LOCATION_TO_CREATE_FILE
        )
        return
      }

      // Check if the parent_path is a file and not a directory
      try {
        const stats = fs.statSync(parent_path)
        if (!stats.isDirectory()) {
          parent_path = path.dirname(parent_path)
        }
      } catch (error) {
        // If the path doesn't exist, we'll create it later
      }

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
            DICTIONARY.INVALID_FILE_NAME(file_name)
          )
          return
        }

        // Check if file already exists
        try {
          await vscode.workspace.fs.stat(vscode.Uri.file(file_path))
          vscode.window.showErrorMessage(
            DICTIONARY.FILE_ALREADY_EXISTS(path.basename(file_path))
          )
          return
        } catch {
          // File doesn't exist, which is what we want
        }

        const directory = path.dirname(file_path)
        await vscode.workspace.fs.createDirectory(vscode.Uri.file(directory))

        await vscode.workspace.fs.writeFile(
          vscode.Uri.file(file_path),
          new Uint8Array()
        )

        const document = await vscode.workspace.openTextDocument(file_path)
        await vscode.window.showTextDocument(document)
      } catch (error: any) {
        vscode.window.showErrorMessage(
          DICTIONARY.FAILED_TO_CREATE_FILE(error.message)
        )
      }
    }
  )
}
