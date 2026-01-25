import * as vscode from 'vscode'
import { SettingsProvider } from '@/views/settings/backend/settings-provider'

export const handle_get_context_size_warning_threshold = async (
  provider: SettingsProvider
): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const threshold = config.get<number>('contextSizeWarningThreshold', 60000)
  provider.postMessage({
    command: 'CONTEXT_SIZE_WARNING_THRESHOLD',
    threshold
  })
}
