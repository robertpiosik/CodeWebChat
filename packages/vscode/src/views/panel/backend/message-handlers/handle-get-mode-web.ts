import { PanelProvider } from '@/views/panel/backend/panel-provider'

export const handle_get_mode_web = (provider: PanelProvider): void => {
  provider.send_message({
    command: 'WEB_MODE',
    mode: provider.web_mode
  })
}
