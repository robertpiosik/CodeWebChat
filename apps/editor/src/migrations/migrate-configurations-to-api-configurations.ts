import * as vscode from 'vscode'
import { Logger } from '@shared/utils/logger'

const MIGRATION_ID = 'configurations-to-api-configurations-migration-20260626'

export async function migrate_configurations_to_api_configurations(
  context: vscode.ExtensionContext
): Promise<void> {
  try {
    if (context.globalState.get(MIGRATION_ID)) {
      return
    }

    const config = vscode.workspace.getConfiguration('codeWebChat')
    const inspect = config.inspect<any[]>('configurations')

    if (inspect?.globalValue !== undefined) {
      await config.update(
        'apiConfigurations',
        inspect.globalValue,
        vscode.ConfigurationTarget.Global
      )
      await config.update(
        'configurations',
        undefined,
        vscode.ConfigurationTarget.Global
      )
    }

    await context.globalState.update(MIGRATION_ID, true)
    Logger.info({
      function_name: 'migrate_configurations_to_api_configurations',
      message: 'Successfully migrated configurations to api configurations'
    })
  } catch (error) {
    Logger.error({
      function_name: 'migrate_configurations_to_api_configurations',
      message: 'Error migrating configurations to api configurations',
      data: error instanceof Error ? error.message : String(error)
    })
  }
}
