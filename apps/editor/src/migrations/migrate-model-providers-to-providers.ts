import * as vscode from 'vscode'
import { Logger } from '@shared/utils/logger'
import { SECRET_STORAGE_PROVIDERS_KEY } from '@/constants/secret-storage-keys'

const MIGRATION_ID = 'model-providers-to-providers-migration-20260920'

export async function migrate_model_providers_to_providers(
  extension_context: vscode.ExtensionContext
): Promise<void> {
  try {
    if (extension_context.globalState.get(MIGRATION_ID)) {
      return
    }

    const config = vscode.workspace.getConfiguration('codeWebChat')
    const inspect = config.inspect<any[]>('modelProviders')

    if (inspect?.globalValue !== undefined) {
      await config.update(
        'providers',
        inspect.globalValue,
        vscode.ConfigurationTarget.Global
      )
      await config.update(
        'modelProviders',
        undefined,
        vscode.ConfigurationTarget.Global
      )
    }

    const old_secrets_key = 'model-providers'
    const old_secrets = await extension_context.secrets.get(old_secrets_key)
    if (old_secrets) {
      await extension_context.secrets.store(
        SECRET_STORAGE_PROVIDERS_KEY,
        old_secrets
      )
      await extension_context.secrets.delete(old_secrets_key)
    }

    await extension_context.globalState.update(MIGRATION_ID, true)
    Logger.info({
      function_name: 'migrate_model_providers_to_providers',
      message: 'Successfully migrated model providers to providers'
    })
  } catch (error) {
    Logger.error({
      function_name: 'migrate_model_providers_to_providers',
      message: 'Error migrating model providers to providers',
      data: error instanceof Error ? error.message : String(error)
    })
  }
}
