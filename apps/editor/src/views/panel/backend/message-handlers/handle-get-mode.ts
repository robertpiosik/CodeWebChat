import { PanelViewProvider } from '@/views/panel/backend/panel-view-provider'

export const handle_get_mode = (panel_view_provider: PanelViewProvider) => {
  panel_view_provider.send_message({
    command: 'MODE',
    mode: panel_view_provider.mode
  })
}
