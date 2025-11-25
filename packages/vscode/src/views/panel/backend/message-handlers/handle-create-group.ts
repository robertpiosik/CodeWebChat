import * as vscode from 'vscode'
import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { dictionary } from '@shared/constants/dictionary'
import {
  config_preset_to_ui_format,
  ConfigPresetFormat
} from '@/views/panel/backend/utils/preset-format-converters'

export const handle_create_group = async (
  panel_provider: PanelProvider,
  options: {
    add_on_top?: boolean
    instant?: boolean
    create_on_index?: number
    move_preset_with_name_after?: string
  }
): Promise<void> => {
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
  if (options.move_preset_with_name_after) {
    const preset_to_move_name = options.move_preset_with_name_after
    const preset_to_move_index = current_presets.findIndex(
      (p) => p.name == preset_to_move_name
    )
    if (preset_to_move_index != -1) {
      const [preset_to_move] = current_presets.splice(preset_to_move_index, 1)
      updated_presets = [...current_presets, new_group, preset_to_move]
    } else {
      updated_presets = [...current_presets, new_group]
    }
  } else if (options.create_on_index !== undefined) {
    updated_presets = [...current_presets]
    updated_presets.splice(options.create_on_index, 0, new_group)
  } else if (options.add_on_top) {
    new_group.isCollapsed = !!options.instant
    updated_presets = [new_group, ...current_presets]
  } else {
    updated_presets = [...current_presets, new_group]
  }

  try {
    if (!options.instant) {
      panel_provider.send_message({
        command: 'PRESET_CREATED',
        preset: config_preset_to_ui_format(new_group)
      })
    }
    await config.update(presets_config_key, updated_presets, true)
  } catch (error) {
    vscode.window.showErrorMessage(
      dictionary.error_message.FAILED_TO_CREATE_ITEM('Group', error)
    )
  }
}
