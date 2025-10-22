import * as vscode from 'vscode'
import { SettingsProvider } from '@/views/settings/backend/settings-provider'
import { UpdateContextSizeWarningThresholdMessage } from '@/views/settings/types/messages'

export const handle_update_context_size_warning_threshold = async (
  provider: SettingsProvider,
  message: UpdateContextSizeWarningThresholdMessage
): Promise<void> => {
  await vscode.workspace
    .getConfiguration('codeWebChat')
    .update(
      'contextSizeWarningThreshold',
      message.threshold,
      vscode.ConfigurationTarget.Global
    )
}
