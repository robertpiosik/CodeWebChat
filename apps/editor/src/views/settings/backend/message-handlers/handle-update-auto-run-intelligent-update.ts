import * as vscode from 'vscode'
import { UpdateAutoRunIntelligentUpdateMessage } from '@/views/settings/types/messages'

export const handle_update_auto_run_intelligent_update = async (
  message: UpdateAutoRunIntelligentUpdateMessage
): Promise<void> => {
  await vscode.workspace
    .getConfiguration('codeWebChat')
    .update(
      'autoRunIntelligentUpdate',
      message.enabled || undefined,
      vscode.ConfigurationTarget.Global
    )
}
