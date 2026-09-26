import * as vscode from 'vscode'
import { PromptViewProvider } from '../../prompt-view-provider'
import { update } from '@/views/shared/actions/agent/update'
import { t } from '@/i18n'

export const handle_update_cli_configuration = async (
  provider: PromptViewProvider,
  message: any
): Promise<void> => {
  if (message.is_new && message.origin === 'cancel') {
    const discard_button = 'Discard'
    const result = await vscode.window.showWarningMessage(
      t('views.common.handlers.common.confirm-discard-unsaved-changes', {
        item_type: 'agent'
      }),
      {
        modal: true,
        detail: t('views.common.handlers.common.unsaved-changes-will-be-lost', {
          item_type: 'agent'
        })
      },
      discard_button
    )

    if (result != discard_button) {
      return
    }
  }

  const result = await update({
    updating_cli_configuration: message.updating_cli_configuration,
    updated_cli_configuration: message.updated_cli_configuration,
    origin: message.origin,
    is_new: message.is_new,
    insertion_index: message.insertion_index
  })

  if (result.success) {
    provider.send_message({ command: 'CLI_CONFIGURATION_UPDATED' })
  }
}