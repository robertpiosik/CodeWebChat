import * as vscode from 'vscode'
import { Logger } from '@shared/utils/logger'

const MIGRATION_ID = 'settings-keys-to-chatbots-and-models-migration-20261026'

export async function migrate_settings_keys_to_chatbots_and_models(
  extension_context: vscode.ExtensionContext
): Promise<void> {
  try {
    if (extension_context.globalState.get(MIGRATION_ID)) {
      return
    }

    const config = vscode.workspace.getConfiguration('codeWebChat')

    // Migrate webConfigurations -> chatbots
    const web_configs_inspect = config.inspect<any[]>('webConfigurations')
    if (web_configs_inspect?.globalValue !== undefined) {
      await config.update(
        'chatbots',
        web_configs_inspect.globalValue,
        vscode.ConfigurationTarget.Global
      )
      await config.update(
        'webConfigurations',
        undefined,
        vscode.ConfigurationTarget.Global
      )
    }

    // Migrate apiConfigurations -> models
    const api_configs_inspect = config.inspect<any[]>('apiConfigurations')
    if (api_configs_inspect?.globalValue !== undefined) {
      await config.update(
        'models',
        api_configs_inspect.globalValue,
        vscode.ConfigurationTarget.Global
      )
      await config.update(
        'apiConfigurations',
        undefined,
        vscode.ConfigurationTarget.Global
      )
    }

    await extension_context.globalState.update(MIGRATION_ID, true)
    Logger.info({
      function_name: 'migrate_settings_keys_to_chatbots_and_models',
      message: 'Successfully migrated settings keys to chatbots and models'
    })
  } catch (error) {
    Logger.error({
      function_name: 'migrate_settings_keys_to_chatbots_and_models',
      message: 'Error migrating settings keys to chatbots and models',
      data: error instanceof Error ? error.message : String(error)
    })
  }
}
