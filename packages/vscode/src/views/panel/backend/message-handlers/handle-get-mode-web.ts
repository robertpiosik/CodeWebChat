import { PanelProvider } from '@/views/panel/backend/panel-provider'

export const handle_get_mode_web = (panel_provider: PanelProvider): void => {
  panel_provider.send_message({
    command: 'WEB_MODE',
    mode: panel_provider.web_mode
  })
}
