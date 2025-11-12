import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { SaveMainViewTypeMessage } from '@/views/panel/types/messages'

export const handle_save_main_view_type = async (
  panel_provider: PanelProvider,
  message: SaveMainViewTypeMessage
): Promise<void> => {
  panel_provider.main_view_type = message.view_type
  panel_provider.send_message({
    command: 'MAIN_VIEW_TYPE',
    view_type: message.view_type
  })
}
