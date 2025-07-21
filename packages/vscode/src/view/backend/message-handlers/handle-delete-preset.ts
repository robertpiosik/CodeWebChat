import * as vscode from 'vscode'
import { ViewProvider } from '@/view/backend/view-provider'
import { DeletePresetMessage, ExtensionMessage } from '@/view/types/messages'
import { ConfigPresetFormat } from '@/view/backend/helpers/preset-format-converters'

export const handle_delete_preset = async (
  provider: ViewProvider,
  message: DeletePresetMessage,
  webview_view: vscode.WebviewView
): Promise<void> => {
  const preset_name = message.name
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const presets_config_key = provider.get_presets_config_key()
  const current_presets =
    config.get<ConfigPresetFormat[]>(presets_config_key, []) || []

  const is_unnamed = !preset_name || /^\(\d+\)$/.test(preset_name.trim())
  const display_preset_name = is_unnamed ? 'Unnamed' : preset_name

  const delete_button = 'Delete'
  const result = await vscode.window.showInformationMessage(
    'Please confirm',
    {
      modal: true,
      detail: is_unnamed
        ? `Are you sure you want to delete this preset?`
        : `Are you sure you want to delete preset "${display_preset_name}"?`
    },
    delete_button
  )

  if (result != delete_button) {
    return
  }

  const preset_index = current_presets.findIndex((p) => p.name == preset_name)
  const deleted_preset = current_presets[preset_index]
  const updated_presets = current_presets.filter((p) => p.name != preset_name)

  try {
    await config.update(
      presets_config_key,
      updated_presets,
      vscode.ConfigurationTarget.Global
    )

    const button_text = 'Undo'
    const undo_result = await vscode.window.showInformationMessage(
      is_unnamed
        ? `Preset has been deleted.`
        : `Preset "${display_preset_name}" has been deleted.`,
      button_text
    )

    if (undo_result == button_text && deleted_preset) {
      const restored_presets = [...updated_presets]
      restored_presets.splice(preset_index, 0, deleted_preset)

      await config.update(
        presets_config_key,
        restored_presets,
        vscode.ConfigurationTarget.Global
      )
      vscode.window.showInformationMessage(
        is_unnamed
          ? `Preset has been restored.`
          : `Preset "${display_preset_name}" has been restored.`
      )
    }

    provider.send_presets_to_webview(webview_view.webview)

    const modes = ['ask', 'edit-context', 'code-completions', 'no-context']
    for (const mode of modes) {
      const state_key = `selectedPresets.${mode}`
      const selected_names = provider.context.globalState.get<string[]>(
        state_key,
        []
      )
      if (selected_names.includes(preset_name)) {
        const updated_selected = selected_names.filter((n) => n != preset_name)
        await provider.context.globalState.update(state_key, updated_selected)
      }
    }

    const current_mode_state_key = provider.get_selected_presets_state_key()
    const current_mode_selected_presets = provider.context.globalState.get<
      string[]
    >(current_mode_state_key, [])
    provider.send_message<ExtensionMessage>({
      command: 'SELECTED_PRESETS',
      names: current_mode_selected_presets
    })
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to delete preset: ${error}`)
  }
}
