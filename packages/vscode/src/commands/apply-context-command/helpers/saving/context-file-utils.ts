import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import { SavedContext } from '@/types/context'

export function get_contexts_file_path(workspace_root: string): string {
  return path.join(workspace_root, '.vscode', 'contexts.json')
}

export function flatten_contexts(
  items: any[],
  parent_name = ''
): SavedContext[] {
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

function nest_contexts(contexts: SavedContext[]): any[] {
  const root: any[] = []

  const find_node = (nodes: any[], name: string) =>
    nodes.find((n) => n.name === name)

  for (const ctx of contexts) {
    const parts = ctx.name.split('/')
    let current_level = root

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      let node = find_node(current_level, part)

      if (!node) {
        node = { name: part }
        current_level.push(node)
      }

      if (i === parts.length - 1) {
        node.paths = ctx.paths
      } else {
        if (!node.children) {
          node.children = []
        }
        current_level = node.children
      }
    }
  }

  return root
}

export function load_contexts_from_file(file_path: string): SavedContext[] {
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

export async function load_all_contexts(): Promise<
  Map<string, { contexts: SavedContext[]; root: string }>
> {
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

export async function save_contexts_to_file(
  contexts: SavedContext[],
  file_path: string
): Promise<void> {
  try {
    const dir_path = path.dirname(file_path)
    if (!fs.existsSync(dir_path)) {
      fs.mkdirSync(dir_path, { recursive: true })
    }

    if (contexts.length === 0) {
      if (fs.existsSync(file_path)) {
        fs.unlinkSync(file_path)
      }
    } else {
      const nested = nest_contexts(contexts)
      fs.writeFileSync(file_path, JSON.stringify(nested, null, 2), 'utf8')
    }
  } catch (error: any) {
    throw new Error(`Failed to save contexts to file: ${error.message}`)
  }
}
