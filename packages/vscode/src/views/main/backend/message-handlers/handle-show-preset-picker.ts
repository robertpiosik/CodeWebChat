import { MainViewProvider } from '@/views/main/backend/view-provider'
import * as vscode from 'vscode'
import { ExtensionMessage } from '@/views/main/types/messages'
import { ConfigPresetFormat } from '../helpers/preset-format-converters'

export const handle_show_preset_picker = async (
  provider: MainViewProvider
): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const web_chat_presets = config.get<ConfigPresetFormat[]>('presets', [])

  // Determine which global state key to use based on mode
  const selected_preset_names_state_key =
    provider.web_mode == 'code-completions'
      ? 'selectedCodeCompletionPresets'
      : 'selectedPresets'

  const available_preset_names = web_chat_presets
    .filter((preset) =>
      provider.web_mode != 'code-completions'
        ? preset
        : !preset.promptPrefix && !preset.promptSuffix
    )
    .map((preset) => preset.name)
  let selected_preset_names = provider.context.globalState.get<string[]>(
    selected_preset_names_state_key,
    []
  )
  selected_preset_names = selected_preset_names.filter((name) =>
    available_preset_names.includes(name)
  )

  // Update the global state with validated selection
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
    .map((preset) => ({
      label: preset.name,
      description: `${preset.chatbot}${
        preset.model ? ` - ${preset.model}` : ''
      }`,
      picked: selected_preset_names.includes(preset.name)
    }))

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
    const selected_names = selected_presets.map((preset) => preset.label)
    await provider.context.globalState.update(
      selected_preset_names_state_key,
      selected_names
    )

    if (provider.web_mode == 'code-completions') {
      provider.send_message<ExtensionMessage>({
        command: 'SELECTED_CODE_COMPLETION_PRESETS',
        names: selected_names
      })
    } else {
      provider.send_message<ExtensionMessage>({
        command: 'SELECTED_PRESETS',
        names: selected_names
      })
    }
  }
}
