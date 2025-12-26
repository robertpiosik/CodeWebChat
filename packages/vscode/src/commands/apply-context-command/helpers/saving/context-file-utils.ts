import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import { SavedContext } from '@/types/context'

export function get_contexts_file_path(workspace_root: string): string {
  return path.join(workspace_root, '.vscode', 'contexts.json')
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

    try {
      if (fs.existsSync(contexts_file_path)) {
        const content = fs.readFileSync(contexts_file_path, 'utf8')
        const parsed = JSON.parse(content)
        if (Array.isArray(parsed)) {
          const contexts = parsed.filter(
            (item) =>
              typeof item == 'object' &&
              item !== null &&
              typeof item.name == 'string' &&
              Array.isArray(item.paths) &&
              item.paths.every((p: any) => typeof p == 'string')
          ) as SavedContext[]

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
      }
    } catch (error: any) {
      console.error(`Error reading contexts file from ${folder.name}:`, error)
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
      fs.writeFileSync(file_path, JSON.stringify(contexts, null, 2), 'utf8')
    }
  } catch (error: any) {
    throw new Error(`Failed to save contexts to file: ${error.message}`)
  }
}
