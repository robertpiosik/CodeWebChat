import * as vscode from 'vscode'
import { Logger } from '@shared/utils/logger'

const MIGRATION_ID = 'chat-presets-to-web-configurations-migration-20260611'

export async function migrate_chat_presets_to_web_configurations(
  context: vscode.ExtensionContext
): Promise<void> {
  try {
    if (context.globalState.get(MIGRATION_ID)) {
      return
    }

    const config = vscode.workspace.getConfiguration('codeWebChat')
    const inspect = config.inspect<any[]>('chatPresets')

    if (inspect?.globalValue !== undefined) {
      await config.update(
        'webConfigurations',
        inspect.globalValue,
        vscode.ConfigurationTarget.Global
      )
      await config.update(
        'chatPresets',
        undefined,
        vscode.ConfigurationTarget.Global
      )
    }

    await context.globalState.update(MIGRATION_ID, true)
    Logger.info({
      function_name: 'migrate_chat_presets_to_web_configurations',
      message: 'Successfully migrated chat presets to web configurations'
    })
  } catch (error) {
    Logger.error({
      function_name: 'migrate_chat_presets_to_web_configurations',
      message: 'Error migrating chat presets to web configurations',
      data: error instanceof Error ? error.message : String(error)
    })
  }
}