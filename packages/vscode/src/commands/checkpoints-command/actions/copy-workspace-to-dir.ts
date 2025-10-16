import * as vscode from 'vscode'
import * as path from 'path'
import { WorkspaceProvider } from '../../../context/providers/workspace-provider'
import { copy_optimised_recursively } from '../utils'

export const copy_workspace_to_dir = async (
  dest_dir_uri: vscode.Uri,
  workspace_provider: WorkspaceProvider
) => {
  const workspace_folders = vscode.workspace.workspaceFolders!
  const dest_dir_path = dest_dir_uri.fsPath

  for (const folder of workspace_folders) {
    const dest_folder_path =
      workspace_folders.length > 1
        ? path.join(dest_dir_path, folder.name)
        : dest_dir_path
    const dest_folder_uri = vscode.Uri.file(dest_folder_path)
    if (workspace_folders.length > 1) {
      await vscode.workspace.fs.createDirectory(dest_folder_uri)
    }

    const entries = await vscode.workspace.fs.readDirectory(folder.uri)
    for (const [name] of entries) {
      await copy_optimised_recursively(
        vscode.Uri.joinPath(folder.uri, name),
        vscode.Uri.joinPath(dest_folder_uri, name),
        folder.uri.fsPath,
        workspace_provider
      )
    }
  }
}
