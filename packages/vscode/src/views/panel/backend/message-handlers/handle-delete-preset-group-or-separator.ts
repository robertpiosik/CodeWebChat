import * as vscode from 'vscode'
import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { dictionary } from '@shared/constants/dictionary'
import { DeletePresetGroupOrSeparatorMessage } from '@/views/panel/types/messages'
import { ConfigPresetFormat } from '@/views/panel/backend/utils/preset-format-converters'

export const handle_delete_preset_group_or_separator = async (
  panel_provider: PanelProvider,
  message: DeletePresetGroupOrSeparatorMessage,
  webview_view: vscode.WebviewView
): Promise<void> => {
  const { index } = message
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const presets_config_key = panel_provider.get_presets_config_key()
  const current_presets =
    config.get<ConfigPresetFormat[]>(presets_config_key, []) || []

  if (index < 0 || index >= current_presets.length) return

  const item_to_delete = current_presets[index]

  let item_type: 'preset' | 'group' | 'separator'
  let should_show_confirmation: boolean

  if (item_to_delete.chatbot) {
    item_type = 'preset'
    should_show_confirmation = true
  } else if (item_to_delete.name) {
    item_type = 'group'
    const item_name = item_to_delete.name
    const is_unnamed = !item_name || /^\(\d+\)$/.test(item_name.trim())
    const has_affixes =
      !!item_to_delete.promptPrefix || !!item_to_delete.promptSuffix
    should_show_confirmation = !is_unnamed || has_affixes
  } else {
    // It's a separator
    item_type = 'separator'
    should_show_confirmation = false
  }

  if (should_show_confirmation) {
    const item_name = item_to_delete.name
    const is_unnamed = !item_name || /^\(\d+\)$/.test(item_name?.trim() ?? '')
    const display_item_name = is_unnamed ? 'Unnamed' : item_name!

    const delete_button = 'Delete'
    const result = await vscode.window.showInformationMessage(
      dictionary.information_message.PLEASE_CONFIRM,
      {
        modal: true,
        detail: is_unnamed
          ? dictionary.warning_message.CONFIRM_DELETE_ITEM(
              item_type as 'preset' | 'group'
            )
          : dictionary.warning_message.CONFIRM_DELETE_NAMED_ITEM(
              item_type,
              display_item_name
            )
      },
      delete_button
    )

    if (result != delete_button) {
      return
    }
  }

  const updated_presets = [...current_presets]
  let delete_count = 1
  const is_group = !item_to_delete.chatbot && item_to_delete.name
  if (is_group) {
    for (let i = index + 1; i < current_presets.length; i++) {
      const next_item = current_presets[i]
      if (!next_item.chatbot && next_item.name) {
        break
      }
      delete_count++
      if (!next_item.chatbot && !next_item.name) {
        break
      }
    }
  }
  updated_presets.splice(index, delete_count)

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
