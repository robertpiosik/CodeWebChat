import * as vscode from 'vscode'
import { SettingsProvider } from '@/views/settings/backend/settings-provider'

export const handle_get_include_prompts_in_commit_messages = async (
  provider: SettingsProvider
): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const enabled = config.get<boolean>(
    'selectAllPromptsInCommitMessagesByDefault',
    true
  )
  provider.postMessage({
    command: 'SELECT_ALL_PROMPTS_IN_COMMIT_MESSAGES_BY_DEFAULT',
    enabled
  })
}
