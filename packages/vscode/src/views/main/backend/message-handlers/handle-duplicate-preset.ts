import * as vscode from 'vscode'
import { MainViewProvider } from '@/views/main/backend/view-provider'
import { DuplicatePresetMessage } from '@/views/main/types/messages'
import { ConfigPresetFormat } from '@/views/main/backend/helpers/preset-format-converters'

export const handle_duplicate_preset = async (
  provider: MainViewProvider,
  message: DuplicatePresetMessage,
  webview_view: vscode.WebviewView
): Promise<void> => {
  const preset_name = message.name
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const current_presets = config.get<ConfigPresetFormat[]>('presets', []) || []

  const preset_to_duplicate = current_presets.find((p) => p.name == preset_name)
  if (!preset_to_duplicate) {
    vscode.window.showErrorMessage(`Preset "${preset_name}" not found`)
    return
  }

  // Find the index of the original preset
  const original_index = current_presets.findIndex((p) => p.name == preset_name)

  // Generate unique name
  let new_name = `${preset_name} (1)`
  let copy_number = 1
  while (current_presets.some((p) => p.name == new_name)) {
    new_name = `${preset_name} (${copy_number++})`
  }

  // Create duplicate with new name
  const duplicated_preset = {
    ...preset_to_duplicate,
    name: new_name
  }

  // Add to presets right after the original
  const updated_presets = [...current_presets]
  updated_presets.splice(original_index + 1, 0, duplicated_preset)

  try {
    await config.update('presets', updated_presets, true)
    provider.send_presets_to_webview(webview_view.webview)
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to duplicate preset: ${error}`)
  }
}
