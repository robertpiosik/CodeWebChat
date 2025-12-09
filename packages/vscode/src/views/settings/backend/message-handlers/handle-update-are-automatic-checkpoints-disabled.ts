import * as vscode from 'vscode'
import { UpdateAreAutomaticCheckpointsDisabledMessage } from '@/views/settings/types/messages'

export async function handle_update_are_automatic_checkpoints_disabled(
  message: UpdateAreAutomaticCheckpointsDisabledMessage
) {
  await vscode.workspace
    .getConfiguration('codeWebChat')
    .update(
      'areAutomaticCheckpointsDisabled',
      message.disabled || undefined,
      vscode.ConfigurationTarget.Global
    )
}
