import * as path from 'path'
import { WorkspaceProvider } from '../providers/workspace/workspace-provider'
import { normalize_path } from '@/utils/normalize-path'

export const get_all_workspace_files = async (params: {
  workspace_provider: WorkspaceProvider
}): Promise<string[]> => {
  const is_multi_root =
    params.workspace_provider.get_workspace_roots().length > 1
  const file_paths: string[] = []

  for (const root_path of params.workspace_provider.get_workspace_roots()) {
    const files = await params.workspace_provider.find_all_files(root_path)

    for (const file_path of files) {
      const workspace_root =
        params.workspace_provider.get_workspace_root_for_file(file_path)
      if (!workspace_root) {
        file_paths.push(normalize_path(file_path))
        continue
      }
      const relative_path = normalize_path(
        path.relative(workspace_root, file_path)
      )

      if (is_multi_root) {
        const workspace_name =
          params.workspace_provider.get_workspace_name(workspace_root)
        file_paths.push(`${workspace_name}/${relative_path}`)
      } else {
        file_paths.push(relative_path)
      }
    }
  }

  return file_paths
}
