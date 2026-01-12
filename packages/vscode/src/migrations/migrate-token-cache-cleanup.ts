import * as vscode from 'vscode'
import { Logger } from '@shared/utils/logger'

const MIGRATION_ID = 'token-cache-cleanup-20260112'
const OLD_KEY = 'token-cache'

/**
 * Migration to clear the old 'token-cache' from global state.
 */
export async function migrate_token_cache_cleanup(
  context: vscode.ExtensionContext
): Promise<void> {
  try {
    if (context.globalState.get(MIGRATION_ID)) {
      return
    }

    const old_cache = context.globalState.get(OLD_KEY)

    if (old_cache) {
      // Passing undefined removes the key from storage
      await context.globalState.update(OLD_KEY, undefined)

      Logger.info({
        function_name: 'migrate_token_cache_cleanup',
        message: "Successfully cleared old 'token-cache' from global state"
      })
    }

    await context.globalState.update(MIGRATION_ID, true)
  } catch (error) {
    Logger.error({
      function_name: 'migrate_token_cache_cleanup',
      message: "Error cleaning up old 'token-cache'",
      data: error instanceof Error ? error.message : String(error)
    })
  }
}
