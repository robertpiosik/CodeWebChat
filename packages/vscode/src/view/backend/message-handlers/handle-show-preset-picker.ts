import { ViewProvider } from '@/view/backend/view-provider'
import * as vscode from 'vscode'
import { ExtensionMessage } from '@/view/types/messages'
import { ConfigPresetFormat } from '../helpers/preset-format-converters'
import { CHATBOTS } from '@shared/constants/chatbots'

export const handle_show_preset_picker = async (
  provider: ViewProvider
): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const presets_config_key = provider.get_presets_config_key()
  const web_chat_presets =
    config.get<ConfigPresetFormat[]>(presets_config_key, []) || []

  const selected_preset_names_state_key = provider.get_selected_presets_state_key()
  const available_preset_names = web_chat_presets

    .filter(
      (preset) =>
        CHATBOTS[preset.chatbot] &&
        (provider.web_mode != 'code-completions'
          ? preset
          : !preset.promptPrefix && !preset.promptSuffix)
    )
    .map((preset) => preset.name)
  let selected_preset_names = provider.context.globalState.get<string[]>(
    selected_preset_names_state_key,
    []
  )
  selected_preset_names = selected_preset_names.filter((name) =>
    available_preset_names.includes(name)
  )

  await provider.context.globalState.update(
    selected_preset_names_state_key,
    selected_preset_names
  )

  const preset_quick_pick_items = web_chat_presets
    .filter((preset) =>
      provider.web_mode != 'code-completions'
        ? preset
        : !preset.promptPrefix && !preset.promptSuffix
    )
    .map((preset) => {
      const is_unnamed = !preset.name || /^\(\d+\)$/.test(preset.name.trim())
      const model = preset.model
        ? (CHATBOTS[preset.chatbot] as any).models[preset.model] || preset.model
        : ''

      return {
        label: is_unnamed ? preset.chatbot : preset.name,
        name: preset.name,
        description: is_unnamed
          ? model
          : `${preset.chatbot}${model ? ` · ${model}` : ''}`,
        picked: selected_preset_names.includes(preset.name)
      }
    })

  const placeholder =
    provider.web_mode == 'code-completions'
      ? 'Select one or more code completion presets'
      : 'Select one or more chat presets'

  const selected_presets = await vscode.window.showQuickPick(
    preset_quick_pick_items,
    {
      placeHolder: placeholder,
      canPickMany: true
    }
  )

  if (selected_presets) {
    const selected_names = selected_presets.map((preset: any) => preset.name)
    await provider.context.globalState.update(
      selected_preset_names_state_key,
      selected_names
    )

    provider.send_message<ExtensionMessage>({
      command: 'SELECTED_PRESETS',
      names: selected_names
    })
  }
}
