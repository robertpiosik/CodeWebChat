import * as vscode from 'vscode'
import { Logger } from '@shared/utils/logger'

const MIGRATION_ID = 'api-providers-to-secret-storage-migration-20250525'
const SECRET_STORAGE_API_PROVIDERS_KEY = 'api-providers'
const SAVED_API_PROVIDERS_STATE_KEY = 'savedApiProviders'

/**
 * Migration to move API providers from GlobalState to SecretStorage
 * This migration runs only once per extension installation.
 */
export async function migrate_api_providers_to_secret_storage(
  context: vscode.ExtensionContext
): Promise<void> {
  try {
    if (context.globalState.get(MIGRATION_ID)) {
      Logger.info({
        function_name: 'migrate_api_providers_to_secret_storage',
        message:
          'API providers to Secret Storage migration already completed. Skipping.'
      })
      return
    }

    const providers = context.globalState.get<any[]>(
      SAVED_API_PROVIDERS_STATE_KEY,
      []
    )

    if (providers.length > 0) {
      await context.secrets.store(
        SECRET_STORAGE_API_PROVIDERS_KEY,
        JSON.stringify(providers)
      )

      await context.globalState.update(SAVED_API_PROVIDERS_STATE_KEY, undefined)

      Logger.info({
        function_name: 'migrate_api_providers_to_secret_storage',
        message: `Successfully migrated ${providers.length} API providers to Secret Storage`
      })
    } else {
      Logger.info({
        function_name: 'migrate_api_providers_to_secret_storage',
        message: 'No API providers found to migrate.'
      })
    }

    await context.globalState.update(MIGRATION_ID, true)
  } catch (error) {
    Logger.error({
      function_name: 'migrate_api_providers_to_secret_storage',
      message: 'Error migrating API providers to Secret Storage',
      data: error instanceof Error ? error.message : String(error)
    })
  }
}
