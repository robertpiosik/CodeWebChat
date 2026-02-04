import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import { Logger } from '@shared/utils/logger'
import { SavedContext } from '@/types/context'

const MIGRATION_ID = 'saved-contexts-to-global-storage-migration-202601051'
// NOTE: This key is a guess, as the original value of SAVED_CONTEXTS_STATE_KEY was not provided.
const OLD_KEY = 'savedContexts'
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
    Logger.warn({
      function_name: 'load_all_global_contexts',
      message: 'Error loading global contexts during migration',
      data: error
    })
  }
  return {}
}

const save_all_global_contexts = (
  context: vscode.ExtensionContext,
  data: GlobalContextsData
) => {
  const file_path = get_global_contexts_file_path(context)
  const dir_path = path.dirname(file_path)

  if (!fs.existsSync(dir_path)) {
    fs.mkdirSync(dir_path, { recursive: true })
  }

  try {
    fs.writeFileSync(file_path, JSON.stringify(data, null, 2), 'utf8')
  } catch (error) {
    Logger.error({
      function_name: 'save_all_global_contexts',
      message: 'Error saving global contexts during migration',
      data: error
    })
    throw new Error('Failed to save contexts to global storage.')
  }
}

/**
 * Migration to move saved contexts from workspaceState to a file-based global storage.
 * This makes the saved contexts persistent per workspace folder across different VS Code windows.
 */
export async function migrate_saved_contexts_to_global_storage(
  context: vscode.ExtensionContext
): Promise<void> {
  try {
    if (context.globalState.get(MIGRATION_ID)) {
      return
    }

    const old_contexts = context.workspaceState.get<SavedContext[]>(OLD_KEY)

    if (
      old_contexts &&
      Array.isArray(old_contexts) &&
      old_contexts.length > 0
    ) {
      const workspace_folders = vscode.workspace.workspaceFolders
      if (workspace_folders && workspace_folders.length > 0) {
        const primary_workspace_root = workspace_folders[0].uri.fsPath

        const all_global_contexts = load_all_global_contexts(context)

        const existing_contexts =
          all_global_contexts[primary_workspace_root] || []
        const existing_names = new Set(existing_contexts.map((c) => c.name))
        const contexts_to_migrate = old_contexts.filter(
          (c) => c.name && !existing_names.has(c.name)
        )

        if (contexts_to_migrate.length > 0) {
          all_global_contexts[primary_workspace_root] = [
            ...contexts_to_migrate,
            ...existing_contexts
          ]
          save_all_global_contexts(context, all_global_contexts)

          Logger.info({
            function_name: 'migrate_saved_contexts_to_global_storage',
            message: `Successfully migrated ${contexts_to_migrate.length} saved contexts for workspace: ${primary_workspace_root}`
          })
        }
      }

      await context.workspaceState.update(OLD_KEY, undefined)
      Logger.info({
        function_name: 'migrate_saved_contexts_to_global_storage',
        message: 'Removed old saved contexts from workspaceState.'
      })
    }

    await context.globalState.update(MIGRATION_ID, true)
  } catch (error) {
    Logger.error({
      function_name: 'migrate_saved_contexts_to_global_storage',
      message: 'Error migrating saved contexts to global storage',
      data: error instanceof Error ? error.message : String(error)
    })
  }
}
