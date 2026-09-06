import * as vscode from 'vscode'
import { SettingsViewProvider } from '@/views/settings/backend/settings-view-provider'

export const handle_get_auto_run_patch_repair = async (
  provider: SettingsViewProvider
): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const enabled = config.get<boolean>('autoRunPatchRepair') || false
  provider.postMessage({
    command: 'AUTO_RUN_PATCH_REPAIR',
    enabled
  })
}
