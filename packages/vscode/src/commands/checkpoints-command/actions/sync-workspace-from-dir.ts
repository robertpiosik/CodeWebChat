import * as vscode from 'vscode'
import { WorkspaceProvider } from '../../../context/providers/workspace-provider'
import { clean_directory, sync_directory } from '../utils'

export const sync_workspace_from_dir = async (params: {
  source_dir_uri: vscode.Uri
  workspace_provider: WorkspaceProvider
}) => {
  const workspace_folders = vscode.workspace.workspaceFolders!

  if (workspace_folders.length > 1) {
    const source_entries = await vscode.workspace.fs.readDirectory(
      params.source_dir_uri
    )
    const source_folders = new Map(source_entries)
    for (const folder of workspace_folders) {
      const source_folder_type = source_folders.get(folder.name)
      if (source_folder_type == vscode.FileType.Directory) {
        const source_folder_uri = vscode.Uri.joinPath(
          params.source_dir_uri,
          folder.name
        )
        await sync_directory({
          source_dir: source_folder_uri,
          dest_dir: folder.uri,
          root_path: folder.uri.fsPath,
          workspace_provider: params.workspace_provider
        })
      } else {
        await clean_directory({
          dir_uri: folder.uri,
          root_path: folder.uri.fsPath,
          workspace_provider: params.workspace_provider
        })
      }
    }
  } else {
    await sync_directory({
      source_dir: params.source_dir_uri,
      dest_dir: workspace_folders[0].uri,
      root_path: workspace_folders[0].uri.fsPath,
      workspace_provider: params.workspace_provider
    })
  }
}
