import { PanelViewProvider } from '@/views/panel/backend/panel-view-provider'

export const handle_get_connection_status = (
  panel_view_provider: PanelViewProvider
) => {
  panel_view_provider.send_message({
    command: 'CONNECTION_STATUS',
    connected:
      panel_view_provider.websocket_server_instance.is_connected_with_browser()
  })
}
