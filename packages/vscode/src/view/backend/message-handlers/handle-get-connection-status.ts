import { ViewProvider } from '@/view/backend/view-provider'
import { BackendMessage } from '@/view/types/messages'

export const handle_get_connection_status = (provider: ViewProvider): void => {
  provider.send_message({
    command: 'CONNECTION_STATUS',
    connected: provider.websocket_server_instance.is_connected_with_browser()
  })
}
