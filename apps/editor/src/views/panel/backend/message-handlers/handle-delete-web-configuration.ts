import * as vscode from 'vscode'
import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { dictionary } from '@shared/constants/dictionary'
import { DeleteWebConfigurationMessage } from '@/views/panel/types/messages'
import { ConfigWebConfigurationFormat } from '@/views/utils/web-configuration-format-converters'

export const handle_delete_web_configuration = async (
  panel_provider: PanelProvider,
  message: DeleteWebConfigurationMessage,
  webview_view: vscode.WebviewView
): Promise<void> => {
  const { index } = message
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const current_web_configurations =
    config.get<ConfigWebConfigurationFormat[]>('webConfigurations', []) || []

  if (index < 0 || index >= current_web_configurations.length) return

  const item_to_delete = current_web_configurations[index]
  const item_name = item_to_delete.name
  const is_unnamed = !item_name || /^\(\d+\)$/.test(item_name?.trim() ?? '')
  const display_item_name = is_unnamed ? 'Unnamed' : item_name!

  const delete_button = 'Delete'
  const result = await vscode.window.showWarningMessage(
    dictionary.warning_message.PLEASE_CONFIRM,
    {
      modal: true,
      detail: is_unnamed
        ? dictionary.warning_message.CONFIRM_DELETE_ITEM('configuration')
        : dictionary.warning_message.CONFIRM_DELETE_NAMED_ITEM('web configuration', display_item_name)
    },
    delete_button
  )

  if (result != delete_button) {
    return
  }

  const updated_web_configurations = [...current_web_configurations]
  updated_web_configurations.splice(index, 1)

  try {
    await config.update(
      'webConfigurations',
      updated_web_configurations,
      vscode.ConfigurationTarget.Global
    )

    panel_provider.send_web_configurations_to_webview(webview_view.webview)
  } catch (error) {
    vscode.window.showErrorMessage(
      dictionary.error_message.FAILED_TO_DELETE_ITEM('web configuration', error)
    )
  }
}
