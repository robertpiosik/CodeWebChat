import * as vscode from 'vscode'
import { UpdateAttachAsciiTreeOfContextMessage } from '@/views/settings/types/messages'

export const handle_update_attach_ascii_tree_of_context = async (
  message: UpdateAttachAsciiTreeOfContextMessage
): Promise<void> => {
  await vscode.workspace
    .getConfiguration('codeWebChat')
    .update(
      'attachAsciiTreeOfContext',
      message.value,
      vscode.ConfigurationTarget.Global
    )
}
