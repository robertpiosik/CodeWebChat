import * as vscode from 'vscode'
import { SettingsViewProvider } from '@/views/settings/backend/settings-view-provider'

export const handle_get_reuse_last_tab = async (
  provider: SettingsViewProvider
): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const enabled = config.get<boolean>('reuseLastTab', false)
  provider.postMessage({
    command: 'REUSE_LAST_TAB',
    enabled
  })
}
