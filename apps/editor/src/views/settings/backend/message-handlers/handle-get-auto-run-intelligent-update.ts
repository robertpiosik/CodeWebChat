import * as vscode from 'vscode'
import { SettingsProvider } from '@/views/settings/backend/settings-provider'

export const handle_get_auto_run_intelligent_update = async (
  provider: SettingsProvider
): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const enabled = config.get<boolean>('autoRunIntelligentUpdate') || false
  provider.postMessage({
    command: 'AUTO_RUN_INTELLIGENT_UPDATE',
    enabled
  })
}
