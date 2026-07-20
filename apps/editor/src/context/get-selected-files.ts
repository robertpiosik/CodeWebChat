import * as path from 'path'
import { WorkspaceProvider } from './providers/workspace/workspace-provider'
import { SharedContextState } from './shared-context-state'

export const get_selected_files = (params: {
  workspace_provider: WorkspaceProvider
  shared_context_state: SharedContextState
}): string[] => {
  const selected_files = params.shared_context_state.get_checked_files()
  const is_multi_root =
    params.workspace_provider.get_workspace_roots().length > 1
  const file_paths: string[] = []

  for (const file_path of selected_files) {
    const workspace_root =
      params.workspace_provider.get_workspace_root_for_file(file_path)
    if (!workspace_root) {
      file_paths.push(file_path.replace(/\\/g, '/'))
      continue
    }
    const relative_path = path
      .relative(workspace_root, file_path)
      .replace(/\\/g, '/')

    if (is_multi_root) {
      const workspace_name =
        params.workspace_provider.get_workspace_name(workspace_root)
      file_paths.push(`${workspace_name}/${relative_path}`)
    } else {
      file_paths.push(relative_path)
    }
  }

  return file_paths
}
