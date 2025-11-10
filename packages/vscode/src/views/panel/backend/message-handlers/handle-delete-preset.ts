import * as vscode from 'vscode'
import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { dictionary } from '@shared/constants/dictionary'
import { DeletePresetMessage } from '@/views/panel/types/messages'
import { ConfigPresetFormat } from '@/views/panel/backend/utils/preset-format-converters'

export const handle_delete_preset = async (
  panel_provider: PanelProvider,
  message: DeletePresetMessage,
  webview_view: vscode.WebviewView
): Promise<void> => {
  const preset_name = message.name
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const presets_config_key = panel_provider.get_presets_config_key()
  const current_presets =
    config.get<ConfigPresetFormat[]>(presets_config_key, []) || []

  const preset_index = current_presets.findIndex((p) => p.name == preset_name)
  if (preset_index == -1) return

  const deleted_preset = current_presets[preset_index]
  const item_type = deleted_preset.chatbot ? 'preset' : 'group'

  let should_show_confirmation = true
  if (item_type == 'group') {
    const next_preset = current_presets[preset_index + 1]
    const is_empty = !next_preset || !next_preset.chatbot
    const has_affixes =
      !!deleted_preset.promptPrefix || !!deleted_preset.promptSuffix
    if (is_empty && !has_affixes) {
      should_show_confirmation = false
    }
  }

  if (should_show_confirmation) {
    const is_unnamed = !preset_name || /^\(\d+\)$/.test(preset_name.trim())
    const display_preset_name = is_unnamed ? 'Unnamed' : preset_name

    const delete_button = 'Delete'
    const result = await vscode.window.showInformationMessage(
      'Please confirm',
      {
        modal: true,
        detail: is_unnamed
          ? `Are you sure you want to delete this ${item_type}?`
          : `Are you sure you want to delete ${item_type} "${display_preset_name}"?`
      },
      delete_button
    )

    if (result != delete_button) {
      return
    }
  }

  const updated_presets = current_presets.filter((p) => p.name != preset_name)

  try {
    await config.update(
      presets_config_key,
      updated_presets,
      vscode.ConfigurationTarget.Global
    )

    panel_provider.send_presets_to_webview(webview_view.webview)
  } catch (error) {
    vscode.window.showErrorMessage(
      dictionary.error_message.FAILED_TO_DELETE_ITEM(item_type, error)
    )
  }
}
