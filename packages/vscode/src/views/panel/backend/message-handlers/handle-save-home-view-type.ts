import { ViewProvider } from '@/views/panel/backend/panel-provider'
import { SaveHomeViewTypeMessage } from '@/views/panel/types/messages'

export const handle_save_home_view_type = async (
  provider: ViewProvider,
  message: SaveHomeViewTypeMessage
): Promise<void> => {
  provider.home_view_type = message.view_type
  provider.send_message({
    command: 'HOME_VIEW_TYPE',
    view_type: message.view_type
  })
}
