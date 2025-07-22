import * as vscode from 'vscode'
import { Logger } from '../utils/logger'

const MIGRATION_ID = 'edit-to-edit-context-migration-20250720'

export async function migrate_edit_to_edit_context(
  context: vscode.ExtensionContext
): Promise<void> {
  try {
    if (context.workspaceState.get(MIGRATION_ID)) {
      return
    }

    const web_mode = context.workspaceState.get<string>('web-mode')
    if (web_mode == 'edit') {
      await context.workspaceState.update('web-mode', 'edit-context')
    }

    const api_mode = context.workspaceState.get<string>('api-mode')
    if (api_mode == 'edit') {
      await context.workspaceState.update('api-mode', 'edit-context')
    }

    await context.workspaceState.update(MIGRATION_ID, true)
  } catch (error) {
    Logger.error({
      function_name: 'migrate_edit_to_edit_context',
      message: 'Error migrating from "edit" to "edit-context"',
      data: error instanceof Error ? error.message : String(error)
    })
  }
}
