import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { SaveHomeViewTypeMessage } from '@/views/panel/types/messages'

export const handle_save_home_view_type = async (
  panel_provider: PanelProvider,
  message: SaveHomeViewTypeMessage
): Promise<void> => {
  panel_provider.home_view_type = message.view_type
  panel_provider.send_message({
    command: 'HOME_VIEW_TYPE',
    view_type: message.view_type
  })
}
