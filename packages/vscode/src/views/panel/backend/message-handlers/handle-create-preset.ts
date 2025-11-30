import * as vscode from 'vscode'
import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { dictionary } from '@shared/constants/dictionary'
import { CHATBOTS } from '@shared/constants/chatbots'
import {
  config_preset_to_ui_format,
  ConfigPresetFormat
} from '@/views/panel/backend/utils/preset-format-converters'
import { CreatePresetMessage } from '@/views/panel/types/messages'

export const handle_create_preset = async (
  panel_provider: PanelProvider,
  message: CreatePresetMessage
): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')

  const presets_config_key = panel_provider.get_presets_config_key()
  const current_presets =
    config.get<ConfigPresetFormat[]>(presets_config_key, []) || []

  let copy_number = 0
  let new_name: string
  do {
    new_name = `(${copy_number++})`
  } while (current_presets.some((p) => p.name == new_name))

  const new_preset: ConfigPresetFormat = {
    name: new_name,
    chatbot: 'AI Studio',
    model: Object.keys(CHATBOTS['AI Studio'].models ?? {})[0],
    temperature: 0.5,
    systemInstructions: CHATBOTS['AI Studio'].default_system_instructions
  }

  let updated_presets: ConfigPresetFormat[]
  if (message.add_on_top) {
    updated_presets = [new_preset, ...current_presets]
  } else {
    const last_group_or_separator = [...current_presets]
      .reverse()
      .find((p) => (!p.chatbot && p.name) || !p.name)

    if (last_group_or_separator?.name && !last_group_or_separator.chatbot) {
      updated_presets = [...current_presets, {}, new_preset]
    } else {
      updated_presets = [...current_presets, new_preset]
    }
  }

  try {
    panel_provider.send_message({
      command: 'PRESET_CREATED',
      preset: config_preset_to_ui_format(new_preset)
    })
    await config.update(presets_config_key, updated_presets, true)
  } catch (error) {
    vscode.window.showErrorMessage(
      dictionary.error_message.FAILED_TO_CREATE_ITEM('Preset', error)
    )
  }
}
