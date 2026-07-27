import * as vscode from 'vscode'
import { SettingsViewProvider } from '@/views/settings/backend/settings-view-provider'

export const handle_get_copy_paths_format = async (
  provider: SettingsViewProvider
): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const value = config.get<'bullet-list' | 'comma-separated' | 'ascii-tree'>(
    'copyPathsFormat',
    'bullet-list'
  )
  provider.postMessage({
    command: 'COPY_PATHS_FORMAT',
    value
  })
}
