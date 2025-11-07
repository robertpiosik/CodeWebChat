import * as vscode from 'vscode'
import { SettingsProvider } from '@/views/settings/backend/settings-provider'

export const handle_get_commit_message_instructions = async (
  provider: SettingsProvider
): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const instructions = config.get<string>('commitMessageInstructions') || ''
  provider.postMessage({
    command: 'COMMIT_MESSAGE_INSTRUCTIONS',
    instructions
  })
}
