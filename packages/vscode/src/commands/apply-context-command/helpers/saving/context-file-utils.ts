import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import { SavedContext } from '@/types/context'

export const get_contexts_file_path = (workspace_root: string): string => {
  return path.join(workspace_root, '.vscode', 'contexts.json')
}

export const flatten_contexts = (
  items: any[],
  parent_name = ''
): SavedContext[] => {
  const result: SavedContext[] = []
  if (!Array.isArray(items)) return result

  for (const item of items) {
    if (typeof item !== 'object' || item === null) continue

    const name = item.name
    if (typeof name !== 'string' || !name) continue

    const current_name = parent_name ? `${parent_name}/${name}` : name

    if (
      Array.isArray(item.paths) &&
      item.paths.every((p: any) => typeof p === 'string')
    ) {
      result.push({
        name: current_name,
        paths: item.paths
      })
    }

    if (Array.isArray(item.children)) {
      result.push(...flatten_contexts(item.children, current_name))
    }
  }
  return result
}

export const load_contexts_from_file = (file_path: string): SavedContext[] => {
  try {
    if (fs.existsSync(file_path)) {
      const content = fs.readFileSync(file_path, 'utf8')
      const parsed = JSON.parse(content)
      return flatten_contexts(parsed)
    }
  } catch (error) {
    console.error(`Error reading contexts file from ${file_path}:`, error)
  }
  return []
}

export const load_all_contexts = async (): Promise<
  Map<string, { contexts: SavedContext[]; root: string }>
> => {
  const workspace_folders = vscode.workspace.workspaceFolders || []
  const contexts_by_name = new Map<
    string,
    { contexts: SavedContext[]; root: string }
  >()

  for (const folder of workspace_folders) {
    const contexts_file_path = get_contexts_file_path(folder.uri.fsPath)
    const contexts = load_contexts_from_file(contexts_file_path)

    for (const context of contexts) {
      if (!contexts_by_name.has(context.name)) {
        contexts_by_name.set(context.name, {
          contexts: [],
          root: folder.uri.fsPath
        })
      }
      contexts_by_name.get(context.name)!.contexts.push({
        ...context,
        _root: folder.uri.fsPath
      } as any)
    }
  }

  return contexts_by_name
}

export const save_contexts_to_file = async (
  contexts: SavedContext[],
  file_path: string
): Promise<void> => {
  try {
    const dir_path = path.dirname(file_path)
    if (!fs.existsSync(dir_path)) {
      fs.mkdirSync(dir_path, { recursive: true })
    }

    if (contexts.length == 0) {
      if (fs.existsSync(file_path)) {
        fs.unlinkSync(file_path)
      }
    } else {
      fs.writeFileSync(file_path, JSON.stringify(contexts, null, 2), 'utf8')
    }
  } catch (error: any) {
    throw new Error(`Failed to save contexts to file: ${error.message}`)
  }
}

export const resolve_unique_context_name = (
  base_name: string,
  existing_names: string[]
): string => {
  let name = base_name
  let counter = 1
  const existing_set = new Set(existing_names)

  while (existing_set.has(name)) {
    name = `${base_name} (${counter})`
    counter++
  }

  return name
}
