import * as vscode from 'vscode'
import { UpdateContextSizeWarningThresholdMessage } from '@/views/settings/types/messages'

export const handle_update_context_size_warning_threshold = async (
  message: UpdateContextSizeWarningThresholdMessage
): Promise<void> => {
  await vscode.workspace
    .getConfiguration('codeWebChat')
    .update(
      'contextSizeWarningThreshold',
      message.threshold || undefined,
      vscode.ConfigurationTarget.Global
    )
}
