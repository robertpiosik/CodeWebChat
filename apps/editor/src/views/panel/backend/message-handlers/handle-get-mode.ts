import { PanelProvider } from '@/views/panel/backend/panel-provider'

export const handle_get_mode = (panel_provider: PanelProvider) => {
  panel_provider.send_message({
    command: 'MODE',
    mode: panel_provider.mode
  })
}
