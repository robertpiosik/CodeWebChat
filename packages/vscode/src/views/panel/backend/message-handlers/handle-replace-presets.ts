import * as vscode from 'vscode'
import { ReplacePresetsMessage } from '@/views/panel/types/messages'
import { ui_preset_to_config_format } from '@/views/panel/backend/utils/preset-format-converters'
import { ViewProvider } from '../panel-provider'

export const handle_replace_presets = async (
  provider: ViewProvider,
  message: ReplacePresetsMessage
): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const presets_config_key = provider.get_presets_config_key()
  const config_formatted_presets = message.presets.map((preset) =>
    ui_preset_to_config_format(preset)
  )
  await config.update(
    presets_config_key,
    config_formatted_presets,
    vscode.ConfigurationTarget.Global
  )
}
