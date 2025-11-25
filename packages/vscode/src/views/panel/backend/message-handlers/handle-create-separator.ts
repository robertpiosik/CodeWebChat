import * as vscode from 'vscode'
import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { ConfigPresetFormat } from '@/views/panel/backend/utils/preset-format-converters'

export const handle_create_separator = async (
  panel_provider: PanelProvider,
  options: {
    create_on_index?: number
  }
): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')

  const presets_config_key = panel_provider.get_presets_config_key()
  const current_presets =
    config.get<ConfigPresetFormat[]>(presets_config_key, []) || []

  const new_separator = {} as ConfigPresetFormat

  let updated_presets: ConfigPresetFormat[]
  if (options.create_on_index !== undefined) {
    updated_presets = [...current_presets]
    updated_presets.splice(options.create_on_index, 0, new_separator)
  } else {
    updated_presets = [...current_presets, new_separator]
  }

  try {
    await config.update(presets_config_key, updated_presets, true)
  } catch (error) {
    vscode.window.showErrorMessage('Failed to create Separator')
  }
}