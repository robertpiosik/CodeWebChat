import * as vscode from 'vscode'
import { Logger } from '@shared/utils/logger'

export const get_workspace_map_and_default = (): {
  workspace_map: Map<string, string>
  default_workspace: string
} => {
  const workspace_map = new Map<string, string>()
  const folders = vscode.workspace.workspaceFolders

  if (!folders || folders.length == 0) {
    return { workspace_map, default_workspace: '' }
  }

  folders.forEach((folder) => {
    workspace_map.set(folder.name, folder.uri.fsPath)
  })

  return { workspace_map, default_workspace: folders[0].uri.fsPath }
}

export const resolve_workspace_root = (params: {
  workspace_name?: string
  workspace_map: Map<string, string>
  default_workspace: string
  file_path?: string
  function_name?: string
}): string => {
  if (params.workspace_name) {
    if (params.workspace_map.has(params.workspace_name)) {
      return params.workspace_map.get(params.workspace_name)!
    } else if (params.function_name) {
      Logger.warn({
        function_name: params.function_name,
        message: `Workspace '${params.workspace_name}' not found${
          params.file_path ? ` for file '${params.file_path}'` : ''
        }. Using default.`
      })
    }
  }
  return params.default_workspace
}
