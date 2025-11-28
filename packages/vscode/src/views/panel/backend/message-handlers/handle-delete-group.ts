import * as vscode from 'vscode'
import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { dictionary } from '@shared/constants/dictionary'
import { DeleteGroupMessage } from '@/views/panel/types/messages'
import { ConfigPresetFormat } from '@/views/panel/backend/utils/preset-format-converters'

export const handle_delete_group = async (
  panel_provider: PanelProvider,
  message: DeleteGroupMessage,
  webview_view: vscode.WebviewView
): Promise<void> => {
  const group_index = message.index
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const presets_config_key = panel_provider.get_presets_config_key()
  const current_presets =
    config.get<ConfigPresetFormat[]>(presets_config_key, []) || []

  if (group_index < 0 || group_index >= current_presets.length) return

  const deleted_group = current_presets[group_index]
  const item_type = 'group'

  const group_name = deleted_group.name
  const is_unnamed = !group_name || /^\(\d+\)$/.test(group_name.trim())
  const has_affixes =
    !!deleted_group.promptPrefix || !!deleted_group.promptSuffix

  const should_show_confirmation = !is_unnamed || has_affixes

  if (should_show_confirmation) {
    const display_group_name = is_unnamed ? 'Unnamed' : group_name

    const delete_button = 'Delete'
    const result = await vscode.window.showInformationMessage(
      dictionary.information_message.PLEASE_CONFIRM,
      {
        modal: true,
        detail: is_unnamed
          ? dictionary.warning_message.CONFIRM_DELETE_ITEM(item_type)
          : dictionary.warning_message.CONFIRM_DELETE_NAMED_ITEM(
              item_type,
              display_group_name
            )
      },
      delete_button
    )

    if (result != delete_button) {
      return
    }
  }

  const updated_presets = [...current_presets]
  updated_presets.splice(group_index, 1)

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