import * as vscode from 'vscode'
import { UpdateFixAllAutomaticallyMessage } from '@/views/settings/types/messages'

export const handle_update_fix_all_automatically = async (
  message: UpdateFixAllAutomaticallyMessage
): Promise<void> => {
  await vscode.workspace
    .getConfiguration('codeWebChat')
    .update(
      'fixAllAutomatically',
      message.enabled || undefined,
      vscode.ConfigurationTarget.Global
    )
}
