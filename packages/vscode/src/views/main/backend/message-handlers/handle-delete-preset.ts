import * as vscode from 'vscode'
import { MainViewProvider } from '@/views/main/backend/view-provider'
import { DeletePresetMessage, ExtensionMessage } from '@/views/main/types/messages'
import { ConfigPresetFormat } from '@/views/main/backend/helpers/preset-format-converters'

export const handle_delete_preset = async (
  provider: MainViewProvider,
  message: DeletePresetMessage,
  webview_view: vscode.WebviewView
): Promise<void> => {
  const preset_name = message.name
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const current_presets = config.get<ConfigPresetFormat[]>('presets', []) || []

  // Show confirmation dialog with revert option
  const delete_button = 'Delete'
  const result = await vscode.window.showInformationMessage(
    'Please confirm',
    {
      modal: true,
      detail: `Are you sure you want to delete preset "${preset_name}"?`
    },
    delete_button
  )

  if (result != delete_button) {
    return // User cancelled
  }

  // Store the deleted preset and its index in case we need to revert
  const preset_index = current_presets.findIndex((p) => p.name == preset_name)
  const deleted_preset = current_presets[preset_index]
  const updated_presets = current_presets.filter((p) => p.name != preset_name)

  try {
    await config.update(
      'presets',
      updated_presets,
      vscode.ConfigurationTarget.Global
    )

    // Show notification with undo option
    const button_text = 'Undo'
    const undo_result = await vscode.window.showInformationMessage(
      `Preset "${preset_name}" has been deleted.`,
      button_text
    )

    if (undo_result == button_text && deleted_preset) {
      // Restore the preset at its original position
      const restored_presets = [...updated_presets]
      restored_presets.splice(preset_index, 0, deleted_preset)

      await config.update(
        'presets',
        restored_presets,
        vscode.ConfigurationTarget.Global
      )
      vscode.window.showInformationMessage(`Preset "${preset_name}" restored.`)
    }

    // Send updated list back to webview
    provider.send_presets_to_webview(webview_view.webview)

    // Also update selected presets for both modes if needed
    const selected_chat_names = provider.context.globalState.get<string[]>(
      'selectedPresets',
      []
    )
    if (selected_chat_names.includes(preset_name)) {
      const updated_selected = selected_chat_names.filter(
        (n) => n != preset_name
      )
      await provider.context.globalState.update(
        'selectedPresets',
        updated_selected
      )
      provider.send_message<ExtensionMessage>({
        command: 'SELECTED_PRESETS',
        names: updated_selected
      })
    }

    const selected_fim_names = provider.context.globalState.get<string[]>(
      'selectedCodeCompletionPresets',
      []
    )
    if (selected_fim_names.includes(preset_name)) {
      const updated_selected = selected_fim_names.filter(
        (n) => n != preset_name
      )
      await provider.context.globalState.update(
        'selectedCodeCompletionPresets',
        updated_selected
      )
      provider.send_message<ExtensionMessage>({
        command: 'SELECTED_CODE_COMPLETION_PRESETS',
        names: updated_selected
      })
    }
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to delete preset: ${error}`)
  }
}
