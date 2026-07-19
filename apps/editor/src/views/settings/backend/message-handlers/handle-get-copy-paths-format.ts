import * as vscode from 'vscode'
import { SettingsProvider } from '@/views/settings/backend/settings-provider'

export const handle_get_copy_paths_format = async (
  provider: SettingsProvider
): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const value = config.get<'list' | 'tree'>('copyPathsFormat', 'list')
  provider.postMessage({
    command: 'COPY_PATHS_FORMAT',
    value
  })
}
