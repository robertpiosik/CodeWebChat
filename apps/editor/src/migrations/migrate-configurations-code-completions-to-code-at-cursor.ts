import * as vscode from 'vscode'
import { Logger } from '@shared/utils/logger'

const MIGRATION_ID =
  'configurations-code-completions-to-code-at-cursor-migration-20260131'
const OLD_KEY = 'configurationsForCodeCompletions'
const NEW_KEY = 'configurationsForCodeAtCursor'

/**
 * Migration to rename the configuration key 'configurationsForCodeCompletions' to 'configurationsForCodeAtCursor'.
 */
export async function migrate_configurations_code_completions_to_code_at_cursor(
  context: vscode.ExtensionContext
): Promise<void> {
  try {
    if (context.globalState.get(MIGRATION_ID)) {
      return
    }

    const config = vscode.workspace.getConfiguration('codeWebChat')
    const inspect = config.inspect<any[]>(OLD_KEY)

    if (inspect?.globalValue) {
      await config.update(
        NEW_KEY,
        inspect.globalValue,
        vscode.ConfigurationTarget.Global
      )
      // Remove old key
      await config.update(OLD_KEY, undefined, vscode.ConfigurationTarget.Global)

      Logger.info({
        function_name:
          'migrate_configurations_code_completions_to_code_at_cursor',
        message: `Successfully migrated configurations from '${OLD_KEY}' to '${NEW_KEY}'`
      })
    }

    await context.globalState.update(MIGRATION_ID, true)
  } catch (error) {
    Logger.error({
      function_name:
        'migrate_configurations_code_completions_to_code_at_cursor',
      message: 'Error migrating configurations',
      data: error instanceof Error ? error.message : String(error)
    })
  }
}
