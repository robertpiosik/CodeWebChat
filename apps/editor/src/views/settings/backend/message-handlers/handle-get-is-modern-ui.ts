import * as vscode from 'vscode'
import { SettingsViewProvider } from '@/views/settings/backend/settings-view-provider'

export const handle_get_is_modern_ui = async (
  settings_provider: SettingsViewProvider
): Promise<void> => {
  const config = vscode.workspace.getConfiguration('workbench')
  const is_modern_ui = config.get<boolean>('experimental.modernUI', false)
  settings_provider.postMessage({
    command: 'IS_MODERN_UI',
    is_modern_ui
  })
}
