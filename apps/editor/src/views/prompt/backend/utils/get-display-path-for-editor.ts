import * as path from 'path'
import { WorkspaceProvider } from '@/context/providers/workspace/workspace-provider'
import { normalize_path } from '@/utils/normalize-path'

export const get_display_path_for_editor = (
  file_path: string,
  workspace_provider: WorkspaceProvider
): string => {
  const workspace_root = workspace_provider.get_workspace_root_for_file(file_path)

  if (workspace_root) {
    const relative_path = normalize_path(path.relative(workspace_root, file_path))
    const workspace_roots = workspace_provider.get_workspace_roots()

    if (workspace_roots.length > 1) {
      const workspace_name = workspace_provider.get_workspace_name(workspace_root)
      return `${workspace_name}/${relative_path}`
    } else {
      return relative_path
    }
  }

  return normalize_path(file_path)
}
