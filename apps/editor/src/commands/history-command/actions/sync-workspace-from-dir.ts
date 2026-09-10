import * as vscode from 'vscode'
import { WorkspaceProvider } from '@/context/providers/workspace/workspace-provider'
import { sync_directory } from '../utils/sync-directory'

export const sync_workspace_from_dir = async (params: {
  source_dir_uri: vscode.Uri
  workspace_provider: WorkspaceProvider
  progress?: vscode.Progress<{ message?: string; increment?: number }>
}) => {
  const workspace_folders = vscode.workspace.workspaceFolders!

  if (workspace_folders.length > 1) {
    const source_entries = await vscode.workspace.fs.readDirectory(
      params.source_dir_uri
    )
    const source_folders = new Map(source_entries)
    for (let index = 0; index < workspace_folders.length; index++) {
      const folder = workspace_folders[index]
      const folder_key = `${index}-${folder.name}`

      if (
        source_folders.has(folder_key) &&
        source_folders.get(folder_key) == vscode.FileType.Directory
      ) {
        const source_folder_uri = vscode.Uri.joinPath(
          params.source_dir_uri,
          folder_key
        )
        await sync_directory({
          source_dir: source_folder_uri,
          dest_dir: folder.uri,
          root_path: folder.uri.fsPath,
          workspace_provider: params.workspace_provider,
          progress: params.progress
        })
      }
    }
  } else {
    await sync_directory({
      source_dir: params.source_dir_uri,
      dest_dir: workspace_folders[0].uri,
      root_path: workspace_folders[0].uri.fsPath,
      workspace_provider: params.workspace_provider,
      progress: params.progress
    })
  }
}
