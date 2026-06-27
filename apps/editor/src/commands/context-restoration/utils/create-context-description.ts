import * as vscode from 'vscode'
import * as path from 'path'
import { SavedContext } from '@/types/context'
import { WorkspaceProvider } from '../../../context/providers/workspace/workspace-provider'
import { resolve_context_paths } from './resolve-context-paths'
import { display_token_count } from '../../../utils/display-token-count'

export const create_context_description = async (params: {
  context: SavedContext
  workspace_provider: WorkspaceProvider
  roots: string[]
}): Promise<{ description: string; resolved_paths: string[] }> => {
  const primary_workspace_root =
    params.workspace_provider.get_workspace_roots()[0] || ''

  const resolved_paths = await resolve_context_paths({
    context: params.context,
    workspace_root: primary_workspace_root,
    workspace_provider: params.workspace_provider
  })

  const token_counts = await Promise.all(
    resolved_paths.map((p) =>
      params.workspace_provider.calculate_file_tokens(p)
    )
  )
  const total_tokens = token_counts.reduce((acc, tc) => acc + tc.total, 0)
  const formatted_tokens = display_token_count(total_tokens)

  let description = `${formatted_tokens} · ${resolved_paths.length} file${resolved_paths.length == 1 ? '' : 's'}`

  const is_multi_root = (vscode.workspace.workspaceFolders || []).length > 1
  if (params.roots.length > 0 && (params.roots.length > 1 || is_multi_root)) {
    const workspace_names = params.roots.map((root) => {
      const folder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(root))
      return folder?.name || path.basename(root)
    })
    description += ` · ${workspace_names.join(', ')}`
  }

  return { description, resolved_paths }
}
