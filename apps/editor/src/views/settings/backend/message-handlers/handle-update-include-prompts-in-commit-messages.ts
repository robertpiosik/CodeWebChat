import * as vscode from 'vscode'
import { UpdateAttachAllPromptsInCommitMessagesByDefaultMessage } from '@/views/settings/types/messages'

export const handle_update_include_prompts_in_commit_messages = async (
  message: UpdateAttachAllPromptsInCommitMessagesByDefaultMessage
): Promise<void> => {
  await vscode.workspace
    .getConfiguration('codeWebChat')
    .update(
      'attachAllPromptsInCommitMessagesByDefault',
      message.enabled,
      vscode.ConfigurationTarget.Global
    )
}
