import * as vscode from 'vscode'
import { SettingsViewProvider } from '@/views/settings/backend/settings-view-provider'

export const handle_get_use_context_files_in_commit_message_prompt = async (
  provider: SettingsViewProvider
): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const value = config.get<'ask' | 'always' | 'never'>(
    'useContextFilesInCommitMessagePrompt',
    'ask'
  )
  provider.postMessage({
    command: 'USE_CONTEXT_FILES_IN_COMMIT_MESSAGE_PROMPT',
    value
  })
}
