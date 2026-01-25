import * as vscode from 'vscode'
import { UpdateSendWithShiftEnterMessage } from '@/views/settings/types/messages'

export const handle_update_send_with_shift_enter = async (
  message: UpdateSendWithShiftEnterMessage
): Promise<void> => {
  await vscode.workspace
    .getConfiguration('codeWebChat')
    .update(
      'sendWithShiftEnter',
      message.enabled,
      vscode.ConfigurationTarget.Global
    )
}
