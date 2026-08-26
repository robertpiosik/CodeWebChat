import * as vscode from 'vscode'
import { WorkspaceProvider } from '@/context/providers/workspace/workspace-provider'
import { get_imports_for_uri } from '@/utils/get-imports-for-uri'

export const get_referencing_files_for_position = async (params: {
  uri: vscode.Uri
  position: vscode.Position
  workspace_provider: WorkspaceProvider
  ignore_paths: string[]
}): Promise<{ file_path: string; range: vscode.Range }[]> => {
  let locations = await vscode.commands.executeCommand<vscode.Location[]>(
    'vscode.executeReferenceProvider',
    params.uri,
    params.position
  )

  if (!locations || locations.length === 0) {
    await new Promise((resolve) => setTimeout(resolve, 500))
    locations = await vscode.commands.executeCommand<vscode.Location[]>(
      'vscode.executeReferenceProvider',
      params.uri,
      params.position
    )
  }

  if (!locations || locations.length === 0) return []

  const file_map = new Map<string, vscode.Range>()
  const cancel_token_source = new vscode.CancellationTokenSource()
  const cached_imports = new Map<string, string[]>()

  for (const loc of locations) {
    const file_path = loc.uri.fsPath

    if (params.ignore_paths.includes(file_path)) continue

    if (
      params.workspace_provider.get_workspace_root_for_file(file_path) &&
      !params.workspace_provider.is_ignored_by_patterns(file_path)
    ) {
      if (!file_map.has(file_path)) {
        let imports = cached_imports.get(file_path)
        if (!imports) {
          imports = await get_imports_for_uri(
            loc.uri,
            cancel_token_source.token
          )
          cached_imports.set(file_path, imports)
        }

        if (imports.includes(params.uri.toString())) {
          file_map.set(file_path, loc.range)
        }
      }
    }
  }

  cancel_token_source.dispose()

  return Array.from(file_map.entries()).map(([file_path, range]) => ({
    file_path,
    range
  }))
}
