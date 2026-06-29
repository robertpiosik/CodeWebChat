import * as vscode from 'vscode'
import { PanelProvider } from '@/views/panel/backend/panel-provider'
import {
  restore_checkpoint,
  delete_checkpoint
} from '@/features/checkpoints/actions'
import { Checkpoint } from '@/features/checkpoints/types'
import { TEMPORARY_CHECKPOINT_STATE_KEY } from '@/constants/state-keys'
import { dictionary } from '@shared/constants/dictionary'

export const handle_restore_temp_checkpoint = async (
  panel_provider: PanelProvider
) => {
  const temp_checkpoint = panel_provider.context.workspaceState.get<Checkpoint>(
    TEMPORARY_CHECKPOINT_STATE_KEY
  )

  if (!temp_checkpoint) {
    vscode.window.showErrorMessage(
      dictionary.error_message.COULD_NOT_FIND_TEMP_CHECKPOINT_TO_REVERT
    )
    return
  }

  await restore_checkpoint({
    checkpoint: temp_checkpoint,
    workspace_provider: panel_provider.workspace_provider,
    context: panel_provider.context,
    options: { skip_confirmation: true, use_native_progress: true },
    panel_provider: panel_provider
  })

  await delete_checkpoint({
    context: panel_provider.context,
    checkpoint_to_delete: temp_checkpoint,
    panel_provider: panel_provider
  })

  await panel_provider.context.workspaceState.update(
    TEMPORARY_CHECKPOINT_STATE_KEY,
    undefined
  )

  await panel_provider.send_checkpoints()
}
