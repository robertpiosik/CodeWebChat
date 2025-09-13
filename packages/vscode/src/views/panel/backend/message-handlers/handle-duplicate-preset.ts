import * as vscode from 'vscode'
import { ViewProvider } from '@/views/panel/backend/view-provider'
import { DuplicatePresetMessage } from '@/views/panel/types/messages'
import { ConfigPresetFormat } from '@/views/panel/backend/utils/preset-format-converters'

export const handle_duplicate_preset = async (
  provider: ViewProvider,
  message: DuplicatePresetMessage,
  webview_view: vscode.WebviewView
): Promise<void> => {
  const preset_name = message.name
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const presets_config_key = provider.get_presets_config_key()
  const current_presets =
    config.get<ConfigPresetFormat[]>(presets_config_key, []) || []

  const preset_to_duplicate = current_presets.find((p) => p.name == preset_name)
  if (!preset_to_duplicate) {
    vscode.window.showErrorMessage(`Preset "${preset_name}" not found`)
    return
  }

  const original_index = current_presets.findIndex((p) => p.name == preset_name)

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
    provider.send_presets_to_webview(webview_view.webview)
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to duplicate preset: ${error}`)
  }
}
