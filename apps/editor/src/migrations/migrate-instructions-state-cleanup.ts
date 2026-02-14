import * as vscode from 'vscode'
import { Logger } from '@shared/utils/logger'

const MIGRATION_ID = 'instructions-state-cleanup-202602145'

const KEYS_TO_CLEAR = [
  'instructions-edit-context',
  'instructions-ask',
  'instructions-no-context',
  'instructions-code-at-cursor',
  'instructions-prune-context'
]

/**
 * Migration to clear instructions state keys from global and workspace state.
 */
export async function migrate_instructions_state_cleanup(
  context: vscode.ExtensionContext
): Promise<void> {
  try {
    if (!context.globalState.get(MIGRATION_ID)) {
      for (const key of KEYS_TO_CLEAR) {
        if (context.globalState.get(key) !== undefined) {
          await context.globalState.update(key, undefined)
        }
      }
      await context.globalState.update(MIGRATION_ID, true)
      Logger.info({
        function_name: 'migrate_instructions_state_cleanup',
        message:
          'Successfully cleared instructions state keys from global state'
      })
    }

    if (!context.workspaceState.get(MIGRATION_ID)) {
      for (const key of KEYS_TO_CLEAR) {
        if (context.workspaceState.get(key) !== undefined) {
          await context.workspaceState.update(key, undefined)
        }
      }
      await context.workspaceState.update(MIGRATION_ID, true)
      Logger.info({
        function_name: 'migrate_instructions_state_cleanup',
        message:
          'Successfully cleared instructions state keys from workspace state'
      })
    }
  } catch (error) {
    Logger.error({
      function_name: 'migrate_instructions_state_cleanup',
      message: 'Error cleaning up instructions state keys',
      data: error instanceof Error ? error.message : String(error)
    })
  }
}
