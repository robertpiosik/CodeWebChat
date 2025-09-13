import * as vscode from 'vscode'
import { ViewProvider } from '@/views/panel/backend/view-provider'
import { CHATBOTS } from '@shared/constants/chatbots'
import {
  config_preset_to_ui_format,
  ConfigPresetFormat
} from '@/views/panel/backend/utils/preset-format-converters'

export const handle_create_preset = async (
  provider: ViewProvider
): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const create_option = await vscode.window.showQuickPick(
    [
      {
        id: 'preset',
        label: '$(add) Preset',
        description: 'Placed at the top of the list',
        detail: 'Custom chatbot configuration with prompt prefix/suffix.'
      },
      {
        id: 'group',
        label: '$(add) Group',
        description: 'Placed at the bottom of the list',
        detail:
          'Simultaneous initializations of selected presets, shared preffix/suffix.'
      }
    ],
    {
      placeHolder: 'What would you like to create?'
    }
  )

  if (!create_option) {
    return
  }

  const presets_config_key = provider.get_presets_config_key()
  const current_presets =
    config.get<ConfigPresetFormat[]>(presets_config_key, []) || []

  let new_name = ''
  let copy_number = 0
  while (current_presets.some((p) => p.name == new_name)) {
    new_name = `(${copy_number++})`
  }

  let new_preset: ConfigPresetFormat
  if (create_option.id == 'preset') {
    new_preset = {
      name: new_name,
      chatbot: 'AI Studio',
      model: Object.keys(CHATBOTS['AI Studio'].models)[0],
      temperature: 0.5,
      systemInstructions: CHATBOTS['AI Studio'].default_system_instructions
    }
  } else {
    new_preset = {
      name: new_name
    } as ConfigPresetFormat
  }

  const updated_presets =
    create_option.id == 'preset'
      ? [new_preset, ...current_presets]
      : [...current_presets, new_preset]

  try {
    provider.send_message({
      command: 'PRESET_CREATED',
      preset: config_preset_to_ui_format(new_preset)
    })
    await config.update(presets_config_key, updated_presets, true)
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to create ${create_option.id}: ${error}`
    )
  }
}
