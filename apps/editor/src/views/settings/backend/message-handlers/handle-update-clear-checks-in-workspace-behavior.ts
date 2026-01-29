import * as vscode from 'vscode'
import { UpdateClearChecksInWorkspaceBehaviorMessage } from '@/views/settings/types/messages'

export const handle_update_clear_checks_in_workspace_behavior = async (
  message: UpdateClearChecksInWorkspaceBehaviorMessage
): Promise<void> => {
  await vscode.workspace
    .getConfiguration('codeWebChat')
    .update(
      'clearChecksInWorkspaceBehavior',
      message.value == 'ignore-open-editors' ? undefined : message.value,
      vscode.ConfigurationTarget.Global
    )
}
