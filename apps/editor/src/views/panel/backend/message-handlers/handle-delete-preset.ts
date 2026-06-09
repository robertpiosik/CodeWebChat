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
  const { index } = message
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const presets_config_key = panel_provider.get_presets_config_key()
  const current_presets =
    config.get<ConfigPresetFormat[]>(presets_config_key, []) || []

  if (index < 0 || index >= current_presets.length) return

  const item_to_delete = current_presets[index]
  const item_name = item_to_delete.name
  const is_unnamed = !item_name || /^\(\d+\)$/.test(item_name?.trim() ?? '')
  const display_item_name = is_unnamed ? 'Unnamed' : item_name!

  const delete_button = 'Delete'
  const result = await vscode.window.showWarningMessage(
    dictionary.warning_message.PLEASE_CONFIRM,
    {
      modal: true,
      detail: is_unnamed
        ? dictionary.warning_message.CONFIRM_DELETE_ITEM('preset')
        : dictionary.warning_message.CONFIRM_DELETE_NAMED_ITEM('preset', display_item_name)
    },
    delete_button
  )

  if (result != delete_button) {
    return
  }

  const updated_presets = [...current_presets]
  updated_presets.splice(index, 1)

  try {
    await config.update(
      presets_config_key,
      updated_presets,
      vscode.ConfigurationTarget.Global
    )

    panel_provider.send_presets_to_webview(webview_view.webview)
  } catch (error) {
    vscode.window.showErrorMessage(
      dictionary.error_message.FAILED_TO_DELETE_ITEM('preset', error)
    )
  }
}
