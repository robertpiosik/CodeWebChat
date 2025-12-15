import * as vscode from 'vscode'
import { UpdateCommitMessageInstructionsMessage } from '@/views/settings/types/messages'
import { commit_message_instructions } from '@/constants/instructions'

export const handle_update_commit_message_instructions = async (
  message: UpdateCommitMessageInstructionsMessage
): Promise<void> => {
  await vscode.workspace
    .getConfiguration('codeWebChat')
    .update(
      'commitMessageInstructions',
      message.instructions == '' ||
        message.instructions == commit_message_instructions
        ? undefined
        : message.instructions,
      vscode.ConfigurationTarget.Global
    )
}
