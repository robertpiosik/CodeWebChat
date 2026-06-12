import { PanelProvider } from '../../../panel-provider'
import { get_checkpoints, restore_checkpoint } from '../actions'
import { RestoreCheckpointMessage } from '@/views/panel/types/messages'

export const handle_restore_checkpoint = async (
  panel_provider: PanelProvider,
  message: RestoreCheckpointMessage
) => {
  const checkpoints = await get_checkpoints(panel_provider.context)
  const checkpoint_to_restore = checkpoints.find(
    (c) => c.timestamp == message.timestamp
  )
  if (checkpoint_to_restore) {
    await restore_checkpoint({
      checkpoint: checkpoint_to_restore,
      workspace_provider: panel_provider.workspace_provider,
      context: panel_provider.context,
      panel_provider: panel_provider,
      options: {
        show_auto_closing_modal_on_success: true
      }
    })
    await panel_provider.send_checkpoints()
  }
}
