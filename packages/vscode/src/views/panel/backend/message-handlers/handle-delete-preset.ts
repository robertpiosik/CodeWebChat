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
  const preset_index = message.index
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const presets_config_key = panel_provider.get_presets_config_key()
  const current_presets =
    config.get<ConfigPresetFormat[]>(presets_config_key, []) || []

  if (preset_index < 0 || preset_index >= current_presets.length) return

  const deleted_preset = current_presets[preset_index]
  const item_type = 'preset'

  const preset_name = deleted_preset.name
  const is_unnamed = !preset_name || /^\(\d+\)$/.test(preset_name.trim())
  const display_preset_name = is_unnamed ? 'Unnamed' : preset_name

  const delete_button = 'Delete'
  const result = await vscode.window.showInformationMessage(
    dictionary.information_message.PLEASE_CONFIRM,
    {
      modal: true,
      detail: is_unnamed
        ? dictionary.warning_message.CONFIRM_DELETE_ITEM(item_type)
        : dictionary.warning_message.CONFIRM_DELETE_NAMED_ITEM(
            item_type,
            display_preset_name
          )
    },
    delete_button
  )
  if (result != delete_button) {
    return
  }

  const updated_presets = [...current_presets]
  updated_presets.splice(preset_index, 1)

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
