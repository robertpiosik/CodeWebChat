import * as vscode from 'vscode'
import { SavedContext } from '@/types/context'
import {
  load_contexts_from_file,
  get_contexts_file_path
} from './context-file-utils'

export const load_and_merge_file_contexts = async (): Promise<{
  merged: SavedContext[]
  context_to_roots: Map<string, string[]>
}> => {
  const workspace_folders = vscode.workspace.workspaceFolders || []
  const contexts_by_name = new Map<
    string,
    { paths: string[]; roots: string[] }
  >()
  const should_prefix = workspace_folders.length > 1

  for (const folder of workspace_folders) {
    const contexts_file_path = get_contexts_file_path(folder.uri.fsPath)
    const contexts = load_contexts_from_file(contexts_file_path)

    for (const context of contexts) {
      if (!contexts_by_name.has(context.name)) {
        contexts_by_name.set(context.name, { paths: [], roots: [] })
      }
      const entry = contexts_by_name.get(context.name)!

      const paths_to_add = should_prefix
        ? context.paths.map((p) => `${folder.name}:${p}`)
        : context.paths

      entry.paths.push(...paths_to_add)
      entry.roots.push(folder.uri.fsPath)
    }
  }

  const merged: SavedContext[] = []
  const context_to_roots = new Map<string, string[]>()

  for (const [name, data] of contexts_by_name.entries()) {
    merged.push({
      name,
      paths: data.paths
    })
    context_to_roots.set(name, data.roots)
  }

  merged.sort((a, b) => a.name.localeCompare(b.name))

  return { merged, context_to_roots }
}
