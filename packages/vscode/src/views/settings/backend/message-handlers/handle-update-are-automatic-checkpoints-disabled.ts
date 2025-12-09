import * as vscode from 'vscode'
import { UpdateAreAutomaticCheckpointsDisabledMessage } from '@/views/settings/types/messages'
import { ARE_AUTOMATIC_CHECKPOINTS_DISABLED_STATE_KEY } from '@/constants/state-keys'

export async function handle_update_are_automatic_checkpoints_disabled(
  message: UpdateAreAutomaticCheckpointsDisabledMessage,
  context: vscode.ExtensionContext
) {
  await context.workspaceState.update(
    ARE_AUTOMATIC_CHECKPOINTS_DISABLED_STATE_KEY,
    message.disabled
  )
}
