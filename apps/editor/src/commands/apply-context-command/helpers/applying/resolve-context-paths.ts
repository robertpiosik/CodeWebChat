import * as vscode from 'vscode'
import * as path from 'path'
import { SavedContext } from '@/types/context'
import { WorkspaceProvider } from '@/context/providers/workspace/workspace-provider'
import { Logger } from '@shared/utils/logger'
import { resolve_glob_patterns } from './resolve-glob-patterns'

export const resolve_context_paths = async (
  context: SavedContext,
  workspace_root: string,
  workspace_provider: WorkspaceProvider
): Promise<string[]> => {
  const workspace_folders = vscode.workspace.workspaceFolders || []
  const workspace_map = new Map<string, string>()

  for (const folder of workspace_folders) {
    workspace_map.set(folder.name, folder.uri.fsPath)
  }

  const absolute_paths = context.paths.map((prefixed_path) => {
    const is_exclude = prefixed_path.startsWith('!')
    const path_part = is_exclude ? prefixed_path.substring(1) : prefixed_path

    let resolved_path_part: string

    if (path_part.includes(':')) {
      const [prefix, relative_path] = path_part.split(':', 2)

      const root = workspace_map.get(prefix)

      if (root) {
        resolved_path_part = path.join(root, relative_path)
      } else {
        Logger.warn({
          function_name: 'resolve_context_paths',
          message: `Unknown workspace prefix "${prefix}" in path "${path_part}". Treating as relative to current workspace root.`
        })
        resolved_path_part = path.join(workspace_root, relative_path)
      }
    } else {
      resolved_path_part = path.isAbsolute(path_part)
        ? path_part
        : path.join(workspace_root, path_part)
    }

    return is_exclude ? `!${resolved_path_part}` : resolved_path_part
  })

  return resolve_glob_patterns(absolute_paths, workspace_provider)
}
