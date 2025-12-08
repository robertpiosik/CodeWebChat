import * as vscode from 'vscode'
import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { dictionary } from '@shared/constants/dictionary'
import { CHATBOTS } from '@shared/constants/chatbots'
import {
  config_preset_to_ui_format,
  ConfigPresetFormat
} from '@/views/panel/backend/utils/preset-format-converters'
import { CreatePresetGroupOrSeparatorMessage } from '@/views/panel/types/messages'

async function create_group(
  panel_provider: PanelProvider,
  options: {
    placement?: 'top' | 'bottom'
  }
) {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const presets_config_key = panel_provider.get_presets_config_key()
  const current_presets =
    config.get<ConfigPresetFormat[]>(presets_config_key, []) || []

  let new_name = ''
  let copy_number = 0
  while (new_name === '' || current_presets.some((p) => p.name == new_name)) {
    new_name = `(${copy_number++})`
  }

  const new_group = {
    name: new_name
  } as ConfigPresetFormat

  let updated_presets: ConfigPresetFormat[]
  if (options.placement == 'top') {
    updated_presets = [new_group, ...current_presets]
  } else {
    updated_presets = [...current_presets, new_group]
  }

  try {
    panel_provider.send_message({
      command: 'PRESET_CREATED',
      preset: config_preset_to_ui_format(new_group)
    })
    await config.update(presets_config_key, updated_presets, true)
  } catch (error) {
    vscode.window.showErrorMessage(
      dictionary.error_message.FAILED_TO_CREATE_ITEM('Group', error)
    )
  }
}

async function create_separator(
  panel_provider: PanelProvider,
  options: {
    placement?: 'top' | 'bottom'
  }
) {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const presets_config_key = panel_provider.get_presets_config_key()
  const current_presets =
    config.get<ConfigPresetFormat[]>(presets_config_key, []) || []

  const new_separator = {} as ConfigPresetFormat

  let updated_presets: ConfigPresetFormat[]
  if (options.placement === 'top') {
    updated_presets = [new_separator, ...current_presets]
  } else {
    updated_presets = [...current_presets, new_separator]
  }

  try {
    await config.update(presets_config_key, updated_presets, true)
  } catch (error) {
    vscode.window.showErrorMessage('Failed to create Separator')
  }
}

async function create_preset(
  panel_provider: PanelProvider,
  options: { placement?: 'top' | 'bottom' }
) {
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
  if (options.placement === 'top') {
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

export const handle_create_preset_group_or_separator = async (
  panel_provider: PanelProvider,
  message: CreatePresetGroupOrSeparatorMessage
): Promise<void> => {
  const selection = await vscode.window.showQuickPick(
    ['Preset', 'Group', 'Separator'],
    {
      title: 'Item Types',
      placeHolder: 'What would you like to create?'
    }
  )

  if (!selection) {
    return
  }

  if (selection == 'Group') {
    await create_group(panel_provider, { placement: message.placement })
  } else if (selection == 'Separator') {
    await create_separator(panel_provider, { placement: message.placement })
  } else {
    // 'Preset'
    await create_preset(panel_provider, { placement: message.placement })
  }
}
