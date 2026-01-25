import * as vscode from 'vscode'
import { SettingsProvider } from '@/views/settings/backend/settings-provider'
import { UpdateClearChecksInWorkspaceBehaviorMessage } from '@/views/settings/types/messages'

export const handle_update_clear_checks_in_workspace_behavior = async (
  provider: SettingsProvider,
  message: UpdateClearChecksInWorkspaceBehaviorMessage
): Promise<void> => {
  await vscode.workspace
    .getConfiguration('codeWebChat')
    .update(
      'clearChecksInWorkspaceBehavior',
      message.value,
      vscode.ConfigurationTarget.Global
    )
}
