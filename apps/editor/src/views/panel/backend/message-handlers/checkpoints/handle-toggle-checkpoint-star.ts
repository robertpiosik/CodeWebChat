import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { toggle_checkpoint_star } from '@/features/checkpoints/actions'
import { ToggleCheckpointStarMessage } from '@/views/panel/types/messages'

export const handle_toggle_checkpoint_star = async (
  panel_provider: PanelProvider,
  message: ToggleCheckpointStarMessage
) => {
  await toggle_checkpoint_star({
    context: panel_provider.context,
    timestamp: message.timestamp,
    panel_provider: panel_provider
  })
}
