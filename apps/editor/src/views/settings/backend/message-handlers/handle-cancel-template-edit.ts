import * as vscode from 'vscode'
import { SettingsViewProvider } from '../settings-view-provider'
import { CancelTemplateEditMessage } from '@/views/settings/types/messages'
import { t } from '@/i18n'

export const handle_cancel_template_edit = async (
  provider: SettingsViewProvider,
  _message: CancelTemplateEditMessage
): Promise<void> => {
  const discard_button = t('common.action.discard')
  const result = await vscode.window.showWarningMessage(
    t('views.common.handlers.common.confirm-discard-unsaved-changes', {
      item_type: 'template'
    }),
    {
      modal: true,
      detail: t('views.common.handlers.common.unsaved-changes-will-be-lost', {
        item_type: 'template'
      })
    },
    discard_button
  )

  if (result !== discard_button) {
    return
  }

  provider.postMessage({ command: 'TEMPLATE_EDIT_CANCELLED' })
}
