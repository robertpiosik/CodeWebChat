import * as vscode from 'vscode'
import { Logger } from '@shared/utils/logger'

const MIGRATION_ID = 'prompt-templates-to-templates-migration-20260816'

export async function migrate_prompt_templates_to_templates(
  extension_context: vscode.ExtensionContext
): Promise<void> {
  try {
    if (extension_context.globalState.get(MIGRATION_ID)) {
      return
    }

    const config = vscode.workspace.getConfiguration('codeWebChat')

    const mappings = [
      {
        old: 'promptTemplatesForEditFiles',
        new: 'templatesForEditFiles'
      },
      {
        old: 'promptTemplatesForAskAboutFiles',
        new: 'templatesForAskAboutFiles'
      },
      {
        old: 'promptTemplatesForCodeAtCursor',
        new: 'templatesForCodeAtCursor'
      },
      {
        old: 'promptTemplatesForWithoutFiles',
        new: 'templatesForWithoutFiles'
      },
      {
        old: 'promptTemplatesForFindRelevantFiles',
        new: 'templatesForFindRelevantFiles'
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

    await extension_context.globalState.update(MIGRATION_ID, true)
    Logger.info({
      function_name: 'migrate_prompt_templates_to_templates',
      message: 'Successfully migrated prompt templates to templates'
    })
  } catch (error) {
    Logger.error({
      function_name: 'migrate_prompt_templates_to_templates',
      message: 'Error migrating prompt templates to templates',
      data: error instanceof Error ? error.message : String(error)
    })
  }
}
