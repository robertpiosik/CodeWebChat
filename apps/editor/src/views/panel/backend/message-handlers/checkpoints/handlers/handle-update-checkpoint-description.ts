import { PanelProvider } from '../../../panel-provider'
import { update_checkpoint_description } from '../actions'
import { UpdateCheckpointDescriptionMessage } from '@/views/panel/types/messages'

export const handle_update_checkpoint_description = async (
  panel_provider: PanelProvider,
  message: UpdateCheckpointDescriptionMessage
) => {
  await update_checkpoint_description({
    context: panel_provider.context,
    timestamp: message.timestamp,
    description: message.description,
    panel_provider: panel_provider
  })
}
