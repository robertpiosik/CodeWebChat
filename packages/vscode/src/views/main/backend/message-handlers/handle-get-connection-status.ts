import { MainViewProvider } from '@/views/main/backend/view-provider'
import { ExtensionMessage } from '@/views/main/types/messages'

export const handle_get_connection_status = (provider: MainViewProvider): void => {
  provider.send_message<ExtensionMessage>({
    command: 'CONNECTION_STATUS',
    connected: provider.websocket_server_instance.is_connected_with_browser()
  })
}
