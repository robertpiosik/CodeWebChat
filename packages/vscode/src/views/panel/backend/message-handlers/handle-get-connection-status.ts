import { PanelProvider } from '@/views/panel/backend/panel-provider'

export const handle_get_connection_status = (provider: PanelProvider): void => {
  provider.send_message({
    command: 'CONNECTION_STATUS',
    connected: provider.websocket_server_instance.is_connected_with_browser()
  })
}
