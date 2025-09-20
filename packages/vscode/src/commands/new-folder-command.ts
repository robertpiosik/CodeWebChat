import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import { create_safe_path } from '../utils/path-sanitizer'
import { DICTIONARY } from '@/constants/dictionary'

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
          DICTIONARY.COULD_NOT_DETERMINE_LOCATION_TO_CREATE_FOLDER
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

      try {
        const new_folder_path = create_safe_path(parent_path, folder_name)

        if (!new_folder_path) {
          vscode.window.showErrorMessage(
            DICTIONARY.INVALID_FOLDER_NAME(folder_name)
          )
          return
        }

        try {
          await vscode.workspace.fs.stat(vscode.Uri.file(new_folder_path))
          vscode.window.showErrorMessage(
            DICTIONARY.FOLDER_ALREADY_EXISTS(path.basename(new_folder_path))
          )
          return
        } catch {
          // Folder doesn't exist, which is what we want
        }

        await vscode.workspace.fs.createDirectory(
          vscode.Uri.file(new_folder_path)
        )
      } catch (error: any) {
        vscode.window.showErrorMessage(
          DICTIONARY.FAILED_TO_CREATE_FOLDER(error.message)
        )
      }
    }
  )
}
