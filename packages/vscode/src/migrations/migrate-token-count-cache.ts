import * as vscode from 'vscode'
import { Logger } from '@shared/utils/logger'

const MIGRATION_ID = 'token-count-cache-cleanup-20260104'
const OLD_KEY = 'token-count-cache'

/**
 * Migration to clear the old token count cache from global state
 * as it has been moved to a file-based cache.
 */
export async function migrate_token_count_cache(
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
        function_name: 'migrate_token_count_cache',
        message: 'Successfully cleared old token count cache from global state'
      })
    }

    await context.globalState.update(MIGRATION_ID, true)
  } catch (error) {
    Logger.error({
      function_name: 'migrate_token_count_cache',
      message: 'Error cleaning up old token count cache',
      data: error instanceof Error ? error.message : String(error)
    })
  }
}
