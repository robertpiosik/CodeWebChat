import * as vscode from 'vscode'
import { Logger } from '@shared/utils/logger'

const MIGRATION_ID = 'remove-preset-groups-and-separators-migration-20260608'

export async function migrate_remove_preset_groups_and_separators(
  context: vscode.ExtensionContext
): Promise<void> {
  try {
    if (context.globalState.get(MIGRATION_ID)) {
      return
    }

    const KEYS = [
      'chatPresetsForAskAboutContext',
      'chatPresetsForEditContext',
      'chatPresetsForCodeAtCursor',
      'chatPresetsForFindRelevantFiles',
      'chatPresetsForNoContext'
    ]

    for (const key of KEYS) {
      const config = vscode.workspace.getConfiguration('codeWebChat')
      const presetsInspect = config.inspect<any[]>(key)

      if (
        presetsInspect?.globalValue &&
        Array.isArray(presetsInspect.globalValue)
      ) {
        const presets = JSON.parse(JSON.stringify(presetsInspect.globalValue))
        // Filter out groups (no chatbot, has name) and separators (no chatbot, no name)
        const new_presets = presets.filter((p: any) => !!p.chatbot)

        // Clean up obsolete fields
        for (const p of new_presets) {
          delete p.isCollapsed
          delete p.isSelected
        }

        if (new_presets.length !== presets.length || presets.some((p: any) => p.isCollapsed !== undefined || p.isSelected !== undefined)) {
          await config.update(
            key,
            new_presets,
            vscode.ConfigurationTarget.Global
          )
        }
      }
    }

    await context.globalState.update(MIGRATION_ID, true)
    Logger.info({
      function_name: 'migrate_remove_preset_groups_and_separators',
      message: 'Successfully removed preset groups and separators'
    })
  } catch (error) {
    Logger.error({
      function_name: 'migrate_remove_preset_groups_and_separators',
      message: 'Error removing preset groups and separators',
      data: error instanceof Error ? error.message : String(error)
    })
  }
}