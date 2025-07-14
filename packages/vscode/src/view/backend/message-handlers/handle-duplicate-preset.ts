import * as vscode from 'vscode'
import { ViewProvider } from '@/view/backend/view-provider'
import { DuplicatePresetMessage } from '@/view/types/messages'
import { ConfigPresetFormat } from '@/view/backend/helpers/preset-format-converters'

export const handle_duplicate_preset = async (
  provider: ViewProvider,
  message: DuplicatePresetMessage,
  webview_view: vscode.WebviewView
): Promise<void> => {
  const preset_name = message.name
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const current_presets =
    config.get<ConfigPresetFormat[]>('chatPresetsForEditContext', []) || []

  const preset_to_duplicate = current_presets.find((p) => p.name == preset_name)
  if (!preset_to_duplicate) {
    vscode.window.showErrorMessage(`Preset "${preset_name}" not found`)
    return
  }

  const original_index = current_presets.findIndex((p) => p.name == preset_name)

  const parenthetical_match = preset_name.match(/^(.*?)(?:\s*\((\d+)\))?$/)
  const base_name = parenthetical_match?.[1]?.trim() || ''
  const existing_number = parenthetical_match?.[2]
    ? parseInt(parenthetical_match[2], 10)
    : 0

  let new_name: string
  let copy_number: number

  if (existing_number > 0) {
    copy_number = existing_number + 1
    new_name = base_name ? `${base_name} (${copy_number})` : `(${copy_number})`
  } else {
    copy_number = 1
    new_name = `${preset_name} (${copy_number})`
  }

  while (current_presets.some((p) => p.name == new_name)) {
    copy_number++
    new_name = base_name ? `${base_name} (${copy_number})` : `(${copy_number})`
  }

  const duplicated_preset = {
    ...preset_to_duplicate,
    name: new_name
  }

  const updated_presets = [...current_presets]
  updated_presets.splice(original_index + 1, 0, duplicated_preset)

  try {
    await config.update('chatPresetsForEditContext', updated_presets, true)
    provider.send_presets_to_webview(webview_view.webview)
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to duplicate preset: ${error}`)
  }
}
