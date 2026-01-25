import * as vscode from 'vscode'
import { Logger } from '@shared/utils/logger'

const MIGRATION_ID = 'api-providers-to-model-providers-migration-20250916'
const OLD_KEY = 'api-providers'
const NEW_KEY = 'model-providers'

/**
 * Migration to rename the secret storage key for providers from 'api-providers' to 'model-providers'.
 * This migration runs only once per extension installation.
 */
export async function migrate_api_providers_to_model_providers(
  context: vscode.ExtensionContext
): Promise<void> {
  try {
    if (context.globalState.get(MIGRATION_ID)) {
      return
    }

    const providers_json = await context.secrets.get(OLD_KEY)

    if (providers_json) {
      await context.secrets.store(NEW_KEY, providers_json)
      await context.secrets.delete(OLD_KEY)

      Logger.info({
        function_name: 'migrate_api_providers_to_model_providers',
        message: `Successfully migrated providers from '${OLD_KEY}' to '${NEW_KEY}'`
      })
    }

    await context.globalState.update(MIGRATION_ID, true)
  } catch (error) {
    Logger.error({
      function_name: 'migrate_api_providers_to_model_providers',
      message: 'Error migrating providers to new secret storage key',
      data: error instanceof Error ? error.message : String(error)
    })
  }
}
