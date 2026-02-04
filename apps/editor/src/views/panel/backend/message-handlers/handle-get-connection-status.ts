import { PanelProvider } from '@/views/panel/backend/panel-provider'

export const handle_get_connection_status = (panel_provider: PanelProvider) => {
  panel_provider.send_message({
    command: 'CONNECTION_STATUS',
    connected:
      panel_provider.websocket_server_instance.is_connected_with_browser()
  })
}
