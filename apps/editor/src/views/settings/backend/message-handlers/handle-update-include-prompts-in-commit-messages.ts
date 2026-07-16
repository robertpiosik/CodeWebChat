import * as vscode from 'vscode'
import { UpdateSelectAllPromptsInCommitMessagesByDefaultMessage } from '@/views/settings/types/messages'

export const handle_update_include_prompts_in_commit_messages = async (
  message: UpdateSelectAllPromptsInCommitMessagesByDefaultMessage
): Promise<void> => {
  await vscode.workspace
    .getConfiguration('codeWebChat')
    .update(
      'selectAllPromptsInCommitMessagesByDefault',
      message.enabled,
      vscode.ConfigurationTarget.Global
    )
}
