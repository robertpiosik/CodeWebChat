import * as vscode from 'vscode'
import * as path from 'path'
import { WorkspaceProvider } from '../../../context/providers/workspace-provider'

export const clean_directory = async (params: {
  dir_uri: vscode.Uri
  root_path: string
  workspace_provider: WorkspaceProvider
}) => {
  const entries = await vscode.workspace.fs.readDirectory(params.dir_uri)
  for (const [name, type] of entries) {
    const entry_uri = vscode.Uri.joinPath(params.dir_uri, name)
    const relative_path = path.relative(params.root_path, entry_uri.fsPath)

    if (params.workspace_provider.is_excluded(relative_path)) {
      continue
    }

    if (
      type != vscode.FileType.Directory &&
      params.workspace_provider.is_ignored_by_patterns(entry_uri.fsPath)
    ) {
      continue
    }

    if (type == vscode.FileType.Directory) {
      await clean_directory({ ...params, dir_uri: entry_uri })
      try {
        // After cleaning, try to delete if empty. This will fail if it contains ignored files.
        const remaining = await vscode.workspace.fs.readDirectory(entry_uri)
        if (remaining.length == 0) {
          await vscode.workspace.fs.delete(entry_uri, {
            recursive: false
          })
        }
      } catch (e) {
        /* ignore */
      }
    } else {
      await vscode.workspace.fs.delete(entry_uri, { recursive: false })
    }
  }
}
