import * as vscode from 'vscode'
import { WorkspaceProvider } from '@/context/providers/workspace/workspace-provider'

export const get_referencing_files_for_position = async (params: {
  uri: vscode.Uri
  position: vscode.Position
  workspace_provider: WorkspaceProvider
  ignore_paths: string[]
}): Promise<{ file_path: string; range: vscode.Range }[]> => {
  const locations = await vscode.commands.executeCommand<vscode.Location[]>(
    'vscode.executeReferenceProvider',
    params.uri,
    params.position
  )

  if (!locations || locations.length === 0) return []

  const file_map = new Map<string, vscode.Range>()
  locations.forEach((loc) => {
    const file_path = loc.uri.fsPath

    if (params.ignore_paths.includes(file_path)) return

    if (
      params.workspace_provider.get_workspace_root_for_file(file_path) &&
      !params.workspace_provider.is_ignored_by_patterns(file_path)
    ) {
      if (!file_map.has(file_path)) {
        file_map.set(file_path, loc.range)
      }
    }
  })

  return Array.from(file_map.entries()).map(([file_path, range]) => ({
    file_path,
    range
  }))
}
