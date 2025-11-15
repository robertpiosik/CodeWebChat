import * as vscode from 'vscode'
import { UpdateCommitMessageAutoAcceptAfterMessage } from '@/views/settings/types/messages'

export const handle_update_commit_message_auto_accept_after = async (
  message: UpdateCommitMessageAutoAcceptAfterMessage
): Promise<void> => {
  await vscode.workspace
    .getConfiguration('codeWebChat')
    .update(
      'commitMessageAutoAcceptAfter',
      message.seconds === null ? 0 : message.seconds,
      vscode.ConfigurationTarget.Global
    )
}
