import * as vscode from 'vscode'
import { SettingsProvider } from '@/views/settings/backend/settings-provider'

export const handle_get_fix_all_automatically = async (
  provider: SettingsProvider
): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const enabled = config.get<boolean>('fixAllAutomatically') || false
  provider.postMessage({
    command: 'FIX_ALL_AUTOMATICALLY',
    enabled
  })
}
