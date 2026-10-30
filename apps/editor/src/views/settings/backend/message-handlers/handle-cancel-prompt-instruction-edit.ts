import * as vscode from 'vscode'
import { SettingsViewProvider } from '../settings-view-provider'
import { CancelPromptInstructionEditMessage } from '@/views/settings/types/messages'
import { t } from '@/i18n'

export const handle_cancel_prompt_instruction_edit = async (
  provider: SettingsViewProvider,
  message: CancelPromptInstructionEditMessage
): Promise<void> => {
  const discard_button = t('common.action.discard')
  const is_template = message.key?.startsWith('templates')
  const item_name = is_template ? 'template' : 'snippet'

  const result = await vscode.window.showWarningMessage(
    t('views.common.handlers.common.confirm-discard-unsaved-changes', {
      item_type: item_name
    }),
    {
      modal: true,
      detail: t('views.common.handlers.common.unsaved-changes-will-be-lost', {
        item_type: item_name
      })
    },
    discard_button
  )

  if (result !== discard_button) {
    return
  }

  provider.postMessage({ command: 'PROMPT_INSTRUCTION_EDIT_CANCELLED' })
}
