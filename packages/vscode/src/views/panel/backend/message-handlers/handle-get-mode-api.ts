import { PanelProvider } from '@/views/panel/backend/panel-provider'

export const handle_get_mode_api = (provider: PanelProvider): void => {
  provider.send_message({
    command: 'API_MODE',
    mode: provider.api_mode
  })
}
