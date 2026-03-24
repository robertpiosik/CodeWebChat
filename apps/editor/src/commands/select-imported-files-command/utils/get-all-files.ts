import * as vscode from 'vscode'
import { WorkspaceProvider } from '../../../../context/providers/workspace/workspace-provider'
import { is_valid_uri } from './is-valid-uri'

export const get_all_files = async (
  uri: vscode.Uri,
  workspace_provider: WorkspaceProvider
): Promise<vscode.Uri[]> => {
  try {
    const stat = await vscode.workspace.fs.stat(uri)
    if (stat.type & vscode.FileType.File) {
      return [uri]
    } else if (stat.type & vscode.FileType.Directory) {
      const results: vscode.Uri[] = []
      const entries = await vscode.workspace.fs.readDirectory(uri)
      for (const [name, type] of entries) {
        const child_uri = vscode.Uri.joinPath(uri, name)
        if (!is_valid_uri(child_uri.toString(), workspace_provider)) continue
        if (type & vscode.FileType.File) {
          results.push(child_uri)
        } else if (type & vscode.FileType.Directory) {
          results.push(...(await get_all_files(child_uri, workspace_provider)))
        }
      }
      return results
    }
  } catch {}
  return []
}
