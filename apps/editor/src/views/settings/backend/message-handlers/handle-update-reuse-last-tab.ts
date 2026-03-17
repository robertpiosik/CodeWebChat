import * as vscode from 'vscode'
import { UpdateReuseLastTabMessage } from '@/views/settings/types/messages'

export const handle_update_reuse_last_tab = async (
  message: UpdateReuseLastTabMessage
): Promise<void> => {
  await vscode.workspace
    .getConfiguration('codeWebChat')
    .update(
      'reuseLastTab',
      message.enabled || undefined,
      vscode.ConfigurationTarget.Global
    )
}
