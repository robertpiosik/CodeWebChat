import * as vscode from 'vscode'
import { MainViewProvider } from '@/views/main/backend/view-provider'
import { SavePresetsOrderMessage } from '@/views/main/types/messages'
import { ui_preset_to_config_format } from '@/views/main/backend/helpers/preset-format-converters'

export const handle_save_presets_order = async (
  provider: MainViewProvider,
  message: SavePresetsOrderMessage
): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const config_formatted_presets = message.presets.map((preset) =>
    ui_preset_to_config_format(preset)
  )
  await config.update(
    'presets',
    config_formatted_presets,
    vscode.ConfigurationTarget.Global
  )
}