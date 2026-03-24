import * as vscode from 'vscode'
import * as path from 'path'
import { WorkspaceProvider } from '../../../../context/providers/workspace/workspace-provider'

export const is_valid_uri = (
  uri_str: string,
  workspace_provider: WorkspaceProvider
): boolean => {
  const uri = vscode.Uri.parse(uri_str)
  const file_path = uri.fsPath
  const workspace_root =
    workspace_provider.get_workspace_root_for_file(file_path)
  if (!workspace_root) return false
  const relative_path = path.relative(workspace_root, file_path)
  return (
    !workspace_provider.is_ignored_by_patterns(file_path) &&
    !workspace_provider.is_excluded(relative_path)
  )
}
