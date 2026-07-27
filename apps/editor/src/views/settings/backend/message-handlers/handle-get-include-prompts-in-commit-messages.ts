import * as vscode from 'vscode'
import { SettingsViewProvider } from '@/views/settings/backend/settings-view-provider'

export const handle_get_include_prompts_in_commit_messages = async (
  provider: SettingsViewProvider
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
