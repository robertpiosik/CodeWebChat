import * as vscode from 'vscode'
import { SettingsViewProvider } from '@/views/settings/backend/settings-view-provider'

export const handle_get_auto_run_intelligent_update = async (
  provider: SettingsViewProvider
): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const enabled = config.get<boolean>('autoRunIntelligentUpdate') || false
  provider.postMessage({
    command: 'AUTO_RUN_INTELLIGENT_UPDATE',
    enabled
  })
}
