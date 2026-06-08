import * as vscode from 'vscode'
import { Logger } from '@shared/utils/logger'

const MIGRATION_ID = 'preset-affix-to-prompt-template-migration-202606082'

export async function migrate_preset_affix_to_prompt_template(
  context: vscode.ExtensionContext
): Promise<void> {
  try {
    if (context.globalState.get(MIGRATION_ID)) {
      return
    }

    const MAPPINGS = [
      {
        preset_key: 'chatPresetsForAskAboutContext',
        template_key: 'promptTemplatesForAskAboutContext'
      },
      {
        preset_key: 'chatPresetsForEditContext',
        template_key: 'promptTemplatesForEditContext'
      },
      {
        preset_key: 'chatPresetsForCodeAtCursor',
        template_key: 'promptTemplatesForCodeAtCursor'
      },
      {
        preset_key: 'chatPresetsForFindRelevantFiles',
        template_key: 'promptTemplatesForFindRelevantFiles'
      },
      {
        preset_key: 'chatPresetsForNoContext',
        template_key: 'promptTemplatesForNoContext'
      }
    ]

    for (const mapping of MAPPINGS) {
      // Fetch fresh configuration inside the loop to ensure we don't have stale data
      const config = vscode.workspace.getConfiguration('codeWebChat')
      const presetsInspect = config.inspect<any[]>(mapping.preset_key)

      if (
        presetsInspect?.globalValue &&
        Array.isArray(presetsInspect.globalValue)
      ) {
        // Deep copy the array so we don't mutate the internal cached objects of VS Code.
        // Mutating them can cause config.update to fail silently because VS Code
        // thinks the new value is identical to the current value.
        const presets = JSON.parse(JSON.stringify(presetsInspect.globalValue))
        const newTemplates: any[] = []

        for (const preset of presets) {
          if (preset.promptPrefix || preset.promptSuffix) {
            const prefix = preset.promptPrefix ? `${preset.promptPrefix}\n` : ''
            const suffix = preset.promptSuffix ? `\n${preset.promptSuffix}` : ''
            const templateText = `${prefix}{text}${suffix}`

            const template: any = {
              template: templateText
            }

            if (preset.name && !/^\(\d+\)$/.test(preset.name.trim())) {
              template.name = preset.name
            }

            newTemplates.push(template)
          }
        }

        if (newTemplates.length > 0) {
          const templatesInspect = config.inspect<any[]>(mapping.template_key)
          const currentTemplates = Array.isArray(
            templatesInspect?.globalValue
          )
            ? JSON.parse(JSON.stringify(templatesInspect.globalValue))
            : []

          const updatedTemplates = [...newTemplates, ...currentTemplates]
          await config.update(
            mapping.template_key,
            updatedTemplates,
            vscode.ConfigurationTarget.Global
          )
        }
      }
    }

    await context.globalState.update(MIGRATION_ID, true)
    Logger.info({
      function_name: 'migrate_preset_affix_to_prompt_template',
      message: 'Successfully migrated preset affixes to prompt templates'
    })
  } catch (error) {
    Logger.error({
      function_name: 'migrate_preset_affix_to_prompt_template',
      message: 'Error migrating preset affixes to prompt templates',
      data: error instanceof Error ? error.message : String(error)
    })
  }
}