import * as vscode from 'vscode'
import { ViewProvider } from '@/view/backend/view-provider'
import { ExtensionMessage } from '@/view/types/messages'
import { CHATBOTS } from '@shared/constants/chatbots'
import {
  config_preset_to_ui_format,
  ConfigPresetFormat
} from '@/view/backend/helpers/preset-format-converters'

export const handle_create_preset = async (
  provider: ViewProvider
): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const presets_config_key = provider.get_presets_config_key()
  const current_presets =
    config.get<ConfigPresetFormat[]>(presets_config_key, []) || []

  let new_name = ''
  let copy_number = 0
  while (current_presets.some((p) => p.name == new_name)) {
    new_name = `(${copy_number++})`
  }

  const new_preset: ConfigPresetFormat = {
    name: new_name,
    chatbot: 'AI Studio',
    model: Object.keys(CHATBOTS['AI Studio'].models)[0],
    temperature: 0.5,
    systemInstructions: CHATBOTS['AI Studio'].default_system_instructions
  }

  const updated_presets = [...current_presets, new_preset]

  try {
    provider.send_message<ExtensionMessage>({
      command: 'PRESET_CREATED',
      preset: config_preset_to_ui_format(new_preset)
    })
    await config.update(presets_config_key, updated_presets, true)
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to create preset: ${error}`)
  }
}
