import * as vscode from 'vscode'
import { UpdateUseContextFilesInCommitMessagePromptMessage } from '@/views/settings/types/messages'

export const handle_update_use_context_files_in_commit_message_prompt = async (
  message: UpdateUseContextFilesInCommitMessagePromptMessage
): Promise<void> => {
  await vscode.workspace
    .getConfiguration('codeWebChat')
    .update(
      'useContextFilesInCommitMessagePrompt',
      message.value,
      vscode.ConfigurationTarget.Global
    )
}
