import * as vscode from 'vscode'
import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { dictionary } from '@shared/constants/dictionary'
import { DuplicatePresetMessage } from '@/views/panel/types/messages'
import { ConfigPresetFormat } from '@/views/panel/backend/utils/preset-format-converters'

export const handle_duplicate_preset = async (
  panel_provider: PanelProvider,
  message: DuplicatePresetMessage,
  webview_view: vscode.WebviewView
): Promise<void> => {
  const original_index = message.index
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const presets_config_key = panel_provider.get_presets_config_key()
  const current_presets =
    config.get<ConfigPresetFormat[]>(presets_config_key, []) || []

  if (original_index < 0 || original_index >= current_presets.length) {
    vscode.window.showErrorMessage(
      dictionary.error_message.PRESET_NOT_FOUND(`at index ${original_index}`)
    )
    return
  }

  const preset_to_duplicate = current_presets[original_index]

  // Handle separator duplication
  if (
    !preset_to_duplicate.chatbot &&
    !preset_to_duplicate.name &&
    !preset_to_duplicate.promptPrefix &&
    !preset_to_duplicate.promptSuffix
  ) {
    const duplicated_preset = {}
    const updated_presets = [...current_presets]
    updated_presets.splice(original_index + 1, 0, duplicated_preset)

    try {
      await config.update(presets_config_key, updated_presets, true)
      panel_provider.send_presets_to_webview(webview_view.webview)
    } catch (error) {
      vscode.window.showErrorMessage(
        dictionary.error_message.FAILED_TO_DUPLICATE_PRESET(error)
      )
    }
    return
  }

  const preset_name = preset_to_duplicate.name ?? ''

  const parenthetical_match = preset_name.match(/^(.*?)(?:\s*\((\d+)\))?$/)
  const original_base_name = parenthetical_match?.[1]?.trim()
  const existing_number_str = parenthetical_match?.[2]

  const base_for_duplication =
    existing_number_str !== undefined && original_base_name !== undefined
      ? original_base_name
      : preset_name.trim()

  let copy_number =
    existing_number_str !== undefined
      ? parseInt(existing_number_str, 10) + 1
      : 1

  let new_name = base_for_duplication
    ? `${base_for_duplication} (${copy_number})`
    : `(${copy_number})`

  while (current_presets.some((p) => p.name == new_name)) {
    copy_number++
    new_name = base_for_duplication
      ? `${base_for_duplication} (${copy_number})`
      : `(${copy_number})`
  }

  const duplicated_preset = {
    ...preset_to_duplicate,
    name: new_name
  }

  const updated_presets = [...current_presets]
  updated_presets.splice(original_index + 1, 0, duplicated_preset)

  try {
    await config.update(presets_config_key, updated_presets, true)
    panel_provider.send_presets_to_webview(webview_view.webview)
  } catch (error) {
    vscode.window.showErrorMessage(
      dictionary.error_message.FAILED_TO_DUPLICATE_PRESET(error)
    )
  }
}
