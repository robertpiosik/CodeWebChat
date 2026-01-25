import * as vscode from 'vscode'
import { SettingsProvider } from '@/views/settings/backend/settings-provider'

export const handle_get_commit_message_auto_accept_after = async (
  provider: SettingsProvider
): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const seconds = config.get<number | null>('commitMessageAutoAcceptAfter')
  provider.postMessage({
    command: 'COMMIT_MESSAGE_AUTO_ACCEPT_AFTER',
    seconds: seconds ?? null
  })
}
