import * as vscode from 'vscode'
import { SettingsViewProvider } from '@/views/settings/backend/settings-view-provider'

export const handle_get_clear_checks_in_workspace_behavior = async (
  provider: SettingsViewProvider
): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const value = config.get<'ignore-open-editors' | 'uncheck-all'>(
    'clearChecksInWorkspaceBehavior',
    'ignore-open-editors'
  )
  provider.postMessage({
    command: 'CLEAR_CHECKS_IN_WORKSPACE_BEHAVIOR',
    value
  })
}
