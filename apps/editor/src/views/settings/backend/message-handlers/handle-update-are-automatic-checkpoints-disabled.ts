import * as vscode from 'vscode'
import { UpdateAreAutomaticCheckpointsDisabledMessage } from '@/views/settings/types/messages'

export const handle_update_are_automatic_checkpoints_disabled = async (
  message: UpdateAreAutomaticCheckpointsDisabledMessage
) => {
  await vscode.workspace
    .getConfiguration('codeWebChat')
    .update(
      'areAutomaticCheckpointsDisabled',
      message.disabled || undefined,
      vscode.ConfigurationTarget.Global
    )
}
