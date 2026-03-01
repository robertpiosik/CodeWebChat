import * as vscode from 'vscode'
import { SettingsProvider } from '@/views/settings/backend/settings-provider'

export const handle_get_include_prompts_in_commit_messages = async (
  provider: SettingsProvider
): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const enabled = config.get<boolean>('includePromptsInCommitMessages', true)
  provider.postMessage({
    command: 'INCLUDE_PROMPTS_IN_COMMIT_MESSAGES',
    enabled
  })
}
