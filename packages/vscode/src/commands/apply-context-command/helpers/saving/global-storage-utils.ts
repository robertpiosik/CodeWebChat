import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import { SavedContext } from '@/types/context'

const GLOBAL_CONTEXTS_FILENAME = 'saved-contexts.json'

type GlobalContextsData = Record<string, SavedContext[]>

const get_global_contexts_file_path = (
  context: vscode.ExtensionContext
): string => {
  return path.join(context.globalStorageUri.fsPath, GLOBAL_CONTEXTS_FILENAME)
}

const load_all_global_contexts = (
  context: vscode.ExtensionContext
): GlobalContextsData => {
  const file_path = get_global_contexts_file_path(context)
  try {
    if (fs.existsSync(file_path)) {
      const content = fs.readFileSync(file_path, 'utf8')
      return JSON.parse(content)
    }
  } catch (error) {
    console.error('Error loading global contexts:', error)
  }
  return {}
}

export const load_contexts_for_workspace = (
  context: vscode.ExtensionContext,
  workspace_root: string
): SavedContext[] => {
  const all_data = load_all_global_contexts(context)
  return all_data[workspace_root] || []
}

export const save_contexts_for_workspace = (
  context: vscode.ExtensionContext,
  workspace_root: string,
  contexts: SavedContext[]
): void => {
  const file_path = get_global_contexts_file_path(context)
  const dir_path = path.dirname(file_path)

  if (!fs.existsSync(dir_path)) {
    fs.mkdirSync(dir_path, { recursive: true })
  }

  const all_data = load_all_global_contexts(context)
  all_data[workspace_root] = contexts

  try {
    fs.writeFileSync(file_path, JSON.stringify(all_data, null, 2), 'utf8')
  } catch (error) {
    console.error('Error saving global contexts:', error)
    throw new Error('Failed to save contexts to global storage.')
  }
}
