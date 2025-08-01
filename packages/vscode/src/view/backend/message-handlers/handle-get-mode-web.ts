import { ViewProvider } from '@/view/backend/view-provider'

export const handle_get_mode_web = (provider: ViewProvider): void => {
  provider.send_message({
    command: 'WEB_MODE',
    mode: provider.web_mode
  })
}
