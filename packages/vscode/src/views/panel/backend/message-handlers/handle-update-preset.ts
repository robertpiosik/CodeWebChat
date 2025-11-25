import * as vscode from 'vscode'
import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { dictionary } from '@shared/constants/dictionary'
import { UpdatePresetMessage } from '@/views/panel/types/messages'
import { Preset } from '@shared/types/preset'
import {
  ConfigPresetFormat,
  ui_preset_to_config_format
} from '@/views/panel/backend/utils/preset-format-converters'

export const handle_update_preset = async (
  panel_provider: PanelProvider,
  message: UpdatePresetMessage,
  webview_view: vscode.WebviewView
): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const presets_config_key = panel_provider.get_presets_config_key()
  const current_presets =
    config.get<ConfigPresetFormat[]>(presets_config_key, []) || []

  const preset_index = current_presets.findIndex(
    (p) => p.name == message.updating_preset.name
  )

  const item_type = message.updating_preset.chatbot ? 'preset' : 'group'

  if (preset_index == -1) {
    console.error(
      `${item_type} with original name "${message.updating_preset.name}" not found.`
    )
    vscode.window.showErrorMessage(
      dictionary.error_message.COULD_NOT_UPDATE_ITEM_NOT_FOUND(
        item_type,
        message.updating_preset.name!
      )
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
      a.reasoning_effort == b.reasoning_effort &&
      a.system_instructions == b.system_instructions &&
      JSON.stringify(a.options) == JSON.stringify(b.options) &&
      a.port == b.port &&
      a.new_url == b.new_url &&
      a.is_selected == b.is_selected &&
      a.is_pinned == b.is_pinned
    )
  }

  const final_updated_preset = {
    ...message.updated_preset,
    is_collapsed: message.updating_preset.is_collapsed
  }

  const has_changes = !are_presets_equal(
    message.updating_preset,
    final_updated_preset
  )

  if (!has_changes) {
    panel_provider.send_message({
      command: 'PRESET_UPDATED'
    })
    return
  }

  if (message.origin == 'back_button') {
    const save_changes_button = 'Save'
    const discard_changes = 'Discard changes'
    const result = await vscode.window.showInformationMessage(
      `Save changes to the ${item_type}?`,
      {
        modal: true,
        detail: `If you don't save, updates to the ${item_type} will be lost.`
      },
      save_changes_button,
      discard_changes
    )

    if (result == discard_changes) {
      panel_provider.send_message({
        command: 'PRESET_UPDATED'
      })
      return
    }

    if (result != save_changes_button) {
      return
    }
  }

  const updated_ui_preset = { ...final_updated_preset }
  if (updated_ui_preset.name) {
    let final_name = updated_ui_preset.name.trim()

    // --- Start uniqueness check ---
    let is_unique = false
    let copy_number = 0
    const base_name = final_name

    while (!is_unique) {
      const name_to_check =
        copy_number == 0 ? base_name : `${base_name} (${copy_number})`.trim()

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

    if (final_name != updated_ui_preset.name) {
      updated_ui_preset.name = final_name
    }
  }

  const updated_presets = [...current_presets]
  updated_presets[preset_index] = ui_preset_to_config_format(updated_ui_preset)

  await config.update(
    presets_config_key,
    updated_presets,
    vscode.ConfigurationTarget.Global
  )

  panel_provider.send_presets_to_webview(webview_view.webview)
  panel_provider.send_message({
    command: 'PRESET_UPDATED'
  })
}
