import * as vscode from 'vscode'
import { SettingsProvider } from '@/views/settings/backend/settings-provider'
import { UpdateCommitMessageInstructionsMessage } from '@/views/settings/types/messages'

export const handle_update_commit_message_instructions = async (
  provider: SettingsProvider,
  message: UpdateCommitMessageInstructionsMessage
): Promise<void> => {
  await vscode.workspace
    .getConfiguration('codeWebChat')
    .update(
      'commitMessageInstructions',
      message.instructions,
      vscode.ConfigurationTarget.Global
    )
}
