import * as vscode from 'vscode'
import { Logger } from '@shared/utils/logger'

const MIGRATION_ID = 'prompt-templates-suffixes-migration-20260702'

export async function migrate_prompt_templates_suffixes(
  context: vscode.ExtensionContext
): Promise<void> {
  try {
    if (context.globalState.get(MIGRATION_ID)) {
      return
    }

    const config = vscode.workspace.getConfiguration('codeWebChat')

    const mappings = [
      {
        old: 'promptTemplatesForEditContext',
        new: 'promptTemplatesForEditFiles'
      },
      {
        old: 'promptTemplatesForAskAboutContext',
        new: 'promptTemplatesForAskAboutFiles'
      },
      {
        old: 'promptTemplatesForNoContext',
        new: 'promptTemplatesForWithoutFiles'
      }
    ]

    for (const mapping of mappings) {
      const inspect = config.inspect<any[]>(mapping.old)

      if (inspect?.globalValue !== undefined) {
        await config.update(
          mapping.new,
          inspect.globalValue,
          vscode.ConfigurationTarget.Global
        )
        await config.update(
          mapping.old,
          undefined,
          vscode.ConfigurationTarget.Global
        )
      }
    }

    await context.globalState.update(MIGRATION_ID, true)
    Logger.info({
      function_name: 'migrate_prompt_templates_suffixes',
      message: 'Successfully migrated prompt templates suffixes'
    })
  } catch (error) {
    Logger.error({
      function_name: 'migrate_prompt_templates_suffixes',
      message: 'Error migrating prompt templates suffixes',
      data: error instanceof Error ? error.message : String(error)
    })
  }
}
