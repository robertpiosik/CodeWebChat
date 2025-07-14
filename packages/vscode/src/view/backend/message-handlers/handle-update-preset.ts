import * as vscode from 'vscode'
import { ViewProvider } from '@/view/backend/view-provider'
import {
  ExtensionMessage,
  SelectedPresetsMessage,
  UpdatePresetMessage
} from '@/view/types/messages'
import { Preset } from '@shared/types/preset'
import {
  ConfigPresetFormat,
  ui_preset_to_config_format
} from '@/view/backend/helpers/preset-format-converters'

export const handle_update_preset = async (
  provider: ViewProvider,
  message: UpdatePresetMessage,
  webview_view: vscode.WebviewView
): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const presets_config_key = provider.get_presets_config_key()
  const current_presets =
    config.get<ConfigPresetFormat[]>(presets_config_key, []) || []

  const preset_index = current_presets.findIndex(
    (p) => p.name == message.updating_preset.name
  )

  if (preset_index == -1) {
    console.error(
      `Preset with original name "${message.updating_preset.name}" not found.`
    )
    vscode.window.showErrorMessage(
      `Could not update preset: Original preset "${message.updating_preset.name}" not found.`
    )
    return
  }

  const are_presets_equal = (a: Preset, b: Preset): boolean => {
    return (
      a.name == b.name &&
      a.chatbot == b.chatbot &&
      a.prompt_prefix == b.prompt_prefix &&
      a.prompt_suffix == b.prompt_suffix &&
      a.model == b.model &&
      a.temperature === b.temperature && // can be undefined and 0
      a.top_p === b.top_p && // same
      a.thinking_budget === b.thinking_budget && // same
      a.system_instructions == b.system_instructions &&
      JSON.stringify(a.options) == JSON.stringify(b.options) &&
      a.port == b.port
    )
  }

  const has_changes = !are_presets_equal(
    message.updating_preset,
    message.updated_preset
  )

  if (!has_changes) {
    provider.send_message<ExtensionMessage>({
      command: 'PRESET_UPDATED'
    })
    return
  }

  const save_changes_button = 'Save'
  const discard_changes = 'Discard Changes'
  const result = await vscode.window.showInformationMessage(
    'Save changes to the preset?',
    {
      modal: true,
      detail: "If you don't save, updates to the preset will be lost."
    },
    save_changes_button,
    discard_changes
  )

  if (result == discard_changes) {
    provider.send_message<ExtensionMessage>({
      command: 'PRESET_UPDATED'
    })
    return
  }

  if (result != save_changes_button) {
    return
  }

  const updated_ui_preset = { ...message.updated_preset }
  let final_name = updated_ui_preset.name.trim()

  // --- Start uniqueness check ---
  let is_unique = false
  let copy_number = 0
  const base_name = final_name

  while (!is_unique) {
    const name_to_check =
      copy_number == 0 ? base_name : `${base_name} (${copy_number})`.trim()

    // Check if this name exists in *other* presets
    const conflict = current_presets.some(
      (p, index) => index != preset_index && p.name == name_to_check
    )

    if (!conflict) {
      final_name = name_to_check
      is_unique = true
    } else {
      copy_number++
    }
  }
  // --- End uniqueness check ---

  // If the name had to be changed, update the preset object
  if (final_name != updated_ui_preset.name) {
    updated_ui_preset.name = final_name
  }

  const updated_presets = [...current_presets]
  // Convert the updated preset (with potentially modified name) from UI format to config format
  updated_presets[preset_index] = ui_preset_to_config_format(updated_ui_preset)

  await config.update(
    presets_config_key,
    updated_presets,
    vscode.ConfigurationTarget.Global
  )

  // Update selected (default) presets for all modes
  const modes = ['ask', 'edit', 'code-completions', 'no-context']
  for (const mode of modes) {
    const state_key = `selectedPresets.${mode}`
    const selected_names = provider.context.globalState.get<string[]>(
      state_key,
      []
    )
    if (selected_names.includes(message.updating_preset.name)) {
      const updated_selected_names = selected_names.map((name) =>
        name == message.updating_preset.name ? final_name : name
      )
      await provider.context.globalState.update(state_key, updated_selected_names)
    }
  }

  // Send updated selected presets to webview
  const current_mode_state_key = provider.get_selected_presets_state_key()
  const current_mode_selected_presets =
    provider.context.globalState.get<string[]>(current_mode_state_key, [])
    provider.send_message<SelectedPresetsMessage>({
      command: 'SELECTED_PRESETS',
      names: current_mode_selected_presets
    })

  provider.send_presets_to_webview(webview_view.webview)
  provider.send_message<ExtensionMessage>({
    command: 'PRESET_UPDATED'
  })
}
