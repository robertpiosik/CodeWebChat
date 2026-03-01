import * as vscode from 'vscode'
import { UpdateIncludePromptsInCommitMessagesMessage } from '@/views/settings/types/messages'

export const handle_update_include_prompts_in_commit_messages = async (
  message: UpdateIncludePromptsInCommitMessagesMessage
): Promise<void> => {
  await vscode.workspace
    .getConfiguration('codeWebChat')
    .update(
      'includePromptsInCommitMessages',
      message.enabled,
      vscode.ConfigurationTarget.Global
    )
}
