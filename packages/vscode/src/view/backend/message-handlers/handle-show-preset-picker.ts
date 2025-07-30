import { ViewProvider } from '@/view/backend/view-provider'
import * as vscode from 'vscode'
import { CHATBOTS } from '@shared/constants/chatbots'
import { ConfigPresetFormat } from '../helpers/preset-format-converters'

export const handle_show_preset_picker = async (
  provider: ViewProvider
): Promise<void> => {
  const config_key = provider.get_presets_config_key()
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const presets = config.get<ConfigPresetFormat[]>(config_key, []) || []

  if (presets.length == 0) {
    vscode.window.showInformationMessage(
      'No presets available for the current mode.'
    )
    return
  }

  const quick_pick_items = presets.map((preset) => {
    const is_unnamed = !preset.name || /^\(\d+\)$/.test(preset.name.trim())
    const chatbot_info = CHATBOTS[preset.chatbot] as any
    const model_display_name = preset.model
      ? (chatbot_info &&
          chatbot_info.models &&
          chatbot_info.models[preset.model]?.label) || preset.model
      : ''
    return {
      label: is_unnamed ? preset.chatbot : preset.name,
      description: is_unnamed
        ? model_display_name
        : `${preset.chatbot}${
            model_display_name ? ` · ${model_display_name}` : ''
          }`,
      // we need the original name to find the preset later
      presetName: preset.name,
      picked: !!preset.isDefault,
    }
  })

  const selected_items = await vscode.window.showQuickPick(quick_pick_items, {
    canPickMany: true,
    title: 'Select Default Presets',
    placeHolder: 'Choose which presets to open by default',
  })

  if (selected_items !== undefined) {
    const selected_preset_names = new Set(
      selected_items.map((item) => item.presetName)
    )

    const updated_presets = presets.map((preset) => {
      const new_preset = { ...preset }
      if (selected_preset_names.has(preset.name)) {
        new_preset.isDefault = true
      } else {
        delete new_preset.isDefault
      }
      return new_preset
    })

    await config.update(
      config_key,
      updated_presets,
      vscode.ConfigurationTarget.Global
    )
  }
}
