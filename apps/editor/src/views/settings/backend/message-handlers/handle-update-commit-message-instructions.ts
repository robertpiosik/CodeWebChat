import * as vscode from 'vscode'
import { UpdateCommitMessageInstructionsMessage } from '@/views/settings/types/messages'

export const handle_update_commit_message_instructions = async (
  message: UpdateCommitMessageInstructionsMessage
): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const default_instructions =
    config.inspect<string>('commitMessageInstructions')?.defaultValue || ''
  await config.update(
    'commitMessageInstructions',
    message.instructions == '' || message.instructions == default_instructions
      ? undefined
      : message.instructions,
    vscode.ConfigurationTarget.Global
  )
}
