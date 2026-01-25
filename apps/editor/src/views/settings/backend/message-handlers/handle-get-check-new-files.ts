import * as vscode from 'vscode'
import { SettingsProvider } from '@/views/settings/backend/settings-provider'

export const handle_get_check_new_files = async (
  provider: SettingsProvider
): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const enabled = config.get<boolean>('checkNewFiles', true)
  provider.postMessage({
    command: 'CHECK_NEW_FILES',
    enabled
  })
}
