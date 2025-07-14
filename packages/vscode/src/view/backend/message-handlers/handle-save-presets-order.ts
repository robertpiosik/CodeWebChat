import * as vscode from 'vscode'
import { SavePresetsOrderMessage } from '@/view/types/messages'
import { ui_preset_to_config_format } from '@/view/backend/helpers/preset-format-converters'

export const handle_save_presets_order = async (
  message: SavePresetsOrderMessage
): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const config_formatted_presets = message.presets.map((preset) =>
    ui_preset_to_config_format(preset)
  )
  await config.update(
    'chatPresetsForEditContext',
    config_formatted_presets,
    vscode.ConfigurationTarget.Global
  )
}