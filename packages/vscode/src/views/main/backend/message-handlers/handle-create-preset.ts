import * as vscode from 'vscode'
import { MainViewProvider } from '@/views/main/backend/view-provider'
import { ExtensionMessage } from '@/views/main/types/messages'
import { CHATBOTS } from '@shared/constants/chatbots'
import {
  config_preset_to_ui_format,
  ConfigPresetFormat
} from '@/views/main/backend/helpers/preset-format-converters'

export const handle_create_preset = async (
  provider: MainViewProvider
): Promise<void> => {
  // Get current presets
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const current_presets = config.get<ConfigPresetFormat[]>('presets', []) || []

  // Generate unique name
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
    await config.update('presets', updated_presets, true)
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to create preset: ${error}`)
  }
}
