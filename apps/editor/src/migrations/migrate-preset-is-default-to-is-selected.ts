import * as vscode from 'vscode'
import { Logger } from '@shared/utils/logger'

const MIGRATION_ID = 'preset-is-default-to-is-selected-migration-20250903'

const PRESET_CONFIG_KEYS = [
  'codeWebChat.chatPresetsForAskAboutContext',
  'codeWebChat.chatPresetsForEditContext',
  'codeWebChat.chatPresetsForCodeAtCursor',
  'codeWebChat.chatPresetsForNoContext'
]

type PresetInConfig = {
  name: string
  isDefault?: boolean
  isSelected?: boolean
  [key: string]: any
}

export async function migrate_preset_is_default_to_is_selected(
  context: vscode.ExtensionContext
): Promise<void> {
  try {
    if (context.globalState.get(MIGRATION_ID)) {
      return
    }

    const config = vscode.workspace.getConfiguration()
    let migration_performed = false

    for (const key of PRESET_CONFIG_KEYS) {
      const inspect = config.inspect<PresetInConfig[]>(key)

      const migrate_presets = (
        presets: PresetInConfig[]
      ): { presets: PresetInConfig[]; changed: boolean } => {
        let changed = false
        const new_presets = presets.map((preset) => {
          if (preset.isDefault !== undefined) {
            const { isDefault, ...rest } = preset
            changed = true
            return { ...rest, isSelected: isDefault }
          }
          return preset
        })
        return { presets: new_presets, changed }
      }

      if (inspect?.globalValue !== undefined) {
        const { presets: migrated_presets, changed } = migrate_presets(
          inspect.globalValue
        )
        if (changed) {
          await config.update(
            key,
            migrated_presets,
            vscode.ConfigurationTarget.Global
          )
          migration_performed = true
        }
      }
    }

    if (migration_performed) {
      Logger.info({
        function_name: 'migrate_preset_is_default_to_is_selected',
        message: 'Migration for preset isDefault to isSelected completed.'
      })
    }
    await context.globalState.update(MIGRATION_ID, true)
  } catch (error) {
    Logger.error({
      function_name: 'migrate_preset_is_default_to_is_selected',
      message: 'Error migrating preset isDefault to isSelected',
      data: error instanceof Error ? error.message : String(error)
    })
  }
}
