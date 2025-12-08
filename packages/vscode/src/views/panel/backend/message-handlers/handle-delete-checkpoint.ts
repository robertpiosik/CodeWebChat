import { PanelProvider } from '../panel-provider'
import { DeleteCheckpointMessage } from '@/views/panel/types/messages'
import {
  delete_checkpoint_with_undo,
  get_checkpoints
} from '@/commands/checkpoints-command/actions'

export const handle_delete_checkpoint = async (
  panel_provider: PanelProvider,
  message: DeleteCheckpointMessage
) => {
  const context = panel_provider.context

  const checkpoints = await get_checkpoints(context)
  const checkpoint_to_delete = checkpoints.find(
    (c) => c.timestamp === message.timestamp
  )

  if (!checkpoint_to_delete) {
    return
  }

  await delete_checkpoint_with_undo({
    context,
    checkpoint: checkpoint_to_delete,
    panel_provider,
    get_active_operation: () =>
      panel_provider.active_checkpoint_delete_operation,
    set_active_operation: (op) =>
      (panel_provider.active_checkpoint_delete_operation = op)
  })
}
