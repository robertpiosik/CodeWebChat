import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { SaveModeMessage } from '@/views/panel/types/messages'

export const handle_save_mode = async (
  panel_provider: PanelProvider,
  message: SaveModeMessage
): Promise<void> => {
  panel_provider.mode = message.mode
  panel_provider.send_message({
    command: 'MODE',
    mode: message.mode
  })
}

