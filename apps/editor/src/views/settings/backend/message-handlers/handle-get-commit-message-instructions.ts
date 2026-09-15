import * as vscode from 'vscode'
import { SettingsViewProvider } from '@/views/settings/backend/settings-view-provider'

export const handle_get_commit_message_instructions = async (
  provider: SettingsViewProvider
): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const default_instructions =
    config.inspect<string>('commitMessageInstructions')?.defaultValue || ''
  const instructions =
    config.get<string>('commitMessageInstructions') || default_instructions
  provider.postMessage({
    command: 'COMMIT_MESSAGE_INSTRUCTIONS',
    instructions,
    default_instructions
  })
}
