import * as vscode from 'vscode'
import { SettingsViewProvider } from '@/views/settings/backend/settings-view-provider'

export const handle_get_check_new_files = async (
  provider: SettingsViewProvider
): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const enabled = config.get<boolean>('checkNewFiles', true)
  provider.postMessage({
    command: 'CHECK_NEW_FILES',
    enabled
  })
}
