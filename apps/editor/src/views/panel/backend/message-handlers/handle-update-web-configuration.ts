import * as vscode from 'vscode'
import { PanelProvider } from '../panel-provider'
import { update } from '@/views/shared/actions/web/update'
import { t } from '@/i18n'

export const handle_update_web_configuration = async (
  provider: PanelProvider,
  message: any
): Promise<void> => {
  if (message.is_new && message.origin === 'cancel') {
    const discard_button = 'Discard'
    const result = await vscode.window.showWarningMessage(
      t('views.common.handlers.common.confirm-discard-unsaved-changes', {
        item_type: 'web configuration'
      }),
      {
        modal: true,
        detail: t('views.common.handlers.common.unsaved-changes-will-be-lost', {
          item_type: 'web configuration'
        })
      },
      discard_button
    )

    if (result != discard_button) {
      return
    }
  }

  const result = await update({
    updating_web_configuration: message.updating_web_configuration,
    updated_web_configuration: message.updated_web_configuration,
    origin: message.origin,
    is_new: message.is_new,
    insertion_index: message.insertion_index
  })

  if (result.success) {
    provider.send_message({ command: 'WEB_CONFIGURATION_UPDATED' })

    if (message.is_new && message.origin === 'save' && result.new_name) {
      provider.send_message({
        command: 'SELECTED_WEB_CONFIGURATION_CHANGED',
        prompt_type: provider.web_prompt_type,
        name: result.new_name
      })
    }

    provider.send_web_configurations_to_webview(provider.webview_view!.webview)
  }
}
